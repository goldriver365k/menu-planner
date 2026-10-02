// STEP 14 작업지시서 8·9장: 메뉴명을 키워드 기반으로 1차 분류한다.
// 완벽한 분류기가 아니다 — 확실하지 않으면 UNCLASSIFIED로 남겨 관리자가 "미분류 메뉴"
// 화면에서 직접 정식 카테고리를 지정하도록 한다(작업지시서 8·12장 원칙).
//
// 분류 우선순위가 중요하다: "탕수육"/"닭볶음탕"처럼 글자 그대로 보면 SOUP/STEW 키워드
// (탕)를 포함하지만 실제로는 메인 요리인 단어들이 있어, 이런 예외는 범용 키워드 검사보다
// 먼저 확인한다(강한 매칭 → 범용 키워드 순).
//
// MAIN_1(1차 메인)의 서브카테고리는 기존 스키마(menuTaxonomy.js MAIN_1_SUBCATEGORIES)가
// BEEF/PORK/CHICKEN 세 가지로 고정되어 있다. 작업지시서 8장 예시에는 "생선구이"가 MAIN_1
// 예시로 들어 있지만, 생선은 MAIN_1에 대응하는 서브카테고리가 없어 그대로 넣으면 기존 관리자
// 폼(MAIN_1 서브카테고리 드롭다운에 FISH 옵션이 없음)과 충돌한다. 기존 스키마가 이미
// MAIN_2:FISH(생선류)를 전용으로 두고 있으므로, 생선 단백질 메인은 거기로 분류한다 —
// "현재 프로젝트 카테고리를 유지한다"는 원칙을 "예시 문구 그대로"보다 우선했다.

const PROTEIN_RULES = [
  { type: 'BEEF', keywords: ['소고기', '쇠고기', '한우', '소불고기', '소갈비', '너비아니', '떡갈비'] },
  { type: 'PORK', keywords: ['돼지고기', '돈육', '제육', '돈까스', '돈가스', '삼겹', '항정', '보쌈', '수육', '돈사태', '돈갈비'] },
  { type: 'CHICKEN', keywords: ['닭', '치킨', '계육'] },
  { type: 'FISH', keywords: ['고등어', '갈치', '조기', '삼치', '동태', '코다리', '명태', '임연수', '가자미', '연어', '생선'] },
  { type: 'SEAFOOD', keywords: ['새우', '오징어', '낙지', '굴', '조개', '홍합', '문어', '주꾸미'] },
  { type: 'EGG', keywords: ['계란', '달걀'] },
  { type: 'TOFU', keywords: ['두부', '순두부'] },
]

function inferProteinType(name) {
  for (const rule of PROTEIN_RULES) {
    if (rule.keywords.some((kw) => name.includes(kw))) return rule.type
  }
  if (['나물', '무침', '샐러드', '김치', '장아찌', '채소', '야채'].some((kw) => name.includes(kw))) return 'VEGETABLE'
  return 'OTHER'
}

const COOKING_METHOD_KEYWORDS = ['볶음', '구이', '튀김', '조림', '찜', '무침', '끓임', '전', '절임']
function inferCookingMethod(name) {
  return COOKING_METHOD_KEYWORDS.find((kw) => name.includes(kw)) || ''
}

const SPICY_STRONG_KEYWORDS = ['마라', '불닭', '청양', '엽기']
const SPICY_MED_KEYWORDS = ['매운', '매콤', '고추장', '얼큰', '칼칼']
const SPICY_MILD_KEYWORDS = ['고춧가루']
function inferSpicyLevel(name) {
  if (SPICY_STRONG_KEYWORDS.some((kw) => name.includes(kw))) return 3
  if (SPICY_MED_KEYWORDS.some((kw) => name.includes(kw))) return 2
  if (SPICY_MILD_KEYWORDS.some((kw) => name.includes(kw))) return 1
  return 0
}

// 강한 매칭(이름만 보면 글자 그대로는 SOUP/STEW 키워드(탕)를 포함하지만 실제로는 메인
// 요리인 단어들) — 범용 키워드 검사보다 먼저 확인한다. 각 항목은 단백질 키워드가 따로
// 없을 때(예: "불고기"만 단독으로 쓰인 경우) 적용할 기본 서브카테고리를 함께 들고 있다 —
// "불고기"는 수식어가 없으면 관례적으로 소고기 요리를 가리키므로 BEEF를 기본값으로 쓴다.
const MAIN_1_STRONG_MATCHES = [
  { re: /돼지갈비찜|돈갈비찜/, fallback: 'PORK' },
  { re: /소갈비찜|갈비찜|장조림찜/, fallback: 'BEEF' },
  { re: /탕수육|돈가스|돈까스|제육볶음|보쌈|수육|폭립/, fallback: 'PORK' },
  { re: /닭갈비|찜닭|닭강정|닭튀김|양념치킨|프라이드치킨|닭볶음탕/, fallback: 'CHICKEN' },
  { re: /떡갈비|함박스테이크/, fallback: 'BEEF' },
  { re: /불고기/, fallback: 'BEEF' },
]
const MAIN_2_FISH_STRONG_RE = /생선구이|생선조림|생선튀김/

