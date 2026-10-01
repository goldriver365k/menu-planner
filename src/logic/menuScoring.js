// STEP 15 작업지시서 3장: 메뉴 태그(protein_type/cooking_method/spicy_level/color_group/
// weight_level)가 비어 있어도 점수 계산이 멈추지 않도록, "실제 저장된 값이 있으면 그대로
// 쓰고 없으면 이름에서 추정"하는 getEffectiveTags()를 모든 점수 계산의 입구로 둔다.
// 기존 SEED 410개 메뉴처럼 태그가 전혀 없는 데이터도 이 함수를 거치면 안전하게 추정값을
// 받는다 — menuDatabase.js 스키마 자체는 건드리지 않는다.

import { inferProteinType, inferCookingMethod } from './menuImport/classifyMenu'
import { evaluateCompatibility } from './menuCompatibility'
import {
  QUALITY_BASE_SCORE,
  PENALTY_DEDUP_14DAY,
  BONUS_NEIS_POPULAR,
  BONUS_ADMIN_SOURCE,
  NEIS_POPULAR_SOURCE_COUNT_THRESHOLD,
  SPICY_HOT_LEVEL,
  SPICY_OVERLOAD_THRESHOLD_COUNT,
  WEIGHT_HEAVY_LEVEL,
  WEIGHT_OVERLOAD_THRESHOLD_COUNT,
  COLOR_REPEAT_THRESHOLD_COUNT,
  QUALITY_LABEL_THRESHOLDS,
} from '../data/menuQualityRules'

// --- 색상/무게감 추정 (작업지시서 8·9장) — protein_type/cooking_method는 이미
// menuImport/classifyMenu.js에 있는 추정 로직을 그대로 재사용한다(중복 키워드 테이블 방지). ---

const RED_KEYWORDS = ['고추장', '매운', '매콤', '김치', '깍두기', '청양', '불닭', '토마토', '짬뽕', '겉절이']
const GREEN_KEYWORDS = ['나물', '시금치', '부추', '오이', '깻잎', '브로콜리', '상추', '미나리', '열무']
const YELLOW_KEYWORDS = ['계란', '달걀', '단무지', '카레', '치즈', '옥수수', '호박', '고구마']
const WHITE_KEYWORDS = ['쌀밥', '두부', '무생채', '콩나물', '북어', '우동', '양파', '도라지']
const BROWN_KEYWORDS = ['조림', '장조림', '간장', '불고기', '갈비', '구이', '고등어', '멸치', '우엉', '메추리알']

function inferColorGroup(name) {
  if (RED_KEYWORDS.some((kw) => name.includes(kw))) return 'RED'
  if (GREEN_KEYWORDS.some((kw) => name.includes(kw))) return 'GREEN'
  if (YELLOW_KEYWORDS.some((kw) => name.includes(kw))) return 'YELLOW'
  if (WHITE_KEYWORDS.some((kw) => name.includes(kw))) return 'WHITE'
  if (BROWN_KEYWORDS.some((kw) => name.includes(kw))) return 'BROWN'
  return 'OTHER'
}

const HEAVY_WEIGHT_KEYWORDS = ['튀김', '까스', '탕수육', '찜', '갈비', '곱창', '전골', '스테이크', '삼겹', '족발', '보쌈', '수육']
const LIGHT_WEIGHT_KEYWORDS = ['나물', '무침', '샐러드', '장아찌', '물김치', '동치미', '겉절이', '미역국', '콩나물국', '젓갈']

function inferWeightLevel(name) {
  if (HEAVY_WEIGHT_KEYWORDS.some((kw) => name.includes(kw))) return 3
  if (LIGHT_WEIGHT_KEYWORDS.some((kw) => name.includes(kw))) return 1
  return 2
}

// 메뉴 하나의 "유효" 품질 태그 — 저장된 값이 있으면 그대로, 없으면 이름에서 추정한다.
// 추정 결과는 호출마다 다시 계산하므로(캐시하지 않음) 메뉴 DB가 바뀌어도 항상 최신값을 본다.
export function getEffectiveTags(menu) {
  if (!menu) return { protein_type: '', cooking_method: '', spicy_level: 0, color_group: 'OTHER', weight_level: 2 }
  const name = menu.name || ''
  return {
    protein_type: menu.protein_type || inferProteinType(name),
    cooking_method: menu.cooking_method || inferCookingMethod(name),
    spicy_level: menu.spicy_level ?? 0,
    color_group: menu.color_group || inferColorGroup(name),
    weight_level: menu.weight_level ?? inferWeightLevel(name),
  }
}

// 작업지시서 14장: 주간 단백질 집계는 main1/main2(진짜 "메인" 두 자리)만 센다 — 반찬·국·밥에
// 섞인 단백질까지 합치면 채소/기타 비중만 커져서 통계가 의미 없어진다.
export function tallyMealProtein(counts, mealResult) {
  if (!mealResult) return
  for (const role of ['main1', 'main2']) {
    const item = mealResult[role]
    if (!item) continue
    const type = getEffectiveTags(item).protein_type
    if (!type) continue
    counts[type] = (counts[type] || 0) + 1
  }
}

export function tallyItemProtein(counts, item) {
  if (!item) return
  const type = getEffectiveTags(item).protein_type
  if (!type) return
  counts[type] = (counts[type] || 0) + 1
}

