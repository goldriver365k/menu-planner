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
import { getMealCountRecord } from '../data/mealCountRecords'
import { unitFamily, toBaseQuantity, formatBaseQuantity } from './unitConversion'

// STEP 5-2: 발주 계산 기준 인원 결정. 우선순위 — 1순위 plannedPreparationCount(사용자가
// 확정한 준비계획), 2순위 expectedCount(최초 예상 식수). recommendedCount(4-4)나
// actualCount(실적)는 발주 기준으로 자동 사용하지 않는다 — 사용자가 [추천 준비량 적용]을
// 눌러 plannedPreparationCount에 반영했을 때만 간접적으로 영향을 준다.
export function getProcurementBaseCount({ plannedPreparationCount, expectedCount }) {
  const planned = Number(plannedPreparationCount)
  if (Number.isFinite(planned) && planned > 0) {
    return { count: planned, source: 'plannedPreparationCount' }
  }

  const expected = Number(expectedCount)
  if (Number.isFinite(expected) && expected > 0) {
    return { count: expected, source: 'expectedCount' }
  }

  return { count: null, source: 'none' }
}

// 하루치 weekMenu[day](끼니별 결과)에서 "메뉴 × 발주 계산 기준 인원"만큼 필요한 식재료를
// { `${ingredientId}:${family}` → { ingredientId, name, family, netBase, actualBase } }로
// 누적한다. netBase는 수율을 적용하기 전 순사용량, actualBase는 수율을 적용한(실제 구매
// 필요량) 값이다 — 발주서 화면은 둘 다 보여줘야 해서 따로 들고 있는다.
// 같은 식재료라도 레시피마다 단위 계열(무게/부피/개수)이 다르면 따로 집계한다 — 서로 다른
// 계열끼리는 임의로 합칠 수 없기 때문이다(예: 식용유를 어떤 레시피는 g, 어떤 레시피는 ml로
// 쓰는 경우).
//
// STEP 5-2: 기준 인원은 getProcurementBaseCount()로 정한다(plannedPreparationCount 우선,
// 없으면 expectedCount) — date가 있으면 그 날짜+끼니의 4-1 기록에서 plannedPreparationCount를
// 찾는다. 한 끼의 모든 메뉴(밥/국/메인/반찬/김치)에 같은 기준 인원을 적용한다(9장).
function accumulateDay(dayMenu, mealsSettings, bucket, date = null) {
  for (const mealType of MEAL_TYPES) {
    const mealSetting = mealsSettings[mealType]
    if (!mealSetting?.isActive) continue
    const mealResult = dayMenu?.[mealType]
    if (!mealResult) continue

    const plannedPreparationCount = date ? getMealCountRecord(date, mealType)?.plannedPreparationCount : null
    const { count: baseCount } = getProcurementBaseCount({
      plannedPreparationCount,
      expectedCount: mealSetting.expectedCount,
    })
    if (!baseCount || baseCount <= 0) continue

    for (const menuItem of flattenMealItems(mealResult)) {
      const lines = getStandardRecipeForMenu(menuItem.id)
      for (const line of lines) {
        const ingredient = getIngredientMasterById(line.ingredient_id)
        if (!ingredient) continue // 식재료 마스터에서 지워진 참조 — 집계에서 조용히 제외

        const family = unitFamily(line.unit)
        const perServingBase = toBaseQuantity(Number(line.quantity) || 0, line.unit)
        const totalNetBase = perServingBase * baseCount

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

// STEP 5-3: 수율 적용 후 필요량(actualBase, 이미 날짜/주간 단위로 한 번만 합산된 값)에서
// 현재 재고를 차감해 "실제 구매 필요량"을 만든다 — 반드시 포장단위 올림보다 먼저 계산한다.
// 재고는 그 식재료의 purchase_unit 기준으로 저장돼 있으므로, 필요량과 같은 단위 계열일
// 때만 변환해서 차감한다. 재고가 미확인(null)이거나 단위 계열이 다르면 차감하지 않고
// 그 사실을 status로 알려 화면에서 확정된 값처럼 보이지 않게 한다(11장).
function applyStockDeduction(ingredient, family, actualBase) {
  if (!ingredient || ingredient.current_stock == null) {
    return { purchaseNeededBase: actualBase, stockBase: null, status: 'UNCONFIRMED' }
  }
  if (unitFamily(ingredient.purchase_unit) !== family) {
    return { purchaseNeededBase: actualBase, stockBase: null, status: 'UNIT_MISMATCH' }
  }
  const stockBase = toBaseQuantity(Number(ingredient.current_stock) || 0, ingredient.purchase_unit)
  // 7장: 재고가 필요량보다 많아도 음수로 표시하지 않는다.
  const purchaseNeededBase = Math.max(0, actualBase - stockBase)
  return { purchaseNeededBase, stockBase, status: 'OK' }
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
// PlannerPage의 settings를 그대로 넘긴다. weekStartDate가 있으면 날짜별 plannedPreparationCount
// (5-2)를 찾아 기준 인원으로 우선 사용하고, 없으면(예전 호출부 호환) expectedCount만 쓴다.
// 반환값: { daily: { [day]: rows }, weekly: rows } — rows는 bucketToRows()가 만드는 배열.
export function calcWeeklyIngredientRequirement(weekMenu, operatingDays, mealsSettings, weekStartDate = null) {
  const daily = {}
  const weeklyBucket = {}

  DAYS.forEach((day, dayIndex) => {
    if (!operatingDays[day] || !weekMenu[day]) {
      daily[day] = []
      return
    }
    const date = weekStartDate ? addDaysISO(weekStartDate, dayIndex) : null
    const dayBucket = {}
    accumulateDay(weekMenu[day], mealsSettings, dayBucket, date)
    daily[day] = bucketToRows(dayBucket)

    for (const [key, entry] of Object.entries(dayBucket)) {
      if (!weeklyBucket[key]) weeklyBucket[key] = { ...entry, netBase: 0, actualBase: 0 }
      weeklyBucket[key].netBase += entry.netBase
      weeklyBucket[key].actualBase += entry.actualBase
    }
  })

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
  const { unitCost, status: priceStatus, source, priceLabel } = calcIngredientUnitCost(ingredient)

  if (packInfo) {
    // unitCost는 "기본단위(g/ml/개) 1개당 가격" — 포장 하나(packSize/packUnit) 가격으로
    // 환산한다. 구매가가 등록돼 있으면(source: 'ADMIN') 이 값은 ingredient.purchase_price와
    // 정확히 같다(기존 동작과 100% 동일) — KAMIS 참고가격으로 대신할 때만 결과가 달라진다.
    const packBaseQty = toBaseQuantity(packInfo.packSize, packInfo.packUnit)
    const unitPrice = priceStatus === 'OK' ? round2(unitCost * packBaseQty) : null
    return {
      orderUnit: '팩',
      orderQuantity: packInfo.packCount,
      packInfo,
      unitPrice,
      expectedAmount: unitPrice != null ? round2(packInfo.packCount * unitPrice) : null,
      priceStatus,
      source,
      priceLabel,
    }
  }

  if (priceStatus !== 'OK') {
    return {
      orderUnit: actualDisplay.unit,
      orderQuantity: actualDisplay.value,
      packInfo: null,
      unitPrice: null,
      expectedAmount: null,
      priceStatus,
      source: null,
      priceLabel: null,
    }
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
    source,
    priceLabel,
  }
}

function bucketToOrderRows(bucket, date) {
  return Object.values(bucket)
    .map((entry) => {
      const ingredient = getIngredientMasterById(entry.ingredientId)
      const netDisplay = formatBaseQuantity(entry.netBase, entry.family, entry.countUnit)
      const actualDisplay = formatBaseQuantity(entry.actualBase, entry.family, entry.countUnit)

      // 5-3: 재고 차감은 이미 날짜/주간 단위로 한 번만 합산된 entry.actualBase에 대해
      // 딱 한 번만 적용한다(같은 식재료를 날짜별로 반복 차감하지 않음) — 그 다음에야
      // 포장단위 올림(buildOrderFields 내부)을 계산한다.
      const stock = applyStockDeduction(ingredient, entry.family, entry.actualBase)
      const currentStockDisplay =
        stock.stockBase != null ? formatBaseQuantity(stock.stockBase, entry.family, entry.countUnit) : null
      const purchaseNeededDisplay = formatBaseQuantity(stock.purchaseNeededBase, entry.family, entry.countUnit)

      const order = buildOrderFields(ingredient, entry.family, stock.purchaseNeededBase, purchaseNeededDisplay)

      return {
        date,
        ingredientId: entry.ingredientId,
        name: entry.name,
        requiredQuantity: netDisplay, // 필요량(수율 반영 전)
        actualQuantity: actualDisplay, // 수율반영 필요량
        currentStock: currentStockDisplay, // 현재 재고(필요량과 같은 단위로 환산), 미확인/단위불일치면 null
        stockStatus: stock.status, // 'OK' | 'UNCONFIRMED' | 'UNIT_MISMATCH'
        purchaseNeeded: purchaseNeededDisplay, // 수율반영 필요량 - 현재 재고(음수 방지)
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
    accumulateDay(weekMenu[day], mealsSettings, dayBucket, date)
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
