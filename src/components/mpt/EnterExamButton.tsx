import { Link } from 'react-router'
import { DoorOpen, Lock } from 'lucide-react'
import { serverNow, type MptCard } from '@/lib/mpt/api'
import { pktTime } from '@/lib/mpt/copy'

/**
 * D-53: the exam entrance is always visible next to a mock, so students know where the
 * exam is entered long before it starts. Before the start it is shown locked with the
 * opening time; the entrance page explains anything that blocks entry.
 */
export function EnterExamButton({ card, className = '' }: { card: MptCard; className?: string }) {
  const { mock, state, application } = card
  const href = `/account/mpt/entrance/${mock.slug}`
  const applied = Boolean(application && application.status === 'ACTIVE')
  if (state.phase === 'ENTRY_OPEN' || state.phase === 'IN_PROGRESS') {
    return (
      <Link to={href} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-base font-bold text-white hover:bg-emerald-950 ${className}`}>
        <DoorOpen aria-hidden="true" className="h-5 w-5" /> {state.phase === 'IN_PROGRESS' ? 'Continue Exam' : 'Enter Exam'}
      </Link>
    )
  }
  const upcoming = Date.parse(mock.exam_open_at) > serverNow()
  if (!upcoming && !state.exam_in_progress) return null
  if (state.phase === 'CANCELLED' || state.phase === 'ABSENT') return null
  const caption = state.exam_in_progress
    ? 'In progress · applicants only'
    : `Opens at ${pktTime(mock.exam_open_at)}${applied ? '' : ' · for applicants'}`
  return (
    <Link to={href} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-900/40 bg-white px-4 text-left text-slate-800 hover:border-emerald-800 ${className}`}>
      <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-900" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-emerald-950">Enter Exam</span>
        <span className="block text-xs text-slate-600">{caption}</span>
      </span>
    </Link>
  )
}
