import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useLearning, type Attempt } from '@/features/learning/api'
import { secondary, usePreparationAction, type PlanData } from './api'
import PreparationPlan from './Plan'
import Coverage from './Coverage'
import ConnectedReading from './Reading'
import TopicWorkspace from '@/features/topics/Workspace'
import { PlanHistory, Readiness, Reviews } from './Reports'
const views = [
  ['plan', 'Today’s plan'],
  ['coverage', 'Coverage'],
  ['reading', 'Reading & revision'],
  ['topics', 'Pro topic learning'],
  ['readiness', 'Preparation evidence'],
  ['reviews', 'Reviews'],
  ['history', 'History'],
  ['settings', 'Settings'],
] as const
export default function PreparationWorkspace({
  attempt,
  settings,
}: {
  attempt: Attempt
  settings: ReactNode
}) {
  const [params, setParams] = useSearchParams(),
    [generation, setGeneration] = useState(0)
  const requested = params.get('view'),
    view = views.some(([id]) => id === requested) ? requested : 'plan'
  const load = useLearning<PlanData>(`planner.php?attempt=${attempt.id}`)
  const action = usePreparationAction(attempt.id, () => {
    load.refresh()
    setGeneration((v) => v + 1)
  })
  return (
    <div className="min-w-0 space-y-6 text-slate-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
            My CSS Attempt
          </p>
          <h2 className="mt-1 text-2xl font-semibold">CSS {attempt.target_year}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {attempt.daily_minutes} minutes/day ·{' '}
            {attempt.target_date
              ? `Your target: ${attempt.target_date}`
              : 'Your target date is not set'}
          </p>
        </div>
        <button
          className={secondary}
          disabled={action.busy}
          onClick={() => {
            load.refresh()
            setGeneration((v) => v + 1)
          }}
        >
          Refresh preparation
        </button>
      </header>
      <nav aria-label="Attempt workspace" className="flex flex-wrap gap-2">
        {views.map(([id, label]) => (
          <button
            key={id}
            aria-current={view === id ? 'page' : undefined}
            className={`${secondary} ${view === id ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : ''}`}
            onClick={() => setParams({ attempt: attempt.id, view: id })}
          >
            {label}
          </button>
        ))}
      </nav>
      {action.pending && (
        <section
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5"
          aria-label="Pending preparation action"
        >
          <h3 className="font-semibold">Check your saved action</h3>
          <p className="mt-2 text-sm leading-6">
            A {String(action.pending.body.action).replaceAll('_', ' ')} action awaits confirmation.
            Check its receipt before starting another save. Refreshing or reopening this tab
            preserves the exact request.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={secondary}
              disabled={action.busy}
              onClick={() => void action.recover()}
            >
              Check saved action
            </button>
            {action.unaccepted && (
              <>
                <button
                  className={secondary}
                  disabled={action.busy}
                  onClick={() => void action.recover(true)}
                >
                  Retry exact action
                </button>
                <button className={secondary} disabled={action.busy} onClick={action.discard}>
                  Discard unaccepted action
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {action.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          {action.error}
        </p>
      )}
      {action.message && (
        <p
          role="status"
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900"
        >
          {action.message}
        </p>
      )}
      {view === 'settings' ? (
        <div className="space-y-5">
          {settings}
          <p className="text-sm leading-6 text-slate-500">
            Changes to study time and selected subjects produce a proposal for review. Existing
            completed work is preserved.
          </p>
          {load.data && (
            <label className="grid gap-2 text-sm">
              Religion-paper study track
              <select
                aria-label="Religion-paper study track"
                value={load.data.settings.religion_choice ?? ''}
                disabled={action.blocked}
                className="min-h-11 rounded-xl border px-3"
                onChange={(e) =>
                  void action.send({
                    action: 'settings_save',
                    expected_version: load.data!.settings.version,
                    religion_choice: e.target.value,
                  })
                }
              >
                <option value="" disabled>
                  Choose study material
                </option>
                <option value="islamic-studies">Islamic Studies</option>
                <option value="comparative-religions">Comparative Study of Major Religions</option>
              </select>
            </label>
          )}
        </div>
      ) : !load.data ? (
        <div role={load.error ? 'alert' : 'status'} className="rounded-2xl border p-5">
          {load.error ?? 'Loading your attempt plan…'}
          {load.error && (
            <button className={`${secondary} ml-2`} onClick={load.refresh}>
              Try again
            </button>
          )}
        </div>
      ) : (
        <div key={`${view}:${view === 'reading' || view === 'topics' ? 0 : generation}`}>
          {view === 'topics' ? (
            <TopicWorkspace attempt={attempt.id} />
          ) : view === 'reading' ? (
            <ConnectedReading attempt={attempt.id} action={action} generation={generation} />
          ) : view === 'coverage' ? (
            <Coverage attempt={attempt.id} action={action} />
          ) : view === 'readiness' ? (
            <Readiness attempt={attempt.id} />
          ) : view === 'reviews' ? (
            <Reviews attempt={attempt.id} />
          ) : view === 'history' ? (
            <PlanHistory attempt={attempt.id} action={action} />
          ) : (
            <PreparationPlan data={load.data} action={action} />
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3 border-t pt-5">
        <Link className={secondary} to={`/account/ask-vista?attempt=${attempt.id}`}>
          Ask VISTA
        </Link>
        <Link className={secondary} to={`/grammar-course?view=profile&attempt=${attempt.id}`}>
          Grammar Profile
        </Link>
        <Link className={secondary} to="/study-planner">
          Existing study planner
        </Link>
      </div>
    </div>
  )
}
