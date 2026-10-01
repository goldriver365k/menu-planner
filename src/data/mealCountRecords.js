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
  const existing = existingIndex >= 0 ? records[existingIndex] : null
  const nextRecord = {
    date,
    mealType,
    expectedCount: Number(expectedCount) || 0,
    actualCount: parsedActual,
    menuIds: Array.isArray(menuIds) ? menuIds : [],
    // STEP 4-5/4-6: 잔반/폐기/계획준비량 필드는 이 함수가 다루지 않는다 — 기존 값을
    // 그대로 보존해야 "실제 식수"만 다시 저장해도 이미 기록해 둔 값들이 지워지지 않는다.
    preparedCount: existing?.preparedCount ?? null,
    leftoverCount: existing?.leftoverCount ?? null,
    wasteCount: existing?.wasteCount ?? null,
    plannedPreparationCount: existing?.plannedPreparationCount ?? null,
    updated_at: new Date().toISOString().slice(0, 10),
  }

  const next = existingIndex >= 0 ? records.map((r, i) => (i === existingIndex ? nextRecord : r)) : [...records, nextRecord]
  saveToStorage(next)
  return { ok: true, record: nextRecord }
}

// STEP 4-2: 통계 화면("식수 통계")에서 잘못 입력된 실제 식수를 고치는 수정 기능.
// 같은 유효성 검사(음수/숫자아님 거부)를 타도록 saveActualMealCount를 그대로 재사용하고,
// 그 기록의 expectedCount/menuIds는 그대로 유지한다(이 화면은 실제 식수만 고친다).
export function updateMealCountActual(date, mealType, actualCount) {
  const existing = getMealCountRecord(date, mealType)
  if (!existing) return { ok: false, reason: '기록을 찾을 수 없습니다.' }
  return saveActualMealCount(date, mealType, {
    expectedCount: existing.expectedCount,
    actualCount,
    menuIds: existing.menuIds,
  })
}

export function deleteMealCountRecord(date, mealType) {
  const records = loadDatabase()
  const key = recordKey(date, mealType)
  const next = records.filter((r) => recordKey(r.date, r.mealType) !== key)
  saveToStorage(next)
  return next
}

// 0(실제로 없음)과 미입력(null, 기록하지 않음)을 구분한다 — 빈 문자열/undefined/null은
// null로, 그 외는 숫자로 검사한다. 음수·숫자아님이면 { ok: false }.
function parseNullableNonNegative(value) {
  if (value === '' || value == null) return { ok: true, value: null }
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return { ok: false, value: null }
  return { ok: true, value: n }
}

// STEP 4-5: 잔반/폐기 기록 — 같은 날짜+끼니의 기존 4-1 레코드를 확장한다(새 LocalStorage
// key를 만들지 않는다). preparedCount/leftoverCount/wasteCount는 모두 선택값이며, 서로
// 독립적으로 null을 허용한다(leftoverCount를 안다고 wasteCount를 자동으로 만들어내지
// 않는다). expectedCount/actualCount/menuIds는 기존 값을 그대로 보존한다 — 이 함수는
// 잔반 관련 필드만 바꾼다.
export function saveLeftoverRecord(date, mealType, { preparedCount, leftoverCount, wasteCount }) {
  const prepared = parseNullableNonNegative(preparedCount)
  const leftover = parseNullableNonNegative(leftoverCount)
  const waste = parseNullableNonNegative(wasteCount)
  if (!prepared.ok || !leftover.ok || !waste.ok) {
    return { ok: false, reason: '준비량/남은 음식/폐기는 0 이상의 숫자만 입력할 수 있습니다.' }
  }

  const records = loadDatabase()
  const key = recordKey(date, mealType)
  const existingIndex = records.findIndex((r) => recordKey(r.date, r.mealType) === key)
  const existing = existingIndex >= 0 ? records[existingIndex] : null
  const nextRecord = {
    date,
    mealType,
    expectedCount: Number(existing?.expectedCount) || 0,
    actualCount: typeof existing?.actualCount === 'number' ? existing.actualCount : null,
    menuIds: Array.isArray(existing?.menuIds) ? existing.menuIds : [],
    preparedCount: prepared.value,
    leftoverCount: leftover.value,
    wasteCount: waste.value,
    // STEP 4-6: 계획 준비량도 이 함수가 다루지 않는 필드라 그대로 보존한다.
    plannedPreparationCount: existing?.plannedPreparationCount ?? null,
    updated_at: new Date().toISOString().slice(0, 10),
  }

  const next = existingIndex >= 0 ? records.map((r, i) => (i === existingIndex ? nextRecord : r)) : [...records, nextRecord]
  saveToStorage(next)
  return { ok: true, record: nextRecord }
}

// 16장: 전체 기록을 지우지 않고 잔반 관련 값만 비운다(actualCount 등은 그대로 보존).
export function clearLeftoverRecord(date, mealType) {
  return saveLeftoverRecord(date, mealType, { preparedCount: null, leftoverCount: null, wasteCount: null })
}

// STEP 4-6: 추천 준비량(plannedPreparationCount, 계획값)은 실적값인 preparedCount와
// 절대 같은 필드로 취급하지 않는다(17장) — 사용자가 [추천 준비량 적용]을 눌렀을 때만
// 이 함수가 호출되고, 그 외 필드(expectedCount/actualCount/menuIds/preparedCount/
// leftoverCount/wasteCount)는 모두 그대로 보존한다.
export function savePlannedPreparationCount(date, mealType, plannedPreparationCount) {
  const parsed = parseNullableNonNegative(plannedPreparationCount)
  if (!parsed.ok) {
    return { ok: false, reason: '계획 준비량은 0 이상의 숫자만 입력할 수 있습니다.' }
  }

  const records = loadDatabase()
  const key = recordKey(date, mealType)
  const existingIndex = records.findIndex((r) => recordKey(r.date, r.mealType) === key)
  const existing = existingIndex >= 0 ? records[existingIndex] : null
  const nextRecord = {
    date,
    mealType,
    expectedCount: Number(existing?.expectedCount) || 0,
    actualCount: typeof existing?.actualCount === 'number' ? existing.actualCount : null,
    menuIds: Array.isArray(existing?.menuIds) ? existing.menuIds : [],
    preparedCount: typeof existing?.preparedCount === 'number' ? existing.preparedCount : null,
    leftoverCount: typeof existing?.leftoverCount === 'number' ? existing.leftoverCount : null,
    wasteCount: typeof existing?.wasteCount === 'number' ? existing.wasteCount : null,
    plannedPreparationCount: parsed.value,
    updated_at: new Date().toISOString().slice(0, 10),
  }

  const next = existingIndex >= 0 ? records.map((r, i) => (i === existingIndex ? nextRecord : r)) : [...records, nextRecord]
  saveToStorage(next)
  return { ok: true, record: nextRecord }
}
