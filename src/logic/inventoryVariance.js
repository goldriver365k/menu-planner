// 실사재고 대비 재고차이 — 단순 비교 계산만 한다(통계/예측 없음).
import { getLatestInventoryCountByIngredient } from '../data/inventoryCounts'
import { getIngredientMasterById } from '../data/ingredientMasterDatabase'

export const VARIANCE_REVIEW_THRESHOLD_PERCENT = 5

// variancePercent가 없으면(이론재고 미확인 등) 판정하지 않는다 — 임의로 "정상"이라고
// 단정하지 않는다.
export function getVarianceStatus(variancePercent) {
  if (variancePercent == null) return 'UNKNOWN'
  return Math.abs(variancePercent) > VARIANCE_REVIEW_THRESHOLD_PERCENT ? 'REVIEW' : 'OK'
}

// 식재료별 가장 최근 실사 기록에 이름 등을 덧붙인다.
export function getInventoryVarianceOverview() {
  return getLatestInventoryCountByIngredient().map((record) => {
    const ingredient = getIngredientMasterById(record.ingredientId)
    return {
      ...record,
      name: ingredient?.name || record.ingredientId,
      purchaseUnit: ingredient?.purchase_unit || '',
      status: getVarianceStatus(record.variancePercent),
    }
  })
}

// 대시보드(5-11)용 집계 — "실사 차이 5% 초과" 건수 등.
export function summarizeInventoryVariance() {
  const overview = getInventoryVarianceOverview()
  return {
    countedIngredients: overview.length,
    reviewNeededCount: overview.filter((r) => r.status === 'REVIEW').length,
    okCount: overview.filter((r) => r.status === 'OK').length,
    unknownCount: overview.filter((r) => r.status === 'UNKNOWN').length,
  }
}
