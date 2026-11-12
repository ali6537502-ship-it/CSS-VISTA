import { Fragment, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Home, CalendarDays, BookOpen, PenLine, ChartNoAxesCombined, Library, Settings, PanelLeftClose, PanelLeftOpen, MoreHorizontal, Search, ArrowUpRight, Menu, Dumbbell, GraduationCap, ChevronDown } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { sections, activeSection } from './registry'
import WorkspaceAvatar from './WorkspaceAvatar'
import WorkspaceMobileDrawer from './WorkspaceMobileDrawer'
import './workspace.css'
const ResetPanel = lazy(() => import('@/features/preparation-reset/ResetPreparationPanel'))
const icons = [Home, CalendarDays, BookOpen, PenLine, ChartNoAxesCombined, Library, Settings]
export default function StudentWorkspace({ children }: { children: ReactNode }) {
  const { user, syncStatus, syncError, syncNow, signOut, preparationResetNotice, dismissPreparationResetNotice } = useAccount()
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  async function logout() { setBusy(true); try { const result = await signOut(); setError(result.error || '') } catch { setError('Sign out failed. Please try again.') } finally { setBusy(false) } }
  const { pathname, search } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [mentorOpen,setMentorOpen]=useState(true)
  const closeMobile=useCallback(()=>setMobileOpen(false),[])
  useEffect(()=>{setMobileOpen(false)},[pathname,search])
  const active = activeSection(pathname)
  const mentorExam = pathname.startsWith('/account/tasks') && (new URLSearchParams(search).get('exam') === 'pms-punjab' || new URLSearchParams(search).get('view') === 'pms') ? 'pms-punjab' : 'css'
  const mentorActive = /^\/account\/(tasks|plan)/.test(pathname)
  return <div data-section={active} className={`student-workspace ${collapsed ? 'ws-collapsed' : ''}`}>
    <a className="ws-skip" href="#workspace-content">Skip to preparation</a>
    <aside className="ws-sidebar">
      <Link to="/account/dashboard" className="ws-brand"><img src="/images/logo.webp" alt="CSS Vista — Sadia Zahoor and Ali Hassan Sargana" /></Link>
      <p className="ws-label">YOUR PREPARATION WORKSPACE</p>
      <nav aria-label="Student workspace">{sections.map((s,i) => { const Icon = icons[i]; return <Fragment key={s.id}><Link to={s.to} aria-label={s.title} aria-current={active === s.id && !(s.id === 'plan' && mentorActive) ? 'page' : undefined} title={s.title}><Icon size={20} aria-hidden="true" /><span>{s.title}</span></Link>{s.id === 'overview' && <div className="ws-mentor-group" data-open={mentorOpen}>
        <button type="button" className="ws-mentor-toggle" aria-expanded={mentorOpen} aria-controls="ws-vista-mentor-links" onClick={() => { if(collapsed){setCollapsed(false);setMentorOpen(true)} else setMentorOpen(v=>!v) }} title="Vista Mentor"><GraduationCap size={20} aria-hidden="true"/><span>Vista Mentor</span><ChevronDown className="ws-mentor-chevron" size={16} aria-hidden="true"/></button>
        {mentorOpen && <div id="ws-vista-mentor-links" className="ws-mentor-links" role="group" aria-label="Vista Mentor preparation options">
          <Link to="/account/tasks?exam=css&view=syllabus" aria-label="CSS Vista" aria-current={mentorActive && mentorExam === 'css' ? 'page' : undefined}><span>CSS Vista</span></Link>
          <Link to="/account/tasks?exam=pms-punjab&view=syllabus" aria-label="PMS Vista" aria-current={mentorActive && mentorExam === 'pms-punjab' ? 'page' : undefined}><span>PMS Vista</span></Link>
        </div>}
      </div>}</Fragment> })}</nav>
      <div className="ws-sidebar-feature"><Link to="/account/fitness-coach" title="My Fitness Coach" aria-label="My Fitness Coach"><Dumbbell size={20} aria-hidden="true"/><span>My Fitness Coach</span></Link><Link to="/account/directory" title="Find all features" aria-label="Find all features"><Search size={20} aria-hidden="true"/><span>Find All Features</span></Link></div>
      <div className="ws-sidebar-end"><Link to="/">Visit CSS Vista website</Link><button onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>Collapse sidebar</span></button></div>
    </aside>
    <div className="ws-main"><header className="ws-header"><button type="button" className="ws-mobile-menu-button" aria-label="Open account menu" aria-expanded={mobileOpen} aria-controls="ws-mobile-account-drawer" onClick={()=>setMobileOpen(true)}><Menu size={22} aria-hidden="true"/><span>Menu</span></button><Link to="/account/dashboard" className="ws-mobile-brand"><img src="/images/logo.webp" alt="CSS Vista" /></Link><Link className="ws-top-search" aria-label="Search features and resources" to="/account/directory"><Search size={17}/><span>Find a subject, tool or resource</span><ArrowUpRight size={15}/></Link><Link to="/account/settings" className="ws-account" aria-label="Open profile and account settings"><WorkspaceAvatar user={user} /><span>{user?.display_name || 'My account'}</span><small>{syncError ? 'Sync needs attention' : syncStatus === 'synced' ? 'Last sync completed' : syncStatus === 'syncing' ? 'Syncing progress…' : 'Account & sync'}</small></Link></header>
      <div id="workspace-content" tabIndex={-1} className="ws-content">{pathname === '/account/settings' && <section className="ws-panel mb-6"><h1 className="text-3xl font-bold">Account & Settings</h1><p className="ws-muted my-3">Manage your profile, security and account synchronization.</p><div className="flex flex-wrap gap-3"><button className="ws-action" disabled={syncStatus === 'syncing'} onClick={() => void syncNow()}>Sync progress now</button><button className="min-h-11 px-4 border rounded-lg" disabled={busy} onClick={() => void logout()}>{busy ? 'Signing out…' : 'Sign out'}</button><Link className="min-h-11 px-4 inline-flex items-center underline" to="/account?settings=1">Account overview & sync details</Link></div>{error && <p role="alert">{error}</p>}</section>}{preparationResetNotice && <div className="ws-panel mb-5" role="status"><p>{preparationResetNotice}</p><button className="min-h-11 underline" onClick={dismissPreparationResetNotice}>Dismiss</button></div>}{children}{pathname === '/account/settings' && <Suspense fallback={<p role="status">Loading reset options…</p>}><ResetPanel/></Suspense>}</div>
    </div>
    <nav className="ws-bottom" aria-label="Student mobile navigation">{[sections[0], sections[1], sections[3], sections[5]].map((entry,i) => { const Icon = [Home, CalendarDays, PenLine, Library][i]; return <Link key={entry.id} to={entry.to} aria-current={entry.id === active ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{['Home','My Plan','Practice','Library'][i]}</span></Link> })}<button type="button" onClick={()=>setMobileOpen(true)} aria-label="Open all account features" aria-expanded={mobileOpen} aria-controls="ws-mobile-account-drawer"><MoreHorizontal size={20} aria-hidden="true"/><span>More</span></button></nav>
    {mobileOpen && <div id="ws-mobile-account-drawer"><WorkspaceMobileDrawer onClose={closeMobile} onLogout={()=>void logout()} busy={busy}/></div>}
  </div>
}
