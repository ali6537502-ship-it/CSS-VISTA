import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, CheckCircle2, CheckSquare2,
  Clock3, FolderHeart, Languages, ListChecks, RotateCcw, UserRound,
} from 'lucide-react'
import MyCssVistaNav from '@/components/MyCssVistaNav'
import { useAccount } from '@/lib/accountContext'
import { getState, getStats } from '@/lib/store'
import { getRevisionStats } from '@/lib/progress'
import { activeStudyTasks, dueStudyTasks, readTaskArchiveState } from '@/lib/myTasks'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { useBriefing } from '@/features/current-affairs/useBriefing'
import { briefingRoot, overviewSchema } from '@/features/current-affairs/model'

const DAILY_ENGLISH_KEY = 'cssvista:tool:daily-english:v1'

function pakistanDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function dailyEnglishDoneCount() {
  try {
    const raw = localStorage.getItem(DAILY_ENGLISH_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { completed?: Record<string, Record<string, boolean>> }
    const done = parsed.completed?.[pakistanDateKey()] ?? {}
    return Number(Boolean(done.vocab)) + Number(Boolean(done.idioms)) + Number(Boolean(done.pairs))
  } catch {
    return 0
  }
}

function ActionCard({ to, icon: Icon, title, description, status, tone = 'plain' }: {
  to: string
  icon: typeof CheckSquare2
  title: string
  description: string
  status: string
  tone?: 'plain' | 'amber' | 'green'
}) {
  const box = tone === 'amber' ? 'border-amber-200 bg-amber-50' : tone === 'green' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
  const icon = tone === 'amber' ? 'text-amber-800' : 'text-emerald-800'
  return (
    <Link to={to} className={`group block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${box}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><Icon className={`h-5 w-5 ${icon}`} /></span>
          <div className="min-w-0"><h2 className="text-base font-bold text-slate-950">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-800" />
      </div>
      <p className="mt-3 border-t border-black/5 pt-3 text-xs font-bold text-slate-700">{status}</p>
    </Link>
  )
}

export default function MyCssVistaAccountHome() {
  const { user } = useAccount()
  const [version, setVersion] = useState(0)
  const briefing = useBriefing('view=overview', overviewSchema)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const snapshot = useMemo(() => {
    void version
    const state = getState()
    const stats = getStats()
    const revision = getRevisionStats()
    const tasks = activeStudyTasks(state.studyScheduleTasks ?? [], readTaskArchiveState())
    const due = dueStudyTasks(tasks)
    const syllabusStatuses = Object.values(state.syllabusItemStatuses ?? {})
    const syllabusDone = syllabusStatuses.filter((status) => status === 'completed').length
    const syllabusStarted = syllabusStatuses.filter((status) => status === 'in-progress').length
    return { stats, revision, due, syllabusDone, syllabusStarted, englishDone: dailyEnglishDoneCount() }
  }, [user?.id, version])

  const firstName = (user?.display_name || '').trim().split(/\s+/)[0]
  const unfinishedToday = snapshot.due.today.filter((task) => task.status !== 'completed').length
  const greeting = `Welcome${firstName ? `, ${firstName}` : ''}`

  return (
    <main className="min-h-screen bg-slate-50">
      <MyCssVistaNav />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-800">My CSS Vista</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{greeting}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">Everything you need is organised below. Start with Today, then open the section you need.</p>
            </div>
            <Link to="/account/settings" className="inline-flex min-h-11 items-center gap-3 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800">
              {user?.photo_complete ? <img src="/api/student/photo-view.php" alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100"><UserRound className="h-4 w-4" /></span>}
              Profile
            </Link>
          </div>
        </header>

        <section>
          <div className="mb-3"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Start here</p><h2 className="mt-1 text-xl font-bold text-slate-950">Today</h2></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard
              to="/account/tasks"
              icon={CheckSquare2}
              title="My Tasks"
              description="See today’s work, overdue tasks and your complete schedule."
              status={`${unfinishedToday} left today · ${snapshot.due.overdue.length} overdue`}
              tone={snapshot.due.overdue.length ? 'amber' : unfinishedToday === 0 ? 'green' : 'plain'}
            />
            <ActionCard
              to="/account/english"
              icon={Languages}
              title="Daily English"
              description="20 vocabulary words, 5 idioms and 5 pairs of words."
              status={`${snapshot.englishDone}/3 English sections completed today`}
              tone={snapshot.englishDone === 3 ? 'green' : 'plain'}
            />
            <ActionCard
              to={briefingRoot}
              icon={BookOpen}
              title="Daily Affairs Brief"
              description="Today’s Current Affairs, facts and important developments."
              status={briefing.data ? `${briefing.data.summary.unread} unread of ${briefing.data.summary.total}` : briefing.loading ? 'Loading today’s brief…' : 'Open today’s Current Affairs'}
              tone={briefing.data && briefing.data.summary.unread === 0 ? 'green' : 'plain'}
            />
            <ActionCard
              to="/account/progress"
              icon={RotateCcw}
              title="Revision & Progress"
              description="Check revision due, MCQs, mocks, syllabus and study performance."
              status={`${snapshot.revision.due} revision items due`}
              tone={snapshot.revision.due ? 'amber' : 'green'}
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Simple overview</p><h2 className="mt-1 text-lg font-bold text-slate-950">Your preparation</h2></div><BarChart3 className="h-5 w-5 text-emerald-800" /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3.5"><p className="text-[10px] uppercase text-slate-500">MCQ accuracy</p><strong className="mt-1 block text-xl text-slate-950">{snapshot.stats.accuracy}%</strong></div>
              <div className="rounded-xl bg-slate-50 p-3.5"><p className="text-[10px] uppercase text-slate-500">MCQs attempted</p><strong className="mt-1 block text-xl text-slate-950">{snapshot.stats.attempted.toLocaleString()}</strong></div>
              <div className="rounded-xl bg-slate-50 p-3.5"><p className="text-[10px] uppercase text-slate-500">Syllabus completed</p><strong className="mt-1 block text-xl text-slate-950">{snapshot.syllabusDone}</strong><span className="text-[10px] text-slate-500">{snapshot.syllabusStarted} in progress</span></div>
              <div className="rounded-xl bg-slate-50 p-3.5"><p className="text-[10px] uppercase text-slate-500">Study streak</p><strong className="mt-1 block text-xl text-slate-950">{snapshot.stats.streak} day{snapshot.stats.streak === 1 ? '' : 's'}</strong></div>
            </div>
            <Link to="/account/progress" className="mt-4 inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white">See full progress <ArrowRight className="h-4 w-4" /></Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Manage</p><h2 className="mt-1 text-lg font-bold text-slate-950">Quick access</h2>
            <div className="mt-4 space-y-2">
              <Link to="/account/tasks" className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-3.5 text-sm font-bold text-slate-800"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-800" />Create or edit schedule</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
              <Link to="/fpsc-syllabus" className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-3.5 text-sm font-bold text-slate-800"><span className="inline-flex items-center gap-2"><ListChecks className="h-4 w-4 text-emerald-800" />FPSC syllabus tracker</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
              <Link to="/mistakes" className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-3.5 text-sm font-bold text-slate-800"><span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-700" />Mistake notebook</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
              <Link to="/account/library" className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-3.5 text-sm font-bold text-slate-800"><span className="inline-flex items-center gap-2"><FolderHeart className="h-4 w-4 text-emerald-800" />My library</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>
            </div>
          </div>
        </section>

        {unfinishedToday === 0 && snapshot.due.overdue.length === 0 && snapshot.englishDone === 3 && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-950"><CheckCircle2 className="h-5 w-5 shrink-0" />You are caught up with today’s tasks and Daily English.</div>}
      </div>
    </main>
  )
}
