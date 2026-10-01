import { useMemo, useState } from 'react'
import { getAllMealCountRecords } from '../../data/mealCountRecords'
import { getMenuMealCountStats } from '../../logic/menuMealCountStats'
import { MEAL_TYPES, MEAL_LABELS } from '../../data/planConfig'
import { CATEGORY_LABELS } from '../../data/menuTaxonomy'

const PERIODS = [
  { key: 'recent4w', label: '최근 4주', weeks: 4 },
  { key: 'all', label: '전체기간', weeks: null },
]

const SORT_OPTIONS = [
  { key: 'servedCount', label: '제공횟수' },
  { key: 'menuName', label: '메뉴명' },
  { key: 'diff', label: '기준 대비 차이' },
]

function fmtAvg(n) {
  return n == null ? '-' : `${n.toFixed(1)}명`
}

function fmtDiff(n) {
  if (n == null) return '-'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}명`
}

function fmtRate(n) {
  if (n == null) return '-'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

// STEP 4-3: "메뉴별 분석" — 4-1 기록 + 4-2 요일/끼니 기준평균으로 메뉴별 기준 대비 차이를
// 보여준다. 분석 결과는 저장하지 않고 매번 원본 기록에서 다시 계산한다(11장).
export default function MenuMealCountAnalysis() {
  const [mealType, setMealType] = useState('lunch')
  const [periodKey, setPeriodKey] = useState('recent4w')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('servedCount')
  const [sortDesc, setSortDesc] = useState(true)

  const period = PERIODS.find((p) => p.key === periodKey) || PERIODS[0]

  const rows = useMemo(() => {
    const records = getAllMealCountRecords()
    const stats = getMenuMealCountStats(records, mealType, { weeks: period.weeks })
    const filtered = search.trim() ? stats.filter((r) => r.menuName.includes(search.trim())) : stats

    // 기본 JavaScript 정렬만 사용한다(10장) — 메뉴명은 가나다순, 그 외는 숫자 비교.
    const sorted = [...filtered].sort((a, b) =>
      sortKey === 'menuName' ? a.menuName.localeCompare(b.menuName, 'ko') : (a[sortKey] ?? 0) - (b[sortKey] ?? 0)
    )
    if (sortDesc) sorted.reverse()
    return sorted
  }, [mealType, period.weeks, search, sortKey, sortDesc])

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">메뉴별 분석</h3>
        <p className="mt-1 text-sm text-slate-500">
          해당 메뉴가 포함된 식단의 "요일·끼니 기준 대비 차이"입니다. 식수가 높았던 날 그
          메뉴가 포함되어 있었다고 해서 그 메뉴 때문에 식수가 늘었다고 단정할 수 없습니다 —
          참고용 비교 수치입니다.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => setMealType(mt)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold',
                mealType === mt ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {MEAL_LABELS[mt]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriodKey(p.key)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold',
                periodKey === p.key ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="메뉴명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-48"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label} 정렬
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortDesc((v) => !v)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          {sortDesc ? '내림차순' : '오름차순'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">메뉴</th>
              <th className="px-3 py-2.5">분류</th>
              <th className="px-3 py-2.5">제공횟수</th>
              <th className="px-3 py-2.5">평균식수</th>
              <th className="px-3 py-2.5">기준평균</th>
              <th className="px-3 py-2.5">기준 대비 차이</th>
              <th className="px-3 py-2.5">변화율</th>
              <th className="px-3 py-2.5">표본</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.menuId} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">{row.menuName}</td>
                <td className="px-3 py-2 text-slate-500">{row.category ? CATEGORY_LABELS[row.category] || row.category : '-'}</td>
                <td className="px-3 py-2 tabular-nums text-slate-700">{row.servedCount}</td>
                <td className="px-3 py-2 tabular-nums text-slate-700">{fmtAvg(row.avgActual)}</td>
                <td className="px-3 py-2 tabular-nums text-slate-500">{fmtAvg(row.baselineAvg)}</td>
                <td
                  className={[
                    'px-3 py-2 tabular-nums font-medium',
                    row.diff > 0 ? 'text-emerald-600' : row.diff < 0 ? 'text-rose-600' : 'text-slate-500',
                  ].join(' ')}
                >
                  {fmtDiff(row.diff)}
                </td>
                <td className="px-3 py-2 tabular-nums text-slate-500">{fmtRate(row.changeRatePercent)}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{row.sampleSizeLabel}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">
                  해당 끼니·기간에 분석할 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
