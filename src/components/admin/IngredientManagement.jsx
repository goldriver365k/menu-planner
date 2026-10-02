import { useMemo, useState } from 'react'
import {
  getAllIngredients,
  addIngredient,
  updateIngredient,
  deleteIngredient,
} from '../../data/ingredientDatabase'
import { INGREDIENT_CATEGORIES, INGREDIENT_CATEGORY_LABELS } from '../../data/ingredientTaxonomy'
import { priceApiClient } from '../../services/priceApiClient'
import { nutritionApiClient } from '../../services/nutritionApiClient'
import IngredientFormModal from './IngredientFormModal'

export default function IngredientManagement() {
  const [ingredients, setIngredients] = useState(() => getAllIngredients())
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [editingIngredient, setEditingIngredient] = useState(null) // null | 'new' | ingredient
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [refreshingIds, setRefreshingIds] = useState(() => new Set())

  const refresh = () => setIngredients(getAllIngredients())

  const filtered = useMemo(() => {
    return ingredients.filter((i) => {
      if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false
      if (search.trim() && !i.name.includes(search.trim())) return false
      return true
    })
  }, [ingredients, search, categoryFilter])

  const handleSave = (formData) => {
    if (editingIngredient && editingIngredient !== 'new') {
      updateIngredient(editingIngredient.id, formData)
    } else {
      addIngredient(formData)
    }
    setEditingIngredient(null)
    refresh()
  }

  const handleDelete = (id) => {
    deleteIngredient(id)
    setConfirmDeleteId(null)
    refresh()
  }

  // 12장: 공공 식자재 가격/영양정보 API 갱신 — 현재는 모의(mock) 응답을 받아온다
  // (services/priceApiClient.js, nutritionApiClient.js 상단 주석 참고).
  const handleRefreshFromApi = async (ingredient) => {
    setRefreshingIds((prev) => new Set(prev).add(ingredient.id))
    try {
      const [priceResult, nutritionResult] = await Promise.all([
        priceApiClient.fetchIngredientPrice(ingredient.name, ingredient.calculation_price),
        nutritionApiClient.fetchNutritionInfo(ingredient.name, ingredient),
      ])
      updateIngredient(ingredient.id, {
        public_price: priceResult.price,
        price_source: priceResult.source,
        price_updated_at: priceResult.updatedAt,
        calories_per_100g: nutritionResult.calories_per_100g,
        protein: nutritionResult.protein,
        carbohydrate: nutritionResult.carbohydrate,
        fat: nutritionResult.fat,
        sodium: nutritionResult.sodium,
      })
      refresh()
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev)
        next.delete(ingredient.id)
        return next
      })
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">식재료 관리</h2>
          <p className="mt-1 text-sm text-slate-500">
            총 {ingredients.length}개 · 여기서 관리하는 단가·영양정보는 메뉴의 "레시피"에 연결해 참고용
            원가·칼로리를 계산하는 데 쓰입니다.
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
          {INGREDIENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {INGREDIENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        "공공데이터 갱신"은 현재 모의(mock) 응답입니다 — 실제 공공 API 연동 방법은 관리자 &gt; 설정을
        참고하세요.
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">식재료명</th>
              <th className="px-3 py-2.5">분류</th>
              <th className="px-3 py-2.5">구매가</th>
              <th className="px-3 py-2.5">계산단가</th>
              <th className="px-3 py-2.5">가격 출처 / 갱신일</th>
              <th className="px-3 py-2.5 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ingredient) => {
              const isRefreshing = refreshingIds.has(ingredient.id)
              return (
                <tr key={ingredient.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{ingredient.id}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{ingredient.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {INGREDIENT_CATEGORY_LABELS[ingredient.category]}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">
                    {ingredient.purchase_price.toLocaleString('ko-KR')}원/{ingredient.purchase_unit}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">
                    {ingredient.calculation_price.toLocaleString('ko-KR')}원
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {ingredient.price_source || '—'}
                    <br />
                    {ingredient.price_updated_at || ''}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleRefreshFromApi(ingredient)}
                        disabled={isRefreshing}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:cursor-wait disabled:text-slate-300"
                      >
                        {isRefreshing ? '갱신 중…' : '공공데이터 갱신'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIngredient(ingredient)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        수정
                      </button>
                      {confirmDeleteId === ingredient.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(ingredient.id)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            삭제 확정
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(ingredient.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                  조건에 맞는 식재료가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingIngredient && (
        <IngredientFormModal
          ingredient={editingIngredient === 'new' ? null : editingIngredient}
          onSave={handleSave}
          onClose={() => setEditingIngredient(null)}
        />
      )}
    </div>
  )
}
