import ContinueStudying from '@/features/workspace/ContinueStudying'
import { Link } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { AccountPage, TaskItem, useAccountSnapshot } from './account/shared'
import { QuickActions } from '@/features/workspace/FeatureFinder'
import { SubjectOverview } from './account/Subjects'
import { useWorkspacePreferences } from '@/features/workspace/preferences'
import { localTaskDateKey } from '@/lib/myTasks'
import { targetDays } from '@/features/workspace/model'
export default function AccountHome() {
  const { user, syncStatus, syncError } = useAccount()
  const { snapshot, refresh } = useAccountSnapshot()
  const { preferences, update, error } = useWorkspacePreferences()
  const hour = Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:'Asia/Karachi'}).format(new Date()))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const days = targetDays(snapshot.state.studyPlanner?.examDate,localTaskDateKey())
  const steps = [
    {title:'Select your subjects',to:'/account/subjects',done:(snapshot.state.studyPlanner?.selectedOptionals.length ?? 0) > 0},
    {title:'Create your study schedule',to:'/account/plan',done:snapshot.activeTasks.length > 0},
    {title:'Study syllabus topics',to:'/fpsc-syllabus',done:snapshot.syllabusCompleted > 0},
    {title:'Practice and attempt mocks',to:'/account/practice',done:snapshot.state.quizResults.length > 0},
    {title:'Review and revise',to:'/account/progress',done:snapshot.revision.mature > 0},
  ]
  return <AccountPage title={`${greeting}${user?.display_name ? `, ${user.display_name.split(/\s+/)[0]}` : ''}`} intro="A clear plan for today. Steady progress towards your examination.">
    {days !== null && <p className="ws-muted mb-5">Your chosen target: {snapshot.state.studyPlanner?.examDate} · {days < 0 ? 'Target date has passed — review your schedule' : days === 0 ? 'Today' : `${days} days remaining`}</p>}
    {syncError && <p role="alert" className="ws-panel mb-5">{syncError} <Link to="/account/settings" className="underline">Review account sync</Link></p>}
    <div className="ws-grid"><div className="ws-stack">
      <ContinueStudying />
      <section className="ws-panel"><div className="ws-section-head"><h2>Today’s Study Plan</h2><Link to="/account/tasks">View all</Link></div><p className="ws-muted mb-4">{snapshot.todayDone.length} of {snapshot.todayTasks.length} scheduled tasks complete</p><div className="space-y-3">{snapshot.todayTasks.slice(0,4).map(task => <TaskItem key={task.id} task={task} refresh={refresh} />)}</div>{!snapshot.todayTasks.length && <p className="ws-muted">{syncStatus === 'syncing' ? 'Loading saved schedule…' : <>Nothing scheduled today. <Link className="underline" to="/account/plan">Build your schedule</Link>.</>}</p>}{snapshot.due.overdue.length > 0 && <Link className="inline-flex min-h-11 items-center underline text-sm mt-3" to="/account/tasks">Review {snapshot.due.overdue.length} overdue tasks</Link>}</section>

    </div><div className="ws-stack"><QuickActions /><section className="ws-panel"><div className="ws-section-head"><h2>Progress snapshot</h2><Link to="/account/progress">Details</Link></div><dl className="grid gap-4 text-sm"><div><dt>Manually completed syllabus items</dt><dd className="font-bold text-2xl">{snapshot.syllabusCompleted}</dd></div><div><dt>Recorded MCQ accuracy</dt><dd className="font-bold text-2xl">{snapshot.stats.attempted ? `${snapshot.stats.accuracy}%` : 'No attempts yet'}</dd><dd className="ws-muted">{snapshot.stats.attempted} questions attempted</dd></div><div><dt>Revision items due</dt><dd className="font-bold text-2xl">{snapshot.revision.due}</dd></div></dl></section>
      <section className="ws-panel"><h2 className="font-bold text-lg">Preparation journey</h2><ol className="mt-3">{steps.map((step,i) => <li key={step.to} className="border-b py-3 text-sm"><Link className="min-h-11 flex items-center gap-3" to={step.to}><span className="ws-badge">{i+1}</span><span>{step.title}<small className="block text-slate-600">{step.done ? 'Activity recorded' : 'Explore this step'}</small></span></Link></li>)}</ol><button className="min-h-11 text-sm underline mt-2" onClick={() => update({guidanceDismissed:!preferences.guidanceDismissed})}>{preferences.guidanceDismissed ? 'Reopen getting started' : 'Dismiss getting started'}</button>{!preferences.guidanceDismissed && <p className="ws-muted">Start with your subjects, then set your study time. Each step opens the existing tool; you can follow these in your own order.</p>}{error && <p role="alert">{error}</p>}</section><p className="ws-muted text-xs">{syncStatus === 'syncing' ? 'Synchronizing your account…' : 'Your device keeps study records locally. Check sync status in Account & Settings.'}</p></div></div>
      <section className="ws-panel mt-6"><div className="ws-section-head"><h2>My Subjects</h2><Link to="/account/subjects">Manage subjects</Link></div><SubjectOverview compact /></section>
  </AccountPage>
}
