import seedIngredients from './ingredient-database.json'

// menuDatabase.js와 동일한 패턴: 최초 실행 시 시드 데이터로 채우고, 이후 관리자 화면에서의
// 변경 사항이 LocalStorage에 계속 저장된다. STEP 12에서 공공 식자재 가격 API가 붙으면
// public_price/price_source/price_updated_at을 자동 갱신하는 용도로 이 저장소를 그대로 쓴다.

const STORAGE_KEY = 'menu-planner:ingredient-database:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('식재료 DB를 불러오지 못했습니다. 초기 데이터로 복구합니다.', err)
    return null
  }
}

function saveToStorage(ingredients) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ingredients))
  } catch (err) {
    console.warn('식재료 DB를 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  const stored = loadFromStorage()
  if (stored) return stored
  saveToStorage(seedIngredients)
  return seedIngredients
}

export function getAllIngredients() {
  return loadDatabase()
}

export function getIngredientById(id) {
  return loadDatabase().find((i) => i.id === id) || null
}

function nextIngredientId(ingredients) {
  let max = 0
  for (const ing of ingredients) {
    const match = /^I(\d+)$/.exec(ing.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `I${String(max + 1).padStart(4, '0')}`
}

export function addIngredient(data) {
  const ingredients = loadDatabase()
  const newIngredient = {
    id: nextIngredientId(ingredients),
    name: data.name,
    category: data.category,
    purchase_unit: data.purchase_unit,
    public_price: Number(data.public_price) || 0,
    purchase_price: Number(data.purchase_price) || 0,
    calculation_price: Number(data.calculation_price) || 0,
    price_source: data.price_source || '관리자 입력',
    price_updated_at: data.price_updated_at || new Date().toISOString().slice(0, 10),
    calories_per_100g: Number(data.calories_per_100g) || 0,
    protein: Number(data.protein) || 0,
    carbohydrate: Number(data.carbohydrate) || 0,
    fat: Number(data.fat) || 0,
    sodium: Number(data.sodium) || 0,
    allergens: Array.isArray(data.allergens) ? data.allergens : [],
  }
  saveToStorage([...ingredients, newIngredient])
  return newIngredient
}

export function updateIngredient(id, patch) {
  const ingredients = loadDatabase()
  const next = ingredients.map((ing) => (ing.id === id ? { ...ing, ...patch, id: ing.id } : ing))
  saveToStorage(next)
  return next.find((i) => i.id === id)
}

export function deleteIngredient(id) {
  const ingredients = loadDatabase()
  saveToStorage(ingredients.filter((ing) => ing.id !== id))
}

export function resetIngredientDatabaseToSeed() {
  saveToStorage(seedIngredients)
  return seedIngredients
}
