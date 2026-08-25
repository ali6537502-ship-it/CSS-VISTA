import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Activity, AlertTriangle, ArrowRight, BookOpen, BrainCircuit,
  CalendarClock, CheckCircle2, ChevronDown, ChevronRight, CircleGauge, ClipboardCheck,
  Clock3, Cloud, FileText, Filter, Flag, Gauge, History, Info, Layers3,
  Map, Play, RefreshCcw, Search, ShieldCheck, Sparkles, Target,
  TrendingDown, TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import { useAccount } from '@/lib/accountContext'
import { useExamIntelligence } from '@/hooks/useExamIntelligence'
import {
  buildPersonalStudySession,
  type ExamIntelligenceReport,
  type IntelligenceRecommendation,
  type MasteryStatus,
  type SubjectIntelligence,
  type TrendPoint,
} from '@/lib/examIntelligence'
import { getIntelligencePreferences, updateIntelligencePreferences } from '@/lib/progress'

const sections = [
  ['overview', 'Overview', CircleGauge],
  ['study-now', 'Study Now', Play],
  ['map', 'Preparation Map', Map],
  ['weaknesses', 'Weaknesses', TrendingDown],
  ['revision', 'Revision', RefreshCcw],
  ['mistakes', 'Mistake Bank', AlertTriangle],
  ['mocks', 'Mocks', ClipboardCheck],
  ['progress', 'Progress', TrendingUp],
  ['reports', 'Reports', FileText],
] as const

type SectionId = typeof sections[number][0]
type AccuracyPeriod = 'today' | 'sevenDays' | 'thirtyDays' | 'allTime'
type TrendRange = '7' | '30' | '90' | 'all'

const masteryStyles: Record<MasteryStatus, string> = {
  'Not Started': 'border-slate-200 bg-slate-50 text-slate-600',
  Started: 'border-blue-200 bg-blue-50 text-blue-800',
  Learning: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  'Needs Practice': 'border-orange-200 bg-orange-50 text-orange-800',
  'Needs Revision': 'border-amber-300 bg-amber-50 text-amber-900',
  Strong: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Mastered: 'border-emerald-700 bg-emerald-700 text-white',
}

function pct(value: number | null) {
  return value === null ? 'Not enough data' : `${value}%`
}

function when(value: number | null) {
  if (!value) return 'Not recorded'
  const days = Math.floor((Date.now() - value) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function MetricCard({ label, value, note, to, icon: Icon }: {
  label: string
  value: string
  note: string
  to?: string
  icon: typeof Gauge
}) {
  const body = <>
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-5 w-5" /></span>
    <p className="mt-4 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold tracking-tight text-pine">{value}</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
  </>
  return to
    ? <Link to={to} className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">{body}</Link>
    : <article className="rounded-2xl border bg-white p-4 shadow-sm">{body}</article>
}

function ReadinessGauge({ value }: { value: number | null }) {
  return <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: value === null ? '#eef2ef' : `conic-gradient(#08795a ${value * 3.6}deg, #e6ece8 0deg)` }} role="img" aria-label={value === null ? 'Readiness not available yet' : `VISTA Readiness Score ${value} percent`}>
    <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
      <div><p className="text-3xl font-bold text-pine">{value === null ? '—' : `${value}%`}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{value === null ? 'Building' : 'Prepared'}</p></div>
    </div>
  </div>
}

