// INGREDIENT 분류 체계 (25장). 메뉴 카테고리와는 별개의 체계다.

export const INGREDIENT_CATEGORIES = [
  'MEAT', 'SEAFOOD', 'VEGETABLE', 'GRAIN', 'SEASONING', 'DAIRY', 'PROCESSED', 'ETC',
]

export const INGREDIENT_CATEGORY_LABELS = {
  MEAT: '육류',
  SEAFOOD: '수산물',
  VEGETABLE: '채소',
  GRAIN: '곡류',
  SEASONING: '양념/조미료',
  DAIRY: '유제품',
  PROCESSED: '가공식품',
  ETC: '기타',
}

// 구매 단위 — 자유 입력도 가능하지만 자주 쓰는 단위를 선택지로 제공한다.
export const PURCHASE_UNITS = ['g', 'kg', 'ml', 'L', '개', '봉지', '판']

// INGREDIENT 레코드 형태 (25장, 참고용 주석):
// {
//   id: 'I0001',
//   name: '돼지고기(앞다리살)',
//   category: 'MEAT',
//   purchase_unit: 'kg',
//   public_price: 12000,        // 공공 데이터 참고가 (STEP 12에서 API 연동 예정, 그전까지는 수기 입력)
//   purchase_price: 11500,      // 실제 구매가
//   calculation_price: 11.5,    // 레시피 계산 기준 단가 — g당 원 (구매단가를 1g 기준으로 환산한 값)
//   price_source: '관리자 입력',
//   price_updated_at: '2026-08-31',
//   calories_per_100g: 223,
//   protein: 17, carbohydrate: 0, fat: 17, sodium: 55,
//   allergens: ['PORK'],
// }
//
// calculation_price는 항상 "레시피 수량 단위 1단위당 원가"로 통일한다 (보통 g 또는 ml 기준).
// 레시피(RECIPE)의 quantity·unit이 이 기준과 다르면 자동 환산 없이 그대로 곱해지므로,
// 재료 등록 시 반드시 같은 단위 체계로 입력해야 한다 — 이 제약은 관리자 화면에 안내한다.
