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

// 식재료 하나의 "구매단위 기본 수량 1단위당 원가". 구매가·구매수량이 없거나 0 이하면
// 실제로 가격이 입력되지 않은 것으로 보고 임의 가격을 만들지 않는다('가격 미등록').
export function calcIngredientUnitCost(ingredient) {
  if (!ingredient) return { unitCost: null, status: 'NOT_FOUND' }
  const price = Number(ingredient.purchase_price) || 0
  const qty = Number(ingredient.purchase_quantity) || 0
  if (price <= 0 || qty <= 0) return { unitCost: null, status: 'NO_PRICE' }
  const baseQty = toBaseQuantity(qty, ingredient.purchase_unit)
  return { unitCost: price / baseQty, status: 'OK' }
}

// 레시피 한 줄(식재료 1종)의 원가.
// 수율(usable_yield)이 있으면 "실제 필요량 = 순사용량 ÷ 수율"로 늘려서 계산한다 — 예를 들어
// 수율 85%짜리 식재료를 100g 쓰려면 실제로는 100 ÷ 0.85 ≈ 117.6g을 사야 하기 때문이다.
export function calcRecipeLineCost(line, ingredient) {
  const ingredientName = ingredient?.name || line.ingredient_id

  if (!ingredient) return { ...line, ingredientName, cost: null, status: 'NOT_FOUND' }

  const { unitCost, status: priceStatus } = calcIngredientUnitCost(ingredient)
  if (priceStatus === 'NO_PRICE') return { ...line, ingredientName, cost: null, status: 'NO_PRICE' }

  if (!unitsAreConvertible(line.unit, ingredient.purchase_unit)) {
    return { ...line, ingredientName, cost: null, status: 'UNIT_MISMATCH' }
  }

  const yieldPercent = Number(ingredient.usable_yield) > 0 ? Number(ingredient.usable_yield) : 100
  const actualNeededQuantity = line.quantity / (yieldPercent / 100)
  const baseQuantity = toBaseQuantity(actualNeededQuantity, line.unit)
  const cost = unitCost * baseQuantity

  return { ...line, ingredientName, cost, status: 'OK' }
}

// 메뉴 1인분 원가 — 레시피의 모든 식재료 원가를 합산한다.
// status: 'NO_RECIPE'(레시피 미등록) | 'OK'(레시피는 있음 — 줄별 상태는 lines에서 확인).
// hasIssue: 하나라도 '가격 미등록'/'단위 환산 불가'/'식재료 없음' 줄이 있으면 true —
// 이 경우 totalCost는 "계산 가능한 줄만 더한 값"이라 실제보다 낮을 수 있다는 뜻이다.
export function calcMenuRecipeCost(menuId) {
  const lines = getStandardRecipeForMenu(menuId)
  if (lines.length === 0) {
    return { status: 'NO_RECIPE', lines: [], totalCost: null, hasIssue: true }
  }

  const computedLines = lines.map((line) => calcRecipeLineCost(line, getIngredientMasterById(line.ingredient_id)))
  const hasIssue = computedLines.some((l) => l.status !== 'OK')
  const totalCost = computedLines.reduce((sum, l) => sum + (l.cost || 0), 0)

  return { status: 'OK', lines: computedLines, totalCost, hasIssue }
}
