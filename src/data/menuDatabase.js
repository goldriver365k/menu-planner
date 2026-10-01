import seedMenus from './menu-database.json'

// STEP 9: 관리자 메뉴 관리(추가/수정/삭제/사용중지)가 실제 메뉴 생성에도 반영되도록,
// 이 파일의 데이터 소스를 정적 JSON 직접 참조에서 LocalStorage 기반 저장소로
// 바꿨다. 최초 실행 시 STEP 2에서 만든 테스트 데이터(seedMenus)로 한 번 채워지고,
// 이후에는 관리자 화면에서의 변경 사항이 계속 여기 저장된다.
// STEP 11에서 Supabase 연동이 붙을 때도 아래 함수들의 시그니처만 유지하면
// 호출하는 쪽(메뉴 생성 로직 등) 코드는 바뀌지 않는다.
//
// STEP 14: NEIS 실제 급식 데이터로 메뉴 DB를 확장하면서 메뉴 레코드에 출처(source)와
// 원가/영양 검증 여부(cost_verified/nutrition_verified) 등의 필드를 추가했다. 기존
// LocalStorage에 이미 저장된 메뉴(이 필드들이 없음)나 이전 버전 코드가 저장한 값도
// withDefaults()가 항상 안전한 기본값을 채워주므로 오류 없이 계속 동작한다.

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

// STEP 14: 예전 데이터(필드 자체가 없음)와 NEIS 가져오기로 생긴 새 필드를 가진 데이터가
// 섞여도 호출하는 쪽은 항상 같은 모양의 레코드를 받도록 기본값을 채운다. 이미 저장된 값은
// 절대 덮어쓰지 않는다 — nullish(??)/빈 문자열 기준으로 "없을 때만" 채운다.
function withDefaults(menu) {
  if (!menu) return menu
  const hasCost = menu.cost_per_serving !== null && menu.cost_per_serving !== undefined
  return {
    ...menu,
    source: menu.source || 'SEED',
    source_count: menu.source_count ?? 1,
    possibleDuplicate: menu.possibleDuplicate ?? false,
    possibleDuplicateOf: menu.possibleDuplicateOf ?? null,
    cost_per_serving: hasCost ? menu.cost_per_serving : null,
    cost_verified: menu.cost_verified ?? hasCost,
    nutrition_verified: menu.nutrition_verified ?? true,
    protein_type: menu.protein_type || '',
    spicy_level: menu.spicy_level ?? 0,
    color_group: menu.color_group || '',
    // STEP 15(식단 품질 엔진): 1=가벼움 2=보통 3=무거움. 모르면 null로 두고 점수 계산
    // 시점(menuScoring.getEffectiveWeightLevel)에 이름 키워드로 추정한다 — 여기서 임의의
    // 숫자로 단정하면 "정말 모름"과 "보통으로 확인됨"을 구분할 수 없어진다.
    weight_level: menu.weight_level ?? null,
    season: Array.isArray(menu.season) ? menu.season : [],
    meal_type: Array.isArray(menu.meal_type) ? menu.meal_type : [],
  }
}

// 항상 LocalStorage를 최신 소스로 읽는다 (데이터 규모가 커져도 클라이언트 측 배열 순회는
// 수천 건 수준에서 충분히 가볍다). 저장된 값이 없으면 최초 1회 STEP 2 테스트 데이터로 시드한다.
function loadDatabase() {
  const stored = loadFromStorage()
  if (stored) return stored.map(withDefaults)
  saveToStorage(seedMenus)
  return seedMenus.map(withDefaults)
}

export function getAllMenus() {
  return loadDatabase()
}

// 생성 로직에서 쓰는 목록은 사용중지(active=false) 메뉴를 제외한다 (27장·30장).
// UNCLASSIFIED 상태인 메뉴는 category가 'UNCLASSIFIED'라 어떤 getMenusByCategory 호출과도
// 일치하지 않으므로, 관리자가 정식 카테고리로 재분류하기 전까지는 자동으로 식단 생성에서
// 제외된다(요청 명세 8·12장) — 별도 필터가 필요 없다.
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

// 미분류(UNCLASSIFIED) 메뉴 전용 조회 — 관리자 "미분류 메뉴" 화면에서 사용.
export function getUnclassifiedMenus() {
  return loadDatabase().filter((menu) => menu.category === 'UNCLASSIFIED')
}

