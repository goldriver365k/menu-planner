// 메뉴 카테고리 체계 — 작업지시서 6~10장 기준.
// 실제 메뉴 생성 로직(STEP 3~4)에서도 이 상수를 그대로 재사용한다.

export const CATEGORIES = ['RICE', 'SOUP', 'STEW', 'MAIN_1', 'MAIN_2', 'SIDE', 'KIMCHI']

export const CATEGORY_LABELS = {
  RICE: '밥',
  SOUP: '국/탕',
  STEW: '찌개',
  MAIN_1: '1차 메인(육류)',
  MAIN_2: '2차 메인',
  SIDE: '반찬',
  KIMCHI: '김치',
  // NEIS 가져오기(STEP 14) 전용 상태 — 키워드 분류에 실패한 메뉴가 임시로 머무는 카테고리.
  // CATEGORIES(관리자 메뉴 추가/수정 폼, 필터 드롭다운)에는 일부러 포함하지 않는다 —
  // 관리자가 새 메뉴를 '미분류'로 직접 만들 일은 없고, 오직 가져오기 파이프라인만 이 값을
  // 매긴다. 분류는 반드시 관리자 > 미분류 메뉴 화면에서 정식 카테고리로 재지정한다.
  UNCLASSIFIED: '미분류',
}

// 1차 메인 — 반드시 세 카테고리로만 분류 (7장)
export const MAIN_1_SUBCATEGORIES = ['BEEF', 'PORK', 'CHICKEN']
export const MAIN_1_SUBCATEGORY_LABELS = {
  BEEF: '소고기',
  PORK: '돼지고기',
  CHICKEN: '닭고기',
}

// 2차 메인 (8장)
export const MAIN_2_SUBCATEGORIES = ['FISH', 'FRIED']
export const MAIN_2_SUBCATEGORY_LABELS = {
  FISH: '생선류',
  FRIED: '튀김류',
}

// 반찬 카테고리 (9장)
export const SIDE_SUBCATEGORIES = [
  'STIRFRY', 'BRAISED', 'NAMUL', 'MUCHIM', 'JEON', 'EGG', 'TOFU', 'NOODLE', 'PICKLE', 'ETC',
]
export const SIDE_SUBCATEGORY_LABELS = {
  STIRFRY: '볶음',
  BRAISED: '조림',
  NAMUL: '나물',
  MUCHIM: '무침',
  JEON: '전',
  EGG: '계란',
  TOFU: '두부',
  NOODLE: '면/잡채',
  PICKLE: '절임',
  ETC: '기타',
}

// 알레르기 표시 라벨 (27장 — MVP에서는 메뉴에 직접 저장, 추후 RECIPE/INGREDIENT 연동)
// NEIS 가져오기(STEP 14)에서 식약처 표준 19개 알레르기 항목을 모두 받아오면서
// 기존 10개 코드에 없던 항목(메밀/땅콩/게/복숭아/토마토/아황산류/호두/조개류/잣)을 추가했다.
// 기존에 저장된 메뉴의 allergens 배열은 그대로 유효하다 — 추가만 했을 뿐 기존 키는 바꾸지 않았다.
export const ALLERGEN_LABELS = {
  PORK: '돼지고기', BEEF: '소고기', CHICKEN: '닭고기',
  SHRIMP: '새우', SQUID: '오징어',
  FISH: '생선', EGG: '난류', SOY: '대두', MILK: '우유', WHEAT: '밀',
  BUCKWHEAT: '메밀', PEANUT: '땅콩', CRAB: '게', PEACH: '복숭아',
  TOMATO: '토마토', SULFITE: '아황산류', WALNUT: '호두', SHELLFISH: '조개류', PINENUT: '잣',
}

// NEIS 식단정보 API가 메뉴명 뒤 괄호 안에 숫자로 표기하는 식약처 표준 19개 알레르기 코드를
// 위 ALLERGEN_LABELS 키로 변환하기 위한 맵 (menuImport/extractDishNames.js에서 사용).
// 7번(고등어)은 전용 코드가 없어 일반 FISH로, 18번(조개류)은 굴·전복·홍합을 포괄하는
// 넓은 분류라 SHELLFISH로 근사한다 — 세부 식재료 수준의 정확한 매핑은 이후 RECIPE/INGREDIENT
// 연동 단계에서 다룬다.
export const NEIS_ALLERGEN_CODE_MAP = {
  1: 'EGG', 2: 'MILK', 3: 'BUCKWHEAT', 4: 'PEANUT', 5: 'SOY', 6: 'WHEAT',
  7: 'FISH', 8: 'CRAB', 9: 'SHRIMP', 10: 'PORK', 11: 'PEACH', 12: 'TOMATO',
  13: 'SULFITE', 14: 'WALNUT', 15: 'CHICKEN', 16: 'BEEF', 17: 'SQUID',
  18: 'SHELLFISH', 19: 'PINENUT',
}

