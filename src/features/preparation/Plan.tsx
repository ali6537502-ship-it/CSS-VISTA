import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CalendarDays, Clock3, RotateCcw } from 'lucide-react'
import {
  field,
  primary,
  secondary,
  type PlanData,
  type Plan,
  type Task,
  type PreparationAction,
} from './api'
function TaskRow({
  task,
  today,
  planDate,
  action,
}: {
  task: Task
  today: string
  planDate: string
  action: PreparationAction
}) {
  const [minutes, setMinutes] = useState(String(task.minutes - task.actual_minutes)),
    [outcome, setOutcome] = useState(task.kind === 'revision' ? 'recalled' : 'studied'),
    [date, setDate] = useState('')
  const open = ['pending', 'partial'].includes(task.status)
  const remaining = task.minutes - task.actual_minutes
  const validMinutes =
    Number.isInteger(Number(minutes)) && Number(minutes) > 0 && Number(minutes) <= remaining
  const base = { task_id: task.id, expected_version: task.version }
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {task.snapshot.subject} · {task.kind.replaceAll('_', ' ')}
          </p>
          <h3 className="mt-1 break-words text-lg font-semibold text-slate-950">
            {task.snapshot.title}
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
          {task.status}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{task.snapshot.why}</p>
      <p className="mt-3 text-sm font-medium">
        {task.actual_minutes} minutes recorded · {task.minutes} allocated
      </p>
      <Link to={task.snapshot.to} className={`${secondary} mt-3`}>
        Open study material <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
      {open && (
        <details className="mt-4 rounded-xl bg-slate-50 p-3">
          <summary className="cursor-pointer py-1 text-sm font-semibold">
            Record work or reschedule
          </summary>
          <div className="mt-3 space-y-3">
            {planDate <= today && (
              <>
                <label className="grid gap-1 text-sm">
                  Additional minutes studied
                  <input
                    type="number"
                    min="1"
                    max={task.minutes - task.actual_minutes}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className={field}
                  />
                </label>
                {task.kind === 'learn' && (
                  <label className="grid gap-1 text-sm">
                    Section coverage
                    <select
                      aria-label="Section coverage"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className={field}
                    >
                      <option value="studied">Studied a block; section still in progress</option>
                      <option value="covered">I have covered the whole section</option>
                    </select>
                  </label>
                )}
                {task.kind === 'revision' && (
                  <label className="grid gap-1 text-sm">
                    Recall outcome
                    <select
                      aria-label="Recall outcome"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className={field}
                    >
                      <option value="recalled">Recalled independently</option>
                      <option value="needs_review">Needs another review</option>
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={primary}
                    disabled={action.blocked || !validMinutes}
                    onClick={() =>
                      void action.send({
                        ...base,
                        action: 'task_work',
                        status: 'completed',
                        minutes: Number(minutes),
                        ...(['learn', 'revision'].includes(task.kind) ? { outcome } : {}),
                      })
                    }
                  >
                    Complete block
                  </button>
                  <button
                    className={secondary}
                    disabled={action.blocked || !validMinutes || Number(minutes) >= remaining}
                    onClick={() =>
                      void action.send({
                        ...base,
                        action: 'task_work',
                        status: 'partial',
                        minutes: Number(minutes),
                      })
                    }
                  >
                    Save partial work
                  </button>
                  <button
                    className={secondary}
                    disabled={action.blocked}
                    onClick={() =>
                      void action.send({
                        ...base,
                        action: 'task_work',
                        status: 'skipped',
                        minutes: 0,
                      })
                    }
                  >
                    Skip
                  </button>
                </div>
              </>
            )}
            <label className="grid gap-1 text-sm">
              Move remaining work to a future date
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={field}
              />
            </label>
            <button
              disabled={action.blocked || !date || date <= today}
              className={secondary}
              onClick={() => void action.send({ ...base, action: 'task_move', date })}
            >
              Move remaining block
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Reported minutes stay in history. Finishing a block records your own study report; it
              does not create course scores or mentor marks.
            </p>
          </div>
        </details>
      )}
    </article>
  )
}
export function SavedPlan({
  plan,
  today,
  action,
}: {
  plan: Plan
  today: string
  action: PreparationAction
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        {plan.plan_date} · {plan.budget} minutes budget · saved update {plan.version}
      </p>
      {plan.tasks.map((t) => (
        <TaskRow
          key={`${t.id}:${t.version}`}
          task={t}
          today={today}
          planDate={plan.plan_date}
          action={action}
        />
      ))}
    </div>
  )
}
export default function PreparationPlan({
  data,
  action,
}: {
  data: PlanData
  action: PreparationAction
}) {
  const [review, setReview] = useState(false),
    [religion, setReligion] = useState(data.settings.religion_choice ?? 'islamic-studies')
  const p = data.proposal,
    c = p.summary
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
          Your next study session
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Continue learning</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className={primary} to={data.continue.grammar}>
            Continue Grammar <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          {data.active && (
            <Link className={secondary} to={data.continue.precis}>
              Continue Précis
            </Link>
          )}
          <Link className={secondary} to={`/account/answer-performance?attempt=${data.attempt.id}`}>
            Human mentor records
          </Link>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your saved lesson position and actual practice remain linked to this attempt. Opened pages
          receive no progress credit.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [Clock3, `${p.budget} minutes`, 'Daily time budget'],
          [RotateCcw, `${data.revision_total} due`, 'Scheduled section reviews'],
          [CalendarDays, `${c.covered} / ${c.total}`, 'Sections reported covered'],
        ].map(([Icon, value, label]) => {
          const Glyph = Icon as typeof Clock3
          return (
            <div key={String(label)} className="rounded-2xl border p-4">
              <Glyph className="h-5 w-5 text-indigo-600" />
              <p className="mt-2 text-xl font-semibold">{String(value)}</p>
              <p className="text-xs text-slate-500">{String(label)}</p>
            </div>
          )
        })}
      </div>
      {p.requires_setup && (
        <section className="rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">Choose your religion-paper study track</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This selects study material only. Check current official eligibility and
            optional-subject rules with FPSC.
          </p>
          <label className="mt-3 grid gap-2 text-sm">
            Study track
            <select
              aria-label="Study track"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              className={field}
            >
              <option value="islamic-studies">Islamic Studies</option>
              <option value="comparative-religions">Comparative Study of Major Religions</option>
            </select>
          </label>
          <button
            className={`${primary} mt-3`}
            disabled={action.blocked}
            onClick={() =>
              void action.send({
                action: 'settings_save',
                expected_version: data.settings.version,
                religion_choice: religion,
              })
            }
          >
            Save study track
          </button>
        </section>
      )}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Today’s plan</h2>
            <p className="mt-1 text-sm text-slate-500">{data.today} · Pakistan Standard Time</p>
          </div>
          <button
            className={secondary}
            disabled={action.blocked || p.requires_setup}
            onClick={() => setReview((v) => !v)}
          >
            {data.plan ? 'Review plan update' : 'Review suggested plan'}
          </button>
        </div>
        {review && (
          <div
            className="space-y-4 rounded-2xl border-2 border-indigo-200 p-5"
            aria-label="Plan proposal"
          >
            <h3 className="font-semibold">Review before saving</h3>
            <p className="text-sm leading-6 text-slate-600">
              Due revision and evidenced difficulties come first, followed by a balance of study
              lanes. Completed and partial work stays recorded. Outstanding tasks omitted here are
              deferred in history. Missed work competes within the same budget.
            </p>
            <p className="text-sm font-medium">
              {p.selection.allocated_minutes} minutes committed · {p.selection.remaining_minutes}{' '}
              unallocated
            </p>
            {p.selection.recorded_over_budget_minutes > 0 && (
              <p className="text-sm text-amber-800">
                Earlier recorded and partial work exceeds the new budget by{' '}
                {p.selection.recorded_over_budget_minutes} minutes. No extra task is added.
              </p>
            )}
            {p.selection.locked.map((t) => (
              <p key={t.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                Kept: {t.snapshot.title} · {t.minutes - t.actual_minutes} minutes remaining
              </p>
            ))}
            {p.selection.tasks.map((t) => (
              <div key={t.work_key} className="rounded-xl border p-3">
                <p className="font-medium">
                  {t.title} · {t.minutes} minutes
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t.why}</p>
              </div>
            ))}
            {!p.selection.tasks.length && (
              <p className="text-sm">
                No additional task fits the available time. Review partial work or your settings.
              </p>
            )}
            <button
              disabled={action.blocked || p.requires_setup || !p.has_changes}
              className={primary}
              onClick={() =>
                void action.send({
                  action: 'plan_save',
                  date: p.date,
                  expected_version: p.expected_version,
                  proposal_hash: p.hash,
                })
              }
            >
              {p.has_changes ? 'Save reviewed plan' : 'Plan already matches'}
            </button>
          </div>
        )}
        {data.plan ? (
          <SavedPlan plan={data.plan} today={data.today} action={action} />
        ) : (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-slate-500">
            Review and save the proposed plan to begin. Suggestions do not replace saved work
            automatically.
          </p>
        )}
      </section>
      {data.revision_total > 0 && (
        <section className="rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">Revision due</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your plan budgets the next reviews; this queue does not add extra minutes automatically.
          </p>
          <ul className="mt-3 divide-y">
            {data.revision.map((r) => (
              <li
                key={r.unit.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span>
                  {r.unit.title}
                  <span className="block text-xs text-slate-500">
                    Due {r.due} · last reported study {r.last_studied ?? 'unknown'}
                  </span>
                </span>
                <Link className={secondary} to={r.unit.to}>
                  Open review material
                </Link>
              </li>
            ))}
          </ul>
          {data.revision_total > data.revision.length && (
            <p className="text-xs">
              First {data.revision.length} of {data.revision_total} due sections shown.
            </p>
          )}
        </section>
      )}
      <details className="rounded-2xl border p-5">
        <summary className="cursor-pointer font-semibold">Coverage and time assumptions</summary>
        <p className="mt-3 text-sm leading-6 text-slate-600">{c.basis}</p>
        <p className="mt-2 text-sm">
          {c.remaining} sections remaining · {c.estimated_coverage_minutes} estimated study minutes.{' '}
          {c.days_remaining === null
            ? 'Set your own target date in attempt settings to compare available time.'
            : `${c.days_remaining} days to your target; ${c.coverage_capacity_minutes} minutes reserved for coverage. Estimated shortfall: ${c.estimated_shortfall_minutes} minutes.`}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Section size varies. Default block lengths are planning estimates. Your target is a
          student target, not a verified examination date.
        </p>
        {data.overdue.length > 0 && (
          <p className="mt-2 text-sm">
            {data.overdue.length} unfinished earlier blocks are available for bounded recovery
            (oldest 100 shown). Nothing is marked completed because a day was missed.
          </p>
        )}
      </details>
    </div>
  )
}
