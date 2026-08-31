import { MEAL_LABELS, SIDE_DISH_MIN, SIDE_DISH_MAX } from '../data/planConfig'
import { MEAL_ICONS } from './MealIcons'

function sideDishOptions() {
  const options = []
  for (let n = SIDE_DISH_MIN; n <= SIDE_DISH_MAX; n++) options.push(n)
  return options
}

function onlyDigits(value) {
  return value.replace(/[^0-9]/g, '')
}

function formatThousands(value) {
  if (value === '') return ''
  return Number(value).toLocaleString('ko-KR')
}

export default function MealCard({ mealType, value, onChange }) {
  const Icon = MEAL_ICONS[mealType]
  const isActive = value.isActive

  const update = (patch) => onChange(mealType, { ...value, ...patch })

  return (
    <section
      className={[
        'flex flex-col rounded-2xl border p-5 transition-colors sm:p-6',
        isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50',
      ].join(' ')}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={[
              'flex h-10 w-10 items-center justify-center rounded-full',
              isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400',
            ].join(' ')}
          >
            <Icon />
          </span>
          <h3 className={['text-lg font-semibold', isActive ? 'text-slate-900' : 'text-slate-400'].join(' ')}>
            {MEAL_LABELS[mealType]}
          </h3>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => update({ isActive: !isActive })}
          className={[
            'relative h-8 w-14 shrink-0 rounded-full transition-colors',
            isActive ? 'bg-blue-600' : 'bg-slate-300',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
              isActive ? 'translate-x-7' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      <div className={['space-y-4', isActive ? '' : 'pointer-events-none opacity-40'].join(' ')}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">예상 식수</span>
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatThousands(value.expectedCount)}
              onChange={(e) => update({ expectedCount: onlyDigits(e.target.value) })}
              className="w-full bg-transparent px-4 py-3.5 text-right text-lg font-semibold tabular-nums text-slate-900 outline-none"
            />
            <span className="whitespace-nowrap bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-500">
              명
            </span>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">1인 판매금액</span>
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatThousands(value.pricePerServing)}
              onChange={(e) => update({ pricePerServing: onlyDigits(e.target.value) })}
              className="w-full bg-transparent px-4 py-3.5 text-right text-lg font-semibold tabular-nums text-slate-900 outline-none"
            />
            <span className="whitespace-nowrap bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-500">
              원
            </span>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">반찬 개수</span>
          <select
            value={value.sideDishCount}
            onChange={(e) => update({ sideDishCount: Number(e.target.value) })}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-lg font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {sideDishOptions().map((n) => (
              <option key={n} value={n}>
                {n}개
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
