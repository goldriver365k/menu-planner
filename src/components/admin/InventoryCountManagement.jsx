import { useMemo, useState } from 'react'
import { getActiveIngredientsMaster } from '../../data/ingredientMasterDatabase'
import { getInventoryCountsByDate, bulkSetInventoryCounts } from '../../data/inventoryCounts'
import { getVarianceStatus, VARIANCE_REVIEW_THRESHOLD_PERCENT } from '../../logic/inventoryVariance'
import { todayISO } from '../../data/menuHistory'

const STATUS_LABELS = { OK: '정상', REVIEW: '점검 필요', UNKNOWN: '이론재고 미확인' }
const STATUS_COLORS = {
  OK: 'bg-emerald-50 text-emerald-700',
  REVIEW: 'bg-rose-50 text-rose-700',
  UNKNOWN: 'bg-slate-100 text-slate-500',
}

// date별로 key를 줘 날짜가 바뀌면 그 날짜의 기존 실사 입력으로 다시 채워지도록 리마운트한다.
function InventoryCountTable({ date, ingredients, onSaved }) {
  const existingByIngredient = useMemo(() => {
    const map = {}
    for (const r of getInventoryCountsByDate(date)) map[r.ingredientId] = r
    return map
  }, [date])

  const [inputs, setInputs] = useState(() => {
    const init = {}
    for (const ing of ingredients) {
      const existing = existingByIngredient[ing.id]
      init[ing.id] = existing?.countedQuantity != null ? String(existing.countedQuantity) : ''
    }
    return init
  })
  const [message, setMessage] = useState('')

  const handleChange = (ingredientId, value) => {
    setInputs((prev) => ({ ...prev, [ingredientId]: value }))
  }

  const handleSaveAll = () => {
    const entries = ingredients.map((ing) => ({
      date,
      ingredientId: ing.id,
      countedQuantity: inputs[ing.id],
      theoreticalQuantity: ing.current_stock,
    }))
    const results = bulkSetInventoryCounts(entries)
    const failed = results.filter((r) => !r.ok)
    setMessage(failed.length > 0 ? `${failed.length}건 저장 실패 — ${failed[0].reason}` : '실사재고가 저장되었습니다.')
    onSaved()
  }

  if (ingredients.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">등록된 식재료가 없습니다.</p>
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">식재료</th>
              <th className="px-3 py-2.5 text-right">이론재고(시스템)</th>
              <th className="px-3 py-2.5 text-right">실사수량</th>
              <th className="px-3 py-2.5 text-right">차이</th>
              <th className="px-3 py-2.5">상태</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => {
              const saved = existingByIngredient[ing.id]
              const theoretical = ing.current_stock
              const countedInput = inputs[ing.id]
              const previewVariance =
                countedInput !== '' && theoretical != null ? Math.round((Number(countedInput) - theoretical) * 100) / 100 : null
              const previewPercent =
                previewVariance != null && theoretical > 0 ? Math.round((previewVariance / theoretical) * 1000) / 10 : null
              const status = saved ? getVarianceStatus(saved.variancePercent) : getVarianceStatus(previewPercent)
              return (
                <tr key={ing.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 text-slate-800">{ing.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                    {theoretical == null ? <span className="text-amber-600">재고 미확인</span> : `${theoretical}${ing.purchase_unit}`}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <input
                      type="number"
                      min="0"
                      value={countedInput}
                      onChange={(e) => handleChange(ing.id, e.target.value)}
                      placeholder="미입력"
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-blue-500"
                    />
                    <span className="ml-1 text-xs text-slate-400">{ing.purchase_unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                    {previewVariance != null ? (
                      <>
                        {previewVariance > 0 ? '+' : ''}
                        {previewVariance}
                        {ing.purchase_unit}
                        {previewPercent != null && <span className="ml-1 text-[11px] text-slate-400">({previewPercent}%)</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {countedInput !== '' && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveAll}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          실사재고 저장
        </button>
        {message && <span className="text-sm text-slate-500">{message}</span>}
      </div>
    </div>
  )
}

// 작업지시서: 시스템이 들고 있는 재고(current_stock, "이론재고"로 간주)와 실제로 센
// 값을 비교해 재고차이를 확인한다. 실사 입력이 current_stock을 자동으로 고치지는
// 않는다(식재료 마스터 DB 화면에서 직접 수정) — 새로운 재고 자동차감/보정 로직을
// 만들지 않는다.
export default function InventoryCountManagement() {
  const [date, setDate] = useState(() => todayISO())
  const [dataVersion, setDataVersion] = useState(0)

  const ingredients = useMemo(() => {
    void dataVersion
    return getActiveIngredientsMaster()
  }, [dataVersion])

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">실사재고 입력</h2>
        <p className="mt-1 text-sm text-slate-500">
          직접 세어본 실사수량을 시스템 재고(current_stock, 이론재고로 간주)와 비교합니다.
          차이가 {VARIANCE_REVIEW_THRESHOLD_PERCENT}%를 넘으면 "점검 필요"로 표시합니다.
          저장해도 시스템 재고 값은 자동으로 바뀌지 않습니다.
        </p>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-slate-600">날짜</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>

      <InventoryCountTable key={date} date={date} ingredients={ingredients} onSaved={() => setDataVersion((v) => v + 1)} />
    </div>
  )
}