export function scoreCandidate({ candidate, role, mealSoFar, dayMealsSoFar, weekProteinCounts, excludedIds }) {
  const candidateTags = getEffectiveTags(candidate)
  let score = QUALITY_BASE_SCORE
  const reasons = []

  if (excludedIds?.has(candidate.id)) {
    score -= PENALTY_DEDUP_14DAY
    reasons.push('14일 이내 사용됨')
  }

  const compat = evaluateCompatibility({ candidateTags, role, mealSoFar, dayMealsSoFar, weekProteinCounts, getTags: getEffectiveTags })
  score += compat.scoreDelta
  reasons.push(...compat.reasons)

  if (candidate.source === 'NEIS' && (candidate.source_count ?? 0) >= NEIS_POPULAR_SOURCE_COUNT_THRESHOLD) {
    score += BONUS_NEIS_POPULAR
  }
  if (candidate.source === 'ADMIN') {
    score += BONUS_ADMIN_SOURCE
  }
  if (candidate.cost_verified === false) {
    reasons.push('원가 미등록')
  }

  return { item: candidate, score, reasons }
}

// --- 작업지시서 15·16장: 완성된 끼니를 사후 평가해서 UI에 보여줄 0~100 점수와 경고 문구를 만든다. ---

function scoreToLabel(score) {
  if (score >= QUALITY_LABEL_THRESHOLDS.GOOD) return '좋음'
  if (score >= QUALITY_LABEL_THRESHOLDS.FAIR) return '보통'
  return '주의'
}

function flattenMeal(mealResult) {
  if (!mealResult) return []
  return [mealResult.rice, mealResult.soupOrStew, mealResult.main1, mealResult.main2, mealResult.kimchi, ...(mealResult.sides || [])].filter(Boolean)
}

export function scoreMealQuality(mealResult) {
  if (!mealResult) return null
  const items = flattenMeal(mealResult).map((item) => ({ item, tags: getEffectiveTags(item) }))
  const warnings = []

  // 육류 다양성: main1/main2가 서로 다른 단백질이면 만점에 가깝게.
  const mainProteins = ['main1', 'main2'].map((r) => mealResult[r] && getEffectiveTags(mealResult[r]).protein_type).filter(Boolean)
  const proteinDiversity = mainProteins.length < 2 || mainProteins[0] !== mainProteins[1] ? 100 : 55
  if (mainProteins.length === 2 && mainProteins[0] === mainProteins[1]) {
    warnings.push(`⚠ ${mainProteins[0] === 'PORK' ? '돼지고기' : mainProteins[0] === 'CHICKEN' ? '닭고기' : mainProteins[0] === 'BEEF' ? '소고기' : '같은 종류의'} 메뉴가 중복됩니다.`)
  }

  // 조리법 다양성: 전체 요리 수 대비 서로 다른 조리법 수의 비율.
  const methods = items.map(({ tags }) => tags.cooking_method).filter(Boolean)
  const uniqueMethods = new Set(methods).size
  const cookingMethodDiversity = methods.length === 0 ? 100 : Math.round((uniqueMethods / methods.length) * 100)
  const methodCounts = {}
  for (const m of methods) methodCounts[m] = (methodCounts[m] || 0) + 1
  const dominantMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]
  if (dominantMethod && dominantMethod[1] >= 3) {
    warnings.push(`⚠ ${dominantMethod[0]}요리가 많습니다.`)
  }

  // 매운맛 균형: 매운 메뉴 개수가 기준 미만이면 만점, 초과하면 개수에 비례해 감점.
  const hotCount = items.filter(({ tags }) => tags.spicy_level >= SPICY_HOT_LEVEL).length
  const spicyBalance = hotCount < SPICY_OVERLOAD_THRESHOLD_COUNT ? 100 : Math.max(40, 100 - (hotCount - SPICY_OVERLOAD_THRESHOLD_COUNT + 1) * 20)
  if (hotCount >= SPICY_OVERLOAD_THRESHOLD_COUNT) warnings.push('⚠ 매운 메뉴가 많습니다.')

  // 색상 균형: OTHER를 뺀 색상 종류 수.
  const colors = items.map(({ tags }) => tags.color_group).filter((c) => c && c !== 'OTHER')
  const uniqueColors = new Set(colors).size
  const colorCounts = {}
  for (const c of colors) colorCounts[c] = (colorCounts[c] || 0) + 1
  const dominantColorCount = Math.max(0, ...Object.values(colorCounts))
  const colorBalance = colors.length === 0 ? 70 : dominantColorCount >= COLOR_REPEAT_THRESHOLD_COUNT ? 55 : Math.min(100, 60 + uniqueColors * 15)

  // 무게감: 무거운 메뉴 개수가 기준 미만이면 만점.
  const heavyCount = items.filter(({ tags }) => tags.weight_level >= WEIGHT_HEAVY_LEVEL).length
  const weightBalance = heavyCount < WEIGHT_OVERLOAD_THRESHOLD_COUNT ? 100 : 60

  // 원가 적합도: 원가 미등록 비율이 낮을수록 높은 점수(계산 자체는 비용 수치를 쓰지 않는다 —
  // "싼 게 좋은 식단"이 되지 않도록 costOptimize.js의 목표원가 로직과는 별개로 둔다).
  const unverifiedCostCount = items.filter(({ item }) => item.cost_verified === false).length
  const costFit = items.length === 0 ? 100 : Math.max(50, 100 - Math.round((unverifiedCostCount / items.length) * 100))
  if (unverifiedCostCount > 0) warnings.push('⚠ 원가정보가 없는 메뉴가 포함되었습니다.')

  const overall = Math.round(
    proteinDiversity * 0.25 + cookingMethodDiversity * 0.2 + spicyBalance * 0.2 + colorBalance * 0.15 + weightBalance * 0.1 + costFit * 0.1
  )

  return {
    overall,
    label: scoreToLabel(overall),
    breakdown: {
      proteinDiversity,
      cookingMethodDiversity,
      spicyBalance,
      colorBalance,
      weightBalance,
      costFit,
    },
    warnings,
  }
}
