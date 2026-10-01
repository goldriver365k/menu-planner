import { calcWeeklyFinancials } from '../logic/weeklyFinancials'
import { formatWon } from '../utils/mealCost'
import { evaluateWeekProteinBalance } from '../logic/menuQualityEngine'

function SummaryStat({ label, value, warn = false }) {
  return (
    <div className="rounded-xl bg-white p-3 sm:p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={['mt-1 text-lg font-bold tabular-nums sm:text-xl', warn ? 'text-amber-600' : 'text-slate-900'].join(' ')}>
        {value}
      </p>
    </div>
  )
}

export default function WeeklySummary({ weekMenu, operatingDays, mealsSettings, costRate }) {
  const f = calcWeeklyFinancials(weekMenu, operatingDays, mealsSettings, costRate)
  const overBudget = f.totalIngredientCost > f.totalTargetIngredientCost
  const proteinBalance = evaluateWeekProteinBalance(weekMenu)

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-slate-900">주간 요약</h2>
      {f.hasUnverifiedCost && (
        <p className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
          ⚠ 이번 주 식단에 원가 미등록(NEIS) 메뉴가 포함되어 있어 아래 원가 관련 수치는 실제보다
          낮게 계산됐을 수 있습니다.
        </p>
      )}
      {proteinBalance.warnings.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-lg bg-white px-3 py-2">
          {proteinBalance.warnings.map((w) => (
            <li key={w} className="text-xs text-amber-600">
              {w}
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryStat label="주간 예상 총 식수" value={`${f.totalExpectedCount.toLocaleString('ko-KR')}명`} />
        <SummaryStat label="주간 예상 총 매출" value={formatWon(f.totalExpectedRevenue)} />
        <SummaryStat label="주간 목표 식재료비" value={formatWon(f.totalTargetIngredientCost)} />
        <SummaryStat
          label="주간 예상 식재료비"
          value={formatWon(Math.round(f.totalIngredientCost))}
          warn={overBudget}
        />
        <SummaryStat
          label="예상 평균 원가율"
          value={`${f.averageCostRate.toFixed(1)}%`}
          warn={overBudget}
        />
      </div>
    </section>
  )
}
