import { useState } from 'react'
import { getMealCountRecord, saveActualMealCount } from '../data/mealCountRecords'
import { calcMealCountAccuracy } from '../logic/mealCountAccuracy'
import { flattenMealItems } from '../logic/generateMeal'

function fmt1(n) {
  return n.toFixed(1)
}

// STEP 4-1: 실제 식수 입력. 기존 "주간 식단 결과"의 끼니 상세 영역 안에 끼워 넣는, 작은
// 입력 카드 하나가 전부다(새 화면/그래프/통계 없음). 저장 시 해당 끼니에 실제로 나간
// 메뉴 ID 목록(menuIds)도 함께 기록해 두는데, 이번 단계에서는 그 데이터를 쌓아 두기만
// 하고 분석하지는 않는다.
export default function MealCountRecord({ date, mealType, expectedCount, mealResult }) {
  const [record, setRecord] = useState(() => getMealCountRecord(date, mealType))
  const [input, setInput] = useState(() => {
    const existing = getMealCountRecord(date, mealType)
    return existing?.actualCount != null ? String(existing.actualCount) : ''
  })
  const [error, setError] = useState('')

  const handleSave = () => {
    const menuIds = flattenMealItems(mealResult)
      .filter(Boolean)
      .map((item) => item.id)
    const res = saveActualMealCount(date, mealType, { expectedCount, actualCount: input, menuIds })
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setRecord(res.record)
  }

  const { diff, accuracy } = calcMealCountAccuracy(Number(expectedCount) || 0, record?.actualCount ?? null)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">실제 식수 입력</h4>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="block text-xs text-slate-400">예상 식수</span>
          <span className="text-sm font-medium text-slate-700">{Number(expectedCount) || 0}명</span>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">실제 식수</span>
          <input
            type="number"
            min="0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 327"
            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          저장
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <span className="block text-xs text-slate-400">실제 식수</span>
          <span className="text-sm font-medium text-slate-700">
            {record?.actualCount != null ? `${record.actualCount}명` : '실제 식수 미입력'}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">차이</span>
          <span className="text-sm font-medium text-slate-700">{diff != null ? `${diff}명` : '—'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">예측 정확도</span>
          <span className="text-sm font-medium text-slate-700">{accuracy != null ? `${fmt1(accuracy)}%` : '—'}</span>
        </div>
      </div>
    </div>
  )
}
