export default function CostRateSection({ costRate, onChangeGlobal }) {
  const handleChange = (e) => {
    const digits = e.target.value.replace(/[^0-9]/g, '')
    if (digits === '') return onChangeGlobal('')
    const clamped = Math.min(100, Number(digits))
    onChangeGlobal(clamped)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">목표 식재료 원가율</h2>
        <p className="mt-1 text-sm text-slate-500">
          전체 식사에 공통으로 적용할 목표 원가율입니다. 식사별로 다른 원가율은 이후 단계에서 설정할 수 있습니다.
        </p>
      </div>
      <label className="block max-w-xs">
        <div className="flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            inputMode="numeric"
            placeholder="35"
            value={costRate.global}
            onChange={handleChange}
            className="w-full bg-transparent px-4 py-3.5 text-right text-lg font-semibold tabular-nums text-slate-900 outline-none"
          />
          <span className="whitespace-nowrap bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-500">%</span>
        </div>
      </label>
    </section>
  )
}
