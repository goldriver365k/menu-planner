// 통합 운영 대시보드(5-11) — 새 계산엔진을 만들지 않는다. 이미 있는 함수들을 모아
// "오늘" 기준으로 한 번씩만 호출해 화면에 보여줄 모양으로 정리하기만 한다.
//
// 데이터가 전혀 없는 항목은 0으로 꾸미지 않고 null(=미입력/데이터 없음)로 돌려준다 —
// 화면에서 "미입력"/"데이터 없음"으로 표시할지는 컴포넌트가 결정한다.

import { todayISO, addDaysISO } from '../data/menuHistory'
import { MEAL_TYPES, MEAL_LABELS } from '../data/planConfig'
import { getMealCountRecord } from '../data/mealCountRecords'
import { getAllMenus, getActiveMenus } from '../data/menuDatabase'
import { getAllIngredientsMaster, getIngredientMasterById } from '../data/ingredientMasterDatabase'
import { getEffectiveIngredientPrice } from './recipeCostCalc'
import { calcAllMenuProfitability, summarizeMenuProfitability } from './menuProfitability'
import { getDailySummary } from './salesAnalytics'
import { getMenuPlanEntriesForDate, calcMenuPlanOrder, summarizeMenuPlanOrder } from './menuPlanIngredientRequirement'
import { getCheckedOrderKeys, normalizeEntry, isOrderChecked } from '../data/purchaseOrderStatus'
import { summarizeInventoryVariance } from './inventoryVariance'

export const VARIANCE_REVIEW_LABEL = '실사 차이 5% 초과'

// 3장: 오늘 단체급식 준비계획(기존 4-1/5-2, plannedPreparationCount) — 끼니별로 있는
// 만큼만 모은다. 하나도 입력돼 있지 않으면 null(미입력)을 돌려준다.
export function getTodayMealPlanSummary(date) {
  const items = MEAL_TYPES.map((mealType) => {
    const record = getMealCountRecord(date, mealType)
    return { mealType, label: MEAL_LABELS[mealType], plannedPreparationCount: record?.plannedPreparationCount ?? null, actualCount: record?.actualCount ?? null }
  }).filter((item) => item.plannedPreparationCount != null || item.actualCount != null)
  return items.length > 0 ? items : null
}

// 10장·11장·12장·13장: 5-7 실제 판매기록의 snapshot 값만 사용한다(현재 가격으로
// 다시 계산하지 않음) — getDailySummary(salesAnalytics.js)를 그대로 재사용한다.
export function getTodaySalesSummary(date) {
  const summary = getDailySummary(date)
  return summary.records.length > 0 ? summary : null
}

// 메뉴 판매계획(5-8 plannedMenuQuantity) + 그 계획을 기준으로 한 발주 필요 계산
// (5-9 menuPlanIngredientRequirement.js를 그대로 재사용, 새 계산엔진 아님).
export function getTodayMenuPlanOrder(date) {
  const entries = getMenuPlanEntriesForDate(date)
  if (entries.length === 0) return null
  const { rows, menuStatuses } = calcMenuPlanOrder(entries)
  const summary = summarizeMenuPlanOrder(menuStatuses, rows)
  const uncheckedCount = rows.filter((row) => !isOrderChecked(date, row.ingredientId)).length
  return { entries, rows, menuStatuses, summary, uncheckedCount }
}

