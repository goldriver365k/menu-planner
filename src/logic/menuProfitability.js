// 메뉴별 실제 수익성 분석 — 메뉴의 판매가격(menuDatabase.js의 sale_price)과 5-5에서 만든
// 실제 매입단가 기반 원가 계산(calcMenuRecipeCost)을 연결한다. 별도의 원가 계산기를 다시
// 만들지 않는다 — 가격 우선순위(최근 실제 매입가 > 관리자 입력가 > KAMIS 참고가격)도
// calcMenuRecipeCost(recipeCostCalc.js)가 이미 적용한 값을 그대로 쓴다.
//
// 인건비·임대료·카드수수료·부가세 등은 전혀 고려하지 않는다 — 그래서 결과값의 이름은
// 항상 "식재료 기준 이익"이다. "순이익"이라는 말은 쓰지 않는다(작업지시서 1장).

import { calcMenuRecipeCost, calcCostRate } from './recipeCostCalc'

export const TARGET_COST_RATE = 35
export const WARNING_COST_RATE = 40

export const COST_RATE_STATUS_LABELS = { GOOD: '양호', CAUTION: '주의', REVIEW: '점검' }

// 메뉴 삭제·가격변경을 자동으로 결정하는 기능이 아니다 — 단순 참고 표시용 3단계뿐이다.
export function getCostRateStatus(costRate) {
  if (costRate == null) return null
  if (costRate <= TARGET_COST_RATE) return 'GOOD'
  if (costRate <= WARNING_COST_RATE) return 'CAUTION'
  return 'REVIEW'
}

function round1(n) {
  return Math.round(n * 10) / 10
}

// 메뉴 하나의 수익성. salePrice가 없으면(null) 원가율·이익을 아예 계산하지 않는다
// (9장·11장 — 한 끼에 같이 나오는 반찬처럼 독립 판매가가 없는 메뉴에 억지로 가격을
// 만들어 넣지 않는다). 레시피가 없거나(NO_RECIPE) 식재료 가격이 전부 없어 원가 자체를
// 구할 수 없으면(UNAVAILABLE) 0원으로 처리하지 않고 상태만 남긴다(8장).
export function calcMenuProfitability(menu) {
  const salePrice = menu.sale_price ?? null
  const hasSalePrice = salePrice != null
  const recipe = calcMenuRecipeCost(menu.id)

  let costStatus // 'OK' | 'NO_RECIPE' | 'UNAVAILABLE'
  let ingredientCost = null
  if (recipe.status === 'NO_RECIPE') {
    costStatus = 'NO_RECIPE'
  } else if (recipe.costConfidence === 'UNAVAILABLE') {
    costStatus = 'UNAVAILABLE'
  } else {
    // COMPLETE 또는 PARTIAL — 일부 식재료 가격이 없어도(PARTIAL) 계산 가능한 줄만 더한
    // 값을 그대로 보여준다(missingPriceCount로 "일부 가격 미등록"임을 함께 알린다).
    costStatus = 'OK'
    ingredientCost = recipe.totalCost
  }

  const costRate = hasSalePrice && ingredientCost != null ? calcCostRate(ingredientCost, salePrice) : null
  const ingredientProfit = hasSalePrice && ingredientCost != null ? Math.round(salePrice - ingredientCost) : null
  const ingredientProfitRate = costRate != null ? round1(100 - costRate) : null

  return {
    menuId: menu.id,
    name: menu.name,
    category: menu.category,
    active: menu.active !== false,
    salePrice,
    hasSalePrice,
    ingredientCost,
    costStatus,
    missingPriceCount: recipe.missingPriceCount || 0,
    costConfidence: recipe.costConfidence,
    costRate,
    costRateStatus: getCostRateStatus(costRate),
    ingredientProfit,
    ingredientProfitRate,
  }
}

export function calcAllMenuProfitability(menus) {
  return menus.map(calcMenuProfitability)
}

// 작업지시서 10장: plannedPreparationCount/expectedCount가 "연결된 경우에만" 예상 금액을
// 계산한다. 이 화면은 특정 날짜의 식단과 묶여 있지 않은 전체 메뉴 목록이라(LocalStorage에
// 저장된 "현재 주간 식단"이 따로 없다), 어떤 날짜/끼니의 인원을 자동으로 가져올 수 없다 —
// 그래서 그 자리에서 직접 입력하는 인원수로 미리보기만 계산한다. 반드시 "예상"이라고만
// 표시한다(12장 — 실제 판매량 데이터가 없으므로 "실제 판매이익"이라고 부르지 않는다).
export function calcExpectedMenuProfitability(profitability, count) {
  const c = Number(count) || 0
  if (!profitability.hasSalePrice || profitability.ingredientCost == null || c <= 0) return null
  const expectedRevenue = Math.round(profitability.salePrice * c)
  const expectedIngredientCost = Math.round(profitability.ingredientCost * c)
  return {
    count: c,
    expectedRevenue,
    expectedIngredientCost,
    expectedIngredientProfit: expectedRevenue - expectedIngredientCost,
  }
}

// 작업지시서 17~18장: 상단 요약 + 원가율 분포. "분석 가능"은 판매가와 원가가 모두 확정돼
// 원가율을 계산할 수 있는 메뉴만 센다 — 평균 원가율도 그 메뉴들만 대상으로 한다.
export function summarizeMenuProfitability(rows) {
  const analyzable = rows.filter((r) => r.costRate != null)
  const averageCostRate =
    analyzable.length > 0 ? round1(analyzable.reduce((sum, r) => sum + r.costRate, 0) / analyzable.length) : null

  return {
    totalMenus: rows.length,
    analyzableCount: analyzable.length,
    averageCostRate,
    overTargetCount: analyzable.filter((r) => r.costRate > TARGET_COST_RATE).length,
    overWarningCount: analyzable.filter((r) => r.costRate > WARNING_COST_RATE).length,
    noRecipeCount: rows.filter((r) => r.costStatus === 'NO_RECIPE').length,
    noSalePriceCount: rows.filter((r) => !r.hasSalePrice).length,
    distribution: {
      goodCount: analyzable.filter((r) => r.costRateStatus === 'GOOD').length,
      cautionCount: analyzable.filter((r) => r.costRateStatus === 'CAUTION').length,
      reviewCount: analyzable.filter((r) => r.costRateStatus === 'REVIEW').length,
    },
  }
}
