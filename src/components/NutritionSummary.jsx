import { calcMealTotalCalories, collectMealAllergens } from '../utils/mealNutrition'
import AllergenBadges from './AllergenBadges'

export default function NutritionSummary({ mealResult }) {
  const totalCalories = calcMealTotalCalories(mealResult)
  const allergens = collectMealAllergens(mealResult)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-slate-500">예상 총 열량</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{totalCalories}kcal</span>
      </div>
      {allergens.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <p className="mb-1.5 text-xs text-slate-500">포함된 알레르기 유발물질</p>
          <AllergenBadges allergens={allergens} size="md" />
        </div>
      )}
    </div>
  )
}
