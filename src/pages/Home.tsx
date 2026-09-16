import { Suspense, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import {
  ArrowRight, BarChart3, BookOpen, CalendarCheck2, ChevronRight,
  CheckCircle2, ClipboardCheck, Download, FileText, Globe2, LibraryBig,
  Newspaper, NotebookPen, PlayCircle, Printer, Search, LockKeyhole, Eye, EyeOff,
  TimerReset, UserPlus, type LucideIcon,
} from 'lucide-react'
import { DAILY_MOCK_TIME_LABELS, getDailyMockStatus, getState, getStats } from '@/lib/store'
import { getRevisionStats, recentActivities, type Activity } from '@/lib/progress'
import { mergedHomeCards } from '@/lib/admin'
import { defaultHomeCards, sortHomeCardsByPriority } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import { buildDailyPlan, localDateKey } from '@/lib/studyPlanner'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { lazyWithRecovery } from '@/lib/chunkRecovery'
import { printPdfFile } from '@/components/PrintMenu'
import { weeklyMagazine, weeklyMagazines } from '@/data/weeklyMagazine'
import { css2027Dates, notifications2027 } from '@/data/css2027'
import TutorialAnnouncement from '@/components/TutorialAnnouncement'
import NotesDiscountAnnouncement from '@/components/NotesDiscountAnnouncement'
import { useAccount } from '@/lib/accountContext'

interface LinkCard {
  title: string
  description: string
  to: string
  icon: LucideIcon
  tone: 'emerald' | 'gold' | 'blue'
}

const quickActions: LinkCard[] = [
  {
    title: 'All CSS Subject MCQs',
    description: 'Compulsory & optional banks',
    to: '/css-mcqs',
    icon: LibraryBig,
    tone: 'blue',
  },
  {
    title: 'English Grammar Course',
    description: '30 days · 840 quiz questions',
    to: '/language-grammar?lang=english&view=master-course',
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
      className="cssv-home-hero cssv-home-hero-poster cssv-reveal mt-3"
      style={{ '--cssv-delay': '55ms' } as CSSProperties}
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
    <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 sm:text-[11px]">{eyebrow}</p>}
        <h2 id={headingId} className="mt-0.5 text-[17px] font-extrabold tracking-[-0.025em] text-slate-900 sm:text-xl lg:text-[22px]">{title}</h2>
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

const mpt2027Date = css2027Dates.find((item) => item.id === 'd4')?.date ?? '2026-10-10'
const mpt2027Notice = notifications2027.find((item) => item.id === 'mpt-ce-2027-rescheduled')
const mpt2027DateLabel = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${mpt2027Date}T00:00:00Z`))

const officialExamDates = {
  mpt: {
    label: 'MPT 2027',
    dateLabel: mpt2027DateLabel,
    target: `${mpt2027Date}T00:00:00+05:00`,
    source: mpt2027Notice?.officialUrl ?? 'https://www.fpsc.gov.pk/',
  },
  written: {
    label: 'CSS Written 2027',
    dateLabel: '27 January 2027',
    target: '2027-01-27T00:00:00+05:00',
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

function ExamCountdown({ active = true }: { active?: boolean }) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!active) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  return (
    <section className="cssv-glass-subcard min-w-0 rounded-xl border p-2.5" aria-labelledby="exam-countdown-title">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h3 id="exam-countdown-title" className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.11em] text-slate-600">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-35 motion-safe:animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>
          Official exam dates
        </h3>
        <span className="text-[8px] font-semibold text-slate-400">Updates live</span>
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
              className={`cssv-glass-subcard cssv-countdown-card cssv-tap group relative overflow-hidden rounded-xl border p-2.5 ${isMpt ? 'cssv-countdown-card-primary' : ''}`}
              aria-label={`${exam.label} countdown. Exam date ${exam.dateLabel}. Open official source.`}
            >
              <span className={`absolute -right-3 -top-3 h-14 w-14 rounded-full ${isMpt ? 'bg-amber-300/10' : 'bg-emerald-100/70'}`} aria-hidden="true" />
              <span className="relative flex items-start justify-between gap-1">
                <span>
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-800">{exam.label}</span>
                  <span className="mt-0.5 block text-[9px] font-medium opacity-65">{exam.dateLabel}</span>
                </span>
                <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wide ${isMpt ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                  {isMpt ? 'Next exam' : 'Written'}
                </span>
              </span>
              <time dateTime={exam.target} className="relative mt-2 grid grid-cols-4 gap-1 text-slate-800" aria-hidden="true">
                <CountdownUnit value={remaining.days} label="days" />
                <CountdownUnit value={remaining.hours} label="hrs" />
                <CountdownUnit value={remaining.minutes} label="min" />
                <CountdownUnit value={remaining.seconds} label="sec" />
              </time>
              <span className="sr-only">
                {remaining.days} days, {remaining.hours} hours, {remaining.minutes} minutes and {remaining.seconds} seconds remaining.
              </span>
              <span className="relative mt-1.5 flex items-center justify-between text-[8px] font-semibold text-slate-500">
                <span>Updates every second</span>
                <TimerReset className={`cssv-timer h-3.5 w-3.5 ${isMpt ? 'text-amber-600' : 'text-emerald-700'}`} />
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

function DailyGrandMockCard({ active = true }: { active?: boolean }) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!active) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  return (
    <section className="cssv-glass-subcard cssv-daily-mock rounded-xl border p-2 text-slate-900" aria-labelledby="daily-mock-timers-title">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <h3 id="daily-mock-timers-title" className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-800">Tonight’s mock windows</h3>
        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-bold text-emerald-800">PKT</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
        {(['gk', 'mpt'] as const).map((kind) => {
          const schedule = getDailyMockStatus(kind, new Date(now))
          const target = schedule.live ? schedule.registrationClosesAt : schedule.nextAvailableAt
          const remaining = remainingTime(target, now)
          const totalHours = remaining.hours + (remaining.days * 24)
          const timeValue = `${String(totalHours).padStart(2, '0')}:${String(remaining.minutes).padStart(2, '0')}:${String(remaining.seconds).padStart(2, '0')}`
          const body = (
            <div className={`cssv-glass-subcard cssv-tap min-w-0 rounded-lg border p-2 ${schedule.live ? 'cssv-daily-mock-live text-emerald-950' : 'text-slate-900'}`}>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={`cssv-glass-icon grid h-7 w-7 shrink-0 place-items-center rounded-md ${schedule.live ? 'text-amber-700' : 'text-emerald-800'}`}>
                  {schedule.live ? <PlayCircle className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[7px] font-extrabold uppercase tracking-[0.1em] ${schedule.live ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {schedule.live ? 'Open now' : schedule.completedToday ? 'Completed' : 'Starts in'}
                  </span>
                  <span className="block truncate text-[9px] font-bold leading-tight">{schedule.title.replace(' Grand Mock', '')}</span>
                </span>
              </div>
              <time dateTime={target} className="mt-1.5 block font-mono text-[13px] font-black leading-none tabular-nums tracking-[-0.04em]" aria-label={`${totalHours} hours, ${remaining.minutes} minutes and ${remaining.seconds} seconds`}>
                {timeValue}
              </time>
              <span className="mt-1 block truncate text-[7px] font-semibold text-slate-500">{DAILY_MOCK_TIME_LABELS[kind]}</span>
            </div>
          )
          return schedule.live ? <Link key={kind} to={schedule.route}>{body}</Link> : <div key={kind}>{body}</div>
        })}
      </div>
    </section>
  )
}

function TimerHub({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <section className="cssv-glass-panel cssv-timer-hub cssv-reveal mt-3 rounded-2xl border p-2.5" style={{ '--cssv-delay': '70ms' } as CSSProperties} aria-labelledby="all-countdowns-title">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h2 id="all-countdowns-title" className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-30 motion-safe:animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>
            Live preparation timers
          </h2>
          <p className="mt-0.5 text-[8px] font-medium text-slate-400">{open ? 'Daily mock windows and official exam countdowns' : 'All countdowns are hidden for this view'}</p>
        </div>
        <VisibilityToggle open={open} onToggle={onToggle} label="all preparation timers" />
      </div>
      <AnimatedCollapse open={open}>
        <div className="mt-2 grid items-start gap-2 md:grid-cols-[minmax(190px,0.62fr)_minmax(0,1.38fr)] lg:grid-cols-[minmax(210px,0.55fr)_minmax(0,1.45fr)]">
          <DailyGrandMockCard active={open} />
          <ExamCountdown active={open} />
        </div>
      </AnimatedCollapse>
    </section>
  )
}

function WeeklyMagazineCard() {
  const available = Boolean(weeklyMagazine.pdfUrl)

  return (
    <section className="cssv-reveal mt-6 sm:mt-9 lg:mt-14" aria-labelledby="weekly-magazine-title">
      <SectionHeading title="Weekly Current Affairs Magazine" eyebrow="Read · revise · retain" />
      <article className="cssv-glass-panel relative overflow-hidden rounded-2xl border">
        <div className="grid gap-0 min-[360px]:grid-cols-[minmax(0,1fr)_118px] sm:grid-cols-[minmax(0,1fr)_190px] lg:grid-cols-[minmax(0,1fr)_210px]">
          <div className="min-w-0 p-3.5 pr-2 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="cssv-glass-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-emerald-800">
                <Newspaper className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-700">{weeklyMagazine.issue}</p>
                <h3 id="weekly-magazine-title" className="mt-0.5 text-[16px] font-bold tracking-[-0.02em] text-slate-900">{weeklyMagazine.title}</h3>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500 sm:text-xs">{weeklyMagazine.description}</p>
                {weeklyMagazine.pageCount && <span className="mt-1.5 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-800">{weeklyMagazine.pageCount} pages · Free issue</span>}
              </div>
            </div>
            <ul className="mt-3 hidden gap-1.5 text-[10px] text-slate-600 min-[390px]:grid sm:grid-cols-3">
              {weeklyMagazine.coverage.map((item) => (
                <li key={item} className="flex items-start gap-1.5"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{item}</li>
              ))}
            </ul>
            <div className="no-print mt-4 flex flex-wrap gap-2">
              {available && weeklyMagazine.pdfUrl ? (
                <a href={weeklyMagazine.pdfUrl} download className="cssv-tap inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-900 px-3 text-[10px] font-bold text-white">
                  <Download className="h-3.5 w-3.5" /> Free PDF download
                </a>
              ) : (
                <button type="button" disabled className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[10px] font-bold text-slate-400">
                  <Download className="h-3.5 w-3.5" /> Free PDF · Coming soon
                </button>
              )}
              {available && weeklyMagazine.pdfUrl && <a href={weeklyMagazine.pdfUrl} target="_blank" rel="noopener noreferrer" className="cssv-tap inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-emerald-900"><Eye className="h-3.5 w-3.5" /> View</a>}
              <button
                type="button"
                disabled={!available || !weeklyMagazine.pdfUrl}
                onClick={() => weeklyMagazine.pdfUrl && printPdfFile(weeklyMagazine.pdfUrl)}
                className="cssv-tap inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <Printer className="h-3.5 w-3.5" /> Print magazine
              </button>
            </div>
            <details className="no-print mt-3 rounded-lg border bg-white/70 p-2.5">
              <summary className="cursor-pointer text-[10px] font-bold text-emerald-900">Past weeks magazine archive</summary>
              <div className="mt-2 space-y-2">{weeklyMagazines.map((issue) => <div key={issue.issue} className="flex flex-wrap items-center gap-2 rounded-md bg-secondary/50 p-2 text-[10px]"><time className="mr-auto font-bold text-slate-700" dateTime={issue.publishedDate}>{new Date(`${issue.publishedDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</time>{issue.pdfUrl && <><a href={issue.pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border bg-white px-2 py-1 font-bold text-emerald-800">View</a><a href={issue.pdfUrl} download className="rounded-md border bg-white px-2 py-1 font-bold text-emerald-800">Download</a><button type="button" onClick={() => issue.pdfUrl && printPdfFile(issue.pdfUrl)} className="rounded-md border bg-white px-2 py-1 font-bold text-emerald-800">Print</button></>}</div>)}</div>
            </details>
          </div>
          <div className="relative min-h-[168px] overflow-hidden bg-emerald-950 p-2.5 min-[360px]:min-h-0 sm:min-h-[230px] sm:p-4">
            <span className="absolute -right-12 -top-12 h-36 w-36 rounded-full border border-amber-300/25" aria-hidden="true" />
            <span className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-emerald-700/35" aria-hidden="true" />
            {available && weeklyMagazine.pdfUrl && weeklyMagazine.coverUrl ? (
              <a href={weeklyMagazine.pdfUrl} target="_blank" rel="noopener noreferrer" className="cssv-tap relative grid h-full min-h-[146px] place-items-center overflow-hidden rounded-lg border border-white/20 bg-white shadow-xl min-[360px]:min-h-[176px] sm:min-h-[198px]" aria-label="Open the weekly current affairs journal">
                <img
                  src={weeklyMagazine.coverUrl}
                  srcSet={weeklyMagazine.coverUrl.includes('03-september-2026') ? '/magazines/css-vista-current-affairs-weekly-03-september-2026-240.webp 240w, /magazines/css-vista-current-affairs-weekly-03-september-2026-320.webp 320w, /magazines/css-vista-current-affairs-weekly-03-september-2026-480.webp 480w, /magazines/css-vista-current-affairs-weekly-03-september-2026.webp 900w' : undefined}
                  sizes="(max-width: 639px) 24vw, (max-width: 1023px) 34vw, 320px"
                  alt={`${weeklyMagazine.title}, ${weeklyMagazine.issue} cover`}
                  width="900"
                  height="1273"
                  loading="lazy"
                  decoding="async"
                  className="h-auto max-h-[168px] w-full object-contain object-center min-[360px]:max-h-[210px] sm:max-h-full"
                />
              </a>
            ) : (
              <span className="relative grid h-full place-items-center rounded-lg border border-white/15 bg-white/10 text-[9px] font-black uppercase tracking-[0.18em] text-white">Weekly briefing</span>
            )}
          </div>
        </div>
      </article>
    </section>
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
  const [showTimers, setShowTimers] = useState(true)
  const [showContinueStudy, setShowContinueStudy] = useState(true)
  const stats = useMemo(() => getStats(), [])
  const activity = useMemo(() => recentActivities(4)[0], [])
  const initialState = useMemo(() => getState(), [])
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
    () => sortHomeCardsByPriority(mergedHomeCards(defaultHomeCards)
      .filter((card) => (
        card.visible
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
    [hasPlanner],
  )

  useEffect(() => {
    setShowTimers(true)
    setShowContinueStudy(true)
  }, [location.key])

  useEffect(() => {
    const restoreDismissedPanels = () => {
      setShowTimers(true)
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

        <TimerHub open={showTimers} onToggle={() => setShowTimers((current) => !current)} />

        <WeeklyMagazineCard />

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

        <Suspense fallback={null}><ExamIntelligenceHomeCard /></Suspense>

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

        <section className="cssv-reveal mt-6 sm:mt-9 lg:mt-14" style={{ '--cssv-delay': '120ms' } as CSSProperties} aria-labelledby="quick-access">
          <SectionHeading title="Start preparing" eyebrow="Quick access" />
          <div id="quick-access" className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-2.5">
            {quickActions.map((item) => (
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

        <NotesDiscountAnnouncement />

        <TutorialAnnouncement />

        <section className="cssv-reveal mt-6 sm:mt-9 lg:mt-14" style={{ '--cssv-delay': '160ms' } as CSSProperties} aria-labelledby="featured-services">
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

        <section className="cssv-reveal mt-6 sm:mt-9 lg:mt-14" aria-labelledby="all-css-vista-features">
          <SectionHeading title="All CSS Vista features" eyebrow="Everything in one place" />
          <div id="all-css-vista-features" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {allFeatures.map((feature) => {
              const FeatureIcon = cardIcons[feature.icon] ?? BookOpen
              return (
                <Link key={feature.id} to={feature.to} className="cssv-glass-panel cssv-feature-link cssv-tap group flex min-h-[66px] min-w-0 items-center gap-3 rounded-2xl border p-3">
                  <span className="cssv-glass-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-emerald-800 transition-transform duration-300 group-hover:scale-105">
                    <FeatureIcon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[11px] font-bold leading-tight text-slate-800 sm:text-[12px]">{feature.title}</span>
                    <span className="mt-0.5 line-clamp-1 block text-[9px] text-slate-400 sm:text-[10px]">{feature.desc}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                </Link>
              )
            })}
          </div>
        </section>

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