function ConfidenceNotice({ report }: { report: ExamIntelligenceReport }) {
  return <div className={`flex items-start gap-3 rounded-xl border p-3 text-xs leading-5 ${report.confidence === 'limited' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}>
    <Info className="mt-0.5 h-4 w-4 shrink-0" />
    <div><strong className="capitalize">{report.confidence} confidence.</strong> {report.confidenceMessage}</div>
  </div>
}

function RecommendationCard({ item, onIgnore }: { item: IntelligenceRecommendation; onIgnore(item: IntelligenceRecommendation): void }) {
  return <article className="rounded-xl border bg-white p-4">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><Target className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{item.kind.replace('-', ' ')}</p><h3 className="mt-1 font-bold text-pine">{item.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div>
    </div>
    <details className="mt-3 rounded-lg bg-secondary/50 px-3 py-2 text-xs"><summary className="cursor-pointer font-bold text-pine">Why this is recommended</summary><p className="mt-2 leading-5 text-muted-foreground">{item.why}</p></details>
    <div className="mt-3 flex flex-wrap gap-2"><Link to={item.route} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-pine px-4 text-xs font-bold text-white">Start <ArrowRight className="h-3.5 w-3.5" /></Link><button type="button" onClick={() => onIgnore(item)} className="min-h-10 rounded-lg border px-3 text-xs font-bold text-slate-600">Ignore recommendation</button></div>
  </article>
}

function ProgressBar({ value, label }: { value: number | null; label: string }) {
  return <div><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-pine">{label}</span><span className="text-muted-foreground">{pct(value)}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-emerald-700 transition-[width]" style={{ width: `${value ?? 0}%` }} /></div></div>
}

function PreparationSubject({ subject, onFocus, onReduce, onPauseTopic, onScheduleTopic }: {
  subject: SubjectIntelligence
  onFocus(): void
  onReduce(): void
  onPauseTopic(topic: string): void
  onScheduleTopic(topic: string): void
}) {
  const [open, setOpen] = useState(false)
  return <article className="overflow-hidden rounded-xl border bg-white">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 p-4 text-left">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-pine">{subject.subject}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${masteryStyles[subject.mastery]}`}>{subject.mastery}</span></div><p className="mt-1 text-xs text-muted-foreground">{subject.attempts} attempts · {subject.completedTopics}/{subject.syllabusTopics || 0} syllabus topics complete</p></div>
      <div className="w-20 shrink-0"><ProgressBar value={subject.readiness} label="Ready" /></div><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="border-t bg-secondary/15 p-4">
      <div className="grid gap-3 sm:grid-cols-4"><div><p className="text-[10px] uppercase text-muted-foreground">Accuracy</p><p className="mt-1 font-bold text-pine">{pct(subject.accuracy)}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Last activity</p><p className="mt-1 font-bold text-pine">{when(subject.lastAttemptAt)}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Mistakes</p><p className="mt-1 font-bold text-pine">{subject.mistakes}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Recommended</p><p className="mt-1 font-bold text-pine">{subject.recommendation}</p></div></div>
      <div className="mt-4 grid gap-2">{subject.topics.slice(0, 30).map((topic) => <div key={topic.id} className="rounded-lg border bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-pine">{topic.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{topic.attempts} attempts · {pct(topic.accuracy)} accuracy · last studied {when(topic.lastAttemptAt)}</p></div><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${masteryStyles[topic.mastery]}`}>{topic.mastery}</span></div><div className="mt-2 flex flex-wrap gap-2"><Link to={`/gk/quiz?mode=weak&n=20&topic=${encodeURIComponent(topic.name)}&subject=${encodeURIComponent(subject.subject)}`} className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800">Practice now</Link><button type="button" onClick={() => onScheduleTopic(topic.name)} className="rounded-md border px-2.5 py-1.5 text-[11px] font-bold text-slate-600">Schedule revision</button><button type="button" onClick={() => onPauseTopic(topic.name)} className="rounded-md border px-2.5 py-1.5 text-[11px] font-bold text-slate-600">Mark temporarily completed</button><Link to={`/factbook?quick-add=1&title=${encodeURIComponent(topic.name)}&subject=${encodeURIComponent(subject.subject)}`} className="rounded-md border px-2.5 py-1.5 text-[11px] font-bold text-slate-600">Add to My Factbook</Link></div></div>)}</div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onFocus} className="min-h-10 rounded-lg bg-pine px-3 text-xs font-bold text-white">Focus more on this subject</button><button type="button" onClick={onReduce} className="min-h-10 rounded-lg border px-3 text-xs font-bold text-slate-600">Reduce priority</button></div>
    </div>}
  </article>
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const maximum = Math.max(1, ...points.map((point) => point.attempts))
  return <div className="rounded-xl border bg-white p-4" role="img" aria-label={`Question attempts across ${points.length} days`}>
    {points.some((point) => point.attempts) ? <><div className="flex h-48 items-end gap-1" aria-hidden="true">{points.map((point) => <div key={point.date} className="group relative flex min-w-0 flex-1 flex-col justify-end"><div className="rounded-t bg-emerald-600 transition-colors group-hover:bg-emerald-800" style={{ height: `${Math.max(point.attempts ? 4 : 0, point.attempts / maximum * 100)}%` }} /><span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-pine px-2 py-1 text-[10px] text-white group-hover:block">{point.label}: {point.attempts} · {pct(point.accuracy)}</span></div>)}</div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></div></> : <p className="py-16 text-center text-sm text-muted-foreground">No attempts exist in this period.</p>}
    <p className="sr-only">{points.filter((point) => point.attempts).map((point) => `${point.label}: ${point.attempts} attempts at ${pct(point.accuracy)} accuracy`).join('. ') || 'No attempts.'}</p>
  </div>
}

function LoadingDashboard() {
  return <div className="mx-auto max-w-7xl space-y-4 px-4 py-8" role="status" aria-label="Preparing Exam Intelligence"><div className="h-36 animate-pulse rounded-2xl bg-secondary" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-secondary" />)}</div></div>
}

export default function ExamIntelligence() {
  const [params, setParams] = useSearchParams()
  const requestedSection = params.get('section') as SectionId | null
  const section: SectionId = sections.some(([id]) => id === requestedSection) ? requestedSection! : 'overview'
  const { report, loading, error, retry, refresh } = useExamIntelligence()
  const { user, syncStatus } = useAccount()
  const [accuracyPeriod, setAccuracyPeriod] = useState<AccuracyPeriod>('sevenDays')
  const [duration, setDuration] = useState(60)
  const [customDuration, setCustomDuration] = useState('')
  const [studySession, setStudySession] = useState(() => buildPersonalStudySession(report, 60))
  const [query, setQuery] = useState('')
  const [mastery, setMastery] = useState<'all' | MasteryStatus>('all')
  const [trendRange, setTrendRange] = useState<TrendRange>('30')

  const visibleSubjects = useMemo(() => report.subjects.filter((subject) => {
    const matchesQuery = !query.trim() || [subject.subject, ...subject.topics.map((topic) => topic.name)].join(' ').toLowerCase().includes(query.trim().toLowerCase())
    const matchesMastery = mastery === 'all' || subject.mastery === mastery || subject.topics.some((topic) => topic.mastery === mastery)
    return matchesQuery && matchesMastery
  }), [mastery, query, report.subjects])
  const trendPoints = trendRange === 'all' ? report.trends : report.trends.slice(-Number(trendRange))

  const updatePreferences = (action: (current: ReturnType<typeof getIntelligencePreferences>) => Partial<ReturnType<typeof getIntelligencePreferences>>) => {
    const current = getIntelligencePreferences()
    updateIntelligencePreferences(action(current))
    refresh()
  }
  const ignoreRecommendation = (item: IntelligenceRecommendation) => updatePreferences((current) => ({ ignoredRecommendations: [...current.ignoredRecommendations, item.id] }))
  const focusSubject = (subject: string) => updatePreferences((current) => ({ focusSubjects: [...current.focusSubjects.filter((item) => item !== subject), subject], reducedSubjects: current.reducedSubjects.filter((item) => item !== subject) }))
  const reduceSubject = (subject: string) => updatePreferences((current) => ({ reducedSubjects: [...current.reducedSubjects.filter((item) => item !== subject), subject], focusSubjects: current.focusSubjects.filter((item) => item !== subject) }))
  const pauseTopic = (topic: string) => updatePreferences((current) => ({ pausedTopics: [...current.pausedTopics.filter((item) => item !== topic), topic] }))
  const scheduleTopic = (subject: string, topic: string) => updatePreferences((current) => ({ customRevisionDue: { ...current.customRevisionDue, [`${subject}::${topic}`]: Date.now() } }))

  const generate = (value = duration) => {
    const next = Math.max(10, Math.min(480, value))
    setDuration(next)
    setStudySession(buildPersonalStudySession(report, next))
  }

  return <div>
    <PageHeader title="VISTA Exam Intelligence" description="Your Personal Preparation Command Center" />
    {loading && !report.hasActivity ? <LoadingDashboard /> : <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-[linear-gradient(135deg,#ffffff_0%,#eef8f3_72%,#fff8e8_100%)] p-5 shadow-lg shadow-emerald-950/5 sm:p-7" aria-labelledby="intelligence-action-title">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-amber-700">Personal preparation intelligence</p><h2 id="intelligence-action-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-pine sm:text-4xl">What should I study now?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Recommendations use your recorded attempts, mistakes, revision schedule, syllabus progress, mock results and planner—not random scores.</p><div className="mt-4 flex flex-wrap gap-2">{[15, 30, 60, 90, 120].map((minutes) => <button key={minutes} type="button" onClick={() => { setParams({ section: 'study-now' }); generate(minutes) }} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${duration === minutes ? 'border-pine bg-pine text-white' : 'bg-white text-pine'}`}>{minutes < 60 ? `${minutes} Minutes` : minutes === 60 ? '60 Minutes' : minutes === 90 ? '90 Minutes' : '2 Hours'}</button>)}</div></div>
          <ReadinessGauge value={report.readiness} />
        </div>
        <div className="mt-5"><ConfidenceNotice report={report} /></div>
      </section>

      {!user && <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><Cloud className="mt-0.5 h-4 w-4 shrink-0" /><p>This private analysis is currently stored in this browser. Sign in to keep it available across supported devices.</p></div><Link to="/account?returnTo=/exam-intelligence" className="shrink-0 rounded-lg bg-pine px-4 py-2 text-center text-xs font-bold text-white">Sign in and sync</Link></div>}
      {user && <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-700" /><span>Your preparation intelligence is private to your account. {syncStatus === 'syncing' ? 'Cloud sync is in progress.' : 'Signed-in progress is included in secure account sync.'}</span></div>}
      {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><span>Preparation analytics are partially unavailable. Your study data remains safe. {error}</span><button type="button" onClick={retry} className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-bold">Retry</button></div>}

      <nav className="no-print flex flex-wrap gap-1.5 rounded-2xl border bg-white p-2 shadow-sm" aria-label="Exam Intelligence sections">{sections.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setParams({ section: id })} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ${section === id ? 'bg-pine text-white' : 'text-slate-600 hover:bg-secondary'}`} aria-current={section === id ? 'page' : undefined}><Icon className="h-4 w-4" /> {label}</button>)}</nav>

      {!report.hasActivity && <section className="rounded-2xl border bg-white p-6 text-center sm:p-10"><Sparkles className="mx-auto h-9 w-9 text-amber-600" /><h2 className="mt-3 font-display text-2xl font-bold text-pine">Build Your Preparation Profile</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Exam Intelligence improves as you study and practice. No score, weakness or historical trend is shown until your activity provides enough evidence.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link to="/gk/quiz?mode=random&n=20" className="rounded-lg bg-pine px-5 py-3 text-sm font-bold text-white">Start Diagnostic Assessment</Link><Link to="/start-css" className="rounded-lg border px-5 py-3 text-sm font-bold text-pine">Begin Studying</Link></div></section>}

      {section === 'overview' && <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Preparation snapshot">
          <MetricCard icon={Layers3} label="Syllabus Coverage" value={pct(report.syllabusCoverage)} note={`${report.syllabus.practiced} practiced · ${report.syllabus.notStarted} not started`} to="/exam-intelligence?section=map" />
          <MetricCard icon={Gauge} label="Overall Accuracy" value={pct(report.accuracy[accuracyPeriod])} note="Calculated only from recorded question attempts" />
          <MetricCard icon={CalendarClock} label="Revision Due" value={`${report.revisionQueue.reduce((sum, item) => sum + item.dueCount, 0)} items`} note="Scheduled by spaced revision" to="/exam-intelligence?section=revision" />
          <MetricCard icon={AlertTriangle} label="Mistakes Pending Review" value={`${report.pendingMistakes}`} note={`${report.resolvedMistakes} resolved after repeated correct retries`} to="/mistakes" />
          <MetricCard icon={TrendingDown} label="Weakest Reliable Area" value={report.weakest ? `${report.weakest.subject} · ${pct(report.weakest.accuracy)}` : 'Not enough data'} note="Requires at least five recorded attempts" to={report.weakest ? '/exam-intelligence?section=weaknesses' : undefined} />
          <MetricCard icon={TrendingUp} label="Strongest Reliable Area" value={report.strongest ? `${report.strongest.subject} · ${pct(report.strongest.accuracy)}` : 'Not enough data'} note="Compared only with your own activity" />
          <MetricCard icon={Activity} label="Study Consistency" value={`${report.currentStudyStreak} day streak`} note={`${report.activeStudyDays} active days · quality remains primary`} />
          <MetricCard icon={ClipboardCheck} label="Tests Completed" value={`${report.testsCompleted}`} note={`${report.mocksCompleted} recorded full mock${report.mocksCompleted === 1 ? '' : 's'}`} to="/exam-intelligence?section=mocks" />
        </section>
        <section className="rounded-2xl border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Accuracy period</p><h2 className="mt-1 font-display text-xl font-bold text-pine">Your measured accuracy</h2></div><div className="flex flex-wrap gap-1">{([['today', 'Today'], ['sevenDays', '7 Days'], ['thirtyDays', '30 Days'], ['allTime', 'All Time']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setAccuracyPeriod(id)} className={`min-h-9 rounded-lg px-3 text-xs font-bold ${accuracyPeriod === id ? 'bg-pine text-white' : 'border bg-white'}`}>{label}</button>)}</div></div><p className="mt-4 text-4xl font-bold text-pine">{pct(report.accuracy[accuracyPeriod])}</p><p className="mt-1 text-xs text-muted-foreground">{report.questionsAttempted} total question attempt{report.questionsAttempted === 1 ? '' : 's'} recorded.</p></section>
        <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Next best actions</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Recommended now</h2></div><button type="button" onClick={() => setParams({ section: 'study-now' })} className="text-xs font-bold text-emerald-800">Build a timed session</button></div><div className="grid gap-3 lg:grid-cols-2">{report.recommendations.slice(0, 4).map((item) => <RecommendationCard key={item.id} item={item} onIgnore={ignoreRecommendation} />)}</div></section>
      </div>}

      {section === 'study-now' && <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Personalized session</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Your {duration}-Minute Study Session</h2><p className="mt-1 text-sm text-muted-foreground">Balanced across the relevant recovery, revision, learning and testing actions available in your data.</p></div><Clock3 className="h-8 w-8 text-emerald-700" /></div><div className="mt-5 flex flex-wrap gap-2">{[15, 30, 60, 90, 120].map((minutes) => <button key={minutes} type="button" onClick={() => generate(minutes)} className={`min-h-10 rounded-lg px-3 text-xs font-bold ${duration === minutes ? 'bg-pine text-white' : 'border'}`}>{minutes} min</button>)}<span className="flex min-h-10 items-center rounded-lg border bg-white"><input type="number" min={10} max={480} value={customDuration} onChange={(event) => setCustomDuration(event.target.value)} placeholder="Custom" aria-label="Custom study duration in minutes" className="h-9 w-24 rounded-l-lg px-3 text-xs outline-none" /><button type="button" onClick={() => generate(Number(customDuration) || 60)} className="h-9 border-l px-3 text-xs font-bold">Build</button></span></div><ol className="mt-6 space-y-3">{studySession.map((item, index) => <li key={`${item.kind}-${index}`} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[76px_1fr_auto] sm:items-center"><span className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-900">{item.minutes} min</span><div><p className="font-bold text-pine">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p></div><Link to={item.route} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-pine px-4 text-xs font-bold text-white">Start <ChevronRight className="h-3.5 w-3.5" /></Link></li>)}</ol></section>}

      {section === 'map' && <section className="space-y-4"><div className="rounded-2xl border bg-white p-4"><div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search subjects and topics</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject, topic or subtopic…" className="h-11 w-full rounded-xl border pl-9 pr-3 text-sm" /></label><label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><select value={mastery} onChange={(event) => setMastery(event.target.value as typeof mastery)} aria-label="Filter by mastery status" className="h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm"><option value="all">All mastery statuses</option>{Object.keys(masteryStyles).map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div></div><div className="grid gap-3">{visibleSubjects.length ? visibleSubjects.map((subject) => <PreparationSubject key={subject.subject} subject={subject} onFocus={() => focusSubject(subject.subject)} onReduce={() => reduceSubject(subject.subject)} onPauseTopic={pauseTopic} onScheduleTopic={(topic) => scheduleTopic(subject.subject, topic)} />) : <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No measured subject or tracked syllabus topic matches these filters.</div>}</div></section>}

      {section === 'weaknesses' && <section className="space-y-4"><div className="rounded-2xl border bg-amber-50 p-4 text-xs leading-5 text-amber-950"><strong>Transparent weakness rule:</strong> an area is not ranked from one or two questions. At least five recorded attempts are required; recent improvement reduces its priority.</div>{report.subjects.filter((subject) => subject.attempts >= 5).sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101)).map((subject, index) => <article key={subject.subject} className="rounded-2xl border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">{index === 0 && (subject.accuracy ?? 100) < 60 ? 'Priority Weakness' : (subject.accuracy ?? 0) < 70 ? 'Needs Practice' : subject.recentAccuracy !== null && subject.previousAccuracy !== null && subject.recentAccuracy > subject.previousAccuracy ? 'Improving' : (subject.accuracy ?? 0) >= 80 ? 'Strong' : 'Stable'}</p><h2 className="mt-1 font-display text-xl font-bold text-pine">{subject.subject}</h2><p className="mt-1 text-sm text-muted-foreground">{subject.attempts} attempts · {pct(subject.accuracy)} accuracy</p></div><span className="text-3xl font-bold text-pine">{pct(subject.accuracy)}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><ProgressBar value={subject.accuracy} label="All-time accuracy" /><ProgressBar value={subject.recentAccuracy} label="Recent accuracy" /></div><div className="mt-4 flex flex-wrap gap-2"><Link to={subject.topics[0] ? `/gk/quiz?mode=weak&topic=${encodeURIComponent(subject.topics[0].name)}` : '/gk/quiz?mode=weak'} className="min-h-10 rounded-lg bg-pine px-4 py-2.5 text-xs font-bold text-white">Practice weak topics</Link><button type="button" onClick={() => focusSubject(subject.subject)} className="min-h-10 rounded-lg border px-3 text-xs font-bold">Focus more</button><button type="button" onClick={() => reduceSubject(subject.subject)} className="min-h-10 rounded-lg border px-3 text-xs font-bold">Reduce priority</button></div></article>)}{!report.subjects.some((subject) => subject.attempts >= 5) && <div className="rounded-2xl border border-dashed p-10 text-center"><BrainCircuit className="mx-auto h-8 w-8 text-emerald-700" /><h2 className="mt-3 font-bold text-pine">No reliable weakness ranking yet</h2><p className="mt-1 text-sm text-muted-foreground">More practice is needed before a reliable assessment can be generated.</p></div>}</section>}

      {section === 'revision' && <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Smart spaced revision</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Today’s Revision</h2><p className="mt-1 text-sm text-muted-foreground">Intervals expand after correct reviews and return earlier after mistakes.</p></div>{report.revisionQueue.length > 0 && <Link to="/gk/quiz?mode=revision" className="rounded-lg bg-pine px-4 py-3 text-xs font-bold text-white">Start All</Link>}</div><div className="grid gap-3">{report.revisionQueue.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.priority === 'Urgent' ? 'bg-red-100 text-red-800' : item.priority === 'High' ? 'bg-amber-100 text-amber-900' : 'bg-secondary text-slate-700'}`}>{item.priority}</span><h3 className="mt-2 font-bold text-pine">{item.subject}</h3><p className="mt-1 text-xs text-muted-foreground">{item.topic} · {item.reason} · previous accuracy {pct(item.previousAccuracy)}</p></div><Link to={item.route} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-xs font-bold text-pine">Start individually <ChevronRight className="h-3.5 w-3.5" /></Link></div></article>)}{!report.revisionQueue.length && <div className="rounded-2xl border border-dashed p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" /><h3 className="mt-3 font-bold text-pine">No revision is due now</h3><p className="mt-1 text-sm text-muted-foreground">Studied questions will enter the 1 → 3 → 7 → 14 → 30 day cycle automatically.</p></div>}</div></section>}

      {section === 'mistakes' && <section className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-2xl border bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Automatic recovery cycle</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">My Mistake Bank</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Incorrect answers are captured automatically. A mistake needs repeated correct retries before it becomes resolved.</p><div className="mt-5 grid grid-cols-2 gap-3"><MetricCard icon={AlertTriangle} label="Pending" value={`${report.pendingMistakes}`} note="Unresolved mistakes" /><MetricCard icon={CheckCircle2} label="Resolved" value={`${report.resolvedMistakes}`} note="Repeated successful retries" /></div><Link to="/mistakes" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-5 text-sm font-bold text-white">Open complete Mistake Bank <ArrowRight className="h-4 w-4" /></Link></div><div className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Recovery Test</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Build a test only from verified questions already captured in your mistake history.</p><div className="mt-4 grid grid-cols-2 gap-2">{[10, 20, 30, 60].map((count) => <Link key={count} to={`/gk/quiz?mode=wrong&n=${count}`} className="rounded-lg border p-3 text-center text-xs font-bold text-pine hover:bg-secondary">{count === 60 ? 'All available' : `${count} Questions`}</Link>)}</div></div></section>}

      {section === 'mocks' && <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Mock intelligence</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Recorded mock performance</h2></div><Link to="/dashboard" className="rounded-lg border px-4 py-2.5 text-xs font-bold text-pine">Open complete mock reports</Link></div>{report.mocksCompleted ? <div className="grid gap-3 sm:grid-cols-3"><MetricCard icon={ClipboardCheck} label="Mocks completed" value={`${report.mocksCompleted}`} note="Permanent attempt record" /><MetricCard icon={TrendingDown} label="Topics to revise" value={report.weakest?.subject ?? 'No reliable weakness'} note="Uses measured subject attempts" /><MetricCard icon={Target} label="Recommended next test" value={report.recommendations.find((item) => item.kind === 'testing')?.title ?? 'Build more history'} note="Balances recent preparation activity" /></div> : <div className="rounded-2xl border border-dashed p-10 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-emerald-700" /><h3 className="mt-3 font-bold text-pine">No completed mock record yet</h3><p className="mt-1 text-sm text-muted-foreground">Your first completed mock establishes the comparison baseline.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Link to="/gk/quiz?mode=pms-mock" className="rounded-lg bg-pine px-4 py-2.5 text-xs font-bold text-white">PMS GK Mock</Link><Link to="/gk/quiz?mode=mpt-mock" className="rounded-lg border px-4 py-2.5 text-xs font-bold text-pine">MPT Mock</Link></div></div>}</section>}

      {section === 'progress' && <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">You vs your previous performance</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">My Progress</h2></div><div className="flex flex-wrap gap-1">{([['7', '7 Days'], ['30', '30 Days'], ['90', '90 Days'], ['all', 'All Time']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setTrendRange(id)} className={`min-h-9 rounded-lg px-3 text-xs font-bold ${trendRange === id ? 'bg-pine text-white' : 'border bg-white'}`}>{label}</button>)}</div></div><TrendChart points={trendPoints} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard icon={History} label="Questions Attempted" value={`${report.questionsAttempted}`} note="Across tracked practice activity" /><MetricCard icon={BookOpen} label="Topics Practiced" value={`${report.syllabus.practiced}`} note="Official syllabus tracker" /><MetricCard icon={RefreshCcw} label="Revisions Completed" value={`${report.revisionsCompleted}`} note="Spaced review history" /><MetricCard icon={Flag} label="Mistakes Resolved" value={`${report.resolvedMistakes}`} note="After repeated correct retries" /></div></section>}

      {section === 'reports' && <section className="space-y-5"><div className="exam-intelligence-report rounded-2xl border bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Personal weekly report</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Your Weekly Preparation Report</h2></div><PrintMenu label="Print report" targetSelector=".exam-intelligence-report" /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Questions Attempted', report.weekly.questions], ['Overall Accuracy', pct(report.weekly.accuracy)], ['Topics Studied', report.weekly.topicsStudied], ['Topics Revised', report.weekly.topicsRevised], ['Mocks Completed', report.weekly.mocks], ['Mistakes Resolved', report.weekly.mistakesResolved]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-secondary/45 p-4"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold text-pine">{value}</p></div>)}</div><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs font-bold text-muted-foreground">Biggest improvement</dt><dd className="mt-1 font-semibold text-pine">{report.weekly.biggestImprovement ?? 'Needs more comparison data'}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Needs attention</dt><dd className="mt-1 font-semibold text-pine">{report.weekly.needsAttention ?? 'No reliable weakness yet'}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Next priority</dt><dd className="mt-1 font-semibold text-pine">{report.weekly.nextPriority ?? 'Begin verified practice'}</dd></div></dl></div><div className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Today You Completed</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[['Questions', report.daily.questions], ['Accuracy', pct(report.daily.accuracy)], ['Topics', report.daily.topics], ['Revision', report.daily.revisions], ['Mistakes reviewed', report.daily.mistakesReviewed], ['Study time', report.daily.studyMinutes ? `${report.daily.studyMinutes} min` : 'Not measured']].map(([label, value]) => <div key={String(label)} className="rounded-lg border p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-bold text-pine">{value}</p></div>)}</div></div>{report.exam ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Exam Countdown Mode</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">{report.exam.daysRemaining} days · {report.exam.stage}</h2><p className="mt-2 text-sm text-muted-foreground">Recommendations adapt gradually to your selected planner examination date: {new Date(`${report.exam.date}T00:00:00`).toLocaleDateString()}.</p><Link to="/study-planner" className="mt-3 inline-flex text-xs font-bold text-emerald-800 underline">Review examination plan</Link></div> : <div className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Exam Countdown Mode</h2><p className="mt-1 text-sm text-muted-foreground">Select your examination date in the Study Planner to adapt recommendations by preparation stage.</p><Link to="/study-planner" className="mt-3 inline-flex rounded-lg border px-3 py-2 text-xs font-bold text-pine">Set exam date</Link></div>}</section>}

      <p className="flex items-start gap-2 rounded-xl border bg-secondary/30 p-3 text-[11px] leading-5 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" /> The VISTA Readiness Score reflects preparation activity and performance on the platform. It is not a prediction or guarantee of examination results.</p>
    </main>}
  </div>
}
