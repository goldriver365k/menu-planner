import { DAYS, MEAL_TYPES } from '../data/planConfig'
import { calcMealFinancials } from './costOptimize'
import { mealHasUnverifiedCost } from '../utils/mealCost'

// 23장: 주간 예상 총 식수 / 총 매출 / 목표 식재료비 / 예상 식재료비 / 평균 원가율.
// 요일별로 실제 생성된 메뉴(weekMenu)의 원가를 그대로 합산하므로, 같은 끼니라도
// 요일마다 메뉴가 달라 원가가 다르면 그 차이가 그대로 반영된다.
// STEP 14: 주간 어딘가에 원가 미등록(NEIS) 메뉴가 섞여 있으면 hasUnverifiedCost로 표시해,
// 합계가 실제보다 낮게 계산됐을 수 있다는 것을 화면에서 알 수 있게 한다.
export function calcWeeklyFinancials(weekMenu, operatingDays, mealsSettings, costRate) {
  let totalExpectedCount = 0
  let totalExpectedRevenue = 0
  let totalTargetIngredientCost = 0
  let totalIngredientCost = 0
  let hasUnverifiedCost = false

  for (const day of DAYS) {
    if (!operatingDays[day]) continue
    const dayResult = weekMenu[day]
    if (!dayResult) continue

    for (const mealType of MEAL_TYPES) {
      const mealSetting = mealsSettings[mealType]
      if (!mealSetting?.isActive) continue
      const mealResult = dayResult[mealType]
      if (!mealResult) continue

      const costRatePercent = costRate.overrides[mealType] ?? costRate.global
      const f = calcMealFinancials(mealResult, mealSetting, costRatePercent)

      totalExpectedCount += f.expectedCount
      totalExpectedRevenue += f.expectedRevenue
      totalTargetIngredientCost += f.targetIngredientCost
      totalIngredientCost += f.totalIngredientCost
      if (mealHasUnverifiedCost(mealResult)) hasUnverifiedCost = true
    }
  }

  const averageCostRate =
    totalExpectedRevenue > 0 ? (totalIngredientCost / totalExpectedRevenue) * 100 : 0

  return {
    totalExpectedCount,
    totalExpectedRevenue,
    totalTargetIngredientCost,
    totalIngredientCost,
    averageCostRate,
    hasUnverifiedCost,
  }
}
