// STEP 5-9: 메뉴별 준비계획(plannedMenuQuantity, 5-8) → 식재료 필요량 → 발주필요량.
//
// 기존 3-4/3-5/5-2/5-3에서 만든 계산(식재료 필요량 합산, 수율, 재고 1회 차감, 포장단위
// 올림, 5-5 가격 선택)을 ingredientRequirement.js에서 그대로 가져와 재사용한다 — 같은
// 계산엔진을 두 개 만들지 않는다(30장). 다른 점은 입력원 하나뿐이다:
//   - 기존(ingredientRequirement.js의 accumulateDay): 끼니(mealType) × 식수
//     (plannedPreparationCount/expectedCount) × 그 끼니의 모든 메뉴.
//   - 이 파일: 독립 판매메뉴 1개 × plannedMenuQuantity(5-8). 끼니·식수 개념이 없다.
// 두 입력원을 혼동하지 않는다(1장·2장) — 표준 입력 모양은 작업지시서 31장의 제안을
// 그대로 따른다: { sourceType: 'MENU_PLAN', date, menuId, quantity }.

import { getStandardRecipeForMenu } from '../data/standardRecipeDatabase'
import { getIngredientMasterById } from '../data/ingredientMasterDatabase'
import { getMenuById } from '../data/menuDatabase'
import { getAllProductionPlans, getProductionPlansByDate } from '../data/menuProductionPlans'
import { formatBaseQuantity } from './unitConversion'
import { accumulateRecipeLine, applyStockDeduction, buildOrderFields } from './ingredientRequirement'

function round2(n) {
  return Math.round(n * 100) / 100
}

// 선택한 날짜의 plannedMenuQuantity를 표준 입력 모양으로 돌려준다(12장).
export function getMenuPlanEntriesForDate(date) {
  return getProductionPlansByDate(date)
    .filter((p) => Number(p.plannedMenuQuantity) > 0)
    .map((p) => ({ sourceType: 'MENU_PLAN', date: p.date, menuId: p.menuId, quantity: Number(p.plannedMenuQuantity) }))
}

// 날짜 범위(기간) 내 모든 plannedMenuQuantity를 menuId별로 먼저 합산한다(13장·14장) —
// 재고는 이후 딱 한 번만 차감해야 하므로, 날짜별로 따로 계산해서 합치지 않고 수량부터
// 합친 뒤 계산을 한 번만 돌린다.
export function getMenuPlanEntriesInRange(startDate, endDate) {
  const byMenu = new Map()
  for (const plan of getAllProductionPlans()) {
    if (plan.date < startDate || plan.date > endDate) continue
    const quantity = Number(plan.plannedMenuQuantity) || 0
    if (quantity <= 0) continue
    byMenu.set(plan.menuId, (byMenu.get(plan.menuId) || 0) + quantity)
  }
  return Array.from(byMenu.entries()).map(([menuId, quantity]) => ({
    sourceType: 'MENU_PLAN',
    date: null,
    menuId,
    quantity,
  }))
}

// entries(menuId+quantity 목록)를 식재료 버킷으로 누적한다. 레시피가 없거나(17장) 레시피
// 줄의 ingredient_id가 식재료 마스터에 없으면(18장) 조용히 건너뛰지 않고 메뉴별 상태로
// 분명히 남긴다 — accumulateDay(끼니 기준)는 이런 상태를 따로 보고하지 않지만, 독립
// 판매메뉴는 레시피 누락이 곧 "발주 계산에서 빠졌다"는 뜻이라 반드시 알려야 한다.
export function accumulateMenuPlanEntries(entries) {
  const bucket = {}
  const menuStatuses = []

  for (const { menuId, quantity } of entries) {
    if (!quantity || quantity <= 0) continue
    const menu = getMenuById(menuId)
    const name = menu?.name || menuId
    const lines = getStandardRecipeForMenu(menuId)

    if (lines.length === 0) {
      menuStatuses.push({ menuId, name, quantity, status: 'NO_RECIPE', missingIngredientIds: [] })
      continue
    }

    const missingIngredientIds = []
    for (const line of lines) {
      const ingredient = getIngredientMasterById(line.ingredient_id)
      if (!ingredient) {
        missingIngredientIds.push(line.ingredient_id)
        continue
      }
      accumulateRecipeLine(bucket, ingredient, line, quantity, { menuId, name })
    }

    menuStatuses.push({
      menuId,
      name,
      quantity,
      status: missingIngredientIds.length > 0 ? 'INGREDIENT_ERROR' : 'OK',
      missingIngredientIds,
    })
  }

  return { bucket, menuStatuses }
}

