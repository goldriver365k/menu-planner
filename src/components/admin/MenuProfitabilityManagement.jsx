import { useMemo, useState } from 'react'
import { getAllMenus, setMenuSalePrice } from '../../data/menuDatabase'
import {
  calcAllMenuProfitability,
  calcExpectedMenuProfitability,
  summarizeMenuProfitability,
  TARGET_COST_RATE,
  WARNING_COST_RATE,
  COST_RATE_STATUS_LABELS,
} from '../../logic/menuProfitability'
import { CATEGORY_LABELS } from '../../data/menuTaxonomy'

const COST_STATUS_LABELS = { NO_RECIPE: '레시피 미등록', UNAVAILABLE: '원가 계산불가' }
const COST_RATE_STATUS_COLORS = {
  GOOD: 'bg-emerald-50 text-emerald-700',
  CAUTION: 'bg-amber-50 text-amber-700',
  REVIEW: 'bg-rose-50 text-rose-700',
}

const SORT_OPTIONS = [
  { field: 'name', label: '메뉴명' },
  { field: 'salePrice', label: '판매가격' },
  { field: 'ingredientCost', label: '실제 원가' },
  { field: 'costRate', label: '원가율' },
  { field: 'ingredientProfit', label: '식재료 기준 이익' },
]

function formatWon(n) {
  if (n == null) return '—'
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

function compareRows(a, b, field, dir) {
  if (field === 'name') return dir * a.name.localeCompare(b.name, 'ko')
  const av = a[field]
  const bv = b[field]
  // 숫자 필드는 null(미등록/계산불가)을 정렬 방향과 무관하게 항상 맨 뒤로 보낸다.
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  return dir * (av - bv)
}

// STEP 5-6: 판매가격(sale_price) 전용 inline 입력 — IngredientMasterManagement.jsx의
// StockCell과 같은 패턴이다. 0(무료 제공)과 빈 값(판매가 미등록)을 구분한다.
function SalePriceCell({ menuId, salePrice, onSaved }) {
  const [input, setInput] = useState(() => (salePrice != null ? String(salePrice) : ''))
  const [error, setError] = useState('')

  const handleSave = () => {
    const res = setMenuSalePrice(menuId, input)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    onSaved()
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="판매가 미등록"
        className="w-24 rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-blue-500"
      />
      <button type="button" onClick={handleSave} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
        저장
      </button>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  )
}

// 작업지시서 10장·12장: plannedPreparationCount/expectedCount를 이 화면이 자동으로 알 수
// 없으므로(특정 날짜의 식단 화면이 아니라 전체 메뉴 목록이라서), 사람이 직접 인원을 입력해
// 미리보는 "예상" 계산이다 — 절대 "실제 판매이익"이라고 표시하지 않는다.
function ExpectedCell({ row }) {
  const [count, setCount] = useState('')

  if (!row.hasSalePrice || row.ingredientCost == null) {
    return <span className="text-xs text-slate-300">—</span>
  }

  const expected = calcExpectedMenuProfitability(row, count)

  return (
    <div className="flex flex-col gap-1">
      <input
        type="number"
        min="0"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        placeholder="준비계획/예상식수 인원"
        className="w-32 rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-blue-500"
      />
      {expected && (
        <div className="text-[11px] text-slate-500">
          예상 매출 {formatWon(expected.expectedRevenue)}
          <br />
          예상 식재료비 {formatWon(expected.expectedIngredientCost)}
          <br />
          예상 식재료 기준 이익 {formatWon(expected.expectedIngredientProfit)}
        </div>
      )}
    </div>
  )
}

function SummaryPanel({ summary }) {
  const items = [
    { label: '분석 가능 메뉴', value: `${summary.analyzableCount}개` },
    { label: '평균 원가율', value: summary.averageCostRate != null ? `${summary.averageCostRate}%` : '—' },
    { label: `${TARGET_COST_RATE}% 초과 메뉴`, value: `${summary.overTargetCount}개` },
    { label: `${WARNING_COST_RATE}% 초과 메뉴`, value: `${summary.overWarningCount}개` },
    { label: '레시피 미등록', value: `${summary.noRecipeCount}개` },
    { label: '판매가 미등록', value: `${summary.noSalePriceCount}개` },
  ]
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
        원가율 분포 — {TARGET_COST_RATE}% 이하 {summary.distribution.goodCount}개 · {TARGET_COST_RATE}~{WARNING_COST_RATE}%{' '}
        {summary.distribution.cautionCount}개 · {WARNING_COST_RATE}% 초과 {summary.distribution.reviewCount}개
      </p>
    </div>
  )
}

