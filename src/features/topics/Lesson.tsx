import { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronRight, LockKeyhole } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useLearning } from '@/features/learning/api'
import {
  field,
  primary,
  secondary,
  usePreparationAction,
  type PreparationAction,
} from '@/features/preparation/api'
import { useMembershipExpired } from '@/features/membership/api'
import { wordCount } from '@/features/precis/api'
import {
  stateLabels,
  type Check as SavedCheck,
  type Definition,
  type Detail,
  type History,
  type Progress,
  type Question,
} from './types'
import { topicPanel } from './styles'

type Send = (body: Record<string, unknown>) => Promise<void>
function PendingAction({ action }: { action: PreparationAction }) {
  return (
    <>
      {action.pending && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h3 className="font-semibold">Confirm your saved action</h3>
          <p className="mt-2 text-sm leading-7">
            Your {String(action.pending.body.action).replaceAll('_', ' ')} action is awaiting
            confirmation. Its exact request is retained across refresh.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              disabled={action.busy}
              className={secondary}
              onClick={() => void action.recover()}
            >
              Check saved action
            </button>
            {action.unaccepted && (
              <>
                <button
                  disabled={action.busy}
                  className={secondary}
                  onClick={() => void action.recover(true)}
                >
                  Retry exact action
                </button>
                <button disabled={action.busy} className={secondary} onClick={action.discard}>
                  Discard unaccepted action
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {action.error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-900"
          role="alert"
        >
          {action.error}
        </p>
      )}
      {action.message && (
        <p
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-7 text-indigo-950"
          role="status"
        >
          {action.message}
        </p>
      )}
    </>
  )
}
function CheckResult({ check }: { check: SavedCheck }) {
  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <h4 className="font-semibold">
        Saved result: {check.result.correct} of {check.result.total} correct
      </h4>
      <p className="mt-2 text-xs leading-6 text-indigo-950">
        {check.result.passed
          ? 'Understanding check passed.'
          : 'Review these concepts before trying again.'}{' '}
        Recorded {check.created_at.slice(0, 10)}. This score covers this fixed check.
      </p>
      <div className="mt-5 space-y-5">
        {check.result.results.map((result) => (
          <div key={result.id} className="text-sm leading-7">
            <p className="font-semibold">{result.prompt}</p>
            <p className="mt-2">Your answer: {result.options[result.choice]}</p>
            <p>{result.correct ? 'Correct' : `Correct answer: ${result.options[result.answer]}`}</p>
            <p className="mt-2 text-slate-700">{result.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
function KnowledgeCheck({
  questions,
  revision,
  due,
  blocked,
  send,
  latest,
}: {
  questions: Question[]
  revision: boolean
  due: boolean
  blocked: boolean
  send: Send
  latest?: SavedCheck
}) {
  const [choices, setChoices] = useState<Record<string, number>>({})
  const complete = questions.every((q) => choices[q.id] !== undefined)
  return (
    <div className="space-y-5">
      <section className={topicPanel}>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
          {revision ? 'Independent recall' : 'Understanding check'}
        </p>
        <h3 className="mt-2 text-2xl font-semibold">
          {revision ? 'Revisit the concept' : 'Check what you understood'}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Choose your answers before checking. Explanations appear after your answers are saved.
          These questions are study exercises based on the lesson.
        </p>
        {revision && !due && (
          <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6">
            This revision check opens on its scheduled date. Use the understanding check for
            practice today.
          </p>
        )}
      </section>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (complete && (!revision || due))
            void send({ action: revision ? 'review' : 'quiz', choices })
        }}
      >
        {questions.map((question, index) => (
          <fieldset
            key={question.id}
            className={topicPanel}
            disabled={blocked || (revision && !due)}
          >
            <legend className="max-w-full px-1 text-sm font-semibold leading-7">
              {index + 1}. {question.prompt}
            </legend>
            <div className="mt-3 grid gap-3">
              {question.options.map((option, i) => (
                <label
                  key={i}
                  className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${choices[question.id] === i ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <input
                    className="mt-1 h-4 w-4 shrink-0 accent-indigo-700"
                    type="radio"
                    name={question.id}
                    checked={choices[question.id] === i}
                    onChange={() => setChoices((current) => ({ ...current, [question.id]: i }))}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button disabled={blocked || !complete || (revision && !due)} className={primary}>
          Save & check answers
        </button>
      </form>
      {latest && <CheckResult check={latest} />}
    </div>
  )
}
function IndependentWriting({
  definition,
  progress,
  blocked,
  send,
  storageKey,
}: {
  definition: Definition
  progress: Progress
  blocked: boolean
  send: Send
  storageKey: string
}) {
  const notesId = useId(),
    writingId = useId()
  const [draft, setDraft] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as {
        notes: string
        draft: string
        base: number
      } | null
      if (
        saved &&
        typeof saved.notes === 'string' &&
        typeof saved.draft === 'string' &&
        Number.isInteger(saved.base) &&
        saved.notes.length <= 8000 &&
        saved.draft.length <= 8000
      )
        return saved
    } catch {
      /* Server-owned writing remains available when the local cache cannot be read. */
    }
    return { notes: progress.notes, draft: progress.draft, base: progress.draft_version }
  })
  const [cacheError, setCacheError] = useState('')
  const same = draft.notes === progress.notes && draft.draft === progress.draft
  const base = same ? progress.draft_version : draft.base,
    stale = base !== progress.draft_version,
    words = wordCount(draft.draft)
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ ...draft, base }))
    } catch {
      setCacheError(
        'Browser recovery storage is unavailable. Save to your account before leaving this tab.',
      )
    }
  }, [storageKey, draft, base])
  function edit(key: 'notes' | 'draft', value: string) {
    setDraft((current) => ({ ...current, base, [key]: value }))
  }
  return (
    <section className={`${topicPanel} space-y-5`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
          Independent practice
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Build your own argument</h3>
        <p className="mt-3 text-sm leading-7 text-slate-700">{definition.practice.prompt}</p>
        <p className="mt-3 text-sm leading-7 text-slate-500">{definition.practice.focus}</p>
      </div>
      <div className="grid gap-2 text-sm font-semibold">
        <label htmlFor={notesId}>Personal notes</label>
        <textarea
          id={notesId}
          className={`${field} min-h-32 leading-7`}
          value={draft.notes}
          maxLength={8000}
          onChange={(e) => edit('notes', e.target.value)}
          rows={5}
        />
      </div>
      <div className="grid gap-2 text-sm font-semibold">
        <label htmlFor={writingId}>Your independent writing</label>
        <textarea
          id={writingId}
          className={`${field} min-h-52 leading-7`}
          value={draft.draft}
          maxLength={8000}
          onChange={(e) => edit('draft', e.target.value)}
          rows={9}
        />
      </div>
      <p
        className={`text-xs leading-6 ${words > definition.practice.max_words ? 'text-red-800' : 'text-slate-500'}`}
      >
        {words} words · aim for {definition.practice.min_words}–{definition.practice.max_words}.
        Saving writing records practice; it does not award an evaluated mark.
      </p>
      {cacheError && (
        <p role="alert" className="text-sm text-amber-900">
          {cacheError}
        </p>
      )}
      {stale && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h4 className="text-sm font-semibold">Saved writing changed on another device</h4>
          <details className="mt-3 text-sm leading-7">
            <summary className="min-h-11 cursor-pointer">Compare the latest saved work</summary>
            <h5 className="mt-3 font-semibold">Saved notes</h5>
            <p className="whitespace-pre-wrap break-words">{progress.notes || 'No saved notes.'}</p>
            <h5 className="mt-4 font-semibold">Saved writing</h5>
            <p className="whitespace-pre-wrap break-words">
              {progress.draft || 'No saved writing.'}
            </p>
          </details>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className={secondary}
              onClick={() =>
                setDraft({
                  notes: progress.notes,
                  draft: progress.draft,
                  base: progress.draft_version,
                })
              }
            >
              Use saved work
            </button>
            <button
              className={secondary}
              onClick={() => setDraft((current) => ({ ...current, base: progress.draft_version }))}
            >
              Keep my draft after comparison
            </button>
          </div>
        </section>
      )}
      <button
        className={primary}
        disabled={blocked || same || stale || words > definition.practice.max_words}
        onClick={() =>
          void send({
            action: 'draft',
            notes: draft.notes,
            draft: draft.draft,
            expected_draft_version: base,
          })
        }
      >
        Save notes & writing
      </button>
    </section>
  )
}
export default function TopicLesson({
  attempt,
  topic,
  onSaved,
}: {
  attempt: string
  topic: string
  onSaved: () => void
}) {
  const { user } = useAccount(),
    [params, setParams] = useSearchParams()
  const load = useLearning<Detail>(
    `topics.php?attempt=${attempt}&topic=${encodeURIComponent(topic)}`,
  )
  const history = useLearning<History>(
    `topics.php?view=history&attempt=${attempt}&topic=${encodeURIComponent(topic)}`,
  )
  const action = usePreparationAction(
    attempt,
    () => {
      load.refresh()
      history.refresh()
      onSaved()
    },
    'topics.php',
  )
  const expired = useMembershipExpired(load.data?.membership.expires_at)
  function nav(fields: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(fields).forEach(([k, v]) => next.set(k, v))
    setParams(next)
  }
  const data = load.data,
    active = !!data?.content && data.available && !expired
  if (!data)
    return (
      <section className={topicPanel} role={load.error ? 'alert' : 'status'}>
        {load.error || 'Opening your topic…'}
        {load.error && (
          <button className={`${secondary} mt-3`} onClick={load.refresh}>
            Try again
          </button>
        )}
      </section>
    )
  const definition = data.content,
    mode = ['read', 'check', 'write', 'revise'].includes(params.get('topicMode') || '')
      ? params.get('topicMode')!
      : 'read'
  const section =
    definition?.sections.find((s) => s.id === params.get('topicSection')) || definition?.sections[0]
  const sectionIndex = section && definition ? definition.sections.indexOf(section) : 0,
    completed = data.progress.completed
  const send: Send = (body) =>
    action.send({
      ...body,
      topic_id: topic,
      topic_version_id: data.topic.version_id,
      content_hash: data.topic.content_hash,
      expected_version: data.progress.version,
    })
  const due = !!data.progress.next_revision && data.progress.next_revision <= data.today
  const latest = history.data?.checks.find(
    (c) =>
      c.topic_version_id === data.topic.version_id &&
      c.mode === (mode === 'revise' ? 'revision' : 'learn'),
  )
  return (
    <div className="space-y-5">
      <header className={topicPanel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
            {stateLabels[data.progress.state]}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              className={secondary}
              onClick={() => {
                load.refresh()
                history.refresh()
              }}
            >
              Refresh lesson
            </button>
            {active && (
              <button
                className={secondary}
                disabled={action.blocked}
                onClick={() =>
                  void send({ action: 'bookmark', bookmarked: !data.progress.bookmarked })
                }
              >
                <Bookmark className="mr-2 h-4 w-4" aria-hidden="true" />
                {data.progress.bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            )}
          </div>
        </div>
        <h3 className="mt-5 text-2xl font-semibold leading-9 sm:text-3xl">{data.topic.title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{data.topic.summary}</p>
        {active && definition && (
          <p className="mt-4 text-xs leading-6 text-slate-500">
            Based on {definition.author}’s source material · facts reviewed through{' '}
            {definition.as_of}
          </p>
        )}
        {data.progress.next_revision && (
          <p className="mt-3 text-sm font-semibold text-indigo-700">
            {due ? 'Revision is due' : 'Next revision'}: {data.progress.next_revision} (Pakistan)
          </p>
        )}
        {data.older_versions > 0 && (
          <p className="mt-3 text-xs leading-6 text-slate-500">
            An earlier edition has saved work. Open topic history to review it; this edition has
            separate progress.
          </p>
        )}
      </header>
      <PendingAction action={action} />
      {!active || !definition ? (
        <section className={topicPanel}>
          <LockKeyhole className="h-6 w-6 text-indigo-700" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-semibold">
            {data.available ? 'Open this lesson with Pro' : 'This lesson is currently unpublished'}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {data.available
              ? 'Active Pro is required for lesson content and new practice. Your own saved notes, writing and results remain available.'
              : 'Earlier study work remains in your history. New study actions are paused.'}
          </p>
          {data.available && (
            <Link className={`${secondary} mt-4`} to="/account/membership">
              Membership
            </Link>
          )}
          {(data.progress.notes || data.progress.draft) && (
            <details className="mt-5 rounded-xl border p-4">
              <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                Read your saved notes & writing
              </summary>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                {data.progress.notes}
              </p>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">
                {data.progress.draft}
              </p>
            </details>
          )}
        </section>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Topic learning modes">
            {[
              ['read', 'Learn'],
              ['check', 'Understanding check'],
              ['write', 'Independent writing'],
              ['revise', 'Revision'],
            ].map(([id, label]) => (
              <button
                className={`${secondary} ${mode === id ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`}
                aria-current={mode === id ? 'page' : undefined}
                key={id}
                onClick={() => nav({ topicMode: id })}
              >
                {label}
              </button>
            ))}
          </nav>
          {mode === 'read' && section ? (
            <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="self-start rounded-2xl border bg-white p-4">
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Learning path
                </p>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Recorded lesson sections"
                  aria-valuemin={0}
                  aria-valuemax={definition.sections.length}
                  aria-valuenow={completed.length}
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-[width] motion-reduce:transition-none"
                    style={{ width: `${(100 * completed.length) / definition.sections.length}%` }}
                  />
                </div>
                <p className="mt-2 px-2 text-xs leading-6 text-slate-500">
                  {completed.length}/{definition.sections.length} sections recorded
                </p>
                <div className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                  {definition.sections.map((s, index) => (
                    <button
                      key={s.id}
                      aria-current={s.id === section.id ? 'step' : undefined}
                      onClick={() => nav({ topicSection: s.id })}
                      className={`flex min-h-12 items-start gap-3 rounded-xl p-3 text-left text-sm leading-6 ${section.id === s.id ? 'bg-indigo-50 text-indigo-950' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]">
                        {completed.includes(s.id) ? (
                          <Check className="h-3 w-3" aria-label="Recorded" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span>{s.title}</span>
                    </button>
                  ))}
                </div>
              </aside>
              <article className={`${topicPanel} min-w-0`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  {section.kind.replaceAll('-', ' ')}
                </p>
                <h4 className="mt-3 text-2xl font-semibold leading-9">{section.title}</h4>
                <div className="mt-6 space-y-5">
                  {section.blocks.map((block, i) => (
                    <p
                      className="whitespace-pre-line break-words text-base leading-8 text-slate-700"
                      key={i}
                    >
                      {block}
                    </p>
                  ))}
                </div>
                <div className="mt-7 space-y-2 border-t pt-5 text-xs leading-6">
                  <p className="font-semibold text-slate-500">References</p>
                  {definition.references
                    .filter((r) => section.reference_ids.includes(r.id))
                    .map((r) => (
                      <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-words text-indigo-700 underline"
                      >
                        {r.label}
                      </a>
                    ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {!data.progress.started_at ? (
                    <button
                      disabled={action.blocked}
                      className={primary}
                      onClick={() => void send({ action: 'begin' })}
                    >
                      Start learning
                    </button>
                  ) : (
                    <button
                      disabled={action.blocked || completed.includes(section.id)}
                      className={primary}
                      onClick={() => void send({ action: 'checkpoint', section_id: section.id })}
                    >
                      {completed.includes(section.id)
                        ? 'Section recorded'
                        : 'Record this section as studied'}
                    </button>
                  )}
                  {sectionIndex > 0 && (
                    <button
                      className={secondary}
                      onClick={() =>
                        nav({ topicSection: definition.sections[sectionIndex - 1].id })
                      }
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                      Previous section
                    </button>
                  )}
                  {sectionIndex < definition.sections.length - 1 ? (
                    <button
                      className={secondary}
                      onClick={() =>
                        nav({ topicSection: definition.sections[sectionIndex + 1].id })
                      }
                    >
                      Next section
                      <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button className={secondary} onClick={() => nav({ topicMode: 'check' })}>
                      Understanding check
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Recording a section is your study declaration. Quiz results and later recall
                  determine the next learning states.
                </p>
              </article>
            </div>
          ) : mode === 'write' ? (
            <IndependentWriting
              key={`${user?.id}:${data.topic.version_id}`}
              definition={definition}
              progress={data.progress}
              blocked={action.blocked}
              send={send}
              storageKey={`cssvista:topic-draft:${user?.id}:${attempt}:${data.topic.version_id}`}
            />
          ) : (
            <KnowledgeCheck
              key={`${data.topic.version_id}:${mode}`}
              questions={definition.questions.filter(
                (q) => q.mode === (mode === 'revise' ? 'revision' : 'learn'),
              )}
              revision={mode === 'revise'}
              due={due}
              blocked={action.blocked}
              send={send}
              latest={latest}
            />
          )}
          <details className={topicPanel}>
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">
              Source & learning record
            </summary>
            <div className="mt-4 space-y-4 text-xs leading-7 text-slate-600">
              <p>{definition.sources.map((s) => s.title).join(' · ')}</p>
              <p>
                Mapped for {definition.subjects.map((s) => s.replaceAll('-', ' ')).join(', ')}{' '}
                preparation. These are CSS Vista study mappings.
              </p>
              <p>
                Understanding requires the studied sections and at least 80% in the fixed check.
                Practised adds your independent writing. Mastered adds a successful scheduled recall
                check; it describes this module’s recorded work.
              </p>
              {definition.references.map((r) => (
                <p key={r.id}>
                  <a
                    className="text-indigo-700 underline"
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.label}
                  </a>{' '}
                  · checked {r.accessed_on}
                  {r.document_date ? ` · document date ${r.document_date}` : ''}
                </p>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  )
}
