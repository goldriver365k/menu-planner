// 12장: 영양정보 API 연동. priceApiClient.js와 같은 이유(샌드박스 네트워크 제한,
// 실제 공공 API는 CORS 프록시 필요)로 지금은 모의(mock) 구현만 제공한다.
// 실제 연동 시 이 파일의 fetchNutritionInfo 본문만 교체하면 된다.

const KNOWN_VARIATION = 0.97 // 이미 등록된 값 근처로만 미세 보정 — 완전 무작위보다 현실적인 모의값

export const nutritionApiClient = {
  async fetchNutritionInfo(ingredientName, current) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const jitter = (base) => Math.round(base * (KNOWN_VARIATION + Math.random() * 0.06) * 10) / 10
    return {
      calories_per_100g: jitter(current?.calories_per_100g || 100),
      protein: jitter(current?.protein || 5),
      carbohydrate: jitter(current?.carbohydrate || 10),
      fat: jitter(current?.fat || 5),
      sodium: jitter(current?.sodium || 50),
      source: '식품영양성분DB(모의 응답 — 실제 연동 전)',
      updatedAt: new Date().toISOString().slice(0, 10),
    }
  },
}
