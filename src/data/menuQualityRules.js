// STEP 15 작업지시서 10장: 식단 품질 점수 계산에 쓰는 모든 숫자를 한 곳에 모은다.
// 코드 곳곳에 점수를 하드코딩하지 않고, 조정이 필요하면 이 파일만 고치면 되게 한다.

// 모든 후보 메뉴는 이 기본점수에서 시작해 아래 가점/감점을 더한다.
export const QUALITY_BASE_SCORE = 100

// --- 절대규칙에 가깝지만 "완전 금지"는 아닌 것 (작업지시서 11장: 후보가 부족하면 완화) ---
// 14일 이내 사용된 메뉴 — 점수를 크게 깎아 사실상 마지막 순위로 밀어내되, 다른 후보가
// 전혀 없을 때는 그래도 선택될 수 있게 "하드 필터"가 아니라 "큰 감점"으로 처리한다.
// 이렇게 하면 "후보가 하나도 안 남아 생성이 실패하는" 상황 자체가 구조적으로 생기지 않는다.
export const PENALTY_DEDUP_14DAY = 100

// --- 선호규칙 감점 (작업지시서 4~9장) ---
export const PENALTY_PROTEIN_REPEAT_SAME_MEAL = 25 // 같은 끼니 안에서 육류(주단백질) 반복
export const PENALTY_COOKING_METHOD_REPEAT_SAME_MEAL = 15 // 같은 끼니 안에서 조리법 반복(요리당 1회씩 누적)
export const PENALTY_SPICY_OVERLOAD = 20 // 매운 메뉴(spicy_level >= SPICY_HOT_LEVEL)가 과다할 때
export const PENALTY_COLOR_REPEAT = 10 // 같은 색상 계열이 반복될 때(요리당 1회씩 누적)
export const PENALTY_WEIGHT_OVERLOAD = 10 // 무거운 메뉴(weight_level >= 3)가 과다할 때
export const PENALTY_SOUP_MAIN_MISMATCH = 20 // 국/찌개와 메인 궁합이 나쁠 때
export const BONUS_SOUP_MAIN_GOOD_MATCH = 10 // 국/찌개와 메인 궁합이 좋을 때
export const PENALTY_PROTEIN_REPEAT_RECENT_DAY = 10 // 오늘 앞선 끼니와 같은 육류 반복(작업지시서 13장)
export const PENALTY_COOKING_METHOD_REPEAT_RECENT_DAY = 5 // 오늘 앞선 끼니와 같은 조리법까지 겹치면 추가 감점
export const PENALTY_WEEKLY_PROTEIN_OVERLOAD = 10 // 주간 단백질 편중(작업지시서 14장)
export const PENALTY_HEAVY_DAY_OVERLOAD = 10 // 오늘 앞선 끼니들이 이미 무거웠는데 또 무거운 메뉴

// --- 출처/인기도 가점 (작업지시서 10장) ---
export const BONUS_NEIS_POPULAR = 5 // NEIS에서 자주 발견된(사용빈도 높은) 메뉴
export const BONUS_ADMIN_SOURCE = 5 // 관리자가 직접 등록한 메뉴(검증된 데이터로 간주)
export const NEIS_POPULAR_SOURCE_COUNT_THRESHOLD = 10 // 이 값 이상 발견되면 "사용빈도 높음"

// --- 판단 기준값 ---
export const SPICY_HOT_LEVEL = 2 // 이 값 이상이면 "매운 메뉴"로 간주
export const SPICY_OVERLOAD_THRESHOLD_COUNT = 2 // 한 끼에 매운 메뉴가 이 개수 이상이면 과다
export const WEIGHT_HEAVY_LEVEL = 3 // 이 값이면 "무거운 메뉴"로 간주
export const WEIGHT_OVERLOAD_THRESHOLD_COUNT = 3 // 한 끼에 무거운 메뉴가 이 개수 이상이면 과다
export const COLOR_REPEAT_THRESHOLD_COUNT = 3 // 한 끼에 같은 색상이 이 개수 이상이면 반복으로 간주
export const HEAVY_DAY_AVERAGE_THRESHOLD = 2.3 // 끼니 평균 weight_level이 이 값 이상이면 "무거운 끼니"
export const WEEKLY_PROTEIN_OVERLOAD_RATIO = 0.4 // 주간 특정 단백질 비중이 이 비율을 넘으면 감점 시작

// --- 후보군 선정(작업지시서 12장: 항상 같은 식단만 나오지 않도록) ---
export const CANDIDATE_POOL_SIZE = 5 // 상위 몇 개 후보 중에서 무작위 선택
export const CANDIDATE_SCORE_MARGIN = 10 // 최고점에서 이 점수 이내인 후보까지 포함

// 끼니 품질 UI(작업지시서 15장)의 0~100 세부 점수를 "좋음/보통/주의" 같은 문구로 바꿀 때 쓰는 기준.
export const QUALITY_LABEL_THRESHOLDS = { GOOD: 80, FAIR: 60 }

// 육류(주단백질) 궁합 판단에 포함할 역할 — 반찬 하나하나의 미량 단백질까지 보면 너무
// 예민해지므로 "끼니의 성격을 정하는" 세 역할만 본다(menuCompatibility.js/menuScoring.js 공용).
export const PROTEIN_SCORED_ROLES = ['main1', 'main2', 'soupOrStew']
export function isMainRole(role) {
  return role === 'main1' || role === 'main2'
}
