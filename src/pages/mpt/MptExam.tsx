import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, ChevronRight, CloudOff, Loader2, Check } from 'lucide-react'
import { HostingerApiError } from '@/lib/hostingerApi'
import { examClientId, mptApi, serverNow, type MptPaperQuestion, type MptRuntime } from '@/lib/mpt/api'
import { copy } from '@/lib/mpt/copy'
import { takeRuntime } from '@/lib/mpt/runtimeCache'
import { useServerClock } from '@/lib/mpt/useServerClock'
import { QUESTIONS_PER_PAGE, questionPageCount, questionPageForIndex, sliceQuestionPage } from '@/lib/questionPagination'
import { ErrorNote, MptGate, PageSkeleton, primaryButton, secondaryButton } from './common'

const DEBOUNCE_MS = 2500
const HEARTBEAT_MS = 30_000
const OPTION_LETTERS = ['A', 'B', 'C', 'D']

type Answers = Record<number, number>
type Pending = Record<number, number | null>
type SaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'conflict'

// Unsynced answers survive a reload or a dropped connection on this device.
const queueKey = (slug: string) => `cssvista:mpt-pending:${slug}`
function readQueue(slug: string): Pending {
  try { return JSON.parse(localStorage.getItem(queueKey(slug)) || '{}') as Pending } catch { return {} }
}
function writeQueue(slug: string, pending: Pending) {
  try {
    if (Object.keys(pending).length) localStorage.setItem(queueKey(slug), JSON.stringify(pending))
    else localStorage.removeItem(queueKey(slug))
  } catch { /* storage blocked: the in-memory queue still syncs */ }
}

