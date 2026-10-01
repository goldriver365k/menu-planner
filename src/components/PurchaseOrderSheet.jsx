import { useMemo, useState } from 'react'
import { DAYS, DAY_LABELS, MEAL_TYPES, MEAL_LABELS } from '../data/planConfig'
import { calcPurchaseOrderRows, getProcurementBaseCount } from '../logic/ingredientRequirement'
import { isOrderChecked, setOrderChecked } from '../data/purchaseOrderStatus'
import { getMealCountRecord } from '../data/mealCountRecords'

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
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">
        {row.stockStatus === 'OK' && row.currentStock ? (
          `${row.currentStock.value}${row.currentStock.unit}`
        ) : row.stockStatus === 'UNIT_MISMATCH' ? (
          <span className="text-amber-600">단위 확인 필요</span>
        ) : (
          <span className="text-amber-600">재고 미확인</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
        {row.purchaseNeeded.value}
        {row.purchaseNeeded.unit}
        {row.stockStatus !== 'OK' && <span className="ml-1 text-[11px] font-medium text-amber-600">(재고 미반영)</span>}
      </td>
      <td className="px-3 py-2 text-slate-500">{row.orderUnit}</td>
      <td className="px-3 py-2 tabular-nums font-medium text-slate-900">{row.orderQuantity}</td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">
        {row.unitPrice != null ? (
          <>
            {formatWon(row.unitPrice)}
            {row.priceLabel && <span className="ml-1 text-[11px] font-medium text-amber-600">({row.priceLabel})</span>}
          </>
        ) : (
          <span className="text-amber-600">가격 미등록</span>
        )}
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

// STEP 5-2: 이 날짜의 끼니별로 어떤 기준(준비계획/예상 식수)으로 발주량을 계산했는지,
// 그리고 이미 "발주완료"로 체크된 항목이 있는지 보여준다. 체크된 항목이 있으면 준비계획이
// 바뀌어도 그 체크는 자동으로 풀리거나 수정되지 않는다 — 안내만 하고 재발주는 하지 않는다.
function ProcurementBasisNote({ date, mealsSettings, rows }) {
  if (!date) return null
  const items = MEAL_TYPES.filter((mealType) => mealsSettings[mealType]?.isActive).map((mealType) => {
    const plannedPreparationCount = getMealCountRecord(date, mealType)?.plannedPreparationCount
    const basis = getProcurementBaseCount({ plannedPreparationCount, expectedCount: mealsSettings[mealType]?.expectedCount })
    return { mealType, basis }
  })
  if (items.length === 0) return null

  const hasCheckedRow = rows.some((row) => isOrderChecked(row.date ?? 'WEEKLY', row.ingredientId))

  return (
    <div className="mb-3 print:hidden">
      <p className="text-xs text-slate-500">
        발주 계산 기준:{' '}
        {items
          .map(({ mealType, basis }) =>
            basis.count == null
              ? `${MEAL_LABELS[mealType]} 발주 계산 기준 인원을 입력하세요`
              : `${MEAL_LABELS[mealType]} ${basis.count}${basis.source === 'plannedPreparationCount' ? '인분(준비계획)' : '명(예상 식수)'}`
          )
          .join(' · ')}
      </p>
      {hasCheckedRow && (
        <p className="mt-1 text-xs text-amber-600">
          준비계획이 변경되었을 수 있습니다. 이미 발주완료로 표시된 항목이 있다면 기존 발주내역을 확인하세요.
        </p>
      )}
    </div>
  )
}

// STEP 5-3(12장): 재고가 미확인이거나 단위를 확인할 수 없는 식재료가 있으면 상단에
// 어떤 식재료인지 알 수 있게 안내한다.
function StockWarningBanner({ rows }) {
  const unconfirmed = rows.filter((r) => r.stockStatus !== 'OK')
  if (unconfirmed.length === 0) return null
  return (
    <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 print:hidden">
      재고 미확인 식재료가 있습니다: {unconfirmed.map((r) => r.name).join(', ')}
    </p>
  )
}

function OrderTable({ rows, title }) {
  const totalAmount = rows.reduce((sum, r) => sum + (r.expectedAmount || 0), 0)
  return (
    <div>
      <p className="mb-2 hidden text-base font-semibold text-slate-900 print:block">{title}</p>
      <StockWarningBanner rows={rows} />
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
                <th className="px-3 py-2">현재재고</th>
                <th className="px-3 py-2">구매필요</th>
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
                <td className="px-3 py-2.5 text-slate-700" colSpan={9}>
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
export default function PurchaseOrderSheet({ weekMenu, operatingDays, mealsSettings, weekStartDate, refreshToken }) {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('weekly') // 'weekly' | 'mon' | ...

  const result = useMemo(() => {
    // refreshToken은 계산에 쓰이지 않는다 — plannedPreparationCount가 LocalStorage에서
    // 바뀌었을 때(이 컴포넌트가 직접 구독하지 않는 값) 다시 계산하라는 신호로만 쓴다.
    void refreshToken
    return calcPurchaseOrderRows(weekMenu, operatingDays, mealsSettings, weekStartDate)
  }, [weekMenu, operatingDays, mealsSettings, weekStartDate, refreshToken])

  const isWeekly = view === 'weekly'
  const rows = isWeekly ? result.weekly.rows : result.daily[view]?.rows || []
  const title = isWeekly ? `주간 발주서 (${result.weekly.dateRange})` : `일별 발주서 (${result.daily[view]?.date})`
  const selectedDate = isWeekly ? null : result.daily[view]?.date || null

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
            식재료 필요량을 발주단위로 올림 계산해 일별/주간 발주서를 만듭니다. 구매단가가
            등록된 식재료는 그 값을 그대로 쓰고, 미등록 식재료만 KAMIS 참고가격이 있으면
            '시장 참고가격'으로 보조 표시합니다.
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

          <ProcurementBasisNote date={selectedDate} mealsSettings={mealsSettings} rows={rows} />

          <OrderTable rows={rows} title={title} />
        </div>
      )}
    </section>
  )
}
