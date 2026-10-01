import { useState } from 'react'
import { getUnclassifiedMenus, updateMenu, deleteMenu } from '../../data/menuDatabase'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  MAIN_1_SUBCATEGORIES,
  MAIN_1_SUBCATEGORY_LABELS,
  MAIN_2_SUBCATEGORIES,
  MAIN_2_SUBCATEGORY_LABELS,
  SIDE_SUBCATEGORIES,
  SIDE_SUBCATEGORY_LABELS,
} from '../../data/menuTaxonomy'

function subcategoryOptionsFor(category) {
  if (category === 'MAIN_1') return MAIN_1_SUBCATEGORIES.map((k) => [k, MAIN_1_SUBCATEGORY_LABELS[k]])
  if (category === 'MAIN_2') return MAIN_2_SUBCATEGORIES.map((k) => [k, MAIN_2_SUBCATEGORY_LABELS[k]])
  if (category === 'SIDE') return SIDE_SUBCATEGORIES.map((k) => [k, SIDE_SUBCATEGORY_LABELS[k]])
  return []
}

// STEP 14 작업지시서 12장: 자동 분류(classifyMenu.js)가 카테고리를 확정하지 못해
// UNCLASSIFIED로 들어온 메뉴를 관리자가 한 건씩 정식 카테고리로 지정한다. 여기서 지정하기
// 전까지는 getMenusByCategory가 이 메뉴들을 돌려주지 않으므로 식단 생성에 쓰이지 않는다.
function UnclassifiedRow({ menu, onApplied }) {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [subcategory, setSubcategory] = useState(null)
  const subOptions = subcategoryOptionsFor(category)

  const handleCategoryChange = (next) => {
    setCategory(next)
    const opts = subcategoryOptionsFor(next)
    setSubcategory(opts.length > 0 ? opts[0][0] : null)
  }

  const handleApply = () => {
    updateMenu(menu.id, { category, subcategory })
    onApplied()
  }

  const handleDelete = () => {
    deleteMenu(menu.id)
    onApplied()
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{menu.id}</td>
      <td className="px-3 py-2.5 font-medium text-slate-800">
        {menu.name}
        {menu.source_count > 1 && (
          <span className="ml-1.5 text-xs font-normal text-slate-400">· {menu.source_count}회 발견</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          {subOptions.length > 0 && (
            <select
              value={subcategory || ''}
              onChange={(e) => setSubcategory(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
            >
              {subOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
          >
            적용
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function UnclassifiedMenuPanel() {
  const [menus, setMenus] = useState(() => getUnclassifiedMenus())

  const refresh = () => setMenus(getUnclassifiedMenus())

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">미분류 메뉴</h2>
        <p className="mt-1 text-sm text-slate-500">
          NEIS 가져오기에서 카테고리를 자동으로 판단하지 못한 메뉴입니다({menus.length}건). 정식
          카테고리를 지정해야 주간 식단 생성에 사용됩니다.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">메뉴명</th>
              <th className="px-3 py-2.5">분류 지정</th>
              <th className="px-3 py-2.5 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => (
              <UnclassifiedRow key={menu.id} menu={menu} onApplied={refresh} />
            ))}
            {menus.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">
                  미분류 메뉴가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
