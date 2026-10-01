// STEP 14: 교육부 NEIS 급식식단정보 Open API 연동.
//
// ⚠️ 중요 — 정직한 안내 (priceApiClient.js와 같은 이유):
// 이 파일은 실제 open.neis.go.kr 엔드포인트를 호출하는 '진짜' 구현이다 — mock이 아니다.
// 다만 이 프로젝트를 개발한 Claude 샌드박스 환경의 네트워크는 허용된 도메인 목록으로
// 제한되어 있어 open.neis.go.kr에 접근할 수 없었고, 따라서 이 어댑터는 실제 배포 환경
// (Netlify 등 사용자의 브라우저)에서 직접 검증되지 않았다. 두 가지를 특히 확인해야 한다:
//   1) CORS — NEIS Open API가 브라우저의 교차 출처 요청에 Access-Control-Allow-Origin을
//      내려주지 않는다면, 이 fetch는 브라우저 단에서 차단된다. 그 경우 관리자 화면에
//      오류로 표시되며(아래 catch), 기존 메뉴 DB는 전혀 영향을 받지 않는다. 필요하다면
//      priceApiClient.js가 이미 준비해 둔 것과 같은 Netlify Functions 프록시를 추가해
//      이 함수의 fetch 대상만 그 프록시 경로로 바꾸면 된다.
//   2) 응답 스키마 — 아래 파싱은 NEIS 공식 문서 기준의 필드명(DDISH_NM 등)을 따르지만
//      실제 응답을 직접 받아보지 못했으므로, 필드명이 바뀌었거나 예외적인 경우가 있다면
//      parseMealRows()의 방어 코드가 빈 배열을 돌려주고 콘솔 경고만 남긴다(throw하지 않음).
//
// 작업지시서 3·4·18장 요구사항:
//   - API KEY는 코드에 하드코딩하지 않고 VITE_NEIS_API_KEY 환경변수로만 받는다.
//   - KEY가 없거나, 네트워크가 없거나, API가 실패해도 절대 throw하지 않고 { ok: false }를
//     반환한다 — 호출하는 쪽(관리자 "급식 메뉴 가져오기" 화면)은 이 경우 기존 DB만 사용한다.
//   - 식단 생성 버튼을 누를 때마다 호출하지 않는다 — 이 클라이언트는 관리자가 명시적으로
//     "급식 메뉴 가져오기"를 눌렀을 때만 호출된다 (menuImport/runNeisImportPipeline.js 참고).

const NEIS_BASE_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo'
const MAX_PAGE_SIZE = 1000 // NEIS Open API 1회 호출 최대 건수

export function getNeisApiKey() {
  try {
    return import.meta.env.VITE_NEIS_API_KEY || ''
  } catch {
    return ''
  }
}

export function isNeisApiKeyConfigured() {
  return getNeisApiKey().trim().length > 0
}

function toYmd(dateISO) {
  return (dateISO || '').replaceAll('-', '')
}

// NEIS 표준 오류 코드(INFO-200: 데이터 없음, INFO-300: 필수값 누락, ERROR-*: 그 외)를
// 성공(row 있음)/빈 결과/오류로 구분해 돌려준다.
function parseNeisResponseBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: 'NEIS 응답을 해석할 수 없습니다 (빈 응답 또는 형식 오류).' }
  }
  if (body.RESULT) {
    const code = body.RESULT.CODE || ''
    if (code === 'INFO-200') return { ok: true, rows: [], totalCount: 0 } // 해당 조건에 데이터 없음 — 오류 아님
    return { ok: false, reason: `NEIS 응답 오류 (${code}): ${body.RESULT.MESSAGE || '알 수 없는 오류'}` }
  }
  const payload = body.mealServiceDietInfo
  if (!Array.isArray(payload) || payload.length < 2) {
    return { ok: false, reason: 'NEIS 응답 구조가 예상과 다릅니다 (mealServiceDietInfo 없음).' }
  }
  const head = payload[0]?.head || []
  const totalCount = head.find((h) => h && 'list_total_count' in h)?.list_total_count ?? null
  const rows = payload[1]?.row || []
  if (!Array.isArray(rows)) {
    return { ok: false, reason: 'NEIS 응답의 row 필드가 배열이 아닙니다.' }
  }
  return { ok: true, rows, totalCount }
}

// 한 페이지(최대 MAX_PAGE_SIZE건)를 가져온다. 실패해도 throw하지 않는다.
async function fetchMealServiceDietInfoPage({ officeCode, schoolCode, fromDate, toDate, pageIndex = 1, pageSize = MAX_PAGE_SIZE }) {
  const apiKey = getNeisApiKey()
  if (!apiKey) {
    return { ok: false, reason: 'VITE_NEIS_API_KEY가 설정되지 않았습니다.' }
  }
  if (!officeCode || !schoolCode) {
    return { ok: false, reason: '교육청코드(ATPT_OFCDC_SC_CODE)와 학교코드(SD_SCHUL_CODE)가 필요합니다.' }
  }

  const params = new URLSearchParams({
    KEY: apiKey,
    Type: 'json',
    pIndex: String(pageIndex),
    pSize: String(Math.min(pageSize, MAX_PAGE_SIZE)),
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
  })
  if (fromDate) params.set('MLSV_FROM_YMD', toYmd(fromDate))
  if (toDate) params.set('MLSV_TO_YMD', toYmd(toDate))

  let response
  try {
    response = await fetch(`${NEIS_BASE_URL}?${params.toString()}`)
  } catch (err) {
    // 네트워크 자체가 없거나(오프라인) CORS로 브라우저가 요청을 막은 경우 모두 여기로 들어온다.
    return { ok: false, reason: `NEIS API 호출에 실패했습니다 (네트워크/CORS 문제일 수 있음): ${err.message}` }
  }

  if (!response.ok) {
    return { ok: false, reason: `NEIS API가 오류 상태를 반환했습니다 (HTTP ${response.status}).` }
  }

  let body
  try {
    body = await response.json()
  } catch (err) {
    return { ok: false, reason: `NEIS 응답을 JSON으로 해석하지 못했습니다: ${err.message}` }
  }

  return parseNeisResponseBody(body)
}

// 지정한 기간의 급식 식단 전체를 여러 페이지에 걸쳐 수집한다.
// 실패하면 그 시점까지 모은 rows와 함께 ok:false를 돌려준다(부분 실패도 안전하게 중단).
export async function fetchMealServiceDietInfo({ officeCode, schoolCode, fromDate, toDate, maxPages = 10 }) {
  if (!isNeisApiKeyConfigured()) {
    return { ok: false, reason: 'VITE_NEIS_API_KEY가 설정되지 않아 NEIS 가져오기를 사용할 수 없습니다. 기존 메뉴 DB만 사용합니다.' }
  }

  const rows = []
  let pageIndex = 1
  let totalCount = null

  while (pageIndex <= maxPages) {
    const page = await fetchMealServiceDietInfoPage({ officeCode, schoolCode, fromDate, toDate, pageIndex, pageSize: MAX_PAGE_SIZE })
    if (!page.ok) {
      if (rows.length > 0) {
        return { ok: true, rows, totalCount, partial: true, partialReason: page.reason }
      }
      return page
    }
    if (page.totalCount != null) totalCount = page.totalCount
    rows.push(...page.rows)
    if (page.rows.length < MAX_PAGE_SIZE) break // 마지막 페이지
    pageIndex += 1
  }

  return { ok: true, rows, totalCount }
}
