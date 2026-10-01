// STEP 3-6: KAMIS(농산물유통정보, 한국농수산식품유통공사) Open API 연동 — 식재료 "참고가격"
// 용도로만 사용한다. 실제 구매가격(purchase_price)을 자동으로 덮어쓰지 않는다.
//
// ⚠️ 중요 — 정직한 안내 (neisClient.js/priceApiClient.js와 같은 이유):
// 이 파일은 실제 KAMIS Open API 엔드포인트를 호출하는 '진짜' 구현이다 — mock이 아니다.
// 다만 이 프로젝트를 개발한 Claude 샌드박스 환경의 네트워크는 허용된 도메인 목록으로
// 제한되어 있어 KAMIS 도메인에 접근할 수 없었고, 따라서 이 어댑터는 실제 배포 환경
// (사용자의 브라우저)에서 직접 검증되지 않았다. 확인이 필요한 부분:
//   1) CORS — KAMIS Open API가 브라우저의 교차 출처 요청을 허용하지 않는다면 이 fetch는
//      브라우저 단에서 차단된다. 그 경우 관리자 화면에 오류로 표시되며(아래 catch), 기존
//      식재료 DB/원가 계산은 전혀 영향을 받지 않는다.
//   2) 응답 스키마 — 아래 파싱은 KAMIS 공식 문서 기준의 필드명(item_name, price 등)을
//      따르지만 실제 응답을 직접 받아보지 못했으므로 예외가 있을 수 있다. parseKamisItem()의
//      방어 코드가 실패 시 해당 품목만 건너뛰고 throw하지 않는다.
//
// 작업지시서 요구사항:
//   - API KEY는 코드에 하드코딩하지 않고 VITE_KAMIS_API_KEY(+ VITE_KAMIS_API_ID) 환경변수로만
//     받는다.
//   - KEY가 없거나, 네트워크가 없거나, API가 실패해도 절대 throw하지 않고 { ok: false }를
//     반환한다 — 호출하는 쪽은 이 경우 기존 가격(구매단가/직접입력/최근 저장단가)만 사용한다.
//   - 화면을 열 때마다 호출하지 않는다 — 이 클라이언트는 관리자가 명시적으로 "참고가격
//     업데이트" 버튼을 눌렀을 때만 호출된다 (admin UI 참고).
//   - KAMIS에서 매칭되지 않는 식재료(kamis_item_code가 비어 있음)는 호출 대상에서 제외한다
//     — 이름 유사도 등으로 억지로 연결하지 않는다.

const KAMIS_BASE_URL = 'https://www.kamis.or.kr/service/price/xml.do'

export function getKamisApiKey() {
  try {
    return import.meta.env.VITE_KAMIS_API_KEY || ''
  } catch {
    return ''
  }
}

export function getKamisApiId() {
  try {
    return import.meta.env.VITE_KAMIS_API_ID || ''
  } catch {
    return ''
  }
}

export function isKamisApiConfigured() {
  return getKamisApiKey().trim().length > 0 && getKamisApiId().trim().length > 0
}

// KAMIS 일별 소매(또는 도매) 가격 조회 응답에서 하나의 품목 레코드를 안전하게 파싱한다.
// 필드가 없거나 가격이 숫자로 변환되지 않으면 null을 돌려준다(throw하지 않음) — 호출부에서
// 해당 품목만 건너뛴다.
function parseKamisItem(row) {
  if (!row || typeof row !== 'object') return null
  const priceRaw = row.price ?? row.dpr1 ?? null
  const price = Number(String(priceRaw).replaceAll(',', ''))
  if (!Number.isFinite(price) || price <= 0) return null
  return {
    itemCode: row.item_code || row.itemcode || '',
    kindCode: row.kind_code || row.kindcode || '',
    rankCode: row.rank_code || row.rankcode || '',
    itemName: row.item_name || row.itemname || '',
    unit: row.unit || '',
    price,
  }
}

// 품목코드 1건에 대한 최근 참고가격을 조회한다. 실패해도 throw하지 않는다.
async function fetchKamisItemPrice({ itemCode, kindCode, rankCode }) {
  const apiKey = getKamisApiKey()
  const apiId = getKamisApiId()
  if (!apiKey || !apiId) {
    return { ok: false, reason: 'VITE_KAMIS_API_KEY/VITE_KAMIS_API_ID가 설정되지 않았습니다.' }
  }
  if (!itemCode) {
    return { ok: false, reason: '품목코드(kamis_item_code)가 없습니다.' }
  }

  const params = new URLSearchParams({
    action: 'dailyPriceByCategoryList',
    p_cert_key: apiKey,
    p_cert_id: apiId,
    p_returntype: 'json',
    p_item_category_code: '',
    p_item_code: itemCode,
    p_convert_kg_yn: 'N',
  })
  if (kindCode) params.set('p_kind_code', kindCode)
  if (rankCode) params.set('p_product_rank_code', rankCode)

  let response
  try {
    response = await fetch(`${KAMIS_BASE_URL}?${params.toString()}`)
  } catch (err) {
    // 네트워크 자체가 없거나(오프라인) CORS로 브라우저가 요청을 막은 경우 모두 여기로 들어온다.
    return { ok: false, reason: `KAMIS API 호출에 실패했습니다 (네트워크/CORS 문제일 수 있음): ${err.message}` }
  }

  if (!response.ok) {
    return { ok: false, reason: `KAMIS API가 오류 상태를 반환했습니다 (HTTP ${response.status}).` }
  }

  let body
  try {
    body = await response.json()
  } catch (err) {
    return { ok: false, reason: `KAMIS 응답을 JSON으로 해석하지 못했습니다: ${err.message}` }
  }

  const rows = body?.price?.item
  const rowList = Array.isArray(rows) ? rows : rows ? [rows] : []
  if (rowList.length === 0) {
    return { ok: false, reason: '해당 품목코드의 가격 데이터가 없습니다.' }
  }

  const parsed = parseKamisItem(rowList[0])
  if (!parsed) {
    return { ok: false, reason: '가격 데이터를 해석할 수 없습니다.' }
  }
  return { ok: true, item: parsed }
}

// 식재료 마스터 DB 중 kamis_item_code가 등록된 항목들만 골라 참고가격을 일괄 조회한다.
// 개별 품목 호출이 실패해도 전체를 중단하지 않고 다음 품목으로 넘어간다 — 하나의 API 실패가
// 전체 "참고가격 업데이트"를 막아서는 안 된다.
export async function fetchKamisReferencePrices(ingredientsWithCode) {
  if (!isKamisApiConfigured()) {
    return {
      ok: false,
      reason: 'VITE_KAMIS_API_KEY/VITE_KAMIS_API_ID가 설정되지 않아 KAMIS 참고가격 업데이트를 사용할 수 없습니다.',
      results: [],
    }
  }

  const results = []
  for (const ing of ingredientsWithCode) {
    if (!ing.kamis_item_code) continue
    const res = await fetchKamisItemPrice({
      itemCode: ing.kamis_item_code,
      kindCode: ing.kamis_kind_code,
      rankCode: ing.kamis_rank_code,
    })
    results.push({ ingredientId: ing.id, ...res })
  }

  return { ok: true, results }
}
