import { useState } from 'react'
import { getAllMealCountRecords } from '../data/mealCountRecords'
import { getRecommendedCount } from '../logic/mealCountRecommendation'
import { DAY_LABELS, MEAL_LABELS } from '../data/planConfig'

const SOURCE_LABELS = {
  weekday_meal_recent: (day, mealType) => `${DAY_LABELS[day]}요일 ${MEAL_LABELS[mealType]} 최근 4주 평균`,
  weekday_meal_all: (day, mealType) => `${DAY_LABELS[day]}요일 ${MEAL_LABELS[mealType]} 전체 평균`,
  meal_recent: (_day, mealType) => `${MEAL_LABELS[mealType]} 최근 평균(요일 무관)`,
}

function fmtCount(n) {
  return n == null ? '-' : `${Math.round(n * 10) / 10}명`
}

function fmtSigned(n) {
  if (n == null) return '-'
  const rounded = Math.round(n * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}명`
}

// STEP 4-4: 예상 식수 자동 추천. 추천값은 사용자가 [추천값 적용]을 눌러야만 기존
// expectedCount에 반영된다(자동 적용 없음) — onApply는 PlannerPage의 updateMeal을 그대로
// 호출하는 콜백이다.
export default function MealCountRecommendation({ day, mealType, currentExpectedCount, mealResult, onApply }) {
  const [applied, setApplied] = useState(false)

  const main1Id = mealResult?.main1?.id ?? null
  const main2Id = mealResult?.main2?.id ?? null
  const allRecords = getAllMealCountRecords()
  const result = getRecommendedCount(allRecords, {
    day,
    mealType,
    currentExpectedCount,
    main1Id,
    main2Id,
  })

  const handleApply = () => {
    onApply(mealType, result.recommendedCount)
    setApplied(true)
  }

  if (!result.hasData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-900">예상 식수 추천</h4>
        <p className="text-sm text-amber-600">추천을 위한 실제 식수 데이터가 부족합니다.</p>
      </div>
    )
  }

  const baseLabel = SOURCE_LABELS[result.baseCountSource]?.(day, mealType) || '기준 식수'
  const menuAdjustmentText = fmtSigned(result.menuAdjustment.limited)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">예상 식수 추천</h4>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="block text-xs text-slate-400">현재 입력 예상식수</span>
          <span className="text-sm font-medium text-slate-700">{Number(currentExpectedCount) || 0}명</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">추천 예상식수</span>
          <span className="text-lg font-semibold text-blue-600">{result.recommendedCount}명</span>
        </div>
        <button
          type="button"
          onClick={handleApply}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          추천값 적용
        </button>
        {applied && <span className="text-xs text-emerald-600">적용되었습니다</span>}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p className="mb-1 font-medium text-slate-600">근거</p>
        <ul className="space-y-0.5">
          <li>
            {baseLabel}: <span className="tabular-nums text-slate-700">{fmtCount(result.baseCount)}</span>
          </li>
          <li>
            주요 메뉴 보정: <span className="tabular-nums text-slate-700">{menuAdjustmentText}</span>
          </li>
          <li>
            사용 기록: <span className="tabular-nums text-slate-700">{result.baseCountSampleCount}회</span>
          </li>
          <li>
            신뢰도: <span className="font-medium text-slate-700">{result.confidence}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
