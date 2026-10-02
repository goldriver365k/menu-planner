// 발주서의 "발주완료" 체크 상태 + (5-4) 실제 입고/매입 기록을 날짜+식재료 조합별로 저장한다.
// 필요량·발주량 등 계산값은 저장하지 않는다(그건 항상 ingredientRequirement.js가 그때그때
// 다시 계산한 값을 쓴다) — 여기 저장하는 건 "사람이 입력/확정한 사실"뿐이다: 발주완료 체크,
// 그리고 실제로 입고된 수량·금액.
//
// STEP 5-4: 기존에는 이 저장소가 { [key]: true } 형태의 불린 체크 상태만 담고 있었다. 이제
// 같은 키에 입고 정보도 함께 담도록 레코드를 확장한다 — 과거에 저장된 순수 불린 값(true)도
// normalizeEntry()가 그대로 읽을 수 있게 호환성을 유지한다(기존 체크 데이터 보존).
//
// 재입고/수정 시 재고가 중복으로 더해지지 않도록, 이 저장소에 "이미 현재재고에 반영한
// 양"(stockAppliedInPurchaseUnit, 식재료의 purchase_unit 기준)을 함께 기록해 두고, 다음
// 저장 때는 그 값과의 차이(delta)만 current_stock에 반영한다.

import { addToCurrentStock, setLastPurchasePrice } from './ingredientMasterDatabase'
import { unitsAreConvertible, toBaseQuantity } from '../logic/unitConversion'
import { todayISO } from './menuHistory'

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

// 과거 데이터(불린 true/false) 호환: 그대로 { checked } 모양으로 바꿔 돌려준다.
function normalizeEntry(raw) {
  if (raw == null) return { checked: false }
  if (typeof raw === 'boolean') return { checked: raw }
  return { checked: false, ...raw }
}

export function getCheckedOrderKeys() {
  return loadFromStorage()
}

export function isOrderChecked(date, ingredientId) {
  const state = loadFromStorage()
  return normalizeEntry(state[key(date, ingredientId)]).checked === true
}

// 체크 해제 시에도 입고 기록은 지우지 않는다(delete 대신 checked만 false로 남긴다) — 체크는
// "발주했다"는 사람의 표시일 뿐이고, 입고 데이터는 그와 별개의 사실이기 때문이다.
export function setOrderChecked(date, ingredientId, checked) {
  const state = loadFromStorage()
  const k = key(date, ingredientId)
  const existing = normalizeEntry(state[k])
  state[k] = { ...existing, checked }
  saveToStorage(state)
  return state
}

export function getOrderEntry(date, ingredientId) {
  const state = loadFromStorage()
  return normalizeEntry(state[key(date, ingredientId)])
}

// 입고상태: 입고수량이 없으면 ORDERED(발주만), 발주량보다 적게 들어왔으면 PARTIAL(부분입고),
// 발주량 이상 들어왔으면 RECEIVED(입고완료) — 초과 입고도 RECEIVED로 본다(막지 않는다).
function calcReceivingStatus(orderedQuantity, receivedQuantity) {
  if (receivedQuantity == null || !(Number(receivedQuantity) > 0)) return 'ORDERED'
  const ordered = Number(orderedQuantity) || 0
  if (ordered > 0 && Number(receivedQuantity) < ordered) return 'PARTIAL'
  return 'RECEIVED'
}

// 실제 매입금액 ÷ (기준이 되는) 수량 = 그 수량 1단위당 실제 단가. 수량이 0/미입력이면 계산하지 않는다.
function calcActualUnitPrice(actualPurchaseAmount, quantity) {
  const amount = Number(actualPurchaseAmount)
  const qty = Number(quantity)
  if (!(amount >= 0) || !(qty > 0)) return null
  return amount / qty
}

// 입고수량(발주단위 orderUnit 기준, '팩'이면 packInfo.packSize/packUnit으로, 그 외에는
// kg/g/ml/L/개 등 표시단위로 입력된다)을 식재료의 purchase_unit 기준 수량으로 환산한다.
// 단위 계열이 달라 환산할 수 없으면 null을 돌려준다(이 경우 재고/최근매입단가에는 반영하지
// 않고, 입고 수량·금액 기록만 남긴다).
function convertReceivedToPurchaseUnit({ ingredient, orderUnit, packInfo, receivedQuantity }) {
  if (!ingredient || receivedQuantity == null) return null
  if (packInfo && orderUnit === '팩') {
    return receivedQuantity * packInfo.packSize
  }
  if (!unitsAreConvertible(orderUnit, ingredient.purchase_unit)) return null
  const receivedBase = toBaseQuantity(receivedQuantity, orderUnit)
  const purchaseUnitBase = toBaseQuantity(1, ingredient.purchase_unit)
  return receivedBase / purchaseUnitBase
}

