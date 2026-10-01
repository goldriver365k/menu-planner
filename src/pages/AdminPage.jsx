import { useState } from 'react'
import AdminNav from '../components/admin/AdminNav'
import MenuManagement from '../components/admin/MenuManagement'
import NeisImportPanel from '../components/admin/NeisImportPanel'
import UnclassifiedMenuPanel from '../components/admin/UnclassifiedMenuPanel'
import IngredientManagement from '../components/admin/IngredientManagement'
import IngredientMasterManagement from '../components/admin/IngredientMasterManagement'
import StandardRecipeManagement from '../components/admin/StandardRecipeManagement'
import MenuCostManagement from '../components/admin/MenuCostManagement'
import SettingsSection from '../components/admin/SettingsSection'
import PlaceholderSection from '../components/admin/PlaceholderSection'

const TITLES = {
  dashboard: '대시보드',
  weekly: '주간 식단',
  history: '사용 이력',
}

export default function AdminPage({ onBack }) {
  const [section, setSection] = useState('menus')

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              GOLDRIVER365 · 밥심
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900">관리자</h1>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            식단 화면으로 돌아가기
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          <AdminNav active={section} onChange={setSection} />
          <div className="min-w-0 flex-1">
            {section === 'menus' && <MenuManagement />}
            {section === 'neisImport' && <NeisImportPanel />}
            {section === 'unclassified' && <UnclassifiedMenuPanel />}
            {section === 'ingredients' && <IngredientManagement />}
            {section === 'ingredientMaster' && <IngredientMasterManagement />}
            {section === 'standardRecipe' && <StandardRecipeManagement />}
            {section === 'menuCost' && <MenuCostManagement />}
            {section === 'settings' && <SettingsSection />}
            {![
              'menus', 'neisImport', 'unclassified', 'ingredients', 'ingredientMaster',
              'standardRecipe', 'menuCost', 'settings',
            ].includes(section) && (
              <PlaceholderSection title={TITLES[section]} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
