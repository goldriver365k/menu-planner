// STEP 4-5: 준비량/잔반/폐기 관련 참고 지표. mealCountStats.js(여러 기록을 모아 평균 내는
// 집계 통계)와 달리, 이 함수들은 레코드 "한 건"의 값만으로 바로 계산하는 단순 비율이다 —
// 저장하지 않고 화면에 보여줄 때마다 다시 계산한다.

function round1(n) {
  return Math.round(n * 10) / 10
}

// preparedCount가 없거나(null) 0이면 비율을 계산하지 않는다(0으로 나누지 않음).
function ratioToPrepared(numerator, preparedCount) {
  if (numerator == null || preparedCount == null || preparedCount <= 0) return null
  return round1((numerator / preparedCount) * 100)
}

// 준비 대비 실제 이용률 = actualCount ÷ preparedCount × 100
export function calculateUsageRate(actualCount, preparedCount) {
  return ratioToPrepared(actualCount, preparedCount)
}

// 남은 비율 = leftoverCount ÷ preparedCount × 100
export function calculateLeftoverRate(leftoverCount, preparedCount) {
  return ratioToPrepared(leftoverCount, preparedCount)
}

// 폐기율 = wasteCount ÷ preparedCount × 100
export function calculateWasteRate(wasteCount, preparedCount) {
  return ratioToPrepared(wasteCount, preparedCount)
}

// 참고값일 뿐 "잔반량"이 아니다 — 실제 조리/배식 운영에 따라 추가 조리 등으로 음수가 될
// 수도 있으므로 오류로 취급하지 않는다. 화면에는 "준비량 대비 이용 차이"로만 표시한다.
export function calculatePreparationDifference(preparedCount, actualCount) {
  if (preparedCount == null || actualCount == null) return null
  return preparedCount - actualCount
}
