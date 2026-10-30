import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { useAccount } from '@/lib/accountContext'

type CourseSnapshot = {
  plan?: {days?: number; startDate?: string} | null
  completed?: Record<string, unknown>
  revisit?: Record<string, unknown>
}

function readCourse() {
  let raw: CourseSnapshot = {}
  try { raw = JSON.parse(localStorage.getItem('cssvista:tool:gsa-tutor:v1') || '{}') as CourseSnapshot } catch { /* Corrupt local records do not block the dashboard. */ }
  return {
    days: typeof raw.plan?.days === 'number' && raw.plan.days >= 5 && raw.plan.days <= 120 ? raw.plan.days : null,
    completed: Object.keys(raw.completed || {}).length,
    revision: Object.keys(raw.revisit || {}).length,
  }
}

export default function AccountGSATutorCard() {
  const { syncStatus } = useAccount()
  const [info, setInfo] = useState(() => readCourse())
  useEffect(() => {
    setInfo(readCourse())
    const update = () => setInfo(readCourse())
    window.addEventListener(PROGRESS_CHANGED_EVENT, update)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, update)
  }, [syncStatus])

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 sm:p-6" aria-label="GSA Tutor course progress">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">General Science</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">My GSA Tutor</h2>
          <p className="mt-2 text-sm text-slate-600">
            {info.days ? 'Your ' + info.days + '-day learning programme' : 'Choose your own course duration and start your first lesson.'}
          </p>
        </div>
        <Link to="/account/gsa-tutor" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">
          {info.days ? 'Continue learning' : 'Create my course'}
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-emerald-50 p-3"><strong className="block text-2xl text-emerald-950">{info.completed} / 141</strong><span className="text-xs text-emerald-800">Lessons completed</span></div>
        <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-2xl text-slate-950">{info.revision}</strong><span className="text-xs text-slate-600">Lessons to revisit</span></div>
        <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1"><strong className="block text-2xl text-slate-950">{info.days ?? '—'}</strong><span className="text-xs text-slate-600">Planned days</span></div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-700" style={{width: Math.min(100, info.completed / 141 * 100) + '%'}} /></div>
      <p className="mt-3 text-xs text-slate-500">Your saved course records follow the My CSS VISTA account sync cycle.</p>
    </section>
  )
}
