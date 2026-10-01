import { useState } from 'react'
import { getAllMenus } from '../../data/menuDatabase'
import { calcMenuRecipeCost } from '../../logic/recipeCostCalc'
import { CATEGORY_LABELS } from '../../data/menuTaxonomy'

const STATUS_LABELS = {
  NOT_FOUND: '식재료 없음',
  NO_PRICE: '가격 미등록',
  UNIT_MISMATCH: '단위 환산 불가',
}

function formatWon(n) {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

// 메뉴 하나를 검색해서 고르는 콤보박스. admin/StandardRecipeManagement.jsx의 MenuPicker와
// 모양은 같지만, 이 화면만 따로 떼어서 봐도 되도록 일부러 별도 파일로 복제해 뒀다(화면끼리
// 서로 의존하지 않게).
function MenuPicker({ menus, value, onPick }) {
  const [query, setQuery] = useState('')
  const matches = query.trim() ? menus.filter((m) => m.name.includes(query.trim())).slice(0, 20) : []

  return (
    <div className="relative">
      <input
        type="text"
        value={value ? value.name : query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (value) onPick(null)
        }}
        placeholder="메뉴명으로 검색 (예: 제육볶음)"
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

// STEP 17(메뉴 원가 계산): 표준 레시피(식재료별 1인분 사용량)와 식재료 마스터 DB의 구매단가를
// 연결해 메뉴 1인분 원가를 계산해서 보여준다. 여기서 계산한 값을 메뉴 DB의 cost_per_serving에
// 자동 반영하지 않는다 — 그건 관리자가 메뉴 관리 화면에서 직접 입력/수정하는 값이고, 이
// 화면은 "레시피 기준으로 보면 얼마인지" 참고용으로 보여주는 별개의 계산이다.
export default function MenuCostManagement() {
  const [menus] = useState(() => getAllMenus())
  const [selectedMenu, setSelectedMenu] = useState(null)

  const result = selectedMenu ? calcMenuRecipeCost(selectedMenu.id) : null

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">메뉴 원가 계산</h2>
        <p className="mt-1 text-sm text-slate-500">
          표준 레시피에 등록된 식재료 사용량과 식재료 마스터 DB의 구매가를 기준으로 메뉴
          1인분 원가를 계산합니다. kg↔g, L↔ml 기본 단위변환만 지원합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">메뉴 검색</span>
          <MenuPicker menus={menus} value={selectedMenu} onPick={setSelectedMenu} />
        </label>

        {!selectedMenu && <p className="mt-3 text-sm text-slate-400">원가를 확인할 메뉴를 검색해서 선택하세요.</p>}

        {selectedMenu && result?.status === 'NO_RECIPE' && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <p className="text-sm font-medium text-slate-600">{selectedMenu.name}</p>
            <p className="mt-1 text-sm text-amber-600">레시피 미등록</p>
            <p className="mt-1 text-xs text-slate-400">"표준 레시피" 화면에서 먼저 레시피를 등록하세요.</p>
          </div>
        )}

        {selectedMenu && result?.status === 'OK' && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">{selectedMenu.name} · 1인분 기준</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-medium text-slate-500">
                    <th className="px-3 py-2">식재료</th>
                    <th className="px-3 py-2">사용량</th>
                    <th className="px-3 py-2 text-right">원가</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line) => (
                    <tr key={line.ingredient_id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{line.ingredientName}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-500">
                        {line.quantity}
                        {line.unit}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.status === 'OK' ? (
                          <span className="text-slate-700">{formatWon(line.cost)}</span>
                        ) : (
                          <span className="font-medium text-amber-600">{STATUS_LABELS[line.status]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-3 py-2.5 text-slate-700" colSpan={2}>
                      식재료 원가 합계 (메뉴 1인분 원가)
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{formatWon(result.totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {result.hasIssue && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠ 일부 식재료의 원가를 계산할 수 없어(가격 미등록 또는 단위 환산 불가) 합계가
                실제보다 낮을 수 있습니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
