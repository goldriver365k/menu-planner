// 한식뷔페 주간 식단 자동구성 — 공통 상수 및 기본 데이터 구조
//
// 이 파일은 STEP 2 이후(메뉴 DB, 식재료 DB, 원가 계산 등)에도 그대로 재사용될
// 기준 상수와 "기본 설정" 데이터의 형태(shape)를 정의한다.
// STEP 1에서는 이 구조를 기반으로 입력값만 수집하고, 실제 메뉴 생성 로직은
// 다루지 않는다.

// 요일 (월요일 시작 고정, 운영 여부는 요일별 on/off)
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const DAY_LABELS = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
}

// 하루 세 끼 (향후 끼니 추가 확장을 고려해 배열 + 라벨 맵 형태 유지)
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

export const MEAL_LABELS = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}

// 반찬 개수 선택 범위 (2~8개)
export const SIDE_DISH_MIN = 2
export const SIDE_DISH_MAX = 8
export const SIDE_DISH_DEFAULT = 4

// 목표 원가율 기본값 (%)
export const DEFAULT_TARGET_COST_RATE = 35

// 다가오는 월요일 날짜(YYYY-MM-DD)를 계산한다.
// 14일 중복 검사(STEP 5)는 실제 날짜가 있어야 하므로, 주간 시작일의 기본값으로 사용한다.
export function getNextMondayISO(from = new Date()) {
  const date = new Date(from)
  const day = date.getDay() // 0=일 ... 1=월
  const diff = day === 1 ? 0 : ((8 - day) % 7 || 7)
  date.setDate(date.getDate() + diff)
  return date.toISOString().slice(0, 10)
}

// 끼니 하나의 기본 입력값
function createDefaultMealSetting() {
  return {
    isActive: true,
    expectedCount: '', // 예상 식수 (명)
    pricePerServing: '', // 1인 판매금액 (원)
    sideDishCount: SIDE_DISH_DEFAULT,
  }
}

// 전체 주간 계획의 "기본 설정" 데이터 형태.
// STEP 5 이후 메뉴 목록, 사용 이력 등은 별도 구조(MENU_HISTORY 등)로 분리해
// 이 객체에 섞이지 않도록 한다.
export function createDefaultPlanSettings() {
  return {
    weekStartDate: getNextMondayISO(), // 이번에 생성할 주의 월요일 날짜
    operatingDays: DAYS.reduce((acc, day) => {
      acc[day] = true
      return acc
    }, {}),
    meals: MEAL_TYPES.reduce((acc, meal) => {
      acc[meal] = createDefaultMealSetting()
      return acc
    }, {}),
    costRate: {
      // 전체 공통 목표 원가율. 식사별로 다른 원가율을 쓰고 싶을 때는
      // overrides[mealType]에 숫자를 넣는다 (STEP 7에서 실제로 사용).
      global: DEFAULT_TARGET_COST_RATE,
      overrides: {
        breakfast: null,
        lunch: null,
        dinner: null,
      },
    },
  }
}
