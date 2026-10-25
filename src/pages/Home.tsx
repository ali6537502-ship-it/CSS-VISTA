import { AvailableStudyLink as Link } from '@/features/membership/ProRelease'
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import {
  ArrowRight, BarChart3, BookOpen, CalendarCheck2, ChevronRight,
  CheckCircle2, ClipboardCheck, FileText, Globe2, LibraryBig,
  NotebookPen, PlayCircle, Search, Eye, EyeOff,
  TimerReset, UserPlus, type LucideIcon,
} from 'lucide-react'
import { getState, getStats } from '@/lib/store'
import { getRevisionStats, recentActivities, type Activity } from '@/lib/progress'
import { defaultHomeCards, sortHomeCardsByPriority } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import { buildDailyPlan, localDateKey } from '@/lib/studyPlanner'
import { lazyWithRecovery } from '@/lib/chunkRecovery'
import { scheduleIdleWork } from '@/lib/idle'
import { DailyWidget } from '@/features/daily-pdf/Library'
import { useAccount } from '@/lib/accountContext'
import { MptMockStrip } from '@/components/mpt/MptMockStrip'
import { MPT_HIBERNATED } from '@/lib/featureHibernation'

interface LinkCard {
  title: string
  description: string
  to: string
  icon: LucideIcon
  tone: 'emerald' | 'gold' | 'blue'
}

const quickActions: LinkCard[] = [
  {
    title: 'CSS Study Material',
    description: 'Optional notes, Islamic references & essay roadmap',
    to: '/study-material',
    icon: BookOpen,
    tone: 'emerald',
  },
  {
    title: 'All CSS Subject MCQs',
    description: 'Compulsory & optional banks',
    to: '/css-mcqs',
    icon: LibraryBig,
    tone: 'blue',
  },
  {
    title: 'English Grammar Course',
    description: '30 days · lessons, practice & reference',
    to: '/grammar-course',
    icon: BookOpen,
    tone: 'emerald',
  },
  {
    title: 'CSS Past Paper Analysis',
    description: '3,277 questions mapped topic-wise',
    to: '/css-past-paper-analysis',
    icon: BarChart3,
    tone: 'emerald',
  },
  {
    title: 'CSS MPT',
    description: 'MCQs, timed mocks & review',
    to: '/mpt',
    icon: TimerReset,
    tone: 'gold',
  },
  {
    title: 'GK World',
    description: 'One-liners and category-wise MCQs',
    to: '/gk',
    icon: Globe2,
    tone: 'blue',
  },
]

const featuredServices = [
  {
    eyebrow: 'BY MS. SADIA ZAHOOR',
    title: 'Customized Written Test Series',
    description: 'By Miss Sadia Zahoor, PAS · alternate papers · divided syllabus · printable plan. Written mocks only; MPT mocks remain separate.',
    to: '/test-series',
    action: 'Start customizing',
    icon: ClipboardCheck,
    variant: 'test',
  },
  {
    eyebrow: 'HANDWRITTEN NOTES',
    title: 'Notes by Miss Sadia Zahoor, PAS',
    description: 'Handwritten, annotated preparation for CSS subjects.',
    to: '/handwritten-notes',
    action: 'Explore notes',
    icon: NotebookPen,
    variant: 'handwritten',
  },
  {
    eyebrow: 'CSS NOTES',
    title: 'CSS Notes by Sir Ali Hassan Sargana',
    description: 'Structured examination notes for Current Affairs, Pakistan Affairs, Criminology and Political Science.',
    to: '/notes',
    action: 'View library',
    icon: LibraryBig,
    variant: 'library',
  },
]

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

function openSearch() {
  window.dispatchEvent(new Event('cssvista:open-search'))
}


