// STEP 14 작업지시서 6장: 메뉴명 정규화.
// 같은 음식이 표기만 달라서(별표, 괄호 안 학교 자체 표시, 배식 안내, 공백 등) 여러 건으로
// 중복 저장되지 않도록 불필요한 장식/안내 문구만 제거한다. 조리법이나 맛을 나타내는 실제
// 단어("직화제육볶음", "고추장돼지불고기", "간장돼지불고기" 등)는 절대 지우지 않는다 — 괄호
// 안 내용도 아래 FILLER_BRACKET_KEYWORDS에 해당할 때만 지우고, 그 외에는 그대로 둔다.

const DECORATIVE_SYMBOLS_RE = /[★☆●○◎◆◇▶▷■□♥♡✿※#]/g
const LEADING_TRAILING_PUNCT_RE = /^[\s·∙•\-~!,.]+|[\s·∙•\-~!,.]+$/g
const MULTI_SPACE_RE = /\s{2,}/g

// 괄호 안 내용이 이 단어들 중 하나를 "포함"하면(= 음식 자체의 설명이 아니라 안내/표시성
// 문구로 판단) 괄호 전체를 지운다. 실제 조리법/재료 단어는 여기 없다 — 아래 리스트는
// "원산지 표기", "행사/이벤트 안내", "배식·운영 안내", "브랜드/학교 자체 표시"류로만 한정.
const FILLER_BRACKET_KEYWORDS = [
  '국내산', '수입산', '원산지', '원산지표시', '유전자변형', 'GMO', 'HACCP',
  '행사', '이벤트', '기념일', '오늘의', '특선', '신메뉴', '한끼제안',
  '단체급식', '교내', '학교자체', '자율배식', '셀프', '서비스', '무료제공', '무상급식',
  '브랜드', '협찬', '후원',
]

function stripFillerBrackets(text) {
  return text.replace(/[([]([^()[\]]*)[)\]]/g, (whole, inner) => {
    const trimmedInner = inner.trim()
    if (!trimmedInner) return '' // 빈 괄호
    if (/^[\d.\s]+$/.test(trimmedInner)) return '' // 순수 숫자/점(이미 추출된 알레르기 잔여물 등)
    const isFiller = FILLER_BRACKET_KEYWORDS.some((kw) => trimmedInner.includes(kw))
    return isFiller ? '' : whole
  })
}

export function normalizeMenuName(rawName) {
  if (!rawName) return ''
  let name = rawName
  name = stripFillerBrackets(name)
  name = name.replace(DECORATIVE_SYMBOLS_RE, ' ')
  name = name.replace(MULTI_SPACE_RE, ' ')
  name = name.replace(LEADING_TRAILING_PUNCT_RE, '')
  name = name.trim()
  return name
}

// 중복 비교 전용 키 — 표시용 normalizeMenuName 결과와 달리 공백/가운뎃점까지 모두 지워
// "소갈비 찜" vs "소갈비찜" 같은 사소한 공백 차이도 같은 메뉴로 인식하게 한다.
// 실제로 저장/표시하는 이름에는 사용하지 않는다(가독성 보존).
export function canonicalizeForDedup(normalizedName) {
  return normalizedName.replace(/[\s·∙]/g, '').toLowerCase()
}
