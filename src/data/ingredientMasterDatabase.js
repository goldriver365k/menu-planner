// 식재료 마스터 DB — 향후 레시피/원가 계산에서 쓸 식재료 데이터를 LocalStorage에 저장한다.
// 기존 data/ingredientDatabase.js(레시피 원가 계산에 이미 쓰이고 있는 식재료 DB)는 건드리지
// 않는다 — 이 파일은 완전히 별도의 새 저장소다. menuDatabase.js/ingredientDatabase.js와 같은
// "항상 LocalStorage를 최신 소스로 읽고, 저장된 값이 없으면 빈 목록으로 시작" 패턴을 그대로
// 재사용한다(새 서버·외부 DB를 추가하지 않는다).

const STORAGE_KEY = 'menu-planner:ingredient-master-db:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('식재료 마스터 DB를 불러오지 못했습니다. 빈 목록으로 시작합니다.', err)
    return null
  }
}

function saveToStorage(ingredients) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ingredients))
  } catch (err) {
    console.warn('식재료 마스터 DB를 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  return loadFromStorage() || []
}

export function getAllIngredientsMaster() {
  return loadDatabase()
}

// 향후 레시피/원가 계산에서 쓸 "사용 가능한" 목록 — 비활성화(active=false)는 제외한다.
export function getActiveIngredientsMaster() {
  return loadDatabase().filter((ing) => ing.active !== false)
}

export function getIngredientMasterById(id) {
  return loadDatabase().find((ing) => ing.id === id) || null
}

function nextIngredientMasterId(ingredients) {
  let max = 0
  for (const ing of ingredients) {
    const match = /^IM(\d+)$/.exec(ing.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `IM${String(max + 1).padStart(4, '0')}`
}

function buildIngredientMasterRecord(id, data) {
  return {
    id,
    name: data.name,
    category: data.category,
    purchase_unit: data.purchase_unit,
    purchase_quantity: Number(data.purchase_quantity) || 0,
    purchase_price: Number(data.purchase_price) || 0,
    usable_yield: data.usable_yield === '' || data.usable_yield == null ? 100 : Number(data.usable_yield) || 0,
    price_source: data.price_source || '관리자 입력',
    updated_at: data.updated_at || new Date().toISOString().slice(0, 10),
    active: data.active ?? true,
    // KAMIS 매칭 코드는 관리자가 직접 입력하는 값이다 — 이름 유사도 등으로 자동 매칭을
    // 시도하지 않는다(잘못된 품목의 가격이 섞여 들어가는 것을 방지). 코드가 비어 있으면
    // 해당 식재료는 "미매칭"으로 취급한다.
    kamis_item_code: data.kamis_item_code || '',
    kamis_kind_code: data.kamis_kind_code || '',
    kamis_rank_code: data.kamis_rank_code || '',
    // kamis_reference_* 필드는 setKamisReferencePrice()를 통해서만 기록된다 — 일반 수정
    // 폼(updateIngredientMaster)에서는 절대 건드리지 않는다. 구매단가(purchase_price)와
    // 완전히 분리된, 참고용 전용 필드다.
    kamis_reference_price: data.kamis_reference_price ?? null,
    kamis_reference_unit: data.kamis_reference_unit || '',
    kamis_updated_at: data.kamis_updated_at || null,
    // STEP 5-3: 현재 재고 — 0(재고 없음)과 null(재고 미확인)을 구분한다. 단위는 이
    // 식재료의 purchase_unit을 그대로 쓴다(별도 재고 단위를 두지 않음). setCurrentStock()
    // 전용 setter로만 기록되며, 일반 수정 폼에서는 그대로 보존만 한다.
    current_stock: data.current_stock ?? null,
    stock_updated_at: data.stock_updated_at || null,
    // STEP 5-4: 실제 입고 시 기록되는 "가장 최근 실제 매입단가"(purchase_unit 1단위당 가격).
    // purchase_price(관리자 기준단가)와는 완전히 분리된 필드다 — setLastPurchasePrice()
    // 전용 setter로만 기록되고, purchase_price를 덮어쓰거나 삭제하지 않는다.
    last_purchase_price: data.last_purchase_price ?? null,
    last_purchase_unit: data.last_purchase_unit || '',
    last_purchase_date: data.last_purchase_date || null,
  }
}

export function addIngredientMaster(data) {
  const ingredients = loadDatabase()
  const newIngredient = buildIngredientMasterRecord(nextIngredientMasterId(ingredients), data)
  const next = [...ingredients, newIngredient]
  saveToStorage(next)
  return newIngredient
}

// 숫자 필드(purchase_quantity/purchase_price/usable_yield)는 추가(addIngredientMaster)와
// 수정 양쪽에서 항상 같은 방식으로 Number() 정규화한다 — 폼에서 올라온 문자열을 그대로
// 저장하면 이후 화면에서 "1,000원"처럼 콤마 포맷이 깨지거나 비교 연산이 꼬일 수 있다.
function mergeIngredientMasterPatch(existing, patch) {
  const merged = { ...existing, ...patch, id: existing.id }
  if (Object.prototype.hasOwnProperty.call(patch, 'purchase_quantity')) {
    merged.purchase_quantity = Number(patch.purchase_quantity) || 0
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'purchase_price')) {
    merged.purchase_price = Number(patch.purchase_price) || 0
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'usable_yield')) {
    merged.usable_yield = patch.usable_yield === '' || patch.usable_yield == null ? 100 : Number(patch.usable_yield) || 0
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'current_stock')) {
    const raw = patch.current_stock
    const parsed = raw === '' || raw == null ? null : Number(raw)
    merged.current_stock = parsed == null || (Number.isFinite(parsed) && parsed >= 0) ? parsed : existing.current_stock
  }
  return merged
}

