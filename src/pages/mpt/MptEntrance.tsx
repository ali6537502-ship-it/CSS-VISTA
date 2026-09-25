import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { HostingerApiError } from '@/lib/hostingerApi'
import { examClientId, mptApi, type MptVerification } from '@/lib/mpt/api'
import { copy, minutesText, pktTime } from '@/lib/mpt/copy'
import { formatRollNumber, isWellFormedRollNumber, normaliseRollNumber } from '@/lib/mpt/rollNumber'
import { stashRuntime } from '@/lib/mpt/runtimeCache'
import { AccountPage } from '@/pages/account/shared'
import { RollNumber } from '@/components/mpt/RollNumber'
import { StatusBadge } from '@/components/mpt/StatusBadge'
import { DetailList, ErrorNote, MptGate, PageSkeleton, primaryButton, secondaryButton, useMptLoad } from './common'

function VerifiedScreen({ slug, verification, onExpired }: { slug: string; verification: MptVerification; onExpired: (message: string) => void }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<HostingerApiError | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])
  const allowance = minutesText(verification.time_allowance_seconds)
  const { mock, candidate } = verification
  // Whole minutes left, and "late" as the rest of the duration: the two always
  // add up to the paper's length and never overstate the time available.
  const lateMinutes = Math.max(0, mock.duration_minutes - Math.floor(verification.time_allowance_seconds / 60))

  const start = async () => {
    setStarting(true)
    setError(null)
    try {
      const runtime = await mptApi.start(verification.verification_token, examClientId())
      stashRuntime(slug, runtime)
      navigate(`/account/mpt/exam/${slug}`, { replace: true })
    } catch (reason) {
      const failure = reason instanceof HostingerApiError ? reason : new HostingerApiError(copy.errors.generic, 0)
      if (failure.code === 'verification_required') { onExpired(failure.message); return }
      setError(failure)
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <h2 ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-2xl font-bold text-emerald-900 outline-none">
        <CheckCircle2 aria-hidden="true" className="h-7 w-7" /> {copy.entrance.verified}
      </h2>
      <DetailList rows={[
        ['Name', candidate.name],
        ['Roll Number', <span className="font-mono">{formatRollNumber(candidate.roll_number)}</span>],
        ['MPT Mock', mock.title],
        ['Questions', `${mock.total_questions} MCQs · ${mock.total_marks} marks`],
        ['Time you will have', <strong className="text-base">{allowance}</strong>],
      ]} />
      <p className={`rounded-xl border p-4 text-base font-semibold ${lateMinutes > 0 && verification.minutes_late > 0 && !verification.resume ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}>
        {verification.resume ? copy.entrance.resumeNote
          : verification.minutes_late > 0 && lateMinutes > 0 ? copy.entrance.late(lateMinutes, allowance)
            : copy.entrance.fullTime(allowance)}
      </p>

      <section className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700" aria-labelledby="instructions-heading">
        <h3 id="instructions-heading" className="font-semibold text-slate-900">Examination instructions</h3>
        <div className="mt-3 rounded-xl border bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-600">Paper sequence</p>
          <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {verification.sections.map((section, index) => (
              <li key={section.label} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-sm">
                <span className="min-w-0"><strong className="mr-1 text-emerald-800">{index + 1}.</strong>{section.label}</span>
                <span className="shrink-0 font-bold text-slate-900">{section.count}</span>
              </li>
            ))}
          </ol>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Each correct answer carries {mock.total_questions ? mock.total_marks / mock.total_questions : 1} mark{mock.negative_marking > 0 ? `; each incorrect answer deducts ${mock.negative_marking}` : '. There is no negative marking'}.</li>
          <li>Every attempt ends at {pktTime(mock.exam_end_at)}. Unsubmitted answers are submitted automatically at that time.</li>
          <li>Answers save automatically. If you lose your connection, keep going — they sync when you reconnect.</li>
          <li>{copy.entrance.timerNote}</li>
        </ul>
      </section>

      {error && <ErrorNote error={error} />}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0`}>
        <button type="button" onClick={start} disabled={starting} className={`${primaryButton} w-full sm:w-auto`}>
          {starting ? copy.entrance.starting : verification.resume ? copy.entrance.continue : copy.entrance.start}
        </button>
      </div>
    </div>
  )
}

