import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight, BookOpen, Bookmark, CalendarCheck2, Check, CheckCircle2,
  History, LayoutDashboard, Newspaper, Settings, Target, Trophy, UserRound,
} from 'lucide-react'
import DailyEnglishPanel from '@/components/DailyEnglishPanel'
import { useAccount } from '@/lib/accountContext'
import { getState, getStats, updateStudyScheduleTask, type StudyScheduleTask } from '@/lib/store'
import { getRevisionStats, getStudyAnalytics, recentActivities } from '@/lib/progress'
import { activeStudyTasks, dueStudyTasks, localTaskDateKey, readTaskArchiveState } from '@/lib/myTasks'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { briefingRoot } from '@/features/current-affairs/model'

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function formatStudyTime(seconds: number) {
  if (seconds < 60) return seconds > 0 ? '<1m' : '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function daysRemaining(examDate?: string) {
  if (!examDate) return null
  const target = new Date(`${examDate}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const diff = target.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

function TaskItem({ task, refresh }: { task: StudyScheduleTask; refresh: () => void }) {
  const done = task.status === 'completed'
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        onClick={() => {
          updateStudyScheduleTask(task.id, { status: done ? 'in-progress' : 'completed' })
          refresh()
        }}
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-slate-500 hover:border-emerald-700 hover:text-emerald-800'}`}
        aria-label={done ? `Mark ${task.topic} incomplete` : `Mark ${task.topic} complete`}
      >
        {done ? <Check className="h-4 w-4" /> : <span className="h-2.5 w-2.5 rounded-full border border-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${done ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>{task.topic}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span>{task.subject}</span>
          {task.time && <span>{task.time}</span>}
          <span>{formatMinutes(task.minutes)}</span>
        </div>
      </div>
    </div>
  )
}

