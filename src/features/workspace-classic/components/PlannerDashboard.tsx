import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Clock3, ListChecks, Pencil, RotateCcw, Target } from 'lucide-react'
import { getState, updateStudyScheduleTask, type StudyScheduleTask } from '@/lib/store'
import { activeStudyTasks, localTaskDateKey, readTaskArchiveState } from '@/lib/myTasks'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day + amount, 12)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function shortDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`)
  return Number.isNaN(date.getTime()) ? dateKey : date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function TaskRow({ task, refresh }: { task: StudyScheduleTask; refresh: () => void }) {
  const [editing, setEditing] = useState(false)
  const done = task.status === 'completed'

  function update(patch: Partial<Pick<StudyScheduleTask, 'date' | 'time' | 'minutes' | 'status'>>) {
    updateStudyScheduleTask(task.id, patch)
    refresh()
  }

  return (
    <article className={`rounded-xl border p-3.5 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => update({ status: done ? 'in-progress' : 'completed' })}
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
            done
              ? 'border-emerald-700 bg-emerald-700 text-white'
              : 'border-slate-300 bg-white text-slate-500 hover:border-emerald-700 hover:text-emerald-800'
          }`}
          aria-label={done ? `Mark ${task.topic} incomplete` : `Mark ${task.topic} complete`}
        >
          {done ? <Check className="h-4 w-4" /> : <span className="h-2.5 w-2.5 rounded-full border border-current" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-bold ${done ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>{task.topic}</p>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{task.subject}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
            <span>{shortDate(task.date)}</span>
            {task.time && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{task.time}</span>}
            <span>{minutesLabel(task.minutes)}</span>
            <span>{task.status === 'not-started' ? 'Not started' : task.status === 'in-progress' ? 'In progress' : 'Done'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:border-emerald-700"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      {editing && (
        <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-4">
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Date
            <input type="date" value={task.date} onChange={(event) => update({ date: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Time
            <input type="time" value={task.time ?? ''} onChange={(event) => update({ time: event.target.value || undefined })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Minutes
            <input type="number" min={5} max={600} step={5} value={task.minutes} onChange={(event) => update({ minutes: Math.max(5, Math.min(600, Number(event.target.value) || 30)) })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status
            <select value={task.status} onChange={(event) => update({ status: event.target.value as StudyScheduleTask['status'] })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900">
              <option value="not-started">Not started</option>
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <div className="sm:col-span-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => update({ date: addDays(localTaskDateKey(), 1), status: task.status === 'completed' ? 'in-progress' : task.status })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700">Move to tomorrow</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white">Done editing</button>
          </div>
        </div>
      )}
    </article>
  )
}

function TaskGroup({ title, emptyText, tasks, refresh, tone = 'default' }: {
  title: string
  emptyText: string
  tasks: StudyScheduleTask[]
  refresh: () => void
  tone?: 'default' | 'warning' | 'success'
}) {
  const heading = tone === 'warning' ? 'text-amber-900' : tone === 'success' ? 'text-emerald-900' : 'text-slate-900'
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={`text-base font-bold ${heading}`}>{title}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{tasks.length}</span>
      </div>
      {tasks.length ? <div className="space-y-2.5">{tasks.map((task) => <TaskRow key={task.id} task={task} refresh={refresh} />)}</div> : <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">{emptyText}</p>}
    </section>
  )
}

export default function PlannerDashboard() {
  const [version, setVersion] = useState(0)
  const today = localTaskDateKey()

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  const tasks = useMemo(() => {
    void version
    return activeStudyTasks(getState().studyScheduleTasks ?? [], readTaskArchiveState())
  }, [version])
  const sorted = useMemo(() => [...tasks].sort((left, right) => `${left.date} ${left.time ?? ''}`.localeCompare(`${right.date} ${right.time ?? ''}`)), [tasks])
  const todayTasks = sorted.filter((task) => task.date === today)
  const todayDone = todayTasks.filter((task) => task.status === 'completed')
  const todayPending = todayTasks.filter((task) => task.status !== 'completed')
  const overdue = sorted.filter((task) => task.status !== 'completed' && task.date < today)
  const upcoming = sorted.filter((task) => task.status !== 'completed' && task.date > today)
  const completed = [...sorted].filter((task) => task.status === 'completed').sort((left, right) => right.date.localeCompare(left.date))
  const todayMinutes = todayTasks.reduce((sum, task) => sum + task.minutes, 0)
  const completionPct = todayTasks.length ? Math.round((todayDone.length / todayTasks.length) * 100) : 0
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index)
    const rows = sorted.filter((task) => task.date === date && task.status !== 'completed')
    return { date, count: rows.length, minutes: rows.reduce((sum, task) => sum + task.minutes, 0) }
  })
  const maxWeekMinutes = Math.max(1, ...week.map((day) => day.minutes))

  function refresh() { setVersion((value) => value + 1) }

  if (!tasks.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-800">My CSS Vista</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Your study dashboard will appear here after planning</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create or import a schedule below. Once tasks exist, this area becomes your daily dashboard for what is due, completed, overdue and coming next.</p>
        <a href="#plan-management" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-emerald-800 px-4 text-xs font-bold text-white">Create my plan</a>
      </section>
    )
  }

  return (
    <section aria-label="Study plan dashboard" className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-800">My CSS Vista · Study dashboard</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Here is what you need to do.</h1>
            <p className="mt-2 text-sm text-slate-600">Tick work as you finish it. Edit any task without rebuilding the full schedule.</p>
          </div>
          <a href="#plan-management" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 hover:border-emerald-700">Manage full plan</a>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-slate-600"><ListChecks className="h-4 w-4" /><span className="text-[10px] font-extrabold uppercase tracking-wide">To do today</span></div><p className="mt-2 text-2xl font-bold text-slate-950">{todayPending.length}</p><p className="text-xs text-slate-500">{todayDone.length} already done</p></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-amber-800"><RotateCcw className="h-4 w-4" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Overdue</span></div><p className="mt-2 text-2xl font-bold text-amber-950">{overdue.length}</p><p className="text-xs text-amber-800">unfinished from earlier days</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-slate-600"><Clock3 className="h-4 w-4" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Planned today</span></div><p className="mt-2 text-2xl font-bold text-slate-950">{minutesLabel(todayMinutes)}</p><p className="text-xs text-slate-500">total scheduled study time</p></div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-emerald-800"><Target className="h-4 w-4" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Today complete</span></div><p className="mt-2 text-2xl font-bold text-emerald-950">{completionPct}%</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100"><span className="block h-full bg-emerald-700" style={{ width: `${completionPct}%` }} /></div></div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900">Next 7 days</p><p className="text-[11px] text-slate-500">Workload based on your saved schedule</p></div><CalendarDays className="h-5 w-5 text-emerald-800" /></div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {week.map((day) => (
              <div key={day.date} className="min-w-0 text-center">
                <p className="truncate text-[10px] font-bold text-slate-500">{shortDate(day.date).split(',')[0]}</p>
                <div className="mt-2 flex h-16 items-end justify-center rounded-lg bg-slate-50 px-2 pb-1.5">
                  <span className="block w-full rounded-md bg-emerald-700" style={{ height: `${Math.max(day.minutes ? 10 : 3, Math.round((day.minutes / maxWeekMinutes) * 52))}px`, opacity: day.minutes ? 1 : 0.18 }} />
                </div>
                <p className="mt-1 text-[10px] font-bold text-slate-700">{day.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TaskGroup title="Today's tasks" emptyText="Nothing else is due today." tasks={todayPending} refresh={refresh} />
        <TaskGroup title="Overdue" emptyText="No overdue work. You're on track." tasks={overdue} refresh={refresh} tone="warning" />
      </div>

      <TaskGroup title="Upcoming" emptyText="No upcoming tasks are scheduled yet." tasks={upcoming.slice(0, 12)} refresh={refresh} />

      <details className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">Completed history · {completed.length}</summary>
        <div className="mt-4">
          {completed.length ? <div className="space-y-2.5">{completed.slice(0, 30).map((task) => <TaskRow key={task.id} task={task} refresh={refresh} />)}</div> : <p className="text-xs text-slate-500">Completed tasks will appear here.</p>}
        </div>
      </details>
    </section>
  )
}
