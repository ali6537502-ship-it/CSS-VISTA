import { useMemo, useState } from 'react'
import { CalendarRange, Check, Clock3, Copy, MoveRight, Trash2 } from 'lucide-react'
import PrintMenu from '@/components/PrintMenu'
import {
  deleteStudyScheduleTask, getState, updateStudyScheduleTask,
  type StudyScheduleTask, type SyllabusItemStatus,
} from '@/lib/store'

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

export default function ScheduledSyllabusBoard({ compact = false }: { compact?: boolean }) {
  const [tasks, setTasks] = useState<StudyScheduleTask[]>(() => getState().studyScheduleTasks ?? [])
  const grouped = useMemo(() => {
    const groups = new Map<string, StudyScheduleTask[]>()
    ;[...tasks].sort((left, right) => left.date.localeCompare(right.date)).forEach((task) => {
      if (!groups.has(task.date)) groups.set(task.date, [])
      groups.get(task.date)!.push(task)
    })
    return [...groups.entries()]
  }, [tasks])
  const completed = tasks.filter((task) => task.status === 'completed').length

  function update(id: string, patch: Partial<Pick<StudyScheduleTask, 'date' | 'time' | 'minutes' | 'status'>>) {
    updateStudyScheduleTask(id, patch)
    setTasks(getState().studyScheduleTasks ?? [])
  }

  function remove(id: string) {
    deleteStudyScheduleTask(id)
    setTasks(getState().studyScheduleTasks ?? [])
  }

  async function copyPlan() {
    const text = grouped.flatMap(([date, rows]) => [
      readableDate(date),
      ...rows.map((task) => `- [${task.status === 'completed' ? 'x' : ' '}] ${task.subject}: ${task.topic}${task.time ? ` at ${task.time}` : ''} (${task.minutes} min)`),
      '',
    ]).join('\n')
    await navigator.clipboard.writeText(text || 'No syllabus topics scheduled yet.')
  }

  return (
    <section className="syllabus-schedule-print-area rounded-xl border bg-white p-4 sm:p-5" aria-label="Saved syllabus schedule">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-amber-700">Saved in Study Tools</p>
          <h3 className="mt-1 font-display text-xl font-bold text-pine">Daily and weekly syllabus schedule</h3>
          <p className="mt-1 text-xs text-muted-foreground">{tasks.length} tasks · {completed} completed · {tasks.length - completed} remaining</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyPlan} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine"><Copy className="h-4 w-4" /> Copy</button>
          {!compact && <PrintMenu answersAvailable={false} label="Print or download" targetSelector=".syllabus-schedule-print-area" />}
        </div>
      </div>

      {!tasks.length ? (
        <div className="mt-4 rounded-lg border border-dashed bg-secondary/30 px-4 py-8 text-center">
          <CalendarRange className="mx-auto h-6 w-6 text-emerald-800" />
          <p className="mt-2 text-sm font-semibold text-pine">No syllabus topics scheduled yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Open the FPSC syllabus, select topics, then choose a day or week.</p>
        </div>
      ) : (
        <div className={`mt-4 space-y-4 ${compact ? 'max-h-[28rem] overflow-y-auto pr-1' : ''}`}>
          {grouped.map(([date, rows]) => (
            <div key={date}>
              <h4 className="sticky top-0 z-[1] rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950">{readableDate(date)}</h4>
              <div className="mt-2 space-y-2">
                {rows.map((task) => (
                  <article key={task.id} className={`grid gap-2 rounded-lg border p-3 lg:grid-cols-[2.5rem_minmax(0,1fr)_9rem_6.5rem_7rem_2.5rem] lg:items-center ${task.status === 'completed' ? 'border-emerald-200 bg-emerald-50/60' : ''}`}>
                    <button type="button" onClick={() => update(task.id, { status: task.status === 'completed' ? 'in-progress' : 'completed' })} className={`grid h-9 w-9 place-items-center rounded-full border ${task.status === 'completed' ? 'border-emerald-700 bg-emerald-700 text-white' : 'text-pine'}`} aria-label={task.status === 'completed' ? 'Mark task in progress' : 'Complete task'}>{task.status === 'completed' ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</button>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{task.subject} · {task.paper || task.section}</p><p className={`mt-0.5 text-sm leading-relaxed ${task.status === 'completed' ? 'text-emerald-900 line-through' : 'text-foreground'}`}>{task.topic}</p><span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-slate-600">{statusLabels[task.status]}</span></div>
                    <label className="relative text-[10px] font-semibold text-muted-foreground"><span className="sr-only">Move task to another date</span><MoveRight className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" /><input type="date" value={task.date} onChange={(event) => update(task.id, { date: event.target.value })} className="h-9 w-full rounded-md border bg-white pl-7 pr-1 text-xs" /></label>
                    <label className="text-[10px] font-semibold text-muted-foreground"><span className="sr-only">Study time</span><input type="time" value={task.time ?? ''} onChange={(event) => update(task.id, { time: event.target.value || undefined })} className="h-9 w-full rounded-md border bg-white px-2 text-xs" /></label>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><input type="number" min={5} max={600} step={5} value={task.minutes} onChange={(event) => update(task.id, { minutes: Math.max(5, Number(event.target.value) || 30) })} className="h-9 w-16 rounded-md border bg-white px-2 text-xs" /> min</label>
                    <button type="button" onClick={() => remove(task.id)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-700" aria-label="Remove scheduled topic"><Trash2 className="h-4 w-4" /></button>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
