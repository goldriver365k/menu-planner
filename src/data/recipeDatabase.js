import seedRecipes from './recipe-database.json'

// RECIPE(26장): menu_id, ingredient_id, quantity, unit. 메뉴 하나당 여러 줄이 있을 수
// 있어 항상 menu_id 기준으로 묶어서 읽고 쓴다. menuDatabase.js/ingredientDatabase.js와
// 같은 LocalStorage 패턴을 쓴다.

const STORAGE_KEY = 'menu-planner:recipe-database:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('레시피 DB를 불러오지 못했습니다. 초기 데이터로 복구합니다.', err)
    return null
  }
}

function saveToStorage(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (err) {
    console.warn('레시피 DB를 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  const stored = loadFromStorage()
  if (stored) return stored
  saveToStorage(seedRecipes)
  return seedRecipes
}

export function getAllRecipeEntries() {
  return loadDatabase()
}

export function getRecipeForMenu(menuId) {
  return loadDatabase().filter((entry) => entry.menu_id === menuId)
}

export function menuHasRecipe(menuId) {
  return loadDatabase().some((entry) => entry.menu_id === menuId)
}

// 해당 메뉴의 레시피 줄 전체를 교체한다 (관리자가 편집 화면에서 통째로 다시 저장).
export function setRecipeForMenu(menuId, lines) {
  const others = loadDatabase().filter((entry) => entry.menu_id !== menuId)
  const next = [
    ...others,
    ...lines.map((line) => ({
      menu_id: menuId,
      ingredient_id: line.ingredient_id,
      quantity: Number(line.quantity) || 0,
      unit: line.unit,
    })),
  ]
  saveToStorage(next)
  return getRecipeForMenu(menuId)
}

export function deleteRecipeForMenu(menuId) {
  const next = loadDatabase().filter((entry) => entry.menu_id !== menuId)
  saveToStorage(next)
}
