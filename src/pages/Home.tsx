import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight, BarChart3, BookOpen, CalendarCheck2, ChevronRight,
  ClipboardCheck, FileText, Globe2, GraduationCap, LibraryBig,
  NotebookPen, PenLine, PlayCircle, Search, LockKeyhole,
  Target, TimerReset, type LucideIcon,
} from 'lucide-react'
import { DAILY_MOCK_TIME_LABELS, getDailyMockStatus, getState, getStats } from '@/lib/store'
import { getRevisionStats, recentActivities, type Activity } from '@/lib/progress'
import { mergedHomeCards } from '@/lib/admin'
import { defaultHomeCards } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import { SHIPPED_MCQ_TOTAL } from '@/data/mcqMeta'
import {
  buildDailyPlan, defaultStudyPlannerSettings, localDateKey,
} from '@/lib/studyPlanner'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'

interface LinkCard {
  title: string
  description: string
  to: string
  icon: LucideIcon
  tone: 'emerald' | 'gold' | 'blue'
}

const quickActions: LinkCard[] = [
  {
    title: 'Start CSS',
    description: 'Understand the complete journey',
    to: '/start-css',
    icon: GraduationCap,
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
    description: `${Math.round(SHIPPED_MCQ_TOTAL / 1000)}K+ verified MCQs`,
    to: '/gk',
    icon: Globe2,
    tone: 'blue',
  },
]

