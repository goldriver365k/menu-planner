import { useMemo, useState } from 'react'
import {
  getMenuPlanEntriesForDate,
  getMenuPlanEntriesInRange,
  calcMenuPlanOrder,
  summarizeMenuPlanOrder,
} from '../../logic/menuPlanIngredientRequirement'
import { isOrderChecked, setOrderChecked, getOrderEntry } from '../../data/purchaseOrderStatus'
import { todayISO, addDaysISO } from '../../data/menuHistory'

function formatWon(n) {
  if (n == null) return '가격 미등록'
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

const MENU_STATUS_LABELS = {
  OK: '레시피 연결됨',
  NO_RECIPE: '레시피 미등록',
  INGREDIENT_ERROR: '식재료 연결 오류',
}
const MENU_STATUS_COLORS = {
  OK: 'bg-emerald-50 text-emerald-700',
  NO_RECIPE: 'bg-amber-50 text-amber-700',
  INGREDIENT_ERROR: 'bg-rose-50 text-rose-700',
}

// 17장·18장: plannedMenuQuantity가 있어도 레시피가 없거나 ingredientId가 유효하지 않으면
// 조용히 넘기지 않고 메뉴별로 분명히 보여준다.
function MenuStatusList({ menuStatuses }) {
  if (menuStatuses.length === 0) return null
  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium text-slate-500">
            <th className="px-3 py-2">메뉴</th>
            <th className="px-3 py-2 text-right">계획수량</th>
            <th className="px-3 py-2">상태</th>
          </tr>
        </thead>
        <tbody>
          {menuStatuses.map((m) => (
            <tr key={m.menuId} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-800">{m.name}</td>
              <td className="px-3 py-2 text-right tabular-nums">{m.quantity}개</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MENU_STATUS_COLORS[m.status]}`}>
                  {MENU_STATUS_LABELS[m.status]}
                </span>
                {m.status === 'INGREDIENT_ERROR' && (
                  <span className="ml-1 text-[11px] text-rose-600">({m.missingIngredientIds.join(', ')})</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryPanel({ summary }) {
  const items = [
    { label: '준비계획 메뉴', value: `${summary.totalMenus}개` },
    { label: '레시피 연결', value: `${summary.recipeConnectedCount}개` },
    { label: '레시피 미등록', value: `${summary.noRecipeCount}개` },
    { label: '필요 식재료', value: `${summary.totalIngredients}종` },
    { label: '재고 부족 식재료', value: `${summary.stockShortCount}종` },
    { label: '재고 충분', value: `${summary.stockSufficientCount}종` },
    { label: '재고 미확인', value: `${summary.stockUnknownCount}종` },
  ]
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-500">예상 발주금액</p>
        <p className="mt-0.5 text-base font-bold text-slate-900">{formatWon(summary.totalAmount)}</p>
        {summary.missingPriceCount > 0 && (
          <p className="mt-1 text-xs text-amber-600">
            ⚠ 일부 식재료 가격 미등록 · {summary.missingPriceCount}종 — 위 금액은 완전한 총액이 아닙니다.
          </p>
        )}
      </div>
    </div>
  )
}

// 16장: 식재료 하나가 어떤 메뉴들 때문에 필요한지 펼쳐서 보여준다 — 복잡한 UI 없이
// 토글 한 번이면 충분하다.
function SourceBreakdown({ sources }) {
  const [open, setOpen] = useState(false)
  if (sources.length === 0) return null
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-[11px] font-medium text-blue-600 hover:underline">
        {open ? '▾ 메뉴별 내역 접기' : `▸ 메뉴 ${sources.length}개 내역 보기`}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
          {sources.map((s) => (
            <li key={s.menuId} className="flex justify-between gap-2">
              <span>{s.name}</span>
              <span className="tabular-nums">
                {s.display.value}
                {s.display.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OrderRow({ row, orderKey, onToggled }) {
  const entry = getOrderEntry(orderKey, row.ingredientId)
  const alreadyChecked = entry.checked === true

  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2 text-slate-800">
        {row.name}
        <SourceBreakdown sources={row.sources} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500">
        {row.requiredQuantity.value}
        {row.requiredQuantity.unit}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
        {row.actualQuantity.value}
        {row.actualQuantity.unit}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500">
        {row.stockStatus === 'OK' && row.currentStock ? (
          `${row.currentStock.value}${row.currentStock.unit}`
        ) : row.stockStatus === 'UNIT_MISMATCH' ? (
          <span className="text-amber-600">단위 확인 필요</span>
        ) : (
          <span className="text-amber-600">재고 미확인</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
        {row.purchaseNeeded.value}
        {row.purchaseNeeded.unit}
      </td>
      <td className="px-3 py-2 text-slate-500">{row.orderUnit}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">{row.orderQuantity}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
        {row.expectedAmount != null ? (
          formatWon(row.expectedAmount)
        ) : (
          <span className="font-normal text-amber-600">가격 미등록</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {alreadyChecked ? (
          <span className="text-[11px] font-medium text-slate-400">기존 발주계획 있음</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOrderChecked(orderKey, row.ingredientId, true)
              onToggled()
            }}
            className="rounded px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
          >
            발주계획 생성
          </button>
        )}
      </td>
    </tr>
  )
}

const MODE_OPTIONS = [
  { key: 'DAY', label: '하루' },
  { key: 'RANGE', label: '기간' },
]

// 작업지시서: 5-8의 plannedMenuQuantity(독립 판매메뉴 준비계획)를 기존 레시피·식재료·
// 재고 데이터와 연결해 실제 구매에 필요한 수량을 계산한다. 끼니 전체 식수 기반 발주
// (plannedPreparationCount, 기존 5-2/5-3)와는 완전히 분리된 별도 계산이다.
export default function MenuPlanOrderManagement() {
  const [mode, setMode] = useState('DAY')
  const [date, setDate] = useState(() => addDaysISO(todayISO(), 1))
  const [rangeStart, setRangeStart] = useState(() => addDaysISO(todayISO(), 1))
  const [rangeEnd, setRangeEnd] = useState(() => addDaysISO(todayISO(), 5))
  const [dataVersion, setDataVersion] = useState(0)

  const orderKey = mode === 'DAY' ? date : `${rangeStart}_to_${rangeEnd}`

  const entries = useMemo(() => {
    void dataVersion
    return mode === 'DAY' ? getMenuPlanEntriesForDate(date) : getMenuPlanEntriesInRange(rangeStart, rangeEnd)
  }, [mode, date, rangeStart, rangeEnd, dataVersion])

  const { rows, menuStatuses } = useMemo(() => calcMenuPlanOrder(entries), [entries])
  const summary = useMemo(() => summarizeMenuPlanOrder(menuStatuses, rows), [menuStatuses, rows])

  const hasCheckedRow = rows.some((row) => isOrderChecked(orderKey, row.ingredientId))

  const handleGenerateAll = () => {
    for (const row of rows) {
      if (!isOrderChecked(orderKey, row.ingredientId)) {
        setOrderChecked(orderKey, row.ingredientId, true)
      }
    }
    setDataVersion((v) => v + 1)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">메뉴 준비계획 발주</h2>
        <p className="mt-1 text-sm text-slate-500">
          5-8에서 확정한 메뉴별 준비계획(plannedMenuQuantity)을 레시피·식재료·재고 데이터와
          연결해 발주 필요수량을 계산합니다. 끼니 전체 준비인원(plannedPreparationCount)
          기반 발주와는 별개의 계산입니다 — 두 값을 섞지 않습니다.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-1.5">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold',
                mode === opt.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {mode === 'DAY' ? (
          <label className="text-sm text-slate-600">
            날짜{' '}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ml-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
        ) : (
          <>
            <label className="text-sm text-slate-600">
              시작{' '}
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="ml-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-sm text-slate-600">
              종료{' '}
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="ml-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </>
        )}
      </div>

      <SummaryPanel summary={summary} />
      <MenuStatusList menuStatuses={menuStatuses} />

      {hasCheckedRow && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          준비계획이 변경되었습니다. 발주계획을 확인하세요.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          이 기간에 저장된 메뉴별 준비계획이 없습니다. "메뉴별 준비계획" 화면에서 먼저 계획수량을 입력하세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">식재료</th>
                <th className="px-3 py-2 text-right">총 필요량</th>
                <th className="px-3 py-2 text-right">구매기준 필요량</th>
                <th className="px-3 py-2 text-right">현재재고</th>
                <th className="px-3 py-2 text-right">순 필요량</th>
                <th className="px-3 py-2">발주단위</th>
                <th className="px-3 py-2 text-right">발주수량</th>
                <th className="px-3 py-2 text-right">예상금액</th>
                <th className="px-3 py-2 text-center">발주계획</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <OrderRow key={row.ingredientId} row={row} orderKey={orderKey} onToggled={() => setDataVersion((v) => v + 1)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleGenerateAll}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            전체 발주계획 생성
          </button>
        </div>
      )}
    </div>
  )
}
