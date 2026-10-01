// STEP 15 작업지시서 4~9·13·14장: 메뉴 후보 하나를 "이미 정해진 나머지 메뉴들"과 비교해
// 궁합 점수를 계산하는 순수 함수 모음. 여기 함수들은 전부 상태를 갖지 않는다 — 점수 계산에
// 필요한 정보(이번 끼니에서 지금까지 고른 메뉴, 오늘 앞서 만든 끼니, 이번 주 단백질 집계)와
// "메뉴 하나에서 유효 태그를 뽑아내는 함수(getTags)"를 전부 인자로 받는다. getTags를
// 주입받는 이유는 menuScoring.js의 getEffectiveTags()를 그대로 재사용하면서도 이 파일이
// menuScoring.js를 import하지 않게 하기 위해서다(두 파일이 서로를 import하는 순환 참조를
// 피한다 — menuScoring.js가 이 파일의 evaluateCompatibility()를 가져다 쓴다).
//
// 범위를 이렇게 나눴다(모두 작업지시서 예시를 보고 판단):
//   - 육류(주단백질) 반복: main1/main2/국·찌개 사이에서만 비교한다. 반찬 하나하나에 섞인
//     미량의 단백질까지 따지면 "계란이 들어간 반찬이 여러 개"처럼 사소한 걸로 계속 감점돼
//     오히려 신뢰도가 떨어진다.
//   - 조리법 반복: 작업지시서 5장 예시(제육볶음+어묵볶음+멸치볶음)가 반찬까지 포함하므로
//     모든 역할(rice~kimchi)을 대상으로 비교한다.
//   - 매운맛/색상/무게감 과다: 끼니 전체가 대상이다(작업지시서 6·8·9장).
//   - 국/찌개-메인 궁합: soupOrStew가 먼저 배정된 뒤 main1/main2를 고를 때만 적용된다
//     (현재 역할 배정 순서상 국/찌개가 항상 메인보다 먼저 정해진다).

import {
  PROTEIN_SCORED_ROLES,
  isMainRole,
  PENALTY_PROTEIN_REPEAT_SAME_MEAL,
  PENALTY_COOKING_METHOD_REPEAT_SAME_MEAL,
  PENALTY_SPICY_OVERLOAD,
  PENALTY_COLOR_REPEAT,
  PENALTY_WEIGHT_OVERLOAD,
  PENALTY_SOUP_MAIN_MISMATCH,
  BONUS_SOUP_MAIN_GOOD_MATCH,
  PENALTY_PROTEIN_REPEAT_RECENT_DAY,
  PENALTY_COOKING_METHOD_REPEAT_RECENT_DAY,
  PENALTY_WEEKLY_PROTEIN_OVERLOAD,
  PENALTY_HEAVY_DAY_OVERLOAD,
  SPICY_HOT_LEVEL,
  SPICY_OVERLOAD_THRESHOLD_COUNT,
  WEIGHT_HEAVY_LEVEL,
  WEIGHT_OVERLOAD_THRESHOLD_COUNT,
  COLOR_REPEAT_THRESHOLD_COUNT,
  HEAVY_DAY_AVERAGE_THRESHOLD,
  WEEKLY_PROTEIN_OVERLOAD_RATIO,
} from '../data/menuQualityRules'

function itemsSoFar(mealSoFar) {
  return Object.values(mealSoFar || {}).filter(Boolean)
}

// 작업지시서 4장: 같은 끼니 안에서 육류(주단백질)가 겹치면 감점.
function proteinRepeatCheck(candidateTags, role, mealSoFar, getTags) {
  if (!isMainRole(role) || !candidateTags.protein_type) return { delta: 0, reasons: [] }
  const relevant = PROTEIN_SCORED_ROLES.filter((r) => r !== role)
    .map((r) => mealSoFar[r])
    .filter(Boolean)
  const repeats = relevant.some((item) => getTags(item).protein_type === candidateTags.protein_type)
  if (repeats) return { delta: -PENALTY_PROTEIN_REPEAT_SAME_MEAL, reasons: ['같은 끼니에 같은 육류 반복'] }
  return { delta: 0, reasons: [] }
}

// 작업지시서 5장: 조리법이 같은 끼니 안에서 여러 번 겹치면 겹칠 때마다 감점.
function cookingMethodRepeatCheck(candidateTags, mealSoFar, getTags) {
  if (!candidateTags.cooking_method) return { delta: 0, reasons: [] }
  const matches = itemsSoFar(mealSoFar).filter((item) => getTags(item).cooking_method === candidateTags.cooking_method).length
  if (matches > 0) {
    return {
      delta: -PENALTY_COOKING_METHOD_REPEAT_SAME_MEAL * matches,
      reasons: [`조리법(${candidateTags.cooking_method}) 반복`],
    }
  }
  return { delta: 0, reasons: [] }
}

