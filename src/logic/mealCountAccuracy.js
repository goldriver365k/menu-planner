// 예상 식수 vs 실제 식수 — 차이/오차율/예측 정확도 계산.
// 소수점 한 자리 표시는 화면(컴포넌트)에서 toFixed(1)로 처리하고, 여기서는 원값만 돌려준다.

export function calcMealCountAccuracy(expectedCount, actualCount) {
  if (actualCount == null) return { diff: null, errorRate: null, accuracy: null }

  const diff = actualCount - expectedCount
  if (!expectedCount || expectedCount <= 0) return { diff, errorRate: null, accuracy: null } // 0으로 나누지 않는다

  const errorRate = (Math.abs(diff) / expectedCount) * 100
  const accuracy = 100 - errorRate
  return { diff, errorRate, accuracy }
}
