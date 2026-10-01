// STEP 14 작업지시서 2·11장: NEIS 원본 급식 행(rows) → 메뉴명 추출 → 정규화 → 자동 분류 →
// 중복 제거 순서로 돌려 "미리보기" 결과(통계 + 신규 메뉴 후보 목록)를 만든다.
// 이 함수는 LocalStorage에 아무것도 쓰지 않는다 — 관리자가 결과를 확인하고 "신규 메뉴 DB에
// 추가"를 눌렀을 때만 menuDatabase.js의 bulkAddMenus()로 실제 저장한다(작업지시서 11장).

import { extractDishNames } from './extractDishNames'
import { normalizeMenuName } from './normalizeMenuName'
import { classifyMenu } from './classifyMenu'
import { dedupMenus } from './dedupMenus'
import { NEIS_ALLERGEN_CODE_MAP } from '../../data/menuTaxonomy'
import { getAllMenus } from '../../data/menuDatabase'

function mapAllergenCodes(codes) {
  const set = new Set()
  for (const code of codes) {
    const mapped = NEIS_ALLERGEN_CODE_MAP[code]
    if (mapped) set.add(mapped)
  }
  return Array.from(set)
}

// rows: NEIS mealServiceDietInfo API의 row 배열 (각 행에 DDISH_NM이 있다고 가정).
// existingMenus를 생략하면 현재 LocalStorage 메뉴 DB를 기준으로 중복을 판단한다.
export function runNeisImportPipeline(rows, { existingMenus } = {}) {
  const dbMenus = existingMenus || getAllMenus()
  const safeRows = Array.isArray(rows) ? rows : []

  let dishesFound = 0
  const rawCandidates = []

  for (const row of safeRows) {
    const dishes = extractDishNames(row?.DDISH_NM)
    dishesFound += dishes.length
    for (const dish of dishes) {
      const normalized = normalizeMenuName(dish.dishName)
      if (!normalized) continue
      const classification = classifyMenu(normalized)
      rawCandidates.push({
        name: normalized,
        category: classification.category,
        subcategory: classification.subcategory,
        protein_type: classification.protein_type,
        cooking_method: classification.cooking_method,
        spicy_level: classification.spicy_level,
        allergens: mapAllergenCodes(dish.allergenCodes),
      })
    }
  }

  const { newCandidates, duplicateCount, possibleDuplicateCount } = dedupMenus(rawCandidates, dbMenus)

  // menuDatabase.buildMenuRecord()가 기대하는 입력 형태로 맞춘다. 원가/영양은 NEIS에서
  // 검증할 수 없으므로 null/0 + *_verified:false로 남긴다(작업지시서 14·15장).
  const newMenuRecords = newCandidates.map((c) => ({
    name: c.name,
    category: c.category,
    subcategory: c.subcategory,
    main_ingredient: '',
    cooking_method: c.cooking_method,
    cost_per_serving: null,
    cost_verified: false,
    calories: 0,
    protein: 0,
    carbohydrate: 0,
    fat: 0,
    nutrition_verified: false,
    allergens: c.allergens,
    active: true,
    source: 'NEIS',
    source_count: c.source_count,
    possibleDuplicate: c.possibleDuplicate,
    possibleDuplicateOf: c.possibleDuplicateOf,
    protein_type: c.protein_type,
    spicy_level: c.spicy_level,
  }))

  const unclassifiedCount = newMenuRecords.filter((m) => m.category === 'UNCLASSIFIED').length

  return {
    stats: {
      mealsCollected: safeRows.length,
      dishesFound,
      afterDedup: newCandidates.length + duplicateCount,
      newMenus: newMenuRecords.length,
      duplicatesSkipped: duplicateCount,
      possibleDuplicates: possibleDuplicateCount,
      unclassified: unclassifiedCount,
    },
    newMenuRecords,
  }
}
