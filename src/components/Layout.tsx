import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router'
import {
  Menu, Search, X, ChevronDown, ArrowLeft, GraduationCap, BookOpen, FileText, PenLine,
  ClipboardList, Newspaper, Megaphone, Wrench, Gamepad2, UserCheck,
  Landmark, TrendingUp, Languages, Target, LayoutDashboard,
  MessageCircle, ExternalLink, Home as HomeIcon, Globe2, Grid2X2, UserRound,
  NotebookPen, Video, CalendarRange, FileCheck2, Instagram, Youtube, Flame, BookMarked, BrainCircuit, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { site } from '@/data/site'
import { css2026WrittenResult } from '@/data/css2026Result'
import { defaultHomeCards, sortHomeCardsByPriority } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import type { SearchResult } from '@/lib/search'
import { DAILY_MOCK_TIME_LABELS, getDailyMockStatus, touchVisit } from '@/lib/store'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import NotificationCenter, { NotificationOptInBar } from '@/components/NotificationCenter'
import { useAccount } from '@/lib/accountContext'
import StudyActivityTracker from '@/components/StudyActivityTracker'
import RouteSeo from '@/components/RouteSeo'
import { requestPageBack } from '@/lib/backNavigation'
import { lazyWithRecovery } from '@/lib/chunkRecovery'
import { scheduleIdleWork } from '@/lib/idle'
import { shouldShowCss2026ResultAnnouncement } from '@/lib/resultAnnouncement'
import {
  getRouteScrollPosition,
  parseRouteScrollState,
  resolveScrollIntent,
  updateRouteScrollState,
  type RouteScrollEntry,
} from '@/lib/navigationState'

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
      { label: '30,491 One-Liner GK Questions', to: '/one-liner-gk', icon: BookOpen },
      { label: 'CSS Past Paper Analysis', to: '/css-past-paper-analysis', icon: TrendingUp },
      { label: 'Urdu & English Grammar', to: '/language-grammar', icon: Languages },
      { label: 'Book Summaries', to: '/book-summaries', icon: BookOpen },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Customized Test Series', to: '/test-series', icon: Megaphone },
      { label: 'Study Tools', to: '/study-tools', icon: Wrench },
      { label: 'My Factbook', to: '/factbook', icon: BookMarked },
      { label: 'VISTA Exam Intelligence', to: '/exam-intelligence', icon: BrainCircuit },
      { label: 'FPSC Syllabus & Topic Planner', to: '/fpsc-syllabus', icon: FileCheck2 },
      { label: 'Application Checklists', to: '/checklists', icon: ClipboardList },
      { label: 'Interactive Practice', to: '/games', icon: Gamepad2 },
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
  {
    label: 'Policies',
    items: [
      { label: 'Legal & Trust Centre', to: '/legal', icon: ShieldCheck },
      { label: 'Privacy Policy', to: '/privacy-policy', icon: ShieldCheck },
      { label: 'Cookie Policy', to: '/cookie-policy', icon: ShieldCheck },
      { label: 'Terms & Conditions', to: '/terms-and-conditions', icon: FileCheck2 },
      { label: 'Disclaimer', to: '/disclaimer', icon: FileText },
      { label: 'Copyright Policy', to: '/copyright', icon: FileText },
      { label: 'Editorial & Corrections Policy', to: '/editorial-policy', icon: FileCheck2 },
      { label: 'Contact CSS Vista', to: '/contact', icon: MessageCircle },
    ],
  },
  { label: 'About Us', to: '/mentors' },
  { label: 'Account', to: '/account' },
]

const primaryNav = [
  { label: 'Home', to: '/', icon: HomeIcon },
  { label: 'Subject MCQs', to: '/css-mcqs', icon: ClipboardList },
  { label: 'GK World', to: '/gk', icon: Globe2 },
  { label: 'MPT Practice', to: '/mpt', icon: PenLine },
  { label: 'Past Papers', to: '/past-papers', icon: FileText },
]

