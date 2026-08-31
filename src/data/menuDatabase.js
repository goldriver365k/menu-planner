import seedMenus from './menu-database.json'

// STEP 9: 관리자 메뉴 관리(추가/수정/삭제/사용중지)가 실제 메뉴 생성에도 반영되도록,
// 이 파일의 데이터 소스를 정적 JSON 직접 참조에서 LocalStorage 기반 저장소로
// 바꿨다. 최초 실행 시 STEP 2에서 만든 테스트 데이터(seedMenus)로 한 번 채워지고,
// 이후에는 관리자 화면에서의 변경 사항이 계속 여기 저장된다.
// STEP 11에서 Supabase 연동이 붙을 때도 아래 함수들의 시그니처만 유지하면
// 호출하는 쪽(메뉴 생성 로직 등) 코드는 바뀌지 않는다.

const STORAGE_KEY = 'menu-planner:menu-database:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('메뉴 DB를 불러오지 못했습니다. 초기 테스트 데이터로 복구합니다.', err)
    return null
  }
}

function saveToStorage(menus) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(menus))
  } catch (err) {
    console.warn('메뉴 DB를 저장하지 못했습니다.', err)
  }
}

// 항상 LocalStorage를 최신 소스로 읽는다 (데이터 규모가 작아 매번 읽어도 부담 없음).
// 저장된 값이 없으면 최초 1회 STEP 2 테스트 데이터로 시드한다.
function loadDatabase() {
  const stored = loadFromStorage()
  if (stored) return stored
  saveToStorage(seedMenus)
  return seedMenus
}

export function getAllMenus() {
  return loadDatabase()
}

// 생성 로직에서 쓰는 목록은 사용중지(active=false) 메뉴를 제외한다 (27장·30장).
export function getActiveMenus() {
  return loadDatabase().filter((menu) => menu.active !== false)
}

export function getMenuById(id) {
  return loadDatabase().find((menu) => menu.id === id) || null
}

export function getMenusByCategory(category, subcategory = null) {
  return getActiveMenus().filter((menu) => {
    if (menu.category !== category) return false
    if (subcategory && menu.subcategory !== subcategory) return false
    return true
  })
}

// 카테고리(+서브카테고리)별 개수 집계 — 테스트 DB 검증에 사용 (사용중지 메뉴도 포함해 전체 현황을 보여준다)
export function countMenusByCategory() {
  const counts = {}
  for (const menu of loadDatabase()) {
    const key = menu.subcategory ? `${menu.category}:${menu.subcategory}` : menu.category
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function nextMenuId(menus) {
  let max = 0
  for (const menu of menus) {
    const match = /^M(\d+)$/.exec(menu.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `M${String(max + 1).padStart(4, '0')}`
}

// --- 관리자 CRUD (30장: 추가/수정/삭제/사용중지, 카테고리 변경 포함) ---

export function addMenu(menuData) {
  const menus = loadDatabase()
  const newMenu = {
    id: nextMenuId(menus),
    name: menuData.name,
    category: menuData.category,
    subcategory: menuData.subcategory || null,
    main_ingredient: menuData.main_ingredient || '',
    cooking_method: menuData.cooking_method || '',
    cost_per_serving: Number(menuData.cost_per_serving) || 0,
    calories: Number(menuData.calories) || 0,
    protein: Number(menuData.protein) || 0,
    carbohydrate: Number(menuData.carbohydrate) || 0,
    fat: Number(menuData.fat) || 0,
    allergens: Array.isArray(menuData.allergens) ? menuData.allergens : [],
    active: menuData.active ?? true,
    created_at: new Date().toISOString().slice(0, 10),
  }
  const next = [...menus, newMenu]
  saveToStorage(next)
  return newMenu
}

export function updateMenu(id, patch) {
  const menus = loadDatabase()
  const next = menus.map((menu) => (menu.id === id ? { ...menu, ...patch, id: menu.id } : menu))
  saveToStorage(next)
  return next.find((m) => m.id === id)
}

export function setMenuActive(id, active) {
  return updateMenu(id, { active })
}

export function deleteMenu(id) {
  const menus = loadDatabase()
  const next = menus.filter((menu) => menu.id !== id)
  saveToStorage(next)
}

// 관리자 화면에서 실수로 데이터를 크게 망가뜨렸을 때 STEP 2 테스트 데이터로 되돌리는 用.
export function resetMenuDatabaseToSeed() {
  saveToStorage(seedMenus)
  return seedMenus
}
