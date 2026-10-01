// STEP 4-2: 누적된 식수 기록(mealCountRecords.js)을 단순 배열 집계로 분석한다.
// 새로운 예측/AI 기능은 없다 — 평균/표본수/최근 N주 평균만 계산한다.
// 과거 데이터에 필드가 일부 없어도(actualCount 없음, date/mealType 깨짐 등) 오류 없이
// 해당 레코드만 집계에서 제외한다.

import { DAYS, MEAL_TYPES } from '../data/planConfig'
import { diffDays, todayISO } from '../data/menuHistory'

// STEP 4-3(menuMealCountStats.js)에서도 날짜→요일 변환이 그대로 필요해 export한다
// (요일 계산 방식을 이 파일 하나로 유지하기 위해 — 중복 구현하지 않는다).
export function weekdayOfDate(dateISO) {
  if (typeof dateISO !== 'string') return null
  const date = new Date(`${dateISO}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const jsDay = date.getDay() // 0=일 ... 6=토
  return DAYS[(jsDay + 6) % 7] // DAYS = ['mon', ..., 'sun']
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function average(numbers) {
  if (numbers.length === 0) return null
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}

// 실제 식수가 유효한 숫자로 입력된 기록만 남긴다(미입력/과거 데이터 필드 누락은 제외).
function withValidActualCount(records) {
  return (records || []).filter((r) => r && typeof r.actualCount === 'number' && Number.isFinite(r.actualCount))
}

// 전체 평균 실제 식수(요일/끼니 구분 없이 전부).
export function getAverageActualCount(records) {
  const valid = withValidActualCount(records)
  const avg = average(valid.map((r) => r.actualCount))
  return { average: avg == null ? null : round1(avg), count: valid.length }
}

// 아침/점심/저녁별 평균(요일 구분 없이 합산).
export function getAverageByMealType(records, mealType) {
  const valid = withValidActualCount(records).filter((r) => r.mealType === mealType)
  const avg = average(valid.map((r) => r.actualCount))
  return { average: avg == null ? null : round1(avg), count: valid.length }
}

// 요일별 평균(끼니 구분 없이 합산).
export function getAverageByWeekday(records, day) {
  const valid = withValidActualCount(records).filter((r) => weekdayOfDate(r.date) === day)
  const avg = average(valid.map((r) => r.actualCount))
  return { average: avg == null ? null : round1(avg), count: valid.length }
}

// 요일 + 끼니 조합 평균 — 아침/점심/저녁을 섞지 않는다.
export function getAverageByWeekdayAndMeal(records, day, mealType) {
  const valid = withValidActualCount(records).filter((r) => weekdayOfDate(r.date) === day && r.mealType === mealType)
  const avg = average(valid.map((r) => r.actualCount))
  return { average: avg == null ? null : round1(avg), count: valid.length }
}

// 화면의 "요일 | 아침 | 점심 | 저녁" 표를 한 번에 만든다.
export function getWeekdayMealTable(records) {
  const table = {}
  for (const day of DAYS) {
    table[day] = {}
    for (const mealType of MEAL_TYPES) {
      table[day][mealType] = getAverageByWeekdayAndMeal(records, day, mealType)
    }
  }
  return table
}

// 최근 N주(기본 4주) 평균 — 기준일(기본값: 오늘)로부터 N*7일 이내 기록만 단순 평균한다.
// 가중평균 등 복잡한 계산은 하지 않는다.
export function getRecentAverage(records, weeks = 4, referenceDateISO = null) {
  const valid = withValidActualCount(records)
  if (valid.length === 0) return { average: null, count: 0 }

  const reference = referenceDateISO || todayISO()
  const windowDays = weeks * 7
  const recent = valid.filter((r) => {
    const diff = diffDays(r.date, reference) // reference - r.date
    return Number.isFinite(diff) && diff >= 0 && diff < windowDays
  })
  const avg = average(recent.map((r) => r.actualCount))
  return { average: avg == null ? null : round1(avg), count: recent.length }
}

// 요일/끼니별 "예상 대비 실제" — 평균 예상, 평균 실제, 평균 차이.
// day 또는 mealType을 생략하면 그 축은 구분하지 않고 합산한다.
export function getExpectedVsActual(records, day = null, mealType = null) {
  const valid = withValidActualCount(records).filter(
    (r) => (day == null || weekdayOfDate(r.date) === day) && (mealType == null || r.mealType === mealType)
  )
  if (valid.length === 0) return { avgExpected: null, avgActual: null, avgDiff: null, count: 0 }

  const avgExpected = average(valid.map((r) => Number(r.expectedCount) || 0))
  const avgActual = average(valid.map((r) => r.actualCount))
  return {
    avgExpected: round1(avgExpected),
    avgActual: round1(avgActual),
    avgDiff: round1(avgActual - avgExpected),
    count: valid.length,
  }
}

// "기록 목록" 화면용 — 최근 날짜부터 정렬한다. date/mealType이 없는 깨진 레코드는 뺀다.
export function getRecentRecords(records, limit = 20) {
  return [...(records || [])]
    .filter((r) => r && typeof r.date === 'string' && typeof r.mealType === 'string')
    .sort((a, b) => (b.date === a.date ? 0 : b.date.localeCompare(a.date)))
    .slice(0, limit)
}
