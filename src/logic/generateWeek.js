import { DAYS } from '../data/planConfig'
import { generateDayMenu, flattenMealItems } from './generateMeal'
import { addDaysISO, buildExcludedIdSet, createHistoryEntry } from '../data/menuHistory'
import { buildSlotKey, getItemAtRole } from './menuSlots'
import { tallyItemProtein } from './menuQualityEngine'

// STEP 15 작업지시서 14장: "전체 다시 생성(잠금 유지)"에서는 잠긴 메뉴가 그대로 남기 때문에,
// 아직 처리하지 않은 요일에 잠겨 있는 메뉴의 단백질도 미리 집계해 둬야 주간 단백질 균형
// 판단이 정확하다 — 그렇지 않으면 "월요일을 생성할 때는 목요일에 닭고기가 3번 잠겨 있다는
// 걸 전혀 모르는" 상태가 된다.
function seedWeekProteinCountsFromLocked(existingWeekMenu, lockedSlotKeys) {
  const counts = {}
  if (!existingWeekMenu) return counts
  for (const day of DAYS) {
    const dayMenu = existingWeekMenu[day]
    if (!dayMenu) continue
    for (const mealType of Object.keys(dayMenu)) {
      const mealResult = dayMenu[mealType]
      if (!mealResult) continue
      for (const role of ['main1', 'main2']) {
        const key = buildSlotKey(day, mealType, role)
        if (lockedSlotKeys.has(key)) {
          tallyItemProtein(counts, getItemAtRole(mealResult, role))
        }
      }
    }
  }
  return counts
}

// STEP 4의 "월~일 주간 메뉴 생성"에 STEP 5의 14일 중복 검사, STEP 6의 잠금 유지
// 재생성을 결합했다.
// - 검사 범위는 아침/점심/저녁을 통합한다 (12장): 제외 집합(excludedIds)에
//   메뉴 ID만 넣고 끼니 구분 없이 공통으로 사용한다.
// - lockedSlotKeys에 포함된 슬롯('day:mealType:role')은 새로 고르지 않고
//   existingWeekMenu의 값을 그대로 유지한다 (16장 "전체 다시 생성").
//
// 반환값: { week } — 화면 표시용 요일별 결과. 이력(MENU_HISTORY)은 이 함수
// 밖에서 computeWeekHistoryEntries로 별도 계산해 저장한다 (교체/재생성 후에도
// 같은 방식으로 이력을 다시 계산해 덮어쓸 수 있도록 분리).
export function generateWeekMenu(
  operatingDays,
  mealsSettings,
  weekStartDate,
  persistedHistory = [],
  { lockedSlotKeys = new Set(), existingWeekMenu = null } = {}
) {
  const week = {}
  // 이번 생성 도중 배정된 항목까지 실시간으로 반영하기 위한 작업용 이력 배열.
  let runningHistory = [...persistedHistory]
  // STEP 15: 주 전체에 걸친 단백질(main1/main2) 사용 집계 — 요일을 처리할 때마다 계속
  // 누적되며, 잠겨서 유지될 메뉴의 몫은 미리 더해 둔다(위 seedWeekProteinCountsFromLocked).
  const weekProteinCounts = seedWeekProteinCountsFromLocked(existingWeekMenu, lockedSlotKeys)

  DAYS.forEach((day, dayIndex) => {
    if (!operatingDays[day]) {
      week[day] = null
      return
    }

    const currentDate = addDaysISO(weekStartDate, dayIndex)
    const excludedIds = buildExcludedIdSet(runningHistory, currentDate)
    const existingDayMenu = existingWeekMenu ? existingWeekMenu[day] : null

    const dayResult = generateDayMenu(mealsSettings, excludedIds, {
      day,
      lockedSlotKeys,
      existingDayMenu,
      weekProteinCounts,
    })
    week[day] = dayResult

    for (const mealType of Object.keys(dayResult)) {
      const mealResult = dayResult[mealType]
      if (!mealResult) continue
      for (const item of flattenMealItems(mealResult)) {
        runningHistory.push(createHistoryEntry(item.id, currentDate, mealType, item.category))
      }
    }
  })

  return { week }
}

// 현재 weekMenu 상태가 내포하는 MENU_HISTORY 레코드 전체를 다시 계산한다.
// 생성/재생성/개별 교체 어떤 경우든 이 함수로 이력을 다시 만들어 저장소에
// 이번 주 구간을 통째로 교체하면, 중복 누적이나 오래된 값이 남는 문제가 없다.
export function computeWeekHistoryEntries(weekMenu, weekStartDate) {
  const entries = []
  DAYS.forEach((day, dayIndex) => {
    const dayResult = weekMenu[day]
    if (!dayResult) return
    const currentDate = addDaysISO(weekStartDate, dayIndex)
    for (const mealType of Object.keys(dayResult)) {
      const mealResult = dayResult[mealType]
      if (!mealResult) continue
      for (const item of flattenMealItems(mealResult)) {
        entries.push(createHistoryEntry(item.id, currentDate, mealType, item.category))
      }
    }
  })
  return entries
}
