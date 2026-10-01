import { useState } from 'react'
import { INGREDIENT_MASTER_CATEGORIES, INGREDIENT_MASTER_CATEGORY_LABELS } from '../../data/ingredientMasterTaxonomy'
import { PURCHASE_UNITS } from '../../data/ingredientTaxonomy'

function emptyForm() {
  return {
    name: '',
    category: 'VEGETABLE',
    purchase_unit: 'kg',
    purchase_quantity: '',
    purchase_price: '',
    usable_yield: '',
    price_source: '관리자 입력',
    active: true,
  }
}

export default function IngredientMasterFormModal({ ingredient, onSave, onClose }) {
  const [form, setForm] = useState(() => (ingredient ? { ...ingredient } : emptyForm()))
  const isEdit = Boolean(ingredient)

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }))

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
                {INGREDIENT_MASTER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {INGREDIENT_MASTER_CATEGORY_LABELS[c]}
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
              <span className="mb-1 block text-sm font-medium text-slate-600">구매 수량 (단위당)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="예: 1"
                value={form.purchase_quantity}
                onChange={(e) => update({ purchase_quantity: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">구매가 (원, 위 수량 전체)</span>
              <input
                type="number"
                min="0"
                value={form.purchase_price}
                onChange={(e) => update({ purchase_price: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">수율 (%, 손질 후 사용 가능 비율)</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="기본값 100"
              value={form.usable_yield}
              onChange={(e) => update({ usable_yield: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="mt-1 block text-xs text-slate-400">
              비워두면 100%(손실 없음)로 저장됩니다. 예: 다듬고 나면 80%만 쓸 수 있으면 80 입력.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">가격 출처</span>
            <input
              type="text"
              value={form.price_source}
              onChange={(e) => update({ price_source: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update({ active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-600">사용 중</span>
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
