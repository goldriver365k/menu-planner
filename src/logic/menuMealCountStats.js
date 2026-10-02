// STEP 4-3: 메뉴별 실제 식수 경향 — 4-1 기록(actualCount + menuIds)과 4-2의 요일·끼니
// 기준평균(getAverageByWeekdayAndMeal)을 그대로 재사용해 "그 메뉴가 포함된 식단의 요일·
// 끼니 기준 대비 차이"를 계산한다. 새 LocalStorage는 만들지 않는다 — 매번 원본 기록에서
// 다시 계산한다.
//
// 중요: 이 숫자는 상관관계일 뿐이다. 특정 날 식수가 높았다고 해서 그 메뉴가 식수를
// "증가시켰다"고 단정하지 않는다 — 화면에는 항상 "기준 대비 차이"로만 표시한다.

import { getAverageByWeekdayAndMeal, weekdayOfDate } from './mealCountStats'
import { diffDays, todayISO } from '../data/menuHistory'
import { getMenuById } from '../data/menuDatabase'

// 표본 수 판단 기준 — 나중에 쉽게 바꿀 수 있도록 상수로 분리한다.
// count <= INSUFFICIENT_MAX: 데이터 부족 / count <= REFERENCE_MAX: 참고 / 그 이상: 분석 가능
export const SAMPLE_SIZE_THRESHOLDS = {
  INSUFFICIENT_MAX: 1,
  REFERENCE_MAX: 2,
}

export function getSampleSizeLabel(count) {
  if (count <= SAMPLE_SIZE_THRESHOLDS.INSUFFICIENT_MAX) return '데이터 부족'
  if (count <= SAMPLE_SIZE_THRESHOLDS.REFERENCE_MAX) return '참고'
  return '분석 가능'
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function average(numbers) {
  if (numbers.length === 0) return null
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}

function withValidActualCount(records) {
  return (records || []).filter((r) => r && typeof r.actualCount === 'number' && Number.isFinite(r.actualCount))
}

// records를 "최근 N주"(weeks)로 제한한다. weeks가 null/undefined면 전체기간을 그대로 쓴다.
// 4-4(mealCountRecommendation.js)에서도 같은 기간 필터링이 필요해 export한다(재사용,
// 동일 로직 재작성 방지).
export function filterByPeriod(records, weeks, referenceDateISO) {
  if (!weeks) return records
  const reference = referenceDateISO || todayISO()
  const windowDays = weeks * 7
  return records.filter((r) => {
    const diff = diffDays(r.date, reference) // reference - r.date
    return Number.isFinite(diff) && diff >= 0 && diff < windowDays
  })
}

// 선택한 끼니(mealType)의 메뉴별 통계를 계산한다.
// allRecords: getAllMealCountRecords()의 결과를 그대로 넘긴다.
// weeks: null(기본값)=전체기간, 4=최근 4주.
export function getMenuMealCountStats(allRecords, mealType, { weeks = null, referenceDateISO = null } = {}) {
  const periodRecords = filterByPeriod(withValidActualCount(allRecords), weeks, referenceDateISO)
  const mealRecords = periodRecords.filter((r) => r.mealType === mealType)

  // menuId별로 "그 메뉴가 포함된 끼니" 각각의 (실제식수, 그 날의 요일+끼니 기준평균) 쌍을 모은다.
  // 기준평균은 항상 같은 분석 기간(periodRecords) 안에서 4-2 함수로 구한다 — 요일 효과를
  // occurrence 단위로 보정한 뒤 평균 내므로, 메뉴가 여러 요일에 걸쳐 나왔어도 왜곡되지 않는다.
  const byMenu = new Map()
  for (const record of mealRecords) {
    const day = weekdayOfDate(record.date)
    if (day == null) continue // 날짜가 깨진 기록은 요일 보정이 불가능해 제외한다

    const baseline = getAverageByWeekdayAndMeal(periodRecords, day, mealType).average
    if (baseline == null) continue // 방어적 처리(이 기록 자신이 그 버킷에 있어 보통은 발생하지 않음)

    const menuIds = Array.isArray(record.menuIds) ? record.menuIds : []
    for (const menuId of menuIds) {
      if (!menuId) continue
      if (!byMenu.has(menuId)) byMenu.set(menuId, [])
      byMenu.get(menuId).push({ actual: record.actualCount, baseline })
    }
  }

  const rows = []
  for (const [menuId, occurrences] of byMenu.entries()) {
    const menu = getMenuById(menuId) // 메뉴가 삭제됐으면 null — 중단하지 않고 안내만 표시(13장)
    const avgActual = average(occurrences.map((o) => o.actual))
    const avgBaseline = average(occurrences.map((o) => o.baseline))
    const diff = avgActual - avgBaseline
    const changeRatePercent = avgBaseline > 0 ? round1((diff / avgBaseline) * 100) : null

    rows.push({
      menuId,
      menuName: menu ? menu.name : '(삭제된 메뉴)',
      category: menu ? menu.category : null,
      servedCount: occurrences.length,
      avgActual: round1(avgActual),
      baselineAvg: round1(avgBaseline),
      diff: round1(diff),
      changeRatePercent,
      sampleSizeLabel: getSampleSizeLabel(occurrences.length),
    })
  }

  return rows
}