export default function MyCssVistaDashboard() {
  const { user } = useAccount()
  const [version, setVersion] = useState(0)
  const [syllabusTotal, setSyllabusTotal] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  useEffect(() => {
    fetch('/fpsc-syllabus.json')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { subjects?: Array<{ sections?: Array<{ items?: string[] }> }> }) => {
        const total = (data.subjects ?? []).reduce(
          (subjectTotal, subject) => subjectTotal + (subject.sections ?? []).reduce(
            (sectionTotal, section) => sectionTotal + (section.items?.length ?? 0),
            0,
          ),
          0,
        )
        setSyllabusTotal(total)
      })
      .catch(() => setSyllabusTotal(0))
  }, [])

  const snapshot = useMemo(() => {
    void version
    const state = getState()
    const stats = getStats()
    const study = getStudyAnalytics(7)
    const revision = getRevisionStats()
    const activities = recentActivities(6)
    const activeTasks = activeStudyTasks(state.studyScheduleTasks ?? [], readTaskArchiveState())
    const due = dueStudyTasks(activeTasks)
    const today = localTaskDateKey()
    const todayTasks = activeTasks.filter((task) => task.date === today)
    const todayDone = todayTasks.filter((task) => task.status === 'completed')
    const todayMinutes = todayTasks.reduce((sum, task) => sum + task.minutes, 0)
    const mockResults = state.quizResults.filter((result) => result.mockKind === 'gk' || result.mockKind === 'mpt')
    const latestMock = mockResults[0] ?? null
    const statuses = Object.values(state.syllabusItemStatuses ?? {})
    const syllabusCompleted = statuses.filter((status) => status === 'completed').length
    const subjectProgress = Object.entries(state.subjectProgress ?? {})
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
    const savedResources = (state.bookmarks?.length ?? 0) + (state.savedAnswers?.length ?? 0)
    return {
      state, stats, study, revision, activities, due, activeTasks, todayTasks, todayDone,
      todayMinutes, mockResults, latestMock, syllabusCompleted, subjectProgress, savedResources,
    }
  }, [version])

  const syllabusPercent = syllabusTotal ? Math.round((snapshot.syllabusCompleted / syllabusTotal) * 100) : 0
  const examDays = daysRemaining(snapshot.state.studyPlanner?.examDate)
  const targetYear = snapshot.state.studyPlanner?.examDate
    ? new Date(`${snapshot.state.studyPlanner.examDate}T12:00:00`).getFullYear()
    : null
  const latestMockPct = snapshot.latestMock
    ? Math.round((snapshot.latestMock.score / Math.max(1, snapshot.latestMock.total)) * 100)
    : null
  const name = (user?.display_name || '').trim().split(/\s+/)[0]
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Karachi' }).format(new Date()))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayRemaining = snapshot.due.today.filter((task) => task.status !== 'completed')

  const primaryNav = [
    { label: 'Dashboard', to: '/account/dashboard' },
    { label: 'Current Affairs', to: briefingRoot },
    { label: 'My Subjects', to: '/fpsc-syllabus' },
    { label: 'My Mocks', to: '/account/dashboard#mocks' },
    { label: 'Saved', to: '/account/saved' },
    { label: 'Progress', to: '/account/dashboard#progress' },
    { label: 'Planner', to: '/study-planner' },
    { label: 'Settings', to: '/account/settings' },
  ]

  function refresh() {
    setVersion((value) => value + 1)
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
        <header id="dashboard" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 scroll-mt-24">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-800">My CSS Vista</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{greeting}{name ? `, ${name}` : ''}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">Your personal preparation workspace. Keep the dashboard simple; open each specialist area only when you need it.</p>
            </div>
            <Link to="/account/settings" className="inline-flex min-h-11 items-center gap-3 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800">
              {user?.photo_complete
                ? <img src="/api/student/photo-view.php" alt="" className="h-8 w-8 rounded-full object-cover" />
                : <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100"><UserRound className="h-4 w-4" /></span>}
              Profile & Settings
            </Link>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4" aria-label="My CSS Vista primary navigation">
            {primaryNav.map((item) => (
              <Link key={item.label} to={item.to} className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-emerald-700 hover:text-emerald-800">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <section aria-label="Dashboard indicators" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="Target exam" value={targetYear ? `CSS ${targetYear}` : 'Not set'} detail={targetYear ? 'From your planner date' : 'Set an exam date in Planner'} />
          <Metric label="Days remaining" value={examDays ?? '—'} detail={examDays === null ? 'Set your exam date first' : 'Based on your planner date'} />
          <Metric label="Syllabus progress" value={`${syllabusPercent}%`} detail={`${snapshot.syllabusCompleted} topics completed`} />
          <Metric label="Mocks attempted" value={snapshot.mockResults.length} detail={latestMockPct === null ? 'No mock completed yet' : `Latest score ${latestMockPct}%`} />
          <Metric label="Saved resources" value={snapshot.savedResources} detail="Bookmarks and saved answers" />
          <Metric label="Study streak" value={`${snapshot.stats.streak}d`} detail={`${snapshot.stats.accuracy}% overall MCQ accuracy`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article id="affairs" className="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-24">
            <div className="flex items-center gap-2 text-emerald-800"><Newspaper className="h-5 w-5" /><p className="text-[10px] font-extrabold uppercase tracking-[.15em]">Current Affairs</p></div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Daily Affairs Brief</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Read today’s Pakistan and international developments, reports, facts and saved current-affairs material inside your account.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={briefingRoot} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white">Open Current Affairs <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/account/saved" className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700">Saved items</Link>
            </div>
          </article>

          <article id="mocks" className="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-24">
            <div className="flex items-center gap-2 text-emerald-800"><Trophy className="h-5 w-5" /><p className="text-[10px] font-extrabold uppercase tracking-[.15em]">My Mocks</p></div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Mock record</h2>
            <p className="mt-2 text-sm text-slate-600">{snapshot.mockResults.length ? `${snapshot.mockResults.length} mock attempt${snapshot.mockResults.length === 1 ? '' : 's'} recorded.` : 'No mock attempt recorded yet.'}</p>
            {snapshot.latestMock && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Latest result</p><p className="mt-1 text-2xl font-bold text-slate-950">{snapshot.latestMock.score}/{snapshot.latestMock.total} <span className="text-sm font-semibold text-slate-500">({latestMockPct}%)</span></p></div>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/gk/quiz?mode=mpt-mock" className="inline-flex min-h-10 items-center rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white">CSS MPT Mock</Link>
              <Link to="/gk/quiz?mode=pms-mock" className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700">PMS GK Mock</Link>
            </div>
          </article>

          <article id="tasks" className="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-800"><CalendarCheck2 className="h-5 w-5" /><p className="text-[10px] font-extrabold uppercase tracking-[.15em]">Today’s Planner</p></div>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Today’s tasks</h2>
              </div>
              <Link to="/study-planner" className="text-xs font-bold text-emerald-800">Open Planner <ArrowRight className="inline h-4 w-4" /></Link>
            </div>
            <div className="mt-4 space-y-2.5">
              {todayRemaining.length
                ? todayRemaining.slice(0, 5).map((task) => <TaskItem key={task.id} task={task} refresh={refresh} />)
                : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" /><p className="mt-2 text-sm font-bold text-slate-900">No unfinished task for today</p></div>}
            </div>
            <p className="mt-3 text-xs text-slate-500">Planned today: {formatMinutes(snapshot.todayMinutes)} · Completed: {snapshot.todayDone.length}/{snapshot.todayTasks.length}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-emerald-800"><History className="h-5 w-5" /><p className="text-[10px] font-extrabold uppercase tracking-[.15em]">Recent Activity</p></div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Recent learning</h2>
            <div className="mt-4 space-y-3">
              {snapshot.activities.length ? snapshot.activities.slice(0, 5).map((activity, index) => (
                <div key={`${activity.label}-${index}`} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-slate-900">{activity.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(activity.ts).toLocaleString('en-PK')}</p>
                </div>
              )) : <p className="text-sm text-slate-500">Your recent study activity will appear here.</p>}
            </div>
          </article>
        </section>

        <section id="progress" className="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Progress</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Preparation snapshot</h2>
              <p className="mt-1 text-sm text-slate-600">Only the key signals are shown here. Detailed tools stay in their own sections.</p>
            </div>
            <Link to="/exam-intelligence" className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white">Exam Intelligence <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Study today" value={formatStudyTime(snapshot.study.today.seconds)} detail={`${snapshot.study.today.questions} questions practised`} />
            <Metric label="Revision due" value={snapshot.revision.due} detail={`${snapshot.revision.mature} mature revision items`} />
            <Metric label="MCQs attempted" value={snapshot.stats.attempted.toLocaleString()} detail={`${snapshot.stats.accuracy}% accuracy`} />
            <Metric label="Active tasks" value={snapshot.activeTasks.length} detail={`${snapshot.due.overdue.length} overdue`} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-emerald-800"><BookOpen className="h-5 w-5" /><p className="text-[10px] font-extrabold uppercase tracking-[.15em]">My Subjects</p></div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Syllabus & subject progress</h2>
            <div className="mt-4 space-y-3">
              {snapshot.subjectProgress.length ? snapshot.subjectProgress.map(([subject, value]) => (
                <div key={subject}>
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{subject}</span><span>{value}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
                </div>
              )) : <p className="text-sm text-slate-500">Mark topics in the syllabus to build your subject progress.</p>}
            </div>
            <Link to="/fpsc-syllabus" className="mt-4 inline-flex min-h-10 items-center gap-1 text-xs font-bold text-emerald-800">Open My Subjects <ArrowRight className="h-4 w-4" /></Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-emerald-800"><Bookmark className="h-5 w-5" /><p className="text-[10px] font-extrabold uppercase tracking-[.15em]">Saved</p></div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Saved resources</h2>
            <p className="mt-2 text-sm text-slate-600">Keep saved current affairs, bookmarks and answer-writing material in one personal area.</p>
            <p className="mt-4 text-3xl font-bold text-slate-950">{snapshot.savedResources}</p>
            <Link to="/account/saved" className="mt-4 inline-flex min-h-10 items-center gap-1 text-xs font-bold text-emerald-800">Open Saved <ArrowRight className="h-4 w-4" /></Link>
          </article>
        </section>

        <section id="english" className="scroll-mt-24">
          <DailyEnglishPanel />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/fpsc-syllabus" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-700"><BookOpen className="h-5 w-5 text-emerald-800" /><p className="mt-2 font-bold text-slate-950">My Subjects</p><p className="mt-1 text-xs text-slate-500">Syllabus and topic tracking</p></Link>
          <Link to="/study-planner" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-700"><CalendarCheck2 className="h-5 w-5 text-emerald-800" /><p className="mt-2 font-bold text-slate-950">Planner</p><p className="mt-1 text-xs text-slate-500">Today, upcoming and revision tasks</p></Link>
          <Link to="/exam-intelligence" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-700"><Target className="h-5 w-5 text-emerald-800" /><p className="mt-2 font-bold text-slate-950">Exam Intelligence</p><p className="mt-1 text-xs text-slate-500">Weak areas and next study priority</p></Link>
          <Link to="/account/settings" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-700"><Settings className="h-5 w-5 text-emerald-800" /><p className="mt-2 font-bold text-slate-950">Settings</p><p className="mt-1 text-xs text-slate-500">Profile and account settings</p></Link>
        </section>

        <div className="sr-only"><LayoutDashboard /></div>
      </div>
    </main>
  )
}
