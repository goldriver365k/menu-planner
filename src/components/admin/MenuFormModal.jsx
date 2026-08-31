import { useState } from 'react'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  MAIN_1_SUBCATEGORIES,
  MAIN_1_SUBCATEGORY_LABELS,
  MAIN_2_SUBCATEGORIES,
  MAIN_2_SUBCATEGORY_LABELS,
  SIDE_SUBCATEGORIES,
  SIDE_SUBCATEGORY_LABELS,
  ALLERGEN_LABELS,
} from '../../data/menuTaxonomy'

function subcategoryOptionsFor(category) {
  if (category === 'MAIN_1') return MAIN_1_SUBCATEGORIES.map((k) => [k, MAIN_1_SUBCATEGORY_LABELS[k]])
  if (category === 'MAIN_2') return MAIN_2_SUBCATEGORIES.map((k) => [k, MAIN_2_SUBCATEGORY_LABELS[k]])
  if (category === 'SIDE') return SIDE_SUBCATEGORIES.map((k) => [k, SIDE_SUBCATEGORY_LABELS[k]])
  return []
}

function emptyForm() {
  return {
    name: '',
    category: 'SIDE',
    subcategory: 'STIRFRY',
    main_ingredient: '',
    cooking_method: '',
    cost_per_serving: '',
    calories: '',
    protein: '',
    carbohydrate: '',
    fat: '',
    allergens: [],
    active: true,
  }
}

export default function MenuFormModal({ menu, onSave, onClose }) {
  const [form, setForm] = useState(() => (menu ? { ...menu } : emptyForm()))
  const isEdit = Boolean(menu)
  const subOptions = subcategoryOptionsFor(form.category)

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const handleCategoryChange = (category) => {
    const opts = subcategoryOptionsFor(category)
    update({ category, subcategory: opts.length > 0 ? opts[0][0] : null })
  }

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
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isEdit ? '메뉴 수정' : '새 메뉴 추가'}
        </h2>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">메뉴명</span>
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
              <span className="mb-1 block text-sm font-medium text-slate-600">카테고리</span>
              <select
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">서브카테고리</span>
              <select
                value={form.subcategory || ''}
                onChange={(e) => update({ subcategory: e.target.value || null })}
                disabled={subOptions.length === 0}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
              >
                {subOptions.length === 0 && <option value="">해당 없음</option>}
                {subOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">주 재료</span>
              <input
                type="text"
                value={form.main_ingredient}
                onChange={(e) => update({ main_ingredient: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">조리법</span>
              <input
                type="text"
                value={form.cooking_method}
                onChange={(e) => update({ cooking_method: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">1인 원가 (원)</span>
              <input
                type="number"
                min="0"
                value={form.cost_per_serving}
                onChange={(e) => update({ cost_per_serving: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">칼로리 (kcal)</span>
              <input
                type="number"
                min="0"
                value={form.calories}
                onChange={(e) => update({ calories: e.target.value })}
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

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update({ active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-600">사용 중 (해제하면 메뉴 생성에서 제외)</span>
          </label>
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
