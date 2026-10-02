// 메뉴별 사전 준비계획(plannedMenuQuantity) — 5-8에서 추천한 수량을 사람이 확인하고
// 확정한 "이 날짜에 이 메뉴를 몇 개 준비할 것인가"를 저장한다.
//
// 5-7의 실제 판매수량(quantity, salesRecords.js)과는 완전히 다른 값이다 — quantity는
// "영업 종료 후 실제로 몇 개 팔렸는가"의 사후 기록이고, plannedMenuQuantity는 "영업 시작
// 전에 얼마나 준비할 계획인가"의 사전 계획이다. 두 값은 절대 같은 필드에 섞지 않는다.
//
// 이 저장소는 5-7의 salesRecords.js와 달리 "당시 값을 snapshot으로 고정"하는 규칙이
// 없다 — plannedMenuQuantity는 사용자가 언제든 자유롭게 고쳐 쓰는 하나의 계획값이다.

const STORAGE_KEY = 'menu-planner:menu-production-plans:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('메뉴별 준비계획을 불러오지 못했습니다. 빈 목록으로 시작합니다.', err)
    return null
  }
}

function saveToStorage(plans) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  } catch (err) {
    console.warn('메뉴별 준비계획을 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  return loadFromStorage() || []
}

export function getAllProductionPlans() {
  return loadDatabase()
}

export function getProductionPlansByDate(date) {
  return loadDatabase().filter((p) => p.date === date)
}

export function getProductionPlan(date, menuId) {
  return loadDatabase().find((p) => p.date === date && p.menuId === menuId) || null
}

// plannedMenuQuantity는 0 이상의 정수만 허용한다. 빈 값/null은 "아직 계획하지 않음"으로
// 보고, 기존 계획이 있었다면 지운다(판매기록의 "수량만 수정, snapshot 유지"와 달리 이
// 값은 자유롭게 고치는 계획값이라 비워서 취소하는 것도 정상 동작이다).
function parsePlannedQuantity(raw) {
  if (raw === '' || raw == null) return { ok: true, value: null }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    return { ok: false, reason: '계획수량은 0 이상의 정수만 입력할 수 있습니다.' }
  }
  return { ok: true, value: n }
}

// date+menuId 조합당 하나의 계획만 유지한다(15장).
export function bulkSetProductionPlans(entries) {
  const plans = loadDatabase()
  let next = [...plans]
  const now = new Date().toISOString()
  const results = []

  for (const entry of entries) {
    const { date, menuId, plannedMenuQuantity } = entry
    const parsed = parsePlannedQuantity(plannedMenuQuantity)
    if (!parsed.ok) {
      results.push({ ok: false, menuId, reason: parsed.reason })
      continue
    }

    const idx = next.findIndex((p) => p.date === date && p.menuId === menuId)
    if (parsed.value == null) {
      if (idx >= 0) next = next.filter((_, i) => i !== idx)
      results.push({ ok: true, menuId, record: null })
      continue
    }

    if (idx >= 0) {
      const updated = { ...next[idx], plannedMenuQuantity: parsed.value, updatedAt: now }
      next = next.map((p, i) => (i === idx ? updated : p))
      results.push({ ok: true, menuId, record: updated })
    } else {
      const newRecord = { date, menuId, plannedMenuQuantity: parsed.value, createdAt: now, updatedAt: now }
      next = [...next, newRecord]
      results.push({ ok: true, menuId, record: newRecord })
    }
  }

  saveToStorage(next)
  return results
}

export function setProductionPlan(date, menuId, plannedMenuQuantity) {
  return bulkSetProductionPlans([{ date, menuId, plannedMenuQuantity }])[0]
}
