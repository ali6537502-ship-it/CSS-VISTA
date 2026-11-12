import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ArrowUpRight, BookOpen, CalendarDays, CalendarRange, Plus, RotateCcw, Settings2, Target, X } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useAccountSnapshot } from '@/pages/account/shared'
import PlannerDashboard from '@/components/PlannerDashboard'
import ScheduledSyllabusBoard from '@/components/ScheduledSyllabusBoard'
import { AuthenticatedAccountAd } from '@/components/Ads'
import { plannerHref, plannerView, plannerViews, type PlannerView } from './model'
import './planner.css'
const Guide = lazy(() => import('./VistaStudyGuide'))
const Revision = lazy(() => import('./PlannerRevision'))
const Goals = lazy(() => import('./PlannerGoals'))
const ResetPanel = lazy(() => import('@/features/preparation-reset/ResetPreparationPanel'))

const Suggestions = lazy(() => import('./PlannerSuggestions'))
const Attempts = lazy(() => import('@/features/preparation/Continuation'))
const labels = { today: 'Today', week: 'My week', syllabus: 'Preparation guide', revision: 'Revise', goals: 'Goals', pms: 'PMS Vista', settings: 'Set up' }
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
  function createSession() {
    const next = new URLSearchParams(params)
    next.set('view', 'syllabus')
    setParams(next, { preventScrollReset: true })
  }
  return <main className="planner-workspace pl-root" data-planner-view={view}>
    <header className="pl-page-header"><div><p className="pl-kicker">YOUR PREPARATION, PURPOSEFULLY PLANNED</p><h1 ref={heading} tabIndex={-1}>{exam === 'pms-punjab' ? 'PMS Vista' : 'CSS Vista'}</h1><p>{exam === 'pms-punjab' ? 'Your complete PMS syllabus, personalized daily study plan, revision and chapter notes commands.' : 'Your complete CSS preparation space: plan one to three subjects a day, follow your syllabus, create analytical notes with copyable commands and track revision and progress.'}</p></div><button ref={addButton} type="button" className="pl-primary" onClick={createSession}><Plus size={18}/>Plan syllabus chapters</button></header>
    <div className="pl-exam-switch" role="group" aria-label="Preparation examination">{(['css', 'pms-punjab'] as const).map(id => <button key={id} type="button" aria-pressed={exam === id} onClick={() => { const next = new URLSearchParams(params); next.set('exam', id); if (next.get('view') === 'pms') next.set('view', 'syllabus'); setParams(next, { preventScrollReset: true }) }}><BookOpen size={17}/>{id === 'css' ? 'CSS preparation' : 'PMS Punjab'}</button>)}</div>
    <nav className="pl-view-nav" aria-label="Study planner sections">{plannerViews.filter(id => id !== 'pms').map(id => {
      const Icon = icons[id]
      return <Link key={id} to={linkTo(id)} preventScrollReset aria-current={view === id || view === 'pms' && id === 'syllabus' ? 'page' : undefined}><Icon size={18}/><span>{labels[id]}</span>{id === 'revision' && snapshot.revision.due > 0 && <small>{snapshot.revision.due}</small>}</Link>
    })}</nav>
    {syncStatus === 'syncing' && <p className="pl-note" role="status">Your saved account plan is syncing. Device records stay available while it loads.</p>}
    {syncError && <p className="pl-warning" role="status">Account sync needs attention. Your device records are retained. <Link to="/account/settings">Open sync settings</Link>.</p>}
    <section ref={composer} id="pl-task-composer" hidden={!toolsOpen} className="pl-composer-panel" aria-label="Add tasks or import a schedule"><div className="pl-composer-close"><button type="button" className="pl-icon-button" aria-label="Close task composer" onClick={() => { setToolsOpen(false); addButton.current?.focus() }}><X size={18}/></button></div><ScheduledSyllabusBoard toolsOnly/></section>
    <div className="pl-panels"><Suspense fallback={<div className="pl-panel-loading" role="status"><span/><span/><span/>Loading planner tools…</div>}>
      {(visited.has('today') || view === 'today') && <section id="pl-today-agenda" hidden={view !== 'today'} aria-label="Today planner"><PlannerDashboard key={exam} exam={exam} view="today" onCreate={createSession}/>{exam === 'css' && <Suggestions/>}<div className="vg-actions mt-4"><button type="button" className="pl-secondary" onClick={openTools}><Plus size={15}/>Add a manual task</button></div></section>}
      {(visited.has('week') || view === 'week') && <section hidden={view !== 'week'} aria-label="Weekly planner"><PlannerDashboard key={exam} exam={exam} view="week" onCreate={createSession}/></section>}
      {(visited.has('syllabus') || view === 'syllabus') && <section hidden={view !== 'syllabus'} aria-label="Syllabus planner"><Guide exam={exam}/></section>}
      {(visited.has('revision') || view === 'revision') && <section hidden={view !== 'revision'} aria-label="Revision planner">{exam === 'pms-punjab' ? <Guide exam={exam}/> : <Revision/>}</section>}
      {(visited.has('goals') || view === 'goals') && <section hidden={view !== 'goals'} aria-label="Goals planner"><Goals/></section>}
      {(visited.has('pms') || view === 'pms') && <section hidden={view !== 'pms'} aria-label="PMS Punjab planner"><Guide exam="pms-punjab"/></section>}
      {(visited.has('settings') || view === 'settings') && <section hidden={view !== 'settings'} aria-label="Planner settings"><Guide exam={exam} mode="settings"/><ResetPanel/></section>}
    </Suspense></div>
    {user && exam === 'css' && <div className="pl-connected-attempts"><Suspense fallback={<p role="status" className="pl-muted">Loading account-linked attempts…</p>}><Attempts/></Suspense></div>}
    <footer className="pl-footer"><p>Your timetable, optional daily suggestions and preparation attempts track different parts of your work. Completing a personal task is a self-reported check.</p><Link to="/account/dashboard">Back to overview <ArrowUpRight size={14}/></Link></footer>
    {pathname === '/account/tasks' && <div className="mt-12"><AuthenticatedAccountAd/></div>}
  </main>
}
