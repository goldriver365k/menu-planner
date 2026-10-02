import { useState } from 'react'
import { isNeisApiKeyConfigured, fetchMealServiceDietInfo } from '../../services/neisClient'
import { runNeisImportPipeline } from '../../logic/menuImport/runNeisImportPipeline'
import { bulkAddMenus } from '../../data/menuDatabase'
import { CATEGORY_LABELS } from '../../data/menuTaxonomy'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function daysAgoISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center sm:p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{value.toLocaleString('ko-KR')}</p>
    </div>
  )
}

// STEP 14 작업지시서 11장: "급식 메뉴 가져오기" — NEIS에서 실제 급식 데이터를 모아 미리보기로
// 보여주고, 관리자가 "신규 메뉴 DB에 추가"를 눌렀을 때만 실제로 저장한다. 식단 생성 버튼을
// 누를 때마다 호출되는 게 아니라, 이 화면에서 관리자가 명시적으로 요청할 때만 NEIS를 호출한다
// (작업지시서 4장) — 이후의 모든 주간 식단 생성은 이렇게 쌓인 LocalStorage 메뉴 DB만 사용한다.
export default function NeisImportPanel() {
  const apiKeyConfigured = isNeisApiKeyConfigured()

  const [officeCode, setOfficeCode] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [fromDate, setFromDate] = useState(daysAgoISO(90))
  const [toDate, setToDate] = useState(todayISO())

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [partialNotice, setPartialNotice] = useState('')
  const [preview, setPreview] = useState(null) // { stats, newMenuRecords }

  const [committing, setCommitting] = useState(false)
  const [committedCount, setCommittedCount] = useState(null)

  const canFetch = apiKeyConfigured && officeCode.trim() && schoolCode.trim() && !loading

  const handleFetch = async () => {
    setLoading(true)
    setError('')
    setPartialNotice('')
    setPreview(null)
    setCommittedCount(null)
    try {
      const result = await fetchMealServiceDietInfo({ officeCode: officeCode.trim(), schoolCode: schoolCode.trim(), fromDate, toDate })
      if (!result.ok) {
        // NEIS 실패 — 기존 메뉴 DB는 전혀 건드리지 않는다(작업지시서 18장 안전장치).
        setError(result.reason || 'NEIS에서 급식 데이터를 가져오지 못했습니다.')
        return
      }
      if (result.partial) {
        setPartialNotice(`일부 페이지를 가져오지 못해 ${result.rows.length}건까지만 수집했습니다: ${result.partialReason}`)
      }
      const pipelineResult = runNeisImportPipeline(result.rows)
      setPreview(pipelineResult)
    } catch (err) {
      // 파이프라인 내부(정규화/분류)에서 예기치 못한 오류가 나도 기존 DB는 영향받지 않는다.
      setError(`가져오기 중 오류가 발생했습니다: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = () => {
    if (!preview || preview.newMenuRecords.length === 0) return
    setCommitting(true)
    try {
      const created = bulkAddMenus(preview.newMenuRecords)
      setCommittedCount(created.length)
      setPreview(null)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">급식 메뉴 가져오기</h2>
        <p className="mt-1 text-sm text-slate-500">
          NEIS 급식식단정보 Open API로 실제 학교 급식 데이터를 모아 메뉴 DB를 확장합니다. 식단
          생성 버튼과는 무관하며, 여기서 가져온 뒤 "신규 메뉴 DB에 추가"를 눌러야만 실제로
          저장됩니다.
        </p>
      </div>

      {!apiKeyConfigured && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">VITE_NEIS_API_KEY가 설정되지 않아 이 기능을 사용할 수 없습니다.</p>
          <p className="mt-1 text-amber-700">
            공공데이터포털에서 NEIS Open API 키를 발급받아 배포 환경(.env 또는 Netlify 환경변수)에
            VITE_NEIS_API_KEY로 등록하세요. 키가 없어도 기존 메뉴 DB만으로 프로그램은 정상
            작동합니다.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">교육청코드</span>
            <input
              type="text"
              placeholder="예: B10"
              value={officeCode}
              onChange={(e) => setOfficeCode(e.target.value)}
              disabled={!apiKeyConfigured}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">학교코드</span>
            <input
              type="text"
              placeholder="예: 7010569"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              disabled={!apiKeyConfigured}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">시작일</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={!apiKeyConfigured}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">종료일</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={!apiKeyConfigured}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleFetch}
          disabled={!canFetch}
          className={[
            'mt-4 w-full rounded-xl py-3 text-sm font-semibold sm:w-auto sm:px-8',
            canFetch ? 'bg-blue-600 text-white hover:bg-blue-700' : 'cursor-not-allowed bg-slate-200 text-slate-400',
          ].join(' ')}
        >
          {loading ? '가져오는 중…' : '급식 데이터 가져와서 미리보기'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">가져오기에 실패했습니다.</p>
          <p className="mt-1">{error}</p>
          <p className="mt-1 text-red-600">기존 메뉴 DB는 전혀 변경되지 않았습니다.</p>
        </div>
      )}

      {partialNotice && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          {partialNotice}
        </div>
      )}

      {committedCount != null && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          신규 메뉴 {committedCount.toLocaleString('ko-KR')}건을 메뉴 DB에 추가했습니다. "메뉴 관리"
          화면에서 확인할 수 있습니다.
        </div>
      )}

      {preview && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">가져오기 결과 미리보기</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label="수집 식단" value={preview.stats.mealsCollected} />
            <StatTile label="발견 음식" value={preview.stats.dishesFound} />
            <StatTile label="중복 제거 후" value={preview.stats.afterDedup} />
            <StatTile label="신규 메뉴" value={preview.stats.newMenus} />
            <StatTile label="미분류" value={preview.stats.unclassified} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            기존 DB와 중복이라 제외된 메뉴 {preview.stats.duplicatesSkipped.toLocaleString('ko-KR')}건 ·
            유사해서 "중복 의심"으로 표시된 메뉴 {preview.stats.possibleDuplicates.toLocaleString('ko-KR')}건
            (자동 삭제하지 않았습니다 — 메뉴 관리 화면에서 직접 확인하세요)
          </p>

          {preview.newMenuRecords.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[480px] border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-left font-medium text-slate-500">
                    <th className="px-3 py-2">메뉴명</th>
                    <th className="px-3 py-2">분류</th>
                    <th className="px-3 py-2">발견 횟수</th>
                    <th className="px-3 py-2">표시</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.newMenuRecords.slice(0, 300).map((m, i) => (
                    <tr key={`${m.name}-${i}`} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-800">{m.name}</td>
                      <td className="px-3 py-1.5 text-slate-500">
                        {CATEGORY_LABELS[m.category] || m.category}
                        {m.subcategory ? ` · ${m.subcategory}` : ''}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-slate-500">{m.source_count}</td>
                      <td className="px-3 py-1.5">
                        {m.category === 'UNCLASSIFIED' && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            미분류
                          </span>
                        )}
                        {m.possibleDuplicate && (
                          <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                            중복 의심
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.newMenuRecords.length > 300 && (
                <p className="px-3 py-2 text-[11px] text-slate-400">
                  처음 300건만 표시했습니다. 전체 {preview.newMenuRecords.length.toLocaleString('ko-KR')}건이
                  추가됩니다.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleCommit}
            disabled={committing || preview.newMenuRecords.length === 0}
            className={[
              'mt-4 w-full rounded-xl py-3 text-sm font-semibold sm:w-auto sm:px-8',
              preview.newMenuRecords.length > 0 && !committing
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-400',
            ].join(' ')}
          >
            {committing ? '추가하는 중…' : `신규 메뉴 ${preview.newMenuRecords.length.toLocaleString('ko-KR')}건 DB에 추가`}
          </button>
        </div>
      )}
    </div>
  )
}
