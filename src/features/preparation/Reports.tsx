import { useState } from 'react'
import { pakistanTime } from '@/features/membership/api'
import { useLearning } from '@/features/learning/api'
import { field, secondary, type Plan, type PreparationAction, type Capacity } from './api'
import { SavedPlan } from './Plan'
type Score = {
  percentage: number | null
  score?: number
  total?: number
  count?: number
  obtained?: number
  maximum?: number
}
type Dimensions = {
  basis: string
  coverage: Capacity
  revision: { scheduled: number; due: number; current_percentage: number | null; basis: string }
  mcq: Score & { correct: number; total: number; basis: string }
  past_papers: {
    reviewed_units: number
    mapped_units: number
    percentage: number | null
    basis: string
  }
  tests: Score & { basis: string }
  mpt: { first: Score; repeats: Score; basis: string }
  mentor: {
    review_threshold: number
    first: Score
    retries: Score
    topics: { subject_id: string; topic: string; percentage: number; count: number }[]
  }
  grammar: {
    questions: number
    correct: number
    percentage: number | null
    due: number
    completed_days: number
    basis: string
  }
  precis: {
    recognition_questions: number
    recognition_correct: number
    recognition_percentage: number | null
    completed_days: number
    basis: string
    writing: {
      items: { code?: string; label?: string; title?: string; state: string }[]
      basis: string
    }
  }
  reading: {
    bookmarks: number
    read_sources: number
    due: number
    reviews: number
    vistagram_readings: number
    basis: string
  }
  current_affairs: { reading_declarations: number; basis: string }
}
const pct = (n: number | null) => (n === null ? 'Insufficient evidence' : `${n}%`)
function EvidenceCard({
  label,
  value,
  detail,
  basis,
}: {
  label: string
  value: string
  detail: string
  basis: string
}) {
  return (
    <article className="rounded-2xl border bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-500">{label}</h3>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm">{detail}</p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer py-1 text-indigo-700">Evidence basis</summary>
        <p className="mt-2 leading-6 text-slate-600">{basis}</p>
      </details>
    </article>
  )
}
export function Readiness({ attempt }: { attempt: string }) {
  const load = useLearning<{ dimensions: Dimensions }>(
    `planner.php?attempt=${attempt}&view=readiness`,
  )
  if (!load.data)
    return (
      <p role={load.error ? 'alert' : 'status'}>
        {load.error ?? 'Loading preparation evidence…'}
        {load.error && (
          <button className={secondary} onClick={load.refresh}>
            Retry
          </button>
        )}
      </p>
    )
  const d = load.data.dimensions
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Preparation evidence</h2>
      <p className="text-sm leading-6 text-slate-600">{d.basis}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <EvidenceCard
          label="Syllabus coverage"
          value={pct(d.coverage.coverage_percentage)}
          detail={`${d.coverage.covered} / ${d.coverage.total} repository sections reported covered`}
          basis={d.coverage.basis}
        />
        <EvidenceCard
          label="Section revision schedule"
          value={`${d.revision.due} due`}
          detail={`${d.revision.scheduled} scheduled; ${pct(d.revision.current_percentage)} currently up to date`}
          basis={d.revision.basis}
        />
        <EvidenceCard
          label="Distinct MCQ first responses"
          value={pct(d.mcq.percentage)}
          detail={`${d.mcq.correct} correct / ${d.mcq.total} explicitly linked questions`}
          basis={d.mcq.basis}
        />
        <EvidenceCard
          label="Mapped past-paper review"
          value={pct(d.past_papers.percentage)}
          detail={`${d.past_papers.reviewed_units} / ${d.past_papers.mapped_units} sections with mapped questions reviewed`}
          basis={d.past_papers.basis}
        />
        <EvidenceCard
          label="Recorded practice tests"
          value={pct(d.tests.percentage)}
          detail={`${d.tests.score} / ${d.tests.total} points from ${d.tests.count} linked tests`}
          basis={d.tests.basis}
        />
        <EvidenceCard
          label="Released native MPT results"
          value={pct(d.mpt.first.percentage)}
          detail={`First: ${d.mpt.first.score}/${d.mpt.first.total} points. Repeats: ${d.mpt.repeats.score}/${d.mpt.repeats.total} (${pct(d.mpt.repeats.percentage)})`}
          basis={d.mpt.basis}
        />
        <EvidenceCard
          label="Human mentor marks"
          value={pct(d.mentor.first.percentage)}
          detail={`First answers: ${d.mentor.first.obtained}/${d.mentor.first.maximum} points. Repeats: ${d.mentor.retries.obtained}/${d.mentor.retries.maximum} (${pct(d.mentor.retries.percentage)})`}
          basis="Student-entered human evaluations across this attempt’s selected subjects. Latest corrected marks; sum obtained / sum maximum. First answers and repeats are separate. No AI marking."
        />
        <EvidenceCard
          label="Grammar recognition"
          value={pct(d.grammar.percentage)}
          detail={`${d.grammar.correct}/${d.grammar.questions} first responses · ${d.grammar.due} due questions · ${d.grammar.completed_days}/30 days reported complete`}
          basis={d.grammar.basis}
        />
        <EvidenceCard
          label="Précis recognition"
          value={pct(d.precis.recognition_percentage)}
          detail={`${d.precis.recognition_correct}/${d.precis.recognition_questions} first responses · ${d.precis.completed_days} course days complete`}
          basis={d.precis.basis}
        />
        <EvidenceCard
          label="Dated Current Affairs reading"
          value={String(d.current_affairs.reading_declarations)}
          detail="Distinct developments reported read for this attempt"
          basis={d.current_affairs.basis}
        />
        <EvidenceCard
          label="Vistagram & reading revision"
          value={`${d.reading.vistagram_readings} Vistagram articles read`}
          detail={`${d.reading.bookmarks} attempt bookmarks · ${d.reading.due} scheduled revisions due · ${d.reading.reviews} self-reported recall reviews`}
          basis={d.reading.basis}
        />
      </div>
      <section className="rounded-2xl border p-5">
        <h3 className="font-semibold">Independent précis writing evidence</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{d.precis.writing.basis}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {d.precis.writing.items.map((i, n) => (
            <li key={i.code ?? n} className="rounded-xl bg-slate-50 p-3 text-sm">
              {i.title ?? i.label ?? i.code} · <strong>{i.state}</strong>
            </li>
          ))}
        </ul>
      </section>
      {d.mentor.topics.length > 0 && (
        <section className="rounded-2xl border p-5">
          <h3 className="font-semibold">Human mentor topic priorities</h3>
          <ul className="mt-3 space-y-2">
            {d.mentor.topics.map((t, n) => (
              <li key={n} className="text-sm">
                {t.subject_id} · {t.topic} · {t.percentage}% ({t.count} first answers)
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            The {d.mentor.review_threshold}% review threshold is a study rule, not a pass
            prediction.
          </p>
        </section>
      )}
    </div>
  )
}
type Period = {
  from: string
  through: string
  minutes: number
  completed: number
  skipped: number
  moved: number
  studied_units: number
  coverage_declarations: number
  imports: number
  first_drafts: number
  rewrites: number
  mcq_questions: number
  mcq_percentage: number | null
  test_score: number
  test_total: number
  test_percentage: number | null
  paper_reviews: number
  current_affairs_readings: number
  vistagram_readings: number
  reading_reviews: number
  mpt_first_score: number
  mpt_first_total: number
  mpt_repeat_score: number
  mpt_repeat_total: number
  mentor: { first: Score; retries: Score }
  completed_blocks: Record<string, number>
}
export function Reviews({ attempt }: { attempt: string }) {
  const [window, setWindow] = useState('7')
  const load = useLearning<{
    reviews: { periods: Record<string, { current: Period; previous: Period }>; basis: string }
  }>(`planner.php?attempt=${attempt}&view=reviews`)
  if (!load.data)
    return (
      <p role={load.error ? 'alert' : 'status'}>
        {load.error ?? 'Loading progress reviews…'}
        {load.error && (
          <button className={secondary} onClick={load.refresh}>
            Retry
          </button>
        )}
      </p>
    )
  const r = load.data.reviews,
    p = r.periods[window]
  const rows: [string, (p: Period) => string][] = [
    ['Reported study minutes', (p) => String(p.minutes)],
    ['Completed / skipped / moved blocks', (p) => `${p.completed} / ${p.skipped} / ${p.moved}`],
    ['Section study blocks', (p) => String(p.studied_units)],
    ['Coverage declarations / imports', (p) => `${p.coverage_declarations} / ${p.imports}`],
    ['First writing drafts / rewrites', (p) => `${p.first_drafts} / ${p.rewrites}`],
    ['Linked MCQs', (p) => `${p.mcq_questions} · ${pct(p.mcq_percentage)}`],
    ['Vistagram articles read', (p) => String(p.vistagram_readings)],
    ['Reading recall reviews', (p) => String(p.reading_reviews)],
    ['Linked tests', (p) => `${p.test_score}/${p.test_total} · ${pct(p.test_percentage)}`],
    [
      'Paper / Current Affairs reviews',
      (p) => `${p.paper_reviews} / ${p.current_affairs_readings}`,
    ],
    [
      'Human mentor first / repeat marks',
      (p) => `${pct(p.mentor.first.percentage)} / ${pct(p.mentor.retries.percentage)}`,
    ],
    [
      'Native MPT first / repeat points',
      (p) =>
        `${p.mpt_first_score}/${p.mpt_first_total} · ${p.mpt_repeat_score}/${p.mpt_repeat_total}`,
    ],
  ]
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Progress reviews</h2>
      <label className="grid gap-1 text-sm">
        Review period
        <select
          aria-label="Review period"
          className={field}
          value={window}
          onChange={(e) => setWindow(e.target.value)}
        >
          <option value="7">Weekly — 7 days</option>
          <option value="30">Monthly — 30 days</option>
        </select>
      </label>
      <p className="text-sm leading-6 text-slate-600">{r.basis}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ['Current', p.current],
          ['Previous', p.previous],
        ].map(([label, period]) => {
          const v = period as Period
          return (
            <section key={String(label)} className="rounded-2xl border p-5">
              <h3 className="font-semibold">
                {String(label)} {window} days
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {v.from} through {v.through}
              </p>
              <dl className="mt-4 divide-y">
                {rows.map(([name, value]) => (
                  <div key={name} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <dt className="text-slate-600">{name}</dt>
                    <dd className="font-semibold">{value(v)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                Completed blocks by lane:{' '}
                {Object.entries(v.completed_blocks)
                  .map(([k, n]) => `${k.replaceAll('_', ' ')} ${n}`)
                  .join(' · ') || 'None recorded'}
              </p>
            </section>
          )
        })}
      </div>
      <p className="text-sm text-slate-500">
        Zero recorded activity does not prove no study happened. Unavailable assessments stay
        unassessed; no readiness prediction is generated.
      </p>
    </div>
  )
}
function ChangeHistory({ attempt }: { attempt: string }) {
  const [offset, setOffset] = useState(0)
  const load = useLearning<{
    events: {
      id: string
      event_type: string
      occurred_at: string
      payload: {
        reason?: string
        status?: string
        delta_minutes?: number
        kind?: string
        coverage?: string
        to?: string
        items?: unknown[]
      }
    }[]
    has_more: boolean
  }>(`planner.php?attempt=${attempt}&view=events&offset=${offset}`)
  if (!load.data)
    return (
      <p role={load.error ? 'alert' : 'status'}>
        {load.error ?? 'Loading preparation changes…'}
        {load.error && (
          <button className={secondary} onClick={load.refresh}>
            Retry changes
          </button>
        )}
      </p>
    )
  const names: Record<string, string> = {
    reading_save: 'Reading or recall recorded',
    plan_save: 'Plan reviewed and saved',
    task_work: 'Study block reported',
    task_move: 'Remaining work rescheduled',
    coverage_save: 'Coverage reported',
    coverage_import: 'Earlier coverage copied',
    evidence_link: 'Practice evidence linked',
    settings_save: 'Study track updated',
  }
  return (
    <div className="mt-3 space-y-3">
      <ul className="divide-y">
        {load.data.events.map((e) => (
          <li className="py-3 text-sm" key={e.id}>
            <p className="font-semibold">{names[e.event_type] ?? 'Preparation updated'}</p>
            <p className="mt-1 text-xs text-slate-500">{pakistanTime(e.occurred_at)}</p>
            <p className="mt-2 leading-6 text-slate-600">
              {e.payload.reason ??
                (e.payload.status
                  ? `${e.payload.delta_minutes ?? 0} additional minutes · ${e.payload.kind?.replaceAll('_', ' ')} · ${e.payload.status}`
                  : e.payload.coverage
                    ? `Coverage: ${e.payload.coverage.replaceAll('_', ' ')}`
                    : e.payload.to
                      ? `Moved to ${e.payload.to}`
                      : e.payload.items
                        ? `${e.payload.items.length} earlier sections copied`
                        : 'Saved to this attempt.')}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          className={secondary}
          disabled={!offset}
          onClick={() => setOffset((v) => Math.max(0, v - 50))}
        >
          Newer changes
        </button>
        <button
          className={secondary}
          disabled={!load.data.has_more}
          onClick={() => setOffset((v) => v + 50)}
        >
          Older changes
        </button>
      </div>
    </div>
  )
}
export function PlanHistory({ attempt, action }: { attempt: string; action: PreparationAction }) {
  const [offset, setOffset] = useState(0),
    [date, setDate] = useState(''),
    [changes, setChanges] = useState(false)
  const list = useLearning<{ plans: Omit<Plan, 'tasks'>[]; has_more: boolean }>(
    `planner.php?attempt=${attempt}&view=history&offset=${offset}`,
  )
  const day = useLearning<{ plan: Plan; today: string }>(
    date ? `planner.php?attempt=${attempt}&view=day&date=${date}` : undefined,
  )
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Saved plan history</h2>
      {list.error ? (
        <p role="alert">{list.error}</p>
      ) : !list.data ? (
        <p role="status">Loading plan history…</p>
      ) : (
        <>
          <label className="grid gap-1 text-sm">
            Saved day
            <select
              aria-label="Saved day"
              className={field}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              <option value="">Choose a saved plan</option>
              {list.data.plans.map((p) => (
                <option key={p.id} value={p.plan_date}>
                  {p.plan_date} · {p.budget} minutes · revision {p.version}
                </option>
              ))}
            </select>
          </label>
          {!list.data.plans.length && <p className="text-sm text-slate-500">No plan saved yet.</p>}
          <div className="flex flex-wrap gap-2">
            <button
              className={secondary}
              disabled={!offset}
              onClick={() => {
                setOffset((v) => Math.max(0, v - 30))
                setDate('')
              }}
            >
              Previous history
            </button>
            <button
              className={secondary}
              disabled={!list.data.has_more}
              onClick={() => {
                setOffset((v) => v + 30)
                setDate('')
              }}
            >
              Older history
            </button>
          </div>
        </>
      )}
      {date &&
        (day.data ? (
          <SavedPlan plan={day.data.plan} today={day.data.today} action={action} />
        ) : (
          <p role={day.error ? 'alert' : 'status'}>
            {day.error ?? 'Loading saved day…'}
            {day.error && (
              <button className={secondary} onClick={day.refresh}>
                Retry day
              </button>
            )}
          </p>
        ))}
      <details
        className="rounded-2xl border p-5"
        onToggle={(e) => setChanges(e.currentTarget.open)}
      >
        <summary className="cursor-pointer font-semibold">Preparation change history</summary>
        {changes && <ChangeHistory attempt={attempt} />}
      </details>
      <p className="text-sm leading-6 text-slate-500">
        Completed, partial, skipped, deferred and moved identities stay recorded. Historical entries
        describe reported work and saved allocations; they do not change old examination results.
      </p>
    </div>
  )
}
