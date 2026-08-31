// 한 끼 안의 개별 메뉴를 "슬롯"으로 식별하기 위한 유틸.
// 슬롯 역할(role): 'rice' | 'soupOrStew' | 'main1' | 'main2' | 'side:0'..'side:N-1' | 'kimchi'
// 잠금(16장)과 개별 교체(15장) 모두 이 슬롯 단위로 동작한다.

export function buildMealSlotRoles(sideDishCount) {
  const roles = ['rice', 'soupOrStew', 'main1', 'main2']
  for (let i = 0; i < sideDishCount; i++) roles.push(`side:${i}`)
  roles.push('kimchi')
  return roles
}

export function isSideRole(role) {
  return role.startsWith('side:')
}

export function sideIndexOf(role) {
  return Number(role.split(':')[1])
}

export function getItemAtRole(mealResult, role) {
  if (!mealResult) return null
  if (isSideRole(role)) return mealResult.sides[sideIndexOf(role)] ?? null
  return mealResult[role] ?? null
}

// day + mealType + role을 하나의 문자열 키로 합쳐 잠금 상태(Set)에서 사용한다.
export function buildSlotKey(day, mealType, role) {
  return `${day}:${mealType}:${role}`
}

// 전체 주간 잠금 키 집합(Set<'day:mealType:role'>)에서 특정 day/mealType에
// 해당하는 role만 뽑아 Set<role>로 만든다.
export function extractLockedRoles(lockedSlotKeys, day, mealType) {
  const roles = new Set()
  for (const key of lockedSlotKeys) {
    const parts = key.split(':')
    const d = parts[0]
    const mt = parts[1]
    const role = parts.slice(2).join(':')
    if (d === day && mt === mealType) roles.add(role)
  }
  return roles
}
