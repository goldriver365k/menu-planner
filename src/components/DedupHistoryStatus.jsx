export default function DedupHistoryStatus({ history, onClear }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <p className="text-slate-500">
        14일 중복 방지용 사용 이력 <span className="font-semibold text-slate-800">{history.length}건</span> 저장됨
        (14일이 지난 이력은 자동으로 정리됩니다)
      </p>
      <button
        type="button"
        onClick={onClear}
        className="self-start text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-slate-600 sm:self-auto"
      >
        사용 이력 초기화 (테스트용)
      </button>
    </section>
  )
}
