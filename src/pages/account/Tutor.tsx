import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, BookOpen, CornerDownRight, HelpCircle, History, Sparkles } from 'lucide-react'
import { AccountPage } from './shared'
import { useAccount } from '@/lib/accountContext'
import { HostingerApiError } from '@/lib/hostingerApi'
import { learningRequest, useLearning, type Attempt, type Overview } from '@/features/learning/api'
import { inputStyle, panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import { pakistanTime } from '@/features/membership/api'
import {
  areas,
  helpModes,
  learningReturn,
  usePendingQuestion,
  type Area,
  type AskBody,
  type ContextRead,
  type Exchange,
  type HelpMode,
  type TutorCatalog,
  type TutorContext,
  type TutorMeta,
  type TutorOverview,
} from '@/features/tutor/api'
const stateNames: Record<string, string> = {
  reserved: 'Accepted — awaiting dispatch',
  in_flight: 'Your question is being processed',
  unknown: 'Provider outcome unresolved',
  succeeded: 'Reply saved',
  failed: 'This request did not produce valid help',
}
function Load({ error, refresh }: { error?: string; refresh: () => void }) {
  return (
    <section className={panelStyle} role={error ? 'alert' : 'status'}>
      {error || 'Opening Ask VISTA…'}
      {error && (
        <button onClick={refresh} className={`${secondaryStyle} mt-3`}>
          Try again
        </button>
      )}
    </section>
  )
}
function Source({
  context,
  attempt,
  historic = false,
}: {
  context: TutorContext
  attempt: string
  historic?: boolean
}) {
  return (
    <section className={panelStyle}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            {historic ? 'Source saved with this question' : 'Selected learning context'}
          </p>
          <h2 className="mt-3 break-words text-xl font-bold text-slate-950">{context.title}</h2>
        </div>
        <BookOpen className="h-5 w-5 shrink-0 text-indigo-500" />
      </div>
      {context.date && (
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Edition: {context.date} · This is dated material, not live news.
        </p>
      )}
      <p className="mt-3 text-sm leading-7 text-slate-500">{context.attribution}</p>
      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-700">
          Read the source context
        </summary>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
          {context.text}
        </p>
        {context.sources.length > 0 && (
          <ul className="mt-4 space-y-3">
            {context.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-sm font-semibold text-indigo-700 underline"
                >
                  {s.publisher}
                </a>
              </li>
            ))}
          </ul>
        )}
      </details>
      <Link className={`${secondaryStyle} mt-4`} to={learningReturn(context, attempt)}>
        Continue learning <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  )
}
function Composer({
  source,
  meta,
  attempt,
  parent,
  draft,
  disabled,
  submit,
}: {
  source: ContextRead
  meta: TutorMeta
  attempt: string
  parent?: string
  draft?: string
  disabled: boolean
  submit: (body: AskBody) => Promise<void>
}) {
  const [question, setQuestion] = useState(draft || '')
  const [mode, setMode] = useState<HelpMode>('explain')
  const [acceptedHash, setAcceptedHash] = useState<string | null>(null)
  const [error, setError] = useState('')
  const c = source.configuration,
    usage = source.usage[source.context.feature]
  const accepted = acceptedHash !== null && acceptedHash === c.policy_hash
  const enabled =
    meta.active &&
    c.enabled &&
    usage.limit > usage.used + usage.reserved &&
    usage.accepted < usage.limit * 3 &&
    accepted &&
    !!attempt &&
    !!question.trim() &&
    !disabled
  async function ask(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!enabled || !c.policy_version || !c.policy_hash) return
    try {
      await submit({
        action: 'ask',
        request_id: crypto.randomUUID(),
        attempt_id: attempt,
        context_id: source.context.id,
        context_hash: source.context_hash,
        ...(parent ? { parent_id: parent } : {}),
        intent: mode,
        question,
        policy_version: c.policy_version,
        policy_hash: c.policy_hash,
        accepted: true,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your question could not be submitted.')
    }
  }
  return (
    <section className={panelStyle}>
      <h2 className="text-xl font-bold">
        {parent ? 'Ask a focused follow-up' : 'What would you like to understand?'}
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        One conceptual question at a time. Ask for a hint or explain where your understanding breaks
        down; complete answers and essays belong with a human mentor.
      </p>
      <form onSubmit={ask} className="mt-5 space-y-5">
        <div>
          <label htmlFor="tutor-mode" className="text-sm font-semibold text-slate-700">
            How should VISTA help?
          </label>
          <select
            id="tutor-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as HelpMode)}
            disabled={disabled}
            className={`${inputStyle} mt-2`}
          >
            {Object.entries(helpModes).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tutor-question" className="text-sm font-semibold text-slate-700">
            Your conceptual question
          </label>
          <textarea
            id="tutor-question"
            required
            minLength={8}
            maxLength={1000}
            rows={5}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={disabled}
            className={`${inputStyle} mt-2 resize-y`}
          />
          <p className="mt-2 text-xs text-slate-500">
            {question.length}/1000 characters · maximum 150 words
          </p>
        </div>
        {c.processing_notice && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {c.processing_notice}
            </p>
            <label className="mt-3 flex min-h-11 items-start gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-indigo-600"
                checked={accepted}
                disabled={disabled}
                onChange={(e) => setAcceptedHash(e.target.checked ? c.policy_hash : null)}
              />
              I have read and accept this processing notice.
            </label>
          </div>
        )}
        <p className="text-xs leading-6 text-slate-500">
          {usage.used} of {usage.limit} used today · {usage.reserved} pending · resets at midnight
          Pakistan time. Valid replies, including a request for more source context, use one
          allowance. Reading this source uses none.
        </p>
        {!meta.active && (
          <p className="text-sm text-slate-600">
            Active Pro is needed for new assistance.{' '}
            <Link className="font-semibold text-indigo-700 underline" to="/account/membership">
              Open membership
            </Link>
            .
          </p>
        )}
        {!c.enabled && (
          <p role="status" className="text-sm text-slate-600">
            Ask VISTA assistance is not open yet. You can read the selected material and continue
            learning.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button disabled={!enabled} className={primaryStyle}>
          <Sparkles className="h-4 w-4" />
          {disabled ? 'Checking your request…' : parent ? 'Ask follow-up' : 'Ask VISTA'}
        </button>
      </form>
    </section>
  )
}
function Answer({
  exchange,
  follow,
  refresh,
  resume,
  busy,
}: {
  exchange: Exchange
  follow: () => void
  refresh: () => void
  resume: (body: AskBody) => Promise<void>
  busy: boolean
}) {
  const { operation: op, context } = exchange
  const result = op.result
  return (
    <div className="space-y-6">
      <section className={panelStyle}>
        <p
          role="status"
          className="text-xs font-semibold uppercase tracking-widest text-indigo-600"
        >
          {stateNames[op.state]}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          {pakistanTime(op.created_at)} · {helpModes[exchange.intent]}
        </p>
        <h2 className="mt-5 whitespace-pre-wrap break-words text-xl font-bold leading-8">
          {exchange.question}
        </h2>
        {result && op.state === 'succeeded' ? (
          <div className="mt-6 space-y-5">
            <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
              {result.explanation}
            </p>
            {result.steps.length > 0 && (
              <ol className="space-y-3">
                {result.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                    <span className="font-bold text-indigo-600">{i + 1}.</span>
                    <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {result.check_question && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
                <h3 className="font-semibold text-indigo-900">Try explaining it yourself</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {result.check_question}
                </p>
              </div>
            )}
            {result.limitation && (
              <p className="text-sm leading-7 text-slate-500">{result.limitation}</p>
            )}
            {result.citations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500">
                  Evidence from the selected source
                </h3>
                {result.citations.map((c, i) => (
                  <blockquote
                    key={i}
                    className="mt-3 whitespace-pre-wrap break-words border-l-2 border-indigo-200 pl-4 text-sm leading-7 text-slate-600"
                  >
                    {c.quote}
                  </blockquote>
                ))}
              </div>
            )}
            <p className="text-xs leading-6 text-slate-500">
              AI learning guidance, not official examination advice or human marking. This exchange
              does not change your course progress, readiness or mentor marks.
            </p>
            <button onClick={follow} className={secondaryStyle}>
              <CornerDownRight className="h-4 w-4" />
              Ask a follow-up
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-7 text-slate-600">
              {op.state === 'unknown'
                ? 'The provider outcome is unresolved. A timeout does not confirm failure. Read the saved status; this question will not be automatically sent again.'
                : op.state === 'failed'
                  ? 'The successful-help allowance was released. The attempted provider call may still have had a cost; your question remains in history.'
                  : 'Your question has been accepted. Reading or refreshing its status does not start another provider request.'}
            </p>
            <button disabled={busy} className={secondaryStyle} onClick={refresh}>
              Refresh saved status
            </button>
            {op.state === 'reserved' && exchange.resume_body && (
              <button
                className={secondaryStyle}
                disabled={busy}
                onClick={() => {
                  void resume(exchange.resume_body!)
                }}
              >
                Resume saved request
              </button>
            )}
          </div>
        )}
        {exchange.parent_id && (
          <Link
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700"
            to={`/account/ask-vista?id=${exchange.parent_id}`}
          >
            Previous exchange <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>
      <Source context={context} attempt={exchange.attempt_id} historic />
    </div>
  )
}
function Workspace({ userId }: { userId: string }) {
  const [params, setParams] = useSearchParams()
  const id = params.get('id'),
    parent = params.get('follow'),
    requestedAttempt = params.get('attempt') || '',
    contextId = params.get('context') || '',
    category = (params.get('category') || contextId.split(':')[0] || 'grammar') as Area
  const offset = Math.max(0, Number(params.get('offset')) || 0),
    contextOffset = Math.max(0, Number(params.get('sourceOffset')) || 0)
  const read = useLearning<TutorOverview>(
    `tutor.php?offset=${offset}${requestedAttempt ? `&attempt=${encodeURIComponent(requestedAttempt)}` : ''}`,
  )
  const prep = useLearning<Overview>('learning.php')
  const ownedAttempt = useLearning<{ attempt: Attempt }>(
    requestedAttempt
      ? `learning.php?attempt_id=${encodeURIComponent(requestedAttempt)}`
      : undefined,
  )
  const detail = useLearning<{ exchange: Exchange }>(
    id || parent ? `tutor.php?id=${encodeURIComponent(id || parent || '')}` : undefined,
  )
  const meta = read.data
  const catalog = useLearning<TutorCatalog>(
    meta?.active && !id
      ? `tutor.php?category=${encodeURIComponent(category)}&offset=${contextOffset}`
      : undefined,
  )
  const chosenContext = contextId || catalog.data?.contexts[0]?.id || ''
  const source = useLearning<ContextRead>(
    meta?.active && !id && chosenContext
      ? `tutor.php?context=${encodeURIComponent(chosenContext)}`
      : undefined,
  )
  const pending = usePendingQuestion(userId)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [unaccepted, setUnaccepted] = useState(false),
    [draft, setDraft] = useState(''),
    [attemptChoice, setAttemptChoice] = useState('')
  const running = useRef(false)
  const attempts = [...(prep.data?.attempts || [])],
    chosenAttempt = ownedAttempt.data?.attempt
  if (chosenAttempt && !attempts.some((a) => a.id === chosenAttempt.id))
    attempts.unshift(chosenAttempt)
  const attempt = attemptChoice || requestedAttempt || attempts[0]?.id || ''
  const refreshDetail = detail.refresh
  const state = detail.data?.exchange.operation.state
  useEffect(() => {
    if (!['reserved', 'in_flight'].includes(state || '')) return
    let count = 0
    const timer = window.setInterval(() => {
      refreshDetail()
      if (++count >= 20) window.clearInterval(timer)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [state, refreshDetail])
  function open(exchange: Exchange) {
    pending.clear()
    setUnaccepted(false)
    setParams({ id: exchange.operation.id })
    read.refresh()
    detail.refresh()
  }
  async function submit(body: AskBody) {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError('')
    try {
      pending.keep(body)
      const response = await learningRequest<{ exchange: Exchange }>(userId, 'tutor.php', body)
      open(response.exchange)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Recover your saved request before asking again.',
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  async function recover() {
    if (!pending.pending || running.current) return
    running.current = true
    setBusy(true)
    setError('')
    try {
      const r = await learningRequest<{ exchange: Exchange }>(
        userId,
        `tutor.php?request_id=${pending.pending.request_id}`,
      )
      open(r.exchange)
    } catch (cause) {
      if (cause instanceof HostingerApiError && cause.status === 404) {
        setUnaccepted(true)
        setError(
          'No accepted question was found. You can retry the original request or edit it before submitting.',
        )
      } else
        setError(cause instanceof Error ? cause.message : 'Saved status could not be recovered.')
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  function editUnaccepted() {
    const body = pending.pending
    if (!body || !unaccepted) return
    setDraft(body.question)
    setAttemptChoice(body.attempt_id)
    setParams({
      context: body.context_id,
      category: body.context_id.split(':')[0],
      attempt: body.attempt_id,
      ...(body.parent_id ? { follow: body.parent_id } : {}),
    })
    pending.clear()
    setUnaccepted(false)
    setError('')
    read.refresh()
    source.refresh()
  }
  function choose(fields: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(fields).forEach(([key, value]) => next.set(key, value))
    next.delete('id')
    next.delete('follow')
    setDraft('')
    setParams(next)
  }
  if (!meta) return <Load error={read.error} refresh={read.refresh} />
  if ((id || parent) && !detail.data) return <Load error={detail.error} refresh={detail.refresh} />
  const current = detail.data?.exchange
  function follow() {
    if (!current) return
    setParams({
      follow: current.operation.id,
      attempt: current.attempt_id,
      context: current.context.id,
      category: current.context.category,
    })
    setAttemptChoice(current.attempt_id)
    setDraft('')
  }
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-300">
              A focused learning conversation
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Understand the next step. Do the thinking yourself.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Ask about the material you are studying. VISTA can explain a concept, help untangle a
              mistake or give you a hint, then return you to practice.
            </p>
          </div>
          <HelpCircle className="h-8 w-8 text-indigo-300" />
        </div>
        <p role="status" className="mt-5 text-xs leading-6 text-slate-300">
          {meta.configuration.enabled
            ? 'Assistance is available for active Pro members and approved contexts.'
            : 'Live assistance is not open yet. Saved exchanges remain available.'}{' '}
          Lessons, fixed checking and source reading use no AI allowance.
        </p>
      </section>
      {pending.pending && (
        <section className={`${panelStyle} border-amber-200`}>
          <h2 className="text-lg font-bold">Recover your previous question first</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
            {pending.pending.question}
          </p>
          <p className="mt-3 text-xs leading-6 text-slate-500">
            Reading saved status cannot send another provider request. Your recovery copy is private
            to this account and browser session.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={busy}
              className={primaryStyle}
              onClick={() => {
                void recover()
              }}
            >
              Recover saved request
            </button>
            {unaccepted && (
              <>
                <button
                  disabled={busy || !meta.active || !meta.configuration.enabled}
                  className={secondaryStyle}
                  onClick={() => {
                    void submit(pending.pending!)
                  }}
                >
                  Retry original question
                </button>
                <button disabled={busy} className={secondaryStyle} onClick={editUnaccepted}>
                  Edit unaccepted question
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 p-4 text-sm leading-7 text-red-700"
        >
          {error}
        </p>
      )}
      {id && current ? (
        <>
          <button className={secondaryStyle} onClick={() => setParams({})}>
            All saved exchanges
          </button>
          <Answer
            exchange={current}
            follow={follow}
            refresh={detail.refresh}
            resume={submit}
            busy={busy}
          />
        </>
      ) : (
        <>
          {!meta.active ? (
            <section className={panelStyle}>
              <h2 className="text-xl font-bold">New assistance needs active Pro</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Your existing saved questions and replies remain readable after expiry. Continue
                free study in the existing Grammar course and other learning tools.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className={secondaryStyle} to="/account/membership">
                  Membership &amp; access
                </Link>
                <Link className={secondaryStyle} to="/grammar-course">
                  Continue Grammar
                </Link>
              </div>
            </section>
          ) : (
            <>
              <section className={panelStyle}>
                <h2 className="text-xl font-bold">Choose your learning context</h2>
                <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="tutor-attempt" className="text-sm font-semibold text-slate-700">
                      Preparation attempt
                    </label>
                    <select
                      id="tutor-attempt"
                      className={`${inputStyle} mt-2`}
                      value={attempt}
                      onChange={(e) => setAttemptChoice(e.target.value)}
                      disabled={busy || !!parent || !!pending.pending}
                    >
                      <option value="">Choose an attempt</option>
                      {attempts.map((a) => (
                        <option key={a.id} value={a.id}>
                          CSS {a.target_year} · {a.daily_minutes} min/day
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tutor-area" className="text-sm font-semibold text-slate-700">
                      Learning area
                    </label>
                    <select
                      id="tutor-area"
                      className={`${inputStyle} mt-2`}
                      value={category}
                      onChange={(e) =>
                        choose({ category: e.target.value, sourceOffset: '0', context: '' })
                      }
                      disabled={busy || !!parent || !!pending.pending}
                    >
                      {Object.entries(areas).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="tutor-context" className="text-sm font-semibold text-slate-700">
                      Lesson or source
                    </label>
                    <select
                      id="tutor-context"
                      className={`${inputStyle} mt-2`}
                      value={chosenContext}
                      onChange={(e) => choose({ context: e.target.value })}
                      disabled={busy || !!parent || !!pending.pending}
                    >
                      <option value="">Choose a context</option>
                      {source.data &&
                        !catalog.data?.contexts.some((c) => c.id === source.data!.context.id) && (
                          <option value={source.data.context.id}>
                            {source.data.context.title}
                          </option>
                        )}
                      {catalog.data?.contexts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                          {c.date ? ` · ${c.date}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {catalog.error && (
                  <p className="mt-3 text-sm text-red-700" role="alert">
                    {catalog.error}
                  </p>
                )}
                {catalog.data?.contexts.length === 0 && (
                  <p className="mt-3 text-sm text-slate-500">
                    No approved source is available in this view. Try another learning area.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    disabled={contextOffset === 0 || !!parent || !!pending.pending}
                    className={secondaryStyle}
                    onClick={() =>
                      choose({ sourceOffset: String(Math.max(0, contextOffset - 50)), context: '' })
                    }
                  >
                    Previous sources
                  </button>
                  <button
                    disabled={!catalog.data?.has_more || !!parent || !!pending.pending}
                    className={secondaryStyle}
                    onClick={() =>
                      choose({ sourceOffset: String(contextOffset + 50), context: '' })
                    }
                  >
                    More sources
                  </button>
                </div>
                {prep.error && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {prep.error}{' '}
                    <button className="underline" onClick={prep.refresh}>
                      Reload attempts
                    </button>
                  </p>
                )}
                {!attempt && (
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
                    to="/account/preparation?new=attempt"
                  >
                    Create a preparation attempt
                  </Link>
                )}
                {parent && (
                  <p className="mt-4 text-sm leading-7 text-slate-500">
                    Following up this saved exchange. Only the selected source and one previous
                    question/reply are used.{' '}
                    <button
                      className="font-semibold text-indigo-700 underline"
                      onClick={() => choose({ context: chosenContext })}
                    >
                      Start a fresh question
                    </button>
                  </p>
                )}
              </section>
              {chosenContext && !source.data ? (
                <Load error={source.error} refresh={source.refresh} />
              ) : (
                source.data && (
                  <>
                    <Source context={source.data.context} attempt={attempt} />
                    <button
                      className={secondaryStyle}
                      onClick={() => {
                        read.refresh()
                        source.refresh()
                        catalog.refresh()
                      }}
                    >
                      Refresh assistance status
                    </button>
                    <Composer
                      key={`${source.data.context_hash}:${attempt}:${parent || ''}:${draft}`}
                      source={source.data}
                      meta={meta}
                      attempt={attempt}
                      parent={parent || undefined}
                      draft={draft}
                      disabled={busy || !!pending.pending}
                      submit={submit}
                    />
                  </>
                )
              )}
            </>
          )}
        </>
      )}
      <section className={panelStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <History className="h-5 w-5" />
            Saved questions &amp; replies
          </h2>
          <button className={secondaryStyle} onClick={read.refresh}>
            Refresh history
          </button>
        </div>
        {meta.history.length ? (
          <ul className="mt-4 divide-y">
            {meta.history.map((h) => (
              <li key={h.operation_id}>
                <Link
                  to={`/account/ask-vista?id=${h.operation_id}`}
                  className="block min-h-16 space-y-2 py-4"
                >
                  <p className="break-words font-semibold text-slate-800">{h.question}</p>
                  <p className="text-xs leading-6 text-slate-500">
                    {stateNames[h.state]} · {pakistanTime(h.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed p-5 text-sm leading-7 text-slate-500">
            No saved questions in this view. Only real accepted exchanges appear here.
          </p>
        )}
        <nav aria-label="Tutor history pages" className="mt-5 flex flex-wrap gap-3">
          <button
            disabled={offset === 0}
            className={secondaryStyle}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set('offset', String(Math.max(0, offset - 50)))
              setParams(next)
            }}
          >
            Previous history
          </button>
          <button
            disabled={!meta.has_more}
            className={secondaryStyle}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set('offset', String(offset + 50))
              setParams(next)
            }}
          >
            Next history
          </button>
        </nav>
      </section>
    </div>
  )
}
export default function TutorPage() {
  const { user } = useAccount()
  return (
    <AccountPage
      title="Ask VISTA"
      intro="Conceptual help connected to the material you are studying."
    >
      {user && <Workspace key={user.id} userId={user.id} />}
    </AccountPage>
  )
}
