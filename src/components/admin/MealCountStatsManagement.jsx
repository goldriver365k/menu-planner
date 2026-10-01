import { useState } from 'react'
import { getAllMealCountRecords, updateMealCountActual, deleteMealCountRecord } from '../../data/mealCountRecords'
import {
  getAverageByMealType,
  getWeekdayMealTable,
  getRecentAverage,
  getAverageActualCount,
  getExpectedVsActual,
  getRecentRecords,
} from '../../logic/mealCountStats'
import { DAYS, DAY_LABELS, MEAL_TYPES, MEAL_LABELS } from '../../data/planConfig'
import MenuMealCountAnalysis from './MenuMealCountAnalysis'

function fmtAvg(average) {
  return average == null ? '-' : `${average.toFixed(1)}명`
}

// 기록 목록의 한 행 — 실제 식수 수정/삭제. 복잡한 새 모달 없이 행 안에서 바로 고친다.
function RecordRow({ record, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(record.actualCount != null ? String(record.actualCount) : '')
  const [error, setError] = useState('')

  const handleSave = () => {
    const res = updateMealCountActual(record.date, record.mealType, input)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setEditing(false)
    onChanged()
  }

  const handleDelete = () => {
    const mealLabel = MEAL_LABELS[record.mealType] || record.mealType
    if (!window.confirm(`${record.date} ${mealLabel} 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    deleteMealCountRecord(record.date, record.mealType)
    onChanged()
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2 text-slate-700">{record.date}</td>
      <td className="px-3 py-2 text-slate-500">{MEAL_LABELS[record.mealType] || record.mealType}</td>
      <td className="px-3 py-2 tabular-nums text-slate-500">{Number(record.expectedCount) || 0}명</td>
      <td className="px-3 py-2 tabular-nums text-slate-700">
        {editing ? (
          <input
            type="number"
            min="0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
          />
        ) : record.actualCount != null ? (
          `${record.actualCount}명`
        ) : (
          <span className="text-slate-400">미입력</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setError('')
                  setInput(record.actualCount != null ? String(record.actualCount) : '')
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100"
              >
                취소
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              수정
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            삭제
          </button>
        </div>
        {error && <p className="mt-1 text-right text-[11px] text-rose-600">{error}</p>}
      </td>
    </tr>
  )
}

// STEP 4-2: 4-1에서 쌓인 예상/실제 식수 기록을 집계만 한다(AI/예측/그래프 없음).
export default function MealCountStatsManagement() {
  const [records, setRecords] = useState(() => getAllMealCountRecords())
  const [tab, setTab] = useState('overview') // 'overview' | 'byMenu'
  const refresh = () => setRecords(getAllMealCountRecords())

  const weekdayMealTable = getWeekdayMealTable(records)
  const overall = getAverageActualCount(records)
  const recent4w = getRecentAverage(records, 4)
  const recentRecords = getRecentRecords(records, 20)

  const dayMealStats = DAYS.flatMap((day) =>
    MEAL_TYPES.map((mealType) => ({ day, mealType, stat: getExpectedVsActual(records, day, mealType) }))
  ).filter((entry) => entry.stat.count > 0)

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">식수 통계</h2>
        <p className="mt-1 text-sm text-slate-500">
          실제 식수가 입력된 기록만으로 평균을 계산합니다. 예측/추천 없이 쌓인 데이터를 그대로
          집계만 합니다.
        </p>
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={[
            'rounded-t-lg px-4 py-2 text-sm font-semibold',
            tab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600',
          ].join(' ')}
        >
          요일·끼니 통계
        </button>
        <button
          type="button"
          onClick={() => setTab('byMenu')}
          className={[
            'rounded-t-lg px-4 py-2 text-sm font-semibold',
            tab === 'byMenu' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600',
          ].join(' ')}
        >
          메뉴별 분석
        </button>
      </div>

      {tab === 'byMenu' ? (
        <MenuMealCountAnalysis />
      ) : (
        <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <span className="block text-xs text-slate-400">전체 평균</span>
          <span className="text-lg font-semibold text-slate-900">{fmtAvg(overall.average)}</span>
          <span className="block text-xs text-slate-400">기록 {overall.count}회</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <span className="block text-xs text-slate-400">최근 4주 평균</span>
          <span className="text-lg font-semibold text-slate-900">{fmtAvg(recent4w.average)}</span>
          <span className="block text-xs text-slate-400">기록 {recent4w.count}회</span>
        </div>
        {MEAL_TYPES.map((mealType) => {
          const stat = getAverageByMealType(records, mealType)
          return (
            <div key={mealType} className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="block text-xs text-slate-400">{MEAL_LABELS[mealType]} 평균</span>
              <span className="text-lg font-semibold text-slate-900">{fmtAvg(stat.average)}</span>
              <span className="block text-xs text-slate-400">기록 {stat.count}회</span>
            </div>
          )
        })}
      </div>

      <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2.5">요일</th>
              {MEAL_TYPES.map((mealType) => (
                <th key={mealType} className="px-3 py-2.5">
                  {MEAL_LABELS[mealType]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium text-slate-700">{DAY_LABELS[day]}</td>
                {MEAL_TYPES.map((mealType) => {
                  const cell = weekdayMealTable[day][mealType]
                  return (
                    <td key={mealType} className="px-3 py-2.5 tabular-nums text-slate-700">
                      {cell.average == null ? (
                        <span className="text-slate-300">-</span>
                      ) : (
                        <>
                          {cell.average.toFixed(1)}명<span className="ml-1 text-xs text-slate-400">({cell.count}회)</span>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500">
          요일·끼니별 예상 대비 실제
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">요일</th>
                <th className="px-3 py-2">끼니</th>
                <th className="px-3 py-2">평균 예상</th>
                <th className="px-3 py-2">평균 실제</th>
                <th className="px-3 py-2">평균 차이</th>
                <th className="px-3 py-2">기록 수</th>
              </tr>
            </thead>
            <tbody>
              {dayMealStats.map(({ day, mealType, stat }) => (
                <tr key={`${day}:${mealType}`} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{DAY_LABELS[day]}</td>
                  <td className="px-3 py-2 text-slate-500">{MEAL_LABELS[mealType]}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-500">{fmtAvg(stat.avgExpected)}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">{fmtAvg(stat.avgActual)}</td>
                  <td
                    className={[
                      'px-3 py-2 tabular-nums font-medium',
                      stat.avgDiff < 0 ? 'text-rose-600' : 'text-emerald-600',
                    ].join(' ')}
                  >
                    {stat.avgDiff > 0 ? '+' : ''}
                    {stat.avgDiff}명
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-400">{stat.count}회</td>
                </tr>
              ))}
              {dayMealStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                    아직 실제 식수가 입력된 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500">
          기록 목록 (최근 {recentRecords.length}건)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">끼니</th>
                <th className="px-3 py-2">예상</th>
                <th className="px-3 py-2">실제</th>
                <th className="px-3 py-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.map((record) => (
                <RecordRow key={`${record.date}:${record.mealType}`} record={record} onChanged={refresh} />
              ))}
              {recentRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-400">
                    아직 저장된 식수 기록이 없습니다. "주간 식단 결과"에서 실제 식수를 입력하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