// 발주서 화면에서 "실제 입고" 저장 버튼이 호출하는 핵심 함수.
// - 입고수량·매입금액을 검증 후 저장한다(0 이상 숫자만 허용, 둘 다 선택 입력 가능).
// - 입고상태(ORDERED/PARTIAL/RECEIVED)와 실제단가(입고 입력단위 기준)를 계산해 함께 저장한다.
// - 식재료 purchase_unit 기준으로 환산 가능하면: 현재 재고에는 "이번 저장으로 새로 늘어난
//   만큼"(이전에 이미 반영한 stockAppliedInPurchaseUnit과의 차이, delta)만 더한다 — 같은
//   입고를 다시 저장하거나 수량을 수정해도 중복으로 쌓이지 않는다. 그리고 식재료의
//   last_purchase_price(실제 매입단가, purchase_unit 1단위당)를 갱신한다.
// - 단위를 환산할 수 없으면 재고/최근매입단가는 건드리지 않고 경고만 돌려준다.
export function saveReceiving({
  date,
  ingredientId,
  orderedQuantity,
  orderUnit,
  packInfo,
  receivedQuantity,
  actualPurchaseAmount,
  ingredient,
}) {
  const parsedReceived =
    receivedQuantity === '' || receivedQuantity == null ? null : Number(receivedQuantity)
  if (parsedReceived != null && (!Number.isFinite(parsedReceived) || parsedReceived < 0)) {
    return { ok: false, reason: '입고 수량은 0 이상의 숫자만 입력할 수 있습니다.' }
  }
  const parsedAmount =
    actualPurchaseAmount === '' || actualPurchaseAmount == null ? null : Number(actualPurchaseAmount)
  if (parsedAmount != null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
    return { ok: false, reason: '실제 매입금액은 0 이상의 숫자만 입력할 수 있습니다.' }
  }

  const state = loadFromStorage()
  const k = key(date, ingredientId)
  const existing = normalizeEntry(state[k])

  const receivingStatus = calcReceivingStatus(orderedQuantity, parsedReceived)
  const actualUnitPrice = calcActualUnitPrice(parsedAmount, parsedReceived)
  const overReceived = orderedQuantity != null && parsedReceived != null && parsedReceived > Number(orderedQuantity)

  const conversion =
    parsedReceived != null ? convertReceivedToPurchaseUnit({ ingredient, orderUnit, packInfo, receivedQuantity: parsedReceived }) : null
  let stockWarning = null

  if (parsedReceived != null && conversion == null) {
    stockWarning = '단위를 확인할 수 없어 현재 재고·최근 매입단가에는 반영되지 않았습니다.'
  } else if (conversion != null) {
    const previousApplied = Number(existing.stockAppliedInPurchaseUnit) || 0
    const delta = conversion - previousApplied
    if (delta !== 0) addToCurrentStock(ingredientId, delta)

    if (parsedAmount != null && conversion > 0) {
      const pricePerPurchaseUnit = parsedAmount / conversion
      setLastPurchasePrice(ingredientId, {
        price: pricePerPurchaseUnit,
        unit: ingredient.purchase_unit,
        date: todayISO(),
      })
    }
  }

  const nextEntry = {
    ...existing,
    orderedQuantity: orderedQuantity ?? existing.orderedQuantity ?? null,
    orderUnit: orderUnit ?? existing.orderUnit ?? null,
    packInfo: packInfo ?? existing.packInfo ?? null,
    receivedQuantity: parsedReceived,
    actualPurchaseAmount: parsedAmount,
    actualUnitPrice,
    receivingStatus,
    receivedAt: parsedReceived != null ? todayISO() : existing.receivedAt ?? null,
    stockAppliedInPurchaseUnit: conversion != null ? conversion : existing.stockAppliedInPurchaseUnit ?? 0,
  }
  state[k] = nextEntry
  saveToStorage(state)

  return { ok: true, entry: nextEntry, stockWarning, overReceived }
}
