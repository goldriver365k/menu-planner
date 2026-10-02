import { useState } from 'react'
import DaySelector from '../components/DaySelector'
import WeekStartDatePicker from '../components/WeekStartDatePicker'
import MealCard from '../components/MealCard'
import CostRateSection from '../components/CostRateSection'
import MenuDbStatus from '../components/MenuDbStatus'
import DailyMenuPreview from '../components/DailyMenuPreview'
import WeeklyMenuResult from '../components/WeeklyMenuResult'
import WeeklySummary from '../components/WeeklySummary'
import WeeklyIngredientRequirement from '../components/WeeklyIngredientRequirement'
import PurchaseOrderSheet from '../components/PurchaseOrderSheet'
import DedupHistoryStatus from '../components/DedupHistoryStatus'
import { MEAL_TYPES, DAYS } from '../data/planConfig'
import { generateWeekMenu, computeWeekHistoryEntries } from '../logic/generateWeek'
import { buildSlotKey, extractLockedRoles } from '../logic/menuSlots'
import { adjustMealToTargetCost, calcMealFinancials } from '../logic/costOptimize'
import { addDaysISO, buildExcludedIdSet } from '../data/menuHistory'
import { usePersistedPlanSettings } from '../hooks/usePersistedPlanSettings'
import { useMenuHistory } from '../hooks/useMenuHistory'

