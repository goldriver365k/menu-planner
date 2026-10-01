import { useState } from 'react'
import { evaluateMealQuality } from '../logic/menuQualityEngine'

const BREAKDOWN_LABELS = {
  proteinDiversity: '육류 다양성',
  cookingMethodDiversity: '조리법 다양성',
  spicyBalance: '매운맛 균형',
  colorBalance: '색상 균형',
  weightBalance: '무게감 균형',
  costFit: '원가 적합도',
}

const LABEL_STYLES = {
  좋음: 'bg-emerald-50 text-emerald-700',
  보통: 'bg-amber-50 text-amber-700',
  주의: 'bg-rose-50 text-rose-700',
}

// 작업지시서 15·16장: 끼니 하나의 품질을 "식단 균형: 좋음" 같은 간단한 배지로 보여주고,
// 펼치면 세부 점수(0~100)와 경고 문구를 보여준다. 이 점수는 규칙 기반 내부 알고리즘의
// 참고용 평가일 뿐 영양사의 전문 평가가 아니라는 점을 항상 함께 표시한다.
export default function MealQualityBadge({ mealResult }) {
  const [expanded, setExpanded] = useState(false)
  const quality = evaluateMealQuality(mealResult)
  if (!quality) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">식단 균형</span>
          <span className={['rounded-full px-2 py-0.5 text-xs font-semibold', LABEL_STYLES[quality.label]].join(' ')}>
            {quality.label}
          </span>
        </span>
        <span className="text-xs font-medium text-slate-400">{expanded ? '접기' : '자세히 보기'}</span>
      </button>

      {quality.warnings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {quality.warnings.map((w) => (
            <li key={w} className="text-xs text-amber-600">
              {w}
            </li>
          ))}
        </ul>
      )}

      {expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {Object.entries(quality.breakdown).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{BREAKDOWN_LABELS[key]}</span>
                <span className="font-semibold tabular-nums text-slate-700">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            위 점수는 규칙 기반 내부 알고리즘이 매긴 참고용 평가이며, 영양사의 전문 평가를
            대신하지 않습니다.
          </p>
        </div>
      )}
    </div>
  )
}
