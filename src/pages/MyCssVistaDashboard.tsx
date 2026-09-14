import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, Bookmark, Brain, CalendarCheck2,
  Check, CheckCircle2, Clock3, FilePenLine, Flame, Gauge, History, ListChecks,
  RotateCcw, Search, Target, UserRound,
} from 'lucide-react'
import DailyEnglishPanel from '@/components/DailyEnglishPanel'
import { useAccount } from '@/lib/accountContext'
import { getState, getStats, updateStudyScheduleTask, type StudyScheduleTask } from '@/lib/store'
import { getMistakes, getRevisionStats, getStudyAnalytics, recentActivities } from '@/lib/progress'
import { activeStudyTasks, dueStudyTasks, localTaskDateKey, readTaskArchiveState } from '@/lib/myTasks'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { useBriefing } from '@/features/current-affairs/useBriefing'
import { briefingRoot, overviewSchema } from '@/features/current-affairs/model'

function formatStudyTime(seconds: number) {
  if (seconds < 60) return seconds > 0 ? '<1m' : '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function TaskItem({ task, refresh }: { task: StudyScheduleTask; refresh: () => void }) {
  const done = task.status === 'completed'
  function toggle() {
    updateStudyScheduleTask(task.id, { status: done ? 'in-progress' : 'completed' })
    refresh()
  }
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <button type="button" onClick={toggle} className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-slate-500 hover:border-emerald-700 hover:text-emerald-800'}`} aria-label={done ? `Mark ${task.topic} incomplete` : `Mark ${task.topic} complete`}>
        {done ? <Check className="h-4 w-4" /> : <span className="h-2.5 w-2.5 rounded-full border border-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className={`text-sm font-bold ${done ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>{task.topic}</p><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{task.subject}</span></div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500"><span>{dateLabel(task.date)}</span>{task.time && <span>{task.time}</span>}<span>{formatMinutes(task.minutes)}</span></div>
      </div>
    </div>
  )
}

