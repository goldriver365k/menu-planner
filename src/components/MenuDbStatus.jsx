import { useMemo, useState } from 'react'
import { getAllMenus, countMenusByCategory } from '../data/menuDatabase'
import {
  CATEGORY_LABELS,
  MAIN_1_SUBCATEGORY_LABELS,
  MAIN_2_SUBCATEGORY_LABELS,
  SIDE_SUBCATEGORY_LABELS,
  MIN_COUNTS,
} from '../data/menuTaxonomy'

// 표시할 행 목록: [키, 라벨]
function buildRows() {
  const rows = [
    ['RICE', CATEGORY_LABELS.RICE],
    ['SOUP', CATEGORY_LABELS.SOUP],
    ['STEW', CATEGORY_LABELS.STEW],
  ]
  for (const [key, label] of Object.entries(MAIN_1_SUBCATEGORY_LABELS)) {
    rows.push([`MAIN_1:${key}`, `1차 메인 · ${label}`])
  }
  for (const [key, label] of Object.entries(MAIN_2_SUBCATEGORY_LABELS)) {
    rows.push([`MAIN_2:${key}`, `2차 메인 · ${label}`])
  }
  rows.push(['SIDE', CATEGORY_LABELS.SIDE])
  rows.push(['KIMCHI', CATEGORY_LABELS.KIMCHI])
  return rows
}

export default function MenuDbStatus() {
  const [expanded, setExpanded] = useState(false)
  const menus = useMemo(() => getAllMenus(), [])
  const counts = useMemo(() => countMenusByCategory(), [])
  const sideSubCounts = useMemo(() => {
    const c = {}
    for (const menu of menus) {
      if (menu.category === 'SIDE') c[menu.subcategory] = (c[menu.subcategory] || 0) + 1
    }
    return c
  }, [menus])

  const rows = buildRows()
  const sideTotal = Object.values(sideSubCounts).reduce((a, b) => a + b, 0)

  const rowActual = (key) => (key === 'SIDE' ? sideTotal : counts[key] || 0)
  const allPass = rows.every((r) => rowActual(r[0]) >= (MIN_COUNTS[r[0]] || 0))

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900">테스트 메뉴 DB 현황</h2>
          <p className="mt-1 text-sm text-slate-500">
            총 {menus.length}개 메뉴 로드됨 ·{' '}
            <span className={allPass ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>
              {allPass ? '카테고리별 최소 수량 충족' : '일부 카테고리 수량 부족'}
            </span>
          </p>
        </div>
        <span className="text-sm font-medium text-slate-400">{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">카테고리</th>
                <th className="py-2 pr-4 font-medium">최소 수량</th>
                <th className="py-2 pr-4 font-medium">현재 수량</th>
                <th className="py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, label]) => {
                const min = MIN_COUNTS[key] || 0
                const actual = rowActual(key)
                const pass = actual >= min
                return (
                  <tr key={key} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-700">{label}</td>
                    <td className="py-2 pr-4 tabular-nums text-slate-500">{min}</td>
                    <td className="py-2 pr-4 tabular-nums font-medium text-slate-900">{actual}</td>
                    <td className={['py-2', pass ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                      {pass ? '충족' : '부족'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {Object.keys(sideSubCounts).length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">반찬 세부 카테고리</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 sm:grid-cols-5">
                {Object.entries(SIDE_SUBCATEGORY_LABELS).map(([key, label]) => (
                  <div key={key} className="flex justify-between">
                    <span>{label}</span>
                    <span className="tabular-nums font-medium text-slate-900">
                      {sideSubCounts[key] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
