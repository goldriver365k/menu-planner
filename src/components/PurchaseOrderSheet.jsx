import { useMemo, useState } from 'react'
import { DAYS, DAY_LABELS } from '../data/planConfig'
import { calcPurchaseOrderRows } from '../logic/ingredientRequirement'
import { isOrderChecked, setOrderChecked } from '../data/purchaseOrderStatus'

function formatWon(n) {
  if (n == null) return '가격 미등록'
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

function OrderRow({ row }) {
  // 주간 발주서의 행은 날짜가 없다(row.date === null) — 그 경우 체크 상태 저장 키는
  // 'WEEKLY'로 고정해, 같은 식재료라도 "이번 주 전체 발주" 체크와 "특정 날짜 발주" 체크가
  // 서로 다른 항목으로 따로 저장되게 한다. 화면에는 영향 없다(날짜 칸은 그대로 비워 둔다).
  const checkDate = row.date ?? 'WEEKLY'
  const [checked, setChecked] = useState(() => isOrderChecked(checkDate, row.ingredientId))

  const handleToggle = () => {
    const next = !checked
    setChecked(next)
    setOrderChecked(checkDate, row.ingredientId, next)
  }

  return (
    <tr className={['border-b border-slate-100', checked ? 'bg-slate-50' : ''].join(' ')}>
      <td className="whitespace-nowrap px-3 py-2 text-slate-500">{row.date}</td>
      <td className="px-3 py-2 text-slate-800">{row.name}</td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">
        {row.requiredQuantity.value}
        {row.requiredQuantity.unit}
      </td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
        {row.actualQuantity.value}
        {row.actualQuantity.unit}
      </td>
      <td className="px-3 py-2 text-slate-500">{row.orderUnit}</td>
      <td className="px-3 py-2 tabular-nums font-medium text-slate-900">{row.orderQuantity}</td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">
        {row.unitPrice != null ? formatWon(row.unitPrice) : <span className="text-amber-600">가격 미등록</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums font-semibold text-slate-900">
        {row.expectedAmount != null ? formatWon(row.expectedAmount) : <span className="font-normal text-amber-600">—</span>}
      </td>
      <td className="px-3 py-2 text-center print:hidden">
        <input type="checkbox" checked={checked} onChange={handleToggle} className="h-4 w-4 rounded border-slate-300" />
      </td>
      <td className="hidden px-3 py-2 text-center print:table-cell">{checked ? '완료' : ''}</td>
    </tr>
  )
}

function OrderTable({ rows, title }) {
  const totalAmount = rows.reduce((sum, r) => sum + (r.expectedAmount || 0), 0)
  return (
    <div>
      <p className="mb-2 hidden text-base font-semibold text-slate-900 print:block">{title}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">표준 레시피가 등록된 메뉴가 없어 발주할 식재료가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">식재료</th>
                <th className="px-3 py-2">필요량</th>
                <th className="px-3 py-2">수율반영 필요량</th>
                <th className="px-3 py-2">발주단위</th>
                <th className="px-3 py-2">발주수량</th>
                <th className="px-3 py-2">단가</th>
                <th className="px-3 py-2">예상금액</th>
                <th className="px-3 py-2 text-center print:hidden">발주완료</th>
                <th className="hidden px-3 py-2 text-center print:table-cell">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <OrderRow key={`${row.ingredientId}-${row.date}-${row.orderUnit}`} row={row} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-3 py-2.5 text-slate-700" colSpan={7}>
                  예상 발주 총액
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-900" colSpan={2}>
                  {formatWon(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// 작업지시서: 3-4에서 계산한 식재료 필요량을 이용해 발주서 화면만 만든다. 화려한 디자인
// 없이 표 하나 + 체크박스 + 인쇄 버튼이 전부다. PDF 라이브러리를 쓰지 않고 브라우저
// window.print()와 @media print(index.css)로 A4 인쇄를 지원한다.
export default function PurchaseOrderSheet({ weekMenu, operatingDays, mealsSettings, weekStartDate }) {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('weekly') // 'weekly' | 'mon' | ...

  const result = useMemo(
    () => calcPurchaseOrderRows(weekMenu, operatingDays, mealsSettings, weekStartDate),
    [weekMenu, operatingDays, mealsSettings, weekStartDate]
  )

  const isWeekly = view === 'weekly'
  const rows = isWeekly ? result.weekly.rows : result.daily[view]?.rows || []
  const title = isWeekly ? `주간 발주서 (${result.weekly.dateRange})` : `일별 발주서 (${result.daily[view]?.date})`

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 print:border-0 print:p-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left print:hidden"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900">발주서</h2>
          <p className="mt-1 text-sm text-slate-500">
            식재료 필요량을 발주단위로 올림 계산해 일별/주간 발주서를 만듭니다. KAMIS 연동
            전까지는 식재료 마스터 DB에 등록한 구매가를 그대로 씁니다.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-400">{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div className="mt-4 print-area">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setView('weekly')}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-semibold',
                  isWeekly ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                주간 발주서
              </button>
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  disabled={!operatingDays[day]}
                  onClick={() => setView(day)}
                  className={[
                    'rounded-lg px-3 py-1.5 text-xs font-semibold',
                    view === day
                      ? 'bg-blue-600 text-white'
                      : operatingDays[day]
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'cursor-not-allowed bg-slate-50 text-slate-300',
                  ].join(' ')}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              A4 인쇄
            </button>
          </div>

          <OrderTable rows={rows} title={title} />
        </div>
      )}
    </section>
  )
}
