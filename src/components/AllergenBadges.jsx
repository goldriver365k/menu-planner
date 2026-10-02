import { ALLERGEN_LABELS } from '../data/menuTaxonomy'

export default function AllergenBadges({ allergens, size = 'sm' }) {
  if (!allergens || allergens.length === 0) return null
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
  return (
    <span className="flex flex-wrap gap-1">
      {allergens.map((code) => (
        <span
          key={code}
          className={['rounded-full bg-rose-50 font-medium text-rose-600', padding].join(' ')}
        >
          {ALLERGEN_LABELS[code] || code}
        </span>
      ))}
    </span>
  )
}