function maxMenuIdNumber(menus) {
  let max = 0
  for (const menu of menus) {
    const match = /^M(\d+)$/.exec(menu.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max
}

// --- 관리자 CRUD (30장: 추가/수정/삭제/사용중지, 카테고리 변경 포함) ---
// STEP 14: 숫자 필드를 추가(addMenu)와 수정(updateMenu) 양쪽에서 항상 같은 방식으로
// 정규화한다 — 이전에는 addMenu만 Number() 변환을 했고 updateMenu는 폼에서 올라온 문자열을
// 그대로 저장해, 메뉴를 한 번 수정하면 cost_per_serving 등이 문자열로 바뀌는 버그가 있었다.
function buildMenuRecord(id, menuData) {
  const costRaw = menuData.cost_per_serving
  const hasCost = costRaw !== null && costRaw !== undefined && costRaw !== ''
  return {
    id,
    name: menuData.name,
    category: menuData.category,
    subcategory: menuData.subcategory || null,
    main_ingredient: menuData.main_ingredient || '',
    cooking_method: menuData.cooking_method || '',
    // NEIS 메뉴는 실제 매장 1인분 원가를 알 수 없으므로 임의로 0원을 채우지 않고
    // null + cost_verified:false로 남긴다 (작업지시서 15장) — UI는 "원가 미등록"으로 표시.
    cost_per_serving: hasCost ? Number(costRaw) || 0 : null,
    cost_verified: Object.prototype.hasOwnProperty.call(menuData, 'cost_verified')
      ? Boolean(menuData.cost_verified)
      : hasCost,
    calories: Number(menuData.calories) || 0,
    protein: Number(menuData.protein) || 0,
    carbohydrate: Number(menuData.carbohydrate) || 0,
    fat: Number(menuData.fat) || 0,
    nutrition_verified: menuData.nutrition_verified ?? true,
    allergens: Array.isArray(menuData.allergens) ? menuData.allergens : [],
    active: menuData.active ?? true,
    created_at: menuData.created_at || new Date().toISOString().slice(0, 10),
    source: menuData.source || 'ADMIN',
    source_count: menuData.source_count ?? 1,
    possibleDuplicate: menuData.possibleDuplicate ?? false,
    possibleDuplicateOf: menuData.possibleDuplicateOf ?? null,
    protein_type: menuData.protein_type || '',
    spicy_level: Number(menuData.spicy_level) || 0,
    color_group: menuData.color_group || '',
    weight_level: menuData.weight_level != null ? Number(menuData.weight_level) || null : null,
    season: Array.isArray(menuData.season) ? menuData.season : [],
    meal_type: Array.isArray(menuData.meal_type) ? menuData.meal_type : [],
  }
}

export function addMenu(menuData) {
  const menus = loadDatabase()
  const newMenu = buildMenuRecord(`M${String(maxMenuIdNumber(menus) + 1).padStart(4, '0')}`, menuData)
  const next = [...menus, newMenu]
  saveToStorage(next)
  return newMenu
}

// STEP 14: NEIS 가져오기 미리보기에서 관리자가 확정한 신규 메뉴를 한 번에 저장한다.
// addMenu를 메뉴마다 반복 호출하면 그때마다 LocalStorage 전체를 다시 읽고/직렬화해 써서
// 수백~수천 건 규모에서 느려지므로, 한 번만 읽고 한 번만 저장한다.
export function bulkAddMenus(menuDataList) {
  if (!menuDataList || menuDataList.length === 0) return []
  const menus = loadDatabase()
  let nextId = maxMenuIdNumber(menus)
  const created = []
  for (const menuData of menuDataList) {
    nextId += 1
    created.push(buildMenuRecord(`M${String(nextId).padStart(4, '0')}`, menuData))
  }
  saveToStorage([...menus, ...created])
  return created
}

function mergeMenuPatch(existing, patch) {
  const merged = { ...existing, ...patch, id: existing.id }

  if (Object.prototype.hasOwnProperty.call(patch, 'cost_per_serving')) {
    const raw = patch.cost_per_serving
    const hasCost = raw !== null && raw !== undefined && raw !== ''
    merged.cost_per_serving = hasCost ? Number(raw) || 0 : null
    merged.cost_verified = Object.prototype.hasOwnProperty.call(patch, 'cost_verified')
      ? Boolean(patch.cost_verified)
      : hasCost
  }

  for (const key of ['calories', 'protein', 'carbohydrate', 'fat', 'spicy_level']) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      merged[key] = Number(patch[key]) || 0
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'weight_level')) {
    merged.weight_level = patch.weight_level != null ? Number(patch.weight_level) || null : null
  }

  return merged
}

export function updateMenu(id, patch) {
  const menus = loadDatabase()
  const next = menus.map((menu) => (menu.id === id ? mergeMenuPatch(menu, patch) : menu))
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
  return seedMenus.map(withDefaults)
}
