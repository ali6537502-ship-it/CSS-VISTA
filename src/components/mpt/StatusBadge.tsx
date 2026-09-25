import { Ban, CalendarClock, CheckCircle2, CircleDot, Clock3, DoorOpen, TriangleAlert } from 'lucide-react'
import type { MptPhase } from '@/lib/mpt/state'
import { PHASE_BADGE, type BadgeTone } from '@/lib/mpt/copy'

// One status badge for every MPT surface: icon + text + colour, never colour alone.
const TONES: Record<BadgeTone, { className: string; Icon: typeof CircleDot }> = {
  neutral: { className: 'border-slate-200 bg-slate-50 text-slate-700', Icon: CalendarClock },
  open: { className: 'border-emerald-200 bg-emerald-50 text-emerald-900', Icon: DoorOpen },
  reserved: { className: 'border-amber-200 bg-amber-50 text-amber-900', Icon: Clock3 },
  live: { className: 'border-emerald-700 bg-emerald-800 text-white', Icon: CircleDot },
  done: { className: 'border-emerald-200 bg-white text-emerald-900', Icon: CheckCircle2 },
  muted: { className: 'border-slate-200 bg-white text-slate-500', Icon: Ban },
  warning: { className: 'border-amber-300 bg-white text-amber-900', Icon: TriangleAlert },
}

export function StatusBadge({ phase, label }: { phase: MptPhase; label?: string }) {
  const badge = PHASE_BADGE[phase]
  const { className, Icon } = TONES[badge.tone]
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold ${className}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {label ?? badge.label}
    </span>
  )
}
