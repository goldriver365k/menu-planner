// 실제 판매수량 수동 입력 기록 — POS 연동 없이 관리자가 하루 판매수량을 직접 입력해
// 실제 매출/실제 식재료비/식재료 기준 실제 이익을 계산하는 데 쓴다(작업지시서 5-7).
//
// 판매 당시의 판매가격(salePrice)과 1인분 식재료 원가(unitFoodCost)를 레코드에 그대로
// snapshot으로 저장한다 — 오늘 식재료 가격이나 메뉴 판매가가 바뀌어도 과거 판매기록의
// 매출/원가는 다시 계산하지 않는다(2장·3장·19장·20장, 이 저장소가 지키는 가장 중요한
// 규칙). 그래서 날짜+메뉴 조합에 기록이 이미 있으면 "수량만" 고치고, salePrice/
// unitFoodCost/menuNameSnapshot는 처음 저장할 때 찍은 값을 그대로 둔다.

const STORAGE_KEY = 'menu-planner:sales-records:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('판매 기록을 불러오지 못했습니다. 빈 목록으로 시작합니다.', err)
    return null
  }
}

function saveToStorage(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('판매 기록을 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  return loadFromStorage() || []
}

export function getAllSalesRecords() {
  return loadDatabase()
}

export function getSalesRecordsByDate(date) {
  return loadDatabase().filter((r) => r.date === date)
}

export function getSalesRecordsInRange(startDate, endDate) {
  return loadDatabase().filter((r) => r.date >= startDate && r.date <= endDate)
}

export function getSalesRecord(date, menuId) {
  return loadDatabase().find((r) => r.date === date && r.menuId === menuId) || null
}

function nextSalesRecordId(records) {
  let max = 0
  for (const r of records) {
    const match = /^SR(\d+)$/.exec(r.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `SR${String(max + 1).padStart(6, '0')}`
}

// 판매수량은 0 이상의 정수만 허용한다(27장). 빈 값/null은 "아직 입력하지 않음"이라 저장
// 자체를 건너뛴다 — 0과 미입력을 구분하기 위해 `??`/명시적 비교만 쓰고 `||`는 쓰지 않는다.
function parseQuantity(raw) {
  if (raw === '' || raw == null) return { ok: true, value: null }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    return { ok: false, reason: '판매수량은 0 이상의 정수만 입력할 수 있습니다.' }
  }
  return { ok: true, value: n }
}

// date+menuId 조합당 하나의 기록만 유지한다(25장 중복 방지). 여러 메뉴를 한 번에
// "오늘 판매수량 저장" 버튼으로 저장하는 용도라, 한 번만 읽고 한 번만 쓴다(bulkAddMenus와
// 같은 패턴). 수량이 빈 값인 항목은 결과에 record:null로 남기고 조용히 건너뛴다.
export function bulkUpsertSalesRecords(entries) {
  const records = loadDatabase()
  let next = [...records]
  const now = new Date().toISOString()
  const results = []

  for (const entry of entries) {
    const { date, menuId, quantity, salePrice, unitFoodCost, unitFoodCostStatus, menuNameSnapshot } = entry
    const parsed = parseQuantity(quantity)
    if (!parsed.ok) {
      results.push({ ok: false, menuId, reason: parsed.reason })
      continue
    }
    if (parsed.value == null) {
      results.push({ ok: true, menuId, record: null })
      continue
    }

    const idx = next.findIndex((r) => r.date === date && r.menuId === menuId)
    if (idx >= 0) {
      // 19장: 수량만 수정한다 — salePrice/unitFoodCost/menuNameSnapshot는 처음 저장 시의
      // snapshot을 그대로 유지하고, 지금의 현재 가격으로 덮어쓰지 않는다.
      const updated = { ...next[idx], quantity: parsed.value, updatedAt: now }
      next = next.map((r, i) => (i === idx ? updated : r))
      results.push({ ok: true, menuId, record: updated })
    } else {
      const newRecord = {
        id: nextSalesRecordId(next),
        date,
        menuId,
        quantity: parsed.value,
        salePrice: salePrice ?? null,
        unitFoodCost: unitFoodCost ?? null,
        unitFoodCostStatus: unitFoodCostStatus || 'UNAVAILABLE', // 'OK' | 'NO_RECIPE' | 'UNAVAILABLE'
        menuNameSnapshot: menuNameSnapshot || '',
        createdAt: now,
        updatedAt: now,
      }
      next = [...next, newRecord]
      results.push({ ok: true, menuId, record: newRecord })
    }
  }

  saveToStorage(next)
  return results
}

export function upsertSalesRecord(entry) {
  return bulkUpsertSalesRecords([entry])[0]
}
