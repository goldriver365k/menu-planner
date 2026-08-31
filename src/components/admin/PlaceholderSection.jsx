export default function PlaceholderSection({ title }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">다음 단계에서 구현될 예정입니다.</p>
    </div>
  )
}