const featuredServices = [
  {
    eyebrow: 'BY MS. SADIA ZAHOOR',
    title: 'Customized Written Test Series',
    description: 'Alternate papers · divided syllabus · printable plan. Written mocks only; MPT mocks remain separate.',
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
    eyebrow: 'PREMIUM NOTES',
    title: 'Notes by Sir Ali Hassan Sargana',
    description: 'Structured material for CA, PA, Criminology and Political Science.',
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

function SectionHeading({
  title,
  eyebrow,
  action,
  to,
}: {
  title: string
  eyebrow?: string
  action?: string
  to?: string
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>}
        <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-slate-900 sm:text-lg">{title}</h2>
      </div>
      {action && to && (
        <Link to={to} className="cssv-tap inline-flex min-h-10 shrink-0 items-center gap-0.5 px-1 text-xs font-bold text-emerald-800">
          {action} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

const officialExamDates = {
  mpt: {
    label: 'MPT 2027',
    dateLabel: '27 September 2026',
    target: '2026-09-27T09:00:00+05:00',
    source: 'https://www.fpsc.gov.pk/uploads/content/1785753970885_MPT_CE-2027.pdf',
  },
  written: {
    label: 'CSS Written 2027',
    dateLabel: '27 January 2027',
    target: '2027-01-27T09:00:00+05:00',
    source: 'https://www.fpsc.gov.pk/',
  },
} as const

function remainingTime(target: string, now = Date.now()) {
  const difference = Math.max(0, new Date(target).getTime() - now)
  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference / 3_600_000) % 24),
    minutes: Math.floor((difference / 60_000) % 60),
    seconds: Math.floor((difference / 1_000) % 60),
  }
}

function CountdownUnit({ value, label, emphasized = false }: { value: number; label: string; emphasized?: boolean }) {
  const formatted = label === 'days' ? String(value) : String(value).padStart(2, '0')
  return (
    <span className={`min-w-0 rounded-md px-1 py-1.5 text-center ${emphasized ? 'bg-white/10' : 'bg-slate-50'}`}>
      <span key={formatted} className="cssv-countdown-tick block text-[15px] font-black leading-none tabular-nums tracking-[-0.03em] sm:text-[17px]">{formatted}</span>
      <span className="mt-1 block text-[7px] font-bold uppercase tracking-wide opacity-55">{label}</span>
    </span>
  )
}

function ExamCountdown() {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="cssv-reveal mt-3" style={{ '--cssv-delay': '70ms' } as CSSProperties} aria-labelledby="exam-countdown-title">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 id="exam-countdown-title" className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-35 motion-safe:animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>
          Live exam countdowns
        </h2>
        <span className="text-[9px] font-semibold text-slate-400">Official FPSC dates</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(officialExamDates) as Array<keyof typeof officialExamDates>).map((key) => {
          const exam = officialExamDates[key]
          const remaining = remainingTime(exam.target, now)
          const isMpt = key === 'mpt'
          return (
            <a
              key={key}
              href={exam.source}
              target="_blank"
              rel="noopener noreferrer"
              className={`cssv-tap group relative overflow-hidden rounded-xl border p-2.5 shadow-[0_3px_14px_rgba(15,42,32,0.045)] ${isMpt ? 'border-emerald-200 bg-emerald-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              aria-label={`${exam.label} countdown. Exam date ${exam.dateLabel}. Open official source.`}
            >
              <span className={`absolute -right-3 -top-3 h-14 w-14 rounded-full ${isMpt ? 'bg-amber-300/10' : 'bg-emerald-100/70'}`} aria-hidden="true" />
              <span className="relative flex items-start justify-between gap-1">
                <span>
                  <span className={`block text-[9px] font-extrabold uppercase tracking-[0.12em] ${isMpt ? 'text-emerald-200' : 'text-emerald-700'}`}>{exam.label}</span>
                  <span className="mt-0.5 block text-[9px] font-medium opacity-65">{exam.dateLabel}</span>
                </span>
                <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wide ${isMpt ? 'bg-amber-300 text-emerald-950' : 'bg-emerald-50 text-emerald-800'}`}>
                  {isMpt ? 'Next exam' : 'Written'}
                </span>
              </span>
              <time dateTime={exam.target} className={`relative mt-2 grid grid-cols-4 gap-1 ${isMpt ? 'text-white' : 'text-slate-800'}`} aria-hidden="true">
                <CountdownUnit value={remaining.days} label="days" emphasized={isMpt} />
                <CountdownUnit value={remaining.hours} label="hrs" emphasized={isMpt} />
                <CountdownUnit value={remaining.minutes} label="min" emphasized={isMpt} />
                <CountdownUnit value={remaining.seconds} label="sec" emphasized={isMpt} />
              </time>
              <span className="sr-only">
                {remaining.days} days, {remaining.hours} hours, {remaining.minutes} minutes and {remaining.seconds} seconds remaining.
              </span>
              <span className={`relative mt-1.5 flex items-center justify-between text-[8px] font-semibold ${isMpt ? 'text-emerald-100/75' : 'text-slate-400'}`}>
                <span>Updates every second</span>
                <TimerReset className={`cssv-timer h-3.5 w-3.5 ${isMpt ? 'text-amber-300' : 'text-emerald-700'}`} />
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

function DailyGrandMockCard() {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="cssv-reveal mt-3 grid gap-2 sm:grid-cols-2" style={{ '--cssv-delay': '78ms' } as CSSProperties} aria-label="Daily Grand Mocks">
      {(['gk', 'mpt'] as const).map((kind) => {
        const schedule = getDailyMockStatus(kind, new Date(now))
        const target = schedule.live ? schedule.registrationClosesAt : schedule.nextAvailableAt
        const remaining = remainingTime(target, now)
        const body = (
          <div className={`cssv-tap rounded-xl border p-3 shadow-[0_3px_16px_rgba(15,42,32,0.045)] ${schedule.live ? 'border-amber-300 bg-emerald-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
            <div className="flex items-start gap-2.5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${schedule.live ? 'bg-amber-300 text-emerald-950' : 'bg-emerald-50 text-emerald-800'}`}>
                {schedule.live ? <PlayCircle className="h-4.5 w-4.5" /> : <LockKeyhole className="h-4.5 w-4.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[8px] font-extrabold uppercase tracking-[0.14em] ${schedule.live ? 'text-amber-300' : 'text-emerald-700'}`}>
                  {schedule.live ? 'Registration open now' : schedule.completedToday ? 'Completed today' : 'Daily Grand Mock'}
                </span>
                <span className="mt-0.5 block text-[13px] font-bold">{schedule.title}</span>
                <span className={`mt-0.5 block text-[9px] ${schedule.live ? 'text-emerald-100/75' : 'text-slate-500'}`}>{DAILY_MOCK_TIME_LABELS[kind]}</span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <CountdownUnit value={remaining.hours + (remaining.days * 24)} label="hrs" />
              <CountdownUnit value={remaining.minutes} label="min" />
              <CountdownUnit value={remaining.seconds} label="sec" />
            </div>
            <p className={`mt-1.5 text-[8px] ${schedule.live ? 'text-emerald-100/70' : 'text-slate-500'}`}>
              {schedule.live ? 'Time left to enter · finish after registration closes' : 'Countdown to next registration'}
            </p>
          </div>
        )
        return schedule.live ? <Link key={kind} to={schedule.route}>{body}</Link> : <div key={kind}>{body}</div>
      })}
    </section>
  )
}

const resourceTabs = {
  study: [
    { title: 'Past Papers', detail: 'CSS & provincial papers', to: '/past-papers', icon: FileText },
    { title: 'Notes Library', detail: 'Structured study material', to: '/notes', icon: LibraryBig },
    { title: 'Customize Mock Series', detail: 'Written tests by Ms. Sadia', to: '/test-series', icon: ClipboardCheck },
    { title: '100 Book Summaries', detail: 'Essential books made simple', to: '/book-summaries', icon: BookOpen },
  ],
  practice: [
    { title: 'Study Tools', detail: 'Planners, timers & revision', to: '/study-tools', icon: Target },
    { title: 'Answer Writing', detail: 'Daily structured practice', to: '/answer-writing', icon: PenLine },
    { title: '5-Minute Test', detail: 'Quick daily challenge', to: '/five-minute', icon: TimerReset },
    { title: 'Mistake Book', detail: 'Revise weak areas', to: '/mistakes', icon: ClipboardCheck },
  ],
} as const

function ResourceToggle() {
  const [tab, setTab] = useState<keyof typeof resourceTabs>('study')
  return (
    <section className="cssv-reveal mt-5 rounded-2xl border border-slate-200 bg-white p-3" aria-labelledby="home-resource-switch">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-resource-switch" className="text-[15px] font-bold tracking-[-0.02em] text-slate-900">Browse by goal</h2>
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5">
          <button type="button" onClick={() => setTab('study')} className={`cssv-tap min-h-8 rounded-md px-3 text-[10px] font-bold ${tab === 'study' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500'}`} aria-pressed={tab === 'study'}>Study</button>
          <button type="button" onClick={() => setTab('practice')} className={`cssv-tap min-h-8 rounded-md px-3 text-[10px] font-bold ${tab === 'practice' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500'}`} aria-pressed={tab === 'practice'}>Practice</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {resourceTabs[tab].map((item) => (
          <Link key={item.title} to={item.to} className="cssv-tap flex min-h-[60px] items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 hover:bg-emerald-50">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-emerald-800 shadow-sm"><item.icon className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block text-[11px] font-bold text-slate-800">{item.title}</span><span className="mt-0.5 line-clamp-1 block text-[9px] leading-snug text-slate-500">{item.detail}</span></span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function FeatureVisual({ variant, icon: Icon }: { variant: string; icon: LucideIcon }) {
  if (variant === 'test' || variant === 'handwritten') {
    return (
      <div className={`cssv-feature-visual cssv-feature-visual-${variant} flex items-center justify-center`} aria-hidden="true">
        <span className="cssv-visual-orb" />
        <img src="/images/mentor-sadia.jpg" alt="" className="relative z-[2] h-[72%] w-[72%] rounded-2xl border border-white/70 object-cover shadow-lg" />
        <span className="absolute bottom-3 z-[3] rounded-full bg-white/92 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-emerald-900 shadow-sm">Ms. Sadia</span>
      </div>
    )
  }
  return (
    <div className={`cssv-feature-visual cssv-feature-visual-${variant}`} aria-hidden="true">
      <span className="cssv-visual-orb" />
      <span className="cssv-visual-sheet">
        <span />
        <span />
        <span />
      </span>
      <span className="cssv-visual-icon"><Icon /></span>
      <BarChart3 className="cssv-visual-chart" />
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
  const stats = useMemo(() => getStats(), [])
  const activity = useMemo(() => recentActivities(4)[0], [])
  const initialState = useMemo(() => getState(), [])
  const revisionStats = useMemo(() => getRevisionStats(), [])
  const today = useMemo(() => localDateKey(), [])
  const completed = initialState.planTaskCompletions?.[today] ?? []

  const plannerSettings = initialState.studyPlanner ?? defaultStudyPlannerSettings()
  const todayTasks = useMemo(
    () => buildDailyPlan(plannerSettings, initialState.subjectProgress, today, revisionStats.due).slice(0, 4),
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
    () => mergedHomeCards(defaultHomeCards)
      .filter((card) => card.visible && card.id !== 'current-affairs')
      .map((card) => card.id === 'book-summaries' ? { ...card, title: '100 Book Summaries' } : card),
    [],
  )

  return (
    <div className="cssv-home min-h-screen bg-[#f7f6f1] pb-4 text-slate-900">
      <div className="mx-auto max-w-[1240px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7">
        <button
          type="button"
          onClick={openSearch}
          className="cssv-reveal cssv-tap flex h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-left shadow-[0_2px_14px_rgba(15,42,32,0.04)]"
          style={{ '--cssv-delay': '40ms' } as CSSProperties}
          aria-label="Search notes, MCQs, subjects, past papers and more"
        >
          <Search className="h-4 w-4 shrink-0 text-emerald-700" />
          <span className="min-w-0 flex-1 truncate text-[13px] text-slate-400">Search notes, MCQs, subjects, past papers…</span>
          <span className="hidden rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-bold text-slate-500 sm:block">⌘ K</span>
        </button>

        <ExamCountdown />
        <DailyGrandMockCard />

        <section className="cssv-reveal mt-5" style={{ '--cssv-delay': '80ms' } as CSSProperties} aria-labelledby="continue-studying">
          <SectionHeading title="Continue studying" action="History" to="/dashboard" />
          <article className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-[#073f31] text-white shadow-[0_10px_26px_rgba(6,63,49,0.12)]">
            <div className="relative flex min-h-[96px] items-center gap-3 overflow-hidden p-3 sm:p-3.5">
              <div className="cssv-continue-grid absolute inset-0 opacity-40" aria-hidden="true" />
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300 ring-1 ring-white/10">
                {activity?.type === 'past-paper' ? <FileText className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                  {activity ? 'Pick up where you stopped' : 'Your first step'}
                </p>
                <h3 className="mt-0.5 line-clamp-1 text-[14px] font-bold">
                  {activity?.label || 'Build your CSS preparation roadmap'}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-emerald-100/75">
                  {activity ? relativeTime(activity.ts) : 'Choose subjects, understand the exam and begin with confidence.'}
                </p>
                {continueProgress > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                      <span className="cssv-progress block h-full rounded-full bg-amber-400" style={{ width: `${continueProgress}%` }} />
                    </span>
                    <span className="text-[10px] font-bold text-amber-200">{continueProgress}%</span>
                  </div>
                )}
              </div>
              <Link
                to={activity?.path || '/start-css'}
                className="cssv-tap relative inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 text-[10px] font-bold text-emerald-950"
              >
                {activity ? 'Resume' : 'Start'} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        </section>

        <section className="cssv-reveal mt-3" style={{ '--cssv-delay': '105ms' } as CSSProperties} aria-labelledby="planner-home-card">
          <Link to="/study-planner" className="cssv-tap flex min-h-[68px] items-center gap-3 rounded-xl border border-emerald-200/80 bg-white p-3 shadow-[0_3px_16px_rgba(15,42,32,0.04)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><CalendarCheck2 className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-700">My study planner</span>
              <span id="planner-home-card" className="mt-0.5 block text-[13px] font-bold text-slate-900">{completedCount} of {todayTasks.length} tasks completed today</span>
              <span className="mt-0.5 block truncate text-[9px] text-slate-500">Open today’s syllabus-based plan</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700" />
          </Link>
        </section>

        <section className="cssv-reveal mt-6" style={{ '--cssv-delay': '120ms' } as CSSProperties} aria-labelledby="quick-access">
          <SectionHeading title="Start preparing" eyebrow="Quick access" />
          <div id="quick-access" className="grid grid-cols-3 gap-2 lg:gap-2.5">
            {quickActions.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className={`cssv-quick-card cssv-quick-${item.tone} cssv-tap group flex min-h-[80px] min-w-0 flex-col items-start gap-1.5 rounded-xl border bg-white p-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:p-3`}
              >
                <span className="cssv-quick-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9">
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

        <ResourceToggle />

        <section className="cssv-reveal mt-6" style={{ '--cssv-delay': '160ms' } as CSSProperties} aria-labelledby="featured-services">
          <SectionHeading title="Featured services" eyebrow="Built for serious preparation" />
          <div id="featured-services" className="cssv-feature-track -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 sm:-mx-5 sm:px-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {featuredServices.map((service) => (
              <Link
                key={service.eyebrow}
                to={service.to}
                className="cssv-feature-card cssv-tap group grid min-w-[84%] snap-center grid-cols-[1.15fr_.85fr] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_24px_rgba(15,42,32,0.055)] sm:min-w-[58%] lg:min-w-0"
              >
                <span className="flex min-w-0 flex-col p-4 pr-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-700">{service.eyebrow}</span>
                  <span className={`mt-2 font-bold leading-snug text-slate-900 ${service.variant === 'test' ? 'text-[19px] tracking-[-0.025em]' : 'text-[15px]'}`}>{service.title}</span>
                  <span className={`mt-1 line-clamp-2 leading-relaxed text-slate-500 ${service.variant === 'test' ? 'text-[10px]' : 'text-[11px]'}`}>{service.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                    {service.action} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
                <FeatureVisual variant={service.variant} icon={service.icon} />
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
                <Link key={feature.id} to={feature.to} className="cssv-tap group flex min-h-[58px] min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 hover:border-emerald-200 hover:bg-emerald-50/45">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-emerald-800 group-hover:bg-white">
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

        <div className="mt-7 flex items-center justify-between gap-3 rounded-xl border border-emerald-900/10 bg-emerald-50/60 px-3.5 py-3 text-[10px] text-emerald-900 md:hidden">
          <span>Progress is saved on this device.</span>
          <Link to="/account" className="font-bold">Sync with account</Link>
        </div>
      </div>
      <MilestoneCelebration
        open={showDailyCelebration}
        title="Today’s preparation is complete"
        description="You finished every task in today’s study plan. Keep the rhythm going tomorrow."
        onClose={() => setShowDailyCelebration(false)}
      />
    </div>
  )
}
