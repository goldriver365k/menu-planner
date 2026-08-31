import { buildMealSlotRoles, isSideRole, getItemAtRole } from './menuSlots'
import { poolForReplacement } from './replaceMenu'
import { calcMealReferenceCost } from '../utils/mealCost'

// 17장: 예상 매출 = 예상 식수 × 판매가격
export function calcExpectedRevenue(expectedCount, pricePerServing) {
  const count = Number(expectedCount) || 0
  const price = Number(pricePerServing) || 0
  return count * price
}

// 18장: 목표 식재료비 = 예상매출 × 목표원가율
export function calcTargetIngredientCost(expectedRevenue, costRatePercent) {
  const rate = Number(costRatePercent) || 0
  return Math.round(expectedRevenue * (rate / 100))
}

// 19장: 메뉴 원가 — 1인 원가 합계 × 식수
export function calcTotalIngredientCost(mealResult, expectedCount) {
  const perServing = calcMealReferenceCost(mealResult)
  const count = Number(expectedCount) || 0
  return perServing * count
}

// 한 끼의 매출/원가 종합 계산 (22장 "식단 상세정보" 구성에 필요한 값 전부)
export function calcMealFinancials(mealResult, mealSetting, costRatePercent) {
  const expectedCount = Number(mealSetting.expectedCount) || 0
  const pricePerServing = Number(mealSetting.pricePerServing) || 0

  const expectedRevenue = calcExpectedRevenue(expectedCount, pricePerServing)
  const targetIngredientCost = calcTargetIngredientCost(expectedRevenue, costRatePercent)
  const perServingCost = calcMealReferenceCost(mealResult)
  const totalIngredientCost = perServingCost * expectedCount
  const actualCostRate = expectedRevenue > 0 ? (totalIngredientCost / expectedRevenue) * 100 : 0
  const targetPerServingCost = expectedCount > 0 ? targetIngredientCost / expectedCount : 0
  const isOverBudget = expectedCount > 0 && perServingCost > targetPerServingCost

  return {
    expectedCount,
    pricePerServing,
    expectedRevenue,
    targetIngredientCost,
    perServingCost,
    totalIngredientCost,
    actualCostRate,
    targetPerServingCost,
    isOverBudget,
    overAmount: Math.max(0, Math.round(perServingCost - targetPerServingCost)),
  }
}

// 20장: [저원가 메뉴로 조정] — 잠기지 않은 슬롯 중 비싼 것부터 같은 카테고리 안에서
// 더 저렴한 대체메뉴로 바꿔가며 목표 1인원가 이하가 될 때까지 시도한다.
// 더 이상 낮출 수 없으면(대체 후보가 없거나 이미 최저가) 그 상태에서 멈춘다.
export function adjustMealToTargetCost(mealResult, targetPerServingCost, lockedRoles, excludedIds) {
  const roles = buildMealSlotRoles(mealResult.sides.length)
  let current = { ...mealResult, sides: [...mealResult.sides] }
  const changedRoles = new Set()
  const exhaustedRoles = new Set()

  const setItem = (role, item) => {
    if (isSideRole(role)) {
      const idx = Number(role.split(':')[1])
      current = { ...current, sides: current.sides.map((s, i) => (i === idx ? item : s)) }
    } else {
      current = { ...current, [role]: item }
    }
  }

  const MAX_ITERATIONS = roles.length * 2
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const totalCost = calcMealReferenceCost(current)
    if (totalCost <= targetPerServingCost) break

    const swappable = roles
      .filter((role) => !lockedRoles.has(role) && !exhaustedRoles.has(role))
      .map((role) => ({ role, item: getItemAtRole(current, role) }))
      .sort((a, b) => b.item.cost_per_serving - a.item.cost_per_serving)

    if (swappable.length === 0) break // 더 조정할 수 있는 슬롯이 없음

    const { role, item: currentItem } = swappable[0]
    const pool = poolForReplacement(role, currentItem)
    const cheaperOptions = pool
      .filter((m) => m.id !== currentItem.id && m.cost_per_serving < currentItem.cost_per_serving)
      .sort((a, b) => a.cost_per_serving - b.cost_per_serving)

    // 가능하면 14일 제외 목록에 없는 것 중 가장 저렴한 것을 우선 선택
    const preferred = cheaperOptions.find((m) => !excludedIds.has(m.id)) || cheaperOptions[0]

    if (!preferred) {
      exhaustedRoles.add(role) // 이 슬롯은 더 저렴하게 바꿀 수 없음
      continue
    }

    setItem(role, preferred)
    changedRoles.add(role)
  }

  return { mealResult: current, changedRoles }
}
