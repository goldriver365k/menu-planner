const STORAGE_KEY = 'menu-planner:api-settings:v1'

function defaults() {
  return {
    publicDataServiceKey: '', // 공공데이터포털(data.go.kr) 서비스키 — 식자재 가격 API용
    nutritionServiceKey: '', // 식품영양성분DB API 서비스키
  }
}

export function getApiSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    return { ...defaults(), ...JSON.parse(raw) }
  } catch (err) {
    console.warn('API 설정을 불러오지 못했습니다.', err)
    return defaults()
  }
}

export function saveApiSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('API 설정을 저장하지 못했습니다.', err)
  }
}
