// 메뉴 원가 계산 — 표준 레시피(standardRecipeDatabase.js)와 식재료 마스터 DB
// (ingredientMasterDatabase.js)를 연결해 메뉴 1인분 원가를 계산한다.
//
// 기본 단위변환만 직접 구현한다(작업지시서 요구): kg↔g, L↔ml. 그 외 단위(개/봉지/판 등)는
// 서로 다른 단위끼리 임의로 환산하지 않고, 레시피 줄의 단위와 식재료의 구매단위가 정확히
// 같을 때만 계산한다 — 다르면 "단위 환산 불가"로 명확히 표시한다.
//
// 가격이 없는 식재료에 임의 가격을 만들어 넣지 않는다 — '가격 미등록'으로 처리한다.
// 레시피가 없는 메뉴는 '레시피 미등록'으로 표시한다. 기존 costOptimize.js(끼니 자동 생성 시
// 메뉴 자체의 cost_per_serving을 쓰는 원가 최적화)는 건드리지 않는다 — 이 파일은 "메뉴 하나의
// 레시피를 식재료 단가로 역산"하는, 완전히 별개의 참고용 계산이다.

import { getIngredientMasterById } from '../data/ingredientMasterDatabase'
import { getStandardRecipeForMenu } from '../data/standardRecipeDatabase'
import { unitsAreConvertible, toBaseQuantity } from './unitConversion'

// STEP 5-5: 식재료 가격의 출처. 화면 여러 곳에서 각자 가격 우선순위를 판단하지 않도록,
// 가격을 결정하는 로직은 getEffectiveIngredientPrice() 하나로만 관리한다.
export const PRICE_SOURCE = {
  LAST_PURCHASE: 'LAST_PURCHASE',
  ADMIN: 'ADMIN',
  SAVED: 'SAVED',
  KAMIS: 'KAMIS',
  MISSING: 'MISSING',
}

export const PRICE_SOURCE_LABELS = {
  LAST_PURCHASE: '최근 실제 매입가',
  ADMIN: '관리자 입력가',
  SAVED: '기준가격',
  KAMIS: '시장 참고가격',
  MISSING: '가격 미등록',
}

// 식재료 하나에 적용할 가격을 하나만 고른다. 우선순위(작업지시서 2장):
//   1. last_purchase_price — 가장 최근 실제 입고 때 기록된 매입단가(5-4). 존재하면 항상 최우선.
//   2. purchase_price — 관리자가 입력한 구매단가. 이 앱에는 거래처별 가격이력 기능이 없어,
//      "관리자 직접 입력"과 "기존 저장 기준가격"이 데이터상 이 한 필드로 합쳐져 있다(3-6에서
//      이미 정해진 동작) — 그래서 PRICE_SOURCE.SAVED는 이 앱에서는 실제로 반환되지 않는다.
//   3. kamis_reference_price — KAMIS 시장 참고가격. 위 둘이 모두 없을 때만 보조로 쓴다.
//   4. 전부 없으면 MISSING.
// unit은 그 가격이 "1단위"당 가격인 기준 단위(예: 'kg')를 함께 돌려준다 — 호출하는 쪽이
// 레시피 줄의 단위와 이 unit이 같은 계열인지 확인해서 단위 환산 가능 여부를 판단한다.
export function getEffectiveIngredientPrice(ingredient) {
  if (!ingredient) return { price: null, source: PRICE_SOURCE.MISSING, unit: null, date: null }

  const lastPrice = Number(ingredient.last_purchase_price) || 0
  if (lastPrice > 0 && ingredient.last_purchase_unit) {
    return {
      price: lastPrice,
      source: PRICE_SOURCE.LAST_PURCHASE,
      unit: ingredient.last_purchase_unit,
      date: ingredient.last_purchase_date || null,
    }
  }

  const adminPrice = Number(ingredient.purchase_price) || 0
  const adminQty = Number(ingredient.purchase_quantity) || 0
  if (adminPrice > 0 && adminQty > 0) {
    // purchase_price는 "purchase_quantity만큼의 총 구매가"이므로 1단위당 가격으로 환산한다.
    return {
      price: adminPrice / adminQty,
      source: PRICE_SOURCE.ADMIN,
      unit: ingredient.purchase_unit,
      date: ingredient.updated_at || null,
    }
  }

  const kamisPrice = Number(ingredient.kamis_reference_price) || 0
  if (kamisPrice > 0 && ingredient.kamis_reference_unit) {
    return {
      price: kamisPrice,
      source: PRICE_SOURCE.KAMIS,
      unit: ingredient.kamis_reference_unit,
      date: ingredient.kamis_updated_at || null,
    }
  }

  return { price: null, source: PRICE_SOURCE.MISSING, unit: null, date: null }
}

