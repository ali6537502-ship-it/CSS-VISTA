import { useEffect } from 'react'
import { CheckCircle2, Sparkles, X } from 'lucide-react'

export function MilestoneCelebration({
  open,
  title,
  description,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(onClose, 5200)
    return () => window.clearTimeout(timer)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="cssv-milestone fixed inset-x-3 bottom-20 z-[90] mx-auto max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_22px_60px_rgba(6,63,49,0.2)] sm:bottom-6" role="status" aria-live="polite">
      <span className="cssv-milestone-glow" aria-hidden="true" />
      <span className="cssv-spark cssv-spark-one" aria-hidden="true" />
      <span className="cssv-spark cssv-spark-two" aria-hidden="true" />
      <span className="cssv-spark cssv-spark-three" aria-hidden="true" />
      <div className="relative flex items-start gap-3 p-4 pr-11">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">
            <Sparkles className="h-3.5 w-3.5" /> Milestone reached
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
        <button type="button" onClick={onClose} className="cssv-tap absolute right-2.5 top-2.5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss celebration">
          <X className="h-4 w-4" />
        </button>
      </div>
      <span className="cssv-milestone-line block h-1 bg-emerald-700" aria-hidden="true" />
    </div>
  )
}
