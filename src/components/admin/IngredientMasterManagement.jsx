import { useMemo, useState } from 'react'
import {
  getAllIngredientsMaster,
  addIngredientMaster,
  updateIngredientMaster,
  setIngredientMasterActive,
} from '../../data/ingredientMasterDatabase'
import { INGREDIENT_MASTER_CATEGORIES, INGREDIENT_MASTER_CATEGORY_LABELS } from '../../data/ingredientMasterTaxonomy'
import IngredientMasterFormModal from './IngredientMasterFormModal'

// 향후 레시피·원가 계산에 쓸 식재료 마스터 DB의 최소 관리 화면 — 추가/수정/비활성화/검색만
// 제공한다(삭제·발주량 계산·가격이력 등은 이번 단계에서 의도적으로 만들지 않았다).
export default function IngredientMasterManagement() {
  const [ingredients, setIngredients] = useState(() => getAllIngredientsMaster())
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [editingIngredient, setEditingIngredient] = useState(null) // null | 'new' | ingredient

  const refresh = () => setIngredients(getAllIngredientsMaster())

  const filtered = useMemo(() => {
    return ingredients.filter((i) => {
      if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false
      if (search.trim() && !i.name.includes(search.trim())) return false
      return true
    })
  }, [ingredients, search, categoryFilter])

  const handleSave = (formData) => {
    if (editingIngredient && editingIngredient !== 'new') {
      updateIngredientMaster(editingIngredient.id, { ...formData, updated_at: new Date().toISOString().slice(0, 10) })
    } else {
      addIngredientMaster(formData)
    }
    setEditingIngredient(null)
    refresh()
  }

  const handleToggleActive = (ingredient) => {
    setIngredientMasterActive(ingredient.id, !(ingredient.active !== false))
    refresh()
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">식재료 마스터 DB</h2>
          <p className="mt-1 text-sm text-slate-500">
            총 {ingredients.length}개 · 향후 레시피/원가 계산에 쓰일 식재료 구매 정보입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingIngredient('new')}
          className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + 새 식재료 추가
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="식재료명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-48"
        >
          <option value="ALL">전체 분류</option>
          {INGREDIENT_MASTER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {INGREDIENT_MASTER_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">식재료명</th>
              <th className="px-3 py-2.5">분류</th>
              <th className="px-3 py-2.5">구매가</th>
              <th className="px-3 py-2.5">수율</th>
              <th className="px-3 py-2.5">출처 / 갱신일</th>
              <th className="px-3 py-2.5">상태</th>
              <th className="px-3 py-2.5 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ingredient) => {
              const isActive = ingredient.active !== false
              return (
                <tr key={ingredient.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{ingredient.id}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{ingredient.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{INGREDIENT_MASTER_CATEGORY_LABELS[ingredient.category]}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">
                    {ingredient.purchase_price.toLocaleString('ko-KR')}원 / {ingredient.purchase_quantity}
                    {ingredient.purchase_unit}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">{ingredient.usable_yield}%</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {ingredient.price_source || '—'}
                    <br />
                    {ingredient.updated_at || ''}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400',
                      ].join(' ')}
                    >
                      {isActive ? '사용중' : '비활성화'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingIngredient(ingredient)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(ingredient)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        {isActive ? '비활성화' : '재사용'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">
                  {ingredients.length === 0 ? '등록된 식재료가 없습니다. "새 식재료 추가"로 시작하세요.' : '조건에 맞는 식재료가 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingIngredient && (
        <IngredientMasterFormModal
          ingredient={editingIngredient === 'new' ? null : editingIngredient}
          onSave={handleSave}
          onClose={() => setEditingIngredient(null)}
        />
      )}
    </div>
  )
}
