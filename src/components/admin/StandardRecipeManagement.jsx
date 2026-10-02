import { useState } from 'react'
import { getAllMenus } from '../../data/menuDatabase'
import { getActiveIngredientsMaster } from '../../data/ingredientMasterDatabase'
import { getStandardRecipeForMenu, saveStandardRecipeForMenu, menuHasStandardRecipe } from '../../data/standardRecipeDatabase'
import { CATEGORY_LABELS } from '../../data/menuTaxonomy'
import { PURCHASE_UNITS } from '../../data/ingredientTaxonomy'

let lineKeySeq = 0
function newLineKey() {
  lineKeySeq += 1
  return `line-${lineKeySeq}`
}

// 메뉴 하나를 검색해서 고르는 공용 콤보박스 — 메뉴 선택과 레시피 복사 대상 선택 양쪽에 쓴다.
function MenuPicker({ menus, value, placeholder, onPick }) {
  const [query, setQuery] = useState('')
  const matches = query.trim()
    ? menus.filter((m) => m.name.includes(query.trim())).slice(0, 20)
    : []

  return (
    <div className="relative">
      <input
        type="text"
        value={value ? value.name : query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (value) onPick(null)
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {!value && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(m)
                  setQuery('')
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="text-slate-800">{m.name}</span>
                <span className="text-xs text-slate-400">{CATEGORY_LABELS[m.category] || m.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// 선택된 메뉴 하나의 레시피 편집 화면. 부모가 menu.id를 key로 줘서 메뉴를 바꾸면 이 컴포넌트가
// 통째로 다시 마운트된다 — useEffect로 lines를 다시 불러오는 대신, 매번 "새 메뉴용 새
// 컴포넌트"로 취급해 useState 초기값에서 바로 그 메뉴의 기존 레시피를 읽어온다.
function RecipeEditor({ menu, menus, ingredients, onBack }) {
  const [lines, setLines] = useState(() =>
    getStandardRecipeForMenu(menu.id).map((l) => ({ key: newLineKey(), ingredient_id: l.ingredient_id, quantity: l.quantity, unit: l.unit }))
  )
  const [hasRecipe, setHasRecipe] = useState(() => menuHasStandardRecipe(menu.id))
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [copyTarget, setCopyTarget] = useState(null)
  const [copyMessage, setCopyMessage] = useState('')

  const ingredientMatches = ingredientQuery.trim()
    ? ingredients.filter((i) => i.name.includes(ingredientQuery.trim()) && !lines.some((l) => l.ingredient_id === i.id)).slice(0, 20)
    : []

  const addLine = (ingredient) => {
    setLines((prev) => [...prev, { key: newLineKey(), ingredient_id: ingredient.id, quantity: '', unit: ingredient.purchase_unit || 'g' }])
    setIngredientQuery('')
  }

  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))

  const ingredientName = (id) => ingredients.find((i) => i.id === id)?.name || id

  const handleSave = () => {
    saveStandardRecipeForMenu(menu.id, lines)
    setHasRecipe(menuHasStandardRecipe(menu.id))
    setSavedMessage('저장되었습니다.')
  }

  // 저장소에 이미 커밋된 레시피가 아니라 지금 화면에 보이는(아직 "레시피 저장"을 누르지
  // 않았을 수도 있는) lines를 그대로 복사한다 — 방금 추가했는데 저장은 안 누른 식재료가
  // 복사에서 빠지는 혼란을 피하기 위해서다.
  const handleCopy = () => {
    if (!copyTarget) return
    saveStandardRecipeForMenu(copyTarget.id, lines)
    setCopyMessage(`"${copyTarget.name}"(으)로 복사했습니다.`)
    setCopyTarget(null)
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {menu.name}
          <span className="ml-2 text-xs font-normal text-slate-400">
            {hasRecipe ? '등록된 레시피 있음' : '등록된 레시피 없음'} · 1인분 기준
          </span>
        </h3>
        <button type="button" onClick={onBack} className="text-xs font-medium text-slate-400 hover:text-slate-600">
          다른 메뉴 선택
        </button>
      </div>

      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
              {ingredientName(line.ingredient_id)}
            </span>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="사용량"
              value={line.quantity}
              onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
              className="w-24 rounded-xl border border-slate-300 px-2 py-2.5 text-right text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={line.unit}
              onChange={(e) => updateLine(line.key, { unit: e.target.value })}
              className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {PURCHASE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
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
        {lines.length === 0 && <p className="text-sm text-slate-400">아직 추가된 식재료가 없습니다.</p>}
      </div>

      <div className="relative mt-3">
        <input
          type="text"
          value={ingredientQuery}
          onChange={(e) => setIngredientQuery(e.target.value)}
          placeholder="식재료 검색 후 추가 (예: 돼지고기)"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {ingredientMatches.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {ingredientMatches.map((ing) => (
              <li key={ing.id}>
                <button
                  type="button"
                  onClick={() => addLine(ing)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="text-slate-800">{ing.name}</span>
                  <span className="text-xs text-slate-400">{ing.purchase_unit}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          레시피 저장
        </button>
        {savedMessage && <span className="text-sm text-emerald-600">{savedMessage}</span>}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="mb-2 text-sm font-medium text-slate-600">다른 메뉴로 레시피 복사</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:max-w-xs sm:flex-1">
            <MenuPicker
              menus={menus.filter((m) => m.id !== menu.id)}
              value={copyTarget}
              placeholder="복사할 대상 메뉴 검색"
              onPick={setCopyTarget}
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!copyTarget}
            className={[
              'shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold',
              copyTarget ? 'bg-slate-700 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-100 text-slate-300',
            ].join(' ')}
          >
            이 레시피를 선택한 메뉴로 복사
          </button>
        </div>
        {copyMessage && <p className="mt-2 text-sm text-emerald-600">{copyMessage}</p>}
      </div>
    </div>
  )
}

// STEP 16(표준 레시피): 메뉴 검색/선택 → 식재료 검색/추가 → 사용량·단위 입력 → 저장/복사.
// 1인분 기준 사용량을 저장한다. 원가 계산·발주량 계산 등은 이번 단계에서 다루지 않는다.
export default function StandardRecipeManagement() {
  const [menus] = useState(() => getAllMenus())
  const [ingredients] = useState(() => getActiveIngredientsMaster())
  const [selectedMenu, setSelectedMenu] = useState(null)

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">표준 레시피</h2>
        <p className="mt-1 text-sm text-slate-500">
          메뉴 하나에 들어가는 식재료와 1인분 기준 사용량을 등록합니다. 원가·발주량 계산은
          다음 단계에서 다룹니다.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">메뉴 검색</span>
          <MenuPicker menus={menus} value={selectedMenu} placeholder="메뉴명으로 검색 (예: 제육볶음)" onPick={setSelectedMenu} />
        </label>

        {!selectedMenu && <p className="mt-3 text-sm text-slate-400">레시피를 등록할 메뉴를 먼저 검색해서 선택하세요.</p>}

        {selectedMenu && (
          <RecipeEditor key={selectedMenu.id} menu={selectedMenu} menus={menus} ingredients={ingredients} onBack={() => setSelectedMenu(null)} />
        )}
      </div>
    </div>
  )
}
