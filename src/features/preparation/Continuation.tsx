import { Link } from 'react-router'
import { useLearning } from '@/features/learning/api'
import { secondary } from './api'
export default function AttemptContinuation() {
  const load = useLearning<{
    attempts: { id: string; target_year: number; daily_minutes: number }[]
  }>('planner.php?overview=1')
  return (
    <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
      <h2 className="text-lg font-semibold text-slate-950">My CSS Attempts</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Open your account-linked daily plan, coverage, revision and evidence reviews.
      </p>
      {load.data ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {load.data.attempts.map((a) => (
            <Link key={a.id} className={secondary} to={`/account/preparation?attempt=${a.id}`}>
              CSS {a.target_year} · {a.daily_minutes} minutes/day
            </Link>
          ))}
          {!load.data.attempts.length && (
            <Link className={secondary} to="/account/preparation?new=attempt">
              Create a preparation attempt
            </Link>
          )}
        </div>
      ) : load.error ? (
        <p role="alert" className="mt-3 text-sm">
          {load.error}
          <button className={`${secondary} ml-2`} onClick={load.refresh}>
            Retry attempts
          </button>
        </p>
      ) : (
        <p role="status" className="mt-3 text-sm">
          Loading attempts…
        </p>
      )}
    </section>
  )
}
