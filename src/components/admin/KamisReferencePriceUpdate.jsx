import { useState } from 'react'
import { fetchKamisReferencePrices, isKamisApiConfigured } from '../../services/kamisClient'
import { setKamisReferencePrice } from '../../data/ingredientMasterDatabase'

// STEP 3-6: 관리자가 명시적으로 눌렀을 때만 KAMIS API를 호출한다(화면을 열 때마다 호출하지
// 않음). kamis_item_code가 등록된 식재료만 대상으로 삼는다 — 코드가 없는 식재료는 "억지로
// 매칭"하지 않고 그대로 미매칭으로 남긴다. API가 전부 실패해도 기존 구매가/원가계산에는
// 전혀 영향이 없다(이 컴포넌트는 kamis_reference_* 필드만 쓴다).
export default function KamisReferencePriceUpdate({ ingredients, onUpdated }) {
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)

  const matchedIngredients = ingredients.filter((ing) => ing.kamis_item_code)
  const unmatchedCount = ingredients.length - matchedIngredients.length

  const handleUpdate = async () => {
    setRunning(true)
    setSummary(null)
    try {
      const res = await fetchKamisReferencePrices(matchedIngredients)
      if (!res.ok) {
        setSummary({ ok: false, reason: res.reason })
        return
      }

      let success = 0
      let failed = 0
      for (const r of res.results) {
        if (r.ok) {
          setKamisReferencePrice(r.ingredientId, {
            price: r.item.price,
            unit: r.item.unit,
            updatedAt: new Date().toISOString().slice(0, 10),
          })
          success += 1
        } else {
          failed += 1
        }
      }
      setSummary({ ok: true, success, failed, total: matchedIngredients.length })
      onUpdated?.()
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">KAMIS 참고가격 업데이트</p>
          <p className="mt-0.5 text-xs text-slate-500">
            KAMIS 품목코드가 등록된 식재료({matchedIngredients.length}개, 미등록 {unmatchedCount}개)만 대상으로
            조회합니다. 조회된 값은 '시장 참고가격'으로만 표시되며 실제 구매단가를 덮어쓰지 않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={running || matchedIngredients.length === 0}
          className="shrink-0 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {running ? '업데이트 중…' : '참고가격 업데이트'}
        </button>
      </div>

      {!isKamisApiConfigured() && (
        <p className="mt-2 text-xs text-amber-600">
          VITE_KAMIS_API_KEY/VITE_KAMIS_API_ID가 설정되지 않아 지금은 사용할 수 없습니다. 설정해도 기존
          식단/레시피/발주 기능은 그대로 동작합니다.
        </p>
      )}

      {summary && !summary.ok && <p className="mt-2 text-xs text-rose-600">업데이트 실패: {summary.reason}</p>}
      {summary && summary.ok && (
        <p className="mt-2 text-xs text-slate-600">
          완료: {summary.success}개 갱신, {summary.failed}개 조회 실패 (대상 {summary.total}개)
        </p>
      )}
    </div>
  )
}
