import { flattenMealItems } from '../logic/generateMeal'

// 28장: 한 끼 전체 메뉴의 kcal 합산 ("예상 총 열량")
export function calcMealTotalCalories(mealResult) {
  if (!mealResult) return 0
  return flattenMealItems(mealResult).reduce((sum, item) => sum + (item.calories || 0), 0)
}

// 27장: 한 끼에 포함된 알레르기 유발물질을 중복 없이 모은다 (메뉴 상세화면에 눈에 띄게 표시하기 위함)
export function collectMealAllergens(mealResult) {
  if (!mealResult) return []
  const set = new Set()
  for (const item of flattenMealItems(mealResult)) {
    for (const allergen of item.allergens || []) set.add(allergen)
  }
  return Array.from(set)
}
