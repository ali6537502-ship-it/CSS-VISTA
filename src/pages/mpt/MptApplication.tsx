import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CalendarPlus, CheckCircle2, Printer } from 'lucide-react'
import { HostingerApiError } from '@/lib/hostingerApi'
import { mptApi } from '@/lib/mpt/api'
import { copy, countdown, pktDateTime, pktTime } from '@/lib/mpt/copy'
import { useBoundary, useServerClock } from '@/lib/mpt/useServerClock'
import { AccountPage } from '@/pages/account/shared'
import { StatusBadge } from '@/components/mpt/StatusBadge'
import { RollNumber } from '@/components/mpt/RollNumber'
import { DetailList, ErrorNote, MptGate, PageSkeleton, downloadCalendar, examDetailRows, primaryButton, secondaryButton, useMptLoad } from './common'

function RevealCountdown({ appliedAt, visibleAt, now }: { appliedAt: string; visibleAt: string; now: number }) {
  const start = Date.parse(appliedAt)
  const end = Date.parse(visibleAt)
  const remaining = Math.max(0, end - now)
  const progress = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 100
  const minute = Math.ceil(remaining / 60_000)
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <p className="text-base font-bold text-slate-950">
        {copy.confirmation.rollIn} <span className="font-mono tabular-nums">{countdown(remaining)}</span>
      </p>
      {/* Announce by the minute, not every second. */}
      <p className="sr-only" aria-live="polite">{`Roll Number in about ${minute} minute${minute === 1 ? '' : 's'}`}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Time until your Roll Number is issued">
        <div className="h-full rounded-full bg-amber-500 transition-[width] duration-1000" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-600">{copy.confirmation.rollHint}</p>
    </div>
  )
}

