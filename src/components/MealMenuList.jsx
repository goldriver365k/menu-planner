import AllergenBadges from './AllergenBadges'

function MenuLine({ role, item }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs font-medium text-slate-400">{role}</span>
      <span className="min-w-0 flex-1 text-right">
        <span className="block text-sm font-medium text-slate-800">{item.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center justify-end gap-1.5">
          <span className="text-xs tabular-nums text-slate-400">{item.calories}kcal</span>
          <AllergenBadges allergens={item.allergens} />
        </span>
      </span>
    </div>
  )
}

export default function MealMenuList({ result }) {
  if (!result) return null
  return (
    <div className="divide-y divide-slate-100">
      <MenuLine role="밥" item={result.rice} />
      <MenuLine role={result.soupOrStew.category === 'SOUP' ? '국' : '찌개'} item={result.soupOrStew} />
      <MenuLine role="1차 메인" item={result.main1} />
      <MenuLine role="2차 메인" item={result.main2} />
      {result.sides.map((side) => (
        <MenuLine key={side.id} role="반찬" item={side} />
      ))}
      <MenuLine role="김치" item={result.kimchi} />
    </div>
  )
}
