import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router'
import {
  Menu, Search, X, ChevronDown, ArrowLeft, GraduationCap, BookOpen, FileText, PenLine,
  ClipboardList, Newspaper, Megaphone, Wrench, Gamepad2, UserCheck,
  Landmark, TrendingUp, Languages, Target, Download, LayoutDashboard,
  MessageCircle, ExternalLink, Home as HomeIcon, Globe2, Grid2X2, UserRound,
  NotebookPen, Video, CalendarRange, FileCheck2, type LucideIcon,
} from 'lucide-react'
import { featureAnnouncements, site, notifications } from '@/data/site'
import { defaultHomeCards } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import { searchSite, type SearchResult } from '@/lib/search'
import { touchVisit } from '@/lib/store'
import NotificationCenter, { NotificationOptInBar } from '@/components/NotificationCenter'
import { useAccount } from '@/lib/accountContext'
import { AdSenseLoader, PageFooterAd, PageHeaderAd } from '@/components/Ads'

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
      { label: 'Answer Evaluation by Miss Sadia Zahoor, PAS', to: '/answer-evaluation', icon: FileCheck2 },
      { label: 'Vocabulary and Daily Challenge', to: '/grammar-vocabulary', icon: Languages },
      { label: 'Current Affairs', to: '/current-affairs', icon: Newspaper },
    ],
  },
  {
    label: 'Library',
    items: [
      { label: 'Notes Library', to: '/notes', icon: FileText },
      { label: 'Handwritten Notes by Miss Sadia Zahoor, PAS', to: '/handwritten-notes', icon: NotebookPen },
      { label: 'Free CSS Vista Lectures', to: '/lectures', icon: Video },
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
      { label: 'Customized Test Series', to: '/test-series', icon: Megaphone },
      { label: 'Study Tools', to: '/study-tools', icon: Wrench },
      { label: 'Application Checklists', to: '/checklists', icon: ClipboardList },
      { label: 'CSS Games', to: '/games', icon: Gamepad2 },
      { label: 'Performance Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'My CSS Study Planner', to: '/study-planner', icon: CalendarRange },
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
  ...defaultHomeCards
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      label: item.title,
      to: item.to,
      icon: cardIcons[item.icon] ?? Grid2X2,
    })),
]

const mobileQuickPaths = new Set(mobileQuickLinks.map((item) => item.to))

interface FlatNavigationLink {
  label: string
  to: string
  icon: LucideIcon
}

const desktopMoreLinks = (() => {
  const collected: FlatNavigationLink[] = [...mobileQuickLinks]
  nav.forEach((item) => {
    if ('items' in item && item.items) {
      item.items.forEach((sub) => collected.push(sub))
    } else if ('to' in item && item.to) {
      collected.push({ label: item.label, to: item.to, icon: Grid2X2 })
    }
  })
  return collected.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.to === item.to) === index,
  )
})()

