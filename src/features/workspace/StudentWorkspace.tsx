import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Home, CalendarDays, BookOpen, PenLine, ChartNoAxesCombined, Library, Settings, PanelLeftClose, PanelLeftOpen, MoreHorizontal, Search, ArrowUpRight } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { sections, activeSection } from './registry'
import WorkspaceAvatar from './WorkspaceAvatar'
import './workspace.css'
const ResetPanel = lazy(() => import('@/features/preparation-reset/ResetPreparationPanel'))
const icons = [Home, CalendarDays, BookOpen, PenLine, ChartNoAxesCombined, Library, Settings]
export default function StudentWorkspace({ children }: { children: ReactNode }) {
  const { user, syncStatus, syncError, syncNow, signOut, preparationResetNotice, dismissPreparationResetNotice } = useAccount()
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  async function logout() { setBusy(true); try { const result = await signOut(); setError(result.error || '') } catch { setError('Sign out failed. Please try again.') } finally { setBusy(false) } }
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const active = activeSection(pathname)
  return <div data-section={active} className={`student-workspace ${collapsed ? 'ws-collapsed' : ''}`}>
    <a className="ws-skip" href="#workspace-content">Skip to preparation</a>
    <aside className="ws-sidebar">
      <Link to="/account/dashboard" className="ws-brand"><img src="/images/logo.webp" alt="CSS Vista — Sadia Zahoor and Ali Hassan Sargana" /></Link>
      <p className="ws-label">YOUR PREPARATION WORKSPACE</p>
      <nav aria-label="Student workspace">{sections.map((s,i) => { const Icon = icons[i]; return <Link key={s.id} to={s.to} aria-label={s.title} aria-current={active === s.id ? 'page' : undefined} title={s.title}><Icon size={20} aria-hidden="true" /><span>{s.title}</span></Link> })}</nav>
      <div className="ws-sidebar-end"><Link to="/">Visit CSS Vista website</Link><button onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>Collapse sidebar</span></button></div>
    </aside>
    <div className="ws-main"><header className="ws-header"><Link to="/account/dashboard" className="ws-mobile-brand"><img src="/images/logo.webp" alt="CSS Vista" /></Link><Link className="ws-top-search" aria-label="Search features and resources" to="/account/directory"><Search size={17}/><span>Find a subject, tool or resource</span><ArrowUpRight size={15}/></Link><Link to="/account/settings" className="ws-account" aria-label="Open profile and account settings"><WorkspaceAvatar user={user} /><span>{user?.display_name || 'My account'}</span><small>{syncError ? 'Sync needs attention' : syncStatus === 'synced' ? 'Last sync completed' : syncStatus === 'syncing' ? 'Syncing progress…' : 'Account & sync'}</small></Link></header>
      <div id="workspace-content" tabIndex={-1} className="ws-content">{pathname === '/account/settings' && <section className="ws-panel mb-6"><h1 className="text-3xl font-bold">Account & Settings</h1><p className="ws-muted my-3">Manage your profile, security and account synchronization.</p><div className="flex flex-wrap gap-3"><button className="ws-action" disabled={syncStatus === 'syncing'} onClick={() => void syncNow()}>Sync progress now</button><button className="min-h-11 px-4 border rounded-lg" disabled={busy} onClick={() => void logout()}>{busy ? 'Signing out…' : 'Sign out'}</button><Link className="min-h-11 px-4 inline-flex items-center underline" to="/account?settings=1">Account overview & sync details</Link></div>{error && <p role="alert">{error}</p>}</section>}{preparationResetNotice && <div className="ws-panel mb-5" role="status"><p>{preparationResetNotice}</p><button className="min-h-11 underline" onClick={dismissPreparationResetNotice}>Dismiss</button></div>}{children}{pathname === '/account/settings' && <Suspense fallback={<p role="status">Loading reset options…</p>}><ResetPanel/></Suspense>}</div>
    </div>
    <nav className="ws-bottom" aria-label="Student mobile navigation">{[sections[0], sections[1], sections[3], sections[5], {id:'more',title:'More',to:'/account/more'}].map((s,i) => { const Icon = [Home, CalendarDays, PenLine, Library, MoreHorizontal][i]; return <Link key={s.id} to={s.to} aria-current={(s.id === 'more' ? ['subjects','performance','settings'].includes(active) : s.id === active) ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{['Home','My Plan','Practice','Library','More'][i]}</span></Link> })}</nav>
  </div>
}
