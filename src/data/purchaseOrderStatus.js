// 발주서의 "발주완료" 체크 상태 — 날짜+식재료 조합별로 저장한다. 금액·수량 등 계산값은
// 전혀 저장하지 않는다(그건 항상 ingredientRequirement.js가 그때그때 다시 계산한 값을 쓴다) —
// 여기 저장하는 건 "이미 주문했다"는 사람이 누른 체크 표시 하나뿐이다.

const STORAGE_KEY = 'menu-planner:purchase-order-checked:v1'

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (err) {
    console.warn('발주완료 체크 상태를 불러오지 못했습니다.', err)
    return {}
  }
}

function saveToStorage(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('발주완료 체크 상태를 저장하지 못했습니다.', err)
  }
}

function key(date, ingredientId) {
  return `${date}:${ingredientId}`
}

export function getCheckedOrderKeys() {
  return loadFromStorage()
}

export function isOrderChecked(date, ingredientId) {
  const state = loadFromStorage()
  return Boolean(state[key(date, ingredientId)])
}

export function setOrderChecked(date, ingredientId, checked) {
  const state = loadFromStorage()
  const k = key(date, ingredientId)
  if (checked) state[k] = true
  else delete state[k]
  saveToStorage(state)
  return state
}
