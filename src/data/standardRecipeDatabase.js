// 표준 레시피 DB — 메뉴(menuDatabase.js, id: M0001...)와 식재료 마스터 DB
// (ingredientMasterDatabase.js, id: IM0001...)를 1인분 기준 사용량으로 연결한다.
//
// 기존 data/recipeDatabase.js(메뉴 ↔ 기존 ingredientDatabase.js 식재료를 연결하는 레시피,
// 관리자 메뉴 관리 화면의 "레시피" 버튼이 이미 쓰고 있음)는 건드리지 않는다 — 이번 표준
// 레시피는 완전히 별도의 새 저장소이며, 기존 레시피 화면/로직과는 무관하다.
//
// 저장 형태는 menu_id별로 묶지 않고 recipeDatabase.js와 같은 "평평한 줄(line) 배열" 패턴을
// 그대로 재사용한다 — 한 메뉴의 레시피 줄 전체를 통째로 교체(저장/수정)하는 게 더 간단하고,
// 기존 코드베이스 관례와도 일치한다.

const STORAGE_KEY = 'menu-planner:standard-recipe-db:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('표준 레시피 DB를 불러오지 못했습니다. 빈 목록으로 시작합니다.', err)
    return null
  }
}

function saveToStorage(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (err) {
    console.warn('표준 레시피 DB를 저장하지 못했습니다.', err)
  }
}

function loadDatabase() {
  return loadFromStorage() || []
}

export function getAllStandardRecipeEntries() {
  return loadDatabase()
}

// 레시피 줄 형태: { menu_id: 'M0001', ingredient_id: 'IM0001', quantity: 100, unit: 'g' }
// quantity는 항상 "1인분 기준" 사용량이다.
export function getStandardRecipeForMenu(menuId) {
  return loadDatabase().filter((entry) => entry.menu_id === menuId)
}

export function menuHasStandardRecipe(menuId) {
  return loadDatabase().some((entry) => entry.menu_id === menuId)
}

function sanitizeLines(menuId, lines) {
  return lines
    .filter((line) => line.ingredient_id && Number(line.quantity) > 0)
    .map((line) => ({
      menu_id: menuId,
      ingredient_id: line.ingredient_id,
      quantity: Number(line.quantity) || 0,
      unit: line.unit || 'g',
    }))
}

// 해당 메뉴의 레시피 줄 전체를 교체한다(레시피 저장·수정 공용 — 처음 저장이든 이후 고치는
// 것이든 항상 전체를 다시 쓴다). 수량이 0 이하이거나 식재료가 비어 있는 줄은 저장하지 않는다.
export function saveStandardRecipeForMenu(menuId, lines) {
  const others = loadDatabase().filter((entry) => entry.menu_id !== menuId)
  const next = [...others, ...sanitizeLines(menuId, lines)]
  saveToStorage(next)
  return getStandardRecipeForMenu(menuId)
}

// 레시피 복사 — 한 메뉴의 레시피를 다른 메뉴에 그대로 복사한다. 대상 메뉴에 이미 레시피가
// 있으면 통째로 덮어쓴다(확인은 호출하는 쪽 UI 책임).
export function copyStandardRecipeToMenu(fromMenuId, toMenuId) {
  const sourceLines = getStandardRecipeForMenu(fromMenuId)
  return saveStandardRecipeForMenu(toMenuId, sourceLines)
}
