// 기본 단위변환만 직접 구현한다: kg↔g, L↔ml. 그 외 단위(개/봉지/판 등)는 서로 다른 단위끼리
// 임의로 환산하지 않고, 정확히 같은 단위일 때만 같은 계열로 본다.
// recipeCostCalc.js(메뉴 원가 계산)와 ingredientRequirement.js(식재료 발주량 계산) 양쪽에서
// 공용으로 쓴다.

const WEIGHT_UNITS_TO_GRAM = { g: 1, kg: 1000 }
const VOLUME_UNITS_TO_ML = { ml: 1, L: 1000 }

export function unitFamily(unit) {
  if (unit in WEIGHT_UNITS_TO_GRAM) return 'WEIGHT'
  if (unit in VOLUME_UNITS_TO_ML) return 'VOLUME'
  return 'COUNT' // 개/봉지/판 등 — 변환표가 없는 단위는 전부 "그 단위 그대로"인 계열로 묶는다.
}

// 같은 계열(WEIGHT 또는 VOLUME)이면 kg↔g, L↔ml 변환이 가능하다. COUNT 계열은 단위 문자열이
// 정확히 같을 때만("개"와 "봉지"는 서로 바꿀 수 없음) 계산 가능하다고 본다.
export function unitsAreConvertible(unitA, unitB) {
  const familyA = unitFamily(unitA)
  const familyB = unitFamily(unitB)
  if (familyA !== familyB) return false
  if (familyA === 'COUNT') return unitA === unitB
  return true
}

// 수량을 그 계열의 기본 단위(WEIGHT → g, VOLUME → ml, COUNT → 그 단위 자신) 수량으로 바꾼다.
export function toBaseQuantity(quantity, unit) {
  const family = unitFamily(unit)
  if (family === 'WEIGHT') return quantity * WEIGHT_UNITS_TO_GRAM[unit]
  if (family === 'VOLUME') return quantity * VOLUME_UNITS_TO_ML[unit]
  return quantity
}

// 기본 단위 수량을 사람이 읽기 편한 표시 단위로 바꾼다 — WEIGHT는 1000g 이상이면 kg,
// VOLUME은 1000ml 이상이면 L로 보여준다(작업지시서 예시가 "35kg", "17kg"처럼 kg 단위로
// 결과를 보여주는 것과 맞춘다). COUNT는 그 단위 그대로 보여준다.
export function formatBaseQuantity(baseQuantity, family, countUnit) {
  if (family === 'WEIGHT') {
    if (baseQuantity >= 1000) return { value: round2(baseQuantity / 1000), unit: 'kg' }
    return { value: round2(baseQuantity), unit: 'g' }
  }
  if (family === 'VOLUME') {
    if (baseQuantity >= 1000) return { value: round2(baseQuantity / 1000), unit: 'L' }
    return { value: round2(baseQuantity), unit: 'ml' }
  }
  return { value: round2(baseQuantity), unit: countUnit || '' }
}

function round2(n) {
  return Math.round(n * 100) / 100
}