// 작업지시서 6장: 매운 메뉴(spicy_level >= SPICY_HOT_LEVEL)가 과다하면 감점.
function spicyOverloadCheck(candidateTags, mealSoFar, getTags) {
  if (candidateTags.spicy_level < SPICY_HOT_LEVEL) return { delta: 0, reasons: [] }
  const hotCount = itemsSoFar(mealSoFar).filter((item) => getTags(item).spicy_level >= SPICY_HOT_LEVEL).length
  if (hotCount + 1 >= SPICY_OVERLOAD_THRESHOLD_COUNT) {
    return { delta: -PENALTY_SPICY_OVERLOAD, reasons: ['매운 메뉴 과다'] }
  }
  return { delta: 0, reasons: [] }
}

// 작업지시서 8장: 색상 정보가 없는(OTHER) 메뉴는 이 규칙에서 제외한다.
function colorRepeatCheck(candidateTags, mealSoFar, getTags) {
  if (!candidateTags.color_group || candidateTags.color_group === 'OTHER') return { delta: 0, reasons: [] }
  const sameColorCount = itemsSoFar(mealSoFar).filter((item) => getTags(item).color_group === candidateTags.color_group).length
  if (sameColorCount + 1 >= COLOR_REPEAT_THRESHOLD_COUNT) {
    return { delta: -PENALTY_COLOR_REPEAT, reasons: ['색상 편중'] }
  }
  return { delta: 0, reasons: [] }
}

// 작업지시서 9장: 무거운 메뉴(weight_level >= WEIGHT_HEAVY_LEVEL)가 과다하면 감점.
function weightOverloadCheck(candidateTags, mealSoFar, getTags) {
  if (candidateTags.weight_level < WEIGHT_HEAVY_LEVEL) return { delta: 0, reasons: [] }
  const heavyCount = itemsSoFar(mealSoFar).filter((item) => getTags(item).weight_level >= WEIGHT_HEAVY_LEVEL).length
  if (heavyCount + 1 >= WEIGHT_OVERLOAD_THRESHOLD_COUNT) {
    return { delta: -PENALTY_WEIGHT_OVERLOAD, reasons: ['무거운 메뉴 과다'] }
  }
  return { delta: 0, reasons: [] }
}

// 작업지시서 7장: 국/찌개와 메인의 궁합. soupOrStew가 이미 정해져 있고 지금 main1/main2를
// 고르는 중일 때만 적용된다(현재 역할 순서상 국/찌개가 항상 메인보다 먼저 배정된다).
function soupMainCompatibilityCheck(candidateTags, role, mealSoFar, getTags) {
  if (role !== 'main1' && role !== 'main2') return { delta: 0, reasons: [] }
  const soup = mealSoFar.soupOrStew
  if (!soup) return { delta: 0, reasons: [] }
  const soupTags = getTags(soup)

  const sameProtein =
    candidateTags.protein_type &&
    !['VEGETABLE', 'OTHER'].includes(candidateTags.protein_type) &&
    candidateTags.protein_type === soupTags.protein_type
  const bothSpicy = candidateTags.spicy_level >= SPICY_HOT_LEVEL && soupTags.spicy_level >= SPICY_HOT_LEVEL
  const friedWithHeavySoup = candidateTags.cooking_method === '튀김' && soupTags.weight_level >= WEIGHT_HEAVY_LEVEL

  if (sameProtein || bothSpicy || friedWithHeavySoup) {
    return { delta: -PENALTY_SOUP_MAIN_MISMATCH, reasons: ['국/찌개와 메인 궁합이 좋지 않음'] }
  }

  const spicyMainMildSoup = candidateTags.spicy_level >= SPICY_HOT_LEVEL && soupTags.spicy_level === 0 && soupTags.weight_level <= 1
  const friedWithLightSoup = candidateTags.cooking_method === '튀김' && soupTags.weight_level <= 1
  const meatMainVegSoup =
    ['BEEF', 'PORK', 'CHICKEN'].includes(candidateTags.protein_type) &&
    ['VEGETABLE', 'OTHER'].includes(soupTags.protein_type)

  if (spicyMainMildSoup || friedWithLightSoup || meatMainVegSoup) {
    return { delta: BONUS_SOUP_MAIN_GOOD_MATCH, reasons: ['국/찌개와 메인 궁합이 좋음'] }
  }

  return { delta: 0, reasons: [] }
}

