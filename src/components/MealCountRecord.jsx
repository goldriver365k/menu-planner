import { useState } from 'react'
import { getMealCountRecord, saveActualMealCount, saveLeftoverRecord, clearLeftoverRecord } from '../data/mealCountRecords'
import { calcMealCountAccuracy } from '../logic/mealCountAccuracy'
import {
  calculateUsageRate,
  calculateLeftoverRate,
  calculateWasteRate,
  calculatePreparationDifference,
} from '../logic/mealLeftoverStats'
import { flattenMealItems } from '../logic/generateMeal'

function fmt1(n) {
  return n.toFixed(1)
}

function toInputString(value) {
  return value != null ? String(value) : ''
}

// STEP 4-1/4-5: 실제 식수 + 준비량/남은 음식/폐기 입력. 기존 "주간 식단 결과"의 끼니
// 상세 영역 안에 끼워 넣는, 작은 입력 카드 하나가 전부다(새 화면/그래프/통계 없음).
// 저장 시 해당 끼니에 실제로 나간 메뉴 ID 목록(menuIds)도 함께 기록해 두는데, 분석은
// 하지 않고 데이터만 쌓아 둔다. 각 입력란은 서로 독립적으로 비워 둘 수 있다(미입력=null,
// 0=실제로 없음을 구분한다).
export default function MealCountRecord({ date, mealType, expectedCount, mealResult }) {
  const [record, setRecord] = useState(() => getMealCountRecord(date, mealType))
  const [input, setInput] = useState(() => toInputString(getMealCountRecord(date, mealType)?.actualCount))
  const [preparedInput, setPreparedInput] = useState(() => toInputString(getMealCountRecord(date, mealType)?.preparedCount))
  const [leftoverInput, setLeftoverInput] = useState(() => toInputString(getMealCountRecord(date, mealType)?.leftoverCount))
  const [wasteInput, setWasteInput] = useState(() => toInputString(getMealCountRecord(date, mealType)?.wasteCount))
  const [error, setError] = useState('')

  const handleSave = () => {
    const menuIds = flattenMealItems(mealResult)
      .filter(Boolean)
      .map((item) => item.id)
    const res1 = saveActualMealCount(date, mealType, { expectedCount, actualCount: input, menuIds })
    if (!res1.ok) {
      setError(res1.reason)
      return
    }
    const res2 = saveLeftoverRecord(date, mealType, {
      preparedCount: preparedInput,
      leftoverCount: leftoverInput,
      wasteCount: wasteInput,
    })
    if (!res2.ok) {
      setError(res2.reason)
      return
    }
    setError('')
    setRecord(res2.record)
  }

  const handleClearLeftover = () => {
    if (!window.confirm('준비량/남은 음식/폐기 기록만 비울까요? 실제 식수는 그대로 유지됩니다.')) return
    const res = clearLeftoverRecord(date, mealType)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setRecord(res.record)
    setPreparedInput('')
    setLeftoverInput('')
    setWasteInput('')
  }

  const { diff, accuracy } = calcMealCountAccuracy(Number(expectedCount) || 0, record?.actualCount ?? null)

  const preparedCount = record?.preparedCount ?? null
  const leftoverCount = record?.leftoverCount ?? null
  const wasteCount = record?.wasteCount ?? null
  const usageRate = calculateUsageRate(record?.actualCount ?? null, preparedCount)
  const leftoverRate = calculateLeftoverRate(leftoverCount, preparedCount)
  const wasteRate = calculateWasteRate(wasteCount, preparedCount)
  const preparationDiff = calculatePreparationDifference(preparedCount, record?.actualCount ?? null)
  const overPrepared = record?.actualCount != null && preparedCount != null && record.actualCount > preparedCount

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">실제 식수 · 준비량 · 잔반 입력</h4>

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
            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">실제 준비량(인분)</span>
          <input
            type="number"
            min="0"
            value={preparedInput}
            onChange={(e) => setPreparedInput(e.target.value)}
            placeholder="예: 360"
            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">남은 음식(인분)</span>
          <input
            type="number"
            min="0"
            value={leftoverInput}
            onChange={(e) => setLeftoverInput(e.target.value)}
            placeholder="예: 25"
            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">폐기(인분)</span>
          <input
            type="number"
            min="0"
            value={wasteInput}
            onChange={(e) => setWasteInput(e.target.value)}
            placeholder="예: 8"
            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          저장
        </button>
        <button
          type="button"
          onClick={handleClearLeftover}
          className="rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100"
        >
          준비량/잔반 정보만 지우기
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {overPrepared && (
        <p className="mt-2 text-xs text-amber-600">실제 식수가 입력된 준비량보다 많습니다.</p>
      )}

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

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
        <div>
          <span className="block text-xs text-slate-400">준비</span>
          <span className="text-sm font-medium text-slate-700">{preparedCount != null ? `${preparedCount}인분` : '미입력'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">남은 음식</span>
          <span className="text-sm font-medium text-slate-700">{leftoverCount != null ? `${leftoverCount}인분` : '미입력'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">폐기</span>
          <span className="text-sm font-medium text-slate-700">{wasteCount != null ? `${wasteCount}인분` : '미입력'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">준비량 대비 이용 차이</span>
          <span className="text-sm font-medium text-slate-700">
            {preparationDiff != null ? `${preparationDiff > 0 ? '+' : ''}${preparationDiff}인분` : '—'}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">준비 대비 실제 이용률</span>
          <span className="text-sm font-medium text-slate-700">{usageRate != null ? `${fmt1(usageRate)}%` : '—'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">남은 비율</span>
          <span className="text-sm font-medium text-slate-700">{leftoverRate != null ? `${fmt1(leftoverRate)}%` : '—'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400">폐기율</span>
          <span className="text-sm font-medium text-slate-700">{wasteRate != null ? `${fmt1(wasteRate)}%` : '—'}</span>
        </div>
      </div>
    </div>
  )
}
