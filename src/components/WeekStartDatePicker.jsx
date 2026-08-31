export default function WeekStartDatePicker({ value, onChange }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">이번 주 시작일 (월요일)</h2>
        <p className="mt-1 text-sm text-slate-500">
          아래 날짜부터 7일간의 식단을 생성합니다. 14일 중복 검사에 실제 날짜가 사용됩니다.
        </p>
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-lg font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </section>
  )
}
