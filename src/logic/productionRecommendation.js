// STEP 4-6: 적정 생산량(준비 인분) 추천 — AI/외부 API 없이, 과거 준비/잔반/폐기 실적을
// 규칙 기반으로 반영하는 "준비계수"만 계산한다.
//
// 중요: "추천 식수"(몇 명이 먹을지)와 "추천 준비량"(몇 인분을 준비할지)은 다른 값이다.
// 추천 준비량 = 추천 식수 × 준비계수. 준비계수는 기본값(1.03)에서 시작해 과거 실적으로
// 보정하되, 추천 식수보다 적게 준비하도록 추천하지 않는다(최소 1.00).

import { weekdayOfDate } from './mealCountStats'
import { filterByPeriod } from './menuMealCountStats'
import { RECENT_WEEKS, roundRecommendedCount } from './mealCountRecommendation'

// 가중치/제한값은 전부 이 파일 한 곳에서만 관리한다.
export const DEFAULT_PREPARATION_BUFFER_RATE = 0.03
export const DEFAULT_PREPARATION_FACTOR = 1 + DEFAULT_PREPARATION_BUFFER_RATE // 1.03
export const MIN_PREPARATION_FACTOR = 1.0
export const MAX_PREPARATION_FACTOR = 1.08
export const MIN_SAMPLE_FOR_ADJUSTMENT = 3 // 12장: 0~2회는 보정하지 않고 기본값만 쓴다
export const MAX_COMBINED_DOWNWARD_ADJUSTMENT = 0.03 // 11장: 남음+폐기 보정의 합을 제한
export const SHORTAGE_LOOKBACK_COUNT = 4 // 10장: "최근 4회" 고정 개수 기준

function round1(n) {
  return Math.round(n * 10) / 10
}

function average(numbers) {
  if (numbers.length === 0) return null
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}

// 5장: 보정에 쓰려면 actualCount/preparedCount/leftoverCount/wasteCount가 전부 숫자로
// 있어야 한다 — 과거 4-1 기록처럼 하나라도 없으면(null/undefined) 보정 계산에서 제외한다.
function hasFullProductionData(r) {
  return (
    r &&
    typeof r.actualCount === 'number' &&
    typeof r.preparedCount === 'number' &&
    typeof r.leftoverCount === 'number' &&
    typeof r.wasteCount === 'number'
  )
}

// 같은 요일+같은 끼니의 과거 준비 실적을 모아 평균·비율·부족위험을 계산한다.
// 12장: 가능하면 최근 4주 데이터를 우선 쓰고, 표본이 부족하면 전체기간으로 내려간다.
export function getHistoricalProductionStats(allRecords, day, mealType, referenceDateISO = null) {
  const fullRecords = (allRecords || []).filter(
    (r) => hasFullProductionData(r) && weekdayOfDate(r.date) === day && r.mealType === mealType
  )

  const recentRecords = filterByPeriod(fullRecords, RECENT_WEEKS, referenceDateISO)
  const chosen = recentRecords.length >= MIN_SAMPLE_FOR_ADJUSTMENT ? recentRecords : fullRecords

  if (chosen.length < MIN_SAMPLE_FOR_ADJUSTMENT) {
    return {
      sampleCount: chosen.length,
      insufficientData: true,
      avgPrepared: null,
      avgActual: null,
      avgLeftover: null,
      avgWaste: null,
      avgLeftoverRate: null,
      avgWasteRate: null,
      shortageCount: 0,
      shortageSampleCount: 0,
    }
  }

  const avgPrepared = average(chosen.map((r) => r.preparedCount))
  const avgActual = average(chosen.map((r) => r.actualCount))
  const avgLeftover = average(chosen.map((r) => r.leftoverCount))
  const avgWaste = average(chosen.map((r) => r.wasteCount))
  const avgLeftoverRate = avgPrepared > 0 ? round1((avgLeftover / avgPrepared) * 100) : null
  const avgWasteRate = avgPrepared > 0 ? round1((avgWaste / avgPrepared) * 100) : null

  // 10장: "부족 위험"은 최근4주/전체기간 선택과 무관하게, 날짜 기준 최근
  // SHORTAGE_LOOKBACK_COUNT(4)건만 따로 본다.
  const recentForShortage = [...fullRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, SHORTAGE_LOOKBACK_COUNT)
  const shortageCount = recentForShortage.filter((r) => r.preparedCount <= r.actualCount).length

  return {
    sampleCount: chosen.length,
    insufficientData: false,
    avgPrepared: round1(avgPrepared),
    avgActual: round1(avgActual),
    avgLeftover: round1(avgLeftover),
    avgWaste: round1(avgWaste),
    avgLeftoverRate,
    avgWasteRate,
    shortageCount,
    shortageSampleCount: recentForShortage.length,
  }
}

