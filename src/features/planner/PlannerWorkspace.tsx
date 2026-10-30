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
const Syllabus = lazy(() => import('@/components/FpscSyllabusPlanner'))
const Revision = lazy(() => import('./PlannerRevision'))
const Goals = lazy(() => import('./PlannerGoals'))
const Settings = lazy(() => import('./PlannerSettings'))
const Suggestions = lazy(() => import('./PlannerSuggestions'))
const Attempts = lazy(() => import('@/features/preparation/Continuation'))
const labels = { today: 'Today', week: 'Week', syllabus: 'Syllabus', revision: 'Revision', goals: 'Goals', settings: 'Settings' }
const icons = { today: CalendarDays, week: CalendarRange, syllabus: BookOpen, revision: RotateCcw, goals: Target, settings: Settings2 }
export default function PlannerWorkspace() {
  const { user, syncStatus, syncError } = useAccount()
  const { snapshot } = useAccountSnapshot()
  const { pathname, hash } = useLocation()
  const [params] = useSearchParams()
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
  return <main className="planner-workspace pl-root" data-planner-view={view}>
    <header className="pl-page-header"><div><p className="pl-kicker">YOUR PREPARATION, PURPOSEFULLY PLANNED</p><h1 ref={heading} tabIndex={-1}>My Study Plan</h1><p>A clear place for today’s work, the week ahead and everything you’re building towards.</p></div><button ref={addButton} type="button" className="pl-primary" aria-expanded={toolsOpen} aria-controls="pl-task-composer" onClick={openTools}><Plus size={18}/>Add or import tasks</button></header>
    <nav className="pl-view-nav" aria-label="Study planner sections">{plannerViews.map(id => {
      const Icon = icons[id]
      return <Link key={id} to={linkTo(id)} preventScrollReset aria-current={view === id ? 'page' : undefined}><Icon size={18}/><span>{labels[id]}</span>{id === 'revision' && snapshot.revision.due > 0 && <small>{snapshot.revision.due}</small>}</Link>
    })}</nav>
    {syncStatus === 'syncing' && <p className="pl-note" role="status">Your saved account plan is syncing. Device records stay available while it loads.</p>}
    {syncError && <p className="pl-warning" role="status">Account sync needs attention. Your device records are retained. <Link to="/account/settings">Open sync settings</Link>.</p>}
    <section ref={composer} id="pl-task-composer" hidden={!toolsOpen} className="pl-composer-panel"><div className="pl-composer-close"><button type="button" className="pl-icon-button" aria-label="Close task composer" onClick={() => { setToolsOpen(false); addButton.current?.focus() }}><X size={18}/></button></div><ScheduledSyllabusBoard toolsOnly/></section>
    <div className="pl-panels"><Suspense fallback={<div className="pl-panel-loading" role="status"><span/><span/><span/>Loading planner tools…</div>}>
      {(visited.has('today') || view === 'today') && <section hidden={view !== 'today'} aria-label="Today planner"><PlannerDashboard view="today" onCreate={openTools}/><Suggestions/></section>}
      {(visited.has('week') || view === 'week') && <section hidden={view !== 'week'} aria-label="Weekly planner"><PlannerDashboard view="week" onCreate={openTools}/></section>}
      {(visited.has('syllabus') || view === 'syllabus') && <section hidden={view !== 'syllabus'} aria-label="Syllabus planner"><Syllabus embedded showScheduleBoard={false}/></section>}
      {(visited.has('revision') || view === 'revision') && <section hidden={view !== 'revision'} aria-label="Revision planner"><Revision/></section>}
      {(visited.has('goals') || view === 'goals') && <section hidden={view !== 'goals'} aria-label="Goals planner"><Goals/></section>}
      {(visited.has('settings') || view === 'settings') && <section hidden={view !== 'settings'} aria-label="Planner settings"><Settings/></section>}
    </Suspense></div>
    {user && <div className="pl-connected-attempts"><Suspense fallback={<p role="status" className="pl-muted">Loading account-linked attempts…</p>}><Attempts/></Suspense></div>}
    <footer className="pl-footer"><p>Your timetable, optional daily suggestions and preparation attempts track different parts of your work. Completing a personal task is a self-reported check.</p><Link to="/account/dashboard">Back to overview <ArrowUpRight size={14}/></Link></footer>
    {pathname === '/account/tasks' && <div className="mt-12"><AuthenticatedAccountAd/></div>}
  </main>
}