function Metric({ label, value, detail, icon: Icon, warning = false }: { label: string; value: string | number; detail: string; icon: typeof Target; warning?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${warning ? 'text-amber-800' : 'text-emerald-800'}`} /><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">{label}</p></div>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}

interface FpscSyllabusPayload { subjects?: Array<{ sections?: Array<{ items?: string[] }> }> }

export default function MyCssVistaDashboard() {
  const { user } = useAccount()
  const [version, setVersion] = useState(0)
  const [syllabusTotal, setSyllabusTotal] = useState(0)
  const briefing = useBriefing('view=overview', overviewSchema)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  useEffect(() => {
    fetch('/fpsc-syllabus.json')
      .then((response) => response.ok ? response.json() as Promise<FpscSyllabusPayload> : Promise.reject())
      .then((data) => setSyllabusTotal((data.subjects ?? []).reduce((total, subject) => total + (subject.sections ?? []).reduce((sum, section) => sum + (section.items?.length ?? 0), 0), 0)))
      .catch(() => setSyllabusTotal(0))
  }, [])

  const snapshot = useMemo(() => {
    void version
    const state = getState()
    const stats = getStats()
    const study = getStudyAnalytics(7)
    const revision = getRevisionStats()
    const mistakes = getMistakes()
    const activities = recentActivities(8)
    const activeTasks = activeStudyTasks(state.studyScheduleTasks ?? [], readTaskArchiveState())
    const due = dueStudyTasks(activeTasks)
    const mockResults = state.quizResults.filter((result) => result.mockKind === 'gk' || result.mockKind === 'mpt')
    const latestMock = mockResults[0] ?? null
    const syllabusStatuses = Object.values(state.syllabusItemStatuses ?? {})
    const syllabusCompleted = syllabusStatuses.filter((status) => status === 'completed').length
    const syllabusInProgress = syllabusStatuses.filter((status) => status === 'in-progress').length
    const taskCompleted = activeTasks.filter((task) => task.status === 'completed').length
    const taskCompletion = activeTasks.length ? Math.round(taskCompleted / activeTasks.length * 100) : 0
    const unresolvedMistakes = mistakes.filter((mistake) => !mistake.revised).length
    const today = localTaskDateKey()
    const todayAll = activeTasks.filter((task) => task.date === today)
    const todayDone = todayAll.filter((task) => task.status === 'completed')
    const todayPlannedMinutes = todayAll.reduce((sum, task) => sum + task.minutes, 0)
    const todayDoneMinutes = todayDone.reduce((sum, task) => sum + task.minutes, 0)
    const subjectProgress = Object.entries(state.subjectProgress ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8)
    return { state, stats, study, revision, activities, due, activeTasks, mockResults, latestMock, syllabusCompleted, syllabusInProgress, taskCompleted, taskCompletion, unresolvedMistakes, todayAll, todayDone, todayPlannedMinutes, todayDoneMinutes, subjectProgress, totalMistakes: mistakes.length }
  }, [version])

  const syllabusPercent = syllabusTotal ? Math.round(snapshot.syllabusCompleted / syllabusTotal * 100) : 0
  const latestMockPct = snapshot.latestMock ? Math.round(snapshot.latestMock.score / Math.max(1, snapshot.latestMock.total) * 100) : null
  const todayRemaining = snapshot.due.today.filter((task) => task.status !== 'completed')
  const name = (user?.display_name || '').trim().split(/\s+/)[0]
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Karachi' }).format(new Date()))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  function refresh() { setVersion((value) => value + 1) }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-800">My CSS Vista</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{greeting}{name ? `, ${name}` : ''}</h1><p className="mt-1 max-w-2xl text-sm text-slate-600">Your complete preparation account. Tasks, Daily English, Current Affairs and study progress are all here.</p></div>
            <Link to="/account/settings" className="inline-flex min-h-11 items-center gap-3 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800">{user?.photo_complete ? <img src="/api/student/photo-view.php" alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100"><UserRound className="h-4 w-4" /></span>}Profile & Settings</Link>
          </div>
        </header>

        <section id="tasks" className="grid gap-4 xl:grid-cols-[1.35fr_.65fr] scroll-mt-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Today</p><h2 className="mt-1 text-xl font-bold text-slate-950">Your tasks</h2></div><Link to="/study-planner" className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white">Manage schedule / AI import <ArrowRight className="h-4 w-4" /></Link></div>
            {snapshot.due.overdue.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-950"><AlertTriangle className="mr-2 inline h-4 w-4" />{snapshot.due.overdue.length} unfinished task{snapshot.due.overdue.length === 1 ? '' : 's'} carried forward.</div>}
            <div className="mt-4 space-y-2.5">{todayRemaining.length ? todayRemaining.slice(0, 8).map((task) => <TaskItem key={task.id} task={task} refresh={refresh} />) : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" /><p className="mt-2 text-sm font-bold text-slate-900">No unfinished task for today</p><p className="mt-1 text-xs text-slate-500">Your schedule is clear for today.</p></div>}</div>
            {todayRemaining.length > 8 && <Link to="/study-planner" className="mt-3 inline-flex text-xs font-bold text-emerald-800">+ {todayRemaining.length - 8} more tasks</Link>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-950">Today at a glance</h2>
            <div className="mt-4 space-y-3"><div><div className="flex justify-between text-xs"><span className="text-slate-600">Tasks completed</span><strong>{snapshot.todayDone.length}/{snapshot.todayAll.length}</strong></div><div className="mt-1.5"><ProgressBar value={snapshot.todayAll.length ? Math.round(snapshot.todayDone.length / snapshot.todayAll.length * 100) : 0} /></div></div><div className="flex justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-600">Planned study</span><strong>{formatMinutes(snapshot.todayPlannedMinutes)}</strong></div><div className="flex justify-between text-sm"><span className="text-slate-600">Completed study</span><strong>{formatMinutes(snapshot.todayDoneMinutes)}</strong></div><div className="flex justify-between text-sm"><span className="text-slate-600">Revision due</span><strong>{snapshot.revision.due}</strong></div><div className="flex justify-between text-sm"><span className="text-slate-600">Study streak</span><strong>{snapshot.stats.streak} day{snapshot.stats.streak === 1 ? '' : 's'}</strong></div></div>
          </div>
        </section>

        <section id="english" className="scroll-mt-24"><DailyEnglishPanel /></section>

        <section id="progress" className="scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Study progress</p><h2 className="mt-1 text-xl font-bold text-slate-950">Your complete preparation record</h2></div><Link to="/dashboard" className="text-xs font-bold text-emerald-800">Detailed performance <ArrowRight className="inline h-4 w-4" /></Link></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Metric label="MCQs attempted" value={snapshot.stats.attempted.toLocaleString()} detail={`${snapshot.stats.accuracy}% overall accuracy`} icon={Target} />
            <Metric label="Quiz sessions" value={snapshot.stats.totalQuizzes} detail={`${snapshot.stats.avgScore}% average score`} icon={Gauge} />
            <Metric label="Mocks" value={snapshot.mockResults.length} detail={latestMockPct === null ? 'No mock completed yet' : `Latest score ${latestMockPct}%`} icon={BarChart3} />
            <Metric label="Revision due" value={snapshot.revision.due} detail={`${snapshot.revision.mature} items mature`} icon={RotateCcw} warning={snapshot.revision.due > 0} />
            <Metric label="Mistakes" value={snapshot.unresolvedMistakes} detail={`${snapshot.totalMistakes} in mistake history`} icon={AlertTriangle} warning={snapshot.unresolvedMistakes > 0} />
            <Metric label="Study today" value={formatStudyTime(snapshot.study.today.seconds)} detail={`${snapshot.study.today.questions} questions practised`} icon={Clock3} />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">FPSC syllabus</p><h2 className="mt-1 text-lg font-bold text-slate-950">Syllabus progress</h2></div><ListChecks className="h-5 w-5 text-emerald-800" /></div>
            <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-3xl font-bold text-slate-950">{syllabusTotal ? `${syllabusPercent}%` : snapshot.syllabusCompleted}</p><p className="text-xs text-slate-500">{syllabusTotal ? `${snapshot.syllabusCompleted} of ${syllabusTotal} topic lines completed` : `${snapshot.syllabusCompleted} topics completed`}</p></div><Link to="/fpsc-syllabus" className="text-xs font-bold text-emerald-800">Open syllabus</Link></div>
            <div className="mt-3"><ProgressBar value={syllabusPercent} /></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-emerald-50 p-2.5"><strong className="block text-lg text-emerald-900">{snapshot.syllabusCompleted}</strong><span className="text-[10px] text-emerald-800">Completed</span></div><div className="rounded-lg bg-amber-50 p-2.5"><strong className="block text-lg text-amber-900">{snapshot.syllabusInProgress}</strong><span className="text-[10px] text-amber-800">In progress</span></div><div className="rounded-lg bg-slate-50 p-2.5"><strong className="block text-lg text-slate-900">{syllabusTotal ? Math.max(0, syllabusTotal - snapshot.syllabusCompleted - snapshot.syllabusInProgress) : '—'}</strong><span className="text-[10px] text-slate-500">Remaining</span></div></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Your schedule</p><h2 className="mt-1 text-lg font-bold text-slate-950">Task progress</h2></div><CalendarCheck2 className="h-5 w-5 text-emerald-800" /></div>
            <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-3xl font-bold text-slate-950">{snapshot.taskCompletion}%</p><p className="text-xs text-slate-500">{snapshot.taskCompleted} of {snapshot.activeTasks.length} active tasks completed</p></div><Link to="/study-planner" className="text-xs font-bold text-emerald-800">Manage schedule</Link></div>
            <div className="mt-3"><ProgressBar value={snapshot.taskCompletion} /></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-2.5"><strong className="block text-lg">{todayRemaining.length}</strong><span className="text-[10px] text-slate-500">Today</span></div><div className="rounded-lg bg-amber-50 p-2.5"><strong className="block text-lg text-amber-900">{snapshot.due.overdue.length}</strong><span className="text-[10px] text-amber-800">Overdue</span></div><div className="rounded-lg bg-slate-50 p-2.5"><strong className="block text-lg">{snapshot.due.upcoming.length}</strong><span className="text-[10px] text-slate-500">Upcoming</span></div></div>
          </div>
        </section>

        {snapshot.subjectProgress.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Subjects</p><h2 className="mt-1 text-lg font-bold text-slate-950">Subject progress</h2></div><BarChart3 className="h-5 w-5 text-emerald-800" /></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{snapshot.subjectProgress.map(([subject, pct]) => <div key={subject} className="rounded-xl border border-slate-200 p-3.5"><div className="flex justify-between gap-3"><span className="truncate text-sm font-bold text-slate-900">{subject.replace(/-/g, ' ')}</span><strong className="text-sm text-emerald-800">{pct}%</strong></div><div className="mt-2"><ProgressBar value={pct} /></div></div>)}</div></section>}

        <section id="affairs" className="grid gap-4 xl:grid-cols-[1.1fr_.9fr] scroll-mt-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Current Affairs</p><h2 className="mt-1 text-lg font-bold text-slate-950">Daily Affairs Brief</h2></div><BookOpen className="h-5 w-5 text-emerald-800" /></div>
            {briefing.data ? <div className="mt-4"><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-3"><strong className="block text-xl">{briefing.data.summary.total}</strong><span className="text-[10px] text-slate-500">Developments</span></div><div className="rounded-lg bg-amber-50 p-3"><strong className="block text-xl text-amber-900">{briefing.data.summary.unread}</strong><span className="text-[10px] text-amber-800">Unread</span></div><div className="rounded-lg bg-emerald-50 p-3"><strong className="block text-xl text-emerald-900">{Math.max(0, briefing.data.summary.total - briefing.data.summary.unread)}</strong><span className="text-[10px] text-emerald-800">Read</span></div></div><div className="mt-4 flex flex-wrap gap-2"><Link to={briefingRoot} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white">Open Daily Affairs Brief <ArrowRight className="h-4 w-4" /></Link><Link to="/account/factbook" className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700">Daily Factbook</Link><Link to={`${briefingRoot}/archive`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700">Archive</Link></div></div> : <p className="mt-4 text-sm text-slate-500">{briefing.loading ? 'Loading today’s Current Affairs…' : 'Daily Affairs Brief is unavailable right now.'}</p>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Direct access</p><h2 className="mt-1 text-lg font-bold text-slate-950">Your study tools</h2>
            <div className="mt-4 space-y-2">
              <Link to="/mistakes" className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"><span className="inline-flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-amber-700" /><span><strong className="block text-sm">Mistake notebook</strong><small className="text-xs text-slate-500">{snapshot.unresolvedMistakes} unrevised mistakes</small></span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
              <Link to="/answer-writing" className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"><span className="inline-flex items-center gap-3"><FilePenLine className="h-4 w-4 text-emerald-800" /><span><strong className="block text-sm">Answer writing</strong><small className="text-xs text-slate-500">{snapshot.stats.savedAnswers} saved answers</small></span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
              <Link to="/exam-intelligence" className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"><span className="inline-flex items-center gap-3"><Brain className="h-4 w-4 text-emerald-800" /><span><strong className="block text-sm">Exam Intelligence</strong><small className="text-xs text-slate-500">See weak areas and priorities</small></span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
              <Link to="/account/saved" className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"><span className="inline-flex items-center gap-3"><Bookmark className="h-4 w-4 text-emerald-800" /><span><strong className="block text-sm">Saved items</strong><small className="text-xs text-slate-500">{snapshot.stats.bookmarks} saved study items</small></span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
              <Link to="/account/search" className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"><span className="inline-flex items-center gap-3"><Search className="h-4 w-4 text-emerald-800" /><span><strong className="block text-sm">Search My CSS Vista</strong><small className="text-xs text-slate-500">Find saved and Current Affairs material</small></span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Last 7 days</p><h2 className="mt-1 text-lg font-bold text-slate-950">Study activity</h2></div><History className="h-5 w-5 text-emerald-800" /></div>
            <div className="mt-5 grid grid-cols-7 gap-2">{snapshot.study.daily.map((day) => { const max = Math.max(1, ...snapshot.study.daily.map((item) => item.seconds)); const height = day.seconds ? Math.max(12, Math.round(day.seconds / max * 72)) : 4; return <div key={day.date} className="text-center"><div className="flex h-20 items-end rounded-lg bg-slate-50 px-2 pb-1.5"><span className="block w-full rounded-md bg-emerald-700" style={{ height }} /></div><p className="mt-1 text-[10px] font-bold text-slate-600">{day.label.slice(0, 2)}</p><p className="text-[9px] text-slate-400">{day.minutes}m</p></div> })}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] uppercase text-slate-500">7-day study time</p><strong className="mt-1 block text-lg">{formatStudyTime(snapshot.study.currentWeekSeconds)}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] uppercase text-slate-500">Current accuracy</p><strong className="mt-1 block text-lg">{snapshot.study.currentAccuracy}%</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] uppercase text-slate-500">Avg question time</p><strong className="mt-1 block text-lg">{snapshot.study.currentAvgQuestionSeconds ? `${Math.round(snapshot.study.currentAvgQuestionSeconds)}s` : '—'}</strong></div></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Recent learning</p><h2 className="mt-1 text-lg font-bold text-slate-950">Activity history</h2></div><History className="h-5 w-5 text-emerald-800" /></div>
            <div className="mt-4 divide-y divide-slate-100">{snapshot.activities.length ? snapshot.activities.map((activity, index) => <Link key={`${activity.ts}-${index}`} to={activity.path || '#'} className="flex items-start justify-between gap-3 py-3 first:pt-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{activity.label}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{activity.type.replace('-', ' ')}</p></div><span className="shrink-0 text-[10px] text-slate-400">{timeAgo(activity.ts)}</span></Link>) : <p className="py-8 text-center text-xs text-slate-500">Your recent learning activity will appear here.</p>}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
