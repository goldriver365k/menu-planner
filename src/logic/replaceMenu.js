import { getMenusByCategory } from '../data/menuDatabase'
import { isSideRole } from './menuSlots'

function poolForReplacement(role, currentItem) {
  if (role === 'rice') return getMenusByCategory('RICE')
  if (role === 'soupOrStew') return getMenusByCategory(currentItem.category) // 원래 국이면 국, 찌개면 찌개 안에서만
  if (role === 'main1') return getMenusByCategory('MAIN_1', currentItem.subcategory)
  if (role === 'main2') return getMenusByCategory('MAIN_2', currentItem.subcategory)
  if (isSideRole(role)) return getMenusByCategory('SIDE')
  if (role === 'kimchi') return getMenusByCategory('KIMCHI')
  throw new Error(`알 수 없는 슬롯 역할: ${role}`)
}
export { poolForReplacement }

function pickRandom(list, count) {
  const pool = [...list]
  const picked = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

// role: 교체할 슬롯 역할, currentItem: 현재 배정된 메뉴, excludedIds: 14일 규칙 등으로
// 제외할 메뉴 ID 집합(현재 항목 자체도 포함되어 있어도 무방 — 아래에서 별도로 제외).
// 우선 excludedIds를 지켜서 후보를 찾고, 그래도 3개가 안 차면 excludedIds를 무시하고
// 채운다(현재 항목만은 항상 제외).
export function getReplacementCandidates(role, currentItem, excludedIds, count = 3) {
  const pool = poolForReplacement(role, currentItem)
  const withoutCurrent = pool.filter((item) => item.id !== currentItem.id)

  const strict = withoutCurrent.filter((item) => !excludedIds.has(item.id))
  if (strict.length >= count) return pickRandom(strict, count)

  if (strict.length < withoutCurrent.length) {
    console.warn(
      `[메뉴 교체] 14일 중복 제외 후 후보가 부족해(${strict.length}/${count}) 제외 규칙을 일부 무시합니다.`
    )
  }
  return pickRandom(withoutCurrent, Math.min(count, withoutCurrent.length))
}
