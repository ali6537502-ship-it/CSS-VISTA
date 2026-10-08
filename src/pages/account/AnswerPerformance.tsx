import { cloneElement, useId, useState, type FormEvent, type ReactElement } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, BookOpen, FileCheck2, History, PenLine, Plus, RotateCcw } from 'lucide-react'
import { AccountPage } from './shared'
import { useAccount } from '@/lib/accountContext'
import {
  learningRequest,
  saveIdentity,
  useLearning,
  type Attempt,
  type Overview,
} from '@/features/learning/api'
import { inputStyle, panelStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import { pakistanTime } from '@/features/membership/api'
import {
  pakistanToday,
  provenanceNames,
  scoreText,
  statusNames,
  type MentorAnswer,
  type MentorDetail,
  type MentorOverview,
  type MentorSubject,
} from '@/features/mentor/api'

function Field({ children, label }: { children: ReactElement<{ id?: string }>; label: string }) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  )
}
function Load({ error, refresh }: { error?: string; refresh: () => void }) {
  return (
    <div className={panelStyle} role={error ? 'alert' : 'status'}>
      {error || 'Loading your answer records…'}
      {error && (
        <button className={`${secondaryStyle} ml-3`} onClick={refresh}>
          Try again
        </button>
      )}
    </div>
  )
}
function useSave(scope: string, onSaved: (id: string) => void) {
  const { user } = useAccount()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(body: Record<string, unknown>) {
    if (!user || busy) return
    setBusy(true)
    setError('')
    try {
      const identity = await saveIdentity(user.id, `mentor:${scope}`, body)
      const result = await learningRequest<{ answer_id: string }>(user.id, 'mentor.php', {
        ...body,
        request_id: identity.id,
      })
      identity.done()
      onSaved(result.answer_id)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your record could not be saved. Please retry with the same entry.',
      )
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, save }
}
function QuestionForm({
  attempts,
  subjects,
  selected,
  onSaved,
}: {
  attempts: Attempt[]
  subjects: MentorSubject[]
  selected?: string
  onSaved: (id: string) => void
}) {
  const [attempt, setAttempt] = useState(selected || attempts[0]?.id || '')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [question, setQuestion] = useState('')
  const [provenance, setProvenance] = useState<keyof typeof provenanceNames>('practice')
  const [reference, setReference] = useState('')
  const { busy, error, save } = useSave('new-question', onSaved)
  async function submit(e: FormEvent) {
    e.preventDefault()
    await save({
      action: 'question_save',
      expected_version: 0,
      attempt_id: attempt,
      subject_id: subject,
      topic,
      question,
      provenance,
      source_reference: reference,
    })
  }
  return (
    <section className={panelStyle}>
      <h2 className="text-xl font-bold text-slate-950">Add a question to your writing queue</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Use a question from your study material or teacher. Write independently, then obtain human
        evaluation. The saved question and its source remain fixed so retries stay comparable.
      </p>
      {attempts.length === 0 ? (
        <p className="mt-5">
          Create a{' '}
          <Link
            className="font-semibold text-indigo-700 underline"
            to="/account/preparation?new=attempt"
          >
            preparation attempt
          </Link>{' '}
          first.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <fieldset disabled={busy} className="grid min-w-0 gap-5 sm:grid-cols-2">
            <Field label="Preparation attempt">
              <select
                required
                className={inputStyle}
                value={attempt}
                onChange={(e) => setAttempt(e.target.value)}
              >
                {attempts.map((a) => (
                  <option key={a.id} value={a.id}>
                    CSS {a.target_year} · {a.daily_minutes} min/day
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <select
                required
                className={inputStyle}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Choose a subject</option>
                {subjects.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topic">
              <input
                required
                maxLength={180}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={inputStyle}
              />
            </Field>
            <Field label="Question provenance">
              <select
                className={inputStyle}
                value={provenance}
                onChange={(e) => setProvenance(e.target.value as keyof typeof provenanceNames)}
              >
                {Object.entries(provenanceNames).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Question">
                <textarea
                  required
                  maxLength={6000}
                  rows={5}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className={`${inputStyle} resize-y`}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field
                label={
                  provenance === 'practice'
                    ? 'Source reference (optional)'
                    : 'Paper reference — year, paper and question number'
                }
              >
                <input
                  required={provenance === 'student_past_paper'}
                  maxLength={500}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputStyle}
                />
              </Field>
            </div>
          </fieldset>
          {provenance === 'student_past_paper' && (
            <p className="text-sm leading-6 text-slate-500">
              Your reference is saved as supplied. CSS Vista has not independently verified this
              question as an official past-paper question.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button disabled={busy} className={primaryStyle}>
            <Plus className="h-4 w-4" />
            {busy ? 'Saving question…' : 'Save question'}
          </button>
        </form>
      )}
    </section>
  )
}
function EvaluationForm({
  answer,
  onSaved,
}: {
  answer: MentorDetail
  onSaved: (id: string) => void
}) {
  const correction = answer.evaluation_revision > 0
  const [obtained, setObtained] = useState(answer.obtained_marks?.toString() || '')
  const [maximum, setMaximum] = useState(answer.maximum_marks?.toString() || '')
  const [date, setDate] = useState(answer.evaluation_date || pakistanToday())
  const [comment, setComment] = useState(answer.mentor_comment || '')
  const [reason, setReason] = useState('')
  const { busy, error, save } = useSave(`evaluation:${answer.id}`, onSaved)
  async function submit(e: FormEvent) {
    e.preventDefault()
    await save({
      action: 'evaluation_save',
      id: answer.id,
      expected_version: answer.version,
      obtained_marks: Number(obtained),
      maximum_marks: Number(maximum),
      evaluation_date: date,
      mentor_comment: comment,
      correction_reason: reason,
    })
  }
  return (
    <section className={panelStyle} id="mentor-evaluation">
      <h2 className="text-xl font-bold text-slate-950">
        {correction ? 'Correct an entered result' : 'Add Mentor Evaluation'}
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Enter the marks your teacher or mentor gave you. These are student-entered records, not
        independently authenticated official results. No AI assigns or changes these marks.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <fieldset disabled={busy} className="grid min-w-0 gap-5 sm:grid-cols-3">
          <Field label="Obtained marks">
            <input
              required
              type="number"
              min={0}
              max={maximum || 1000}
              step={1}
              className={inputStyle}
              value={obtained}
              onChange={(e) => setObtained(e.target.value)}
            />
          </Field>
          <Field label="Maximum marks">
            <input
              required
              type="number"
              min={1}
              max={1000}
              step={1}
              className={inputStyle}
              value={maximum}
              onChange={(e) => setMaximum(e.target.value)}
            />
          </Field>
          <Field label="Evaluation date">
            <input
              required
              type="date"
              min={answer.written_date || '2000-01-01'}
              max={pakistanToday()}
              className={inputStyle}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-3">
            <Field label="Mentor comment (optional)">
              <textarea
                rows={3}
                maxLength={4000}
                className={`${inputStyle} resize-y`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
          </div>
          {correction && (
            <div className="sm:col-span-3">
              <Field label="Reason for correction">
                <input
                  required
                  maxLength={500}
                  className={inputStyle}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            </div>
          )}
        </fieldset>
        <p className="text-xs leading-6 text-slate-500">
          Whole marks only in this version. Maximum: 1–1000. Dates use Pakistan time.{' '}
          {correction && 'The previous entry will remain in your correction history.'}
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}{' '}
            <button type="button" className="underline" onClick={() => onSaved(answer.id)}>
              Reload saved record
            </button>
          </p>
        )}
        <button disabled={busy} className={primaryStyle}>
          <FileCheck2 className="h-4 w-4" />
          {busy ? 'Saving marks…' : correction ? 'Save corrected entry' : 'Save mentor evaluation'}
        </button>
      </form>
    </section>
  )
}
function AnswerDetail({
  id,
  subjects,
  onSaved,
}: {
  id: string
  subjects: MentorSubject[]
  onSaved: (id: string) => void
}) {
  const record = useLearning<{ answer: MentorDetail }>(`mentor.php?id=${encodeURIComponent(id)}`)
  function saved(newId: string) {
    record.refresh()
    onSaved(newId)
  }
  const action = useSave(`workflow:${id}`, saved)
  const [date, setDate] = useState(pakistanToday())
  const [editing, setEditing] = useState(false)
  if (!record.data) return <Load error={record.error} refresh={record.refresh} />
  const a = record.data.answer
  return (
    <div className="space-y-6">
      <section className={panelStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
            {statusNames[a.status]}
          </span>
          <span className="text-sm text-slate-500">
            {a.sequence === 1 ? 'First attempt' : `Repeat attempt ${a.sequence - 1}`}
          </span>
        </div>
        <h2 className="mt-5 break-words text-2xl font-bold text-slate-950">{a.topic}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {subjects.find((s) => s.slug === a.subject_id)?.name || a.subject_id} ·{' '}
          {provenanceNames[a.provenance]}
        </p>
        <p className="mt-5 whitespace-pre-wrap break-words text-lg leading-8 text-slate-800">
          {a.question}
        </p>
        {a.source_reference && (
          <p className="mt-4 break-words text-sm leading-6 text-slate-500">
            Source supplied by you: {a.source_reference}
          </p>
        )}
        {a.provenance === 'student_past_paper' && (
          <p className="mt-2 text-xs leading-6 text-slate-500">
            This past-paper reference has not been independently verified by CSS Vista.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={secondaryStyle} to={`/account/preparation?attempt=${a.attempt_id}`}>
            Preparation attempt
          </Link>
          <Link className={secondaryStyle} to="/answer-evaluation">
            Arrange human evaluation <ArrowRight className="h-4 w-4" />
          </Link>
          <Link className={secondaryStyle} to="/answer-timer">
            Writing timer
          </Link>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          Contacting a mentor is separate. Your question and marks are not sent automatically.
        </p>
      </section>
      {a.status === 'not_attempted' && (
        <section className={panelStyle}>
          <h2 className="text-xl font-bold">Write independently</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Complete your answer on paper or in your preferred writing space. Marking it written
            changes its workflow status; it does not give you a score.
          </p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault()
              void action.save({
                action: 'written_save',
                id,
                expected_version: a.version,
                written_date: date,
              })
            }}
          >
            <Field label="Writing date">
              <input
                required
                disabled={action.busy}
                type="date"
                min="2000-01-01"
                max={pakistanToday()}
                className={inputStyle}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <button disabled={action.busy} className={`${primaryStyle} self-end`}>
              <PenLine className="h-4 w-4" />
              {action.busy ? 'Saving…' : 'I Have Written This Answer'}
            </button>
          </form>
        </section>
      )}
      {a.status === 'awaiting_evaluation' && (
        <EvaluationForm key={a.version} answer={a} onSaved={saved} />
      )}
      {a.status === 'evaluated' && (
        <>
          <section className={`${panelStyle} border-indigo-200`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Student-entered mentor result
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <p className="text-5xl font-bold tracking-tight text-slate-950">
                {a.obtained_marks}
                <span className="text-2xl font-normal text-slate-400"> / {a.maximum_marks}</span>
              </p>
              <p className="pb-1 text-2xl font-semibold text-indigo-600">{a.percentage}%</p>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Evaluated {a.evaluation_date} · entry {a.evaluation_revision}
            </p>
            {a.mentor_comment && (
              <blockquote className="mt-5 whitespace-pre-wrap break-words border-l-2 border-indigo-200 pl-4 text-sm leading-7 text-slate-600">
                {a.mentor_comment}
              </blockquote>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className={primaryStyle}
                disabled={action.busy}
                onClick={() => {
                  void action.save({ action: 'retry_save', id, expected_version: a.version })
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Start a repeat attempt
              </button>
              <button className={secondaryStyle} onClick={() => setEditing((v) => !v)}>
                {editing ? 'Close correction form' : 'Correct entered result'}
              </button>
            </div>
          </section>
          {editing && (
            <EvaluationForm
              key={a.version}
              answer={a}
              onSaved={(newId) => {
                setEditing(false)
                saved(newId)
              }}
            />
          )}
        </>
      )}
      {action.error && (
        <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">
          {action.error}{' '}
          <button className="underline" onClick={record.refresh}>
            Reload saved record
          </button>
        </p>
      )}
      {a.series.length > 1 && (
        <section className={panelStyle}>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <History className="h-5 w-5" />
            Same-question history
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Original marks stay separate from repeats. A percentage change alone does not establish
            improvement when evaluation conditions differ.
          </p>
          <ul className="mt-4 divide-y">
            {a.series.map((row) => (
              <li key={row.id}>
                <Link
                  to={`/account/answer-performance?id=${row.id}`}
                  className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-4"
                >
                  <span className="text-sm font-semibold">
                    {row.sequence === 1 ? 'First attempt' : `Repeat ${row.sequence - 1}`}
                    <span className="mt-1 block font-normal text-slate-500">
                      {row.evaluation_date || statusNames[row.status]}
                    </span>
                  </span>
                  <span className="font-semibold text-indigo-700">
                    {row.percentage === null
                      ? 'No marks yet'
                      : `${row.obtained_marks}/${row.maximum_marks} · ${row.percentage}%`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {a.evaluations.length > 0 && (
        <section className={panelStyle}>
          <h2 className="text-xl font-bold">Entry history</h2>
          <p className="mt-2 text-sm text-slate-500">
            Corrections replace the current score in summaries; earlier entries remain available
            here.
          </p>
          <ol className="mt-4 divide-y">
            {a.evaluations.map((e) => (
              <li key={e.id} className="space-y-2 py-4">
                <p className="font-semibold">
                  Entry {e.revision} · {e.obtained_marks}/{e.maximum_marks} · {e.percentage}%
                </p>
                <p className="text-xs text-slate-500">
                  Mentor date {e.evaluation_date} · recorded {pakistanTime(e.created_at)}
                </p>
                {e.correction_reason && (
                  <p className="break-words text-sm">Correction: {e.correction_reason}</p>
                )}
                {e.mentor_comment && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                    {e.mentor_comment}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
const filterKeys = [
  'attempt',
  'subject',
  'topic',
  'status',
  'provenance',
  'from',
  'to',
  'minimum',
  'maximum',
] as const
function Filters({
  subjects,
  attempts,
  params,
  onChange,
}: {
  subjects: MentorSubject[]
  attempts: Attempt[]
  params: URLSearchParams
  onChange: (p: URLSearchParams) => void
}) {
  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget),
      next = new URLSearchParams()
    for (const key of filterKeys) {
      const value = String(data.get(key) || '').trim()
      if (value) next.set(key, value)
    }
    onChange(next)
  }
  return (
    <details className={panelStyle}>
      <summary className="min-h-11 cursor-pointer font-semibold text-slate-800">
        Filter answer history
      </summary>
      <form onSubmit={apply} className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Filter preparation attempt">
          <select name="attempt" defaultValue={params.get('attempt') || ''} className={inputStyle}>
            <option value="">All preparation attempts</option>
            {attempts.map((a) => (
              <option key={a.id} value={a.id}>
                CSS {a.target_year} · {a.daily_minutes} min/day
              </option>
            ))}
          </select>
        </Field>
        <Field label="Filter subject">
          <select name="subject" defaultValue={params.get('subject') || ''} className={inputStyle}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Exact topic">
          <input
            name="topic"
            defaultValue={params.get('topic') || ''}
            maxLength={180}
            className={inputStyle}
          />
        </Field>
        <Field label="Filter status">
          <select name="status" defaultValue={params.get('status') || ''} className={inputStyle}>
            <option value="">All statuses</option>
            {Object.entries(statusNames).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Filter provenance">
          <select
            name="provenance"
            defaultValue={params.get('provenance') || ''}
            className={inputStyle}
          >
            <option value="">All question sources</option>
            {Object.entries(provenanceNames).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Evaluation date from">
          <input
            name="from"
            defaultValue={params.get('from') || ''}
            type="date"
            min="2000-01-01"
            max={pakistanToday()}
            className={inputStyle}
          />
        </Field>
        <Field label="Evaluation date to">
          <input
            name="to"
            defaultValue={params.get('to') || ''}
            type="date"
            min="2000-01-01"
            max={pakistanToday()}
            className={inputStyle}
          />
        </Field>
        <Field label="Minimum score (%)">
          <input
            name="minimum"
            defaultValue={params.get('minimum') || ''}
            type="number"
            min={0}
            max={100}
            step="0.1"
            className={inputStyle}
          />
        </Field>
        <Field label="Maximum score (%)">
          <input
            name="maximum"
            defaultValue={params.get('maximum') || ''}
            type="number"
            min={0}
            max={100}
            step="0.1"
            className={inputStyle}
          />
        </Field>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
          <button className={primaryStyle}>Apply filters</button>
          <button
            type="button"
            className={secondaryStyle}
            onClick={() => onChange(new URLSearchParams())}
          >
            Clear filters
          </button>
        </div>
      </form>
    </details>
  )
}
function AnswerCard({ answer, subjects }: { answer: MentorAnswer; subjects: MentorSubject[] }) {
  return (
    <li className="min-w-0">
      <Link
        to={`/account/answer-performance?id=${answer.id}`}
        className="block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <div className="flex flex-wrap justify-between gap-3">
          <span className="text-xs font-semibold text-indigo-700">
            {statusNames[answer.status]}
          </span>
          <span className="text-xs text-slate-500">
            {answer.sequence === 1 ? 'First attempt' : `Repeat ${answer.sequence - 1}`}
          </span>
        </div>
        <h3 className="mt-4 break-words text-lg font-bold text-slate-950">{answer.topic}</h3>
        <p className="mt-2 line-clamp-3 break-words text-sm leading-7 text-slate-600">
          {answer.question}
        </p>
        <p className="mt-4 break-words text-xs leading-6 text-slate-500">
          {subjects.find((s) => s.slug === answer.subject_id)?.name || answer.subject_id} ·{' '}
          {provenanceNames[answer.provenance]}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm font-semibold">
            {answer.percentage === null
              ? 'Continue answer'
              : `${answer.obtained_marks}/${answer.maximum_marks} · ${answer.percentage}%`}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-indigo-600" />
        </div>
      </Link>
    </li>
  )
}
function Workspace() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id'),
    creating = params.get('new') === 'question'
  const query = new URLSearchParams()
  for (const key of [...filterKeys, 'offset']) {
    const value = params.get(key)
    if (value !== null && value !== '') query.set(key, value)
  }
  const overview = useLearning<MentorOverview>(`mentor.php?${query}`)
  const preparation = useLearning<Overview>('learning.php')
  const selected = params.get('attempt') || undefined
  const selectedAttempt = useLearning<{ attempt: Attempt }>(
    selected ? `learning.php?attempt_id=${encodeURIComponent(selected)}` : undefined,
  )
  function saved(answerId: string) {
    setParams({ id: answerId })
    overview.refresh()
  }
  if (!overview.data) return <Load error={overview.error} refresh={overview.refresh} />
  const data = overview.data
  const attempts = [...(preparation.data?.attempts || [])]
  const chosenAttempt = selectedAttempt.data?.attempt
  if (chosenAttempt && !attempts.some((a) => a.id === chosenAttempt.id))
    attempts.unshift(chosenAttempt)
  if (creating && (!preparation.data || (selected && !selectedAttempt.data)))
    return (
      <Load
        error={preparation.error || selectedAttempt.error}
        refresh={() => {
          preparation.refresh()
          selectedAttempt.refresh()
        }}
      />
    )
  if (id || creating)
    return (
      <div className="space-y-6">
        <button
          className={secondaryStyle}
          onClick={() => setParams(selected ? { attempt: selected } : {})}
        >
          All answer records
        </button>
        {id ? (
          <AnswerDetail key={id} id={id} subjects={data.catalog} onSaved={saved} />
        ) : (
          <QuestionForm
            key={selected || 'all'}
            attempts={attempts}
            subjects={data.catalog}
            selected={selected}
            onSaved={saved}
          />
        )}
      </div>
    )
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  function pageOffset(value: number) {
    const next = new URLSearchParams(params)
    next.set('offset', String(value))
    setParams(next)
  }
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-300">
              Your writing, reviewed by a human
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Turn evaluated answers into a useful history.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Keep questions, mentor marks and repeat attempts together. See which topics need
              another pass, using the feedback you actually received.
            </p>
          </div>
          <button
            className={`${primaryStyle} shrink-0`}
            onClick={() => {
              const next = new URLSearchParams()
              if (selected) next.set('attempt', selected)
              next.set('new', 'question')
              setParams(next)
            }}
          >
            <Plus className="h-4 w-4" />
            Add a question
          </button>
        </div>
        <ol className="mt-7 grid gap-3 text-xs font-semibold text-slate-300 sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-300" />
            1. Select and write a question
          </li>
          <li className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-indigo-300" />
            2. Enter human mentor marks
          </li>
          <li className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-indigo-300" />
            3. Review and practise again
          </li>
        </ol>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ['First-attempt marks', data.summary.first],
            ['Repeat-attempt marks', data.summary.retries],
          ] as const
        ).map(([label, score]) => (
          <section key={label} className={panelStyle}>
            <h2 className="text-sm font-semibold text-slate-500">{label}</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {scoreText(score)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {score.count} evaluated {score.count === 1 ? 'answer' : 'answers'}
              {score.maximum > 0 && ` · ${score.obtained}/${score.maximum} available marks`}
            </p>
          </section>
        ))}
      </div>
      <p className="text-xs leading-6 text-slate-500">
        Student-entered mentor results. Summaries cover all matching records across pages and use
        total obtained ÷ total maximum marks. Unmarked answers are excluded; corrections count once.
        Filters also apply to these summaries. This is writing evidence, not a readiness or pass
        prediction.
      </p>
      <Filters
        key={query.toString()}
        subjects={data.catalog}
        attempts={attempts}
        params={params}
        onChange={setParams}
      />
      {data.summary.topics.length > 0 && (
        <section className={panelStyle}>
          <h2 className="text-xl font-bold">Topic evidence &amp; revision priorities</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            First-attempt totals only. Below 60% suggests another review; 60% and above suggests
            continued practice. This study threshold is not an FPSC pass rule. Repeats remain in
            their separate history.
          </p>
          <ul className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            {data.summary.topics.map((t) => (
              <li
                key={`${t.subject_id}:${t.topic}`}
                className="min-w-0 rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="break-words font-semibold">{t.topic}</p>
                  <span className="text-sm font-semibold text-indigo-700">{t.percentage}%</span>
                </div>
                <p className="mt-2 break-words text-xs leading-6 text-slate-500">
                  {data.catalog.find((s) => s.slug === t.subject_id)?.name || t.subject_id} ·{' '}
                  {t.count} evaluated · {t.obtained}/{t.maximum}
                </p>
                <div
                  aria-hidden="true"
                  className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${t.percentage}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {t.priority === 'review'
                    ? 'Review this topic, then write another answer.'
                    : 'Continue practice; these marks alone do not establish mastery.'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Answer history</h2>
          <button className={secondaryStyle} onClick={overview.refresh}>
            Refresh records
          </button>
        </div>
        {data.answers.length ? (
          <ul className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
            {data.answers.map((a) => (
              <AnswerCard key={a.id} answer={a} subjects={data.catalog} />
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm leading-7 text-slate-500">
            No answers match this view. Add your first question or clear the filters.
          </p>
        )}
      </section>
      <nav className="flex flex-wrap gap-3" aria-label="Answer history pages">
        <button
          disabled={offset === 0}
          className={secondaryStyle}
          onClick={() => pageOffset(Math.max(0, offset - 50))}
        >
          Previous page
        </button>
        <button
          disabled={!data.has_more}
          className={secondaryStyle}
          onClick={() => pageOffset(offset + 50)}
        >
          Next page
        </button>
      </nav>
    </div>
  )
}
export default function AnswerPerformancePage() {
  const { user } = useAccount()
  return (
    <AccountPage
      title="My Answer Performance"
      intro="Private question history and the marks your human mentor gave you."
    >
      <Workspace key={user?.id} />
    </AccountPage>
  )
}
