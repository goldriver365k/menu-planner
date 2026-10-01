// STEP 15 작업지시서 1~3·12·20장: 식단 품질 엔진의 공개 진입점.
// generateMeal.js/generateWeek.js는 이 파일의 pickQualityCandidate()만 호출하면 된다 —
// 세부 점수 계산(menuScoring.js)과 궁합 판정(menuCompatibility.js)은 이 파일 뒤에 숨어 있다.
// UI 쪽(품질 배지/경고, 주간 단백질 요약)도 이 파일을 통해서만 가져다 쓴다.
//
// 성능(작업지시서 20장): 메뉴가 3,000개로 늘어나도, 이 함수에 들어오는 pool은 이미
// generateMeal.js의 poolForRole()이 카테고리(+서브카테고리)로 걸러낸 뒤이므로 보통 수십~
// 수백 개 수준이다. 그 안에서 모든 조합을 따지지 않고 "후보 하나 vs 이미 정해진 메뉴들"만
// 비교하는 선형 점수 계산이라 전체 메뉴 수가 늘어도 끼니 하나 생성 비용은 거의 늘지 않는다.

import { scoreCandidate, scoreMealQuality, tallyMealProtein, tallyItemProtein, getEffectiveTags } from './menuScoring'
import { CANDIDATE_POOL_SIZE, CANDIDATE_SCORE_MARGIN } from '../data/menuQualityRules'

function pickRandomFrom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// 작업지시서 2·12장: 후보를 전부 점수화한 뒤, 상위 CANDIDATE_POOL_SIZE개 또는 최고점에서
// CANDIDATE_SCORE_MARGIN 이내인 후보(둘 중 더 넓은 쪽)를 추려 그 안에서 무작위로 고른다.
// 이렇게 하면 "항상 1등만" 나오지 않으면서도 "품질이 떨어지는 메뉴가 선택되는 일"은 드물다.
// pool이 비어 있을 일은 없다고 가정한다 — poolForRole()이 돌려주는 카테고리별 후보군은
// 기존 메뉴 생성 로직과 동일한 전제(각 카테고리에 활성 메뉴가 최소 1개 이상)를 그대로 쓴다.
export function pickQualityCandidate({ pool, role, excludedIds = new Set(), mealSoFar = {}, dayMealsSoFar = [], weekProteinCounts = {} }) {
  const scored = pool.map((candidate) =>
    scoreCandidate({ candidate, role, mealSoFar, dayMealsSoFar, weekProteinCounts, excludedIds })
  )
  scored.sort((a, b) => b.score - a.score)

  const topScore = scored[0].score
  const shortlist = scored.filter((s, i) => i < CANDIDATE_POOL_SIZE || topScore - s.score <= CANDIDATE_SCORE_MARGIN)

  return pickRandomFrom(shortlist).item
}

// 끼니 하나가 만들어진 뒤, 그 결과로 주간 단백질 집계(weekProteinCounts)를 갱신한다.
// generateMeal.js의 generateDayMenu()가 끼니를 생성할 때마다 호출한다.
export function recordMealIntoWeekStats(weekProteinCounts, mealResult) {
  tallyMealProtein(weekProteinCounts, mealResult)
}

// 작업지시서 15·16장: 완성된 끼니의 품질 배지/경고 — UI(MealQualityBadge)가 그대로 쓴다.
export function evaluateMealQuality(mealResult) {
  return scoreMealQuality(mealResult)
}

// 작업지시서 14장: 주간 전체의 단백질 분포와, 특정 단백질이 부족하거나 편중됐을 때의 경고.
// weekMenu는 PlannerPage의 weekMenu 상태(day -> mealType -> 끼니결과)를 그대로 받는다.
export function evaluateWeekProteinBalance(weekMenu) {
  const counts = {}
  let mealCount = 0
  for (const day of Object.keys(weekMenu || {})) {
    const dayResult = weekMenu[day]
    if (!dayResult) continue
    for (const mealType of Object.keys(dayResult)) {
      const mealResult = dayResult[mealType]
      if (!mealResult) continue
      mealCount += 1
      tallyMealProtein(counts, mealResult)
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const warnings = []

  // 데이터가 너무 적으면(끼니 3개 미만) 통계적으로 의미가 없으니 경고를 내지 않는다.
  if (mealCount >= 3 && total > 0) {
    if (!counts.FISH) {
      warnings.push('⚠ 이번 주 생선 메뉴가 부족합니다.')
    }
    const [dominantType, dominantCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || []
    if (dominantType && dominantCount / total >= 0.5) {
      warnings.push('⚠ 특정 단백질(메인 메뉴) 편중이 심합니다.')
    }
  }

  return { counts, total, warnings }
}

export { getEffectiveTags, tallyItemProtein, tallyMealProtein }
