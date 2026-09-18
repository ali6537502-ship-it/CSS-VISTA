import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Check, UserRound } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { getState, getStats, updateStudyScheduleTask, type StudyScheduleTask } from '@/lib/store'
import { getRevisionStats, getStudyAnalytics, recentActivities } from '@/lib/progress'
import { activeStudyTasks, dueStudyTasks, localTaskDateKey, readTaskArchiveState } from '@/lib/myTasks'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { AuthenticatedAccountAd } from '@/components/Ads'

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

export function formatStudyTime(seconds: number) {
  if (seconds < 60) return seconds > 0 ? '<1m' : '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

export function daysRemaining(examDate?: string) {
  if (!examDate) return null
  const target = new Date(`${examDate}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86_400_000))
}

/**
 * The account pages all read the same local study state. Reading it once here
 * keeps the four pages consistent and means a change recorded anywhere in the
 * app refreshes every one of them.
 */
export function useAccountSnapshot() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  const snapshot = useMemo(() => {
    void version
    const state = getState()
    const activeTasks = activeStudyTasks(state.studyScheduleTasks ?? [], readTaskArchiveState())
    const due = dueStudyTasks(activeTasks)
    const today = localTaskDateKey()
    const todayTasks = activeTasks.filter((task) => task.date === today)
    const mockResults = state.quizResults.filter((result) => result.mockKind === 'gk' || result.mockKind === 'mpt')
    const statuses = Object.values(state.syllabusItemStatuses ?? {})
    return {
      state,
      stats: getStats(),
      study: getStudyAnalytics(7),
      revision: getRevisionStats(),
      activities: recentActivities(6),
      activeTasks,
      due,
      todayTasks,
      todayDone: todayTasks.filter((task) => task.status === 'completed'),
      todayMinutes: todayTasks.reduce((sum, task) => sum + task.minutes, 0),
      mockResults,
      latestMock: mockResults[0] ?? null,
      syllabusCompleted: statuses.filter((status) => status === 'completed').length,
      subjectProgress: Object.entries(state.subjectProgress ?? {}).sort((left, right) => right[1] - left[1]).slice(0, 5),
      savedResources: (state.bookmarks?.length ?? 0) + (state.savedAnswers?.length ?? 0),
    }
  }, [version])

  return { snapshot, refresh: () => setVersion((value) => value + 1) }
}

/** The total number of syllabus topics, used to turn completions into a percent. */
export function useSyllabusTotal() {
  const [total, setTotal] = useState(0)
  useEffect(() => {
    let active = true
    fetch('/fpsc-syllabus.json')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('unavailable')))
      .then((data: { subjects?: Array<{ sections?: Array<{ items?: string[] }> }> }) => {
        if (!active) return
        setTotal((data.subjects ?? []).reduce(
          (sum, subject) => sum + (subject.sections ?? []).reduce((count, section) => count + (section.items?.length ?? 0), 0),
          0,
        ))
      })
      .catch(() => { if (active) setTotal(0) })
    return () => { active = false }
  }, [])
  return total
}

/**
 * One page inside the account. Every account page wears the same quiet header
 * so moving between them feels like one product rather than four.
 */
export function AccountPage({ title, intro, action, children }: { title: string; intro: string; action?: ReactNode; children: ReactNode }) {
  const { user } = useAccount()
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <Link to="/account/dashboard" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> My CSS Vista
        </Link>
        <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{intro}</p>
          </div>
          {action ?? (
            <Link
              to="/account/settings"
              className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-emerald-700 hover:text-emerald-800"
            >
              {user?.photo_complete
                ? <img src="/api/student/photo-view.php" alt="" className="h-7 w-7 rounded-full object-cover" />
                : <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100"><UserRound className="h-4 w-4" /></span>}
              My profile
            </Link>
          )}
        </header>
        <div className="mt-9">{children}</div>
        {/* Signed-in account content. Advertising eligibility is decided by the
            route registry, not by this page. */}
        <div className="mt-12"><AuthenticatedAccountAd /></div>
      </div>
    </main>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-[.14em] text-slate-400">{children}</h2>
}

export function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">{children}</p>
}

export function TaskItem({ task, refresh }: { task: StudyScheduleTask; refresh: () => void }) {
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
