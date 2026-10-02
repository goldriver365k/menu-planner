import { useMemo, useState } from 'react'
import { getAllMenus } from '../../data/menuDatabase'
import { calcMenuProfitability } from '../../logic/menuProfitability'
import { bulkUpsertSalesRecords, getSalesRecordsByDate } from '../../data/salesRecords'
import { getDailySummary, getMenuAccumulation } from '../../logic/salesAnalytics'
import { todayISO, addDaysISO } from '../../data/menuHistory'

function formatWon(n) {
  if (n == null) return '—'
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

const FOOD_COST_STATUS_LABELS = { NO_RECIPE: '레시피 미등록', UNAVAILABLE: '원가 계산불가' }

// STEP 5-7(4장·5장): 날짜의 "판매메뉴"(sale_price가 있는 메뉴, 5-6에서 만든 개념 재사용)
// 목록 + 판매수량 입력란만 보여준다. 입력은 최대한 단순하게 — 메뉴마다 저장 버튼을 두지
// 않고, 한 화면 전체를 한 번에 "오늘 판매수량 저장" 버튼으로 저장한다(6장).
// date별로 key를 줘서 날짜가 바뀌면 그날 이미 저장된 수량으로 입력칸이 다시 채워지게
// 리마운트한다(이 프로젝트에서 useEffect 대신 써 온 패턴).
function SalesInputTable({ date, menus, onSaved }) {
  const existingByMenu = useMemo(() => {
    const map = {}
    for (const r of getSalesRecordsByDate(date)) map[r.menuId] = r.quantity
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
    const entries = menus.map((menu) => {
      const profitability = calcMenuProfitability(menu)
      return {
        date,
        menuId: menu.id,
        quantity: inputs[menu.id],
        salePrice: menu.sale_price,
        unitFoodCost: profitability.ingredientCost,
        unitFoodCostStatus: profitability.costStatus,
        menuNameSnapshot: menu.name,
      }
    })
    const results = bulkUpsertSalesRecords(entries)
    const failed = results.filter((r) => !r.ok)
    setMessage(failed.length > 0 ? `${failed.length}건 저장 실패 — ${failed[0].reason}` : '오늘 판매수량이 저장되었습니다.')
    onSaved()
  }

  if (menus.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        판매가격이 등록된 메뉴가 없습니다. "메뉴 수익성" 화면에서 먼저 판매가를 입력하세요.
      </p>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">메뉴</th>
              <th className="px-3 py-2.5 text-right">판매가</th>
              <th className="px-3 py-2.5 text-right">판매수량</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => {
              const profitability = calcMenuProfitability(menu)
              return (
                <tr key={menu.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 text-slate-800">
                    {menu.name}
                    {profitability.costStatus !== 'OK' && (
                      <span className="ml-1 text-[11px] font-medium text-amber-600">
                        ({FOOD_COST_STATUS_LABELS[profitability.costStatus]})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatWon(menu.sale_price)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={inputs[menu.id]}
                      onChange={(e) => handleChange(menu.id, e.target.value)}
                      placeholder="미입력"
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-blue-500"
                    />
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
          오늘 판매수량 저장
        </button>
        {message && <span className="text-sm text-slate-500">{message}</span>}
      </div>
    </div>
  )
}

// 17장: 식재료비를 계산할 수 없어도(레시피 미등록/원가 계산불가) 매출은 그대로 보여주고,
// 식재료비만 "계산불가"로 분리해 표시한다. 15장: 메뉴가 menu DB에서 삭제돼도 기록은
// menuNameSnapshot으로 남아 사라지지 않는다.
function DailyRecordsTable({ summary }) {
  if (summary.records.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-400">이 날짜에 저장된 판매 기록이 없습니다.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium text-slate-500">
            <th className="px-3 py-2">메뉴</th>
            <th className="px-3 py-2 text-right">판매수량</th>
            <th className="px-3 py-2 text-right">매출</th>
            <th className="px-3 py-2 text-right">식재료비</th>
            <th className="px-3 py-2 text-right">식재료 기준 이익</th>
            <th className="px-3 py-2 text-right">원가율</th>
          </tr>
        </thead>
        <tbody>
          {summary.records.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-800">
                {r.displayName}
                {r.menuDeleted && <span className="ml-1 text-[11px] text-slate-400">(현재 메뉴 DB에서 삭제됨)</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{r.quantity}개</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatWon(r.revenue)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.foodCost != null ? (
                  formatWon(r.foodCost)
                ) : (
                  <span className="text-amber-600">{FOOD_COST_STATUS_LABELS[r.unitFoodCostStatus] || '계산불가'}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">{formatWon(r.ingredientProfit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.costRate != null ? `${r.costRate}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DailySummaryPanel({ summary }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">{summary.date} 요약</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <p className="text-xs text-slate-500">총 판매수량</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{summary.totalQuantity}개</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">총 매출</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatWon(summary.totalRevenue)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">총 식재료비</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatWon(summary.totalFoodCost)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">식재료 기준 이익</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatWon(summary.totalIngredientProfit)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">평균 원가율</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {summary.averageCostRate != null ? `${summary.averageCostRate}%` : '—'}
          </p>
        </div>
      </div>
      {summary.hasUnavailableCost && (
        <p className="mt-3 text-xs text-amber-600">
          ⚠ 일부 메뉴는 식재료비를 계산할 수 없어(레시피 미등록 등) 위 식재료비·이익 합계가 실제보다 낮을 수 있습니다.
        </p>
      )}
    </div>
  )
}

const PERIOD_OPTIONS = [
  { key: 'TODAY', label: '오늘', days: 1 },
  { key: '7D', label: '최근 7일', days: 7 },
  { key: '30D', label: '최근 30일', days: 30 },
]

const ACCUM_SORT_OPTIONS = [
  { field: 'name', label: '메뉴명' },
  { field: 'quantity', label: '판매수량' },
  { field: 'revenue', label: '매출' },
  { field: 'ingredientProfit', label: '식재료 기준 이익' },
  { field: 'costRate', label: '원가율' },
]

function compareAccumRows(a, b, field, dir) {
  if (field === 'name') return dir * a.name.localeCompare(b.name, 'ko')
  const av = a[field]
  const bv = b[field]
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  return dir * (av - bv)
}

// 12장·13장·22장: 기간(오늘/최근7일/최근30일)을 골라 메뉴별 누적 판매수량·매출·식재료비·
// 식재료 기준 이익·원가율을 정렬해서 본다. "최고/최악 메뉴" 같은 판단은 하지 않는다.
function MenuAccumulationSection({ dataVersion }) {
  const [periodKey, setPeriodKey] = useState('TODAY')
  const [sortField, setSortField] = useState('quantity')
  const [sortDir, setSortDir] = useState(-1)

  const period = PERIOD_OPTIONS.find((p) => p.key === periodKey)
  const endDate = todayISO()
  const startDate = addDaysISO(endDate, -(period.days - 1))

  const rows = useMemo(() => {
    // dataVersion은 계산에 쓰이지 않는다 — 판매 입력 화면에서 저장했을 때(LocalStorage가
    // 바뀌었지만 이 컴포넌트가 직접 구독하지 않는 값) 다시 계산하라는 신호로만 쓴다.
    void dataVersion
    const data = getMenuAccumulation(startDate, endDate)
    return [...data].sort((a, b) => compareAccumRows(a, b, sortField, sortDir))
  }, [startDate, endDate, sortField, sortDir, dataVersion])

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriodKey(p.key)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold',
                periodKey === p.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {ACCUM_SORT_OPTIONS.map((opt) => (
              <option key={opt.field} value={opt.field}>
                정렬: {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => -d)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {sortDir === 1 ? '오름차순 ▲' : '내림차순 ▼'}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">이 기간에 저장된 판매 기록이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">메뉴</th>
                <th className="px-3 py-2 text-right">판매수량</th>
                <th className="px-3 py-2 text-right">매출</th>
                <th className="px-3 py-2 text-right">식재료비</th>
                <th className="px-3 py-2 text-right">식재료 기준 이익</th>
                <th className="px-3 py-2 text-right">원가율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.menuId} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800">
                    {row.name}
                    {row.menuDeleted && <span className="ml-1 text-[11px] text-slate-400">(현재 메뉴 DB에서 삭제됨)</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.quantity}개</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatWon(row.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatWon(row.foodCost)}
                    {row.hasUnavailableCost && <span className="ml-1 text-[11px] text-amber-600">(일부 계산불가)</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">{formatWon(row.ingredientProfit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.costRate != null ? `${row.costRate}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 작업지시서: POS 연동 없이 관리자가 하루 판매수량을 직접 입력해 실제 매출/식재료비/
// 식재료 기준 이익/원가율을 확인한다. 판매 당시의 판매가격·원가를 snapshot으로 저장해,
// 이후 메뉴 가격이나 식재료 가격이 바뀌어도 과거 기록은 절대 다시 계산하지 않는다.
export default function SalesRecordManagement() {
  const [date, setDate] = useState(() => todayISO())
  const [dataVersion, setDataVersion] = useState(0)

  const menus = useMemo(() => {
    // dataVersion은 계산에 쓰이지 않는다 — 판매 입력 저장 시 sale_price 등 메뉴 데이터가
    // 바뀌었을 수 있다는 신호로만 재계산을 트리거한다.
    void dataVersion
    return getAllMenus()
  }, [dataVersion])
  const sellableMenus = useMemo(() => menus.filter((m) => m.sale_price != null && m.active !== false), [menus])

  const summary = useMemo(() => {
    void dataVersion
    return getDailySummary(date)
  }, [date, dataVersion])

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">실제 판매 입력</h2>
        <p className="mt-1 text-sm text-slate-500">
          판매가격이 등록된 메뉴(메뉴 수익성 화면에서 입력)에 한해 하루 판매수량을 직접
          입력합니다. 저장 당시의 판매가격·식재료 원가를 함께 기록해, 이후 가격이 바뀌어도
          과거 기록은 그대로 보존됩니다. 인건비·임대료 등은 포함하지 않으므로 결과는
          "식재료 기준 이익"입니다.
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

      <div className="mb-6">
        <SalesInputTable key={date} date={date} menus={sellableMenus} onSaved={() => setDataVersion((v) => v + 1)} />
      </div>

      <div className="mb-3">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">오늘 판매 기록</h3>
        <DailyRecordsTable summary={summary} />
      </div>

      <div className="mb-8">
        <DailySummaryPanel summary={summary} />
      </div>

      <hr className="mb-6 border-slate-200" />

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">메뉴별 기록 조회</h3>
        <MenuAccumulationSection dataVersion={dataVersion} />
      </div>
    </div>
  )
}
