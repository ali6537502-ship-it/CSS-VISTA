import { useMemo, useState, type FormEvent } from 'react'
import { Archive, CalendarPlus, CalendarRange, Check, Clock3, Copy, MoveRight, Plus, RotateCcw, Upload } from 'lucide-react'
import PrintMenu from '@/components/PrintMenu'
import {
  addStudyScheduleTasks, getState, updateStudyScheduleTask,
  type StudyScheduleTask, type SyllabusItemStatus,
} from '@/lib/store'
import {
  AI_SCHEDULE_PROMPT, activeStudyTasks, aiScheduleTaskId, archiveTaskState,
  isTaskArchived, localTaskDateKey, parseCssVistaSchedule, readTaskArchiveState,
  restoreTaskState, type TaskArchiveState,
} from '@/lib/myTasks'

const statusLabels: Record<SyllabusItemStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
}

function readableDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function manualTaskId() {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return `manual:${suffix}`
}

export default function ScheduledSyllabusBoard({ compact = false }: { compact?: boolean }) {
  const [tasks, setTasks] = useState<StudyScheduleTask[]>(() => getState().studyScheduleTasks ?? [])
  const [archiveState, setArchiveState] = useState<TaskArchiveState>(() => readTaskArchiveState())
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [taskDate, setTaskDate] = useState(localTaskDateKey())
  const [taskTime, setTaskTime] = useState('')
  const [taskMinutes, setTaskMinutes] = useState(30)
  const [aiText, setAiText] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const activeTasks = useMemo(() => activeStudyTasks(tasks, archiveState), [archiveState, tasks])
  const archivedTasks = useMemo(
    () => tasks.filter((task) => isTaskArchived(task.id, archiveState)),
    [archiveState, tasks],
  )
  const grouped = useMemo(() => {
    const groups = new Map<string, StudyScheduleTask[]>()
    ;[...activeTasks].sort((left, right) => `${left.date} ${left.time ?? ''}`.localeCompare(`${right.date} ${right.time ?? ''}`)).forEach((task) => {
      if (!groups.has(task.date)) groups.set(task.date, [])
      groups.get(task.date)!.push(task)
    })
    return [...groups.entries()]
  }, [activeTasks])

  const aiPreview = useMemo(() => {
    if (!aiText.trim()) return null
    try {
      const parsed = parseCssVistaSchedule(aiText)
      return { parsed, error: '' }
    } catch (caught) {
      return { parsed: null, error: caught instanceof Error ? caught.message : 'This schedule could not be read.' }
    }
  }, [aiText])

  const today = localTaskDateKey()
  const completed = activeTasks.filter((task) => task.status === 'completed').length
  const todayCount = activeTasks.filter((task) => task.status !== 'completed' && task.date === today).length
  const overdueCount = activeTasks.filter((task) => task.status !== 'completed' && task.date < today).length
  const upcomingCount = activeTasks.filter((task) => task.status !== 'completed' && task.date > today).length

  function refreshTasks() {
    setTasks(getState().studyScheduleTasks ?? [])
  }

  function update(id: string, patch: Partial<Pick<StudyScheduleTask, 'date' | 'time' | 'minutes' | 'status'>>) {
    updateStudyScheduleTask(id, patch)
    refreshTasks()
  }

  function archiveTask(id: string) {
    setArchiveState((current) => archiveTaskState(id, current))
    setError('')
    setMessage('Task moved to Archive. It has not been deleted.')
  }

  function restoreTask(id: string) {
    setArchiveState((current) => restoreTaskState(id, current))
    setError('')
    setMessage('Task restored.')
  }

  function addPersonalTask(event: FormEvent) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle || !taskDate) return
    addStudyScheduleTasks([{
      syllabusItemId: manualTaskId(),
      subject: subject.trim() || 'General',
      paper: '',
      section: 'Personal task',
      topic: cleanTitle,
      date: taskDate,
      time: taskTime || undefined,
      minutes: Math.max(5, Math.min(600, taskMinutes || 30)),
    }])
    refreshTasks()
    setTitle('')
    setSubject('')
    setTaskTime('')
    setTaskMinutes(30)
    setError('')
    setMessage('Task added to your schedule.')
  }

  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(AI_SCHEDULE_PROMPT)
      setError('')
      setMessage('AI schedule command copied. Paste it into ChatGPT or another AI, then tell it your routine and requirements.')
    } catch {
      setError('The prompt could not be copied automatically. Please try again.')
    }
  }

  function importAiSchedule() {
    setError('')
    setMessage('')
    try {
      const parsed = parseCssVistaSchedule(aiText)
      const additions = addStudyScheduleTasks(parsed.tasks.map((task, index) => ({
        syllabusItemId: aiScheduleTaskId(task, index),
        subject: task.subject,
        paper: task.activity,
        section: `AI schedule · ${task.priority} priority`,
        topic: task.topic,
        date: task.date,
        time: task.time,
        minutes: task.minutes,
      })))
      refreshTasks()
      setAiText('')
      setMessage(additions.length
        ? `${parsed.title} imported: ${additions.length} task${additions.length === 1 ? '' : 's'} across ${parsed.dayCount} day${parsed.dayCount === 1 ? '' : 's'}.`
        : 'This exact schedule is already in My Tasks, so no duplicates were created.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The AI schedule could not be imported.')
    }
  }

  async function copyPlan() {
    try {
      const text = grouped.flatMap(([date, rows]) => [
        readableDate(date),
        ...rows.map((task) => `- [${task.status === 'completed' ? 'x' : ' '}] ${task.subject}: ${task.topic}${task.time ? ` at ${task.time}` : ''} (${task.minutes} min)`),
        '',
      ]).join('\n')
      await navigator.clipboard.writeText(text || 'No active tasks scheduled yet.')
      setError('')
      setMessage('Active task plan copied.')
    } catch {
      setError('The plan could not be copied automatically.')
    }
  }

  return (
    <section className="syllabus-schedule-print-area rounded-xl border bg-white p-4 sm:p-5" aria-label="My CSS Vista tasks">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-amber-700">My CSS Vista</p>
          <h3 className="mt-1 font-display text-xl font-bold text-pine">My Tasks</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Your daily schedule in one place. Create a complete plan with AI in a few minutes, tick tasks as you finish them, and restore anything you archive.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyPlan()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine"><Copy className="h-4 w-4" /> Copy plan</button>
          {!compact && <PrintMenu answersAvailable={false} label="Print or download" targetSelector=".syllabus-schedule-print-area" />}
        </div>
      </div>

      {!compact && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700">Fastest way</p>
              <h4 className="mt-1 text-base font-bold text-pine">Create your whole schedule with AI</h4>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Copy the CSS Vista command, paste it into ChatGPT or another AI, tell it your routine, syllabus, priorities and available time, then paste its final CSS Vista block here.</p>
            </div>
            <button type="button" onClick={() => void copyAiPrompt()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-pine px-4 text-xs font-bold text-white"><Copy className="h-4 w-4" /> Copy AI command</button>
          </div>
          <textarea
            value={aiText}
            onChange={(event) => { setAiText(event.target.value); setError(''); setMessage('') }}
            rows={7}
            spellCheck={false}
            placeholder="Paste the AI output here. CSS Vista will detect CSSV_SCHEDULE_V1 automatically…"
            className="mt-4 w-full rounded-xl border bg-white p-3 font-mono text-xs leading-5 text-foreground"
          />
          {aiPreview?.parsed && (
            <p className="mt-2 rounded-lg bg-emerald-100/70 px-3 py-2 text-xs font-semibold text-emerald-950">Schedule detected: {aiPreview.parsed.tasks.length} tasks across {aiPreview.parsed.dayCount} days · {aiPreview.parsed.title}</p>
          )}
          {aiPreview?.error && aiText.includes('CSSV_SCHEDULE_V1') && (
            <p className="mt-2 text-xs text-amber-800">{aiPreview.error}</p>
          )}
          <button type="button" onClick={importAiSchedule} disabled={!aiPreview?.parsed} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Upload className="h-4 w-4" /> Import and create my schedule</button>
        </div>
      )}

      {!compact && (
        <details className="mt-4 rounded-xl border bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-pine">Or add one task manually</summary>
          <form onSubmit={addPersonalTask} className="mt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-pine"><CalendarPlus className="h-4 w-4 text-emerald-800" /> Quick task</div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_9rem_7.5rem_6.5rem_auto] md:items-end">
              <label className="text-xs font-semibold text-pine">Task
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} required placeholder="e.g. Revise sovereignty" className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal text-foreground" />
              </label>
              <label className="text-xs font-semibold text-pine">Subject
                <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="Optional" className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal text-foreground" />
              </label>
              <label className="text-xs font-semibold text-pine">Date
                <input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} required className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-xs font-normal text-foreground" />
              </label>
              <label className="text-xs font-semibold text-pine">Time
                <input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-xs font-normal text-foreground" />
              </label>
              <label className="text-xs font-semibold text-pine">Minutes
                <input type="number" min={5} max={600} step={5} value={taskMinutes} onChange={(event) => setTaskMinutes(Math.max(5, Number(event.target.value) || 30))} className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-xs font-normal text-foreground" />
              </label>
              <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-pine px-4 text-xs font-bold text-white hover:bg-emerald-900"><Plus className="h-4 w-4" /> Add</button>
            </div>
          </form>
        </details>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Today</p><p className="mt-1 text-lg font-bold text-pine">{todayCount}</p></div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Overdue</p><p className="mt-1 text-lg font-bold text-amber-900">{overdueCount}</p></div>
        <div className="rounded-lg border bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Upcoming</p><p className="mt-1 text-lg font-bold text-pine">{upcomingCount}</p></div>
        <div className="rounded-lg border bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Completed</p><p className="mt-1 text-lg font-bold text-emerald-800">{completed}</p></div>
      </div>

      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-950">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      {!activeTasks.length ? (
        <div className="mt-4 rounded-lg border border-dashed bg-secondary/30 px-4 py-8 text-center">
          <CalendarRange className="mx-auto h-6 w-6 text-emerald-800" />
          <p className="mt-2 text-sm font-semibold text-pine">No active tasks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Use the AI schedule importer above or schedule a topic from the FPSC syllabus.</p>
        </div>
      ) : (
        <div className={`mt-4 space-y-4 ${compact ? 'max-h-[28rem] overflow-y-auto pr-1' : ''}`}>
          {grouped.map(([date, rows]) => {
            const overdue = date < today && rows.some((task) => task.status !== 'completed')
            const current = date === today
            return (
              <div key={date}>
                <h4 className={`sticky top-0 z-[1] rounded-md px-3 py-2 text-xs font-bold ${overdue ? 'bg-amber-50 text-amber-950' : current ? 'bg-emerald-100 text-emerald-950' : 'bg-emerald-50 text-emerald-950'}`}>
                  {readableDate(date)}{overdue ? ' · Overdue' : current ? ' · Today' : ''}
                </h4>
                <div className="mt-2 space-y-2">
                  {rows.map((task) => (
                    <article key={task.id} className={`grid gap-2 rounded-lg border p-3 lg:grid-cols-[2.5rem_minmax(0,1fr)_9rem_6.5rem_7rem_5.5rem] lg:items-center ${task.status === 'completed' ? 'border-emerald-200 bg-emerald-50/60' : overdue ? 'border-amber-200' : ''}`}>
                      <button type="button" onClick={() => update(task.id, { status: task.status === 'completed' ? 'in-progress' : 'completed' })} className={`grid h-9 w-9 place-items-center rounded-full border ${task.status === 'completed' ? 'border-emerald-700 bg-emerald-700 text-white' : 'text-pine'}`} aria-label={task.status === 'completed' ? 'Mark task in progress' : 'Complete task'}>{task.status === 'completed' ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</button>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{task.subject}{task.paper || task.section ? ` · ${task.paper || task.section}` : ''}</p><p className={`mt-0.5 text-sm leading-relaxed ${task.status === 'completed' ? 'text-emerald-900 line-through' : 'text-foreground'}`}>{task.topic}</p><span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-slate-600">{statusLabels[task.status]}</span></div>
                      <label className="relative text-[10px] font-semibold text-muted-foreground"><span className="sr-only">Move task to another date</span><MoveRight className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" /><input type="date" value={task.date} onChange={(event) => update(task.id, { date: event.target.value })} className="h-9 w-full rounded-md border bg-white pl-7 pr-1 text-xs" /></label>
                      <label className="text-[10px] font-semibold text-muted-foreground"><span className="sr-only">Study time</span><input type="time" value={task.time ?? ''} onChange={(event) => update(task.id, { time: event.target.value || undefined })} className="h-9 w-full rounded-md border bg-white px-2 text-xs" /></label>
                      <label className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><input type="number" min={5} max={600} step={5} value={task.minutes} onChange={(event) => update(task.id, { minutes: Math.max(5, Number(event.target.value) || 30) })} className="h-9 w-16 rounded-md border bg-white px-2 text-xs" /> min</label>
                      <button type="button" onClick={() => archiveTask(task.id)} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-bold text-muted-foreground hover:bg-amber-50 hover:text-amber-900" aria-label={`Archive ${task.topic}`}><Archive className="h-3.5 w-3.5" /> Archive</button>
                    </article>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {archivedTasks.length > 0 && !compact && (
        <details className="mt-5 rounded-xl border bg-slate-50/70 p-4">
          <summary className="cursor-pointer text-sm font-bold text-pine">Archive · {archivedTasks.length} task{archivedTasks.length === 1 ? '' : 's'}</summary>
          <p className="mt-1 text-xs text-muted-foreground">Archived tasks are retained in your CSS Vista progress record. Restore them whenever you need them.</p>
          <div className="mt-3 space-y-2">
            {[...archivedTasks].sort((a, b) => b.date.localeCompare(a.date)).map((task) => (
              <article key={task.id} className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{task.subject} · {readableDate(task.date)}</p><p className="mt-0.5 text-sm text-foreground">{task.topic}</p></div>
                <button type="button" onClick={() => restoreTask(task.id)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine hover:bg-emerald-50"><RotateCcw className="h-4 w-4" /> Restore</button>
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
