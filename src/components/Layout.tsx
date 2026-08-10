import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router'
import {
  Menu, Search, X, ChevronDown, ArrowLeft, GraduationCap, BookOpen, FileText, PenLine,
  ClipboardList, Newspaper, Megaphone, Wrench, Gamepad2, UserCheck,
  Landmark, TrendingUp, Languages, Target, Download, LayoutDashboard,
  MessageCircle, ExternalLink, Home as HomeIcon, Globe2, Grid2X2, UserRound,
} from 'lucide-react'
import { site, notifications } from '@/data/site'
import type { Notification } from '@/data/site'
import { searchSite, type SearchResult } from '@/lib/search'
import { touchVisit } from '@/lib/store'
import NotificationCenter, { NotificationOptInBar } from '@/components/NotificationCenter'
import { useAccount } from '@/lib/accountContext'

const nav = [
  { label: 'Home', to: '/' },
  { label: 'GK World', to: '/gk' },
  { label: 'Past Papers', to: '/past-papers' },
  { label: 'Books by Sir Ali', to: '/books' },
  { label: 'Opinions', to: '/opinions' },
  {
    label: 'Subjects',
    items: [
      { label: 'Start CSS', to: '/start-css', icon: GraduationCap },
      { label: 'Compulsory Subjects', to: '/subjects/compulsory', icon: BookOpen },
      { label: 'Optional Subjects', to: '/subjects/optional', icon: BookOpen },
      { label: 'Subject Selection Tool', to: '/subjects/selector', icon: Target },
    ],
  },
  {
    label: 'Practice',
    items: [
      { label: 'MPT Preparation', to: '/mpt', icon: ClipboardList },
      { label: 'Daily Five-Minute Challenge', to: '/five-minute', icon: Megaphone },
      { label: 'Mistake Notebook', to: '/mistakes', icon: FileText },
      { label: 'Essay - Miss Sadia Zahoor, PAS', to: '/essay', icon: PenLine },
      { label: 'Answer Timer', to: '/answer-timer', icon: ClipboardList },
      { label: 'Answer-Writing Practice', to: '/answer-writing', icon: PenLine },
      { label: 'Answer Evaluation by Miss Sadia Zahoor, PAS', to: '/answer-evaluation', icon: PenLine },
      { label: 'Vocabulary and Daily Challenge', to: '/grammar-vocabulary', icon: Languages },
      { label: 'Current Affairs', to: '/current-affairs', icon: Newspaper },
    ],
  },
  {
    label: 'Library',
    items: [
      { label: 'Notes Library', to: '/notes', icon: FileText },
      { label: 'Handwritten Notes by Miss Sadia Zahoor, PAS', to: '/handwritten-notes', icon: PenLine },
      { label: 'Free CSS Vista Lectures', to: '/lectures', icon: GraduationCap },
      { label: 'One-Liner GK', to: '/one-liner-gk', icon: BookOpen },
      { label: 'Urdu & English Grammar', to: '/language-grammar', icon: Languages },
      { label: 'Book Summaries', to: '/book-summaries', icon: BookOpen },
      { label: 'Past-Paper Trend Analyzer', to: '/trend-analyzer', icon: TrendingUp },
      { label: 'Download Centre', to: '/downloads', icon: Download },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Test Series Announcement', to: '/test-series', icon: Megaphone },
      { label: 'Study Tools', to: '/study-tools', icon: Wrench },
      { label: 'Application Checklists', to: '/checklists', icon: ClipboardList },
      { label: 'CSS Games', to: '/games', icon: Gamepad2 },
      { label: 'Performance Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'My CSS Study Planner', to: '/study-planner', icon: ClipboardList },
    ],
  },
  {
    label: 'Guidance',
    items: [
      { label: 'Psychological Assessment & Viva', to: '/psych-viva', icon: UserCheck },
      { label: 'Occupational Groups', to: '/services', icon: Landmark },
      { label: 'Success & Failure Analysis', to: '/analysis', icon: TrendingUp },
    ],
  },
  { label: 'Mentors', to: '/mentors' },
  { label: 'Account', to: '/account' },
]

const primaryNav = [
  { label: 'Home', to: '/', icon: HomeIcon },
  { label: 'GK World', to: '/gk', icon: Globe2 },
  { label: 'MPT Practice', to: '/mpt', icon: PenLine },
  { label: 'Current Affairs', to: '/current-affairs', icon: Newspaper },
  { label: 'Past Papers', to: '/past-papers', icon: FileText },
]

const mobileQuickLinks = [
  { label: 'Home', to: '/', icon: HomeIcon },
  { label: 'GK World', to: '/gk', icon: Globe2 },
  { label: 'MPT Preparation', to: '/mpt', icon: ClipboardList },
  { label: 'Current Affairs', to: '/current-affairs', icon: Newspaper },
  { label: 'Past Papers', to: '/past-papers', icon: FileText },
  { label: 'Notes Library', to: '/notes', icon: BookOpen },
  { label: 'Book Summaries', to: '/book-summaries', icon: BookOpen },
  { label: 'One-Liner GK', to: '/one-liner-gk', icon: Target },
]

const mobileQuickPaths = new Set(mobileQuickLinks.map((item) => item.to))

function NotificationBar() {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const active = notifications.filter(
    (n) => !dismissed.includes(n.id) && (!n.expires || new Date(n.expires) > new Date())
  )
  useEffect(() => {
    if (active.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % active.length), 6000)
    return () => clearInterval(t)
  }, [active.length])
  if (!active.length) return null
  const n = active[idx % active.length]
  return (
    <div className="bg-pine-deep text-emerald-50 text-[13px]" role="status">
      <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-center gap-2">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${n.kind === 'fpsc' ? 'bg-amber-400/90 text-emerald-950' : 'bg-emerald-700 text-emerald-50'}`}>
          {n.kind === 'fpsc' ? 'FPSC' : 'CSS Vista'}
        </span>
        <Link to={n.link} className="truncate hover:underline underline-offset-2">{n.text}</Link>
        <button
          aria-label="Dismiss notification"
          className="ml-auto shrink-0 rounded p-0.5 hover:bg-white/10 transition-colors"
          onClick={() => setDismissed((d) => [...d, n.id])}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function SearchBox() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setResults(searchSite(q, 8)), 150)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search subjects, notes, MCQs…"
        aria-label="Search the website"
        className="h-9 w-full rounded-md border border-input bg-white pl-8 pr-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
      />
      {open && q.length >= 2 && (
        <div className="absolute right-0 top-10 z-50 w-[min(90vw,420px)] overflow-hidden rounded-lg border bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No results for “{q}”. Try a subject name, topic, or keyword like “precis”.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    className="block w-full px-3 py-2 text-left transition-colors hover:bg-secondary"
                    onClick={() => { setOpen(false); setQ(''); navigate(r.link) }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">{r.category}</span>
                    <div className="truncate text-sm font-medium text-foreground">{r.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.snippet}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const featureTickerItems: Notification[] = [
  { id: 'feature-mpt', kind: 'platform', text: 'Prepare MPT subject-wise and attempt a scheduled full mock every 3 days.', link: '/mpt' },
  { id: 'feature-pms-gk-mock', kind: 'platform', text: 'A new 100-question PMS GK Grand Mock becomes available every 2 days after completion.', link: '/gk/quiz?mode=pms-mock' },
  { id: 'feature-revision', kind: 'platform', text: 'Smart Revision automatically brings questions back after 1, 3, 7, 14, 30 and 60 days.', link: '/gk' },
  { id: 'feature-daily', kind: 'platform', text: 'Build consistency with the Daily Five-Minute Challenge and unlimited visit streak.', link: '/five-minute' },
  { id: 'feature-planner', kind: 'platform', text: 'Create a personal CSS study plan based on your subjects, available hours and progress.', link: '/study-planner' },
  { id: 'feature-evaluation', kind: 'platform', text: 'Prepare answers for evaluation by Miss Sadia Zahoor, PAS.', link: '/answer-evaluation' },
  { id: 'feature-custom-test-series', kind: 'platform', text: 'Build a customized CSS test series with subjects, dates and fee calculation for Miss Sadia Zahoor, PAS.', link: '/test-series' },
  { id: 'feature-notes', kind: 'platform', text: 'Explore handwritten notes by Miss Sadia Zahoor, PAS and the complete notes library.', link: '/handwritten-notes' },
  { id: 'feature-lectures', kind: 'platform', text: 'Free CSS Vista lectures cover compulsory and selected optional subjects.', link: '/lectures' },
  { id: 'feature-papers', kind: 'platform', text: 'Browse organised CSS, PMS and PPSC past papers with View and Download controls.', link: '/past-papers' },
  { id: 'feature-library', kind: 'platform', text: 'Search One-Liner GK, book summaries, grammar courses and study resources in one place.', link: '/one-liner-gk' },
]

function LiveTicker() {
  const [hidden, setHidden] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [online, setOnline] = useState(() => navigator.onLine)
  const { user, syncStatus, lastSyncedAt } = useAccount()
  const items = [...notifications, ...featureTickerItems].filter((n) => !n.expires || new Date(n.expires) > new Date())

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.clearInterval(clock)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!items.length || hidden) return null

  const status = !online
    ? 'Offline - device copy'
    : user
      ? syncStatus === 'syncing'
        ? 'Syncing'
        : syncStatus === 'error'
          ? 'Sync pending'
          : lastSyncedAt
            ? 'Progress synced'
            : 'Account connected'
      : 'Saved on device'
  const time = new Intl.DateTimeFormat(void 0, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)

  return (
    <div className="bg-pine-deep text-emerald-50 text-[13px]" role="region" aria-label="CSS Vista live updates">
      <div className="mx-auto flex max-w-[1520px] items-center gap-2 px-3 py-1.5 sm:px-5">
        <span className="shrink-0 rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-50">Live</span>
        <div className="vista-live-ticker min-w-0 flex-1 overflow-hidden" aria-label="Latest features and official notices">
          <div className="vista-live-ticker-track flex w-max items-center">
            {[false, true].map((copy) => (
              <div key={copy ? 'duplicate' : 'primary'} className="flex shrink-0 items-center" aria-hidden={copy || undefined}>
                {items.map((n) => (
                  <Link
                    key={`${copy ? 'copy-' : ''}${n.id}`}
                    to={n.link}
                    tabIndex={copy ? -1 : undefined}
                    className="group inline-flex shrink-0 items-center whitespace-nowrap px-4 text-xs text-emerald-50/90 outline-none hover:text-white focus:text-white sm:text-[13px]"
                  >
                    <span className={`mr-2 h-1.5 w-1.5 rounded-full ${n.kind === 'fpsc' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="underline-offset-2 group-hover:underline group-focus:underline">{n.text}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div
          className="hidden shrink-0 items-center gap-2 border-l border-white/15 pl-3 text-[10px] font-semibold text-emerald-100 md:flex"
          title={user && lastSyncedAt ? `Last synced ${lastSyncedAt.toLocaleString()}` : 'Progress status and time from this device'}
        >
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>{status}</span>
          <span className="text-emerald-200/50">·</span>
          <time dateTime={now.toISOString()}>{time}</time>
        </div>
        <button
          aria-label="Hide live updates"
          className="ml-auto shrink-0 rounded p-0.5 hover:bg-white/10 transition-colors"
          onClick={() => setHidden(true)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className="flex shrink-0 items-center" aria-label="CSS Vista home">
      <img
        src="/images/logo.png?v=20260810b"
        alt="CSS Vista - official logo"
        className={className ?? 'h-10 w-auto max-w-[250px] object-contain'}
      />
    </Link>
  )
}

function BackBar({ onBack }: { onBack: () => void }) {
  const location = useLocation()
  if (location.pathname === '/') return null
  return (
    <div className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-secondary">
          <GraduationCap className="h-4 w-4" /> Home
        </Link>
        <span className="ml-2 hidden truncate text-xs text-muted-foreground sm:block">{location.pathname}</span>
      </div>
    </div>
  )
}

const ROUTE_HISTORY_KEY = 'cssvista:route-history:v1'

function readRouteHistory(currentRoute: string): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ROUTE_HISTORY_KEY) || '[]')
    const routes = Array.isArray(parsed)
      ? parsed.filter((route): route is string => typeof route === 'string' && route.startsWith('/')).slice(-50)
      : []
    return routes[routes.length - 1] === currentRoute ? routes : [...routes, currentRoute].slice(-50)
  } catch {
    return [currentRoute]
  }
}

function saveRouteHistory(routes: string[]) {
  try {
    sessionStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(routes.slice(-50)))
  } catch {
    /* session storage unavailable */
  }
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDrop, setOpenDrop] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const currentRoute = `${location.pathname}${location.search}${location.hash}`
  const [routeHistory, setRouteHistory] = useState<string[]>(() => readRouteHistory(currentRoute))
  const [backTransitionRoute, setBackTransitionRoute] = useState('')
  const skipNextRouteSync = useRef(false)
  const { user, configured: accountsConfigured } = useAccount()

  useEffect(() => { touchVisit() }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
    const frame = window.requestAnimationFrame(() => {
      setMobileOpen(false)
      setOpenDrop(null)
      setSearchOpen(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])
  useEffect(() => {
    setRouteHistory((previous) => {
      if (skipNextRouteSync.current) {
        skipNextRouteSync.current = false
        return previous
      }

      let next = previous
      if (navigationType === 'POP') {
        const existingIndex = previous.lastIndexOf(currentRoute)
        next = existingIndex >= 0
          ? previous.slice(0, existingIndex + 1)
          : [...previous, currentRoute].slice(-50)
      } else if (previous[previous.length - 1] !== currentRoute) {
        next = [...previous, currentRoute].slice(-50)
      }

      if (next !== previous) saveRouteHistory(next)
      return next
    })
  }, [currentRoute, navigationType])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const goBack = () => {
    if (routeHistory.length > 1) {
      const nextHistory = routeHistory.slice(0, -1)
      const previousRoute = nextHistory[nextHistory.length - 1]
      skipNextRouteSync.current = true
      saveRouteHistory(nextHistory)
      setRouteHistory(nextHistory)
      setBackTransitionRoute(previousRoute)
      navigate(previousRoute, { replace: true })
      return
    }
    setBackTransitionRoute('/')
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LiveTicker />
      <NotificationBar />
      <NotificationOptInBar />
      <header className="sticky top-0 z-40 border-b bg-white/95 shadow-[0_6px_24px_rgba(8,76,49,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex h-[76px] max-w-[1520px] items-center gap-3 px-4 sm:px-6 xl:h-[92px] xl:px-6">
          <button
            className="rounded-lg p-2 hover:bg-secondary xl:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-center xl:flex-none">
            <Logo className="h-11 w-auto max-w-[160px] object-contain sm:h-14 sm:max-w-[220px] xl:h-[70px] xl:max-w-[270px]" />
          </div>

          <nav className="ml-auto hidden items-stretch gap-1 xl:flex" aria-label="Main navigation">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:transition-colors ${
                    isActive
                      ? 'bg-emerald-50/70 text-pine after:bg-emerald-700'
                      : 'text-foreground/80 after:bg-transparent hover:bg-secondary hover:text-pine'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}

            <div className="relative" onMouseLeave={() => setOpenDrop(null)}>
              <button
                className={`flex h-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  openDrop === 'More' ? 'bg-secondary text-pine' : 'text-foreground/80 hover:bg-secondary hover:text-pine'
                }`}
                onMouseEnter={() => setOpenDrop('More')}
                onClick={() => setOpenDrop(openDrop === 'More' ? null : 'More')}
                aria-expanded={openDrop === 'More'}
              >
                <Grid2X2 className="h-4 w-4" />
                More
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDrop === 'More' ? 'rotate-180' : ''}`} />
              </button>
              <div
                className={`absolute right-0 top-full z-50 mt-1 grid max-h-[72vh] w-[min(90vw,640px)] origin-top-right grid-cols-2 gap-4 overflow-y-auto rounded-xl border bg-white p-4 shadow-xl transition-all duration-150 ${
                  openDrop === 'More' ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
                }`}
              >
                {nav
                  .filter((item) => !('to' in item) || !primaryNav.some((primary) => primary.to === item.to))
                  .map((item) =>
                    'to' in item ? (
                      <NavLink
                        key={item.label}
                        to={item.to!}
                        className="rounded-lg border bg-secondary/40 px-3 py-2 text-sm font-semibold text-pine hover:bg-secondary"
                      >
                        {item.label}
                      </NavLink>
                    ) : (
                      <div key={item.label}>
                        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-800/60">
                          {item.label}
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {item.items
                            .filter((sub) => !primaryNav.some((primary) => primary.to === sub.to))
                            .map((sub) => (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={({ isActive }) =>
                                  `flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                                    isActive ? 'bg-secondary font-semibold text-pine' : 'text-foreground/75 hover:bg-secondary'
                                  }`
                                }
                              >
                                <sub.icon className="h-3.5 w-3.5 text-emerald-800/70" />
                                {sub.label}
                              </NavLink>
                            ))}
                        </div>
                      </div>
                    ),
                  )}
              </div>
            </div>
          </nav>

          <div className="relative hidden xl:block">
            <button
              onClick={() => setSearchOpen((open) => !open)}
              className="rounded-full border bg-white p-2.5 text-pine transition-colors hover:bg-secondary"
              aria-label="Search the website"
              aria-expanded={searchOpen}
            >
              <Search className="h-4 w-4" />
            </button>
            {searchOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-xl border bg-white p-3 shadow-xl">
                <SearchBox />
              </div>
            )}
          </div>

          <NotificationCenter />
          <Link
            to="/account"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white text-pine transition-colors hover:bg-secondary"
            aria-label={user ? `Open account for ${user.email ?? 'signed-in student'}` : 'Open student account'}
            title={user ? user.email : accountsConfigured ? 'Sign in' : 'Account setup'}
          >
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
        <BackBar onBack={goBack} />
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 xl:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ease-out xl:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Logo className="h-12 w-auto max-w-[220px] object-contain" />
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-md p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b px-4 py-3 md:hidden">
          <SearchBox />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Main categories
          </p>
          <div className="grid grid-cols-2 gap-2 pb-4">
            {mobileQuickLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-14 items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                    isActive
                      ? 'border-emerald-200 bg-emerald-50 text-pine'
                      : 'border-border bg-white text-foreground/85 hover:bg-secondary'
                  }`
                }
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pine text-white">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="leading-tight">{item.label}</span>
              </NavLink>
            ))}
          </div>
          <p className="border-t px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            More categories
          </p>
          {nav.filter((item) => !('to' in item) || !mobileQuickPaths.has(item.to!)).map((item) =>
            'to' in item ? (
              <NavLink
                key={item.label}
                to={item.to!}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2.5 text-[15px] font-medium ${isActive ? 'bg-secondary text-pine' : 'text-foreground/85'}`
                }
              >
                {item.label}
              </NavLink>
            ) : (
              <details key={item.label} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2.5 text-[15px] font-medium text-foreground/85 [&::-webkit-details-marker]:hidden">
                  {item.label}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="ml-3 border-l pl-3">
                  {item.items.map((sub) => (
                    <NavLink key={sub.to} to={sub.to} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm text-foreground/75 hover:bg-secondary">
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              </details>
            )
          )}
          <div className="mt-4 border-t pt-4 px-3">
            {site.cssGroupLink ? (
              <a href={site.cssGroupLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <MessageCircle className="h-3.5 w-3.5" /> {site.cssGroupLabel}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">{site.cssGroupLabel}</span>
            )}
          </div>
        </nav>
      </aside>

      <main className="flex-1">
        <div
          key={location.key}
          className={
            navigationType === 'POP' || backTransitionRoute === currentRoute
              ? 'route-transition-back'
              : 'route-transition-forward'
          }
        >
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-t-amber-500/30 bg-cream">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo className="h-12 w-auto object-contain" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{site.tagline}.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Practice</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-pine transition-colors" to="/gk">GK World</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/mpt">MPT Preparation</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/five-minute">Five-Minute Challenge</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/mistakes">Mistake Notebook</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/grammar-vocabulary">Vocabulary and Daily Challenge</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Library & Tools</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-pine transition-colors" to="/notes">Notes Library</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/past-papers">Past Papers</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/books">Books by Sir Ali</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/book-summaries">Book Summaries</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/opinions">Opinions by Authors</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/test-series">Test Series Announcement</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/dashboard">Performance Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Official Sources</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://www.fpsc.gov.pk/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-pine transition-colors">
                  FPSC - official website <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-800/70" />
                {site.cssGroupLink ? (
                  <a href={site.cssGroupLink} target="_blank" rel="noopener noreferrer" className="hover:text-pine transition-colors">Join the CSS Vista WhatsApp Group</a>
                ) : (
                  <span>{site.cssGroupLabel}</span>
                )}
              </li>
              <li><Link className="text-xs text-muted-foreground/70 hover:text-pine transition-colors" to="/admin">Admin</Link></li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Guest progress stays in this browser. Signed-in students can securely sync progress across devices.
            </p>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CSS Vista · Verify all rules and dates at fpsc.gov.pk
        </div>
      </footer>
    </div>
  )
}
