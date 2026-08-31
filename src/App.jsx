import { useState } from 'react'
import PlannerPage from './pages/PlannerPage'
import AdminPage from './pages/AdminPage'

// STEP 9: 관리자 화면을 별도로 분리했다 (29장). 아직 별도 URL 라우팅 없이
// 화면 전환만 하는 가장 단순한 형태 — 필요해지면 이후 단계에서 라우터로 교체 가능.
export default function App() {
  const [view, setView] = useState('planner') // 'planner' | 'admin'

  if (view === 'admin') {
    return <AdminPage onBack={() => setView('planner')} />
  }
  return <PlannerPage onOpenAdmin={() => setView('admin')} />
}