function NotificationBar() {
  const [hidden, setHidden] = useState(false)
  const [deviceTime, setDeviceTime] = useState(() => new Date())
  const [online, setOnline] = useState(() => navigator.onLine)
  const { user, syncStatus, lastSyncedAt } = useAccount()
  const active = [...notifications, ...featureAnnouncements].filter(
    (item) => !item.expires || new Date(item.expires) > new Date(),
  )

  useEffect(() => {
    const clock = window.setInterval(() => setDeviceTime(new Date()), 1000)
    const updateConnection = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.clearInterval(clock)
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [])

  if (!active.length || hidden) return null

  const syncLabel = !online
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
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(deviceTime)

  return (
    <div className="bg-pine-deep text-emerald-50 text-[13px]" role="region" aria-label="CSS Vista live updates">
      <div className="mx-auto flex max-w-[1520px] items-center gap-2 px-3 py-1.5 sm:px-5">
        <span className="shrink-0 rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-50">
          Live
        </span>
        <div className="vista-live-ticker min-w-0 flex-1 overflow-hidden" aria-label="Latest features and official notices">
          <div className="vista-live-ticker-track flex w-max items-center">
            {[false, true].map((duplicate) => (
              <div
                key={duplicate ? 'duplicate' : 'primary'}
                className="flex shrink-0 items-center"
                aria-hidden={duplicate || undefined}
              >
                {active.map((item) => (
                  <Link
                    key={`${duplicate ? 'copy-' : ''}${item.id}`}
                    to={item.link}
                    tabIndex={duplicate ? -1 : undefined}
                    className="group inline-flex shrink-0 items-center whitespace-nowrap px-4 text-xs text-emerald-50/90 outline-none hover:text-white focus:text-white sm:text-[13px]"
                  >
                    <span className={`mr-2 h-1.5 w-1.5 rounded-full ${item.kind === 'fpsc' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="underline-offset-2 group-hover:underline group-focus:underline">
                      {item.text}
                    </span>
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
          <span>{syncLabel}</span>
          <span className="text-emerald-200/50">·</span>
          <time dateTime={deviceTime.toISOString()}>{timeLabel}</time>
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

function SearchBox({ onSelect, autoFocus = false }: { onSelect?: () => void; autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    if (q.trim().length < 2) {
      return () => { active = false }
    }
    const timer = window.setTimeout(() => {
      searchSite(q, 12)
        .then((nextResults) => {
          if (active) setResults(nextResults)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 180)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [q])

  return (
    <div ref={ref} className="w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-800" />
        <input
          value={q}
          onChange={(event) => {
            const nextQuery = event.target.value
            setQ(nextQuery)
            if (nextQuery.trim().length < 2) {
              setResults([])
              setLoading(false)
            } else {
              setLoading(true)
            }
          }}
          autoFocus={autoFocus}
          placeholder="Search subjects, lectures, notes, papers, books and GK..."
          aria-label="Search the entire website"
          className="h-12 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
        />
      </div>
      {q.trim().length < 2 ? (
        <p className="px-1 pt-3 text-xs text-muted-foreground">
          Type at least two letters. Press Ctrl+K or Command+K anywhere to open search.
        </p>
      ) : loading ? (
        <div className="space-y-2 py-4" aria-label="Searching CSS Vista">
          {[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-secondary" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No results for “{q}”. Try a subject, year, author, lecture topic or GK category.
        </div>
      ) : (
        <ul className="mt-3 max-h-[min(55vh,430px)] overflow-y-auto rounded-xl border py-1">
          {results.map((result) => (
            <li key={`${result.category}-${result.id}`}>
              <button
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-secondary"
                onClick={() => {
                  setQ('')
                  onSelect?.()
                  navigate(result.link)
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">{result.category}</span>
                <div className="line-clamp-2 text-sm font-semibold text-foreground">{result.title}</div>
                <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{result.snippet}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
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
    document.body.style.overflow = mobileOpen || searchOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, searchOpen])
  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', openSearch)
    return () => window.removeEventListener('keydown', openSearch)
  }, [])

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
      <AdSenseLoader />
      <NotificationBar />
      <NotificationOptInBar />
      <header className="sticky top-0 z-40 border-b bg-white/95 shadow-[0_6px_24px_rgba(8,76,49,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex h-[76px] max-w-[1520px] items-center gap-1 px-3 sm:gap-3 sm:px-6 xl:h-[92px] xl:px-6">
          <button
            className="rounded-lg p-2 hover:bg-secondary xl:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-center xl:flex-none">
            <Logo className="h-11 w-auto max-w-[132px] object-contain sm:h-14 sm:max-w-[220px] xl:h-[70px] xl:max-w-[270px]" />
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
                className={`absolute right-0 top-full z-50 mt-1 max-h-[76vh] w-[min(90vw,390px)] origin-top-right overflow-y-auto rounded-xl border bg-white p-2 shadow-xl transition-all duration-150 ${
                  openDrop === 'More' ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
                }`}
              >
                <div className="sticky top-0 z-10 mb-1 flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-pine">All sections</p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {desktopMoreLinks.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {desktopMoreLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setOpenDrop(null)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-emerald-50 font-semibold text-pine'
                            : 'text-foreground/80 hover:bg-secondary hover:text-pine'
                        }`
                      }
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-pine text-white">
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white text-pine transition-colors hover:bg-secondary"
            aria-label="Search the entire website"
            aria-expanded={searchOpen}
            title="Search CSS Vista"
          >
            <Search className="h-4 w-4" />
          </button>

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
        {searchOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-start justify-center bg-emerald-950/65 px-3 pt-[8vh] backdrop-blur-sm sm:px-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="universal-search-title"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setSearchOpen(false)
            }}
          >
            <section className="w-full max-w-2xl rounded-2xl border bg-white p-4 shadow-2xl sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 id="universal-search-title" className="font-display text-xl font-bold text-pine">
                    Search CSS Vista
                  </h2>
                  <p className="text-xs text-muted-foreground">One search across the complete preparation platform.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="rounded-full border p-2 text-pine hover:bg-secondary"
                  aria-label="Close website search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SearchBox autoFocus onSelect={() => setSearchOpen(false)} />
            </section>
          </div>
        )}
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
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Main categories
            </p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
              {mobileQuickLinks.length} sections
            </span>
          </div>
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

      <PageHeaderAd />

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

      <PageFooterAd />

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
              <li><Link className="hover:text-pine transition-colors" to="/handwritten-notes">Handwritten Notes by Miss Sadia Zahoor, PAS</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/lectures">Free CSS Vista Lectures</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/past-papers">Past Papers</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/books">Books by Sir Ali</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/book-summaries">Book Summaries</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/opinions">Opinions by Authors</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/test-series">Customized Test Series</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/dashboard">Performance Dashboard</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/study-planner">My CSS Study Planner</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/answer-evaluation">Answer Evaluation</Link></li>
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
