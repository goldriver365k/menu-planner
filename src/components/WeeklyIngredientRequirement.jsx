import { useMemo, useState } from 'react'
import { DAYS, DAY_LABELS, MEAL_TYPES, MEAL_LABELS } from '../data/planConfig'
import { calcWeeklyIngredientRequirement, getProcurementBaseCount } from '../logic/ingredientRequirement'
import { getMealCountRecord } from '../data/mealCountRecords'
import { addDaysISO } from '../data/menuHistory'

// STEP 5-2: 이 날짜의 끼니별로 어떤 기준(준비계획/예상 식수)으로 필요량을 계산했는지
// 보여준다. 주간 합계 보기는 여러 날짜·끼니가 섞여 기준이 하나로 정해지지 않을 수 있어
// 일별 보기에서만 표시한다.
function ProcurementBasisNote({ date, mealsSettings }) {
  if (!date) return null
  const items = MEAL_TYPES.filter((mealType) => mealsSettings[mealType]?.isActive).map((mealType) => {
    const plannedPreparationCount = getMealCountRecord(date, mealType)?.plannedPreparationCount
    const basis = getProcurementBaseCount({ plannedPreparationCount, expectedCount: mealsSettings[mealType]?.expectedCount })
    return { mealType, basis }
  })
  if (items.length === 0) return null

  return (
    <p className="mb-2 text-xs text-slate-500">
      발주 계산 기준:{' '}
      {items
        .map(({ mealType, basis }) =>
          basis.count == null
            ? `${MEAL_LABELS[mealType]} 발주 계산 기준 인원을 입력하세요`
            : `${MEAL_LABELS[mealType]} ${basis.count}${basis.source === 'plannedPreparationCount' ? '인분(준비계획)' : '명(예상 식수)'}`
        )
        .join(' · ')}
    </p>
  )
}

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
export default function WeeklyIngredientRequirement({ weekMenu, operatingDays, mealsSettings, weekStartDate, refreshToken }) {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('weekly') // 'weekly' | 'mon' | 'tue' | ...

  const result = useMemo(() => {
    // refreshToken은 계산에 쓰이지 않는다 — plannedPreparationCount가 LocalStorage에서
    // 바뀌었을 때(이 컴포넌트가 직접 구독하지 않는 값) 다시 계산하라는 신호로만 쓴다.
    void refreshToken
    return calcWeeklyIngredientRequirement(weekMenu, operatingDays, mealsSettings, weekStartDate)
  }, [weekMenu, operatingDays, mealsSettings, weekStartDate, refreshToken])

  const rows = view === 'weekly' ? result.weekly : result.daily[view] || []
  const selectedDate = view !== 'weekly' && weekStartDate ? addDaysISO(weekStartDate, DAYS.indexOf(view)) : null

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

          <ProcurementBasisNote date={selectedDate} mealsSettings={mealsSettings} />

          <div className="overflow-x-auto">
            <RequirementTable rows={rows} />
          </div>
        </div>
      )}
    </section>
  )
}
