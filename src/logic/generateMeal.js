import { getMenusByCategory } from '../data/menuDatabase'
import { buildMealSlotRoles, isSideRole, getItemAtRole, extractLockedRoles } from './menuSlots'
import { pickQualityCandidate, recordMealIntoWeekStats } from './menuQualityEngine'

// STEP 3 "하루 3식" 구성 로직에 STEP 5의 14일 중복 제외(excludedIds), STEP 6의
// 개별 슬롯 잠금(lockedRoles + existingMeal)을 결합했다.
// STEP 15에서 완전 무작위 선택(pickAvoiding)을 품질 엔진(menuQualityEngine.js)으로
// 교체했다 — 14일 중복/육류 순환/조리법 분산/매운맛/국-메인 궁합/색상/무게감/원가 등을
// 점수화해서 상위 후보 중 무작위로 고른다. 역할(role)별 카테고리 후보군을 추리는 역할은
// 이 파일이 그대로 맡고, "그 후보 중 무엇을 고를지"만 품질 엔진에 위임한다.

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
// excludedIds: Set<menu_id> — 14일 이내 사용되어 품질 점수에서 크게 감점할 메뉴 ID. 이
//   함수가 새로 고른 항목의 id도 즉시 여기 추가되므로(같은 Set을 계속 넘기면) 같은 끼니/
//   하루 안에서도 방금 고른 메뉴가 또 뽑히는 일이 없다.
// lockedRoles: Set<role> — 잠긴 슬롯은 새로 고르지 않고 existingMeal의 값을 그대로 쓴다.
// existingMeal: 이전에 생성된 같은 끼니 결과 (잠긴 슬롯 값을 가져오는 용도).
// dayMealsSoFar/weekProteinCounts: STEP 15 품질 엔진이 "오늘 앞선 끼니", "이번 주 단백질
//   분포"를 판단하는 데 쓰는 컨텍스트 — generateDayMenu/generateWeekMenu가 채워서 넘긴다.
export function generateMealMenu({
  sideDishCount = 4,
  excludedIds = new Set(),
  lockedRoles = new Set(),
  existingMeal = null,
  dayMealsSoFar = [],
  weekProteinCounts = {},
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
    const picked = pickQualityCandidate({ pool, role, excludedIds, mealSoFar: values, dayMealsSoFar, weekProteinCounts })
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
// weekProteinCounts: STEP 15 — 이 날의 끼니를 만들 때마다 갱신되는, 주 전체에 걸친
//   단백질(main1/main2) 사용 집계. 같은 객체를 generateWeekMenu가 요일 루프 내내
//   그대로 전달하므로, 하루가 지날수록 "이번 주 지금까지" 통계가 누적된다.
export function generateDayMenu(
  mealsSettings,
  excludedIds = new Set(),
  { day = null, lockedSlotKeys = new Set(), existingDayMenu = null, weekProteinCounts = {} } = {}
) {
  const result = {}
  const dayMealsSoFar = []
  for (const mealType of Object.keys(mealsSettings)) {
    const meal = mealsSettings[mealType]
    if (!meal.isActive) {
      result[mealType] = null
      continue
    }
    const lockedRoles = day ? extractLockedRoles(lockedSlotKeys, day, mealType) : new Set()
    const existingMeal = existingDayMenu ? existingDayMenu[mealType] : null
    const mealResult = generateMealMenu({
      sideDishCount: meal.sideDishCount,
      excludedIds,
      lockedRoles,
      existingMeal,
      dayMealsSoFar,
      weekProteinCounts,
    })
    result[mealType] = mealResult
    dayMealsSoFar.push(mealResult)
    recordMealIntoWeekStats(weekProteinCounts, mealResult)
  }
  return result
}

// 한 끼 결과에서 사용된 모든 항목을 평평한 배열로 뽑아낸다 (이력 기록/제외집합 갱신용).
export function flattenMealItems(mealResult) {
  if (!mealResult) return []
  return [mealResult.rice, mealResult.soupOrStew, mealResult.main1, mealResult.main2, mealResult.kimchi, ...mealResult.sides]
}
