import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ArrowUpRight, BookOpen, CalendarDays, CalendarRange, Check, ChevronRight, Plus, RotateCcw, Settings2, Target, X } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useAccountSnapshot } from '@/pages/account/shared'
import PlannerDashboard from '@/components/PlannerDashboard'
import ScheduledSyllabusBoard from '@/components/ScheduledSyllabusBoard'
import { AuthenticatedAccountAd } from '@/components/Ads'
import { taskExam } from './pmsModel'
import { plannerHref, plannerView, plannerViews, type PlannerView } from './model'
import './planner.css'
const Syllabus = lazy(() => import('@/components/FpscSyllabusPlanner'))
const Revision = lazy(() => import('./PlannerRevision'))
const Goals = lazy(() => import('./PlannerGoals'))
const ResetPanel = lazy(() => import('@/features/preparation-reset/ResetPreparationPanel'))
const Settings = lazy(() => import('./PlannerSettings'))
const Suggestions = lazy(() => import('./PlannerSuggestions'))
const Attempts = lazy(() => import('@/features/preparation/Continuation'))
const Pms = lazy(() => import('./PlannerPms'))
const labels = { today: 'Today', week: 'My week', syllabus: 'Choose topics', revision: 'Revise', goals: 'Goals', pms: 'PMS Punjab', settings: 'Set up' }
const icons = { today: CalendarDays, week: CalendarRange, syllabus: BookOpen, revision: RotateCcw, goals: Target, pms: BookOpen, settings: Settings2 }
export default function PlannerWorkspace() {
  const { user, syncStatus, syncError } = useAccount()
  const { snapshot } = useAccountSnapshot()
  const { pathname, hash } = useLocation()
  const [params, setParams] = useSearchParams()
  const exam = params.get('exam') === 'pms-punjab' || params.get('view') === 'pms' ? 'pms-punjab' : 'css'
  const view = plannerView(pathname, params, hash)
  const [visited, setVisited] = useState<Set<PlannerView>>(() => new Set([view]))
  const [toolsOpen, setToolsOpen] = useState(false)
  const planConfigured = Boolean(snapshot.state.studyPlanner?.configuredAt)
  const scheduledCount = snapshot.activeTasks.filter(task => taskExam(task) === 'css').length
  const finishedCount = snapshot.activeTasks.filter(task => taskExam(task) === 'css' && task.status === 'completed').length
  const guideStep = !planConfigured ? 0 : scheduledCount === 0 ? 1 : finishedCount === 0 ? 2 : 3
  const completedSteps = Number(planConfigured) + Number(scheduledCount > 0) + Number(finishedCount > 0)
  const heading = useRef<HTMLHeadingElement>(null)
  const previousView = useRef(view)
  const composer = useRef<HTMLElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    setVisited(current => new Set([...current, view]))
    if (previousView.current !== view) heading.current?.focus({ preventScroll: true })
    previousView.current = view
  }, [view])
  function openTools() {
    setToolsOpen(true)
    requestAnimationFrame(() => {
      composer.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
      Array.from(composer.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea') || []).find(input => input.offsetParent !== null)?.focus({ preventScroll: true })
    })
  }
  function linkTo(nextView: PlannerView) {
    return plannerHref(pathname, params, nextView, hash)
  }
  return <main className="planner-workspace pl-root" data-planner-view={view}>
    <header className="pl-page-header"><div><p className="pl-kicker">YOUR PREPARATION, PURPOSEFULLY PLANNED</p><h1 ref={heading} tabIndex={-1}>Study Planner</h1><p>A clear place for today’s work, the week ahead and everything you’re building towards.</p></div><button ref={addButton} type="button" className="pl-primary" aria-expanded={toolsOpen} aria-controls="pl-task-composer" onClick={() => { if (exam === 'pms-punjab') { const next = new URLSearchParams(params); next.set('view', 'syllabus'); setParams(next, { preventScrollReset: true }) } else openTools() }}><Plus size={18}/>{exam === 'pms-punjab' ? 'Plan PMS topics' : 'Add a study session'}</button></header>
    <div className="pl-exam-switch" role="group" aria-label="Preparation examination">{(['css', 'pms-punjab'] as const).map(id => <button key={id} type="button" aria-pressed={exam === id} onClick={() => { const next = new URLSearchParams(params); next.set('exam', id); if (next.get('view') === 'pms') next.set('view', 'syllabus'); setParams(next, { preventScrollReset: true }) }}><BookOpen size={17}/>{id === 'css' ? 'CSS preparation' : 'PMS Punjab'}</button>)}</div>
    <nav className="pl-view-nav" aria-label="Study planner sections">{plannerViews.filter(id => id !== 'pms' && (exam === 'css' || !['revision', 'goals'].includes(id))).map(id => {
      const Icon = icons[id]
      return <Link key={id} to={linkTo(id)} preventScrollReset aria-current={view === id || view === 'pms' && id === 'syllabus' ? 'page' : undefined}><Icon size={18}/><span>{labels[id]}</span>{id === 'revision' && snapshot.revision.due > 0 && <small>{snapshot.revision.due}</small>}</Link>
    })}</nav>
    {syncStatus === 'syncing' && <p className="pl-note" role="status">Your saved account plan is syncing. Device records stay available while it loads.</p>}
    {syncError && <p className="pl-warning" role="status">Account sync needs attention. Your device records are retained. <Link to="/account/settings">Open sync settings</Link>.</p>}
    <section ref={composer} id="pl-task-composer" hidden={!toolsOpen} className="pl-composer-panel" aria-label="Add tasks or import a schedule"><div className="pl-composer-close"><button type="button" className="pl-icon-button" aria-label="Close task composer" onClick={() => { setToolsOpen(false); addButton.current?.focus() }}><X size={18}/></button></div><ScheduledSyllabusBoard toolsOnly/></section>
    {exam === 'css' && view === 'today' && <section className="pl-start-guide" aria-label="How to use the study planner">
      <div className="pl-start-guide-head"><div><p className="pl-kicker">START HERE</p><h2>Build your plan in three steps</h2><p className="pl-muted">Each step opens the tool you need. Follow them in order, or open any step to update your plan.</p></div><span className="pl-guide-status">{completedSteps} of 3 steps completed</span></div>
      <div className="pl-guide-steps">
        <Link className={`pl-guide-step ${guideStep === 0 ? 'is-current' : ''}`} to={linkTo('settings')}>
          <span className="pl-guide-number">{planConfigured ? <Check size={17}/> : '1'}</span>
          <span className="pl-guide-copy"><strong>Set your target and subjects</strong><small>{planConfigured ? 'Your study settings are saved. Change them any time.' : 'Choose your target date, available study hours and optional subjects.'}</small><b>{planConfigured ? 'Edit settings' : 'Set up my planner'}</b></span><ChevronRight size={18}/>
        </Link>
        <Link className={`pl-guide-step ${guideStep === 1 ? 'is-current' : ''}`} to={linkTo('syllabus')}>
          <span className="pl-guide-number">{scheduledCount ? <Check size={17}/> : '2'}</span>
          <span className="pl-guide-copy"><strong>Pick topics to study</strong><small>{scheduledCount ? `${scheduledCount} sessions are on your calendar.` : 'Browse the subject syllabus and schedule the topics you select.'}</small><b>Choose syllabus topics</b></span><ChevronRight size={18}/>
        </Link>
        <button type="button" className={`pl-guide-step ${guideStep === 2 ? 'is-current' : ''}`} onClick={() => document.getElementById('pl-today-agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span className="pl-guide-number">{finishedCount ? <Check size={17}/> : '3'}</span>
          <span className="pl-guide-copy"><strong>Follow your daily plan</strong><small>{finishedCount ? `${finishedCount} task${finishedCount === 1 ? '' : 's'} completed.` : 'Open each task, update it, or mark it complete after studying.'}</small><b>See today's work</b></span><ChevronRight size={18}/>
        </button>
      </div>
      <div className="pl-guide-bottom"><span>Prefer to enter a task yourself?</span><button type="button" className="pl-secondary" onClick={openTools}><Plus size={15}/>Add manually or import a schedule</button></div>
    </section>}
    <div className="pl-panels"><Suspense fallback={<div className="pl-panel-loading" role="status"><span/><span/><span/>Loading planner tools…</div>}>
      {(visited.has('today') || view === 'today') && <section id="pl-today-agenda" hidden={view !== 'today'} aria-label="Today planner"><PlannerDashboard key={exam} exam={exam} view="today" onCreate={() => { if (exam === 'css') openTools(); else { const next = new URLSearchParams(params); next.set('view', 'syllabus'); setParams(next) } }}/>{exam === 'css' && <Suggestions/>}</section>}
      {(visited.has('week') || view === 'week') && <section hidden={view !== 'week'} aria-label="Weekly planner"><PlannerDashboard key={exam} exam={exam} view="week" onCreate={openTools}/></section>}
      {(visited.has('syllabus') || view === 'syllabus') && <section hidden={view !== 'syllabus'} aria-label="Syllabus planner">{exam === 'pms-punjab' ? <Pms/> : <Syllabus embedded showScheduleBoard={false}/>}</section>}
      {(visited.has('revision') || view === 'revision') && <section hidden={view !== 'revision'} aria-label="Revision planner"><Revision/></section>}
      {(visited.has('goals') || view === 'goals') && <section hidden={view !== 'goals'} aria-label="Goals planner"><Goals/></section>}
      {(visited.has('pms') || view === 'pms') && <section hidden={view !== 'pms'} aria-label="PMS Punjab planner"><Pms/></section>}
      {(visited.has('settings') || view === 'settings') && <section hidden={view !== 'settings'} aria-label="Planner settings">{exam === 'pms-punjab' ? <Pms mode="settings"/> : <Settings/>}<ResetPanel/></section>}
    </Suspense></div>
    {user && exam === 'css' && <div className="pl-connected-attempts"><Suspense fallback={<p role="status" className="pl-muted">Loading account-linked attempts…</p>}><Attempts/></Suspense></div>}
    <footer className="pl-footer"><p>Your timetable, optional daily suggestions and preparation attempts track different parts of your work. Completing a personal task is a self-reported check.</p><Link to="/account/dashboard">Back to overview <ArrowUpRight size={14}/></Link></footer>
    {pathname === '/account/tasks' && <div className="mt-12"><AuthenticatedAccountAd/></div>}
  </main>
}
