// 식재료 발주량 계산 — 생성된 주간 식단(weekMenu)과 끼니별 예상 식수(expectedCount)를
// 표준 레시피·식재료 마스터 DB와 연결해 "실제로 얼마나 사야 하는지"를 계산한다.
//
// 기존 generateWeek.js/generateMeal.js(식단 생성 로직)와 costOptimize.js는 건드리지 않는다.
// 이 계산은 이미 만들어진 weekMenu를 "읽기만" 한다.

import { DAYS, MEAL_TYPES } from '../data/planConfig'
import { flattenMealItems } from './generateMeal'
import { getStandardRecipeForMenu } from '../data/standardRecipeDatabase'
import { getIngredientMasterById } from '../data/ingredientMasterDatabase'
import { calcIngredientUnitCost } from './recipeCostCalc'
import { addDaysISO } from '../data/menuHistory'
import { unitFamily, toBaseQuantity, formatBaseQuantity } from './unitConversion'

// 하루치 weekMenu[day](끼니별 결과)에서 "메뉴 × 끼니 예상 식수"만큼 필요한 식재료를
// { `${ingredientId}:${family}` → { ingredientId, name, family, netBase, actualBase } }로
// 누적한다. netBase는 수율을 적용하기 전 순사용량, actualBase는 수율을 적용한(실제 구매
// 필요량) 값이다 — 발주서 화면은 둘 다 보여줘야 해서 따로 들고 있는다.
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

        // COUNT 계열(개/봉지/판 등)은 단위 문자열이 정확히 같을 때만 같은 식재료로 합산한다
        // ("개"와 "봉지"는 서로 다른 묶음이라 임의로 더할 수 없다) — 그래서 키에 단위까지
        // 포함한다. WEIGHT/VOLUME은 kg↔g, L↔ml로 항상 환산 가능하므로 단위를 구분하지 않는다.
        const countUnit = family === 'COUNT' ? line.unit : null
        const key = `${ingredient.id}:${family}:${countUnit || ''}`
        if (!bucket[key]) {
          bucket[key] = { ingredientId: ingredient.id, name: ingredient.name, family, countUnit, netBase: 0, actualBase: 0 }
        }
        bucket[key].netBase += totalNetBase
        bucket[key].actualBase += actualNeededBase
      }
    }
  }
}

// 포장단위 올림 계산 — 식재료 마스터 DB의 purchase_quantity/purchase_unit을 "포장 단위"로
// 그대로 재사용한다(예: purchase_unit='kg', purchase_quantity=5 → 5kg짜리 포장).
// 작업지시서 예시: 필요량 37kg, 5kg/팩 → 8팩.
function calcPackInfo(ingredient, family, baseQuantity) {
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
      const display = formatBaseQuantity(entry.actualBase, entry.family, entry.countUnit)
      const ingredient = getIngredientMasterById(entry.ingredientId)
      const packInfo = calcPackInfo(ingredient, entry.family, entry.actualBase)
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
      if (!weeklyBucket[key]) weeklyBucket[key] = { ...entry, netBase: 0, actualBase: 0 }
      weeklyBucket[key].netBase += entry.netBase
      weeklyBucket[key].actualBase += entry.actualBase
    }
  }

  return { daily, weekly: bucketToRows(weeklyBucket) }
}

// --- 발주서(이번 단계) 전용: 날짜·필요량·수율반영 필요량·발주단위·발주수량·단가·예상금액을
// 한 행에 모두 담는다. calcWeeklyIngredientRequirement()의 기존 반환 모양(quantity/unit/
// packInfo)은 그대로 둔 채, 발주서 화면만을 위한 별도 함수로 둔다. ---

function round2(n) {
  return Math.round(n * 100) / 100
}