// 같은 메뉴가 레시피 줄 여러 개로 같은 식재료를 또 쓰는 경우(드묾) sources를 menuId별로
// 한 줄로 합쳐서 보여준다(16장 — 식재료별 메뉴 출처).
function aggregateSourcesByMenu(sources, family, countUnit) {
  const byMenu = new Map()
  for (const s of sources) {
    const existing = byMenu.get(s.menuId)
    if (existing) existing.netBase += s.netBase
    else byMenu.set(s.menuId, { menuId: s.menuId, name: s.name, netBase: s.netBase })
  }
  return Array.from(byMenu.values())
    .map((s) => ({ ...s, display: formatBaseQuantity(s.netBase, family, countUnit) }))
    .sort((a, b) => b.netBase - a.netBase)
}

// bucket → 발주 행. ingredientRequirement.js의 applyStockDeduction/calcPackInfo/
// buildOrderFields를 그대로 재사용한다(5-3 재고차감, 5-5 가격선택, 포장단위 올림 — 전부
// 같은 함수). 재고 차감은 bucket이 이미 "모든 메뉴 합산 + 날짜/기간 합산"을 끝낸
// actualBase 하나에 대해 딱 한 번만 적용된다(5장·14장).
export function buildMenuPlanOrderRows(bucket) {
  return Object.values(bucket)
    .map((entry) => {
      const ingredient = getIngredientMasterById(entry.ingredientId)
      const netDisplay = formatBaseQuantity(entry.netBase, entry.family, entry.countUnit)
      const actualDisplay = formatBaseQuantity(entry.actualBase, entry.family, entry.countUnit)

      const stock = applyStockDeduction(ingredient, entry.family, entry.actualBase)
      const currentStockDisplay =
        stock.stockBase != null ? formatBaseQuantity(stock.stockBase, entry.family, entry.countUnit) : null
      const purchaseNeededDisplay = formatBaseQuantity(stock.purchaseNeededBase, entry.family, entry.countUnit)

      const order = buildOrderFields(ingredient, entry.family, stock.purchaseNeededBase, purchaseNeededDisplay)
      const sources = aggregateSourcesByMenu(entry.sources, entry.family, entry.countUnit)

      return {
        ingredientId: entry.ingredientId,
        name: entry.name,
        sources, // 16장: 이 식재료가 필요한 이유(어떤 메뉴가 얼마나)
        requiredQuantity: netDisplay,
        actualQuantity: actualDisplay,
        currentStock: currentStockDisplay,
        stockStatus: stock.status, // 'OK' | 'UNCONFIRMED' | 'UNIT_MISMATCH'
        purchaseNeeded: purchaseNeededDisplay,
        ...order,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

// entries(표준 입력 모양)를 받아 결과(행 + 메뉴별 상태)를 한 번에 만든다.
export function calcMenuPlanOrder(entries) {
  const { bucket, menuStatuses } = accumulateMenuPlanEntries(entries)
  const rows = buildMenuPlanOrderRows(bucket)
  return { rows, menuStatuses }
}

// 28장: 상단 요약. "재고 충분"은 재고가 확인되어 있고 순 필요량이 0인 경우,
// "재고 부족"은 재고가 확인돼 있고 순 필요량이 0보다 큰 경우, "재고 미확인"은
// UNCONFIRMED/UNIT_MISMATCH 상태를 합친 것이다.
export function summarizeMenuPlanOrder(menuStatuses, rows) {
  const totalMenus = menuStatuses.length
  const noRecipeCount = menuStatuses.filter((m) => m.status === 'NO_RECIPE').length
  const ingredientErrorCount = menuStatuses.filter((m) => m.status === 'INGREDIENT_ERROR').length
  const recipeConnectedCount = totalMenus - noRecipeCount

  const totalIngredients = rows.length
  const stockShortCount = rows.filter((r) => r.stockStatus === 'OK' && r.purchaseNeeded.value > 0).length
  const stockSufficientCount = rows.filter((r) => r.stockStatus === 'OK' && r.purchaseNeeded.value === 0).length
  const stockUnknownCount = rows.filter((r) => r.stockStatus !== 'OK').length

  const missingPriceCount = rows.filter((r) => r.priceStatus !== 'OK').length
  const totalAmount = round2(rows.reduce((sum, r) => sum + (r.expectedAmount || 0), 0))

  return {
    totalMenus,
    recipeConnectedCount,
    noRecipeCount,
    ingredientErrorCount,
    totalIngredients,
    stockShortCount,
    stockSufficientCount,
    stockUnknownCount,
    missingPriceCount,
    totalAmount,
  }
}
