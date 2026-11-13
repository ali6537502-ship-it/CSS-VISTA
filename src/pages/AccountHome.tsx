import { ArrowUpRight, BookOpen, CalendarDays, CheckCheck, Layers3, RotateCcw, HeartPulse } from 'lucide-react'
import { ProgressRing } from '@/features/workspace/Visuals'
import AccountGSATutorCard from '@/features/gsa-tutor/AccountGSATutorCard'
import ContinueStudying from '@/features/workspace/ContinueStudying'
import { Link } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { AccountPage, TaskItem, useAccountSnapshot } from './account/shared'
import { QuickActions } from '@/features/workspace/FeatureFinder'
import { SubjectOverview } from './account/Subjects'
import { localTaskDateKey } from '@/lib/myTasks'
import { targetDays } from '@/features/workspace/model'
export default function AccountHome() {
  const { user, syncStatus, syncError } = useAccount()
  const { snapshot, refresh } = useAccountSnapshot()
  const hour = Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:'Asia/Karachi'}).format(new Date()))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const days = targetDays(snapshot.state.studyPlanner?.examDate,localTaskDateKey())
  return <div className="ws-overview"><AccountPage title={`${greeting}${user?.display_name ? `, ${user.display_name.split(/\s+/)[0]}` : ''}`} intro="A clear plan for today. Steady progress towards your examination.">
    {days !== null && <p className="ws-muted mb-5">Your chosen target: {snapshot.state.studyPlanner?.examDate} · {days < 0 ? 'Target date has passed — review your schedule' : days === 0 ? 'Today' : `${days} days remaining`}</p>}
    {syncError && <p role="alert" className="ws-panel mb-5">{syncError} <Link to="/account/settings" className="underline">Review account sync</Link></p>}
        <div className="ws-dashboard-grid"><div className="ws-focus-area">
      <ContinueStudying greeting={`${greeting}${user?.display_name ? `, ${user.display_name.split(/\s+/)[0]}` : ''}.`} />
      </div><section className="ws-panel ws-agenda"><div className="ws-section-head"><h2><CalendarDays size={19}/>Today’s Study Plan</h2><Link to="/account/tasks?exam=css&view=today">View all</Link></div><p className="ws-muted mb-4">{snapshot.todayDone.length} of {snapshot.todayTasks.length} scheduled tasks complete</p><div className="space-y-3">{snapshot.todayTasks.slice(0,4).map(task => <TaskItem key={task.id} task={task} refresh={refresh} />)}</div>{!snapshot.todayTasks.length && <p className="ws-muted">{syncStatus === 'syncing' ? 'Loading saved schedule…' : <>Nothing scheduled today. <Link className="underline" to="/account/tasks?exam=css&view=syllabus">Open Vista Mentor</Link>.</>}</p>}{snapshot.due.overdue.length > 0 && <Link className="inline-flex min-h-11 items-center underline text-sm mt-3" to="/account/tasks">Review {snapshot.due.overdue.length} overdue tasks</Link>}</section>

    <div className="ws-dashboard-shortcuts"><Link className="ws-pms-entry" to="/account/fitness-coach"><HeartPulse size={22}/><span><strong>Personal Fitness Coach</strong><small>Set a target, choose foods available at home, and follow guided home workouts.</small></span><ArrowUpRight size={18}/></Link><Link className="ws-pms-entry" to="/account/tasks?exam=css&view=syllabus"><BookOpen size={22}/><span><strong>CSS Vista</strong><small>Your complete CSS preparation space: personalized daily study plans, one to three subjects in parallel, analytical chapter notes commands, revision and progress tracking.</small></span><ArrowUpRight size={18}/></Link><Link className="ws-pms-entry" to="/account/tasks?exam=pms-punjab&view=syllabus"><BookOpen size={22}/><span><strong>PMS Vista</strong><small>Full PMS syllabus, personalized routine and day-by-day preparation guide.</small></span><ArrowUpRight size={18}/></Link><QuickActions /></div><section className="ws-panel ws-progress-panel"><div className="ws-section-head"><h2>Progress snapshot</h2><Link to="/account/progress">Details</Link></div><div className="ws-progress-feature"><ProgressRing value={snapshot.todayDone.length} total={snapshot.todayTasks.length} label="Today's scheduled tasks completed"/><div><span className="ws-eyebrow">TODAY’S MOMENTUM</span><strong>{snapshot.todayDone.length}<small> / {snapshot.todayTasks.length}</small></strong><p>scheduled tasks complete</p></div></div><dl className="ws-progress-numbers"><div><Layers3 size={18}/><dt>CSS syllabus items completed</dt><dd>{snapshot.syllabusCompleted}</dd></div><div><CheckCheck size={18}/><dt>Recorded MCQ accuracy <small>{snapshot.stats.attempted} questions attempted</small></dt><dd>{snapshot.stats.attempted ? `${snapshot.stats.accuracy}%` : '—'}</dd></div><div><RotateCcw size={18}/><dt>Revision items due</dt><dd>{snapshot.revision.due}</dd></div></dl></section>
<p className="ws-sync-note ws-muted text-xs">{syncStatus === 'syncing' ? 'Synchronizing your account…' : 'Your device keeps study records locally. Check sync status in Account & Settings.'}</p>
      <div className="ws-course-panel"><AccountGSATutorCard /></div>
      <section className="ws-dashboard-subjects"><div className="ws-section-head"><h2>My Subjects</h2><Link to="/account/subjects">Explore subjects <ArrowUpRight size={15}/></Link></div><SubjectOverview compact /></section></div>
  </AccountPage></div>
}
