// 12장: 공공 식자재 가격 API 연동.
//
// ⚠️ 중요 — 실제 연동에 대한 정직한 안내:
// 이 개발 환경(Claude 샌드박스)의 네트워크는 허용된 도메인 목록으로 제한되어 있고,
// 공공데이터포털(data.go.kr)이나 KAMIS(농산물유통정보) 같은 한국 공공 API 도메인은
// 그 목록에 없다. 그래서 이 파일은 실제 API를 호출하지 못하고, 대신:
//   1) 실제 연동 시 그대로 유지될 인터페이스(fetchIngredientPrice)를 정의하고,
//   2) 그 인터페이스를 흉내 내는 모의(mock) 구현을 기본으로 연결해 두었다.
//
// 실제 공공 데이터로 전환하려면(관리자 화면 "설정"에 서비스키 입력란은 이미 준비돼 있음):
//   - 대부분의 공공데이터포털 API는 브라우저에서 직접 호출 시 CORS로 막히므로,
//     Netlify Functions(서버리스 함수) 같은 프록시를 하나 만들어 그 함수가 대신
//     공공 API를 호출하고 결과만 이 앱에 돌려주는 구조가 필요하다.
//   - 아래 realAdapter는 그 프록시가 준비됐을 때 채워 넣을 자리다. 지금은 프록시가
//     없어 mockAdapter를 기본값으로 export한다.
//
// 이 주석은 다음 단계(혹은 Claude Code처럼 외부 API에 접근 가능한 환경)에서
// realAdapter를 완성할 때 참고용으로 남겨둔다.

function seededRandom(seedStr) {
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) % 100000
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
}

// 실제 API가 준비되면 이 함수 본문만 fetch(...) 호출로 교체하면 된다.
// 시그니처(입력/출력 모양)는 유지해야 호출하는 쪽(관리자 화면) 코드가 바뀌지 않는다.
const mockAdapter = {
  async fetchIngredientPrice(ingredientName, basePrice) {
    // 네트워크 호출을 흉내 내기 위한 짧은 지연
    await new Promise((resolve) => setTimeout(resolve, 300))
    const rand = seededRandom(ingredientName + new Date().toISOString().slice(0, 10))
    const variation = 0.9 + rand() * 0.2 // 기준가 대비 -10% ~ +10%
    const price = Math.round((basePrice || 1000) * variation)
    return {
      price,
      source: '공공데이터포털(모의 응답 — 실제 연동 전)',
      updatedAt: new Date().toISOString().slice(0, 10),
    }
  },
}

// 아래는 실제 연동 시 채울 자리 — 지금은 호출되지 않는다.
// const realAdapter = {
//   async fetchIngredientPrice(ingredientName, basePrice, serviceKey) {
//     const res = await fetch(`/.netlify/functions/ingredient-price-proxy?name=${encodeURIComponent(ingredientName)}`)
//     if (!res.ok) throw new Error('가격 조회 실패')
//     const data = await res.json()
//     return { price: data.price, source: data.source, updatedAt: data.updatedAt }
//   },
// }

export const priceApiClient = mockAdapter