const KIMCHI_BLOCKER_RE = /찌개|볶음밥|전$|만두|국$|탕$|덮밥/
const KIMCHI_NAME_RE = /김치$|깍두기$|석박지$|총각김치$|열무김치$|동치미$|겉절이$/

const RICE_KEYWORDS = ['비빔밥', '볶음밥', '영양밥', '잡곡밥', '주먹밥', '김밥', '오곡밥', '흑미밥', '현미밥', '쌀밥', '보리밥', '찰밥', '콩나물밥', '카레라이스']
const STEW_KEYWORDS = ['찌개', '전골']
const SOUP_KEYWORDS = ['국', '탕', '육개장']
const MAIN_2_KEYWORDS = ['계란말이', '계란찜', '계란후라이', '두부조림', '두부부침', '전', '잡채', '떡볶이', '소시지', '어묵볶음', '묵', '순대']
const SIDE_KEYWORDS = ['나물', '무침', '조림', '볶음', '샐러드', '장아찌', '젓갈', '튀김', '구이']

export function classifyMenu(normalizedName) {
  const name = normalizedName || ''
  const protein_type = inferProteinType(name)
  const cooking_method = inferCookingMethod(name)
  const spicy_level = inferSpicyLevel(name)
  const tags = { protein_type, cooking_method, spicy_level }

  for (const { re, fallback } of MAIN_1_STRONG_MATCHES) {
    if (re.test(name)) {
      const subcategory = ['BEEF', 'PORK', 'CHICKEN'].includes(protein_type) ? protein_type : fallback
      return { category: 'MAIN_1', subcategory, ...tags }
    }
  }
  if (MAIN_2_FISH_STRONG_RE.test(name)) {
    return { category: 'MAIN_2', subcategory: 'FISH', ...tags }
  }

  // 덮밥은 단백질 키워드가 있으면 메인 요리에 가깝다고 보고 MAIN_1로, 없으면 밥류로 본다.
  if (name.includes('덮밥')) {
    if (['BEEF', 'PORK', 'CHICKEN'].includes(protein_type)) {
      return { category: 'MAIN_1', subcategory: protein_type, ...tags }
    }
    return { category: 'RICE', subcategory: null, ...tags }
  }

  if (!KIMCHI_BLOCKER_RE.test(name) && (KIMCHI_NAME_RE.test(name) || name.includes('김치'))) {
    return { category: 'KIMCHI', subcategory: null, ...tags }
  }

  if (RICE_KEYWORDS.some((kw) => name.includes(kw)) || /밥$/.test(name)) {
    return { category: 'RICE', subcategory: null, ...tags }
  }

  if (STEW_KEYWORDS.some((kw) => name.includes(kw))) {
    return { category: 'STEW', subcategory: null, ...tags }
  }

  if (SOUP_KEYWORDS.some((kw) => name.includes(kw) || name.endsWith(kw))) {
    return { category: 'SOUP', subcategory: null, ...tags }
  }

  if (['BEEF', 'PORK', 'CHICKEN'].includes(protein_type) && cooking_method) {
    // 단백질 + 조리법이 뚜렷한데 위의 강한 매칭/범용 키워드에 걸리지 않은 경우(예: "돼지고기김치찜"),
    // 일반 반찬이라기엔 비중이 크다고 보고 1차 메인으로 분류한다.
    return { category: 'MAIN_1', subcategory: protein_type, ...tags }
  }

  if (protein_type === 'FISH' && ['구이', '조림', '찜', '튀김'].includes(cooking_method)) {
    // "고등어조림", "갈치구이"처럼 STRONG_MATCHES 목록에 미처 다 올리지 못한 생선 요리도
    // 단백질+조리법 조합이 뚜렷하면 반찬이 아니라 2차 메인(생선류)으로 분류한다.
    return { category: 'MAIN_2', subcategory: 'FISH', ...tags }
  }

  if (MAIN_2_KEYWORDS.some((kw) => name.includes(kw))) {
    return { category: 'MAIN_2', subcategory: null, ...tags }
  }

  if (SIDE_KEYWORDS.some((kw) => name.includes(kw))) {
    return { category: 'SIDE', subcategory: null, ...tags }
  }

  return { category: 'UNCLASSIFIED', subcategory: null, ...tags }
}
