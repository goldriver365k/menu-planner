import { useEffect, useState } from 'react'
import { pruneHistory, addDaysISO } from '../data/menuHistory'

const STORAGE_KEY = 'menu-planner:menu-history:v1'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function loadInitial() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // 더 이상 필요 없는(14일보다 오래된) 이력은 불러오는 시점에 정리해 저장 용량을 유지한다.
    return pruneHistory(parsed, todayISO())
  } catch (err) {
    console.warn('메뉴 사용 이력을 불러오지 못했습니다. 빈 이력으로 시작합니다.', err)
    return []
  }
}

// STEP 5: 14일 중복 검사를 위한 MENU_HISTORY 저장소. STEP 1의 설정값 저장소와
// 별도 키로 분리해, 초기화(입력값 초기화) 시 사용 이력까지 함께 지워지지 않도록 한다.
export function useMenuHistory() {
  const [history, setHistory] = useState(loadInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (err) {
      console.warn('메뉴 사용 이력을 저장하지 못했습니다.', err)
    }
  }, [history])

  const appendEntries = (newEntries) => {
    if (!newEntries || newEntries.length === 0) return
    setHistory((prev) => pruneHistory([...prev, ...newEntries], todayISO()))
  }

  // weekStartDate가 속한 7일 구간(월~일)의 기존 이력을 통째로 weekEntries로
  // 교체한다. STEP 6의 재생성/개별 교체 이후 이력을 다시 계산해 저장할 때
  // 사용 — 같은 항목이 중복 누적되거나 옛 값이 남는 문제를 막는다.
  const replaceWeekEntries = (weekStartDate, weekEntries) => {
    const rangeStart = weekStartDate
    const rangeEnd = addDaysISO(weekStartDate, 6)
    setHistory((prev) => {
      const outsideThisWeek = prev.filter(
        (entry) => entry.used_date < rangeStart || entry.used_date > rangeEnd
      )
      return pruneHistory([...outsideThisWeek, ...weekEntries], todayISO())
    })
  }

  const clearHistory = () => setHistory([])

  return { history, appendEntries, replaceWeekEntries, clearHistory }
}
