// STEP 4-4: 예상 식수 자동 추천 — AI/외부 API 없이, 4-1 기록과 4-2/4-3의 기존 통계
// 계산 함수만 재사용하는 규칙 기반 계산이다. 이 파일은 추천값을 "계산"만 한다 — 화면에서
// 사용자가 [추천값 적용]을 눌러야만 기존 expectedCount가 바뀐다(자동 적용 금지).
//
// 구조: 요일/끼니 기준식수 + 메뉴 보정 = 추천 식수.
// "최근 4주 평균"을 기준식수로 썼다면 전체평균과의 차이(추세)를 별도로 다시 더하지
// 않는다 — 기준식수 자체가 이미 그 효과를 반영하고 있으므로 중복 보정하지 않는다.

import { getAverageByWeekdayAndMeal, getRecentAverage } from './mealCountStats'
import { getMenuMealCountStats, filterByPeriod } from './menuMealCountStats'

// 가중치/제한값은 전부 이 파일 한 곳에서만 관리한다(코드 곳곳에 숫자를 흩어 두지 않는다).
export const MAIN_1_WEIGHT = 0.7
export const MAIN_2_WEIGHT = 0.3
export const RECENT_WEEKS = 4
export const MAX_MENU_ADJUSTMENT_RATE = 0.1 // 기준 식수의 ±10%
export const ROUND_UNIT = 5

function withValidActualCount(records) {
  return (records || []).filter((r) => r && typeof r.actualCount === 'number' && Number.isFinite(r.actualCount))
}

// 기준 식수 — 5장 우선순위. 상위 단계에 데이터가 없으면(average가 null) 다음 단계로
// 내려간다. 반드시 이 중 하나만 고른다(중복 가산 없음).
export function getBaseCount(validRecords, day, mealType, currentExpectedCount, referenceDateISO = null) {
  // 1순위: 같은 요일 + 같은 끼니, 최근 4주 평균
  const recentSameDayMeal = filterByPeriod(validRecords, RECENT_WEEKS, referenceDateISO)
  const p1 = getAverageByWeekdayAndMeal(recentSameDayMeal, day, mealType)
  if (p1.average != null) return { value: p1.average, count: p1.count, source: 'weekday_meal_recent' }

  // 2순위: 같은 요일 + 같은 끼니, 전체 평균
  const p2 = getAverageByWeekdayAndMeal(validRecords, day, mealType)
  if (p2.average != null) return { value: p2.average, count: p2.count, source: 'weekday_meal_all' }

  // 3순위: 같은 끼니(요일 무관) 최근 평균
  const mealOnly = validRecords.filter((r) => r.mealType === mealType)
  const p3 = getRecentAverage(mealOnly, RECENT_WEEKS, referenceDateISO)
  if (p3.average != null) return { value: p3.average, count: p3.count, source: 'meal_recent' }

  // 4순위: 데이터가 전혀 없으면 현재 expectedCount를 그대로 유지
  return { value: Number(currentExpectedCount) || 0, count: 0, source: 'current_expected' }
}

// 표본 수(제공 횟수)에 따른 메뉴 보정 영향력. 8장 기준.
export function getSampleWeight(servedCount) {
  if (servedCount <= 1) return 0
  if (servedCount <= 2) return 0.25
  if (servedCount <= 4) return 0.5
  return 1
}

// menuId가 4-3 분석에서 "최근 4주"에 없으면(신규 메뉴라도 과거 기록은 있을 수 있음)
// "전체기간" 결과로 한 번 더 찾아본다 — 기준식수 우선순위(5장)와 같은 완화 방식이다.
// 둘 다 없으면 신규 메뉴로 보고 보정하지 않는다(16장).
function findMenuEntry(validRecords, mealType, menuId, referenceDateISO) {
  if (!menuId) return null
  const recent = getMenuMealCountStats(validRecords, mealType, { weeks: RECENT_WEEKS, referenceDateISO })
  const recentEntry = recent.find((r) => r.menuId === menuId)
  if (recentEntry) return recentEntry
  const all = getMenuMealCountStats(validRecords, mealType, { weeks: null })
  return all.find((r) => r.menuId === menuId) || null
}

