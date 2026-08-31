import { useState } from 'react'
import { getApiSettings, saveApiSettings } from '../../data/apiSettings'

export default function SettingsSection() {
  const [settings, setSettings] = useState(() => getApiSettings())
  const [saved, setSaved] = useState(false)

  const update = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setSaved(false)
  }

  const handleSave = () => {
    saveApiSettings(settings)
    setSaved(true)
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">설정</h2>
      <p className="mt-1 text-sm text-slate-500">
        공공 식자재 가격·영양정보 API 연동에 사용할 서비스키를 입력합니다.
      </p>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">현재 이 화면은 실제 공공 API가 아니라 모의(mock) 응답으로 동작합니다.</p>
        <p className="mt-1 text-amber-700">
          대부분의 공공데이터포털 API는 브라우저에서 바로 호출하면 CORS로 막히기 때문에, 실제 연동에는
          서비스키 외에도 요청을 대신 전달해줄 서버(예: Netlify Functions)가 하나 더 필요합니다. 지금은
          그 서버가 없어 "가격 갱신"을 눌러도 실제 데이터가 아닌 모의 값이 채워집니다. 아래 서비스키는
          입력해두면 저장은 되지만, 실제 연동을 붙이기 전까지는 사용되지 않습니다.
        </p>
      </div>

      <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            공공데이터포털 서비스키 (식자재 가격)
          </span>
          <input
            type="text"
            value={settings.publicDataServiceKey}
            onChange={(e) => update({ publicDataServiceKey: e.target.value })}
            placeholder="data.go.kr에서 발급받은 서비스키"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            식품영양성분DB 서비스키 (영양정보)
          </span>
          <input
            type="text"
            value={settings.nutritionServiceKey}
            onChange={(e) => update({ nutritionServiceKey: e.target.value })}
            placeholder="식품영양성분DB API 서비스키"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            저장
          </button>
          {saved && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
        </div>
      </div>
    </div>
  )
}
