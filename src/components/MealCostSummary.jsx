import { calcMealFinancials } from '../logic/costOptimize'
import { formatWon, mealHasUnverifiedCost } from '../utils/mealCost'
import { calcMealRecipeCost } from '../logic/recipeCostCalc'

const CONFIDENCE_LABELS = { COMPLETE: '완료', PARTIAL: '부분', UNAVAILABLE: '계산불가' }

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
  // STEP 5-5(17장): 기존 예상매출/목표원가율/조정 계산(costOptimize.js)은 그대로 둔 채,
  // "실제 레시피+실제 매입단가" 기준의 1인 원가를 참고용으로 추가 표시만 한다 — 위 계산의
  // 어떤 값도 바꾸지 않는다(원가 초과 판정·조정 버튼 동작은 기존 cost_per_serving 기준 그대로).
  const recipeCost = calcMealRecipeCost(mealResult)

  if (f.expectedCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">
        예상 식수를 입력하면 예상 매출·원가율을 계산합니다.
      </div>
    )
  }

  const hasUnverifiedCost = mealHasUnverifiedCost(mealResult)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      {hasUnverifiedCost && (
        <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          ⚠ 원가 미등록 메뉴가 포함되어 있어 아래 원가는 실제보다 낮게 계산됐을 수 있습니다.
        </p>
      )}
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

      {recipeCost.costConfidence !== 'UNAVAILABLE' && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-400">
          레시피 기준 실제원가(참고): {formatWon(recipeCost.totalCost)} · 신뢰도 {CONFIDENCE_LABELS[recipeCost.costConfidence]}
        </p>
      )}

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
