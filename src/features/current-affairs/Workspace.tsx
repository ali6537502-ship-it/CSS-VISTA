import { useState, type FormEvent } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, BookOpen, LogOut, Search, UserRound } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { archiveSchema, briefingRoot, dateFilters, displayDate, factText, feedSchema, latestRange, pakistanDate, shiftDate, type Fact, type StoryCard } from './model'
import { useBriefing } from './useBriefing'
import { CategoryGlance, CopyButton, EditionMeta, Empty, LoadError, Loading, Pager, Publication, StoryCardView } from './ui'
import Reader from './Reader'
import Settings from './Settings'
import './current-affairs.css'

const links = [
  ['/account/dashboard', 'Back to My CSS Vista'], [briefingRoot, 'Current Affairs'],
  ['/account/factbook', 'Daily Factbook'], [briefingRoot + '/archive', 'Archive'],
  ['/account/saved', 'Saved Items'], ['/account/search', 'Search'], ['/account/settings', 'Profile & Settings'],
]
function AccountNavigation() {
  return <nav aria-label="Current Affairs navigation">{links.map(([to, label]) => <NavLink key={to} end to={to} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>{label}</NavLink>)}</nav>
}
function SignedInWorkspace() {
  const { signOut, user } = useAccount()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true); setError('')
    try {
      const result = await signOut()
      if (result.error) setError(result.error)
      else navigate('/account', { replace: true })
    } catch { setError('Sign out could not be completed. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="ca-workspace">
    <aside className="ca-sidebar">
      <Link to="/account/dashboard" className="ca-brand"><BookOpen size={21} /><span>My CSS Vista<small>Your preparation space</small></span></Link>
      <Link to="/account/settings" className="ca-sidebar-profile" aria-label="Open your profile settings">
        {user?.photo_complete ? <img src="/api/student/photo-view.php" alt="" /> : <UserRound size={20} aria-hidden="true" />}
        <span><strong>{user?.display_name || 'My profile'}</strong><small>Profile & settings</small></span>
      </Link>
      <AccountNavigation />
      <div className="ca-sidebar-footer">
        <button onClick={() => void logout()} disabled={busy}><LogOut size={16} /> {busy ? 'Signing out…' : 'Log out'}</button>
      </div>
    </aside>
    <div className="ca-main">
      <details className="ca-mobile-nav"><summary>Current Affairs · Menu</summary><AccountNavigation /><div className="ca-mobile-extras"><Link to="/account/settings" className="ca-mobile-profile">{user?.photo_complete ? <img src="/api/student/photo-view.php" alt="" /> : <UserRound size={18} aria-hidden="true" />}<span>{user?.display_name || 'My profile'}</span></Link></div><button className="ca-button ca-button-light" disabled={busy} onClick={() => void logout()}>Log out</button></details>
      {error && <p className="ca-error" role="alert">{error}</p>}
      <Routes>
        <Route path="current-affairs" element={<Feed mode="briefing" />} />
        <Route path="current-affairs/archive" element={<Archive />} />
        <Route path="current-affairs/:storyId" element={<Reader />} />
        <Route path="factbook" element={<Feed mode="facts" />} />
        <Route path="saved" element={<Feed mode="saved" />} />
        <Route path="search" element={<Feed mode="search" />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Empty title="This account page could not be found" action={<Link className="ca-button" to="/account/dashboard">Open My CSS Vista</Link>} />} />
      </Routes>
    </div>
  </div>
}
export default function Workspace() {
  const { user, loading, passwordRecovery } = useAccount()
  const location = useLocation()
  if (loading) return <div className="ca-workspace"><Loading /></div>
  if (!user) return <Navigate to={'/account?returnTo=' + encodeURIComponent(location.pathname + location.search)} replace />
  if (passwordRecovery) return <Navigate to="/account?reset=1" replace />
  return <SignedInWorkspace key={user.id} />
}
type UpdateFilter = (key: string, value: string) => void
function Filters({ params, update, categories, defaultRange, latestDate, savedOnly = false }: { params: URLSearchParams; update: UpdateFilter; categories: string[]; defaultRange: string; latestDate?: string | null; savedOnly?: boolean }) {
  const [query, setQuery] = useState(params.get('q') || '')
  const range = params.get('range') || defaultRange
  // Name the edition the reader will actually get, instead of promising "Today"
  // before the evening upload has happened.
  const latestLabel = latestDate ? 'Latest edition · ' + displayDate(latestDate) : 'Latest available edition'
  function search(e: FormEvent) { e.preventDefault(); update('q', query.trim()) }
  return <div className="ca-filters">
    <form className="ca-search" role="search" onSubmit={search}><label className="sr-only" htmlFor="ca-search">Search developments, facts and sources</label><Search size={18} /><input id="ca-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200} placeholder="Search topics, countries, reports…" /><button type="submit">Search</button></form>
    <div className="ca-filter-row">
      <label>Period<select value={range} onChange={(e) => update('range', e.target.value)}><option value="latest">{latestLabel}</option><option value="today">Today ({displayDate(pakistanDate())})</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All dates</option><option value="custom">Custom dates</option></select></label>
      <label>Category<select value={params.get('category') || ''} onChange={(e) => update('category', e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Reading state<select value={params.get('reading') || ''} onChange={(e) => update('reading', e.target.value)}><option value="">All developments</option><option value="unread">Unread</option><option value="opened">In progress</option><option value="read">Read</option></select></label>
      {!savedOnly && <label className="ca-checkbox"><input type="checkbox" checked={params.get('saved') === '1'} onChange={(e) => update('saved', e.target.checked ? '1' : '')} />Saved only</label>}
    </div>
    {range === 'custom' && <div className="ca-filter-row"><label>From<input aria-label="From date" type="date" value={params.get('from') || pakistanDate()} onChange={(e) => update('from', e.target.value)} /></label><label>To<input aria-label="To date" type="date" value={params.get('to') || pakistanDate()} onChange={(e) => update('to', e.target.value)} /></label></div>}
    {(params.get('q') || params.get('category') || params.get('reading') || params.get('saved')) && <button className="ca-clear" onClick={() => update('clear', '')}>Clear filters</button>}
  </div>
}
function useFilters(defaultRange: string) {
  const [params, setParams] = useSearchParams()
  const update: UpdateFilter = (key, value) => {
    const next = new URLSearchParams(window.location.search); next.delete('page')
    if (key === 'clear') { setParams({ range: defaultRange }); return }
    if (value) next.set(key, value); else next.delete(key)
    if (key === 'range') {
      next.delete('date')
      if (value === 'custom') { next.set('from', pakistanDate()); next.set('to', pakistanDate()) }
      else { next.delete('from'); next.delete('to') }
    }
    setParams(next)
  }
  const page = Math.max(1, Number(params.get('page')) || 1)
  return { params, update, page, setPage: (n: number) => { const next = new URLSearchParams(window.location.search); next.set('page', String(n)); setParams(next); window.scrollTo({ top: 0, behavior: 'instant' }) } }
}
function Feed({ mode }: { mode: 'briefing' | 'facts' | 'saved' | 'search' }) {
  const defaultRange = mode === 'saved' || mode === 'search' ? 'all' : latestRange
  const filters = useFilters(defaultRange)
  const query = dateFilters(filters.params, defaultRange)
  query.set('view', mode === 'facts' ? 'factbook' : 'feed')
  if (mode === 'saved') query.set('saved', '1')
  const result = useBriefing(query.toString(), feedSchema)
  const title = { briefing: 'Current Affairs', facts: 'Daily Factbook', saved: 'My Saved Items', search: 'Search the Archive' }[mode]
  const subtitle = { briefing: 'The Current Affairs developments that matter, one clear explanation at a time.', facts: 'Facts, figures and quick GK, ready for revision.', saved: 'Your personal collection of developments worth revisiting.', search: 'Find a topic across headlines, explanations, institutions, facts and original sources.' }[mode]
  return <>
    <header className="ca-heading"><p className="ca-eyebrow">CSS VISTA CURRENT AFFAIRS</p><h1>{title}</h1><p>{subtitle}</p>{result.data && mode === 'briefing' && <EditionMeta summary={result.data.summary} />}</header>
    <Filters key={mode + (filters.params.get('q') || '')} params={filters.params} update={filters.update} categories={result.data?.categories || []} defaultRange={defaultRange} latestDate={result.data?.summary.latest_date} savedOnly={mode === 'saved'} />
    {result.loading ? <Loading /> : result.error || !result.data ? <LoadError error={result.error || 'Please try again.'} retry={result.retry} /> : <>
      {mode === 'briefing' && <CategoryGlance summary={result.data.summary} selected={filters.params.get('category') || ''} select={(category) => filters.update('category', category)} />}
      {!result.data.items.length ? (
        !result.data.summary.published && !filters.params.get('q') && !filters.params.get('category') && [latestRange, 'today', 'yesterday', 'custom'].includes(filters.params.get('range') || defaultRange) && mode !== 'saved'
          ? <Publication summary={result.data.summary} />
          : <Empty title={mode === 'saved' && filters.params.size === 0 ? 'No saved items yet' : 'No results'}>{mode === 'saved' && filters.params.size === 0 ? "You haven't saved any developments yet. Use Save on a development to keep it here." : 'No developments matched your search. Try another date, category or search term.'}</Empty>
      ) : mode === 'facts' ? <Factbook items={result.data.items} /> : <div className="ca-card-grid">{result.data.items.map((item) => <StoryCardView key={item.id + item.saved + item.reading_status} item={item} onChange={result.retry} />)}</div>}
      <Pager page={filters.page} more={result.data.has_more} change={filters.setPage} />
    </>}
  </>
}
type RevisionFact = { kind: string; text: string; fact: Fact; story: StoryCard }
function Factbook({ items }: { items: StoryCard[] }) {
  const [kind, setKind] = useState('')
  const entries: RevisionFact[] = items.flatMap((story) => [
    ...story.facts.map((fact) => ({ kind: typeof fact === 'string' ? 'Important facts' : fact.type || 'Important facts', fact, text: factText(fact), story })),
    ...story.quick_gk.map((fact) => ({ kind: 'Quick GK', fact, text: factText(fact), story })),
    ...story.statistics.map((stat) => ({ kind: 'Statistics', fact: { label: stat.label, value: stat.value, source: stat.source, year: stat.year || stat.date }, text: stat.label + ': ' + stat.value + ' (' + (stat.year || stat.date) + '; ' + stat.source + ')', story })),
    ...(['countries', 'people', 'organisations', 'reports', 'treaties'] as const).flatMap((field) => story[field].map((value) => ({ kind: { countries: 'Countries in news', people: 'People in news', organisations: 'Organisations', reports: 'Reports & rankings', treaties: 'Agreements & treaties' }[field], fact: value, text: value, story }))),
  ])
  const kinds = [...new Set(entries.map((e) => e.kind))]
  if (!entries.length) return <Empty title="No revision facts for this selection">Open the complete analyses or try another date.</Empty>
  return <section aria-label="Revision facts"><div className="ca-chips ca-fact-types"><button aria-pressed={!kind} onClick={() => setKind('')}>All facts</button>{kinds.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}</div>
    <div className="ca-fact-grid">{entries.filter((e) => !kind || kind === e.kind).map((e, n) => <article className="ca-revision-card" key={e.story.id + e.kind + n}>
      <div className="ca-card-meta"><span>{e.kind}</span><CopyButton value={e.text} /></div>
      <div>{typeof e.fact === 'string' ? <p>{e.fact}</p> : <><h2>{e.fact.label}</h2><p className={e.kind === 'Statistics' ? 'ca-stat-value' : ''}>{e.fact.value}</p>{(e.fact.source || e.fact.year) && <small>{[e.fact.source, e.fact.year].filter(Boolean).join(' · ')}</small>}</>}</div>
      <Link className="ca-fact-context" to={briefingRoot + '/' + e.story.id}>{e.story.headline} <ArrowRight size={14} /></Link>
      <small>{displayDate(e.story.publication_date)} · {e.story.category}</small>
    </article>)}</div>
  </section>
}
function Archive() {
  const filters = useFilters('all')
  const query = dateFilters(filters.params, 'all'); query.set('view', 'archive')
  const result = useBriefing(query.toString(), archiveSchema)
  function month(value: string) {
    const [year, number] = value.split('-').map(Number)
    if (!year || !number) { filters.update('clear', ''); return }
    const from = value + '-01'
    const next = number === 12 ? (year + 1) + '-01-01' : year + '-' + String(number + 1).padStart(2, '0') + '-01'
    const params = new URLSearchParams(filters.params); params.set('range', 'custom'); params.set('from', from); params.set('to', shiftDate(next, -1)); params.set('month', value); params.delete('page')
    navigate({ search: params.toString() })
  }
  const navigate = useNavigate()
  return <>
    <header className="ca-heading"><p className="ca-eyebrow">CURRENT AFFAIRS ARCHIVE</p><h1>Every edition, within reach</h1><p>Follow an issue over time or return to a day&apos;s complete Current Affairs edition.</p></header>
    <div className="ca-month"><label>Jump to month <input type="month" value={filters.params.get('month') || ''} onChange={(e) => month(e.target.value)} /></label></div>
    <Filters key={filters.params.get('q') || ''} {...filters} categories={result.data?.categories || []} defaultRange="all" />
    {result.loading ? <Loading /> : result.error || !result.data ? <LoadError error={result.error || 'Please try again.'} retry={result.retry} /> : <>
      {!result.data.days.length ? <Empty title="No editions found">Try a different month or search term.</Empty> : <div className="ca-archive-list">{result.data.days.map((day) => <Link key={day.publication_date} to={briefingRoot + '?range=custom&from=' + day.publication_date + '&to=' + day.publication_date}>
        <span className="ca-calendar-day">{day.publication_date.slice(8)}<small>{new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'Asia/Karachi' }).format(new Date(day.publication_date + 'T12:00:00Z'))}</small></span>
        <span><strong>{displayDate(day.publication_date)}</strong><small>{day.edition} · {day.story_count} matching developments</small></span><ArrowRight size={19} />
      </Link>)}</div>}
      <Pager page={filters.page} more={result.data.has_more} change={filters.setPage} />
    </>}
  </>
}