function ApplicationScreen({ code }: { code: string }) {
  const [params] = useSearchParams()
  const isNew = params.get('new') === '1'
  const load = useMptLoad((signal) => mptApi.application(code, signal), [code])
  const now = useServerClock()
  const [withdrawing, setWithdrawing] = useState(false)
  const [actionError, setActionError] = useState<HostingerApiError | null>(null)
  const [initiallyHidden, setInitiallyHidden] = useState<boolean | null>(null)
  const reload = load.reload
  const refresh = useCallback(() => reload(), [reload])
  // Re-check with the server at every boundary (reveal, exam open, entry close…).
  useBoundary(load.data?.state.next_transition_at, now, refresh)

  const rollHidden = load.data ? load.data.application?.roll_number === null : null
  useEffect(() => {
    if (rollHidden !== null && initiallyHidden === null) setInitiallyHidden(rollHidden)
  }, [rollHidden, initiallyHidden])

  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const card = load.data
  if (!card?.application) return null
  const { mock, state, application, candidate } = card
  const phase = state.phase
  const roll = application.roll_number
  const revealedHere = Boolean(roll && initiallyHidden)
  const entryMinutesLeft = Math.max(0, Math.ceil((Date.parse(mock.entry_close_at) - now) / 60_000))
  const canWithdraw = application.status === 'ACTIVE' && now < Date.parse(mock.exam_open_at) && !card.attempt

  const withdraw = async () => {
    if (!window.confirm(copy.confirmation.withdrawConfirm)) return
    setWithdrawing(true)
    setActionError(null)
    try {
      await mptApi.withdraw(application.application_code)
      load.reload()
    } catch (reason) {
      setActionError(reason instanceof HostingerApiError ? reason : new HostingerApiError(copy.errors.generic, 0))
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="mpt-print-root space-y-6">
      <div className="hidden print:block">
        <p className="text-xl font-bold">CSS VISTA — MPT Mock Examination</p>
        <p className="text-sm">Admit card · printing is never required</p>
      </div>

      {isNew && application.status === 'ACTIVE' && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 print:hidden" aria-labelledby="success-heading">
          <p id="success-heading" className="flex items-center gap-2 text-lg font-extrabold tracking-wide text-emerald-900">
            <CheckCircle2 aria-hidden="true" className="h-6 w-6" /> {copy.confirmation.success}
          </p>
          <p className="mt-1 text-sm text-emerald-950">{copy.confirmation.reserved}</p>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge phase={phase} label={phase === 'ROLL_NUMBER_PENDING' || phase === 'SLOT_RESERVED' ? copy.confirmation.statusReserved : undefined} />
        <span className="text-sm text-slate-500">Application ID <span className="font-mono font-semibold text-slate-900">{application.application_code}</span></span>
      </div>

      {application.status === 'ACTIVE' && !roll && application.roll_number_visible_at && phase === 'ROLL_NUMBER_PENDING' && (
        <RevealCountdown appliedAt={application.applied_at} visibleAt={application.roll_number_visible_at} now={now} />
      )}
      {roll && <RollNumber roll={roll} highlight={revealedHere} />}

      {phase === 'ENTRY_OPEN' && (
        <Link to={`/account/mpt/entrance/${mock.slug}`} className={`${primaryButton} w-full sm:w-auto print:hidden`}>
          {now >= Date.parse(mock.exam_open_at) + 60_000 ? copy.confirmation.enterNow(entryMinutesLeft) : 'Enter Examination'}
        </Link>
      )}
      {phase === 'IN_PROGRESS' && <Link to={`/account/mpt/entrance/${mock.slug}`} className={`${primaryButton} w-full sm:w-auto print:hidden`}>{copy.exam.inProgress} · Continue</Link>}
      {(phase === 'RESULT_AVAILABLE' || phase === 'SUBMITTED_PENDING_RESULT') && (
        <Link to={`/account/mpt/results/${application.application_code}`} className={`${primaryButton} w-full sm:w-auto print:hidden`}>{phase === 'RESULT_AVAILABLE' ? 'View Result' : 'View Submission'}</Link>
      )}
      {phase === 'SLOT_RESERVED' && <p className="text-sm font-semibold text-slate-700">The exam starts at {pktDateTime(mock.exam_open_at)}. Press Enter Exam then. If you are late, you can still enter until {pktTime(mock.entry_close_at)} with the time remaining.</p>}
      {phase === 'ABSENT' && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Late entry for this MPT Mock ended at {pktTime(mock.entry_close_at)}. You were marked absent. Absences never count toward your scores.</p>}
      {application.status === 'CANCELLED' && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">This application is no longer active.{application.cancel_reason ? ` ${application.cancel_reason}` : ''}</p>}
      {application.status === 'WITHDRAWN' && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">You withdrew this application. {state.phase === 'APPLICATIONS_OPEN' && <Link className="font-semibold text-emerald-800 underline" to={`/account/mpt/apply/${mock.slug}`}>Apply again</Link>}</p>}

      <section aria-labelledby="candidate-heading">
        <h3 id="candidate-heading" className="mb-2 text-sm font-semibold uppercase tracking-[.14em] text-slate-500">Candidate</h3>
        <DetailList rows={[
          ['Name', candidate.name],
          ...(candidate.candidate_code ? [['Candidate ID', candidate.candidate_code] as [string, string]] : []),
          ['Roll Number', roll ? <span className="font-mono">{roll.slice(0, 3)} {roll.slice(3)}</span> : 'Issued soon'],
          ['Application ID', <span className="font-mono">{application.application_code}</span>],
          ['Status', state.phase === 'ROLL_NUMBER_PENDING' || state.phase === 'SLOT_RESERVED' ? copy.confirmation.statusReserved : state.phase.replace(/_/g, ' ')],
        ]} />
      </section>

      <section aria-labelledby="exam-heading">
        <h3 id="exam-heading" className="mb-2 text-sm font-semibold uppercase tracking-[.14em] text-slate-500">Examination</h3>
        <DetailList rows={examDetailRows(mock)} />
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
        <h3 className="font-semibold text-slate-900">Instructions</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Open My CSS Vista at exam time and press <strong>Enter Exam</strong>. Type your 6-digit Roll Number to verify.</li>
          <li>The exam starts at {pktTime(mock.exam_open_at)} and ends for everyone at {pktTime(mock.exam_end_at)}. Starting late (until {pktTime(mock.entry_close_at)}) leaves only the time remaining.</li>
          <li>Your result card is available 30 minutes after the exam ends, on your dashboard.</li>
          <li>Your answers save automatically. A refresh or lost connection never costs you the attempt.</li>
        </ul>
        <p className="mt-3 font-semibold text-slate-900">{copy.confirmation.personal}</p>
      </section>

      {actionError && <ErrorNote error={actionError} />}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link to="/account/mpt" className={secondaryButton}>{copy.confirmation.back}</Link>
        {application.status === 'ACTIVE' && <button type="button" onClick={() => downloadCalendar(mock)} className={secondaryButton}><CalendarPlus aria-hidden="true" className="h-4 w-4" /> {copy.confirmation.calendar}</button>}
        {application.status === 'ACTIVE' && <button type="button" onClick={() => window.print()} className={secondaryButton}><Printer aria-hidden="true" className="h-4 w-4" /> {copy.confirmation.print}</button>}
        {canWithdraw && <button type="button" onClick={withdraw} disabled={withdrawing} className={`${secondaryButton} text-amber-900`}>{withdrawing ? copy.confirmation.withdrawing : copy.confirmation.withdraw}</button>}
      </div>
    </div>
  )
}

export default function MptApplication() {
  const { code = '' } = useParams()
  return (
    <AccountPage title="MPT Mock Application" intro="Your slot, Roll Number and examination details.">
      <MptGate><ApplicationScreen code={code} /></MptGate>
    </AccountPage>
  )
}