function HomeHero() {
  const { user } = useAccount()

  return (
    <section
      className="cssv-home-hero cssv-home-hero-poster mt-3"
      aria-labelledby="css-vista-home-title"
    >
      <div className="cssv-home-hero-copy">
        <p className="cssv-home-hero-kicker"><span aria-hidden="true" /> CSS Vista</p>
        <h1 id="css-vista-home-title" className="cssv-home-hero-title">
          Everything you need to prepare. <span>One platform. Completely free.</span>
        </h1>
        <p className="cssv-home-hero-description">
          Your sincere preparation partner for daily Current Affairs, MCQs, past papers, notes, book summaries, mock exams and structured study—all in one place.
        </p>
      </div>
      <div className="cssv-home-account-column">
        <div className="cssv-home-account-heading">
          <span className="cssv-home-account-icon" aria-hidden="true"><UserPlus className="h-5 w-5" /></span>
          <span className="cssv-home-account-status"><i /> Always free</span>
        </div>
        <p className="cssv-home-account-overline">Start your personal workspace</p>
        <h2 className="cssv-home-account-title"><span>Free</span> student account</h2>
        <p className="cssv-home-account-intro">Turn CSS Vista into your own connected preparation dashboard.</p>
        <ul className="cssv-home-account-benefits" aria-label="Free account benefits">
          <li><CheckCircle2 /><span><strong>Continue instantly</strong> from your last question or resource</span></li>
          <li><CheckCircle2 /><span><strong>Access daily Current Affairs</strong> alongside MCQs and study resources</span></li>
          <li><CheckCircle2 /><span><strong>Keep everything together</strong>—planner, progress, bookmarks and mistakes</span></li>
        </ul>
        <Link to={user ? '/account/dashboard' : '/account'} className="cssv-home-account-cta">
          {user ? 'Open my dashboard' : 'Create my free account'} <ArrowRight className="h-4 w-4" />
        </Link>
        {!user && <span className="cssv-home-account-note">No payment required · Private study data</span>}
      </div>
    </section>
  )
}

const ExamIntelligenceHomeCard = lazyWithRecovery(() => import('@/components/ExamIntelligenceHomeCard'))
const VistagramHomePreview = lazyWithRecovery(() => import('@/features/vistagram/HomePreview'))
const TutorialAnnouncement = lazyWithRecovery(() => import('@/components/TutorialAnnouncement'))
const MilestoneCelebration = lazyWithRecovery(() => import('@/components/MilestoneCelebration').then((m) => ({ default: m.MilestoneCelebration })))

function DeferredExamIntelligenceHomeCard({ enabled }: { enabled: boolean }) {
  const markerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!enabled || ready) return undefined
    const marker = markerRef.current
    if (!marker) return undefined

    if (!('IntersectionObserver' in window)) {
      return scheduleIdleWork(() => setReady(true), { timeout: 4_000, fallbackDelay: 2_000 })
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setReady(true)
      observer.disconnect()
    }, { rootMargin: '320px 0px' })

    observer.observe(marker)
    return () => observer.disconnect()
  }, [enabled, ready])

  if (!enabled) return null

  return (
    <div ref={markerRef} className="min-h-px">
      {ready && <Suspense fallback={null}><ExamIntelligenceHomeCard /></Suspense>}
    </div>
  )
}

function DeferredHomeExtras() {
  const markerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return undefined
    const marker = markerRef.current
    if (!marker) return undefined

    if (!('IntersectionObserver' in window)) {
      return scheduleIdleWork(() => setReady(true), { timeout: 5_000, fallbackDelay: 3_500 })
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setReady(true)
      observer.disconnect()
    }, { rootMargin: '120px 0px' })

    observer.observe(marker)
    return () => observer.disconnect()
  }, [ready])

  return (
    <div ref={markerRef} className="min-h-px">
      {ready && (
        <Suspense fallback={null}>
          <TutorialAnnouncement />
        </Suspense>
      )}
    </div>
  )
}

function SectionHeading({
  title,
  eyebrow,
  action,
  to,
  headingId,
  visibility,
}: {
  title: string
  eyebrow?: string
  action?: string
  to?: string
  headingId?: string
  visibility?: { open: boolean; onToggle: () => void; label: string }
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>}
        <h2 id={headingId} className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-slate-900 sm:text-lg">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action && to && (
          <Link to={to} className="cssv-tap inline-flex min-h-9 items-center gap-0.5 rounded-lg px-1.5 text-xs font-bold text-emerald-800">
            {action} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {visibility && <VisibilityToggle {...visibility} />}
      </div>
    </div>
  )
}

function VisibilityToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`cssv-visibility-toggle cssv-tap group inline-flex min-h-9 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[10px] font-extrabold shadow-sm ${open ? 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-900' : 'border-emerald-900 bg-emerald-950 text-white shadow-[0_5px_16px_rgba(6,63,49,0.16)]'}`}
      aria-expanded={open}
      aria-label={`${open ? 'Hide' : 'Show'} ${label}`}
    >
      <span className={`grid h-6 w-6 place-items-center rounded-full ${open ? 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-800' : 'bg-amber-300 text-emerald-950'}`}>
        {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </span>
      {open ? 'Hide' : 'Show'}
    </button>
  )
}

function AnimatedCollapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`cssv-collapsible-panel ${open ? 'is-open' : 'is-closing'}`} aria-hidden={!open}>
      <div className="cssv-collapsible-panel-inner">{children}</div>
    </div>
  )
}


function getContinueProgress(activity: Activity | undefined, stats: ReturnType<typeof getStats>, state: ReturnType<typeof getState>) {
  if (!activity) return 0
  if (/mpt|gk|quiz|five-minute/.test(activity.path)) return stats.accuracy
  const slug = activity.path.split('?')[0].split('/').filter(Boolean).at(-1) ?? ''
  return state.subjectProgress[slug] ?? 0
}

