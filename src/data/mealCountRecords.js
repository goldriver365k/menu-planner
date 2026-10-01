// STEP 4-1: 예상/실제 식수 기록 — 끼니(날짜+구분)별로 예상 식수와 실제 식수를 기록해 둔다.
// menuDatabase.js/ingredientMasterDatabase.js와 같은 "항상 LocalStorage를 최신 소스로
// 읽고, 저장된 값이 없으면 빈 목록으로 시작" 패턴을 그대로 재사용한다(새 서버/DB 없음).
//
// 이번 단계에서는 데이터만 정확하게 쌓아 둔다 — 분석/추천/통계 기능은 만들지 않는다.

const STORAGE_KEY = 'menu-planner:meal-count-records:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('식수 기록을 불러오지 못했습니다. 빈 목록으로 시작합니다.', err)
    return null
  }
}

function saveToStorage(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('식수 기록을 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  return loadFromStorage() || []
}

function recordKey(date, mealType) {
  return `${date}:${mealType}`
}

export function getAllMealCountRecords() {
  return loadDatabase()
}

export function getMealCountRecord(date, mealType) {
  return loadDatabase().find((r) => r.date === date && r.mealType === mealType) || null
}

// actualCount 유효성 검사: 음수 불가, 숫자가 아니면 저장하지 않는다. 유효하지 않으면
// { ok: false, reason }을 돌려주고 기존 저장값은 전혀 건드리지 않는다.
export function saveActualMealCount(date, mealType, { expectedCount, actualCount, menuIds }) {
  const parsedActual = actualCount === '' || actualCount == null ? null : Number(actualCount)
  if (parsedActual != null && (!Number.isFinite(parsedActual) || parsedActual < 0)) {
    return { ok: false, reason: '실제 식수는 0 이상의 숫자만 입력할 수 있습니다.' }
  }

  const records = loadDatabase()
  const key = recordKey(date, mealType)
  const existingIndex = records.findIndex((r) => recordKey(r.date, r.mealType) === key)
  const nextRecord = {
    date,
    mealType,
    expectedCount: Number(expectedCount) || 0,
    actualCount: parsedActual,
    menuIds: Array.isArray(menuIds) ? menuIds : [],
    updated_at: new Date().toISOString().slice(0, 10),
  }

  const next = existingIndex >= 0 ? records.map((r, i) => (i === existingIndex ? nextRecord : r)) : [...records, nextRecord]
  saveToStorage(next)
  return { ok: true, record: nextRecord }
}