// 15장·16장: 저장된 발주/입고 기록(5-4) 전체를 상태별로 센다 — 날짜를 가리지 않는다
// (며칠 전에 발주한 것도 아직 입고 전이면 오늘의 "입고대기"다). RECEIVED는 입고대기에서
// 제외한다(16장).
export function getOrderReceivingStatusSummary() {
  const entries = Object.values(getCheckedOrderKeys()).map(normalizeEntry)
  const checkedEntries = entries.filter((e) => e.checked)
  if (checkedEntries.length === 0) return null

  const orderedCount = checkedEntries.filter((e) => !e.receivingStatus || e.receivingStatus === 'ORDERED').length
  const partialCount = checkedEntries.filter((e) => e.receivingStatus === 'PARTIAL').length
  const receivedCount = checkedEntries.filter((e) => e.receivingStatus === 'RECEIVED').length
  const pendingCount = orderedCount + partialCount // 16장: ORDERED 또는 PARTIAL = 입고대기

  // 실제 발주금액(actualPurchaseAmount가 기록된 것만 — 예상금액과 혼동하지 않는다, 17장)
  const actualAmountEntries = checkedEntries.filter((e) => e.actualPurchaseAmount != null)
  const actualAmount = actualAmountEntries.length > 0 ? actualAmountEntries.reduce((sum, e) => sum + e.actualPurchaseAmount, 0) : null

  return { orderedCount, partialCount, receivedCount, pendingCount, actualAmount }
}

// 18장·19장: 재고/원가 미등록 현황 — 기존 5-3/5-5/5-6/5-9/5-10 결과를 그대로 재사용한다.
// "재고 정상/부족"은 오늘 메뉴 준비계획 발주 계산(menuPlanOrder)에 등장하는 식재료에
// 한해서만 판단한다 — 그 계산이 없는 식재료는 "필요한지 자체를 모르므로" 정상/부족을
// 가릴 기준이 없다(새로운 재고판정 로직을 만들지 않기 위한 의도적 축소).
export function getInventoryAndCostStatus(menuPlanOrder) {
  const ingredients = getAllIngredientsMaster()
  const noStockCount = ingredients.filter((i) => i.current_stock == null).length
  const noPriceCount = ingredients.filter((i) => getEffectiveIngredientPrice(i).price == null).length

  const allMenus = getAllMenus()
  const profitabilityRows = calcAllMenuProfitability(allMenus)
  const profitabilitySummary = summarizeMenuProfitability(profitabilityRows)

  const variance = summarizeInventoryVariance()

  let stockOkCount = null
  let stockShortCount = null
  let stockUnknownForTodayCount = null
  if (menuPlanOrder) {
    stockOkCount = menuPlanOrder.rows.filter((r) => r.stockStatus === 'OK' && r.purchaseNeeded.value === 0).length
    stockShortCount = menuPlanOrder.rows.filter((r) => r.stockStatus === 'OK' && r.purchaseNeeded.value > 0).length
    stockUnknownForTodayCount = menuPlanOrder.rows.filter((r) => r.stockStatus !== 'OK').length
  }

  return {
    noStockCount,
    noPriceCount,
    noRecipeMenuCount: profitabilitySummary.noRecipeCount,
    stockOkCount,
    stockShortCount,
    stockUnknownForTodayCount,
    varianceReviewCount: variance.reviewNeededCount,
    varianceCountedTotal: variance.countedIngredients,
  }
}

// 20장: 최근 7일(오늘 포함) 판매 요약 표 — 날짜별로 getDailySummary를 한 번씩만 부른다.
export function getRecentSalesTable(date, days = 7) {
  const rows = []
  for (let i = 0; i < days; i += 1) {
    const d = addDaysISO(date, -i)
    const summary = getDailySummary(d)
    rows.push({
      date: d,
      hasData: summary.records.length > 0,
      totalQuantity: summary.totalQuantity,
      totalRevenue: summary.totalRevenue,
      totalFoodCost: summary.totalFoodCost,
      totalIngredientProfit: summary.totalIngredientProfit,
    })
  }
  return rows
}