// 메뉴 태그 구조(STEP 14 작업지시서 9장)의 선택지 상수.
export const PROTEIN_TYPES = ['BEEF', 'PORK', 'CHICKEN', 'FISH', 'SEAFOOD', 'EGG', 'TOFU', 'VEGETABLE', 'OTHER']
export const PROTEIN_TYPE_LABELS = {
  BEEF: '소고기', PORK: '돼지고기', CHICKEN: '닭고기', FISH: '생선', SEAFOOD: '수산물',
  EGG: '계란', TOFU: '두부', VEGETABLE: '채소', OTHER: '기타',
}

export const COOKING_METHODS = ['볶음', '구이', '튀김', '조림', '찜', '무침', '끓임', '전', '절임']

// 0=안 매움 · 1=약간 매움 · 2=매움 · 3=매우 매움
export const SPICY_LEVEL_LABELS = { 0: '안 매움', 1: '약간 매움', 2: '매움', 3: '매우 매움' }

// STEP 15(식단 품질 엔진) 작업지시서 8장: 색상 균형 판단용 분류.
export const COLOR_GROUPS = ['RED', 'GREEN', 'WHITE', 'BROWN', 'YELLOW', 'OTHER']
export const COLOR_GROUP_LABELS = {
  RED: '빨강', GREEN: '초록', WHITE: '흰색', BROWN: '갈색', YELLOW: '노랑', OTHER: '기타',
}

// 작업지시서 9장: 1=가벼움 · 2=보통 · 3=무거움
export const WEIGHT_LEVEL_LABELS = { 1: '가벼움', 2: '보통', 3: '무거움' }

// 메뉴 데이터 출처 — menuDatabase.js의 모든 메뉴가 이 중 하나를 가진다 (STEP 14 작업지시서 13장).
export const MENU_SOURCES = ['SEED', 'NEIS', 'ADMIN']
export const MENU_SOURCE_LABELS = { SEED: '초기 테스트 DB', NEIS: 'NEIS 급식 데이터', ADMIN: '관리자 직접 등록' }

// 작업지시서 31장 최소 수량 기준 (테스트 DB 검증용)
export const MIN_COUNTS = {
  RICE: 10,
  SOUP: 30,
  STEW: 20,
  'MAIN_1:BEEF': 30,
  'MAIN_1:PORK': 40,
  'MAIN_1:CHICKEN': 30,
  'MAIN_2:FISH': 40,
  'MAIN_2:FRIED': 30,
  SIDE: 150,
  KIMCHI: 30,
}

// MENU 항목 하나의 데이터 형태 (24장, STEP 14에서 출처/검증 플래그/태그 필드 확장).
// 실제 값은 menuDatabase.js가 제공하며, 이 주석은 필드 목록을 코드 상에서 문서화하기
// 위한 참고용이다. source가 'NEIS'인 메뉴는 cost_per_serving/영양정보가 검증되지 않았을
// 수 있으므로 cost_verified/nutrition_verified를 항상 함께 확인해야 한다.
//
// {
//   id: 'M0001',
//   name: '제육볶음',
//   category: 'MAIN_1',           // 분류 실패 시 'UNCLASSIFIED'
//   subcategory: 'PORK',
//   main_ingredient: '돼지고기',
//   cooking_method: '볶음',
//   cost_per_serving: 1150,       // 검증 안 된 NEIS 메뉴는 null
//   cost_verified: true,          // false면 UI에 "원가 미등록" 표시
//   calories: 385,
//   protein: number,
//   carbohydrate: number,
//   fat: number,
//   nutrition_verified: true,     // false면 NEIS에서 가져온 뒤 아직 확인 안 된 값
//   allergens: ['PORK', 'SOY', 'WHEAT'],
//   active: true,
//   created_at: '2026-08-28',
//   source: 'SEED',               // 'SEED' | 'NEIS' | 'ADMIN' — 없으면 'SEED'로 취급
//   source_count: 1,              // NEIS에서 동일 메뉴가 발견된 급식 식단 수
//   possibleDuplicate: false,     // true면 기존 메뉴와 유사해 수동 통합이 필요할 수 있음
//   possibleDuplicateOf: null,    // 유사하다고 판단된 기존 메뉴 id (있을 때만)
//   protein_type: '',             // PROTEIN_TYPES 중 하나 — 비어 있으면 식단 품질 엔진이
//                                  // 이름 키워드로 추정해서 사용한다(logic/menuScoring.js)
//   spicy_level: 0,               // 0~3
//   color_group: '',              // 비어 있으면 마찬가지로 이름에서 추정
//   weight_level: null,           // 1=가벼움 2=보통 3=무거움 — 모르면 null, 추정값으로 대체
//   season: [],
//   meal_type: [],
// }