// 식재료 하나의 "기본단위(g/ml/개) 1개당 원가" — getEffectiveIngredientPrice()가 고른 가격을
// 그 가격의 기준 단위에서 기본단위로 환산만 한다. 가격 결정 자체는 거기서 전부 끝난다.
export function calcIngredientUnitCost(ingredient) {
  if (!ingredient) return { unitCost: null, status: 'NOT_FOUND', source: null, priceLabel: null, baseUnit: null }

  const effective = getEffectiveIngredientPrice(ingredient)
  if (effective.price == null) {
    return { unitCost: null, status: 'NO_PRICE', source: null, priceLabel: null, baseUnit: null }
  }

  const baseQty = toBaseQuantity(1, effective.unit)
  const unitCost = effective.price / baseQty
  // ADMIN은 기존 화면과 동일하게 라벨을 붙이지 않는다(구매가 그대로이므로 특별히 표시할
  // 필요가 없다) — LAST_PURCHASE/KAMIS만 "이 가격의 출처가 무엇인지" 사용자에게 알려준다.
  const priceLabel = effective.source === PRICE_SOURCE.ADMIN ? null : PRICE_SOURCE_LABELS[effective.source]

  return { unitCost, status: 'OK', source: effective.source, priceLabel, baseUnit: effective.unit }
}

// 레시피 한 줄(식재료 1종)의 원가.
// 수율(usable_yield)이 있으면 "실제 필요량 = 순사용량 ÷ 수율"로 늘려서 계산한다 — 예를 들어
// 수율 85%짜리 식재료를 100g 쓰려면 실제로는 100 ÷ 0.85 ≈ 117.6g을 사야 하기 때문이다.
export function calcRecipeLineCost(line, ingredient) {
  const ingredientName = ingredient?.name || line.ingredient_id

  if (!ingredient) return { ...line, ingredientName, cost: null, status: 'NOT_FOUND' }

  const { unitCost, status: priceStatus, source, priceLabel, baseUnit } = calcIngredientUnitCost(ingredient)
  if (priceStatus === 'NO_PRICE') return { ...line, ingredientName, cost: null, status: 'NO_PRICE' }

  // 가격이 KAMIS 참고가격/최근 매입단가에서 왔다면(baseUnit = 그 가격의 기준 단위) 단위 환산
  // 가능 여부도 그 단위를 기준으로 확인한다 — ingredient.purchase_unit과는 무관하다.
  if (!unitsAreConvertible(line.unit, baseUnit)) {
    return { ...line, ingredientName, cost: null, status: 'UNIT_MISMATCH' }
  }

  const yieldPercent = Number(ingredient.usable_yield) > 0 ? Number(ingredient.usable_yield) : 100
  const actualNeededQuantity = line.quantity / (yieldPercent / 100)
  const baseQuantity = toBaseQuantity(actualNeededQuantity, line.unit)
  const cost = unitCost * baseQuantity

  return { ...line, ingredientName, cost, status: 'OK', source, priceLabel }
}

// 메뉴 1인분 원가 — 레시피의 모든 식재료 원가를 합산한다.
// status: 'NO_RECIPE'(레시피 미등록) | 'OK'(레시피는 있음 — 줄별 상태는 lines에서 확인).
// hasIssue: 하나라도 '가격 미등록'/'단위 환산 불가'/'식재료 없음' 줄이 있으면 true —
// 이 경우 totalCost는 "계산 가능한 줄만 더한 값"이라 실제보다 낮을 수 있다는 뜻이다.
//
// STEP 5-5: costConfidence — 간단한 3단계 신뢰 상태만 쓴다(복잡한 점수 없음, 작업지시서
// 10장). 모든 줄의 가격이 있으면 '완료', 일부만 있으면 '부분', 가격이 있는 줄이 하나도 없으면
// '계산불가'(totalCost를 완성된 값처럼 보여주면 안 된다 — 9장).
export function calcMenuRecipeCost(menuId) {
  const lines = getStandardRecipeForMenu(menuId)
  if (lines.length === 0) {
    return { status: 'NO_RECIPE', lines: [], totalCost: null, hasIssue: true, missingPriceCount: 0, costConfidence: 'UNAVAILABLE' }
  }

  const computedLines = lines.map((line) => calcRecipeLineCost(line, getIngredientMasterById(line.ingredient_id)))
  const okLines = computedLines.filter((l) => l.status === 'OK')
  const missingPriceCount = computedLines.length - okLines.length
  const hasIssue = missingPriceCount > 0
  const totalCost = computedLines.reduce((sum, l) => sum + (l.cost || 0), 0)
  const costConfidence = missingPriceCount === 0 ? 'COMPLETE' : okLines.length === 0 ? 'UNAVAILABLE' : 'PARTIAL'

  return { status: 'OK', lines: computedLines, totalCost, hasIssue, missingPriceCount, costConfidence }
}

