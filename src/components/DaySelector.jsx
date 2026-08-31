import { DAYS, DAY_LABELS } from '../data/planConfig'

export default function DaySelector({ operatingDays, onToggleDay }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">운영 기간</h2>
        <p className="mt-1 text-sm text-slate-500">
          운영하지 않는 요일은 선택을 해제하세요. 해제한 요일은 주간 식단 생성에서 제외됩니다.
        </p>
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {DAYS.map((day) => {
          const active = operatingDays[day]
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggleDay(day)}
              aria-pressed={active}
              className={[
                'flex h-14 flex-col items-center justify-center rounded-xl border text-sm font-semibold transition-colors sm:h-16 sm:text-base',
                active
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300',
              ].join(' ')}
            >
              <span>{DAY_LABELS[day]}</span>
              <span className="mt-0.5 text-[11px] font-normal opacity-80">
                {active ? '운영' : '휴무'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
