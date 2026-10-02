// STEP 14 작업지시서 7장: 메뉴 중복 제거.
// 1차: 정규화된 이름이 완전히 같으면 하나로 합치고 중복 건수를 센다(자동 제외).
// 2차: 이름이 꽤 비슷하지만 완전히 같지는 않은 경우 자동으로 지우지 않고 possibleDuplicate로
// 표시만 한다 — 관리자가 "제육볶음"과 "직화제육볶음"처럼 실제로 다른 메뉴일 수도 있는 것을
// 보고 직접 통합/구분을 판단하게 한다.
//
// ⚠️ 한계를 분명히 밝힌다: 이 유사도 비교는 문자열(글자 2-gram) 기반이라 "제육볶음"과
// "돈육고추장불고기"처럼 표기 자체가 완전히 다른 동의어까지는 잡아내지 못한다. 그런 수준의
// 의미 기반 매칭은 외부 라이브러리나 LLM 호출 없이는 신뢰도 있게 구현하기 어려워 이번 1차
// 키워드/문자열 유사도 구현 범위에서는 제외했다 — 대신 "직화제육볶음" vs "제육볶음"처럼 한쪽이
// 다른 쪽을 포함하거나 글자가 상당히 겹치는, 훨씬 흔한 패턴은 아래 로직으로 잡아낸다.

import { canonicalizeForDedup } from './normalizeMenuName'

const POSSIBLE_DUPLICATE_THRESHOLD = 0.6

function bigrams(str) {
  const result = []
  for (let i = 0; i < str.length - 1; i++) result.push(str.slice(i, i + 2))
  return result
}

// Dice 계수(2-gram 기반 문자열 유사도) — 0(완전히 다름) ~ 1(동일)
function stringSimilarity(a, b) {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const bigramsA = bigrams(a)
  const bigramsB = bigrams(b)
  const bucket = new Map()
  for (const bg of bigramsB) bucket.set(bg, (bucket.get(bg) || 0) + 1)
  let matches = 0
  for (const bg of bigramsA) {
    const count = bucket.get(bg) || 0
    if (count > 0) {
      matches += 1
      bucket.set(bg, count - 1)
    }
  }
  return (2 * matches) / (bigramsA.length + bigramsB.length)
}

function isLikelyDuplicate(keyA, keyB) {
  if (keyA === keyB) return true
  if (keyA.includes(keyB) || keyB.includes(keyA)) return true // "직화제육볶음" ⊇ "제육볶음"
  return stringSimilarity(keyA, keyB) >= POSSIBLE_DUPLICATE_THRESHOLD
}

// existingMenus: 현재 DB의 { id, name } 목록. candidates: [{ name, ...기타 필드 }] — 아직 정규화된
// 이름(name)이 들어 있다고 가정한다(classifyMenu 적용 이후 단계에서 호출).
// 반환: { newCandidates, duplicateCount, possibleDuplicateCount }
//   newCandidates: 저장 후보 목록(exact duplicate는 제외, possibleDuplicate는 플래그만 달아 포함)
export function dedupMenus(candidates, existingMenus) {
  const existingByKey = new Map()
  for (const menu of existingMenus) {
    const key = canonicalizeForDedup(menu.name)
    if (!existingByKey.has(key)) existingByKey.set(key, menu)
  }

  // 1차: 이번 배치 안에서 완전히 같은 이름끼리 먼저 합친다(발견 횟수를 source_count로 누적).
  const mergedByKey = new Map()
  for (const candidate of candidates) {
    const key = canonicalizeForDedup(candidate.name)
    const existing = mergedByKey.get(key)
    if (existing) {
      existing.source_count += 1
    } else {
      mergedByKey.set(key, { ...candidate, dedupKey: key, source_count: 1 })
    }
  }
  const merged = Array.from(mergedByKey.values())

  let duplicateCount = 0
  let possibleDuplicateCount = 0
  const newCandidates = []
  const existingKeys = Array.from(existingByKey.keys())

  for (const candidate of merged) {
    // 기존 DB에 정확히 같은 이름이 이미 있으면 신규로 추가하지 않는다(중복 제외).
    const exactExisting = existingByKey.get(candidate.dedupKey)
    if (exactExisting) {
      duplicateCount += 1
      continue
    }

    // 기존 DB 또는 이번 배치에서 이미 신규로 채택한 다른 후보와 비슷하면 possibleDuplicate로 표시.
    let possibleDuplicateOf = null
    for (const key of existingKeys) {
      if (isLikelyDuplicate(candidate.dedupKey, key)) {
        possibleDuplicateOf = existingByKey.get(key).id
        break
      }
    }
    if (!possibleDuplicateOf) {
      for (const already of newCandidates) {
        if (isLikelyDuplicate(candidate.dedupKey, already.dedupKey)) {
          possibleDuplicateOf = already.dedupKey // 배치 내부 후보끼리는 id가 없어 key로 표시
          break
        }
      }
    }

    if (possibleDuplicateOf) possibleDuplicateCount += 1
    newCandidates.push({
      ...candidate,
      possibleDuplicate: Boolean(possibleDuplicateOf),
      possibleDuplicateOf,
    })
  }

  return { newCandidates, duplicateCount, possibleDuplicateCount }
}
