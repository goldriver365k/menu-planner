// MENU_HISTORY — 11~12장의 14일 중복 검사에 사용하는 사용 이력 데이터.
// 아침/점심/저녁을 통합해서 검사하므로 meal_type과 무관하게 menu_id + used_date만
// 비교한다. menu_category는 추후 카테고리별 통계·리포트용으로 함께 저장해 둔다.
//
// 레코드 형태 (필수값, 12장):
// {
//   menu_id: 'M0001',
//   used_date: '2026-08-31',   // YYYY-MM-DD
//   meal_type: 'lunch',
//   menu_category: 'MAIN_1',
// }

export const DEDUP_WINDOW_DAYS = 14

export function createHistoryEntry(menuId, usedDate, mealType, menuCategory) {
  return { menu_id: menuId, used_date: usedDate, meal_type: mealType, menu_category: menuCategory }
}

// 날짜 문자열(YYYY-MM-DD) 사이의 일수 차이 (b - a, b가 미래면 양수)
export function diffDays(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00`)
  const b = new Date(`${dateB}T00:00:00`)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

// 5-1 점검에서 발견: Date 객체를 로컬 날짜 기준 YYYY-MM-DD로 변환한다.
// toISOString()은 UTC로 변환하므로, UTC보다 시간대가 빠른 지역(한국 UTC+9 등)에서는
// 로컬 자정에 만든 날짜가 전날로 밀린다 — 로컬 날짜 구성요소를 직접 읽어 그 문제를 피한다.
function toLocalISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysISO(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toLocalISODate(date)
}

// 로컬 기준 "오늘"을 YYYY-MM-DD로. mealCountStats.js/menuMealCountStats.js의 "최근 N주"
// 기준일 기본값 등에서 재사용한다(같은 로직을 다시 구현하지 않는다).
export function todayISO() {
  return toLocalISODate(new Date())
}

// referenceDate 기준으로 사용 이력이 아직 14일 제한 안에 있어 추천이 금지된 상태인지.
export function isWithinDedupWindow(usedDate, referenceDate) {
  const diff = diffDays(usedDate, referenceDate)
  return diff >= 0 && diff < DEDUP_WINDOW_DAYS
}

// history 배열에서 referenceDate 기준으로 아직 유효한(=14일 이내) menu_id 집합을 만든다.
export function buildExcludedIdSet(history, referenceDate) {
  const excluded = new Set()
  for (const entry of history) {
    if (isWithinDedupWindow(entry.used_date, referenceDate)) excluded.add(entry.menu_id)
  }
  return excluded
}

// 더 이상 어떤 미래 계산에도 영향을 줄 수 없는(=14일보다 오래된) 이력을 정리한다.
export function pruneHistory(history, referenceDate) {
  return history.filter((entry) => isWithinDedupWindow(entry.used_date, referenceDate))
}