function Gate({ slug }: { slug: string }) {
  const load = useMptLoad((signal) => mptApi.applicationForMock(slug, signal), [slug])
  const [value, setValue] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [verification, setVerification] = useState<MptVerification | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const inputId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  if (verification) {
    return <VerifiedScreen slug={slug} verification={verification} onExpired={(message) => { setVerification(null); setError(message); setErrorCode('verification_required') }} />
  }
  if (load.loading && !load.data) return <PageSkeleton />
  if (load.error && !load.data) return <ErrorNote error={load.error} onRetry={load.reload} />
  const card = load.data
  const ownRoll = card?.application?.roll_number ?? null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const digits = normaliseRollNumber(value)
    if (!isWellFormedRollNumber(digits)) {
      setError(copy.entrance.typo)
      setErrorCode('roll_format')
      inputRef.current?.focus()
      return
    }
    setVerifying(true)
    setError(null)
    try {
      setVerification(await mptApi.verify(slug, digits))
    } catch (reason) {
      const failure = reason instanceof HostingerApiError ? reason : new HostingerApiError(copy.errors.generic, 0)
      setError(failure.message)
      setErrorCode(failure.code)
      inputRef.current?.focus()
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-800">{card?.mock.title}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">{copy.entrance.heading}</h2>
        {card && <div className="mt-2"><StatusBadge phase={card.state.phase} /></div>}
      </div>
      <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <label htmlFor={inputId} className="block text-base font-semibold text-slate-900">{copy.entrance.label}</label>
        <input
          ref={inputRef}
          id={inputId}
          value={value}
          onChange={(event) => { setValue(event.target.value.replace(/[^\d\s]/g, '').slice(0, 9)); setError(null) }}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="______"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${errorId}-hint${error ? ` ${errorId}` : ''}`}
          className="h-16 w-full max-w-xs rounded-xl border-2 border-slate-300 px-4 text-center font-mono text-3xl font-bold tracking-[.3em] text-slate-950 outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/30"
        />
        <p id={`${errorId}-hint`} className="text-sm text-slate-500">{copy.entrance.hint}</p>
        {error && (
          <div id={errorId} role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            {error}
            {errorCode === 'already_completed' && card?.application && (
              <Link to={`/account/mpt/results/${card.application.application_code}`} className="ml-2 underline">View Result</Link>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={verifying || normaliseRollNumber(value).length === 0} className={primaryButton}>
            {verifying ? copy.entrance.verifying : copy.entrance.submit}
          </button>
          <button type="button" onClick={() => setShowHelp((open) => !open)} aria-expanded={showHelp} className="min-h-11 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
            {copy.entrance.where}
          </button>
        </div>
      </form>
      {showHelp && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Your application">
          {ownRoll ? <RollNumber roll={ownRoll} size="md" /> : (
            <p className="text-sm text-slate-700">
              {card?.application ? 'Your Roll Number has not been issued yet. It appears on your application and dashboard as soon as it is ready.' : 'You have not applied for this MPT Mock.'}
            </p>
          )}
          {card?.application
            ? <Link to={`/account/mpt/applications/${card.application.application_code}`} className={secondaryButton}>Open my application</Link>
            : card?.state.phase === 'APPLICATIONS_OPEN' && <Link to={`/account/mpt/apply/${slug}`} className={secondaryButton}>Apply now</Link>}
        </section>
      )}
    </div>
  )
}

export default function MptEntrance() {
  const { mock = '' } = useParams()
  return (
    <AccountPage title="Enter MPT Mock" intro="Verify your Roll Number to enter the examination.">
      <MptGate><Gate slug={mock} /></MptGate>
    </AccountPage>
  )
}
