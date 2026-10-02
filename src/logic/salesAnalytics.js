// 실제 판매기록(5-7) 집계 — 날짜별 요약, 메뉴별 누적. 전부 레코드에 저장된 당시
// snapshot(salePrice/unitFoodCost)만 사용한다 — 현재 메뉴 가격이나 최신 식재료 가격을
// 다시 가져와 재계산하지 않는다(과거 기록 재계산 금지, 20장).

import { getSalesRecordsByDate, getSalesRecordsInRange } from '../data/salesRecords'
import { getMenuById } from '../data/menuDatabase'

function round(n) {
  return Math.round(n)
}

function round1(n) {
  return Math.round(n * 10) / 10
}

// 레코드 하나의 실제 매출/식재료비/식재료 기준 이익/원가율 — 전부 snapshot 값 기준.
// unitFoodCostStatus가 'OK'가 아니면(레시피 미등록/원가 계산불가) 식재료비는 null로
// 남긴다 — 0원으로 처리하지 않는다(17장: 매출과 원가 계산을 분리한다).
export function calcSalesRecordFinancials(record) {
  const revenue = record.salePrice != null ? round(record.salePrice * record.quantity) : null
  const foodCost =
    record.unitFoodCostStatus === 'OK' && record.unitFoodCost != null ? round(record.unitFoodCost * record.quantity) : null
  const ingredientProfit = revenue != null && foodCost != null ? revenue - foodCost : null
  // 10장: 판매수량이 0(=매출 0)이면 원가율을 억지로 계산하지 않는다(0으로 나누기 방지).
  const costRate = revenue != null && revenue > 0 && foodCost != null ? round1((foodCost / revenue) * 100) : null
  return { revenue, foodCost, ingredientProfit, costRate }
}

// 15장: 현재 menu DB에 그 메뉴가 남아있는지 확인해 표시용 이름/삭제 여부를 덧붙인다 —
// 지워졌어도 기록 자체(record)는 손대지 않고 그대로 보존한다.
export function enrichSalesRecord(record) {
  const menu = getMenuById(record.menuId)
  const financials = calcSalesRecordFinancials(record)
  return {
    ...record,
    ...financials,
    displayName: menu?.name || record.menuNameSnapshot || record.menuId,
    menuDeleted: !menu,
  }
}

// 11장: 하루 판매 입력 화면의 날짜별 요약.
export function getDailySummary(date) {
  const records = getSalesRecordsByDate(date).map(enrichSalesRecord)
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0)
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0)
  const totalFoodCost = records.reduce((sum, r) => sum + (r.foodCost || 0), 0)
  const totalIngredientProfit = totalRevenue - totalFoodCost
  const averageCostRate = totalRevenue > 0 ? round1((totalFoodCost / totalRevenue) * 100) : null
  const hasUnavailableCost = records.some((r) => r.quantity > 0 && r.foodCost == null)

  return { date, records, totalQuantity, totalRevenue, totalFoodCost, totalIngredientProfit, averageCostRate, hasUnavailableCost }
}

// 12장·13장: 기간(startDate~endDate) 내 메뉴별 누적. menuId로 묶어서 메뉴명이 바뀌거나
// 메뉴가 삭제돼도 기록이 끊기지 않게 한다(14장).
export function getMenuAccumulation(startDate, endDate) {
  const records = getSalesRecordsInRange(startDate, endDate).map(enrichSalesRecord)
  const byMenu = new Map()

  for (const r of records) {
    if (!byMenu.has(r.menuId)) {
      byMenu.set(r.menuId, {
        menuId: r.menuId,
        name: r.displayName,
        menuDeleted: r.menuDeleted,
        quantity: 0,
        revenue: 0,
        foodCost: 0,
        hasUnavailableCost: false,
      })
    }
    const acc = byMenu.get(r.menuId)
    acc.quantity += r.quantity
    acc.revenue += r.revenue || 0
    acc.foodCost += r.foodCost != null ? r.foodCost : 0
    if (r.quantity > 0 && r.foodCost == null) acc.hasUnavailableCost = true
  }

  return Array.from(byMenu.values()).map((acc) => ({
    ...acc,
    ingredientProfit: acc.revenue - acc.foodCost,
    costRate: acc.revenue > 0 ? round1((acc.foodCost / acc.revenue) * 100) : null,
  }))
}