// 5장·6장·7장: "오늘 할 일" — 전부 기존 데이터 상태를 그대로 읽어서 만든 규칙이다.
// AI 판단·예측 없음. severity: 'REVIEW'(확인 필요) | 'CAUTION'(주의) | 'INFO'(정보).
export function getTodoList({ salesSummary, menuPlanOrder, inventoryAndCost, orderReceiving, sellableMenuCount }) {
  const todos = []

  if (sellableMenuCount > 0 && !salesSummary) {
    todos.push({ id: 'sales-missing', severity: 'CAUTION', label: '실제 판매수량 미입력', target: 'salesRecords' })
  }

  const entries = Object.entries(getCheckedOrderKeys())
  for (const [key, raw] of entries) {
    const entry = normalizeEntry(raw)
    if (entry.receivingStatus === 'PARTIAL') {
      const ingredientId = key.split(':').slice(1).join(':')
      const ingredientName = getIngredientMasterById(ingredientId)?.name || ingredientId
      todos.push({ id: `partial-${key}`, severity: 'REVIEW', label: `${ingredientName} 입고 확인 필요`, target: 'menuPlanOrder' })
    }
  }

  if (inventoryAndCost.noRecipeMenuCount > 0) {
    todos.push({
      id: 'no-recipe',
      severity: 'CAUTION',
      label: `레시피 미등록 메뉴 ${inventoryAndCost.noRecipeMenuCount}개`,
      target: 'standardRecipe',
    })
  }
  if (inventoryAndCost.noPriceCount > 0) {
    todos.push({
      id: 'no-price',
      severity: 'CAUTION',
      label: `가격 미등록 식재료 ${inventoryAndCost.noPriceCount}개`,
      target: 'ingredientMaster',
    })
  }
  if (inventoryAndCost.noStockCount > 0) {
    todos.push({
      id: 'no-stock',
      severity: 'CAUTION',
      label: `재고 미확인 식재료 ${inventoryAndCost.noStockCount}개`,
      target: 'ingredientMaster',
    })
  }
  if (inventoryAndCost.varianceReviewCount > 0) {
    todos.push({
      id: 'variance',
      severity: 'REVIEW',
      label: `${VARIANCE_REVIEW_LABEL} ${inventoryAndCost.varianceReviewCount}개`,
      target: 'inventoryCount',
    })
  }
  if (orderReceiving && orderReceiving.pendingCount > 0) {
    todos.push({
      id: 'pending-receiving',
      severity: 'CAUTION',
      label: `입고대기 ${orderReceiving.pendingCount}건`,
      target: 'menuPlanOrder',
    })
  }
  if (menuPlanOrder && menuPlanOrder.uncheckedCount > 0) {
    todos.push({
      id: 'order-pending',
      severity: 'INFO',
      label: `발주계획 미생성 식재료 ${menuPlanOrder.uncheckedCount}종`,
      target: 'menuPlanOrder',
    })
  }

  const severityOrder = { REVIEW: 0, CAUTION: 1, INFO: 2 }
  return todos.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

// 32장: 판매기록 하나, 레시피 하나가 잘못됐다고 대시보드 전체가 하얗게 죽으면 안 된다.
// 섹션 하나가 던지면 그 섹션만 null(= "데이터 확인 필요"로 표시)로 돌리고 나머지는
// 그대로 보여준다.
function safely(fn, fallback = null) {
  try {
    return fn()
  } catch (err) {
    console.warn('대시보드 섹션 계산 중 오류가 발생해 건너뜁니다.', err)
    return fallback
  }
}

export function buildOperationsDashboard(date = todayISO()) {
  const mealPlanSummary = safely(() => getTodayMealPlanSummary(date))
  const salesSummary = safely(() => getTodaySalesSummary(date))
  const menuPlanOrder = safely(() => getTodayMenuPlanOrder(date))
  const orderReceiving = safely(() => getOrderReceivingStatusSummary())
  const inventoryAndCost = safely(() => getInventoryAndCostStatus(menuPlanOrder), {
    noStockCount: null,
    noPriceCount: null,
    noRecipeMenuCount: null,
    stockOkCount: null,
    stockShortCount: null,
    stockUnknownForTodayCount: null,
    varianceReviewCount: null,
    varianceCountedTotal: null,
    error: true,
  })
  const recentSales = safely(() => getRecentSalesTable(date), [])
  const sellableMenuCount = safely(() => getActiveMenus().filter((m) => m.sale_price != null).length, 0)

  const todos = safely(
    () => getTodoList({ salesSummary, menuPlanOrder, inventoryAndCost, orderReceiving, sellableMenuCount }),
    []
  )

  return { date, mealPlanSummary, salesSummary, menuPlanOrder, orderReceiving, inventoryAndCost, recentSales, todos }
}
