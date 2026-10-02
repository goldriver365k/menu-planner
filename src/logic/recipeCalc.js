import { getIngredientById } from '../data/ingredientDatabase'

// 26장: RECIPE + INGREDIENT로 메뉴 원가/칼로리를 계산하는 참고용 함수.
// calculation_price와 calories_per_100g은 항상 "레시피 quantity와 같은 단위 1단위당" 값으로
// 맞춰 입력한다고 가정한다 (예: g당 원, g당 kcal/100). 실제 메뉴의 cost_per_serving/calories
// 필드는 아직 이 계산으로 자동 대체되지 않는다 — 관리자가 참고해서 수동으로 반영하거나,
// 이후 단계(공공 데이터 연동 이후)에 자동 전환한다.
export function calcRecipeReferenceCost(lines) {
  return lines.reduce((sum, line) => {
    const ingredient = getIngredientById(line.ingredient_id)
    if (!ingredient) return sum
    return sum + ingredient.calculation_price * line.quantity
  }, 0)
}

export function calcRecipeReferenceCalories(lines) {
  return lines.reduce((sum, line) => {
    const ingredient = getIngredientById(line.ingredient_id)
    if (!ingredient) return sum
    return sum + (ingredient.calories_per_100g * line.quantity) / 100
  }, 0)
}

export function collectRecipeAllergens(lines) {
  const set = new Set()
  for (const line of lines) {
    const ingredient = getIngredientById(line.ingredient_id)
    if (!ingredient) continue
    for (const a of ingredient.allergens || []) set.add(a)
  }
  return Array.from(set)
}
