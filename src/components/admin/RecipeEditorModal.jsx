import { useState } from 'react'
import { getAllIngredients } from '../../data/ingredientDatabase'
import { setRecipeForMenu } from '../../data/recipeDatabase'
import { calcRecipeReferenceCost, calcRecipeReferenceCalories } from '../../logic/recipeCalc'

let lineKeySeq = 0
function newLine(ingredientId, quantity = 0, unit = 'g') {
  lineKeySeq += 1
  return { key: `line-${lineKeySeq}`, ingredient_id: ingredientId, quantity, unit }
}

export default function RecipeEditorModal({ menu, initialLines, onSave, onClose }) {
  const ingredients = getAllIngredients()
  const [lines, setLines] = useState(() =>
    initialLines.length > 0
      ? initialLines.map((l) => newLine(l.ingredient_id, l.quantity, l.unit))
      : [newLine(ingredients[0]?.id ?? '', 0, 'g')]
  )

  const updateLine = (key, patch) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const addLine = () => setLines((prev) => [...prev, newLine(ingredients[0]?.id ?? '', 0, 'g')])
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))

  const validLines = lines.filter((l) => l.ingredient_id && Number(l.quantity) > 0)
  const referenceCost = calcRecipeReferenceCost(validLines)
  const referenceCalories = calcRecipeReferenceCalories(validLines)

  const handleSubmit = (e) => {
    e.preventDefault()
    const saved = setRecipeForMenu(menu.id, validLines)
    onSave(saved)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6"
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-900">레시피 구성 · {menu.name}</h2>
        <p className="mb-4 text-sm text-slate-500">
          이 메뉴에 들어가는 식재료와 수량을 등록합니다. 여기서 계산되는 원가·칼로리는 참고용이며,
          메뉴의 기존 1인 원가·칼로리 값을 자동으로 바꾸지 않습니다.
        </p>

        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="flex items-center gap-2">
              <select
                value={line.ingredient_id}
                onChange={(e) => updateLine(line.key, { ingredient_id: e.target.value })}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.1"
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                className="w-20 rounded-xl border border-slate-300 px-2 py-2.5 text-right text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={line.unit}
                onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="개">개</option>
              </select>
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                삭제
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          + 재료 추가
        </button>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">레시피 기준 참고 원가</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {Math.round(referenceCost).toLocaleString('ko-KR')}원
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">레시피 기준 참고 칼로리</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {Math.round(referenceCalories)}kcal
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            취소
          </button>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
