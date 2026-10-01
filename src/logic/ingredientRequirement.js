// 식재료 발주량 계산 — 생성된 주간 식단(weekMenu)과 끼니별 예상 식수(expectedCount)를
// 표준 레시피·식재료 마스터 DB와 연결해 "실제로 얼마나 사야 하는지"를 계산한다.
//
// 기존 generateWeek.js/generateMeal.js(식단 생성 로직)와 costOptimize.js는 건드리지 않는다.
// 이 계산은 이미 만들어진 weekMenu를 "읽기만" 한다.

import { DAYS, MEAL_TYPES } from '../data/planConfig'
import { flattenMealItems } from './generateMeal'
import { getStandardRecipeForMenu } from '../data/standardRecipeDatabase'
import { getIngredientMasterById } from '../data/ingredientMasterDatabase'
import { unitFamily, toBaseQuantity, formatBaseQuantity } from './unitConversion'

// 하루치 weekMenu[day](끼니별 결과)에서 "메뉴 × 끼니 예상 식수"만큼 필요한 식재료를
// { `${ingredientId}:${family}` → { ingredientId, name, family, baseQuantity } }로 누적한다.
// 같은 식재료라도 레시피마다 단위 계열(무게/부피/개수)이 다르면 따로 집계한다 — 서로 다른
// 계열끼리는 임의로 합칠 수 없기 때문이다(예: 식용유를 어떤 레시피는 g, 어떤 레시피는 ml로
// 쓰는 경우).
function accumulateDay(dayMenu, mealsSettings, bucket) {
  for (const mealType of MEAL_TYPES) {
    const mealSetting = mealsSettings[mealType]
    if (!mealSetting?.isActive) continue
    const expectedCount = Number(mealSetting.expectedCount) || 0
    if (expectedCount <= 0) continue
    const mealResult = dayMenu?.[mealType]
    if (!mealResult) continue

    for (const menuItem of flattenMealItems(mealResult)) {
      const lines = getStandardRecipeForMenu(menuItem.id)
      for (const line of lines) {
        const ingredient = getIngredientMasterById(line.ingredient_id)
        if (!ingredient) continue // 식재료 마스터에서 지워진 참조 — 집계에서 조용히 제외

        const family = unitFamily(line.unit)
        const perServingBase = toBaseQuantity(Number(line.quantity) || 0, line.unit)
        const totalNetBase = perServingBase * expectedCount

        // 수율(usable_yield) 반영: 실제 필요량 = 순사용량 ÷ 수율
        const yieldPercent = Number(ingredient.usable_yield) > 0 ? Number(ingredient.usable_yield) : 100
        const actualNeededBase = totalNetBase / (yieldPercent / 100)

        const key = `${ingredient.id}:${family}`
        if (!bucket[key]) bucket[key] = { ingredientId: ingredient.id, name: ingredient.name, family, baseQuantity: 0 }
        bucket[key].baseQuantity += actualNeededBase
      }
    }
  }
}

// 포장단위 올림 계산 — 식재료 마스터 DB의 purchase_quantity/purchase_unit을 "포장 단위"로
// 그대로 재사용한다(예: purchase_unit='kg', purchase_quantity=5 → 5kg짜리 포장).
// 작업지시서 예시: 필요량 37kg, 5kg/팩 → 8팩.
function calcPackInfo(ingredientId, family, baseQuantity) {
  const ingredient = getIngredientMasterById(ingredientId)
  if (!ingredient) return null
  const packQty = Number(ingredient.purchase_quantity) || 0
  if (packQty <= 0) return null // 포장단위가 등록되어 있지 않으면 올림 계산을 하지 않는다.
  if (unitFamily(ingredient.purchase_unit) !== family) return null // 계열이 다르면 환산 불가

  const packBaseQty = toBaseQuantity(packQty, ingredient.purchase_unit)
  const packCount = Math.ceil(baseQuantity / packBaseQty)
  return { packCount, packSize: packQty, packUnit: ingredient.purchase_unit }
}

function bucketToRows(bucket) {
  return Object.values(bucket)
    .map((entry) => {
      const display = formatBaseQuantity(entry.baseQuantity, entry.family, entry.name)
      const packInfo = calcPackInfo(entry.ingredientId, entry.family, entry.baseQuantity)
      return {
        ingredientId: entry.ingredientId,
        name: entry.name,
        quantity: display.value,
        unit: display.unit,
        packInfo,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

// weekMenu: PlannerPage의 weekMenu 상태(day → mealType → 끼니결과). operatingDays/mealsSettings도
// PlannerPage의 settings를 그대로 넘긴다.
// 반환값: { daily: { [day]: rows }, weekly: rows } — rows는 bucketToRows()가 만드는 배열.
export function calcWeeklyIngredientRequirement(weekMenu, operatingDays, mealsSettings) {
  const daily = {}
  const weeklyBucket = {}

  for (const day of DAYS) {
    if (!operatingDays[day] || !weekMenu[day]) {
      daily[day] = []
      continue
    }
    const dayBucket = {}
    accumulateDay(weekMenu[day], mealsSettings, dayBucket)
    daily[day] = bucketToRows(dayBucket)

    for (const [key, entry] of Object.entries(dayBucket)) {
      if (!weeklyBucket[key]) weeklyBucket[key] = { ...entry, baseQuantity: 0 }
      weeklyBucket[key].baseQuantity += entry.baseQuantity
    }
  }

  return { daily, weekly: bucketToRows(weeklyBucket) }
}