// MAIN_1/MAIN_2 메뉴 보정 — 4-3의 getMenuMealCountStats()가 계산한 "기준 대비 차이"를
// 그대로 가져와 가중치(0.7/0.3) × 표본수 보정(getSampleWeight)만 곱한다. 같은 통계 계산을
// 다시 만들지 않는다.
export function getMenuAdjustment(validRecords, mealType, { main1Id, main2Id, referenceDateISO } = {}) {
  const main1Entry = findMenuEntry(validRecords, mealType, main1Id, referenceDateISO)
  const main2Entry = findMenuEntry(validRecords, mealType, main2Id, referenceDateISO)

  const main1Contribution = main1Entry ? main1Entry.diff * MAIN_1_WEIGHT * getSampleWeight(main1Entry.servedCount) : 0
  const main2Contribution = main2Entry ? main2Entry.diff * MAIN_2_WEIGHT * getSampleWeight(main2Entry.servedCount) : 0

  return {
    raw: main1Contribution + main2Contribution,
    main1: main1Entry
      ? {
          ...main1Entry,
          weight: MAIN_1_WEIGHT,
          sampleWeight: getSampleWeight(main1Entry.servedCount),
          contribution: main1Contribution,
        }
      : null,
    main2: main2Entry
      ? {
          ...main2Entry,
          weight: MAIN_2_WEIGHT,
          sampleWeight: getSampleWeight(main2Entry.servedCount),
          contribution: main2Contribution,
        }
      : null,
  }
}

// 메뉴 보정 총합이 기준 식수의 ±10%를 넘지 않도록 제한한다(9장).
export function limitAdjustment(rawAdjustment, baseCount) {
  const maxAbs = Math.abs(baseCount) * MAX_MENU_ADJUSTMENT_RATE
  if (rawAdjustment > maxAbs) return maxAbs
  if (rawAdjustment < -maxAbs) return -maxAbs
  return rawAdjustment
}

// 최종 추천 식수는 5명 단위로 반올림한다(10장). 내부 계산값(recommendedRaw)은 그대로 둔다.
export function roundRecommendedCount(value, unit = ROUND_UNIT) {
  return Math.round(value / unit) * unit
}

// 신뢰도 — 확률이 아니라 4단계 라벨만 사용한다(12장). 실제로 추천에 쓰인 기준식수의
// 표본 수(baseCount.count)를 기준으로 판단한다.
export function getRecommendationConfidence(sameWeekdayMealCount) {
  if (sameWeekdayMealCount <= 1) return '데이터 부족'
  if (sameWeekdayMealCount <= 3) return '참고'
  if (sameWeekdayMealCount <= 7) return '보통'
  return '충분'
}

// 전체 오케스트레이션. allRecords는 getAllMealCountRecords()의 결과를 그대로 넘기면 된다.
// day: planConfig.DAYS 코드('mon'...). mealType: planConfig.MEAL_TYPES 코드.
// main1Id/main2Id: 현재 식단의 MAIN_1/MAIN_2 메뉴 id(없으면 null) — RICE/SOUP/STEW/SIDE/
// KIMCHI는 이번 단계의 보정 대상이 아니다(6장).
export function getRecommendedCount(allRecords, { day, mealType, currentExpectedCount, main1Id, main2Id, referenceDateISO } = {}) {
  const validRecords = withValidActualCount(allRecords)
  const base = getBaseCount(validRecords, day, mealType, currentExpectedCount, referenceDateISO)

  // 과거 actualCount가 전혀 없어 4순위(현재 expectedCount)까지 내려간 경우 — 추천하지
  // 않고 현재 값을 유지한다(17장). UI는 이 경우 "데이터가 부족합니다" 안내만 표시한다.
  if (base.source === 'current_expected') {
    return {
      hasData: false,
      baseCount: base.value,
      baseCountSource: base.source,
      baseCountSampleCount: base.count,
      menuAdjustment: { raw: 0, limited: 0, main1: null, main2: null },
      recommendedRaw: base.value,
      recommendedCount: base.value,
      confidence: '데이터 부족',
    }
  }

  const menuAdjustment = getMenuAdjustment(validRecords, mealType, { main1Id, main2Id, referenceDateISO })
  const limited = limitAdjustment(menuAdjustment.raw, base.value)
  const recommendedRaw = base.value + limited
  const recommendedCount = roundRecommendedCount(recommendedRaw)

  return {
    hasData: true,
    baseCount: base.value,
    baseCountSource: base.source,
    baseCountSampleCount: base.count,
    menuAdjustment: { ...menuAdjustment, limited },
    recommendedRaw,
    recommendedCount,
    confidence: getRecommendationConfidence(base.count),
  }
}
