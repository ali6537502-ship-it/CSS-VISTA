import { Link, useSearchParams } from 'react-router'
import { BookOpen, RefreshCw } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useLearning } from '@/features/learning/api'
import { panelStyle, inputStyle, secondaryStyle } from '@/features/handwriting/styles'
import { AccountPage } from './shared'
import Guide from '@/features/precis/Guide'
import type { Overview, Progress } from '@/features/precis/api'

function PrecisCourse() {
  const [params, setParams] = useSearchParams()
  const overview = useLearning<Overview>('precis.php')
  const attempt = params.get('attempt') || ''
  const progress = useLearning<Progress>(
    attempt ? `precis.php?attempt_id=${encodeURIComponent(attempt)}` : undefined,
  )
  const data = overview.data

  function chooseAttempt(id: string) {
    const next = new URLSearchParams()
    if (id) next.set('attempt', id)
    next.set('view', 'guide')
    setParams(next)
  }

  if (!data) {
    return <div className={panelStyle} role={overview.error ? 'alert' : 'status'}>
      <p>{overview.error || 'Opening your Précis course…'}</p>
      {overview.error && <button type="button" className={secondaryStyle} onClick={overview.refresh}>
        <RefreshCw className="h-4 w-4" /> Retry
      </button>}
    </div>
  }

  return <div className="mx-auto max-w-5xl space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <BookOpen className="mt-1 h-6 w-6 shrink-0 text-indigo-700" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold">Your Précis course</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Choose your duration, work through the original handbook and continue where you left off.</p>
        </div>
      </div>
      <label className="mt-5 block text-sm font-semibold" htmlFor="precis-course-attempt">Save progress to my preparation attempt</label>
      <select id="precis-course-attempt" value={attempt} onChange={event => chooseAttempt(event.target.value)} className={`mt-2 w-full max-w-md ${inputStyle}`}>
        <option value="">Read without saving progress</option>
        {data.attempts.map(item => <option key={item.id} value={item.id}>CSS {item.target_year} attempt</option>)}
      </select>
      {data.has_more_attempts && <p className="mt-2 text-xs text-slate-600">The most recent 1,000 attempts are available here.</p>}
      {!data.attempts.length && <p className="mt-3 text-sm text-slate-600">To keep your place across sessions, <Link className="font-semibold underline" to="/account/preparation?new=attempt">create a preparation attempt</Link>.</p>}
      {progress.error && <p role="alert" className="mt-3 text-sm text-red-700">{progress.error} <button className="underline" type="button" onClick={progress.refresh}>Retry progress</button></p>}
    </section>
    {data.catalog ? (
      <Guide key={attempt} data={data} attempt={attempt} progress={progress.data} refresh={progress.refresh} />
    ) : (
      <section className={panelStyle} role="status">
        <h2 className="text-lg font-semibold">Course access is currently unavailable</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Your recorded lessons and preparation progress are preserved. Check your access under <Link className="underline" to="/account/membership">Membership</Link>.</p>
      </section>
    )}
  </div>
}
export default function PrecisPage() {
  const { user } = useAccount()
  return <AccountPage title="Précis Course" intro="A handbook-based course with a duration you choose, guided lessons and practice."><PrecisCourse key={user?.id}/></AccountPage>
}