export default function PlannerPage({ onOpenAdmin }) {
  const [settings, setSettings, resetSettings] = usePersistedPlanSettings()
  const { history, replaceWeekEntries, clearHistory } = useMenuHistory()
  const [weekMenu, setWeekMenu] = useState(null)
  const [lockedSlotKeys, setLockedSlotKeys] = useState(() => new Set())
  // STEP 5-2: plannedPreparationCount는 mealCountRecords(LocalStorage)에 직접 저장되고
  // weekMenu/settings와는 별도 상태라, 바뀌어도 이 값들을 읽는 컴포넌트가 자동으로 다시
  // 계산되지 않는다. 이 숫자를 올려 식재료 발주량/발주서의 useMemo가 다시 계산하도록
  // "다시 계산해" 신호로만 쓴다(값 자체는 의미 없음).
  const [plannedPrepVersion, setPlannedPrepVersion] = useState(0)
  const handlePlannedPreparationChanged = () => setPlannedPrepVersion((v) => v + 1)

  const toggleDay = (day) => {
    setSettings((prev) => ({
      ...prev,
      operatingDays: { ...prev.operatingDays, [day]: !prev.operatingDays[day] },
    }))
  }

  const updateWeekStartDate = (dateISO) => {
    setSettings((prev) => ({ ...prev, weekStartDate: dateISO }))
  }

  const updateMeal = (mealType, nextValue) => {
    setSettings((prev) => ({
      ...prev,
      meals: { ...prev.meals, [mealType]: nextValue },
    }))
  }

  const updateGlobalCostRate = (nextValue) => {
    setSettings((prev) => ({
      ...prev,
      costRate: { ...prev.costRate, global: nextValue },
    }))
  }

  // 4-4: [추천값 적용]을 눌렀을 때만 호출된다 — 추천 계산 자체는 기존 expectedCount를
  // 건드리지 않고, 이 함수가 실행돼야 비로소 updateMeal(기존 MealCard와 동일한 경로)로
  // expectedCount가 바뀐다. 그 이후 원가 계산/식재료 필요량/발주량은 기존 흐름 그대로
  // 이 값을 읽어간다.
  const handleApplyRecommendedCount = (mealType, recommendedCount) => {
    updateMeal(mealType, { ...settings.meals[mealType], expectedCount: String(recommendedCount) })
  }

  const hasOperatingDay = Object.values(settings.operatingDays).some(Boolean)
  const hasActiveMeal = MEAL_TYPES.some((m) => settings.meals[m]?.isActive)
  const canGenerateWeek = hasOperatingDay && hasActiveMeal && Boolean(settings.weekStartDate)

  // 처음 생성이든("주간 메뉴 생성") 잠금을 유지한 재생성이든("전체 다시 생성") 같은
  // 함수를 쓴다 — weekMenu가 없으면 잠긴 슬롯이 있어도 참조할 기존 값이 없어
  // 자연히 전부 새로 생성된다.
  const handleGenerateWeek = () => {
    const { week } = generateWeekMenu(
      settings.operatingDays,
      settings.meals,
      settings.weekStartDate,
      history,
      { lockedSlotKeys, existingWeekMenu: weekMenu }
    )
    setWeekMenu(week)
    replaceWeekEntries(settings.weekStartDate, computeWeekHistoryEntries(week, settings.weekStartDate))
  }

  const handleToggleLock = (day, mealType, role) => {
    const key = buildSlotKey(day, mealType, role)
    setLockedSlotKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleUnlockAll = () => setLockedSlotKeys(new Set())

  const handleReplace = (day, mealType, role, newItem) => {
    setWeekMenu((prev) => {
      if (!prev) return prev
      const dayMenu = prev[day]
      const mealResult = dayMenu[mealType]
      const updatedMeal =
        role === 'rice' || role === 'soupOrStew' || role === 'main1' || role === 'main2' || role === 'kimchi'
          ? { ...mealResult, [role]: newItem }
          : {
              ...mealResult,
              sides: mealResult.sides.map((side, i) =>
                `side:${i}` === role ? newItem : side
              ),
            }
      const nextWeek = { ...prev, [day]: { ...dayMenu, [mealType]: updatedMeal } }
      replaceWeekEntries(settings.weekStartDate, computeWeekHistoryEntries(nextWeek, settings.weekStartDate))
      return nextWeek
    })
  }

  // 20장: [저원가 메뉴로 조정] — 잠기지 않은 메뉴 중 비싼 것부터 같은 카테고리의
  // 더 저렴한 대체메뉴로 바꿔 목표 1인원가 이하가 되도록 시도한다.
  const handleAdjustCost = (day, mealType) => {
    setWeekMenu((prev) => {
      if (!prev) return prev
      const dayMenu = prev[day]
      const mealResult = dayMenu[mealType]
      const mealSetting = settings.meals[mealType]
      const costRatePercent = settings.costRate.overrides[mealType] ?? settings.costRate.global
      const { targetPerServingCost } = calcMealFinancials(mealResult, mealSetting, costRatePercent)

      const date = addDaysISO(settings.weekStartDate, DAYS.indexOf(day))
      const excludedIds = buildExcludedIdSet(history, date)
      const lockedRoles = extractLockedRoles(lockedSlotKeys, day, mealType)

      const { mealResult: adjustedMeal } = adjustMealToTargetCost(
        mealResult,
        targetPerServingCost,
        lockedRoles,
        excludedIds
      )

      const nextWeek = { ...prev, [day]: { ...dayMenu, [mealType]: adjustedMeal } }
      replaceWeekEntries(settings.weekStartDate, computeWeekHistoryEntries(nextWeek, settings.weekStartDate))
      return nextWeek
    })
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              GOLDRIVER365 · 밥심
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">주간 식단 만들기</h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              운영 요일과 끼니별 예상 식수·판매금액·반찬 수를 입력하면, 다음 단계에서 이 값을 바탕으로
              주간 식단을 자동으로 구성합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 sm:text-sm"
          >
            관리자
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <WeekStartDatePicker value={settings.weekStartDate} onChange={updateWeekStartDate} />

        <DaySelector operatingDays={settings.operatingDays} onToggleDay={toggleDay} />

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-slate-900">끼니별 설정</h2>
            <span className="text-sm text-slate-400">아침 · 점심 · 저녁</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MEAL_TYPES.map((mealType) => (
              <MealCard
                key={mealType}
                mealType={mealType}
                value={settings.meals[mealType]}
                onChange={updateMeal}
              />
            ))}
          </div>
        </section>

        <CostRateSection costRate={settings.costRate} onChangeGlobal={updateGlobalCostRate} />

        <MenuDbStatus />

        <DailyMenuPreview mealsSettings={settings.meals} />

        <DedupHistoryStatus history={history} onClear={clearHistory} />

        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center sm:p-6">
          <button
            type="button"
            onClick={handleGenerateWeek}
            disabled={!canGenerateWeek}
            className={[
              'w-full rounded-xl py-4 text-lg font-semibold sm:mx-auto sm:w-auto sm:px-16',
              canGenerateWeek
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-500',
            ].join(' ')}
          >
            {weekMenu ? '전체 다시 생성 (잠금 유지)' : '주간 메뉴 생성'}
          </button>
          {!canGenerateWeek && (
            <p className="text-sm text-amber-600">
              시작일, 운영 요일, 운영 중인 끼니가 모두 있어야 생성할 수 있습니다.
            </p>
          )}
          <p className="text-sm text-slate-400">
            같은 메뉴는 14일 이내 다시 추천되지 않습니다. 잠긴 메뉴는 다시 생성해도 바뀌지 않습니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={resetSettings}
              className="text-sm font-medium text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-slate-600"
            >
              입력값 초기화
            </button>
            {lockedSlotKeys.size > 0 && (
              <button
                type="button"
                onClick={handleUnlockAll}
                className="text-sm font-medium text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-slate-600"
              >
                잠금 전체 해제 ({lockedSlotKeys.size}개)
              </button>
            )}
          </div>
        </section>

        {weekMenu && (
          <>
            <WeeklySummary
              weekMenu={weekMenu}
              operatingDays={settings.operatingDays}
              mealsSettings={settings.meals}
              costRate={settings.costRate}
            />
            <WeeklyMenuResult
              weekMenu={weekMenu}
              operatingDays={settings.operatingDays}
              mealsSettings={settings.meals}
              costRate={settings.costRate}
              weekStartDate={settings.weekStartDate}
              history={history}
              lockedSlotKeys={lockedSlotKeys}
              onToggleLock={handleToggleLock}
              onReplace={handleReplace}
              onAdjustCost={handleAdjustCost}
              onApplyRecommendedCount={handleApplyRecommendedCount}
              onPlannedPreparationChanged={handlePlannedPreparationChanged}
            />
            <WeeklyIngredientRequirement
              weekMenu={weekMenu}
              operatingDays={settings.operatingDays}
              mealsSettings={settings.meals}
              weekStartDate={settings.weekStartDate}
              refreshToken={plannedPrepVersion}
            />
            <PurchaseOrderSheet
              weekMenu={weekMenu}
              operatingDays={settings.operatingDays}
              mealsSettings={settings.meals}
              weekStartDate={settings.weekStartDate}
              refreshToken={plannedPrepVersion}
            />
          </>
        )}
      </main>
    </div>
  )
}
