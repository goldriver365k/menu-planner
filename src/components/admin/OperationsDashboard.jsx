import { Component, useMemo } from 'react'
import { buildOperationsDashboard } from '../../logic/operationsDashboard'

function formatWon(n) {
  if (n == null) return '데이터 없음'
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

// 32장: 섹션 계산은 operationsDashboard.js의 safely()가 이미 막아주지만, 렌더링 쪽에서
// 예상 못한 오류가 나도 관리자 화면 전체가 하얗게 죽지 않도록 한 번 더 감싼다.
class DashboardErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(err) {
    console.warn('대시보드 렌더링 중 오류가 발생했습니다.', err)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600">
          데이터 확인 필요 — 대시보드를 표시하는 중 오류가 발생했습니다.
        </div>
      )
    }
    return this.props.children
  }
}

function Card({ label, value, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        'rounded-xl border border-slate-200 bg-white p-4 text-left',
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm' : 'cursor-default',
      ].join(' ')}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </button>
  )
}

const SEVERITY_LABELS = { REVIEW: '확인 필요', CAUTION: '주의', INFO: '정보' }
const SEVERITY_COLORS = {
  REVIEW: 'bg-rose-50 text-rose-700',
  CAUTION: 'bg-amber-50 text-amber-700',
  INFO: 'bg-slate-100 text-slate-500',
}

