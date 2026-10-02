import { useMemo, useState } from 'react'
import { getActiveMenus } from '../../data/menuDatabase'
import { getSalesRecord } from '../../data/salesRecords'
import { bulkSetProductionPlans, getProductionPlansByDate } from '../../data/menuProductionPlans'
import { recommendMenuProductionForMenus, BASIS, CONFIDENCE_LABELS } from '../../logic/menuProductionRecommendation'
import { todayISO, addDaysISO } from '../../data/menuHistory'

const CONFIDENCE_COLORS = {
  HIGH: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-blue-50 text-blue-700',
  LOW: 'bg-amber-50 text-amber-700',
  NONE: 'bg-slate-100 text-slate-500',
}

// 12장: 숫자만 보여주지 않는다 — 추천값/근거(reasonLines)/신뢰도를 한 블록에 같이 보여준다.
function RecommendationBlock({ recommendation, onApply }) {
  if (recommendation.basis === BASIS.NO_DATA) {
    return <span className="text-xs text-amber-600">판매 데이터 부족 — 직접 입력하세요</span>
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{recommendation.recommendedQuantity}개</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONFIDENCE_COLORS[recommendation.confidence]}`}>
          {CONFIDENCE_LABELS[recommendation.confidence]}
        </span>
        <button
          type="button"
          onClick={() => onApply(recommendation.recommendedQuantity)}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
        >
          추천값 적용
        </button>
      </div>
      <ul className="mt-1 text-[11px] text-slate-500">
        {recommendation.reasonLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

// 16장·17장: 그 날짜의 실제 판매수량(5-7)이 이미 입력돼 있으면 계획과 비교해서 보여준다.
// "폐기"라고 단정하지 않고 "계획 대비 판매 차이"로만 표시한다.
function ActualComparison({ date, menuId, plannedMenuQuantity }) {
  const actual = getSalesRecord(date, menuId)
  if (!actual) return <span className="text-xs text-slate-300">실제 판매 미입력</span>
  if (plannedMenuQuantity == null) return <span className="text-xs text-slate-400">계획 없음 · 실제 {actual.quantity}개</span>

  const diff = actual.quantity - plannedMenuQuantity
  return (
    <div className="text-xs text-slate-600">
      <p>
        계획 {plannedMenuQuantity} · 실제 {actual.quantity}
      </p>
      <p className="text-slate-500">
        계획 대비 판매 차이 {diff > 0 ? '+' : ''}
        {diff}개
      </p>
    </div>
  )
}

// date별로 key를 줘서 날짜가 바뀌면 그 날짜의 기존 계획값으로 입력칸이 다시 채워지게
// 리마운트한다(이 프로젝트에서 useEffect 대신 써 온 패턴, 5-7과 동일).
function ProductionPlanTable({ date, menus, onSaved }) {
  const recommendations = useMemo(() => {
    const list = recommendMenuProductionForMenus(menus.map((m) => m.id), date)
    const byMenuId = {}
    for (const r of list) byMenuId[r.menuId] = r
    return byMenuId
  }, [date, menus])

  const existingByMenu = useMemo(() => {
    const map = {}
    for (const p of getProductionPlansByDate(date)) map[p.menuId] = p.plannedMenuQuantity
    return map
  }, [date])

  const [inputs, setInputs] = useState(() => {
    const init = {}
    for (const menu of menus) {
      const existing = existingByMenu[menu.id]
      init[menu.id] = existing != null ? String(existing) : ''
    }
    return init
  })
  const [message, setMessage] = useState('')

  const handleChange = (menuId, value) => {
    setInputs((prev) => ({ ...prev, [menuId]: value }))
  }

  const handleSaveAll = () => {
    const entries = menus.map((menu) => ({ date, menuId: menu.id, plannedMenuQuantity: inputs[menu.id] }))
    const results = bulkSetProductionPlans(entries)
    const failed = results.filter((r) => !r.ok)
    setMessage(failed.length > 0 ? `${failed.length}건 저장 실패 — ${failed[0].reason}` : '계획수량이 저장되었습니다.')
    onSaved()
  }

  const total = menus.reduce((sum, menu) => sum + (Number(inputs[menu.id]) || 0), 0)

  if (menus.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        판매가격이 등록된 활성 메뉴가 없습니다. "메뉴 수익성" 화면에서 먼저 판매가를 입력하세요.
      </p>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">메뉴</th>
              <th className="px-3 py-2.5">추천 준비수량 · 근거 · 신뢰도</th>
              <th className="px-3 py-2.5">계획</th>
              <th className="px-3 py-2.5">실제 판매와 비교</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => {
              const recommendation = recommendations[menu.id]
              const plannedValue = inputs[menu.id] === '' ? null : Number(inputs[menu.id])
              return (
                <tr key={menu.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 text-slate-800">{menu.name}</td>
                  <td className="px-3 py-2.5">
                    <RecommendationBlock recommendation={recommendation} onApply={(qty) => handleChange(menu.id, String(qty))} />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={inputs[menu.id]}
                      onChange={(e) => handleChange(menu.id, e.target.value)}
                      placeholder="미입력"
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <ActualComparison date={date} menuId={menu.id} plannedMenuQuantity={plannedValue} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSaveAll}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          계획 저장
        </button>
        {message && <span className="text-sm text-slate-500">{message}</span>}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        <p>메뉴별 계획수량 합계 {total}개</p>
        <p>메뉴 판매수량 합계이며 식수인원과 다를 수 있습니다.</p>
      </div>
    </div>
  )
}

// 작업지시서: 5-7의 실제 판매기록을 이용해 "독립 판매메뉴"별 준비수량을 추천한다.
// 4-6(식사 전체 준비인원 추천)과는 완전히 분리된 별개 기능이며, 가격·원가율(5-6)은
// 추천에 영향을 주지 않는다 — 오직 실제 판매이력만 본다.
export default function MenuProductionPlanManagement() {
  const [date, setDate] = useState(() => addDaysISO(todayISO(), 1))
  const [dataVersion, setDataVersion] = useState(0)

  const menus = useMemo(() => {
    void dataVersion
    return getActiveMenus().filter((m) => m.sale_price != null)
  }, [dataVersion])

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">메뉴별 준비계획</h2>
        <p className="mt-1 text-sm text-slate-500">
          5-7에서 기록한 실제 판매수량을 바탕으로, 선택한 날짜의 판매메뉴별 준비수량을
          추천합니다. 가격이나 원가율은 추천에 영향을 주지 않습니다. 끼니 전체 준비인원
          추천(4-6)과는 다른, 메뉴 단위의 별도 기능입니다.
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          판매수량 기준 추천이며 품절로 인한 미판매 수요는 반영되지 않습니다.
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

      <ProductionPlanTable key={date} date={date} menus={menus} onSaved={() => setDataVersion((v) => v + 1)} />
    </div>
  )
}
