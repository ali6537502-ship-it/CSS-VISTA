import { useCallback } from 'react'
import { Link } from 'react-router'
import type { MptCard } from '@/lib/mpt/api'
import { ACTION_LABEL, countdown, copy, pktDateTime, pktTime } from '@/lib/mpt/copy'
import { formatRollNumber } from '@/lib/mpt/rollNumber'
import { useBoundary } from '@/lib/mpt/useServerClock'
import { StatusBadge } from './StatusBadge'
import { MockSlot } from './MockSlot'

const PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0, ENTRY_OPEN: 1, ROLL_NUMBER_PENDING: 2, SLOT_RESERVED: 3, SUBMITTED_PENDING_RESULT: 4,
  APPLICATIONS_OPEN: 5, LOGIN_REQUIRED: 5, NOT_YET_OPEN: 6, SLOTS_FULL: 7, RESULT_AVAILABLE: 8, ABSENT: 9, APPLICATIONS_CLOSED: 10, CANCELLED: 11,
}

/** The card that matters most right now (the dashboard is the only notification channel). */
export function pickCurrentCard(cards: MptCard[]) {
  return [...cards].sort((a, b) => (PRIORITY[a.state.phase] ?? 99) - (PRIORITY[b.state.phase] ?? 99)
    || Date.parse(a.mock.exam_open_at) - Date.parse(b.mock.exam_open_at))[0] ?? null
}

export function actionHref(card: MptCard) {
  const code = card.application?.application_code
  switch (card.state.primary_action) {
    case 'apply': return `/account/mpt/apply/${card.mock.slug}`
    case 'login': return `/account?returnTo=${encodeURIComponent(`/account/mpt/apply/${card.mock.slug}`)}`
    case 'enter_exam':
    case 'continue_exam': return `/account/mpt/entrance/${card.mock.slug}`
    case 'view_result':
    case 'view_submission': return code ? `/account/mpt/results/${code}` : null
    case 'view_application':
    case 'view_roll_number': return code ? `/account/mpt/applications/${code}` : null
    default: return null
  }
}

export function MptHeroCard({ card, now, onBoundary }: { card: MptCard; now: number; onBoundary: () => void }) {
  const refresh = useCallback(() => onBoundary(), [onBoundary])
  useBoundary(card.state.next_transition_at, now, refresh)
  const { mock, state, application } = card
  const href = actionHref(card)
  const roll = application?.roll_number
  const visibleAt = state.timestamps.roll_number_visible_at
  const toOpen = Date.parse(mock.exam_open_at) - now
  const ready = state.phase === 'ENTRY_OPEN' || state.phase === 'IN_PROGRESS'

  let line: string
  switch (state.phase) {
    case 'ROLL_NUMBER_PENDING': line = `Slot reserved · Roll Number in ${countdown(Date.parse(visibleAt ?? '') - now)}`; break
    case 'SLOT_RESERVED': line = `Roll No. ${formatRollNumber(roll ?? '')} · Exam opens in ${countdown(toOpen)}`; break
    case 'ENTRY_OPEN': line = `${copy.dashboard.ready} · Roll No. ${formatRollNumber(roll ?? '')} · late entry until ${pktTime(mock.entry_close_at)}`; break
    case 'IN_PROGRESS': line = `${copy.exam.inProgress} · ends at ${pktTime(mock.exam_end_at)}`; break
    case 'APPLICATIONS_OPEN':
    case 'LOGIN_REQUIRED': line = `Exam ${pktDateTime(mock.exam_open_at)} · apply any time before it starts`; break
    case 'NOT_YET_OPEN': line = `Applications open ${pktDateTime(mock.application_open_at)}`; break
    case 'SUBMITTED_PENDING_RESULT': line = `Submitted · result card at ${pktTime(state.timestamps.result_available_at)}`; break
    case 'RESULT_AVAILABLE': line = card.attempt?.score !== null && card.attempt ? `Completed · ${card.attempt.score} / ${card.attempt.total_marks}` : 'Completed'; break
    case 'ABSENT': line = `Late entry ended at ${pktTime(mock.entry_close_at)}`; break
    default: line = pktDateTime(mock.exam_open_at)
  }

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${ready ? 'border-emerald-800 bg-emerald-50' : 'border-slate-200 bg-white'}`} aria-labelledby={`hero-${mock.slug}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">{copy.dashboard.currentTitle}</p>
        <StatusBadge phase={state.phase} />
      </div>
      <h3 id={`hero-${mock.slug}`} className="mt-2 text-xl font-bold text-slate-950">{mock.title}</h3>
      <div className="mt-1"><MockSlot mock={mock} withWindow /></div>
      <p className="mt-1 text-sm text-slate-600">{mock.duration_minutes} min · {mock.total_questions} MCQs · Free</p>
      <p className={`mt-3 text-base font-semibold ${ready ? 'text-emerald-950' : 'text-slate-800'}`}><span className="tabular-nums">{line}</span></p>
      {href && state.primary_action && (
        <Link to={href} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-900 px-5 text-base font-bold text-white hover:bg-emerald-950 sm:w-auto">
          {ACTION_LABEL[state.primary_action]}
        </Link>
      )}
    </section>
  )
}
