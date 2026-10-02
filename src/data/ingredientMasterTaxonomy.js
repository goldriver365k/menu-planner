// 식재료 마스터 DB 전용 분류 체계. 기존 data/ingredientTaxonomy.js(레시피 원가 계산에 쓰이는
// INGREDIENT_CATEGORIES 등)와는 별개의 새 체계다 — 기존 파일/데이터는 건드리지 않는다.

export const INGREDIENT_MASTER_CATEGORIES = [
  'GRAIN', 'MEAT', 'POULTRY', 'SEAFOOD', 'VEGETABLE', 'FRUIT',
  'DAIRY', 'EGG', 'SEASONING', 'SAUCE', 'PROCESSED', 'FROZEN', 'OTHER',
]

export const INGREDIENT_MASTER_CATEGORY_LABELS = {
  GRAIN: '곡류',
  MEAT: '육류',
  POULTRY: '가금류',
  SEAFOOD: '수산물',
  VEGETABLE: '채소',
  FRUIT: '과일',
  DAIRY: '유제품',
  EGG: '난류',
  SEASONING: '양념/조미료',
  SAUCE: '소스',
  PROCESSED: '가공식품',
  FROZEN: '냉동식품',
  OTHER: '기타',
}

// 식재료 마스터 레코드 형태 (참고용 주석). 향후 레시피·원가 계산 단계에서 그대로 쓸 수 있도록
// 필드를 구매 정보(구매단위/구매수량/구매가)와 수율(usable_yield) 중심으로 둔다.
// {
//   id: 'IM0001',
//   name: '돼지고기(앞다리살)',
//   category: 'MEAT',
//   purchase_unit: 'kg',
//   purchase_quantity: 1,        // 위 단위로 한 번에 구매하는 수량(예: 1kg 단위 구매)
//   purchase_price: 11500,       // 그 구매수량 전체에 대한 가격(원)
//   usable_yield: 100,           // 수율(%) — 손질/손실을 뺀 실제 사용 가능 비율. 기본 100(손실 없음)
//   price_source: '관리자 입력',
//   updated_at: '2026-08-31',
//   active: true,
// }