// 작업지시서 13장: 점심에 제육볶음을 썼다면 저녁에 비슷한 돼지고기 메뉴 우선순위를 낮춘다.
function recentDayProteinCheck(candidateTags, role, dayMealsSoFar, getTags) {
  if (!isMainRole(role) || !candidateTags.protein_type || !dayMealsSoFar?.length) {
    return { delta: 0, reasons: [] }
  }
  let delta = 0
  const reasons = []
  for (const meal of dayMealsSoFar) {
    if (!meal) continue
    for (const r of ['main1', 'main2']) {
      const item = meal[r]
      if (!item) continue
      const tags = getTags(item)
      if (tags.protein_type === candidateTags.protein_type) {
        delta -= PENALTY_PROTEIN_REPEAT_RECENT_DAY
        reasons.push('오늘 앞선 끼니와 같은 육류 반복')
        if (tags.cooking_method === candidateTags.cooking_method && candidateTags.cooking_method) {
          delta -= PENALTY_COOKING_METHOD_REPEAT_RECENT_DAY
        }
      }
    }
  }
  return { delta, reasons }
}

// 작업지시서 13장: 오늘 앞선 끼니가 전부 무거웠는데 지금도 무거운 메뉴를 고르면 감점.
function heavyDayCheck(candidateTags, dayMealsSoFar, getTags) {
  if (candidateTags.weight_level < WEIGHT_HEAVY_LEVEL || !dayMealsSoFar?.length) return { delta: 0, reasons: [] }
  const allHeavy = dayMealsSoFar.every((meal) => {
    if (!meal) return false
    const items = [meal.rice, meal.soupOrStew, meal.main1, meal.main2, meal.kimchi, ...(meal.sides || [])].filter(Boolean)
    if (items.length === 0) return false
    const avg = items.reduce((sum, i) => sum + getTags(i).weight_level, 0) / items.length
    return avg >= HEAVY_DAY_AVERAGE_THRESHOLD
  })
  if (allHeavy) return { delta: -PENALTY_HEAVY_DAY_OVERLOAD, reasons: ['오늘 전체적으로 무거운 식단'] }
  return { delta: 0, reasons: [] }
}

// 작업지시서 14장: 이번 주 특정 단백질이 이미 과반에 가깝게 쓰였다면 그 단백질을 더 쌓지 않는다.
function weeklyProteinOverloadCheck(candidateTags, role, weekProteinCounts) {
  if (!isMainRole(role) || !candidateTags.protein_type || !weekProteinCounts) {
    return { delta: 0, reasons: [] }
  }
  const total = Object.values(weekProteinCounts).reduce((a, b) => a + b, 0)
  if (total === 0) return { delta: 0, reasons: [] }
  const current = weekProteinCounts[candidateTags.protein_type] || 0
  if (current / total >= WEEKLY_PROTEIN_OVERLOAD_RATIO) {
    return { delta: -PENALTY_WEEKLY_PROTEIN_OVERLOAD, reasons: ['이번 주 특정 단백질 편중'] }
  }
  return { delta: 0, reasons: [] }
}

// 모든 궁합 점수를 합산한다.
// candidateTags: 후보 메뉴의 유효 태그(getTags(candidate)를 호출자가 미리 계산해서 넘긴다).
// getTags: 메뉴 하나 → 유효 태그로 바꾸는 함수(menuScoring.getEffectiveTags를 그대로 전달).
export function evaluateCompatibility({ candidateTags, role, mealSoFar, dayMealsSoFar, weekProteinCounts, getTags }) {
  const checks = [
    proteinRepeatCheck(candidateTags, role, mealSoFar, getTags),
    cookingMethodRepeatCheck(candidateTags, mealSoFar, getTags),
    spicyOverloadCheck(candidateTags, mealSoFar, getTags),
    colorRepeatCheck(candidateTags, mealSoFar, getTags),
    weightOverloadCheck(candidateTags, mealSoFar, getTags),
    soupMainCompatibilityCheck(candidateTags, role, mealSoFar, getTags),
    recentDayProteinCheck(candidateTags, role, dayMealsSoFar, getTags),
    heavyDayCheck(candidateTags, dayMealsSoFar, getTags),
    weeklyProteinOverloadCheck(candidateTags, role, weekProteinCounts),
  ]

  let scoreDelta = 0
  const reasons = []
  for (const check of checks) {
    scoreDelta += check.delta
    reasons.push(...check.reasons)
  }
  return { scoreDelta, reasons }
}
