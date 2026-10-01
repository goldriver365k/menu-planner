import { useState } from 'react'
import { DAYS, DAY_LABELS, MEAL_TYPES, MEAL_LABELS } from '../data/planConfig'
import { addDaysISO } from '../data/menuHistory'
import { buildMealSlotRoles, buildSlotKey } from '../logic/menuSlots'
import EditableMealDetail from './EditableMealDetail'
import MealCostSummary from './MealCostSummary'
import NutritionSummary from './NutritionSummary'
import MealCountRecord from './MealCountRecord'

function cellSummary(result) {
  if (!result) return null
  return `${result.main1.name} 외 ${5 + result.sides.length - 1}개`
}

function lockedCountFor(day, mealType, result, lockedSlotKeys) {
  if (!result) return 0
  const roles = buildMealSlotRoles(result.sides.length)
  return roles.filter((role) => lockedSlotKeys.has(buildSlotKey(day, mealType, role))).length
}

export default function WeeklyMenuResult({
  weekMenu,
  operatingDays,
  mealsSettings,
  costRate,
  weekStartDate,
  history,
  lockedSlotKeys,
  onToggleLock,
  onReplace,
  onAdjustCost,
}) {
  const [selected, setSelected] = useState(null) // { day, mealType }

  const selectedResult =
    selected && weekMenu[selected.day] ? weekMenu[selected.day][selected.mealType] : null
  const selectedDate = selected
    ? addDaysISO(weekStartDate, DAYS.indexOf(selected.day))
    : null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">주간 식단 결과</h2>
        <p className="mt-1 text-sm text-slate-500">
          칸을 누르면 아래에 해당 끼니의 전체 메뉴가 표시됩니다. 메뉴별로 잠금/교체가 가능합니다.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-20 border-b border-slate-200 py-2 text-left text-xs font-medium text-slate-400">
                &nbsp;
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className={[
                    'border-b border-slate-200 py-2 text-center text-sm font-semibold',
                    operatingDays[day] ? 'text-slate-700' : 'text-slate-300',
                  ].join(' ')}
                >
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map((mealType) => (
              <tr key={mealType} className="border-b border-slate-100 last:border-b-0">
                <th className="py-2 pr-3 text-left text-sm font-medium text-slate-500">
                  {MEAL_LABELS[mealType]}
                </th>
                {DAYS.map((day) => {
                  const dayResult = weekMenu[day]
                  const result = dayResult ? dayResult[mealType] : null
                  const isSelected = selected?.day === day && selected?.mealType === mealType
                  const isOperatingDay = operatingDays[day]
                  const isMealActive = mealsSettings[mealType]?.isActive
                  const lockedCount = lockedCountFor(day, mealType, result, lockedSlotKeys)

                  let label = '—'
                  let clickable = false
                  if (!isOperatingDay) label = '휴무'
                  else if (!isMealActive) label = '미운영'
                  else if (result) {
                    label = cellSummary(result)
                    clickable = true
                  }

                  return (
                    <td key={day} className="p-1 align-top">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => setSelected({ day, mealType })}
                        className={[
                          'relative h-16 w-full rounded-lg px-2 text-xs leading-snug transition-colors',
                          clickable
                            ? isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-50 text-slate-700 hover:bg-blue-50'
                            : 'cursor-default bg-transparent text-slate-300',
                        ].join(' ')}
                      >
                        {label}
                        {lockedCount > 0 && (
                          <span
                            className={[
                              'absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700',
                            ].join(' ')}
                          >
                            🔒{lockedCount}
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedResult && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            {DAY_LABELS[selected.day]}요일 · {MEAL_LABELS[selected.mealType]}
          </h3>
          <EditableMealDetail
            day={selected.day}
            mealType={selected.mealType}
            result={selectedResult}
            date={selectedDate}
            history={history}
            lockedSlotKeys={lockedSlotKeys}
            onToggleLock={onToggleLock}
            onReplace={onReplace}
          />
          <div className="mt-3">
            <NutritionSummary mealResult={selectedResult} />
          </div>
          <div className="mt-3">
            <MealCostSummary
              mealResult={selectedResult}
              mealSetting={mealsSettings[selected.mealType]}
              costRatePercent={costRate.overrides[selected.mealType] ?? costRate.global}
              canAdjust={buildMealSlotRoles(selectedResult.sides.length).some(
                (role) => !lockedSlotKeys.has(buildSlotKey(selected.day, selected.mealType, role))
              )}
              onAdjust={() => onAdjustCost(selected.day, selected.mealType)}
            />
          </div>
          <div className="mt-3">
            <MealCountRecord
              key={`${selected.day}:${selected.mealType}`}
              date={selectedDate}
              mealType={selected.mealType}
              expectedCount={mealsSettings[selected.mealType]?.expectedCount}
              mealResult={selectedResult}
            />
          </div>
        </div>
      )}
    </section>
  )
}
