import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { FileCheck2, ArrowDown, BookOpen } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { HostingerApiError } from '@/lib/hostingerApi'
import { learningRequest, useLearning } from '@/features/learning/api'
import { panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import { pakistanTime } from '@/features/membership/api'
import {
  feedbackStatus,
  precisGrammarLink,
  wordCount,
  type Detail,
  type FeedbackData,
  type FeedbackOperation,
  type FeedbackComparison,
  type WritingProfile,
} from './api'
type Request = {
  action: 'evaluate'
  request_id: string
  version_id: string
  policy_version: string
  accepted: true
}
const terminal = (op?: FeedbackOperation) => op && ['succeeded', 'failed'].includes(op.state)
function restore(key: string, version: string): Request | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null') as Request | null
    return value?.action === 'evaluate' &&
      value.accepted === true &&
      value.version_id === version &&
      /^[a-f0-9-]{36}$/i.test(value.request_id) &&
      /^[a-zA-Z0-9._-]{1,80}$/.test(value.policy_version)
      ? value
      : null
  } catch {
    return null
  }
}
export default function Feedback({
  detail,
  skills,
  active,
}: {
  detail: Detail
  skills: Record<string, string>
  active: boolean
}) {
  const { user } = useAccount(),
    read = useLearning<FeedbackData>(`precis-feedback.php?version_id=${detail.version.id}`)
  const key = `cssvista:precis-feedback:${user?.id}:${detail.version.id}`
  const [pending, setPending] = useState<Request | null>(() => restore(key, detail.version.id)),
    [reported, setReported] = useState<FeedbackOperation>(),
    [acceptedPolicy, setAcceptedPolicy] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const running = useRef(false),
    alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const data = read.data,
    saved = data?.operations[0],
    operation = terminal(saved) ? saved : reported || saved
  const accepted = acceptedPolicy !== null && acceptedPolicy === data?.configuration.policy_version
  const feedback = data?.feedback || (operation?.state === 'succeeded' ? operation.result : null)
  const blocked = operation && ['reserved', 'in_flight', 'unknown'].includes(operation.state)
  const within =
    data &&
    wordCount(detail.source.text) <= data.configuration.max_source_words &&
    detail.version.word_count <= data.configuration.max_draft_words &&
    detail.version.text.length <= data.configuration.max_draft_characters &&
    !/\n\s*\n/u.test(detail.version.text)
  const allowed = !!(
    active &&
    detail.context &&
    data?.configuration.enabled &&
    within &&
    data.usage.used + data.usage.reserved < data.usage.limit &&
    data.usage.accepted < data.usage.limit * 3 &&
    !feedback &&
    !blocked &&
    !pending
  )
  const pendingState = operation?.state,
    refreshStatus = read.refresh
  useEffect(() => {
    if (!pendingState || !['reserved', 'in_flight'].includes(pendingState)) return
    let count = 0
    const interval = window.setInterval(() => {
      refreshStatus()
      if (++count >= 20) window.clearInterval(interval)
    }, 6000)
    return () => window.clearInterval(interval)
  }, [pendingState, refreshStatus])
  async function request(recover: boolean) {
    if (!user || running.current || !data) return
    running.current = true
    setBusy(true)
    setError('')
    const body = recover
      ? pending
      : {
          action: 'evaluate' as const,
          request_id: crypto.randomUUID(),
          version_id: detail.version.id,
          policy_version: data.configuration.policy_version!,
          accepted: true as const,
        }
    if (!body) {
      running.current = false
      setBusy(false)
      return
    }
    let durable = true
    try {
      localStorage.setItem(key, JSON.stringify(body))
    } catch {
      durable = false
    }
    setPending(body)
    try {
      let op: FeedbackOperation | undefined
      if (recover) {
        try {
          op = (
            await learningRequest<{ operation: FeedbackOperation }>(
              user.id,
              `precis-feedback.php?request_id=${body.request_id}`,
            )
          ).operation
        } catch (cause) {
          if (!(cause instanceof HostingerApiError) || cause.status !== 404) throw cause
        }
      }
      if (!op || op.state === 'reserved')
        op = (
          await learningRequest<{ operation: FeedbackOperation }>(
            user.id,
            'precis-feedback.php',
            body,
          )
        ).operation
      if (!alive.current) return
      setReported(op)
      if (terminal(op)) {
        setPending(null)
        try {
          localStorage.removeItem(key)
        } catch {
          /* Terminal state remains visible in owned history. */
        }
      }
      read.refresh()
      if (!durable)
        setError(
          'Browser recovery storage is unavailable. Keep this page open to recover the same request; saved server history remains available.',
        )
    } catch (cause) {
      if (!alive.current) return
      if (
        cause instanceof HostingerApiError &&
        [400, 401, 403, 409, 413, 422, 429].includes(cause.status)
      ) {
        setPending(null)
        try {
          localStorage.removeItem(key)
        } catch {
          /* Optional local receipt. */
        }
        read.refresh()
      }
      setError(
        cause instanceof Error
          ? cause.message
          : 'The response did not arrive. Recover this saved request before requesting new feedback.',
      )
    } finally {
      running.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <section id="precis-feedback" className={`${panelStyle} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
            Read the evidence
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold">
            <FileCheck2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Feedback on saved Version {detail.version.version}
          </h2>
        </div>
        {data && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6">
            {data.usage.used} of {data.usage.limit} evaluations used · {data.usage.reserved}{' '}
            reserved
            <br />
            Resets {pakistanTime(data.reset_at)}
          </p>
        )}
      </div>
      <p className="text-sm leading-7 text-slate-600">
        Review your original passage, saved title and draft. Feedback checks meaning against the
        source and gives hints for an independent rewrite. Unsaved edits are kept separate.
      </p>
      {!data ? (
        <p role={read.error ? 'alert' : 'status'} className="text-sm leading-7">
          {read.error || 'Loading saved feedback…'}
          {read.error && (
            <button className={`${secondaryStyle} ml-3`} onClick={read.refresh}>
              Retry
            </button>
          )}
        </p>
      ) : (
        <>
          {!data.configuration.enabled && (
            <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm leading-7">
              Personal Précis feedback is not open yet. Keep practising with the handbook and fixed
              drills; saved drafts and feedback remain readable.
            </p>
          )}
          {data.configuration.enabled && !active && (
            <p className="text-sm leading-7">
              Active Pro access is needed for new evaluations. Earlier feedback stays available.
            </p>
          )}
          {!detail.context && (
            <p className="text-sm leading-7">
              This version has no saved Lab title and notes. Save a new Précis Lab version before
              evaluation.
            </p>
          )}
          {active && data.configuration.enabled && !within && (
            <p className="rounded-xl border border-amber-200 p-4 text-sm leading-7 text-amber-900">
              Feedback accepts an original of up to{' '}
              {data.configuration.max_source_words.toLocaleString()} words and one connected draft
              of up to {data.configuration.max_draft_words} words /{' '}
              {data.configuration.max_draft_characters.toLocaleString()} characters. Save an
              appropriately scoped version to continue.
            </p>
          )}
          {blocked && (
            <p role="status" className="rounded-xl border border-indigo-200 p-4 text-sm leading-7">
              {operation.state === 'unknown'
                ? 'The provider outcome is unresolved. Its allowance remains reserved. Read the saved status; this request will not be dispatched again.'
                : 'Your accepted request is pending. You can return later; reading status does not start another evaluation.'}
            </p>
          )}
          {operation?.state === 'failed' && (
            <p className="text-sm leading-7">
              Useful feedback was not saved. The successful-use reservation was released; the
              accepted request still counts toward the daily attempt limit.
            </p>
          )}
          {pending && (
            <button disabled={busy} onClick={() => void request(true)} className={secondaryStyle}>
              {busy ? 'Checking saved request…' : 'Recover saved feedback request'}
            </button>
          )}
          {active && data.configuration.enabled && !feedback && !blocked && !pending && (
            <>
              {!allowed && within && detail.context && (
                <p role="status" className="text-sm leading-7">
                  Your daily evaluation or request-attempt allowance is used or reserved. Continue
                  with saved feedback and stored practice.
                </p>
              )}
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                {data.configuration.processing_notice}
              </p>
              <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-indigo-600"
                  checked={accepted}
                  disabled={!allowed}
                  onChange={(e) =>
                    setAcceptedPolicy(e.target.checked ? data.configuration.policy_version : null)
                  }
                />
                <span>
                  I reviewed this saved version and understand how its original, title, central-idea
                  note and draft will be processed.
                </span>
              </label>
              <button
                disabled={!allowed || !accepted || busy}
                onClick={() => void request(false)}
                className={primaryStyle}
              >
                {busy ? 'Evaluating saved version…' : 'Evaluate this saved Précis'}
              </button>
            </>
          )}
        </>
      )}
      {feedback && (
        <div className="space-y-5 border-t border-slate-200 pt-5">
          <h3 className="text-lg font-semibold">Saved source-bound diagnosis</h3>
          <p className="whitespace-pre-wrap break-words rounded-xl bg-indigo-50 p-5 text-sm leading-7 text-indigo-950">
            {feedback.summary}
          </p>
          <p className="text-xs leading-6 text-slate-500">
            AI learning feedback can be mistaken. Check the exact evidence against the original;
            these are draft-level observations, not official marks or a mastery certificate.
          </p>
          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Your central-idea note · {feedback.central_idea_note.status.replaceAll('_', ' ')}
            </summary>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
              {detail.context?.scratch.central_idea || 'No note supplied with this version.'}
            </p>
            {feedback.central_idea_note.source_excerpt && (
              <blockquote className="mt-3 border-l-2 border-indigo-300 pl-4 text-sm leading-7">
                <span className="block text-xs font-semibold">Original evidence</span>
                {feedback.central_idea_note.source_excerpt}
              </blockquote>
            )}
            <p className="mt-3 text-sm leading-7">{feedback.central_idea_note.explanation}</p>
            <p className="mt-3 text-sm leading-7">
              <strong>Hint: </strong>
              {feedback.central_idea_note.hint}
            </p>
          </details>
          <div className="grid gap-4 lg:grid-cols-2">
            {[...feedback.skills]
              .sort((a, b) => Number(b.status === 'needs_work') - Number(a.status === 'needs_work'))
              .map((s) => (
                <details
                  key={s.skill}
                  className="min-w-0 rounded-xl border border-slate-200 p-4"
                  open={s.status === 'needs_work'}
                >
                  <summary className="min-h-11 cursor-pointer">
                    <span className="font-semibold">{skills[s.skill] || s.skill}</span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {feedbackStatus[s.status]}
                    </span>
                  </summary>
                  {s.source_excerpt && (
                    <blockquote className="mt-3 whitespace-pre-wrap break-words border-l-2 border-slate-300 pl-3 text-sm leading-7">
                      <span className="block text-xs font-semibold text-slate-500">
                        Original evidence
                      </span>
                      {s.source_excerpt}
                    </blockquote>
                  )}
                  {s.student_excerpt && (
                    <blockquote className="mt-3 whitespace-pre-wrap break-words border-l-2 border-indigo-300 pl-3 text-sm leading-7">
                      <span className="block text-xs font-semibold text-indigo-700">
                        {s.skill === 'title' ? 'Saved title' : 'Saved draft evidence'}
                      </span>
                      {s.student_excerpt}
                    </blockquote>
                  )}
                  <p className="mt-3 text-sm leading-7">{s.explanation}</p>
                  <p className="mt-3 text-sm leading-7">
                    <strong>Hint: </strong>
                    {s.hint}
                  </p>
                  <Link
                    to={`/account/precis?view=skills&skill=${s.skill}&attempt=${detail.writing.attempt_id}`}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
                  >
                    Practise {skills[s.skill] || s.skill}
                  </Link>
                </details>
              ))}
          </div>
          {feedback.findings.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Language repair</h3>
              {feedback.findings.map((f, i) => (
                <article key={`${f.code}:${i}`} className="rounded-xl border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold">
                    {data?.grammar_skills[f.code]?.label || f.code}
                  </h4>
                  <blockquote className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                    {f.excerpt}
                  </blockquote>
                  <p className="mt-3 text-sm leading-7">{f.explanation}</p>
                  <p className="mt-3 text-sm leading-7">
                    <strong>Hint: </strong>
                    {f.hint}
                  </p>
                  {data?.grammar_skills[f.code] && (
                    <Link
                      className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700 underline"
                      to={precisGrammarLink(
                        data.grammar_skills[f.code].day,
                        detail.writing.id,
                        detail.version.id,
                        detail.writing.attempt_id,
                      )}
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Open {data.grammar_skills[f.code].label} practice
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
          {active && (
            <a href="#precis-rewrite" className={primaryStyle}>
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
              Write an independent revision
            </a>
          )}
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 p-4 text-sm leading-7 text-amber-900"
        >
          {error}
        </p>
      )}
      <button className={secondaryStyle} disabled={busy} onClick={read.refresh}>
        Refresh saved feedback status
      </button>
    </section>
  )
}
export function FeedbackChanges({
  before,
  after,
  skills,
}: {
  before: string
  after: string
  skills: Record<string, string>
}) {
  const read = useLearning<FeedbackComparison>(
      `precis-feedback.php?before=${before}&after=${after}`,
    ),
    data = read.data?.comparison
  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 p-5">
      <h4 className="font-semibold">Source-bound feedback across revisions</h4>
      {!data ? (
        <p role={read.error ? 'alert' : 'status'} className="text-sm leading-7">
          {read.error || 'Loading saved comparisons…'}
        </p>
      ) : !data.available ? (
        <p className="text-sm leading-7 text-slate-600">
          Both saved versions need successful feedback before criterion changes can be shown.
          Wording and length remain available above.
        </p>
      ) : (
        <>
          <p className="text-xs leading-6 text-slate-500">
            Each diagnosis compared its actual wording and title with the same original. A change in
            reported status is evidence to review, not proof that every issue is fixed. This
            comparison makes no new AI call.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {data.skills.map((s) => (
              <div key={s.skill} className="rounded-lg bg-slate-50 p-3 text-sm">
                <dt className="font-semibold">{s.label}</dt>
                <dd className="mt-2 leading-6">
                  {feedbackStatus[s.before]} → {feedbackStatus[s.after]}
                </dd>
              </div>
            ))}
          </dl>
          {(['no_longer_reported', 'still_reported', 'newly_reported'] as const).map((key) => (
            <p className="text-sm leading-7" key={key}>
              <strong>{key.replaceAll('_', ' ')}: </strong>
              {data[key]
                .map((code) => read.data?.grammar_skills[code]?.label || skills[code] || code)
                .join(', ') || 'None'}
            </p>
          ))}
        </>
      )}
      <button className={secondaryStyle} onClick={read.refresh}>
        Refresh saved comparison
      </button>
    </div>
  )
}
export function WritingEvidence({ attempt }: { attempt: string }) {
  const read = useLearning<WritingProfile>(`precis-feedback.php?attempt_id=${attempt}`),
    data = read.data?.profile
  return (
    <section className={`${panelStyle} space-y-4`}>
      <h2 className="text-xl font-semibold">Précis writing evidence</h2>
      {!data ? (
        <p role={read.error ? 'alert' : 'status'} className="text-sm leading-7">
          {read.error || 'Loading writing evidence…'}
        </p>
      ) : (
        <>
          <p className="text-sm leading-7 text-slate-600">{data.basis}</p>
          <p className="text-xs text-slate-500">
            {data.reviewed_sources} distinct originals reviewed in the last {data.window_days} days.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((s) => (
              <li key={s.skill} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold">{s.label}</h3>
                <p className="mt-2 text-sm">{s.state}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {s.flagged_sources} originals with reported difficulty · {s.assessed_sources}{' '}
                  assessed
                </p>
                <Link
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline"
                  to={`/account/precis?view=skills&skill=${s.skill}&attempt=${attempt}`}
                >
                  Practise this skill
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <button className={secondaryStyle} onClick={read.refresh}>
        Refresh writing evidence
      </button>
    </section>
  )
}