function TodoList({ todos, onNavigate }) {
  if (todos.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">오늘 특별히 확인할 사항이 없습니다.</p>
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {todos.map((todo) => (
        <li key={todo.id}>
          <button
            type="button"
            onClick={() => onNavigate(todo.target)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
          >
            <span className="text-sm text-slate-700">⚠ {todo.label}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[todo.severity]}`}>
              {SEVERITY_LABELS[todo.severity]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function RecentSalesTable({ rows }) {
  const hasAny = rows.some((r) => r.hasData)
  if (!hasAny) {
    return <p className="py-4 text-center text-sm text-slate-400">최근 7일간 저장된 판매 기록이 없습니다.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium text-slate-500">
            <th className="px-3 py-2">날짜</th>
            <th className="px-3 py-2 text-right">판매수량</th>
            <th className="px-3 py-2 text-right">매출</th>
            <th className="px-3 py-2 text-right">식재료비</th>
            <th className="px-3 py-2 text-right">식재료 기준 이익</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-700">{row.date.slice(5)}</td>
              {row.hasData ? (
                <>
                  <td className="px-3 py-2 text-right tabular-nums">{row.totalQuantity}개</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatWon(row.totalRevenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatWon(row.totalFoodCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatWon(row.totalIngredientProfit)}</td>
                </>
              ) : (
                <td className="px-3 py-2 text-center text-slate-400" colSpan={4}>
                  데이터 없음
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DashboardContent({ onNavigate }) {
  const dashboard = useMemo(() => buildOperationsDashboard(), [])
  const { mealPlanSummary, salesSummary, menuPlanOrder, orderReceiving, inventoryAndCost, recentSales, todos } = dashboard

  const mealPlanValue =
    mealPlanSummary == null
      ? '미입력'
      : mealPlanSummary
          .map((m) => `${m.label} ${m.plannedPreparationCount != null ? `${m.plannedPreparationCount}명` : '미입력'}`)
          .join(' · ')

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">오늘 운영 현황 · {dashboard.date}</h2>
        <p className="mt-1 text-sm text-slate-500">
          지금까지 입력된 데이터를 모아 보여주는 화면입니다. 숫자 자체를 새로 계산하지 않고
          기존 화면들이 쓰는 함수를 그대로 가져와 모았습니다.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="식단 준비(단체급식)" value={mealPlanValue} onClick={() => onNavigate('mealCountStats')} />
        <Card
          label="메뉴 판매계획"
          value={menuPlanOrder ? `${menuPlanOrder.menuStatuses.length}개 메뉴` : '미입력'}
          onClick={() => onNavigate('menuProductionPlan')}
        />
        <Card
          label="예상 발주금액"
          value={menuPlanOrder ? formatWon(menuPlanOrder.summary.totalAmount) : '데이터 없음'}
          sub={menuPlanOrder?.summary.missingPriceCount > 0 ? '일부 식재료 가격 미등록' : null}
          onClick={() => onNavigate('menuPlanOrder')}
        />
        <Card
          label="입고대기"
          value={orderReceiving ? `${orderReceiving.pendingCount}건` : '데이터 없음'}
          onClick={() => onNavigate('menuPlanOrder')}
        />
        <Card
          label="판매수량(독립 메뉴)"
          value={salesSummary ? `${salesSummary.totalQuantity}개` : '미입력'}
          onClick={() => onNavigate('salesRecords')}
        />
        <Card label="오늘 매출" value={salesSummary ? formatWon(salesSummary.totalRevenue) : '데이터 없음'} onClick={() => onNavigate('salesRecords')} />
        <Card
          label="식재료비"
          value={salesSummary ? formatWon(salesSummary.totalFoodCost) : '데이터 없음'}
          onClick={() => onNavigate('salesRecords')}
        />
        <Card
          label="식재료 기준 이익"
          value={salesSummary ? formatWon(salesSummary.totalIngredientProfit) : '데이터 없음'}
          onClick={() => onNavigate('salesRecords')}
        />
      </div>

      <div className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">오늘 할 일</h3>
        <TodoList todos={todos} onNavigate={onNavigate} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">발주 현황</h3>
          {orderReceiving ? (
            <ul className="space-y-1 text-sm text-slate-600">
              <li>발주예정 {menuPlanOrder ? menuPlanOrder.uncheckedCount : '데이터 없음'}종</li>
              <li>발주완료(입고전) {orderReceiving.orderedCount}건</li>
              <li>부분입고 {orderReceiving.partialCount}건</li>
              <li>입고완료 {orderReceiving.receivedCount}건</li>
              <li className="pt-1 text-xs text-slate-400">실제 발주금액 {formatWon(orderReceiving.actualAmount)}(기록된 입고만)</li>
            </ul>
          ) : (
            <p className="text-sm text-slate-400">데이터 없음</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">재고 현황(오늘 준비계획 기준)</h3>
          {inventoryAndCost.error ? (
            <p className="text-sm text-rose-600">데이터 확인 필요</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-600">
              <li>재고 정상 {menuPlanOrder ? inventoryAndCost.stockOkCount : '데이터 없음'}{menuPlanOrder ? '종' : ''}</li>
              <li>재고 부족 {menuPlanOrder ? inventoryAndCost.stockShortCount : '데이터 없음'}{menuPlanOrder ? '종' : ''}</li>
              <li>재고 미확인 {menuPlanOrder ? inventoryAndCost.stockUnknownForTodayCount : '데이터 없음'}{menuPlanOrder ? '종' : ''}</li>
              <li>실사 점검 필요 {inventoryAndCost.varianceReviewCount}종(실사 기록 {inventoryAndCost.varianceCountedTotal}종 중)</li>
            </ul>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">원가 등록 현황(전체)</h3>
        {inventoryAndCost.error ? (
          <p className="text-sm text-rose-600">데이터 확인 필요</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
            <button type="button" onClick={() => onNavigate('standardRecipe')} className="text-left hover:underline">
              레시피 미등록 메뉴 {inventoryAndCost.noRecipeMenuCount}개
            </button>
            <button type="button" onClick={() => onNavigate('ingredientMaster')} className="text-left hover:underline">
              가격 미등록 식재료 {inventoryAndCost.noPriceCount}개
            </button>
            <button type="button" onClick={() => onNavigate('ingredientMaster')} className="text-left hover:underline">
              재고 미등록 식재료 {inventoryAndCost.noStockCount}개
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">최근 7일 요약</h3>
        <RecentSalesTable rows={recentSales} />
      </div>
    </div>
  )
}

// 작업지시서: 관리자 첫 화면에서 "오늘 얼마나 준비하고, 얼마나 팔렸고, 매출/식재료비는
// 얼마고, 발주·입고·재고에 문제가 있는지, 오늘 입력 안 한 게 뭔지"를 10초 안에 알 수
// 있게 한다. 새로운 원가/발주/판매/재고 계산을 만들지 않고 기존 함수만 모아서 보여준다.
export default function OperationsDashboard({ onNavigate }) {
  return (
    <DashboardErrorBoundary>
      <DashboardContent onNavigate={onNavigate} />
    </DashboardErrorBoundary>
  )
}
