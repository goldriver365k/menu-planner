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
export const ALLERGEN_LABELS = {
  PORK: '돼지고기', BEEF: '소고기', CHICKEN: '닭고기',
  SHRIMP: '새우', SQUID: '오징어',
  FISH: '생선', EGG: '난류', SOY: '대두', MILK: '우유', WHEAT: '밀',
}

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

// MENU 항목 하나의 데이터 형태 (24장). 실제 값은 menuDatabase.js가 제공하며,
// 이 주석은 필드 목록을 코드 상에서 문서화하기 위한 참고용이다.
//
// {
//   id: 'M0001',
//   name: '제육볶음',
//   category: 'MAIN_1',
//   subcategory: 'PORK',
//   main_ingredient: '돼지고기',
//   cooking_method: '볶음',
//   cost_per_serving: 1150,
//   calories: 385,
//   protein: number,
//   carbohydrate: number,
//   fat: number,
//   allergens: ['PORK', 'SOY', 'WHEAT'],
//   active: true,
//   created_at: '2026-08-28',
// }
