// STEP 14 작업지시서 5장: NEIS의 한 끼 식단(DDISH_NM, 여러 요리가 <br/>로 구분된 문자열)에서
// 개별 요리명을 분리한다.
//
// 예:
//   "쌀밥/흑미밥<br/>미역국<br/>제육볶음(5.6.10.13.)<br/>계란말이(1.5.6.)<br/>콩나물무침<br/>배추김치"
// → [
//     { rawSegment: '쌀밥/흑미밥', dishName: '쌀밥', allergenCodes: [] },
//     { rawSegment: '쌀밥/흑미밥', dishName: '흑미밥', allergenCodes: [] },
//     { rawSegment: '미역국', dishName: '미역국', allergenCodes: [] },
//     { rawSegment: '제육볶음(5.6.10.13.)', dishName: '제육볶음', allergenCodes: [5,6,10,13] },
//     ...
//   ]
//
// "쌀밥/흑미밥"처럼 같은 줄에 '/'로 묶인 선택 메뉴는 각각 독립된 메뉴 후보로 다룬다
// (실제 NEIS 데이터에 자주 나타나는 패턴). 끝에 붙는 "(5.6.10.13.)" 같은 알레르기 번호
// 그룹은 메뉴명과 분리해 allergenCodes로 뽑아낸다.

const BR_TAG_RE = /<br\s*\/?>/gi
const OTHER_HTML_TAG_RE = /<[^>]*>/g
const TRAILING_ALLERGEN_GROUP_RE = /\(([\d.\s]+)\)\s*$/

function decodeBasicHtmlEntities(text) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ')
}

function parseAllergenCodes(group) {
  return group
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
}

// 한 줄(세그먼트)에서 끝의 알레르기 번호 그룹을 떼어내고 { nameWithoutAllergens, allergenCodes }를 돌려준다.
function splitAllergenGroup(segment) {
  const match = TRAILING_ALLERGEN_GROUP_RE.exec(segment)
  if (!match) return { nameWithoutAllergens: segment, allergenCodes: [] }
  return {
    nameWithoutAllergens: segment.slice(0, match.index).trim(),
    allergenCodes: parseAllergenCodes(match[1]),
  }
}

export function extractDishNames(ddishNm) {
  if (!ddishNm || typeof ddishNm !== 'string') return []

  const withoutTags = decodeBasicHtmlEntities(ddishNm)
    .replace(BR_TAG_RE, '\n')
    .replace(OTHER_HTML_TAG_RE, ' ')

  const segments = withoutTags
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const results = []
  for (const segment of segments) {
    const { nameWithoutAllergens, allergenCodes } = splitAllergenGroup(segment)
    if (!nameWithoutAllergens) continue

    // "쌀밥/흑미밥"처럼 '/'로 구분된 대체 메뉴는 각각 별도 후보로 다룬다. 단 숫자 사이의
    // '/'(예: "1/2")까지 분리하면 안 되므로, 구분자 양옆에 한글/영문 단어가 있을 때만 나눈다.
    const altNames = nameWithoutAllergens.includes('/')
      ? nameWithoutAllergens.split(/(?<=[가-힣a-zA-Z])\/(?=[가-힣a-zA-Z])/)
      : [nameWithoutAllergens]

    for (const altName of altNames) {
      const dishName = altName.trim()
      if (!dishName) continue
      results.push({ rawSegment: segment, dishName, allergenCodes })
    }
  }
  return results
}
