// 실사재고(물리적으로 직접 센 재고) 기록 — 시스템이 들고 있는 "이론재고"
// (ingredientMasterDatabase.js의 current_stock, 5-4 실제 입고로만 갱신되는 값)와
// 실제로 세어본 값을 비교해 재고차이를 확인하는 데 쓴다.
//
// 이 앱은 판매/준비 시 재고를 자동 차감하지 않으므로(명세 전반에서 반복적으로 금지),
// "이론재고"라는 별도의 사용량 추적 장부는 두지 않는다 — current_stock 자체를 이론재고로
// 간주하고, 실사 입력 시점의 current_stock을 snapshot(theoreticalQuantity)으로 함께
// 저장해 나중에 재고가 바뀌어도 "그때 비교했던 이론값"이 흔들리지 않게 한다.
//
// 실사 입력이 current_stock을 자동으로 고치지는 않는다 — 관리자가 필요하면 식재료
// 마스터 DB 화면에서 직접 current_stock을 다시 입력한다(기존 setCurrentStock 재사용).

const STORAGE_KEY = 'menu-planner:inventory-counts:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('실사재고 기록을 불러오지 못했습니다. 빈 목록으로 시작합니다.', err)
    return null
  }
}

function saveToStorage(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('실사재고 기록을 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  return loadFromStorage() || []
}

export function getAllInventoryCounts() {
  return loadDatabase()
}

export function getInventoryCountsByDate(date) {
  return loadDatabase().filter((r) => r.date === date)
}

export function getInventoryCount(date, ingredientId) {
  return loadDatabase().find((r) => r.date === date && r.ingredientId === ingredientId) || null
}

// 식재료별 "가장 최근" 실사 기록 — 대시보드의 "재고 점검 필요" 집계에 쓴다(날짜와 무관하게
// 가장 최근에 센 결과가 현재 상태를 대표한다).
export function getLatestInventoryCountByIngredient() {
  const byIngredient = new Map()
  for (const record of loadDatabase()) {
    const existing = byIngredient.get(record.ingredientId)
    if (!existing || record.date > existing.date) byIngredient.set(record.ingredientId, record)
  }
  return Array.from(byIngredient.values())
}

function nextInventoryCountId(records) {
  let max = 0
  for (const r of records) {
    const match = /^IC(\d+)$/.exec(r.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `IC${String(max + 1).padStart(6, '0')}`
}

// 실사수량은 0 이상의 숫자만 허용한다(0=실제로 하나도 없음, null/빈값=아직 세지 않음 —
// 둘을 구분한다). date+ingredientId 조합당 하나의 기록만 유지한다.
function parseCountedQuantity(raw) {
  if (raw === '' || raw == null) return { ok: true, value: null }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, reason: '실사수량은 0 이상의 숫자만 입력할 수 있습니다.' }
  }
  return { ok: true, value: n }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

// theoreticalQuantity: 입력 시점의 current_stock(이론재고로 간주). null이면 "이론재고
// 미확인" 상태로 저장하고, variance/variancePercent는 계산하지 않는다(0으로 나누기나
// 의미없는 비교를 피한다).
export function bulkSetInventoryCounts(entries) {
  const records = loadDatabase()
  let next = [...records]
  const now = new Date().toISOString()
  const results = []

  for (const entry of entries) {
    const { date, ingredientId, countedQuantity, theoreticalQuantity } = entry
    const parsed = parseCountedQuantity(countedQuantity)
    if (!parsed.ok) {
      results.push({ ok: false, ingredientId, reason: parsed.reason })
      continue
    }
    if (parsed.value == null) {
      results.push({ ok: true, ingredientId, record: null })
      continue
    }

    const theoretical = theoreticalQuantity == null ? null : Number(theoreticalQuantity)
    const variance = theoretical != null ? round2(parsed.value - theoretical) : null
    const variancePercent = theoretical != null && theoretical > 0 ? round2((variance / theoretical) * 100) : null

    const idx = next.findIndex((r) => r.date === date && r.ingredientId === ingredientId)
    const payload = { countedQuantity: parsed.value, theoreticalQuantity: theoretical, variance, variancePercent, updatedAt: now }
    if (idx >= 0) {
      const updated = { ...next[idx], ...payload }
      next = next.map((r, i) => (i === idx ? updated : r))
      results.push({ ok: true, ingredientId, record: updated })
    } else {
      const newRecord = { id: nextInventoryCountId(next), date, ingredientId, ...payload, createdAt: now }
      next = [...next, newRecord]
      results.push({ ok: true, ingredientId, record: newRecord })
    }
  }

  saveToStorage(next)
  return results
}

export function setInventoryCount(date, ingredientId, countedQuantity, theoreticalQuantity) {
  return bulkSetInventoryCounts([{ date, ingredientId, countedQuantity, theoreticalQuantity }])[0]
}
