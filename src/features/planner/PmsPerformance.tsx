import { Link } from 'react-router'
import { ArrowUpRight, BookOpen, CalendarDays } from 'lucide-react'
import { useAccountSnapshot } from '@/pages/account/shared'
import { pmsSummary } from './pmsModel'
export default function PmsPerformance() {
  const { snapshot } = useAccountSnapshot()
  const progress = pmsSummary(snapshot.state.studyScheduleTasks, snapshot.state.syllabusItemStatuses)
  return <section className="ws-panel my-6" aria-label="PMS Punjab preparation progress"><div className="ws-section-head"><h2><BookOpen size={19}/>PMS Punjab</h2><Link to="/account/subjects?exam=pms-punjab">Subject outline <ArrowUpRight size={15}/></Link></div><div className="grid gap-5 sm:grid-cols-2 mt-5"><div><strong className="text-3xl font-bold">{progress.completedItems}</strong><p className="ws-muted text-sm mt-2">Imported PMS outline items marked complete, across saved subjects.</p></div><div><strong className="text-3xl font-bold">{progress.completedSessions}<small className="text-lg font-medium text-slate-500"> / {progress.sessions}</small></strong><p className="ws-muted text-sm mt-2">Saved PMS timetable sessions completed, all dates.</p>{progress.sessions > 0 && <progress className="w-full mt-3 accent-emerald-800" value={progress.completedSessions} max={progress.sessions} aria-label="Saved PMS sessions completed"/>}</div></div><p className="ws-muted text-xs mt-5">These are self-reported study checks. MCQ accuracy and assessed results are shown separately.</p><Link className="ws-action mt-4" to="/account/tasks?exam=pms-punjab"><CalendarDays size={16}/>{progress.sessions ? 'Open PMS study plan' : 'Build your PMS study plan'}</Link></section>
}
