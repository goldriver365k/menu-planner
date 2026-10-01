import { useMemo, useState } from 'react'
import { DAYS, DAY_LABELS } from '../data/planConfig'
import { calcWeeklyIngredientRequirement } from '../logic/ingredientRequirement'

function RequirementTable({ rows }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">표준 레시피가 등록된 메뉴가 없어 계산할 식재료가 없습니다.</p>
  }
  return (
    <table className="w-full min-w-[420px] border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
          <th className="py-2 pr-4">식재료</th>
          <th className="py-2 pr-4">필요량</th>
          <th className="py-2">포장 환산</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.ingredientId}-${row.unit}`} className="border-b border-slate-100">
            <td className="py-2 pr-4 text-slate-800">{row.name}</td>
            <td className="py-2 pr-4 tabular-nums font-medium text-slate-900">
              {row.quantity}
              {row.unit}
            </td>
            <td className="py-2 tabular-nums text-slate-500">
              {row.packInfo
                ? `${row.packInfo.packCount}팩 (${row.packInfo.packSize}${row.packInfo.packUnit}/팩)`
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 작업지시서: 기존 Planner의 expectedCount로 식재료 총 필요량을 계산한다. 레시피가 없는
// 메뉴는 집계에서 조용히 빠진다(표준 레시피 화면에서 등록하면 다음 생성부터 반영된다) —
// 화면을 복잡하게 만들지 않기 위해 별도의 누락 안내는 추가하지 않았다.
export default function WeeklyIngredientRequirement({ weekMenu, operatingDays, mealsSettings }) {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('weekly') // 'weekly' | 'mon' | 'tue' | ...

  const result = useMemo(
    () => calcWeeklyIngredientRequirement(weekMenu, operatingDays, mealsSettings),
    [weekMenu, operatingDays, mealsSettings]
  )

  const rows = view === 'weekly' ? result.weekly : result.daily[view] || []

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div>
          <h2 className="text-base font-semibold text-slate-900">식재료 발주량</h2>
          <p className="mt-1 text-sm text-slate-500">
            끼니별 예상 식수와 표준 레시피를 기준으로 식재료 필요량을 계산합니다(1인분 레시피 ×
            식수, 수율 반영).
          </p>
        </div>
        <span className="text-sm font-medium text-slate-400">{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setView('weekly')}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold',
                view === 'weekly' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              주간 합계
            </button>
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                disabled={!operatingDays[day]}
                onClick={() => setView(day)}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-semibold',
                  view === day
                    ? 'bg-blue-600 text-white'
                    : operatingDays[day]
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'cursor-not-allowed bg-slate-50 text-slate-300',
                ].join(' ')}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <RequirementTable rows={rows} />
          </div>
        </div>
      )}
    </section>
  )
}
