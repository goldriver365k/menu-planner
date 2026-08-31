import { useEffect, useState } from 'react'
import { createDefaultPlanSettings } from '../data/planConfig'

const STORAGE_KEY = 'menu-planner:plan-settings:v1'

// STEP 1 단계의 데이터 저장소는 LocalStorage를 사용한다 (개발 환경 문서 2장 참고).
// 이후 DB 구조가 확정되면 이 훅의 내부 구현만 Supabase 연동으로 교체하고,
// 이 훅을 사용하는 컴포넌트 쪽 코드는 변경하지 않아도 되도록 분리해 둔다.
export function usePersistedPlanSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return createDefaultPlanSettings()
      const parsed = JSON.parse(raw)
      // 저장된 값과 기본 구조를 얕게 병합해, 이후 필드가 추가되어도
      // 예전 저장값 때문에 깨지지 않도록 한다.
      const defaults = createDefaultPlanSettings()
      return {
        ...defaults,
        ...parsed,
        operatingDays: { ...defaults.operatingDays, ...parsed.operatingDays },
        meals: {
          breakfast: { ...defaults.meals.breakfast, ...parsed.meals?.breakfast },
          lunch: { ...defaults.meals.lunch, ...parsed.meals?.lunch },
          dinner: { ...defaults.meals.dinner, ...parsed.meals?.dinner },
        },
        costRate: {
          ...defaults.costRate,
          ...parsed.costRate,
          overrides: { ...defaults.costRate.overrides, ...parsed.costRate?.overrides },
        },
      }
    } catch (err) {
      console.warn('저장된 설정을 불러오지 못했습니다. 기본값을 사용합니다.', err)
      return createDefaultPlanSettings()
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (err) {
      console.warn('설정을 저장하지 못했습니다.', err)
    }
  }, [settings])

  const resetSettings = () => setSettings(createDefaultPlanSettings())

  return [settings, setSettings, resetSettings]
}
