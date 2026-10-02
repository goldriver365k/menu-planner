// 실제 판매량(5-7) 기반 메뉴별 준비수량 추천 — AI/외부 API 없이 단순 통계 규칙만 쓴다.
//
// 기존 4-6(식사 전체 준비인원 추천, productionRecommendation.js)과는 완전히 분리된
// 별개 기능이다. 4-6은 "끼니 전체 식수", 이 파일은 "독립 판매메뉴 1개"의 준비수량이다.
// 4-6의 코드/저장소는 건드리지 않는다.
//
// 가격·원가율(5-6)은 추천에 전혀 영향을 주지 않는다 — 오직 5-7의 실제 판매기록만 본다.

import { getAllSalesRecords } from '../data/salesRecords'
import { getDayOfWeekKey, addDaysISO } from '../data/menuHistory'

export const MAX_TREND_ADJUSTMENT = 0.05
export const RECENT_BUSINESS_DAYS_WINDOW = 7
export const SAME_WEEKDAY_SAMPLE_SIZE = 4

export const BASIS = {
  SAME_WEEKDAY_RECENT: 'SAME_WEEKDAY_RECENT', // 1. 같은 요일 최근 4회
  SAME_WEEKDAY_ALL: 'SAME_WEEKDAY_ALL', // 2. 같은 요일 전체(그러나 4회 미만)
  RECENT_BUSINESS_DAYS: 'RECENT_BUSINESS_DAYS', // 3. 최근 7영업일 평균
  ALL_TIME: 'ALL_TIME', // 4. 전체 평균
  NO_DATA: 'NO_DATA', // 5. 데이터 부족
}

export const CONFIDENCE_LABELS = {
  NONE: '데이터 부족',
  LOW: '참고',
  MEDIUM: '보통',
  HIGH: '충분',
}

// 11장: 표본 수만으로 정하는 단순한 4단계 — 통계적 신뢰구간 같은 건 쓰지 않는다.
export function getSampleConfidence(sampleCount) {
  if (sampleCount >= 5) return 'HIGH'
  if (sampleCount >= 3) return 'MEDIUM'
  if (sampleCount === 2) return 'LOW'
  return 'NONE'
}

function average(numbers) {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

function round1(n) {
  return Math.round(n * 10) / 10
}

// 4장·5장: 최근 3회가 연속 증가(+5%)/연속 감소(-5%)인지만 본다 — 회귀분석·예측 없음.
// records는 날짜 오름차순(과거->최근)으로 정렬된, 이 메뉴의 "최근" 판매수량 배열이다.
export function calcTrendAdjustment(recentQuantitiesAsc) {
  if (recentQuantitiesAsc.length < 3) return 0
  const last3 = recentQuantitiesAsc.slice(-3)
  const [a, b, c] = last3
  if (a < b && b < c) return MAX_TREND_ADJUSTMENT
  if (a > b && b > c) return -MAX_TREND_ADJUSTMENT
  return 0
}

// 메뉴 하나, 날짜 하나에 대한 추천 — targetDate 이전(그 날짜가 오기 전)의 실제 판매기록만
// 사용한다. 우선순위(2장): 같은 요일 최근 4회 -> 같은 요일 전체(4회 미만) -> 최근
// targetDate 이전 7일 내 영업일 평균 -> 전체 평균 -> 데이터 부족.
export function recommendMenuProduction(menuId, targetDate) {
  const allRecords = getAllSalesRecords()
    .filter((r) => r.menuId === menuId && r.date < targetDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) // 오래된 -> 최근

  if (allRecords.length === 0) {
    return {
      menuId,
      targetDate,
      basis: BASIS.NO_DATA,
      sampleCount: 0,
      baseQuantity: null,
      trendAdjustment: 0,
      recommendedQuantity: null,
      confidence: 'NONE',
      reasonLines: ['판매 데이터 부족'],
    }
  }

  const targetWeekday = getDayOfWeekKey(targetDate)
  const sameWeekdayRecordsDesc = allRecords.filter((r) => getDayOfWeekKey(r.date) === targetWeekday).slice().reverse()

  let basis
  let sampleCount
  let baseQuantity
  const reasonLines = []

  if (sameWeekdayRecordsDesc.length >= SAME_WEEKDAY_SAMPLE_SIZE) {
    const sample = sameWeekdayRecordsDesc.slice(0, SAME_WEEKDAY_SAMPLE_SIZE)
    basis = BASIS.SAME_WEEKDAY_RECENT
    sampleCount = sample.length
    baseQuantity = average(sample.map((r) => r.quantity))
    reasonLines.push(`최근 같은 요일 ${sampleCount}회 평균 ${Math.round(baseQuantity)}개`)
  } else if (sameWeekdayRecordsDesc.length >= 1) {
    basis = BASIS.SAME_WEEKDAY_ALL
    sampleCount = sameWeekdayRecordsDesc.length
    baseQuantity = average(sameWeekdayRecordsDesc.map((r) => r.quantity))
    reasonLines.push(`같은 요일 판매기록 ${sampleCount}회 평균 ${Math.round(baseQuantity)}개`)
  } else {
    const windowStart = addDaysISO(targetDate, -RECENT_BUSINESS_DAYS_WINDOW)
    const windowEnd = addDaysISO(targetDate, -1)
    const recentBusinessDayRecords = allRecords.filter((r) => r.date >= windowStart && r.date <= windowEnd)
    if (recentBusinessDayRecords.length >= 1) {
      basis = BASIS.RECENT_BUSINESS_DAYS
      sampleCount = recentBusinessDayRecords.length
      baseQuantity = average(recentBusinessDayRecords.map((r) => r.quantity))
      reasonLines.push(`최근 ${RECENT_BUSINESS_DAYS_WINDOW}일 내 영업일 ${sampleCount}회 평균 ${Math.round(baseQuantity)}개`)
    } else {
      basis = BASIS.ALL_TIME
      sampleCount = allRecords.length
      baseQuantity = average(allRecords.map((r) => r.quantity))
      reasonLines.push(`전체 판매기록 ${sampleCount}회 평균 ${Math.round(baseQuantity)}개`)
    }
  }

  const trendAdjustment = calcTrendAdjustment(allRecords.slice(-3).map((r) => r.quantity))
  if (trendAdjustment > 0) reasonLines.push(`최근 3회 증가 추세 +${round1(trendAdjustment * 100)}%`)
  else if (trendAdjustment < 0) reasonLines.push(`최근 3회 감소 추세 ${round1(trendAdjustment * 100)}%`)

  // 8장·9장: 정수로 반올림, 음수 방지(과거 판매기록이 있는 메뉴는 0 미만으로 내려가지 않음).
  const recommendedQuantity = Math.max(0, Math.round(baseQuantity * (1 + trendAdjustment)))

  return {
    menuId,
    targetDate,
    basis,
    sampleCount,
    baseQuantity,
    trendAdjustment,
    recommendedQuantity,
    confidence: getSampleConfidence(sampleCount),
    reasonLines,
  }
}

export function recommendMenuProductionForMenus(menuIds, targetDate) {
  return menuIds.map((menuId) => recommendMenuProduction(menuId, targetDate))
}