export default function Home() {
  const location = useLocation()
  const { user } = useAccount()
  const [showContinueStudy, setShowContinueStudy] = useState(true)
  const [homeCards, setHomeCards] = useState(defaultHomeCards)
  const initialState = useMemo(() => getState(), [])
  const stats = useMemo(() => getStats(initialState), [initialState])
  const activity = useMemo(() => recentActivities(4)[0], [])
  const revisionStats = useMemo(() => getRevisionStats(), [])
  const today = useMemo(() => localDateKey(), [])
  const completed = initialState.planTaskCompletions?.[today] ?? []
  const plannerSettings = initialState.studyPlanner
  const hasPlanner = Boolean(plannerSettings)
  const todayTasks = useMemo(
    () => plannerSettings
      ? buildDailyPlan(plannerSettings, initialState.subjectProgress, today, revisionStats.due).slice(0, 4)
      : [],
    [initialState.subjectProgress, plannerSettings, revisionStats.due, today],
  )
  const completedCount = todayTasks.filter((task) => completed.includes(task.id)).length
  const [showDailyCelebration, setShowDailyCelebration] = useState(() => {
    if (!todayTasks.length || completedCount !== todayTasks.length) return false
    const milestoneKey = `cssvista:celebrated:daily-plan:${today}`
    if (localStorage.getItem(milestoneKey)) return false
    localStorage.setItem(milestoneKey, '1')
    return true
  })
  const continueProgress = getContinueProgress(activity, stats, initialState)
  const allFeatures = useMemo(
    () => sortHomeCardsByPriority(homeCards
      .filter((card) => (
        card.visible
        && !(MPT_HIBERNATED && (card.to.startsWith('/mpt') || card.id === 'mpt-grand-mock'))
        && card.id !== 'pms-grand-mock'
        && !card.to.includes('mode=pms-mock')
        && card.id !== 'current-affairs'
        && !card.to.includes('/current-affairs')
        && card.id !== 'pakistan-affairs'
        && !card.to.includes('/pakistan-affairs')
        && card.id !== 'trend-analyzer'
        && !card.to.includes('/trend-analyzer')
        && card.id !== 'downloads'
        && !card.to.includes('/downloads')
        && card.id !== 'one-liner-gk'
        && (hasPlanner || card.id !== 'study-planner')
      )))
      .map((card) => card.id === 'book-summaries' ? { ...card, title: '100 Book Summaries' } : card),
    [hasPlanner, homeCards],
  )

  useEffect(() => {
    setShowContinueStudy(true)
  }, [location.key])

  useEffect(() => scheduleIdleWork(() => {
    void import('@/lib/admin')
      .then(({ mergedHomeCards }) => setHomeCards(mergedHomeCards(defaultHomeCards)))
      .catch(() => {
        // The static homepage catalogue remains complete if optional admin content cannot load.
      })
  }, { timeout: 3_000, fallbackDelay: 900 }), [])

  useEffect(() => {
    const restoreDismissedPanels = () => {
        setShowContinueStudy(true)
    }
    window.addEventListener('pageshow', restoreDismissedPanels)
    window.addEventListener('popstate', restoreDismissedPanels)
    return () => {
      window.removeEventListener('pageshow', restoreDismissedPanels)
      window.removeEventListener('popstate', restoreDismissedPanels)
    }
  }, [])

  return (
    <div className="cssv-home min-h-screen pb-4 text-slate-900">
      <div className="mx-auto max-w-[1240px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7">
        <div id="cssv-home-ad-free-top" data-cssv-auto-ad-exclusion="home-top">
          <div
            className="cssv-reveal mb-2 flex w-full flex-col items-center gap-1 text-center text-[11px] leading-tight text-emerald-800 sm:flex-row sm:justify-between sm:gap-2 sm:text-[12px]"
            style={{ '--cssv-delay': '20ms' } as CSSProperties}
            dir="rtl"
            lang="ar"
          >
            <span className="sm:flex-1 sm:truncate">سُبْحَانَ اللهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضٰی نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ</span>
            <span className="sm:flex-1 sm:truncate">اَللّٰهُمَّ صَلِّ عَلٰی مُحَمَّدٍ وَّعَلٰی آلِ مُحَمَّدٍ</span>
            <span className="sm:flex-1 sm:truncate">رَبِّ زِدْنِیْ عِلْمًا</span>
          </div>
          <button
            type="button"
            onClick={openSearch}
            className="cssv-glass-panel cssv-home-search cssv-reveal cssv-tap flex h-11 w-full items-center gap-2.5 rounded-xl border px-3 text-left"
            style={{ '--cssv-delay': '40ms' } as CSSProperties}
            aria-label="Search notes, MCQs, subjects, past papers and more"
          >
            <Search className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-400">Search notes, MCQs, subjects, past papers…</span>
            <span className="hidden rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-bold text-slate-500 sm:block">⌘ K</span>
          </button>

          <HomeHero />
        </div>

        <MptMockStrip className="mt-3" />

        <DailyWidget />

        <Suspense fallback={null}><VistagramHomePreview /></Suspense>

        <section className="cssv-reveal mt-5" style={{ '--cssv-delay': '80ms' } as CSSProperties} aria-labelledby="continue-studying">
          <SectionHeading
            title="Continue studying"
            headingId="continue-studying"
            action="History"
            to="/dashboard"
            visibility={{ open: showContinueStudy, onToggle: () => setShowContinueStudy((current) => !current), label: 'Continue studying panel' }}
          />
          <AnimatedCollapse open={showContinueStudy}>
            <article className="cssv-glass-panel cssv-continue-panel overflow-hidden rounded-2xl border text-slate-900">
              <div className="relative flex min-h-[96px] items-center gap-3 overflow-hidden p-3 sm:p-3.5">
                <div className="cssv-continue-grid absolute inset-0 opacity-40" aria-hidden="true" />
                <div className="cssv-glass-icon relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-emerald-800">
                  {activity?.type === 'past-paper' ? <FileText className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
                </div>
                <div className="relative min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    {activity ? 'Pick up where you stopped' : 'Your first step'}
                  </p>
                  <h3 className="mt-0.5 line-clamp-1 text-[14px] font-bold">
                    {activity?.label || 'Build your CSS preparation roadmap'}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">
                    {activity ? relativeTime(activity.ts) : 'Choose subjects, understand the exam and begin with confidence.'}
                  </p>
                  {continueProgress > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-950/10">
                        <span className="cssv-progress block h-full rounded-full bg-amber-400" style={{ width: `${continueProgress}%` }} />
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800">{continueProgress}%</span>
                    </div>
                  )}
                </div>
                <Link
                  to={activity?.path || '/start-css'}
                  className="cssv-tap relative inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-emerald-900 px-2.5 text-[10px] font-bold text-white shadow-[0_8px_20px_rgba(4,78,52,0.18)]"
                >
                  {activity ? 'Resume' : <>Start<span className="sr-only"> CSS preparation</span></>} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          </AnimatedCollapse>
        </section>

        <DeferredExamIntelligenceHomeCard enabled={Boolean(user)} />

        {hasPlanner && (
          <section className="cssv-reveal mt-3" style={{ '--cssv-delay': '35ms' } as CSSProperties} aria-labelledby="planner-home-card">
            <Link to="/study-planner" className="cssv-glass-panel cssv-tap flex min-h-[68px] items-center gap-3 rounded-xl border p-3">
              <span className="cssv-glass-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-emerald-800"><CalendarCheck2 className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-700">My study planner</span>
                <span id="planner-home-card" className="mt-0.5 block text-[13px] font-bold text-slate-900">{completedCount} of {todayTasks.length} tasks completed today</span>
                <span className="mt-0.5 block truncate text-[9px] text-slate-500">Open today’s syllabus-based plan</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700" />
            </Link>
          </section>
        )}

        <section className="cssv-reveal mt-6" style={{ '--cssv-delay': '120ms' } as CSSProperties} aria-labelledby="quick-access">
          <SectionHeading title="Start preparing" eyebrow="Quick access" />
          <div id="quick-access" className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-2.5">
            {quickActions.filter((item) => !(MPT_HIBERNATED && item.to.startsWith('/mpt'))).map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className={`cssv-glass-panel cssv-quick-card cssv-quick-${item.tone} cssv-tap group flex min-h-[80px] min-w-0 flex-col items-start gap-1.5 rounded-xl border p-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:p-3`}
              >
                <span className="cssv-glass-icon cssv-quick-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9">
                  <item.icon className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${item.title === 'GK World' ? 'cssv-globe' : item.title === 'CSS MPT' ? 'cssv-timer' : ''}`} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold leading-tight text-slate-900 sm:text-[13px]">{item.title}</span>
                  <span className="mt-0.5 block line-clamp-1 text-[8px] leading-tight text-slate-500 sm:text-[10px]">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <DeferredHomeExtras />

        <section className="cssv-reveal mt-6" style={{ '--cssv-delay': '160ms' } as CSSProperties} aria-labelledby="featured-services">
          <SectionHeading title="Featured services" eyebrow="Built for serious preparation" />
          <div id="featured-services" className="grid gap-3 md:grid-cols-3">
            {featuredServices.map((service) => (
              <Link
                key={service.eyebrow}
                to={service.to}
                className="cssv-glass-panel cssv-feature-card cssv-tap group min-w-0 overflow-hidden rounded-2xl border"
              >
                <span className="flex min-w-0 flex-col p-4">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-700">{service.eyebrow}</span>
                  <span className={`mt-2 font-bold leading-snug text-slate-900 ${service.variant === 'test' ? 'text-[19px] tracking-[-0.025em]' : 'text-[15px]'}`}>{service.title}</span>
                  <span className={`mt-1 line-clamp-2 leading-relaxed text-slate-500 ${service.variant === 'test' ? 'text-[10px]' : 'text-[11px]'}`}>{service.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                    {service.action} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="cssv-reveal mt-6" aria-labelledby="all-css-vista-features">
          <SectionHeading title="All CSS Vista features" eyebrow="Everything in one place" />
          <div id="all-css-vista-features" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {allFeatures.map((feature) => {
              const FeatureIcon = cardIcons[feature.icon] ?? BookOpen
              return (
                <Link key={feature.id} to={feature.to} className="cssv-glass-panel cssv-feature-link cssv-tap group flex min-h-[58px] min-w-0 items-center gap-2.5 rounded-xl border p-2.5">
                  <span className="cssv-glass-icon grid h-8 w-8 shrink-0 place-items-center rounded-lg text-emerald-800">
                    <FeatureIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[10px] font-bold leading-tight text-slate-800 sm:text-[11px]">{feature.title}</span>
                    <span className="mt-0.5 line-clamp-1 block text-[8px] text-slate-400 sm:text-[9px]">{feature.desc}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                </Link>
              )
            })}
          </div>
        </section>

      </div>
      {showDailyCelebration && (
        <Suspense fallback={null}>
          <MilestoneCelebration
            open
            title="Today’s preparation is complete"
            description="You finished every task in today’s study plan. Keep the rhythm going tomorrow."
            onClose={() => setShowDailyCelebration(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