const mobileBottomNav = [
  { label: 'Home', to: '/', icon: HomeIcon, paths: ['/'] },
  { label: 'Study', to: '/study-tools', icon: BookOpen, paths: ['/study-tools', '/study-planner', '/factbook', '/exam-intelligence', '/start-css', '/subjects', '/css-mcqs', '/gk', '/fpsc-syllabus'] },
  { label: 'Tests', to: '/test-series', icon: ClipboardList, paths: ['/test-series', '/mpt', '/five-minute', '/answer-writing', '/answer-evaluation', '/answer-timer', '/mistakes'] },
  { label: 'Library', to: '/notes', icon: NotebookPen, paths: ['/notes', '/handwritten-notes', '/past-papers', '/css-past-paper-analysis', '/lectures', '/books', '/book-summaries', '/current-affairs'] },
  { label: 'Profile', to: '/account', icon: UserRound, paths: ['/account', '/dashboard', '/exam-intelligence'] },
]

const mobileQuickLinks = [
  { label: 'Home', to: '/', icon: HomeIcon },
  ...sortHomeCardsByPriority(defaultHomeCards.filter((item) => item.visible))
    .map((item) => ({
      label: item.title,
      to: item.to,
      icon: cardIcons[item.icon] ?? Grid2X2,
    })),
]

const mobileQuickPaths = new Set(mobileQuickLinks.map((item) => item.to))

const VistaShortcut = lazyWithRecovery(() => import('@/components/VistaShortcut'))

