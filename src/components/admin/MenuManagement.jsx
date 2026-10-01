import { useMemo, useState } from 'react'
import {
  getAllMenus,
  addMenu,
  updateMenu,
  deleteMenu,
  setMenuActive,
} from '../../data/menuDatabase'
import { getRecipeForMenu, menuHasRecipe } from '../../data/recipeDatabase'
import { CATEGORIES, CATEGORY_LABELS } from '../../data/menuTaxonomy'
import MenuFormModal from './MenuFormModal'
import RecipeEditorModal from './RecipeEditorModal'

export default function MenuManagement() {
  const [menus, setMenus] = useState(() => getAllMenus())
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [editingMenu, setEditingMenu] = useState(null) // null | 'new' | menu object
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [recipeMenu, setRecipeMenu] = useState(null) // menu object whose recipe is being edited

  const refresh = () => setMenus(getAllMenus())

  const filtered = useMemo(() => {
    return menus.filter((m) => {
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false
      if (search.trim() && !m.name.includes(search.trim())) return false
      return true
    })
  }, [menus, search, categoryFilter])

  const handleSave = (formData) => {
    if (editingMenu && editingMenu !== 'new') {
      updateMenu(editingMenu.id, formData)
    } else {
      addMenu(formData)
    }
    setEditingMenu(null)
    refresh()
  }

  const handleToggleActive = (menu) => {
    setMenuActive(menu.id, !(menu.active !== false))
    refresh()
  }

  const handleDelete = (id) => {
    deleteMenu(id)
    setConfirmDeleteId(null)
    refresh()
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">메뉴 관리</h2>
          <p className="mt-1 text-sm text-slate-500">
            총 {menus.length}개 · 여기서 추가/수정/삭제/사용중지한 메뉴는 이후 식단 자동 생성에 바로
            반영됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingMenu('new')}
          className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + 새 메뉴 추가
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="메뉴명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-48"
        >
          <option value="ALL">전체 카테고리</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">메뉴명</th>
              <th className="px-3 py-2.5">카테고리</th>
              <th className="px-3 py-2.5">1인 원가</th>
              <th className="px-3 py-2.5">상태</th>
              <th className="px-3 py-2.5 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((menu) => {
              const isActive = menu.active !== false
              return (
                <tr key={menu.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{menu.id}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    {menu.name}
                    {menu.source === 'NEIS' && (
                      <span className="ml-1.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600">
                        NEIS
                      </span>
                    )}
                    {menu.possibleDuplicate && (
                      <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                        중복 의심
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {CATEGORY_LABELS[menu.category] || menu.category}
                    {menu.subcategory ? ` · ${menu.subcategory}` : ''}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">
                    {menu.cost_per_serving == null
                      ? <span className="text-slate-400">원가 미등록</span>
                      : `${menu.cost_per_serving.toLocaleString('ko-KR')}원`}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400',
                      ].join(' ')}
                    >
                      {isActive ? '사용중' : '사용중지'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingMenu(menu)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipeMenu(menu)}
                        className={[
                          'rounded-lg px-2 py-1 text-xs font-medium',
                          menuHasRecipe(menu.id)
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-slate-500 hover:bg-slate-100',
                        ].join(' ')}
                      >
                        레시피{menuHasRecipe(menu.id) ? ' ✓' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(menu)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        {isActive ? '사용중지' : '재사용'}
                      </button>
                      {confirmDeleteId === menu.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(menu.id)}
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
                          onClick={() => setConfirmDeleteId(menu.id)}
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
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                  조건에 맞는 메뉴가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingMenu && (
        <MenuFormModal
          menu={editingMenu === 'new' ? null : editingMenu}
          onSave={handleSave}
          onClose={() => setEditingMenu(null)}
        />
      )}

      {recipeMenu && (
        <RecipeEditorModal
          menu={recipeMenu}
          initialLines={getRecipeForMenu(recipeMenu.id)}
          onSave={() => setRecipeMenu(null)}
          onClose={() => setRecipeMenu(null)}
        />
      )}
    </div>
  )
}
