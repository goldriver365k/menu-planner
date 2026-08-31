import { useState } from 'react'
import { generateDayMenu } from '../logic/generateMeal'
import { MEAL_LABELS, MEAL_TYPES } from '../data/planConfig'
import { MEAL_ICONS } from './MealIcons'
import MealMenuList from './MealMenuList'
import { calcMealReferenceCost, formatWon } from '../utils/mealCost'
import { calcMealTotalCalories } from '../utils/mealNutrition'

function MealResultCard({ mealType, result }) {
  const Icon = MEAL_ICONS[mealType]

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-400 sm:p-6">
        {MEAL_LABELS[mealType]}은(는) 운영하지 않도록 설정되어 있습니다.
      </div>
    )
  }

  const totalCost = calcMealReferenceCost(result)
  const totalCalories = calcMealTotalCalories(result)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Icon />
        </span>
        <h3 className="text-lg font-semibold text-slate-900">{MEAL_LABELS[mealType]}</h3>
      </div>

      <MealMenuList result={result} />

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-400">예상 총 열량</span>
        <span className="font-semibold tabular-nums text-slate-700">{totalCalories}kcal</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-slate-400">1인 예상 식재료 원가(참고용)</span>
        <span className="font-semibold tabular-nums text-slate-700">{formatWon(totalCost)}</span>
      </div>
    </div>
  )
}

export default function DailyMenuPreview({ mealsSettings }) {
  const [dayMenu, setDayMenu] = useState(null)

  const hasActiveMeal = MEAL_TYPES.some((m) => mealsSettings[m]?.isActive)

  const handleGenerate = () => setDayMenu(generateDayMenu(mealsSettings))

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">하루 메뉴 자동 생성 (테스트)</h2>
          <p className="mt-1 text-sm text-slate-500">
            위에서 설정한 끼니별 반찬 수를 기준으로 하루치 메뉴를 무작위로 구성합니다. 아직 14일 중복
            방지와 정확한 원가 계산은 적용되지 않은 미리보기입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!hasActiveMeal}
          className={[
            'shrink-0 rounded-xl px-6 py-3 text-sm font-semibold sm:text-base',
            hasActiveMeal
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'cursor-not-allowed bg-slate-200 text-slate-400',
          ].join(' ')}
        >
          {dayMenu ? '다시 생성' : '하루 메뉴 생성'}
        </button>
      </div>

      {!hasActiveMeal && (
        <p className="text-sm text-amber-600">운영 중인 끼니가 없습니다. 위에서 최소 한 끼를 켜주세요.</p>
      )}

      {dayMenu && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {MEAL_TYPES.map((mealType) => (
            <MealResultCard key={mealType} mealType={mealType} result={dayMenu[mealType]} />
          ))}
        </div>
      )}
    </section>
  )
}