// 작업지시서: 메뉴 판매가격(5-6 신규 sale_price)과 5-5의 실제 매입단가 기반 원가 계산을
// 연결해 메뉴별 "식재료 기준 이익"을 보여준다. 인건비/임대료/카드수수료 등은 전혀 모르는
// 값이라 절대 "순이익"이라 부르지 않는다. 메뉴 삭제·가격변경을 자동으로 결정하지 않으며,
// "최고/최악 메뉴" 같은 판단도 하지 않는다 — 정렬·검색만 지원하는 참고용 분석 화면이다.
export default function MenuProfitabilityManagement() {
  const [menus, setMenus] = useState(() => getAllMenus())
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState(1)

  const refresh = () => setMenus(getAllMenus())

  const allRows = useMemo(() => calcAllMenuProfitability(menus), [menus])
  const summary = useMemo(() => summarizeMenuProfitability(allRows), [allRows])

  const rows = useMemo(() => {
    const filtered = search.trim() ? allRows.filter((r) => r.name.includes(search.trim())) : allRows
    return [...filtered].sort((a, b) => compareRows(a, b, sortField, sortDir))
  }, [allRows, search, sortField, sortDir])

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">메뉴 수익성</h2>
        <p className="mt-1 text-sm text-slate-500">
          판매가격이 등록된 메뉴만 원가율·식재료 기준 이익을 계산합니다. 인건비·임대료·카드
          수수료·부가세 등은 포함하지 않은 값이므로 순이익이 아니라 "식재료 기준 이익"입니다.
        </p>
      </div>

      <SummaryPanel summary={summary} />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="메뉴명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.field} value={opt.field}>
                정렬: {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => -d)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {sortDir === 1 ? '오름차순 ▲' : '내림차순 ▼'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">메뉴</th>
              <th className="px-3 py-2.5">카테고리</th>
              <th className="px-3 py-2.5">판매가</th>
              <th className="px-3 py-2.5">실제 원가</th>
              <th className="px-3 py-2.5">원가율</th>
              <th className="px-3 py-2.5">식재료 기준 이익</th>
              <th className="px-3 py-2.5">식재료 기준 이익률</th>
              <th className="px-3 py-2.5">예상(준비계획 인원 입력 시)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.menuId} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium text-slate-800">{row.name}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{CATEGORY_LABELS[row.category] || row.category}</td>
                <td className="px-3 py-2.5">
                  <SalePriceCell menuId={row.menuId} salePrice={row.salePrice} onSaved={refresh} />
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-700">
                  {row.costStatus === 'OK' ? (
                    <>
                      {formatWon(row.ingredientCost)}
                      {row.costConfidence === 'PARTIAL' && (
                        <span className="ml-1 text-[11px] font-medium text-amber-600">(일부 가격 미등록)</span>
                      )}
                    </>
                  ) : (
                    <span className="font-medium text-amber-600">{COST_STATUS_LABELS[row.costStatus]}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {row.costRate != null ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COST_RATE_STATUS_COLORS[row.costRateStatus]}`}>
                      {row.costRate}% · {COST_RATE_STATUS_LABELS[row.costRateStatus]}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">{row.hasSalePrice ? '원가 계산불가' : '판매가 미등록'}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 tabular-nums font-medium text-slate-900">{formatWon(row.ingredientProfit)}</td>
                <td className="px-3 py-2.5 tabular-nums text-slate-700">
                  {row.ingredientProfitRate != null ? `${row.ingredientProfitRate}%` : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <ExpectedCell row={row} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">
                  조건에 맞는 메뉴가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