// 9장: 평균 남은 비율에 따른 보정.
export function getLeftoverAdjustment(avgLeftoverRate) {
  if (avgLeftoverRate == null) return 0
  if (avgLeftoverRate > 8) return -0.03
  if (avgLeftoverRate > 5) return -0.02
  if (avgLeftoverRate > 3) return -0.01
  return 0
}

// 11장: 평균 폐기율에 따른 보정("이상" 기준 — 경계값 포함).
export function getWasteAdjustment(avgWasteRate) {
  if (avgWasteRate == null) return 0
  if (avgWasteRate >= 5) return -0.02
  if (avgWasteRate >= 3) return -0.01
  return 0
}

// 10장: 최근 SHORTAGE_LOOKBACK_COUNT(4)회 중 준비량이 실제 식수 이하였던 횟수.
export function getShortageAdjustment(shortageCount) {
  if (shortageCount >= 3) return 0.02
  if (shortageCount >= 2) return 0.01
  return 0
}

// 기본 준비계수에서 시작해 잔여량/폐기량/부족위험 보정을 적용하고, 최소/최대로 제한한다.
export function getPreparationFactor(allRecords, day, mealType, referenceDateISO = null) {
  const stats = getHistoricalProductionStats(allRecords, day, mealType, referenceDateISO)

  if (stats.insufficientData) {
    return {
      factor: DEFAULT_PREPARATION_FACTOR,
      baseFactor: DEFAULT_PREPARATION_FACTOR,
      leftoverAdjustment: 0,
      wasteAdjustment: 0,
      shortageAdjustment: 0,
      stats,
    }
  }

  const leftoverAdjustment = getLeftoverAdjustment(stats.avgLeftoverRate)
  const wasteAdjustment = getWasteAdjustment(stats.avgWasteRate)
  // 11장: 남음 보정 + 폐기 보정의 합이 한 번에 너무 커지지 않도록 제한한다.
  const combinedDownward = Math.max(leftoverAdjustment + wasteAdjustment, -MAX_COMBINED_DOWNWARD_ADJUSTMENT)
  const shortageAdjustment = getShortageAdjustment(stats.shortageCount)

  const rawFactor = DEFAULT_PREPARATION_FACTOR + combinedDownward + shortageAdjustment
  const factor = Math.min(MAX_PREPARATION_FACTOR, Math.max(MIN_PREPARATION_FACTOR, rawFactor))

  return { factor, baseFactor: DEFAULT_PREPARATION_FACTOR, leftoverAdjustment, wasteAdjustment, shortageAdjustment, stats }
}

// 20장: 사용자가 이해할 수 있는 간단한 근거 문장 목록.
export function getProductionRecommendationReason({ stats, leftoverAdjustment, wasteAdjustment, shortageAdjustment }) {
  if (stats.insufficientData) {
    return ['생산 실적 데이터 부족 — 기본 여유율 3% 적용']
  }
  const lines = [`기본 여유 ${Math.round(DEFAULT_PREPARATION_BUFFER_RATE * 100)}%`]
  if (leftoverAdjustment < 0) lines.push(`최근 남은 음식이 다소 많음 ${Math.round(leftoverAdjustment * 100)}%`)
  if (wasteAdjustment < 0) lines.push(`최근 폐기가 다소 많음 ${Math.round(wasteAdjustment * 100)}%`)
  if (shortageAdjustment > 0) lines.push(`최근 준비 부족이 반복됨 +${Math.round(shortageAdjustment * 100)}%`)
  return lines
}

// 전체 오케스트레이션. recommendedCount는 4-4의 "추천 식수"(또는 그 값이 없으면 현재
// expectedCount) — 여기서는 그 값을 그대로 입력으로 받는다(식수 추천 로직을 다시 만들지
// 않는다). 최종 추천 준비량은 4-4의 roundRecommendedCount(5단위 반올림)를 그대로 재사용한다.
export function getRecommendedPreparationCount(allRecords, { day, mealType, recommendedCount, referenceDateISO } = {}) {
  const { factor, baseFactor, leftoverAdjustment, wasteAdjustment, shortageAdjustment, stats } = getPreparationFactor(
    allRecords,
    day,
    mealType,
    referenceDateISO
  )

  const baseCount = Number(recommendedCount) || 0
  const rawPreparationCount = baseCount * factor
  const recommendedPreparationCount = roundRecommendedCount(rawPreparationCount)
  const surplus = recommendedPreparationCount - baseCount

  return {
    recommendedPreparationCount,
    preparationFactor: factor,
    baseFactor,
    leftoverAdjustment,
    wasteAdjustment,
    shortageAdjustment,
    surplus,
    hasHistoricalData: !stats.insufficientData,
    sampleCount: stats.sampleCount,
    reason: getProductionRecommendationReason({ stats, leftoverAdjustment, wasteAdjustment, shortageAdjustment }),
  }
}
