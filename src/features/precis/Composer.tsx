import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Clock, Save } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { HostingerApiError } from '@/lib/hostingerApi'
import { readDraft, useAutosavedDraft } from '@/hooks/useAutosavedDraft'
import { learningRequest, saveIdentity, type SaveResult } from '@/features/learning/api'
import { inputStyle, panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import {
  blankScratch,
  draftKey,
  lengthInfo,
  type Context,
  type Detail,
  type Overview,
  type Passage,
  type Scratch,
} from './api'
const steps = [
  'Read',
  'Identify',
  'Skeleton',
  'Select',
  'Compress',
  'Paraphrase',
  'Draft',
  'Title',
  'Count',
  'Revise',
]
type Draft = Context & {
  text: string
  original: string
  sourceLabel: string
  wordLimit: string
  step: number
  base: number
}
type Pending = { body: Record<string, unknown>; request: string }
function readPending(key: string, attempt: string, writing?: string): Pending | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null') as Pending | null
    return value &&
      /^[a-f0-9-]{36}$/i.test(value.request) &&
      value.body?.action === 'writing_save' &&
      value.body.attempt_id === attempt &&
      value.body.id === writing
      ? value
      : null
  } catch {
    return null
  }
}
function fresh(data: Overview, source: Passage, detail?: Detail): Draft {
  return {
    title: detail?.context?.title || '',
    text: detail?.version.text || '',
    original: source.text,
    sourceLabel: source.source,
    wordLimit: source.limit === null ? '' : String(source.limit),
    scratch: detail?.context?.scratch || blankScratch(),
    self_check:
      detail?.context?.self_check ||
      Object.fromEntries(Object.keys(data.rubric).map((k) => [k, null])),
    timer: null,
    step: 0,
    base: detail?.writing.version || 0,
  }
}
function restore(value: unknown, fallback: Draft): Draft {
  if (!value || typeof value !== 'object') return fallback
  const v = value as Partial<Draft>
  if (
    !['title', 'text', 'original', 'sourceLabel', 'wordLimit'].every(
      (k) => typeof v[k as keyof Draft] === 'string',
    ) ||
    !Number.isInteger(v.base) ||
    !Number.isInteger(v.step) ||
    v.step! < 0 ||
    v.step! > 9 ||
    !v.scratch ||
    !v.self_check
  )
    return fallback
  const scratch = Object.fromEntries(
    Object.keys(blankScratch()).map((k) => [
      k,
      typeof v.scratch![k as keyof Scratch] === 'string' ? v.scratch![k as keyof Scratch] : '',
    ]),
  ) as Scratch
  const self_check = Object.fromEntries(
    Object.keys(fallback.self_check).map((k) => [
      k,
      typeof v.self_check![k] === 'number' &&
      Number.isInteger(v.self_check![k]) &&
      v.self_check![k]! >= 0 &&
      v.self_check![k]! <= 5
        ? v.self_check![k]
        : null,
    ]),
  )
  const t = v.timer,
    timer =
      t &&
      Number.isInteger(t.minutes) &&
      t.minutes >= 1 &&
      t.minutes <= 120 &&
      (t.started_at === null || Number.isFinite(t.started_at)) &&
      (t.finished_at === null || Number.isFinite(t.finished_at))
        ? t
        : null
  return { ...fallback, ...v, scratch, self_check, timer } as Draft
}
export default function Composer({
  data,
  attempt,
  source,
  detail,
  timed,
  onSaved,
}: {
  data: Overview
  attempt: string
  source: Passage
  detail?: Detail
  timed: boolean
  onSaved: (writing: string, version: string) => void
}) {
  const { user } = useAccount(),
    writing = detail?.writing
  const key = draftKey(user!.id, attempt, source.id || 'custom', writing?.id, detail?.version.id)
  const pendingKey = `cssvista:precis-pending:${key}`,
    [pending, setPending] = useState(() => readPending(pendingKey, attempt, writing?.id))
  const [draft, setDraft] = useState(() => {
      const fallback = fresh(data, source, detail)
      return pending
        ? restore(
            {
              ...fallback,
              ...pending.body,
              original: pending.body.original || fallback.original,
              sourceLabel: pending.body.source_label || fallback.sourceLabel,
              wordLimit:
                pending.body.word_limit === null
                  ? ''
                  : String(pending.body.word_limit ?? fallback.wordLimit),
              base: pending.body.expected_version,
            },
            fallback,
          )
        : restore(readDraft<unknown>(key), fallback)
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [hint, setHint] = useState(false),
    [showSource, setShowSource] = useState(true),
    [now, setNow] = useState(Date.now)
  const { status, clearDraft } = useAutosavedDraft(key, draft),
    alive = useRef(true),
    running = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    if (!draft.timer?.started_at || draft.timer.finished_at) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [draft.timer?.started_at, draft.timer?.finished_at])
  const custom = source.id === null && !writing,
    original = custom ? draft.original : source.text,
    limit = custom ? (draft.wordLimit ? Number(draft.wordLimit) : null) : source.limit,
    counts = lengthInfo(original, draft.text, limit)
  const stale = !!writing && draft.base !== writing.version,
    remaining = draft.timer?.started_at
      ? Math.max(
          0,
          Math.ceil(
            (draft.timer.started_at +
              draft.timer.minutes * 60000 -
              (draft.timer.finished_at || now)) /
              1000,
          ),
        )
      : null
  function note(field: keyof Scratch, label: string, help?: string) {
    return (
      <label className="grid gap-2 text-sm font-semibold">
        {label}
        {help && <span className="text-xs font-normal leading-6 text-slate-500">{help}</span>}
        <textarea
          rows={field === 'central_idea' ? 3 : 4}
          maxLength={4000}
          value={draft.scratch[field]}
          onChange={(e) =>
            setDraft((d) => ({ ...d, scratch: { ...d.scratch, [field]: e.target.value } }))
          }
          className={`${inputStyle} resize-y bg-white leading-7`}
        />
      </label>
    )
  }
  async function save() {
    if (!user || !attempt || running.current || (stale && !pending)) return
    if (!pending && (!draft.text.trim() || !draft.title.trim())) {
      setError('Write your précis and a title before saving.')
      setDraft((d) => ({ ...d, step: !d.text.trim() ? 6 : 7 }))
      return
    }
    running.current = true
    setBusy(true)
    setError('')
    const body = {
      action: 'writing_save',
      ...(writing
        ? { id: writing.id }
        : custom
          ? { original: draft.original, source_label: draft.sourceLabel, word_limit: limit }
          : { passage_id: source.id }),
      expected_version: draft.base,
      attempt_id: attempt,
      title: draft.title,
      text: draft.text,
      scratch: draft.scratch,
      self_check: draft.self_check,
      timer: draft.timer,
    }
    try {
      const identity = pending
        ? null
        : await saveIdentity(
            user.id,
            `precis:save:${attempt}:${writing?.id || source.id || 'custom'}`,
            body,
          )
      const accepted = pending || { body, request: identity!.id }
      setPending(accepted)
      try {
        localStorage.setItem(pendingKey, JSON.stringify(accepted))
      } catch {
        /* In-memory exact replay remains available while this page stays open. */
      }
      const result = await learningRequest<SaveResult>(user.id, 'precis.php', {
        ...accepted.body,
        request_id: accepted.request,
      })
      identity?.done()
      try {
        localStorage.removeItem(pendingKey)
      } catch {
        /* The same identity still replays safely. */
      }
      clearDraft()
      if (alive.current && result.writing_id && result.version_id) {
        setPending(null)
        onSaved(result.writing_id, result.version_id)
      }
    } catch (cause) {
      if (
        cause instanceof HostingerApiError &&
        [400, 401, 403, 404, 409, 413, 422, 429].includes(cause.status)
      ) {
        try {
          localStorage.removeItem(pendingKey)
        } catch {
          /* In-memory draft remains editable. */
        }
        if (alive.current) setPending(null)
      }
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Your browser draft remains here. Refresh history before retrying.',
        )
    } finally {
      running.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <fieldset disabled={busy || !!pending} className="min-w-0 space-y-6">
        <section className={panelStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {writing ? 'Improve my Précis' : timed ? 'Timed practice' : 'Full Précis practice'}
            </h2>
            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
              {counts.source} → {counts.draft} words · {counts.ratio}% retained
            </p>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Understand the argument, compress its meaning and write in your own words. Scratch notes
            are optional. Saving never replaces an earlier version.
          </p>
          {timed && (
            <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
              <label className="grid gap-2 text-sm font-semibold">
                Practice minutes
                <input
                  type="number"
                  min={1}
                  max={120}
                  disabled={!!draft.timer?.started_at && !draft.timer.finished_at}
                  value={draft.timer?.minutes || 30}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      timer: {
                        minutes: Math.min(120, Math.max(1, Number(e.target.value) || 1)),
                        started_at: null,
                        finished_at: null,
                      },
                    }))
                  }
                  className={`${inputStyle} max-w-32`}
                />
              </label>
              <button
                className={secondaryStyle}
                disabled={!!draft.timer?.started_at && !draft.timer.finished_at}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    timer: {
                      minutes: d.timer?.minutes || 30,
                      started_at: Date.now(),
                      finished_at: null,
                    },
                  }))
                }
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                Start timer
              </button>
              {draft.timer?.started_at && !draft.timer.finished_at && (
                <button
                  className={secondaryStyle}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      timer: d.timer && { ...d.timer, finished_at: Date.now() },
                    }))
                  }
                >
                  Finish practice
                </button>
              )}
              {remaining !== null && (
                <p className="py-3 text-sm tabular-nums">
                  {draft.timer?.finished_at ? 'Finished · ' : ''}
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} remaining
                </p>
              )}
              {remaining === 0 && (
                <p role="status" className="w-full text-sm">
                  Practice time has ended. Your draft is still editable; revise and save when ready.
                </p>
              )}
            </div>
          )}
          <div
            className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5"
            role="group"
            aria-label="Writing stages"
          >
            {steps.map((step, i) => (
              <button
                key={step}
                aria-pressed={draft.step === i}
                onClick={() => setDraft((d) => ({ ...d, step: i }))}
                className={`min-h-11 rounded-lg px-3 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${draft.step === i ? 'bg-indigo-600 font-semibold text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              >
                {i + 1}. {step}
              </button>
            ))}
          </div>
        </section>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <aside className={`${panelStyle} min-w-0`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Original passage</h3>
              <button
                className={secondaryStyle}
                onClick={() => setShowSource((v) => !v)}
                aria-expanded={showSource}
              >
                {showSource ? 'Hide while drafting' : 'Show passage'}
              </button>
            </div>
            <p className="mt-3 break-words text-xs leading-6 text-slate-500">
              {custom ? 'Private practice passage supplied by you.' : source.source}
            </p>
            {showSource &&
              (custom ? (
                <div className="mt-4 space-y-4">
                  <label className="grid gap-2 text-sm font-semibold">
                    Original passage
                    <textarea
                      rows={10}
                      maxLength={20000}
                      value={draft.original}
                      onChange={(e) => setDraft((d) => ({ ...d, original: e.target.value }))}
                      className={`${inputStyle} resize-y bg-white leading-7`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Source / attribution
                    <input
                      maxLength={500}
                      value={draft.sourceLabel}
                      onChange={(e) => setDraft((d) => ({ ...d, sourceLabel: e.target.value }))}
                      className={inputStyle}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Explicit question word limit, if provided
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={draft.wordLimit}
                      onChange={(e) => setDraft((d) => ({ ...d, wordLimit: e.target.value }))}
                      className={inputStyle}
                    />
                  </label>
                </div>
              ) : (
                <p className="mt-5 whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                  {original}
                </p>
              ))}
            <p className="mt-5 text-xs leading-6 text-slate-500">
              {limit === null
                ? 'No explicit limit. Roughly one-third is a teaching guide; fidelity comes first.'
                : `Question limit: ${limit} words. The title is counted separately.`}
            </p>
            {source.hint && (
              <>
                <button
                  className={`${secondaryStyle} mt-4`}
                  disabled={draft.scratch.central_idea.trim().length < 10}
                  onClick={() => setHint((v) => !v)}
                  aria-expanded={hint}
                >
                  Compare my skeleton with a hint
                </button>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Write your own central idea before opening the handbook hint.
                </p>
                {hint && <p className="mt-3 text-sm leading-7">{source.hint}</p>}
              </>
            )}
          </aside>
          <section className={`${panelStyle} min-w-0 space-y-5`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
              Stage {draft.step + 1} · {steps[draft.step]}
            </p>
            {draft.step === 0 && (
              <div className="space-y-4 text-sm leading-7">
                <h3 className="text-xl font-semibold">Read before writing</h3>
                <p>
                  Read for topic, tone and direction. Read again for the argument; notice but,
                  because, only, may and when. Identify which details support or limit the claim.
                </p>
                <p>
                  A précis reports the writer’s argument. Keep outside knowledge, agreement and
                  criticism out of your draft.
                </p>
              </div>
            )}
            {draft.step === 1 && (
              <>
                {note('topic', 'Broad topic')}
                {note(
                  'central_idea',
                  'One-sentence controlling idea',
                  'What is the writer saying about the topic? Keep the whole argument, including its limits.',
                )}
              </>
            )}
            {draft.step === 2 &&
              note(
                'skeleton',
                'Map the argument',
                'Label only the moves present: claim, cause, effect, contrast, qualification, example, problem, remedy or conclusion.',
              )}
            {draft.step === 3 && (
              <>
                {note(
                  'essential',
                  'Keep the essential ideas',
                  'Would removing this idea change the main argument?',
                )}
                {note(
                  'removable',
                  'Compress or remove',
                  'Examples, repetition and decorative detail may go only when their function is secondary.',
                )}
              </>
            )}
            {draft.step === 4 &&
              note(
                'compression',
                'Conceptual compression',
                'Find an accurate umbrella category. Merge cause chains and duplicated meaning without becoming vague.',
              )}
            {draft.step === 5 &&
              note(
                'paraphrase',
                'Paraphrase and connect',
                'Preserve cause, contrast and condition. “May weaken” must not become “destroys”.',
              )}
            {draft.step === 6 && (
              <label className="grid gap-2 text-sm font-semibold">
                Your independent Précis
                <textarea
                  rows={12}
                  maxLength={20000}
                  value={draft.text}
                  onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                  className={`${inputStyle} resize-y bg-white text-base leading-8`}
                />
                <span className="text-xs font-normal text-slate-500">
                  Try drafting from your skeleton with the passage hidden.
                </span>
              </label>
            )}
            {draft.step === 7 && (
              <label className="grid gap-2 text-sm font-semibold">
                Your title
                <input
                  maxLength={180}
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className={inputStyle}
                />
                <span className="text-xs font-normal leading-6 text-slate-500">
                  Does it cover the whole passage and its controlling idea? A broad topic or a minor
                  detail is usually too weak.
                </span>
              </label>
            )}
            {draft.step === 8 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Length control</h3>
                <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <dt>Original</dt>
                    <dd className="mt-2 text-xl font-semibold">{counts.source} words</dd>
                  </div>
                  <div>
                    <dt>Your draft</dt>
                    <dd className="mt-2 text-xl font-semibold">{counts.draft} words</dd>
                  </div>
                  <div>
                    <dt>Retained length</dt>
                    <dd className="mt-2 font-semibold">{counts.ratio}%</dd>
                  </div>
                  <div>
                    <dt>Explicit limit</dt>
                    <dd className="mt-2 font-semibold">{limit ?? 'Not specified'}</dd>
                  </div>
                </dl>
                {counts.over && (
                  <p role="status" className="text-sm font-semibold text-amber-800">
                    {Math.abs(counts.remaining!)} words over the question limit. You can save this
                    draft, then revise it.
                  </p>
                )}
                <p className="text-sm leading-7 text-slate-500">
                  Count excludes the title. Hyphenated words and internal apostrophes count as one.
                  Remove repeated meaning and inflated phrases, then check fidelity again. A shorter
                  draft is not automatically better.
                </p>
              </div>
            )}
            {draft.step === 9 && (
              <>
                <h3 className="text-xl font-semibold">Self-check and rewrite task</h3>
                <p className="text-xs leading-7 text-slate-500">
                  Your self-rating is a learning aid, not an official mark or automated assessment.
                  Leave a criterion unscored if uncertain.
                </p>
                {Object.entries(data.rubric).map(([id, label]) => (
                  <label key={id} className="grid gap-2 text-sm font-semibold">
                    {label}
                    <select
                      value={draft.self_check[id] ?? ''}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          self_check: {
                            ...d.self_check,
                            [id]: e.target.value === '' ? null : Number(e.target.value),
                          },
                        }))
                      }
                      className={inputStyle}
                    >
                      <option value="">Unscored</option>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                {note('reflection', 'What meaning did I lose or distort?')}
                {note('rewrite_task', 'My most important rewrite task')}
              </>
            )}
            <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
              <button
                disabled={draft.step === 0}
                className={secondaryStyle}
                onClick={() => setDraft((d) => ({ ...d, step: Math.max(0, d.step - 1) }))}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <button
                disabled={draft.step === 9}
                className={secondaryStyle}
                onClick={() => setDraft((d) => ({ ...d, step: Math.min(9, d.step + 1) }))}
              >
                Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </fieldset>
      <section className={`${panelStyle} space-y-4`}>
        <p role="status" className="text-xs leading-6 text-slate-500">
          {status === 'error'
            ? 'Browser draft could not be saved. Keep this page open; save a version to your account or copy your work.'
            : status === 'saved'
              ? 'Draft saved in this browser for this account and attempt. Save a version to keep it across devices.'
              : 'Saving browser draft…'}
        </p>
        {pending && (
          <p className="text-sm leading-7 text-slate-600">
            This save has not been confirmed. Recover it before editing; the exact submitted wording
            is retained for retry.
          </p>
        )}
        {stale && !pending && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7">
            <p>
              This draft started from an older record. Review the latest saved version before
              saving.
            </p>
            <button
              className="min-h-11 font-semibold text-indigo-700 underline"
              onClick={() => setDraft((d) => ({ ...d, base: writing!.version }))}
            >
              I reviewed the latest version; keep my draft
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm leading-7 text-red-800">
            {error}
          </p>
        )}
        <button
          className={primaryStyle}
          disabled={busy || !attempt || (stale && !pending)}
          onClick={() => void save()}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {busy
            ? 'Saving…'
            : pending
              ? 'Recover saved version'
              : writing
                ? 'Save my rewrite'
                : 'Save my Précis'}
        </button>
        {!attempt && (
          <Link
            to="/account/preparation?new=attempt"
            className="ml-4 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
          >
            Create a preparation attempt
          </Link>
        )}
      </section>
    </div>
  )
}
