// 한 끼 구성(rice/soupOrStew/main1/main2/sides/kimchi)의 참고용 1인 원가 합계.
// STEP 7에서 매출·목표원가 대비 정확한 계산으로 대체될 때까지 사용하는 단순 합산이다.
// STEP 14: NEIS에서 가져온 메뉴는 원가가 검증되지 않아 cost_per_serving이 null일 수 있다
// (작업지시서 15장) — null 항목은 0원으로 취급해 합산하되, mealHasUnverifiedCost()로 어떤
// 끼니에 "원가 미등록" 메뉴가 섞여 있는지 별도로 확인할 수 있게 한다.
export function calcMealReferenceCost(mealResult) {
  if (!mealResult) return 0
  return (
    (mealResult.rice.cost_per_serving || 0) +
    (mealResult.soupOrStew.cost_per_serving || 0) +
    (mealResult.main1.cost_per_serving || 0) +
    (mealResult.main2.cost_per_serving || 0) +
    (mealResult.kimchi.cost_per_serving || 0) +
    mealResult.sides.reduce((sum, s) => sum + (s.cost_per_serving || 0), 0)
  )
}

// 한 끼에 원가가 검증되지 않은(NEIS 가져오기 등으로 cost_verified===false) 메뉴가 하나라도
// 있는지 — 있다면 위 원가 합계가 실제보다 낮게 계산됐을 수 있다는 경고를 보여주는 데 쓴다.
export function mealHasUnverifiedCost(mealResult) {
  if (!mealResult) return false
  const items = [mealResult.rice, mealResult.soupOrStew, mealResult.main1, mealResult.main2, mealResult.kimchi, ...mealResult.sides]
  return items.some((item) => item.cost_verified === false)
}

export function formatWon(n) {
  if (n == null) return '원가 미등록'
  return `${n.toLocaleString('ko-KR')}원`
}
