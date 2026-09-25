import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { HostingerApiError } from '@/lib/hostingerApi'
import { mptApi } from '@/lib/mpt/api'
import { copy, pktDateTime, pktTime } from '@/lib/mpt/copy'
import { AccountPage } from '@/pages/account/shared'
import { StatusBadge } from '@/components/mpt/StatusBadge'
import { DetailList, ErrorNote, MptGate, PageSkeleton, examDetailRows, primaryButton, useMptLoad, aboveMobileNav } from './common'
import { MockSlot } from '@/components/mpt/MockSlot'

function newIdempotencyKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}

function ApplyScreen({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const load = useMptLoad((signal) => mptApi.applicationForMock(slug, signal), [slug])
  const [declared, setDeclared] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<HostingerApiError | null>(null)
  const idempotencyKey = useRef('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])

  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const card = load.data
  if (!card) return null
  // One application per mock: an existing one is shown, never duplicated.
  if (card.application && card.application.status === 'ACTIVE') {
    return <Navigate to={`/account/mpt/applications/${card.application.application_code}`} replace />
  }
  const { mock, state, candidate } = card
  const open = state.phase === 'APPLICATIONS_OPEN'

  const submit = async () => {
    if (!declared || submitting) return
    setSubmitting(true)
    setError(null)
    idempotencyKey.current ||= newIdempotencyKey()
    try {
      const result = await mptApi.apply(slug, idempotencyKey.current)
      const code = result.application?.application_code
      if (code) navigate(`/account/mpt/applications/${code}${result.already_applied ? '' : '?new=1'}`, { replace: true })
    } catch (reason) {
      setError(reason instanceof HostingerApiError ? reason : new HostingerApiError(copy.errors.generic, 0))
      setSubmitting(false)
      load.reload()
    }
  }

  return (
    <div className="space-y-6 pb-44 sm:pb-0">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-800">{copy.apply.heading}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold text-slate-950 outline-none">{copy.apply.title(mock.mock_number)}</h2>
        <div className="mt-2"><MockSlot mock={mock} withWindow /></div>
        <div className="mt-2"><StatusBadge phase={state.phase} /></div>
      </div>

      {open && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">{copy.apply.closesAtStart}</p>}
      {!open && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {state.phase === 'NOT_YET_OPEN' && `Applications open ${pktDateTime(mock.application_open_at)}.`}
          {state.phase === 'APPLICATIONS_CLOSED' && <>Applications for this MPT Mock closed when it started at {pktTime(mock.application_close_at)}. <Link to="/account/mpt" className="font-semibold text-emerald-800 underline">Apply for an upcoming mock</Link></>}
          {state.phase === 'SLOTS_FULL' && 'All slots for this MPT Mock have been reserved.'}
          {state.phase === 'CANCELLED' && (card.application?.status === 'CANCELLED' ? 'This application is no longer active.' : 'This MPT Mock has been cancelled.')}
        </p>
      )}

      <section aria-labelledby="exam-details">
        <h3 id="exam-details" className="mb-2 text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{copy.apply.examDetails}</h3>
        <DetailList rows={examDetailRows(mock)} />
      </section>

      <section aria-labelledby="candidate-details">
        <h3 id="candidate-details" className="mb-2 text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{copy.apply.candidateDetails}</h3>
        <DetailList rows={[
          ['Full name', candidate.name || '—'],
          ['Registered email', candidate.email],
          ...(candidate.mobile ? [['Mobile', candidate.mobile] as [string, ReactNode]] : []),
          ...(candidate.candidate_code ? [['Candidate ID', <span className="font-mono">{candidate.candidate_code}</span>] as [string, ReactNode]] : []),
        ]} />
        <Link to="/account/settings" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">{copy.apply.wrongDetails}</Link>
      </section>

      {open && (
        <>
          <label className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800">
            <input type="checkbox" checked={declared} onChange={(event) => setDeclared(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-800" aria-describedby={error ? 'apply-error' : undefined} />
            <span>{copy.apply.declaration}</span>
          </label>
          {error && <div id="apply-error"><ErrorNote error={error} /></div>}
          <div className={`fixed inset-x-0 ${aboveMobileNav} z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0`}>
            <button type="button" onClick={submit} disabled={!declared || submitting} className={`${primaryButton} w-full sm:w-auto`}>
              {submitting ? copy.apply.submitting : copy.apply.submit}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function MptApply() {
  const { mock = '' } = useParams()
  return (
    <AccountPage title="Apply for MPT Mock" intro="Reserve your slot. Your Roll Number is issued on your dashboard ten minutes after you apply.">
      <MptGate><ApplyScreen slug={mock} /></MptGate>
    </AccountPage>
  )
}
