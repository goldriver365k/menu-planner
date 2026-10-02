const SECTIONS = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'menus', label: '메뉴 관리' },
  { key: 'neisImport', label: '급식 메뉴 가져오기' },
  { key: 'unclassified', label: '미분류 메뉴' },
  { key: 'ingredients', label: '식재료 관리' },
  { key: 'ingredientMaster', label: '식재료 마스터 DB' },
  { key: 'standardRecipe', label: '표준 레시피' },
  { key: 'menuCost', label: '메뉴 원가 계산' },
  { key: 'menuProfitability', label: '메뉴 수익성' },
  { key: 'salesRecords', label: '실제 판매 입력' },
  { key: 'menuProductionPlan', label: '메뉴별 준비계획' },
  { key: 'mealCountStats', label: '식수 통계' },
  { key: 'weekly', label: '주간 식단' },
  { key: 'history', label: '사용 이력' },
  { key: 'settings', label: '설정' },
]

export default function AdminNav({ active, onChange }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:pr-3">
      {SECTIONS.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onChange(section.key)}
          className={[
            'shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors sm:w-40',
            active === section.key
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          ].join(' ')}
        >
          {section.label}
        </button>
      ))}
    </nav>
  )
}
