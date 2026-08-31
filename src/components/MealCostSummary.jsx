import { calcMealFinancials } from '../logic/costOptimize'
import { formatWon } from '../utils/mealCost'

function Stat({ label, value, emphasize = false, warn = false }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={[
          'tabular-nums font-semibold',
          warn ? 'text-amber-600' : emphasize ? 'text-slate-900' : 'text-slate-700',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

export default function MealCostSummary({ mealResult, mealSetting, costRatePercent, onAdjust, canAdjust }) {
  const f = calcMealFinancials(mealResult, mealSetting, costRatePercent)

  if (f.expectedCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">
        예상 식수를 입력하면 예상 매출·원가율을 계산합니다.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="divide-y divide-slate-100">
        <Stat label="예상 식수" value={`${f.expectedCount.toLocaleString('ko-KR')}명`} />
        <Stat label="예상 매출" value={formatWon(f.expectedRevenue)} emphasize />
        <Stat label={`목표 식재료비 (원가율 ${costRatePercent}%)`} value={formatWon(f.targetIngredientCost)} />
        <Stat label="1인 예상원가" value={formatWon(Math.round(f.perServingCost))} warn={f.isOverBudget} />
        <Stat label="예상 총 식재료비" value={formatWon(Math.round(f.totalIngredientCost))} warn={f.isOverBudget} />
        <Stat
          label="예상 원가율"
          value={`${f.actualCostRate.toFixed(1)}%`}
          warn={f.isOverBudget}
          emphasize
        />
      </div>

      {f.isOverBudget && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-700">
            원가 초과 · 목표 대비 1인 +{formatWon(f.overAmount)}
          </p>
          {canAdjust && (
            <button
              type="button"
              onClick={onAdjust}
              className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              저원가 메뉴로 조정
            </button>
          )}
        </div>
      )}
    </div>
  )
}
