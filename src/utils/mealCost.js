// 한 끼 구성(rice/soupOrStew/main1/main2/sides/kimchi)의 참고용 1인 원가 합계.
// STEP 7에서 매출·목표원가 대비 정확한 계산으로 대체될 때까지 사용하는 단순 합산이다.
export function calcMealReferenceCost(mealResult) {
  if (!mealResult) return 0
  return (
    mealResult.rice.cost_per_serving +
    mealResult.soupOrStew.cost_per_serving +
    mealResult.main1.cost_per_serving +
    mealResult.main2.cost_per_serving +
    mealResult.kimchi.cost_per_serving +
    mealResult.sides.reduce((sum, s) => sum + s.cost_per_serving, 0)
  )
}

export function formatWon(n) {
  return `${n.toLocaleString('ko-KR')}원`
}