// 발주단위·발주수량·단가·예상금액을 정한다.
// 포장단위(purchase_quantity/purchase_unit)가 등록되어 있고 단위 계열이 맞으면 "팩" 단위로
// 올림해서 발주하고, 단가는 그 포장 하나의 구매가(purchase_price)를 그대로 쓴다.
// 포장단위가 없으면 수율반영 필요량을 표시 단위(kg/g/ml/L/개수단위) 그대로 발주수량으로
// 쓰고, 단가는 그 표시 단위 1개당 가격으로 환산한다.
function buildOrderFields(ingredient, family, actualBase, actualDisplay) {
  const packInfo = calcPackInfo(ingredient, family, actualBase)
  const { unitCost, status: priceStatus } = calcIngredientUnitCost(ingredient)

  if (packInfo) {
    const unitPrice = priceStatus === 'OK' ? ingredient.purchase_price : null
    return {
      orderUnit: '팩',
      orderQuantity: packInfo.packCount,
      packInfo,
      unitPrice,
      expectedAmount: unitPrice != null ? round2(packInfo.packCount * unitPrice) : null,
      priceStatus,
    }
  }

  if (priceStatus !== 'OK') {
    return { orderUnit: actualDisplay.unit, orderQuantity: actualDisplay.value, packInfo: null, unitPrice: null, expectedAmount: null, priceStatus }
  }

  // unitCost는 "기본단위(g/ml/개) 1개당 가격" — 표시 단위(kg/L 등)로 환산해 보여준다.
  const displayUnitBaseQty = actualDisplay.value > 0 ? actualBase / actualDisplay.value : toBaseQuantity(1, actualDisplay.unit)
  const unitPrice = round2(unitCost * displayUnitBaseQty)
  return {
    orderUnit: actualDisplay.unit,
    orderQuantity: actualDisplay.value,
    packInfo: null,
    unitPrice,
    expectedAmount: round2(actualDisplay.value * unitPrice),
    priceStatus: 'OK',
  }
}

function bucketToOrderRows(bucket, date) {
  return Object.values(bucket)
    .map((entry) => {
      const ingredient = getIngredientMasterById(entry.ingredientId)
      const netDisplay = formatBaseQuantity(entry.netBase, entry.family, entry.countUnit)
      const actualDisplay = formatBaseQuantity(entry.actualBase, entry.family, entry.countUnit)
      const order = buildOrderFields(ingredient, entry.family, entry.actualBase, actualDisplay)

      return {
        date,
        ingredientId: entry.ingredientId,
        name: entry.name,
        requiredQuantity: netDisplay, // 필요량(수율 반영 전)
        actualQuantity: actualDisplay, // 수율반영 필요량
        ...order,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

// weekStartDate: PlannerPage settings.weekStartDate(YYYY-MM-DD). 일별 발주서는 각 날짜를,
// 주간 발주서는 weekStartDate~+6일 범위를 날짜로 들고 있는다(표시는 호출하는 쪽에서 결정).
export function calcPurchaseOrderRows(weekMenu, operatingDays, mealsSettings, weekStartDate) {
  const daily = {}
  const weeklyBucket = {}

  DAYS.forEach((day, dayIndex) => {
    const date = addDaysISO(weekStartDate, dayIndex)
    if (!operatingDays[day] || !weekMenu[day]) {
      daily[day] = { date, rows: [] }
      return
    }
    const dayBucket = {}
    accumulateDay(weekMenu[day], mealsSettings, dayBucket)
    daily[day] = { date, rows: bucketToOrderRows(dayBucket, date) }

    for (const [key, entry] of Object.entries(dayBucket)) {
      if (!weeklyBucket[key]) weeklyBucket[key] = { ...entry, netBase: 0, actualBase: 0 }
      weeklyBucket[key].netBase += entry.netBase
      weeklyBucket[key].actualBase += entry.actualBase
    }
  })

  const weekEndDate = addDaysISO(weekStartDate, 6)
  return { daily, weekly: { dateRange: `${weekStartDate} ~ ${weekEndDate}`, rows: bucketToOrderRows(weeklyBucket, null) } }
}
