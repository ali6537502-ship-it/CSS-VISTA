import { useEffect, useMemo, useState } from 'react'
import { BellRing, Check, Clock3, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { activeStudyTasks, dueStudyTasks, localTaskDateKey } from '@/lib/myTasks'
import { getState, updateStudyScheduleTask } from '@/lib/store'
import { notifyProgressChanged, PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { isNotesBundleExclusiveWindow } from '@/data/notesBundleOffer'

const REMINDER_KEY = 'cssvista:tool:my-task-reminders:v1'

type ReminderSlot = 'afternoon' | 'evening'
type ReminderRecord = Record<string, Partial<Record<ReminderSlot, string>>>

function readReminderRecord(): ReminderRecord {
  try {
    const parsed = JSON.parse(localStorage.getItem(REMINDER_KEY) || '{}') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ReminderRecord : {}
  } catch {
    return {}
  }
}

function markReminderSeen(slot: ReminderSlot) {
  try {
    const today = localTaskDateKey()
    const current = readReminderRecord()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 45)
    const cutoffKey = localTaskDateKey(cutoff)
    const cleaned = Object.fromEntries(Object.entries(current).filter(([date]) => date >= cutoffKey)) as ReminderRecord
    cleaned[today] = { ...(cleaned[today] ?? {}), [slot]: new Date().toISOString() }
    localStorage.setItem(REMINDER_KEY, JSON.stringify(cleaned))
    notifyProgressChanged()
  } catch {
    // Reminder persistence is helpful but must never block study-task use.
  }
}

function reminderSlot(now: Date): ReminderSlot | null {
  const hour = now.getHours()
  if (hour >= 19) return 'evening'
  if (hour >= 13) return 'afternoon'
  return null
}

function shortDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TaskReminderOverlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAccount()
  const [version, setVersion] = useState(0)
  const [clock, setClock] = useState(() => new Date())
  const [open, setOpen] = useState(false)
  const [activeSlot, setActiveSlot] = useState<ReminderSlot | null>(null)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const activeTasks = useMemo(() => {
    void version
    return activeStudyTasks(getState().studyScheduleTasks ?? [])
  }, [version])
  const due = useMemo(() => dueStudyTasks(activeTasks), [activeTasks])
  const todayRemaining = useMemo(() => due.today.filter((task) => task.status !== 'completed'), [due.today])
  const carriedForward = due.overdue
  const remaining = carriedForward.length + todayRemaining.length
  const visibleTasks = useMemo(() => [...carriedForward, ...todayRemaining].slice(0, 6), [carriedForward, todayRemaining])

  useEffect(() => {
    if (isNotesBundleExclusiveWindow(clock.getTime())) {
      setOpen(false)
      return
    }
    if (!user || remaining === 0) {
      setOpen(false)
      return
    }
    const insideAccount = location.pathname === '/account' || location.pathname.startsWith('/account/')
    if (insideAccount || location.pathname.startsWith('/sadiaali')) {
      setOpen(false)
      return
    }
    const slot = reminderSlot(clock)
    if (!slot) return
    const today = localTaskDateKey(clock)
    const seen = readReminderRecord()[today]?.[slot]
    if (seen) return
    setActiveSlot(slot)
    setOpen(true)
  }, [clock, location.pathname, remaining, user, version])

  function dismiss() {
    if (activeSlot) markReminderSeen(activeSlot)
    setOpen(false)
  }

  function openTasks() {
    if (activeSlot) markReminderSeen(activeSlot)
    setOpen(false)
    navigate('/study-planner')
  }

  function toggleTask(id: string, completed: boolean) {
    updateStudyScheduleTask(id, { status: completed ? 'in-progress' : 'completed' })
    setVersion((value) => value + 1)
  }

  if (isNotesBundleExclusiveWindow(clock.getTime()) || !user || !open || !activeSlot || remaining === 0) return null

  const evening = activeSlot === 'evening'
  const hiddenCount = Math.max(0, remaining - visibleTasks.length)

  return (
    <aside className="no-print fixed bottom-[calc(150px+env(safe-area-inset-bottom))] right-3 z-[72] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl md:bottom-24 md:right-5" aria-label="My CSS Vista task reminder">
      <div className="flex items-start gap-3 border-b bg-emerald-50/80 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-800 text-white"><BellRing className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700">My CSS Vista reminder</p>
          <h2 className="mt-1 text-sm font-bold text-pine">{evening ? 'Evening check-in' : 'Your study check-in'}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {evening
              ? `${remaining} task${remaining === 1 ? '' : 's'} still need attention today.`
              : `${remaining} task${remaining === 1 ? '' : 's'} are waiting for you.`}
            {carriedForward.length > 0 ? ` ${carriedForward.length} carried forward from earlier.` : ''}
          </p>
        </div>
        <button type="button" onClick={dismiss} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-white text-pine" aria-label="Dismiss task reminder"><X className="h-4 w-4" /></button>
      </div>

      <div className="max-h-[19rem] space-y-2 overflow-y-auto p-3">
        {visibleTasks.map((task) => {
          const completed = task.status === 'completed'
          const carried = task.date < localTaskDateKey(clock)
          return (
            <article key={task.id} className={`flex items-start gap-2.5 rounded-xl border p-3 ${carried ? 'border-amber-200 bg-amber-50/40' : 'bg-white'}`}>
              <button type="button" onClick={() => toggleTask(task.id, completed)} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${completed ? 'border-emerald-700 bg-emerald-700 text-white' : 'bg-white text-pine'}`} aria-label={completed ? `Mark ${task.topic} incomplete` : `Complete ${task.topic}`}>
                {completed ? <Check className="h-4 w-4" /> : <Clock3 className="h-3.5 w-3.5 opacity-60" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-[9px] font-bold uppercase tracking-wide ${carried ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {carried ? `Carried forward · ${shortDate(task.date)}` : 'Today'}{task.time ? ` · ${task.time}` : ''} · {task.minutes} min
                </p>
                <p className={`mt-0.5 text-xs font-semibold leading-relaxed ${completed ? 'text-muted-foreground line-through' : 'text-pine'}`}>{task.subject}: {task.topic}</p>
              </div>
            </article>
          )
        })}
        {hiddenCount > 0 && <p className="px-1 text-[10px] font-semibold text-muted-foreground">+ {hiddenCount} more task{hiddenCount === 1 ? '' : 's'} in My Tasks</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t p-3">
        <button type="button" onClick={dismiss} className="min-h-10 rounded-lg border text-xs font-bold text-pine">Dismiss</button>
        <button type="button" onClick={openTasks} className="min-h-10 rounded-lg bg-pine px-3 text-xs font-bold text-white">Open My Tasks</button>
      </div>
    </aside>
  )
}
