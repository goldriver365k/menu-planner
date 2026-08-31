import { useState } from 'react'
import { buildMealSlotRoles, isSideRole, getItemAtRole, buildSlotKey } from '../logic/menuSlots'
import { getReplacementCandidates } from '../logic/replaceMenu'
import { buildExcludedIdSet } from '../data/menuHistory'
import AllergenBadges from './AllergenBadges'

const ROLE_LABELS_BASE = { rice: '밥', main1: '1차 메인', main2: '2차 메인', kimchi: '김치' }

function roleLabel(role, item) {
  if (role === 'soupOrStew') return item.category === 'SOUP' ? '국' : '찌개'
  if (isSideRole(role)) return '반찬'
  return ROLE_LABELS_BASE[role]
}

export default function EditableMealDetail({
  day,
  mealType,
  result,
  date,
  history,
  lockedSlotKeys,
  onToggleLock,
  onReplace,
}) {
  const [openRole, setOpenRole] = useState(null)
  const [candidates, setCandidates] = useState([])

  if (!result) return null

  const roles = buildMealSlotRoles(result.sides.length)

  const handleReplaceClick = (role) => {
    const currentItem = getItemAtRole(result, role)
    const excludedIds = buildExcludedIdSet(history, date)
    setCandidates(getReplacementCandidates(role, currentItem, excludedIds, 3))
    setOpenRole(role)
  }

  const handlePick = (role, item) => {
    onReplace(day, mealType, role, item)
    setOpenRole(null)
    setCandidates([])
  }

  return (
    <div className="divide-y divide-slate-100">
      {roles.map((role) => {
        const item = getItemAtRole(result, role)
        const slotKey = buildSlotKey(day, mealType, role)
        const locked = lockedSlotKeys.has(slotKey)
        const isOpen = openRole === role

        return (
          <div key={role} className="py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="w-14 shrink-0 text-xs font-medium text-slate-400">
                {roleLabel(role, item)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-slate-800">{item.name}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs tabular-nums text-slate-400">{item.calories}kcal</span>
                  <AllergenBadges allergens={item.allergens} />
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleLock(day, mealType, role)}
                  aria-pressed={locked}
                  className={[
                    'rounded-lg px-2 py-1 text-xs font-medium',
                    locked
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {locked ? '잠금 해제' : '잠금'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReplaceClick(role)}
                  disabled={locked}
                  className={[
                    'rounded-lg px-2 py-1 text-xs font-medium',
                    locked
                      ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                  ].join(' ')}
                >
                  교체
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
                {candidates.length === 0 && (
                  <span className="text-xs text-slate-400">대체 가능한 메뉴가 없습니다.</span>
                )}
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePick(role, c)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-600"
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOpenRole(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
