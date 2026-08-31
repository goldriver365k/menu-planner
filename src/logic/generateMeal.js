import { getMenusByCategory } from '../data/menuDatabase'
import { buildMealSlotRoles, isSideRole, getItemAtRole, extractLockedRoles } from './menuSlots'

// STEP 3 "하루 3식" 구성 로직에 STEP 5의 14일 중복 제외(excludedIds), STEP 6의
// 개별 슬롯 잠금(lockedRoles + existingMeal)을 결합했다. 1차 메인 소/돼지/닭
// 순환 우선순위(14장)는 아직 적용하지 않는다.

function pickRandom(list, count = 1) {
  const pool = [...list]
  const picked = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

// excludedIds에 해당하는 항목을 제외하고 고른다. 제외했더니 고를 게 하나도
// 없으면(카테고리 재고 부족) 어쩔 수 없이 제외를 풀고 전체 목록에서 고른다.
function pickAvoiding(list, count, excludedIds) {
  const filtered = list.filter((item) => !excludedIds.has(item.id))
  if (filtered.length >= count) return pickRandom(filtered, count)
  if (filtered.length > 0) {
    console.warn(
      `[메뉴 생성] 14일 중복 제외 후 후보가 부족해(${filtered.length}/${count}) 제외 규칙을 일부 무시합니다.`
    )
  }
  return pickRandom(list, count)
}

function poolForRole(role) {
  if (role === 'rice') return getMenusByCategory('RICE')
  if (role === 'soupOrStew') {
    const pool = Math.random() < 0.5 ? getMenusByCategory('SOUP') : getMenusByCategory('STEW')
    return pool
  }
  if (role === 'main1') return getMenusByCategory('MAIN_1')
  if (role === 'main2') return getMenusByCategory('MAIN_2')
  if (isSideRole(role)) return getMenusByCategory('SIDE')
  if (role === 'kimchi') return getMenusByCategory('KIMCHI')
  throw new Error(`알 수 없는 슬롯 역할: ${role}`)
}

// 한 끼(6장 구조: 밥 1 + 국/찌개 1 + 1차메인 1 + 2차메인 1 + 반찬 N + 김치 1)를 구성한다.
// excludedIds: Set<menu_id> — 14일 이내 사용되어 제외할 메뉴 ID. 이 함수가 새로
//   고른 항목의 id도 즉시 여기 추가되므로(같은 Set을 계속 넘기면) 같은 끼니/하루
//   안에서도 중복이 방지된다.
// lockedRoles: Set<role> — 잠긴 슬롯은 새로 고르지 않고 existingMeal의 값을 그대로 쓴다.
// existingMeal: 이전에 생성된 같은 끼니 결과 (잠긴 슬롯 값을 가져오는 용도).
export function generateMealMenu({
  sideDishCount = 4,
  excludedIds = new Set(),
  lockedRoles = new Set(),
  existingMeal = null,
} = {}) {
  const roles = buildMealSlotRoles(sideDishCount)
  const values = {}

  for (const role of roles) {
    if (lockedRoles.has(role) && existingMeal) {
      const kept = getItemAtRole(existingMeal, role)
      if (kept) {
        values[role] = kept
        excludedIds.add(kept.id)
        continue
      }
    }
    const pool = poolForRole(role)
    const [picked] = pickAvoiding(pool, 1, excludedIds)
    values[role] = picked
    excludedIds.add(picked.id)
  }

  const sides = []
  for (const role of roles) if (isSideRole(role)) sides.push(values[role])

  return {
    rice: values.rice,
    soupOrStew: values.soupOrStew,
    main1: values.main1,
    main2: values.main2,
    sides,
    kimchi: values.kimchi,
  }
}

// 하루치(아침/점심/저녁) — 운영 중(ON)인 끼니만 생성한다.
// lockedSlotKeys: Set<'day:mealType:role'> 전체(주간) 잠금 정보. 이 함수 안에서
//   해당 날짜/끼니에 해당하는 것만 걸러 lockedRoles로 변환해 사용한다.
export function generateDayMenu(
  mealsSettings,
  excludedIds = new Set(),
  { day = null, lockedSlotKeys = new Set(), existingDayMenu = null } = {}
) {
  const result = {}
  for (const mealType of Object.keys(mealsSettings)) {
    const meal = mealsSettings[mealType]
    if (!meal.isActive) {
      result[mealType] = null
      continue
    }
    const lockedRoles = day ? extractLockedRoles(lockedSlotKeys, day, mealType) : new Set()
    const existingMeal = existingDayMenu ? existingDayMenu[mealType] : null
    result[mealType] = generateMealMenu({
      sideDishCount: meal.sideDishCount,
      excludedIds,
      lockedRoles,
      existingMeal,
    })
  }
  return result
}

// 한 끼 결과에서 사용된 모든 항목을 평평한 배열로 뽑아낸다 (이력 기록/제외집합 갱신용).
export function flattenMealItems(mealResult) {
  if (!mealResult) return []
  return [mealResult.rice, mealResult.soupOrStew, mealResult.main1, mealResult.main2, mealResult.kimchi, ...mealResult.sides]
}
