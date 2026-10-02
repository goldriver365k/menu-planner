import { useState } from 'react'
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_CATEGORY_LABELS,
  PURCHASE_UNITS,
} from '../../data/ingredientTaxonomy'
import { ALLERGEN_LABELS } from '../../data/menuTaxonomy'

function emptyForm() {
  return {
    name: '',
    category: 'VEGETABLE',
    purchase_unit: 'kg',
    public_price: '',
    purchase_price: '',
    calculation_price: '',
    price_source: '관리자 입력',
    calories_per_100g: '',
    protein: '',
    carbohydrate: '',
    fat: '',
    sodium: '',
    allergens: [],
  }
}

export default function IngredientFormModal({ ingredient, onSave, onClose }) {
  const [form, setForm] = useState(() => (ingredient ? { ...ingredient } : emptyForm()))
  const isEdit = Boolean(ingredient)

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const toggleAllergen = (key) => {
    setForm((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(key)
        ? prev.allergens.filter((a) => a !== key)
        : [...prev.allergens, key],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({ ...form, price_updated_at: new Date().toISOString().slice(0, 10) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isEdit ? '식재료 수정' : '새 식재료 추가'}
        </h2>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">식재료명</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">분류</span>
              <select
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {INGREDIENT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">구매 단위</span>
              <select
                value={form.purchase_unit}
                onChange={(e) => update({ purchase_unit: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {PURCHASE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">구매가 (원, 구매단위당)</span>
              <input
                type="number"
                min="0"
                value={form.purchase_price}
                onChange={(e) => update({ purchase_price: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                레시피 계산단가 (원, 1{form.purchase_unit === 'kg' || form.purchase_unit === 'L' ? 'g/ml' : form.purchase_unit}당)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.calculation_price}
                onChange={(e) => update({ calculation_price: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">공공 데이터 참고가 (원, 선택)</span>
            <input
              type="number"
              min="0"
              value={form.public_price}
              onChange={(e) => update({ public_price: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">칼로리 (100g당 kcal)</span>
              <input
                type="number"
                min="0"
                value={form.calories_per_100g}
                onChange={(e) => update({ calories_per_100g: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">나트륨 (100g당 mg)</span>
              <input
                type="number"
                min="0"
                value={form.sodium}
                onChange={(e) => update({ sodium: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">단백질(g)</span>
              <input
                type="number"
                min="0"
                value={form.protein}
                onChange={(e) => update({ protein: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">탄수화물(g)</span>
              <input
                type="number"
                min="0"
                value={form.carbohydrate}
                onChange={(e) => update({ carbohydrate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">지방(g)</span>
              <input
                type="number"
                min="0"
                value={form.fat}
                onChange={(e) => update({ fat: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-600">알레르기</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ALLERGEN_LABELS).map(([key, label]) => {
                const checked = form.allergens.includes(key)
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleAllergen(key)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-xs font-medium',
                      checked
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
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