// STEP 5-5(13장): 원가율 = 1인분 원가 ÷ 판매가 × 100, 소수점 한 자리까지만.
// 판매가가 없거나(0 이하) 원가를 계산할 수 없으면 null(화면에서 "판매가 없음"으로 표시).
export function calcCostRate(perServingCost, salePrice) {
  const price = Number(salePrice)
  if (!(price > 0) || perServingCost == null) return null
  return Math.round((perServingCost / price) * 1000) / 10
}

// STEP 5-5(15장): 메뉴 1인분 원가 × 준비계획 인원 = 그 메뉴의 예상 총 식재료비.
// plannedPreparationCount(사전 준비계획) 기준이다 — actualCount(사후 실적)는 여기서 쓰지
// 않는다(16장, 원가 계획과 사후 분석을 혼동하지 않는다).
export function calcMenuExpectedIngredientCost(menuId, plannedPreparationCount) {
  const result = calcMenuRecipeCost(menuId)
  const count = Number(plannedPreparationCount) || 0
  if (result.status !== 'OK' || result.totalCost == null || count <= 0) {
    return { ...result, plannedPreparationCount: count, expectedIngredientCost: null }
  }
  return { ...result, plannedPreparationCount: count, expectedIngredientCost: Math.round(result.totalCost * count) }
}

// STEP 5-5(17장): 한 끼(밥/국/메인1/메인2/반찬들/김치)의 전체 1인분 원가 — 각 메뉴의
// calcMenuRecipeCost()를 그대로 재사용해 합산한다(같은 계산을 새로 만들지 않는다).
// 레시피가 없는 메뉴(NO_RECIPE)는 기존 cost_per_serving 필드가 있으면 그 값을 fallback으로만
// 쓰고(18장), 없으면 그 메뉴는 "계산 불가"로 빠진다 — hasIssue/costConfidence로 알 수 있다.
// 기존 MealCostSummary.jsx/costOptimize.js/weeklyFinancials.js(예상매출·목표원가율·자동
// 조정용 계산)는 전혀 건드리지 않는다 — 이 함수는 그와 별개로 "실제 레시피+실제 매입단가
// 기준 식단 원가"를 보여주기 위한 참고용 집계다.
export function calcMealRecipeCost(mealResult) {
  if (!mealResult) return { totalCost: 0, items: [], missingPriceCount: 0, missingRecipeCount: 0, costConfidence: 'UNAVAILABLE' }

  const menuItems = [mealResult.rice, mealResult.soupOrStew, mealResult.main1, mealResult.main2, mealResult.kimchi, ...mealResult.sides].filter(
    Boolean
  )

  let totalCost = 0
  let missingPriceCount = 0
  let missingRecipeCount = 0
  let anyPriced = false

  const items = menuItems.map((menuItem) => {
    const result = calcMenuRecipeCost(menuItem.id)
    if (result.status === 'NO_RECIPE') {
      missingRecipeCount += 1
      const fallback = menuItem.cost_per_serving ?? null
      if (fallback != null) {
        totalCost += fallback
        anyPriced = true
      }
      return { menuId: menuItem.id, name: menuItem.name, cost: fallback, source: fallback != null ? 'FALLBACK_COST_PER_SERVING' : null, status: 'NO_RECIPE' }
    }

    missingPriceCount += result.missingPriceCount
    if (result.totalCost != null) {
      totalCost += result.totalCost
      anyPriced = true
    }
    return { menuId: menuItem.id, name: menuItem.name, cost: result.totalCost, status: result.status, costConfidence: result.costConfidence }
  })

  const costConfidence = !anyPriced ? 'UNAVAILABLE' : missingRecipeCount > 0 || missingPriceCount > 0 ? 'PARTIAL' : 'COMPLETE'

  return { totalCost: Math.round(totalCost), items, missingPriceCount, missingRecipeCount, costConfidence }
}