function formatClock(seconds: number) {
  const s = Math.max(0, seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function Runner({ slug, runtime }: { slug: string; runtime: MptRuntime }) {
  const navigate = useNavigate()
  const clientId = useMemo(() => examClientId(), [])
  const paper = useMemo(() => runtime.paper ?? [], [runtime.paper])
  const expiresAt = Date.parse(runtime.attempt.expires_at)
  const [answers, setAnswers] = useState<Answers>(() => {
    const restored: Answers = {}
    for (const [p, o] of Object.entries(runtime.answers ?? {})) restored[Number(p)] = o
    for (const [p, o] of Object.entries(readQueue(slug))) { if (o === null) delete restored[Number(p)]; else restored[Number(p)] = o }
    return restored
  })
  const [page, setPage] = useState(() => questionPageForIndex(Math.max(0, runtime.attempt.current_position - 1)))
  const [saveState, setSaveState] = useState<SaveState>(() => Object.keys(readQueue(slug)).length ? 'offline' : 'saved')
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => serverNow())
  const [submitting, setSubmitting] = useState(false)
  const [finished, setFinished] = useState<string | null>(null)
  const [error, setError] = useState<HostingerApiError | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const now = useServerClock(1000)
  const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))

  const pending = useRef<Pending>(readQueue(slug))
  const version = useRef(runtime.attempt.save_version)
  const inFlight = useRef(false)
  const visibilityChanges = useRef(0)
  const debounce = useRef<number | undefined>(undefined)
  const pageRef = useRef(page)
  pageRef.current = page
  const topRef = useRef<HTMLDivElement>(null)

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return false
    const changes = Object.entries(pending.current).map(([p, o]) => ({ p: Number(p), o }))
    inFlight.current = true
    setSaveState(changes.length ? 'saving' : 'saved')
    const sent = { ...pending.current }
    try {
      const result = await mptApi.save({
        mock: slug, client_id: clientId, save_version: version.current + 1, changes,
        current_position: (pageRef.current - 1) * QUESTIONS_PER_PAGE + 1, visibility_changes: visibilityChanges.current,
      })
      version.current = result.save_version
      for (const [p, o] of Object.entries(sent)) if (pending.current[Number(p)] === o) delete pending.current[Number(p)]
      writeQueue(slug, pending.current)
      setLastSavedAt(serverNow())
      setSaveState(Object.keys(pending.current).length ? 'saving' : 'saved')
      return true
    } catch (reason) {
      const failure = reason instanceof HostingerApiError ? reason : null
      if (failure?.code === 'stale_save') {
        // Another save already landed (e.g. a retried request): move past it.
        version.current += 1
        setSaveState('saving')
      } else if (failure?.code === 'device_conflict') {
        setSaveState('conflict')
      } else if (failure?.code === 'attempt_finished') {
        setFinished(copy.exam.timeUp)
      } else {
        setSaveState('offline')
      }
      return false
    } finally {
      inFlight.current = false
    }
  }, [slug, clientId])

  const schedule = useCallback((delay = DEBOUNCE_MS) => {
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => { void flush() }, delay)
  }, [flush])

  const choose = (question: MptPaperQuestion, option: number | null) => {
    if (finished || saveState === 'conflict') return
    setAnswers((current) => {
      const next = { ...current }
      if (option === null) delete next[question.p]
      else next[question.p] = option
      return next
    })
    pending.current[question.p] = option
    writeQueue(slug, pending.current)
    schedule()
  }

  // Heartbeat, reconnect flush, integrity signal and last-chance flush.
  useEffect(() => {
    const heartbeat = window.setInterval(() => { void flush() }, HEARTBEAT_MS)
    const online = () => { void flush() }
    const visibility = () => {
      if (document.visibilityState === 'hidden') { visibilityChanges.current += 1; void flush() }
    }
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', online)
    return () => {
      window.clearInterval(heartbeat)
      window.clearTimeout(debounce.current)
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', online)
    }
  }, [flush])
  // Keep retrying quickly while changes are waiting.
  useEffect(() => {
    if (saveState === 'offline' || (saveState === 'saving' && !inFlight.current)) schedule(saveState === 'offline' ? 5000 : 800)
  }, [saveState, schedule])

  const submit = useCallback(async (auto = false) => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    await flush()
    try {
      const result = await mptApi.submit(slug, clientId)
      writeQueue(slug, {})
      navigate(`/account/mpt/results/${result.application.application_code}`, { replace: true })
    } catch (reason) {
      const failure = reason instanceof HostingerApiError ? reason : new HostingerApiError(copy.errors.generic, 0)
      if (auto || failure.code === 'attempt_finished') setFinished(copy.exam.timeUp)
      else setError(failure)
      setSubmitting(false)
    }
  }, [submitting, flush, slug, clientId, navigate])

  // At zero the client submits; if it cannot, the server's sweeper does.
  useEffect(() => {
    if (remaining === 0 && !finished && !submitting) {
      setFinished(copy.exam.timeUp)
      void submit(true)
    }
  }, [remaining, finished, submitting, submit])

  // Polite timer announcements, never every second.
  useEffect(() => {
    const minutes = remaining / 60
    if ([30, 15, 10, 5, 1].includes(minutes)) setAnnouncement(`${minutes} minute${minutes === 1 ? '' : 's'} remaining`)
  }, [remaining])

  const totalPages = questionPageCount(paper.length)
  const pageQuestions = sliceQuestionPage(paper, page)
  const answered = Object.keys(answers).length
  const sections = useMemo(() => {
    const out: Array<{ label: string; first: number; count: number }> = []
    for (const [index, question] of paper.entries()) {
      const last = out[out.length - 1]
      if (last && last.label === question.section) last.count += 1
      else out.push({ label: question.section, first: index, count: 1 })
    }
    return out
  }, [paper])
  const goToPage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)))
    topRef.current?.focus()
    window.scrollTo({ top: 0 })
    schedule(300)
  }
  const secondsAgo = Math.max(0, Math.round((now - lastSavedAt) / 1000))

  if (saveState === 'conflict') {
    return (
      <div role="alertdialog" aria-labelledby="conflict-title" className="mx-auto max-w-lg space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
        <p id="conflict-title" className="text-lg font-bold text-amber-950">{copy.exam.otherDevice}</p>
        <p className="text-sm text-amber-950">Your timer keeps running. To continue on this device, verify your Roll Number again.</p>
        <Link to={`/account/mpt/entrance/${slug}`} className={primaryButton}>{copy.exam.continueHere}</Link>
      </div>
    )
  }

  return (
    <div className="pb-40">
      <div className="mx-auto max-w-4xl pt-2">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{runtime.mock.title}</p>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>

      {finished && <p role="status" className="mx-auto mt-4 max-w-4xl rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">{finished}</p>}

      <nav aria-label="Paper sections" className="mx-auto mt-4 flex max-w-4xl gap-2 overflow-x-auto pb-1">
        {sections.map((section) => {
          const active = pageQuestions.some((question) => question.section === section.label)
          return (
            <button key={section.label} type="button" onClick={() => goToPage(questionPageForIndex(section.first))}
              aria-current={active ? 'true' : undefined}
              className={`min-h-11 shrink-0 rounded-full border px-3 text-xs font-semibold ${active ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
              {section.label} · {section.count}
            </button>
          )
        })}
      </nav>

      <div ref={topRef} tabIndex={-1} className="mx-auto mt-4 max-w-4xl space-y-4 outline-none">
        {pageQuestions.map((question) => {
          const selected = answers[question.p]
          const groupId = `q-${question.p}`
          return (
            <fieldset key={question.p} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-describedby={`${groupId}-section`}>
              <legend className="sr-only">Question {question.p}</legend>
              <p id={`${groupId}-section`} className="text-[11px] font-bold uppercase tracking-[.12em] text-emerald-800">{question.section} · Question {question.p}</p>
              <p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-950" dir="auto">{question.q}</p>
              <div className="mt-3 grid gap-2">
                {question.o.map((option, index) => (
                  <label key={index} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-base ${selected === index ? 'border-emerald-800 bg-emerald-50' : 'border-slate-200 hover:border-slate-400'}`}>
                    <input type="radio" name={groupId} checked={selected === index} onChange={() => choose(question, index)} disabled={Boolean(finished)}
                      className="mt-1 h-5 w-5 shrink-0 accent-emerald-800" />
                    <span className="min-w-0" dir="auto"><strong className="mr-1.5 text-slate-500">{OPTION_LETTERS[index]}.</strong>{option}</span>
                  </label>
                ))}
              </div>
              {selected !== undefined && !finished && (
                <button type="button" onClick={() => choose(question, null)} className="mt-2 min-h-11 text-sm font-semibold text-slate-500 underline-offset-4 hover:underline">Clear answer</button>
              )}
            </fieldset>
          )
        })}
      </div>

      {error && <div className="mx-auto mt-4 max-w-4xl"><ErrorNote error={error} /></div>}

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur`}>
        {/* Timer and save status live in this fixed bar so no site header can cover them. */}
        <div className="mx-auto mb-1.5 flex max-w-4xl items-center justify-between gap-3">
          <div className={`font-mono text-xl font-bold tabular-nums ${remaining <= 300 ? 'text-amber-800' : 'text-slate-950'}`} aria-label={`Time remaining ${formatClock(remaining)}`} role="timer">
            {formatClock(remaining)}
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-600">{answered}/{paper.length} answered</span>
          <p className="flex min-h-6 min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-slate-600" aria-live="polite">
            {saveState === 'offline' ? <><CloudOff aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-amber-700" />{copy.exam.offline}</>
              : saveState === 'saving' ? <><Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />{copy.exam.saving}</>
                : <><Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-700" />{copy.exam.saved(secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`)}</>}
          </p>
        </div>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className={`${secondaryButton} disabled:opacity-40`} aria-label="Previous page"><ChevronLeft aria-hidden="true" className="h-5 w-5" /></button>
          <span className="text-sm font-semibold text-slate-700">Page {page}/{totalPages}</span>
          {page < totalPages
            ? <button type="button" onClick={() => goToPage(page + 1)} className={secondaryButton} aria-label="Next page"><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
            : <button type="button" disabled={submitting || Boolean(finished)} onClick={() => { if (window.confirm(copy.exam.submitConfirm(paper.length - answered))) void submit() }} className={primaryButton}>
              {submitting ? copy.exam.submitting : copy.exam.submit}
            </button>}
        </div>
        {page < totalPages && (
          <div className="mx-auto mt-1 max-w-4xl text-right">
            <button type="button" disabled={submitting || Boolean(finished)} onClick={() => { if (window.confirm(copy.exam.submitConfirm(paper.length - answered))) void submit() }} className="min-h-9 text-xs font-semibold text-slate-600 underline-offset-4 hover:underline">
              {submitting ? copy.exam.submitting : copy.exam.submit}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ExamLoader({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const [runtime, setRuntime] = useState<MptRuntime | null>(() => takeRuntime(slug))
  const [error, setError] = useState<HostingerApiError | null>(null)
  useEffect(() => {
    if (runtime) return
    const controller = new AbortController()
    mptApi.resume(slug, examClientId(), controller.signal)
      .then(setRuntime)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        const failure = reason instanceof HostingerApiError ? reason : new HostingerApiError(copy.errors.generic, 0)
        // Direct URL without an attempt on this device: back through the gate.
        if (failure.code === 'device_conflict' || failure.status === 404) navigate(`/account/mpt/entrance/${slug}`, { replace: true })
        else if (failure.code === 'attempt_finished') navigate('/account/mpt', { replace: true })
        else setError(failure)
      })
    return () => controller.abort()
  }, [runtime, slug, navigate])
  if (error) return <ErrorNote error={error} onRetry={() => { setError(null); setRuntime(null) }} />
  if (!runtime) return <PageSkeleton />
  return <Runner slug={slug} runtime={runtime} />
}

export default function MptExam() {
  const { mock = '' } = useParams()
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-2">
        <MptGate><ExamLoader slug={mock} /></MptGate>
      </div>
    </main>
  )
}