function DeferredVistaShortcut() {
  const [ready, setReady] = useState(false)

  useEffect(() => scheduleIdleWork(() => setReady(true), { timeout: 1_200, fallbackDelay: 500 }), [])

  if (!ready) return null
  return <Suspense fallback={null}><VistaShortcut /></Suspense>
}

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
  const [deviceTime, setDeviceTime] = useState(() => new Date())
  const [online, setOnline] = useState(() => navigator.onLine)
  const [streak, setStreak] = useState(() => touchVisit())
  const streakDayRef = useRef(deviceTime.toDateString())
  const { user, syncStatus, lastSyncedAt } = useAccount()
  const mockNotices = (['gk', 'mpt'] as const).map((kind) => {
    const status = getDailyMockStatus(kind, deviceTime)
    return {
      id: `daily-${kind}-mock-${status.dateKey}`,
      kind: 'platform' as const,
      text: status.live
        ? `LIVE REGISTRATION: ${status.title} · ${DAILY_MOCK_TIME_LABELS[kind]}. Enter now and finish your paper after entry.`
        : status.completedToday
          ? `${status.title} completed today. Your printable result and previous record are saved.`
          : `${status.title} · every day · ${DAILY_MOCK_TIME_LABELS[kind]}.`,
      link: status.route,
      expires: undefined,
    }
  })
  const active = [
    { id: 'css-2026-result', kind: 'platform' as const, text: `CSS 2026 written result announced · ${css2026WrittenResult.qualifiedCandidates} candidates qualified · View the complete result`, link: css2026WrittenResult.pagePath },
    ...mockNotices,
    { id: 'test-series', kind: 'platform' as const, text: 'Customized CSS written test series by Miss Sadia Zahoor, PAS', link: '/test-series' },
    { id: 'instagram-posts', kind: 'platform' as const, text: 'Follow CSS Vista on Instagram for preparation posts', link: site.instagram },
    { id: 'suggestion', kind: 'platform' as const, text: 'Want to suggest a change that benefits CSS preparation and this website? Message us on Instagram—the CSS Vista team will work on it.', link: site.instagram },
  ]

  useEffect(() => {
    const refreshStreak = () => setStreak(touchVisit())
    const updateClock = () => {
      const now = new Date()
      setDeviceTime(now)
      const dateKey = now.toDateString()
      if (dateKey !== streakDayRef.current) {
        streakDayRef.current = dateKey
        refreshStreak()
      }
    }
    const clock = window.setInterval(updateClock, 1000)
    const updateConnection = () => setOnline(navigator.onLine)
    const updateAfterVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshStreak()
    }
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    window.addEventListener('focus', refreshStreak)
    window.addEventListener('storage', refreshStreak)
    document.addEventListener('visibilitychange', updateAfterVisibilityChange)
    return () => {
      window.clearInterval(clock)
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
      window.removeEventListener('focus', refreshStreak)
      window.removeEventListener('storage', refreshStreak)
      document.removeEventListener('visibilitychange', updateAfterVisibilityChange)
    }
  }, [])

  if (!active.length) return null

  const syncLabel: string | null = !online
    ? 'Offline'
    : user
      ? syncStatus === 'syncing'
        ? 'Syncing'
        : syncStatus === 'error'
          ? 'Sync pending'
          : lastSyncedAt
            ? 'Progress synced'
            : 'Account connected'
      : null
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(deviceTime)

  return (
    <div className="cssv-live-bar bg-pine-deep text-emerald-50 text-[13px]" role="region" aria-label="CSS Vista live updates">
      <div className="mx-auto flex max-w-[1520px] items-center gap-2 px-3 py-1.5 sm:px-5">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-1.5" aria-label={`${streak.current}-day study visit streak. Today's visit is counted.`} title={`Checked in today · Best: ${streak.best} days · Next milestone: ${streak.nextMilestone} days`}>
          <span className="grid h-6 w-6 place-items-center rounded-full border border-amber-300/60 bg-emerald-800 text-amber-200"><Flame className="h-3.5 w-3.5" /></span>
          <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-950">{streak.current} {streak.current === 1 ? 'day' : 'days'}</span>
        </Link>
        <div className="vista-live-ticker min-w-0 flex-1 overflow-hidden" aria-label="Latest features and official notices">
          <div className="vista-live-ticker-track flex w-max items-center">
            {[false, true].map((duplicate) => (
              <div
                key={duplicate ? 'duplicate' : 'primary'}
                className="flex shrink-0 items-center"
                aria-hidden={duplicate || undefined}
              >
                {active.map((item) => {
                  const className = `group inline-flex shrink-0 items-center whitespace-nowrap px-4 text-xs outline-none hover:text-white focus:text-white sm:text-[13px] ${item.id === 'suggestion' ? 'font-semibold text-amber-200' : 'text-emerald-50/90'}`
                  const content = <>
                    <span className={`mr-2 h-1.5 w-1.5 rounded-full ${item.id === 'instagram-posts' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span className="underline-offset-2 group-hover:underline group-focus:underline">
                      {item.text}
                    </span>
                  </>
                  return item.link.startsWith('http') ? (
                    <a key={`${duplicate ? 'copy-' : ''}${item.id}`} href={item.link} target="_blank" rel="noopener noreferrer" tabIndex={duplicate ? -1 : undefined} className={className}>{content}</a>
                  ) : (
                    <Link key={`${duplicate ? 'copy-' : ''}${item.id}`} to={item.link} tabIndex={duplicate ? -1 : undefined} className={className}>{content}</Link>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div
          className="hidden shrink-0 items-center gap-2 border-l border-white/15 pl-3 text-[10px] font-semibold text-emerald-100 md:flex"
          title={user && lastSyncedAt ? `Last synced ${lastSyncedAt.toLocaleString()}` : 'Account sync status and local time'}
        >
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {syncLabel && <><span>{syncLabel}</span><span className="text-emerald-200/50">·</span></>}
          <time dateTime={deviceTime.toISOString()}>{timeLabel}</time>
        </div>
        <SocialLinks compact />
      </div>
    </div>
  )
}

function SocialLinks({ compact = false }: { compact?: boolean }) {
  const links = [
    { label: 'Follow CSS Vista on Instagram', href: site.instagram, icon: Instagram, tone: 'hover:bg-pink-500/20 hover:text-pink-200' },
    { label: 'Join the CSS Vista WhatsApp group', href: site.cssGroupLink, icon: WhatsAppIcon, tone: 'hover:bg-emerald-400/20 hover:text-emerald-200' },
    { label: 'Visit the CSS Vista YouTube channel', href: site.youtube, icon: Youtube, tone: 'hover:bg-red-500/20 hover:text-red-200' },
  ]
  return (
    <div className={`no-print flex shrink-0 items-center ${compact ? 'gap-0.5 border-l border-white/15 pl-1.5' : 'gap-1'}`} aria-label="CSS Vista social channels">
      {links.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          className={`grid place-items-center rounded-full transition-colors ${compact ? `h-6 w-6 text-emerald-50/85 ${item.tone}` : 'h-9 w-9 border bg-white text-pine hover:bg-emerald-50'}`}
        >
          <item.icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </a>
      ))}
    </div>
  )
}

function Css2026ResultAnnouncement() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return window.sessionStorage.getItem('cssVistaCss2026ResultAnnouncementHidden') !== '1'
    } catch {
      return true
    }
  })

  const hideAnnouncement = () => {
    setVisible(false)
    try {
      window.sessionStorage.setItem('cssVistaCss2026ResultAnnouncementHidden', '1')
    } catch {
      // The close control still works when browser storage is unavailable.
    }
  }

  if (!visible) return null

  return (
    <section className="no-print border-b border-amber-200 bg-amber-50/95 text-emerald-950" aria-label="CSS 2026 written result announcement">
      <div className="mx-auto flex min-h-14 max-w-[1520px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
        <span className="shrink-0 rounded-full bg-amber-300 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-amber-950 sm:text-[10px]">
          Just announced
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold sm:text-sm">CSS 2026 Written Result</p>
          <p className="truncate text-[10px] text-emerald-900/75 sm:text-xs">
            {css2026WrittenResult.qualifiedCandidates} candidates qualified · Official result PDF available
          </p>
        </div>
        <Link
          to={css2026WrittenResult.pagePath}
          className="cssv-tap inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-900 px-3 text-[10px] font-bold text-white transition-colors hover:bg-emerald-800 sm:px-4 sm:text-xs"
          aria-label="View the CSS 2026 written result"
        >
          <FileText className="h-3.5 w-3.5" />
          View result
        </Link>
        <a
          href={css2026WrittenResult.pdfUrl}
          download={css2026WrittenResult.downloadFilename}
          className="cssv-tap hidden min-h-9 shrink-0 items-center justify-center rounded-lg border border-emerald-800/20 bg-white px-3 text-xs font-bold text-emerald-900 transition-colors hover:bg-emerald-50 sm:inline-flex"
        >
          Download PDF
        </a>
        <button
          type="button"
          onClick={hideAnnouncement}
          className="cssv-tap grid h-9 w-9 shrink-0 place-items-center rounded-full text-emerald-950/70 transition-colors hover:bg-amber-100 hover:text-emerald-950"
          aria-label="Hide CSS 2026 written result announcement for this session"
          title="Hide announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
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
      import('@/lib/search')
        .then(({ searchSite }) => searchSite(q, 12))
        .then((nextResults) => {
          if (active) setResults(nextResults)
        })
        .catch(() => {
          if (active) setResults([])
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
        src="/images/logo.webp?v=20260909"
        alt="CSS Vista - official logo"
        width="480"
        height="157"
        decoding="async"
        className={className ?? 'h-10 w-auto max-w-[250px] object-contain'}
      />
    </Link>
  )
}

function PrintBranding() {
  return (
    <div className="print-branding" aria-hidden="true">
      <div className="print-brand-header">
        <img src="/images/logo.webp?v=20260909" alt="" width="480" height="157" decoding="async" />
        <div><strong>Official study resource</strong><span>Study · Practice · Progress</span></div>
      </div>
      <img className="print-brand-watermark" src="/images/logo.webp?v=20260909" alt="" width="480" height="157" decoding="async" />
      <div className="print-brand-footer">CSS Vista · Official study resource</div>
    </div>
  )
}

function BackBar({ onBack }: { onBack: () => void }) {
  const location = useLocation()
  if (location.pathname === '/') return null
  return (
    <div className="cssv-page-nav no-print border-b">
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-3 py-2 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="cssv-page-nav-back inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-semibold text-pine shadow-sm transition-colors hover:border-emerald-700/25 hover:bg-emerald-50"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Link to="/" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50">
          <GraduationCap className="h-4 w-4" /> Home
        </Link>
      </div>
    </div>
  )
}

const ROUTE_SCROLL_STORAGE_KEY = 'cssvista:navigation-scroll:v1'
let routeScrollPositions: RouteScrollEntry[] = []
let routeScrollHydrated = false
let lastRouteKey: string | null = null
let lastRoutePathname: string | null = null
let animatedRouteKey: string | null = null
let animatedRouteDirection: 'forward' | 'back' | 'none' = 'none'

function hydrateRouteScrollPositions() {
  if (routeScrollHydrated) return
  routeScrollHydrated = true
  try {
    routeScrollPositions = parseRouteScrollState(window.sessionStorage.getItem(ROUTE_SCROLL_STORAGE_KEY))
  } catch {
    routeScrollPositions = []
  }
}

function persistRouteScrollPositions() {
  try {
    window.sessionStorage.setItem(ROUTE_SCROLL_STORAGE_KEY, JSON.stringify(routeScrollPositions))
  } catch {
    // Private browsing and strict storage policies must not affect navigation.
  }
}

function historyScrollKey(historyIndex: number | null) {
  return historyIndex === null ? null : `history:${historyIndex}`
}

function saveRouteScroll(locationKey: string, position: number, historyIndex: number | null = null) {
  hydrateRouteScrollPositions()
  routeScrollPositions = updateRouteScrollState(routeScrollPositions, locationKey, position)
  const indexedKey = historyScrollKey(historyIndex)
  if (indexedKey) routeScrollPositions = updateRouteScrollState(routeScrollPositions, indexedKey, position)
}

function resolveRouteDirection(locationKey: string, pathname: string, navigationType: 'POP' | 'PUSH' | 'REPLACE') {
  if (animatedRouteKey === locationKey) return animatedRouteDirection
  animatedRouteKey = locationKey
  animatedRouteDirection = lastRouteKey === null || lastRouteKey === locationKey || lastRoutePathname === pathname
    ? 'none'
    : navigationType === 'PUSH'
        ? 'forward'
        : 'none'
  return animatedRouteDirection
}

function fallbackRoute(pathname: string) {
  if (/^\/subjects\/compulsory\/[^/]+\/?$/.test(pathname)) return '/subjects/compulsory'
  if (/^\/past-papers\/view\/[^/]+\/?$/.test(pathname)) return '/past-papers'
  if (pathname === '/css-past-paper-analysis') return '/past-papers'
  if (/^\/gk\/(?:cat\/[^/]+|quiz)\/?$/.test(pathname)) return '/gk'
  if (['/fpsc-syllabus', '/study-planner', '/answer-timer', '/checklists', '/dashboard', '/exam-intelligence'].includes(pathname)) return '/study-tools'
  return '/'
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDrop, setOpenDrop] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const currentRoute = `${location.pathname}${location.search}${location.hash}`
  const currentHistoryIndex = typeof window.history.state?.idx === 'number' ? window.history.state.idx : null
  const initialHistoryIndexRef = useRef(currentHistoryIndex)
  const [releasedRestoreKey, setReleasedRestoreKey] = useState<string | null>(null)
  const restoringRef = useRef<string | null>(null)
  const previousPathnameRef = useRef(location.pathname)
  const previousHashRef = useRef(location.hash)
  const focusPathnameRef = useRef(location.pathname)
  const activeRouteKeyRef = useRef(location.key)
  hydrateRouteScrollPositions()
  const indexedScrollKey = historyScrollKey(currentHistoryIndex)
  const renderSavedPosition = getRouteScrollPosition(routeScrollPositions, location.key)
    ?? (indexedScrollKey ? getRouteScrollPosition(routeScrollPositions, indexedScrollKey) : undefined)
  const renderRestoreMinHeight = navigationType === 'POP'
    && renderSavedPosition !== undefined
    && renderSavedPosition > 0
    && releasedRestoreKey !== location.key
      ? Math.ceil(renderSavedPosition + window.innerHeight)
      : undefined
  const routeDirection = resolveRouteDirection(location.key, location.pathname, navigationType)
  const { user, configured: accountsConfigured } = useAccount()

  useLayoutEffect(() => {
    setMobileOpen(false)
    setOpenDrop(null)
    setSearchOpen(false)
  }, [location.key])
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])
  useLayoutEffect(() => {
    const routeKey = location.key
    let frame = 0
    const isCurrentHistoryEntry = () => {
      const browserIndex = typeof window.history.state?.idx === 'number' ? window.history.state.idx : null
      return activeRouteKeyRef.current === routeKey && browserIndex === currentHistoryIndex
    }
    const capture = () => {
      if (!isCurrentHistoryEntry() || restoringRef.current === routeKey) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => saveRouteScroll(routeKey, window.scrollY, currentHistoryIndex))
    }
    const captureImmediately = () => {
      if (!isCurrentHistoryEntry() || restoringRef.current === routeKey) return
      window.cancelAnimationFrame(frame)
      saveRouteScroll(routeKey, window.scrollY, currentHistoryIndex)
    }
    const captureAndPersist = () => {
      captureImmediately()
      persistRouteScrollPositions()
    }
    if (navigationType !== 'POP') captureImmediately()
    window.addEventListener('scroll', capture, { passive: true })
    window.addEventListener('pagehide', captureAndPersist)
    document.addEventListener('pointerdown', captureImmediately, true)
    document.addEventListener('keydown', captureImmediately, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', capture)
      window.removeEventListener('pagehide', captureAndPersist)
      document.removeEventListener('pointerdown', captureImmediately, true)
      document.removeEventListener('keydown', captureImmediately, true)
    }
  }, [currentHistoryIndex, location.key, navigationType])
  useLayoutEffect(() => {
    activeRouteKeyRef.current = location.key
    lastRouteKey = location.key
    lastRoutePathname = location.pathname
  }, [currentHistoryIndex, location.key, location.pathname])
  useLayoutEffect(() => {
    hydrateRouteScrollPositions()
    const indexedKey = historyScrollKey(currentHistoryIndex)
    const savedPosition = getRouteScrollPosition(routeScrollPositions, location.key)
      ?? (indexedKey ? getRouteScrollPosition(routeScrollPositions, indexedKey) : undefined)
    const intent = resolveScrollIntent({
      navigationType,
      previousPathname: previousPathnameRef.current,
      pathname: location.pathname,
      previousHash: previousHashRef.current,
      hash: location.hash,
      hasSavedPosition: savedPosition !== undefined,
    })
    previousPathnameRef.current = location.pathname
    previousHashRef.current = location.hash

    if (intent === 'preserve') {
      saveRouteScroll(location.key, window.scrollY)
      return
    }

    const target = intent === 'restore' ? savedPosition ?? window.scrollY : 0
    let frame = 0
    let cancelled = false
    const startedAt = performance.now()
    const routeStage = document.querySelector<HTMLElement>('.cssv-route-stage')
    const stageTop = routeStage ? routeStage.getBoundingClientRect().top + window.scrollY : 0
    const requiredStageHeight = Math.max(0, Math.ceil(target + window.innerHeight - stageTop))
    let reservedRestoreHeight = intent === 'restore' && target > 0 && Boolean(routeStage)
    restoringRef.current = location.key
    if (reservedRestoreHeight && routeStage) {
      const renderedMinHeight = Number.parseFloat(routeStage.style.minHeight) || 0
      routeStage.style.minHeight = `${Math.max(requiredStageHeight, renderedMinHeight)}px`
      window.scrollTo({ top: target, left: 0, behavior: 'auto' })
    }
    const releaseRestoreHeight = () => {
      if (!reservedRestoreHeight) return
      reservedRestoreHeight = false
      if (routeStage) routeStage.style.minHeight = ''
      setReleasedRestoreKey(location.key)
    }
    const finishRestore = () => {
      releaseRestoreHeight()
      if (restoringRef.current === location.key) restoringRef.current = null
    }
    const cancelRestore = () => {
      cancelled = true
      finishRestore()
    }

    window.addEventListener('wheel', cancelRestore, { passive: true })
    window.addEventListener('touchstart', cancelRestore, { passive: true })
    window.addEventListener('pointerdown', cancelRestore, { passive: true })
    window.addEventListener('keydown', cancelRestore)

    const restore = () => {
      if (cancelled) return
      if (intent === 'hash' && location.hash) {
        const rawId = location.hash.slice(1)
        let id = rawId
        try { id = decodeURIComponent(rawId) } catch { /* Keep the original hash when malformed. */ }
        const anchor = document.getElementById(id) ?? document.querySelector<HTMLElement>(`[name="${CSS.escape(id)}"]`)
        if (anchor) {
          anchor.scrollIntoView({ block: 'start', behavior: 'auto' })
          finishRestore()
          return
        }
      }
      if (reservedRestoreHeight) {
        const naturalHeight = routeStage?.firstElementChild instanceof HTMLElement
          ? routeStage.firstElementChild.scrollHeight
          : 0
        if (naturalHeight >= requiredStageHeight - 1) {
          releaseRestoreHeight()
          window.scrollTo({ top: target, left: 0, behavior: 'auto' })
          finishRestore()
          return
        }
        window.scrollTo({ top: target, left: 0, behavior: 'auto' })
        if (performance.now() - startedAt < 4000) {
          frame = window.requestAnimationFrame(restore)
        } else {
          finishRestore()
        }
        return
      }
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const reachableTarget = Math.min(target, maximum)
      if (Math.abs(window.scrollY - reachableTarget) > 1) {
        window.scrollTo({ top: reachableTarget, left: 0, behavior: 'auto' })
      }
      const fullyRestored = maximum >= target - 1 && Math.abs(window.scrollY - target) <= 1
      const timeLimit = intent === 'restore' ? 1400 : 360
      if (!fullyRestored && performance.now() - startedAt < timeLimit) {
        frame = window.requestAnimationFrame(restore)
      } else {
        finishRestore()
      }
    }
    restore()

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('wheel', cancelRestore)
      window.removeEventListener('touchstart', cancelRestore)
      window.removeEventListener('pointerdown', cancelRestore)
      window.removeEventListener('keydown', cancelRestore)
      finishRestore()
    }
  }, [currentHistoryIndex, currentRoute, location.hash, location.key, location.pathname, navigationType])
  useEffect(() => {
    const previousPathname = focusPathnameRef.current
    focusPathnameRef.current = location.pathname
    if (navigationType === 'POP' || previousPathname === location.pathname || location.hash) return
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('.cssv-route-stage h1')
      if (!heading) return
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, location.pathname, navigationType])
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
    const openSearchFromPage = () => setSearchOpen(true)
    window.addEventListener('keydown', openSearch)
    window.addEventListener('cssvista:open-search', openSearchFromPage)
    return () => {
      window.removeEventListener('keydown', openSearch)
      window.removeEventListener('cssvista:open-search', openSearchFromPage)
    }
  }, [])

  const goBack = () => {
    if (requestPageBack()) return
    saveRouteScroll(location.key, window.scrollY, currentHistoryIndex)
    persistRouteScrollPositions()
    const historyIndex = typeof window.history.state?.idx === 'number' ? window.history.state.idx : null
    const initialHistoryIndex = initialHistoryIndexRef.current
    if (historyIndex !== null && initialHistoryIndex !== null && historyIndex > initialHistoryIndex) {
      navigate(-1)
      return
    }
    navigate(fallbackRoute(location.pathname), { replace: true })
  }

  return (
    <div className="cssv-site-shell flex min-h-screen flex-col bg-background">
      <RouteSeo />
      <PrintBranding />
      <StudyActivityTracker />
      <NotificationBar />
      {location.pathname !== '/' && <div className="hidden md:block"><NotificationOptInBar /></div>}
      <header className="cssv-site-header sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="cssv-site-header-inner mx-auto flex h-14 max-w-[1520px] items-center gap-1 px-2.5 sm:h-[68px] sm:gap-3 sm:px-6 xl:h-[82px] xl:px-6">
          <div className="hidden xl:block"><SocialLinks compact /></div>

          <button
            className="grid h-9 w-9 place-items-center rounded-lg transition duration-150 ease-out hover:bg-secondary active:scale-95 xl:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 justify-center xl:flex-none">
            <Logo className="h-9 w-auto max-w-[116px] object-contain sm:h-12 sm:max-w-[190px] xl:h-[62px] xl:max-w-[245px]" />
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

          <div className="hidden xl:flex xl:items-center xl:gap-2">
            <Link to="/mentors" className="flex h-9 items-center gap-2 rounded-full border bg-amber-50/60 px-2.5 text-[10px] font-bold text-emerald-950 hover:bg-amber-50" aria-label="About CSS Vista and its mentors">
              <UserCheck className="h-4 w-4 text-emerald-800" />
              <span>About Us</span>
            </Link>
            <Link to="/legal" className="flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 text-[10px] font-bold text-emerald-950 hover:bg-emerald-100" aria-label="Open CSS Vista policies and legal information">
              <ShieldCheck className="h-4 w-4 text-emerald-800" />
              <span>Policies</span>
            </Link>
            <div className="hidden 2xl:block"><SocialLinks /></div>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white text-pine transition-colors hover:bg-secondary sm:h-10 sm:w-10"
            aria-label="Search the entire website"
            aria-expanded={searchOpen}
            title="Search CSS Vista"
          >
            <Search className="h-4 w-4" />
          </button>

          <NotificationCenter />
          <Link
            to="/mentors"
            className="cssv-tap flex h-9 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50/70 px-2 text-[9px] font-extrabold text-emerald-950 transition-colors hover:bg-emerald-100 sm:px-2.5 sm:text-[10px] xl:hidden"
            aria-label="About CSS Vista and its mentors"
          >
            About Us
          </Link>
          <Link
            to={user ? "/account/dashboard" : "/account"}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white text-pine transition-colors hover:bg-secondary sm:flex"
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
            <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
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

      {shouldShowCss2026ResultAnnouncement(location.pathname) && <Css2026ResultAnnouncement />}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 xl:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <aside
        inert={!mobileOpen}
        className={`cssv-glass-drawer fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col shadow-xl will-change-transform transition-[transform,opacity] duration-200 ease-out xl:hidden ${
          mobileOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-full opacity-0'
        }`}
        role="dialog"
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Logo className="h-12 w-auto max-w-[220px] object-contain" />
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-md p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-between border-b px-5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Follow CSS Vista</span>
          <SocialLinks compact />
        </div>
        <nav className="grid grid-cols-3 border-b bg-emerald-50/45 px-3 py-2 text-center text-[11px] font-semibold text-emerald-900" aria-label="Privacy and policy shortcuts">
          <NavLink to="/privacy-policy" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-white">Privacy</NavLink>
          <NavLink to="/cookie-policy" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-white">Cookies</NavLink>
          <NavLink to="/legal" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-white">All policies</NavLink>
        </nav>
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Main categories
            </p>
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

      <main className="flex-1 pb-[calc(200px+env(safe-area-inset-bottom))] md:pb-0">
        <div
          key={location.pathname}
          className={`cssv-route-stage route-transition-${routeDirection}`}
          style={renderRestoreMinHeight ? { minHeight: `${renderRestoreMinHeight}px` } : undefined}
        >
          <Outlet />
        </div>
      </main>

      <DeferredVistaShortcut />

      <nav className="cssv-mobile-nav no-print fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Primary mobile navigation">
        <div className="mx-auto grid h-[62px] max-w-lg grid-cols-5 px-1.5">
          {mobileBottomNav.map((item) => {
            const active = item.paths.some((path) => (
              path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`)
            ))
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`cssv-tap flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-semibold transition-colors ${active ? 'text-emerald-800' : 'text-slate-500'}`}
              >
                <span className={`grid h-7 w-9 place-items-center rounded-full transition-colors ${active ? 'bg-emerald-50' : ''}`}>
                  <item.icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <footer className="cssv-site-footer hidden border-t md:block">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo className="h-12 w-auto object-contain" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{site.tagline}.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Practice</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-pine transition-colors" to="/gk">GK World</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/mpt">MPT Mocks & Preparation</Link></li>
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
              <li><Link className="hover:text-pine transition-colors" to="/test-series">Customized Written Mocks by Ms. Sadia Zahoor</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/dashboard">Performance Dashboard</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/study-planner">My CSS Study Planner</Link></li>
              <li><Link className="hover:text-pine transition-colors" to="/factbook">My Factbook</Link></li>
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
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Sign in to securely keep your study progress available across devices.
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