export function updateIngredientMaster(id, patch) {
  const ingredients = loadDatabase()
  const next = ingredients.map((ing) => (ing.id === id ? mergeIngredientMasterPatch(ing, patch) : ing))
  saveToStorage(next)
  return next.find((ing) => ing.id === id)
}

export function setIngredientMasterActive(id, active) {
  return updateIngredientMaster(id, { active, updated_at: new Date().toISOString().slice(0, 10) })
}

// KAMIS 참고가격 전용 setter. updateIngredientMaster(일반 수정 폼)와 완전히 분리해 두어,
// 폼에서 kamis_reference_* 필드를 실수로 건드리거나 이 함수가 purchase_price를 건드리는
// 일이 구조적으로 불가능하게 한다. 가격 우선순위 결정(기존 거래처/관리자 구매단가 > 직접
// 입력 단가 > 최근 저장 단가 > KAMIS 참고가격)은 recipeCostCalc.js에서 처리하며, 여기서는
// 받은 값을 그대로 저장만 한다 — KAMIS 값이 purchase_price를 자동으로 덮어쓰지 않는다.
export function setKamisReferencePrice(id, { price, unit, updatedAt } = {}) {
  return updateIngredientMaster(id, {
    kamis_reference_price: price == null ? null : Number(price) || 0,
    kamis_reference_unit: unit || '',
    kamis_updated_at: updatedAt || new Date().toISOString().slice(0, 10),
  })
}

// STEP 5-3: 현재 재고 전용 setter. 빈 값/null은 "재고 미확인"으로 그대로 null 저장하고,
// 숫자(0 포함)만 유효성 검사를 거쳐 저장한다. 음수·숫자아님이면 { ok: false }를 돌려주고
// 기존 값을 건드리지 않는다.
export function setCurrentStock(id, currentStock) {
  const value = currentStock === '' || currentStock == null ? null : Number(currentStock)
  if (value != null && (!Number.isFinite(value) || value < 0)) {
    return { ok: false, reason: '현재 재고는 0 이상의 숫자만 입력할 수 있습니다.' }
  }
  const updated = updateIngredientMaster(id, {
    current_stock: value,
    stock_updated_at: new Date().toISOString().slice(0, 10),
  })
  return { ok: true, record: updated }
}

// STEP 5-4: 현재 재고에 delta(증감분, purchase_unit 기준)만 더한다. 실제 입고 저장
// (purchaseOrderStatus.js의 saveReceiving)에서만 쓰인다 — 중복 반영을 막기 위해 "이번에
// 새로 늘어난 만큼"만 delta로 전달받는다. 결과가 음수가 되지 않게 0 이하로는 내려가지
// 않는다(재고 미확인 상태는 0으로 취급해 더한다).
export function addToCurrentStock(id, delta) {
  const ingredient = getIngredientMasterById(id)
  if (!ingredient) return { ok: false, reason: '식재료를 찾을 수 없습니다.' }
  const base = Number(ingredient.current_stock) || 0
  const next = Math.max(0, base + (Number(delta) || 0))
  return setCurrentStock(id, next)
}

// STEP 5-4: 실제 입고 시의 매입단가(purchase_unit 1단위당 가격) 전용 setter. purchase_price나
// kamis_reference_price는 절대 건드리지 않는다 — 원가 계산 시 가격 우선순위를 가리는 데만
// 쓰이는, 완전히 별도의 "최근 실제 매입단가" 기록이다.
export function setLastPurchasePrice(id, { price, unit, date } = {}) {
  const value = Number(price)
  if (price == null || !Number.isFinite(value) || value < 0) {
    return { ok: false, reason: '매입단가가 올바르지 않습니다.' }
  }
  const updated = updateIngredientMaster(id, {
    last_purchase_price: value,
    last_purchase_unit: unit || '',
    last_purchase_date: date || new Date().toISOString().slice(0, 10),
  })
  return { ok: true, record: updated }
}
