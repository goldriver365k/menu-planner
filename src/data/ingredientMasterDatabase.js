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
