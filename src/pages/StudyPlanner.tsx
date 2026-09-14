import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  BookOpen, CalendarCheck2, Check, ChevronRight, Clock3, RotateCcw, Save, Settings2,
} from 'lucide-react'
import { Badge, PageHeader, Section } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import PlannerDashboard from '@/components/PlannerDashboard'
import {
  getState, saveStudyPlanner, togglePlanTask, type StudyPlannerSettings,
} from '@/lib/store'
import { getRevisionStats } from '@/lib/progress'
import { useAccount } from '@/lib/accountContext'
import {
  allOptionalSubjects, buildDailyPlan, defaultStudyPlannerSettings, localDateKey,
} from '@/lib/studyPlanner'
import FpscSyllabusPlanner from '@/components/FpscSyllabusPlanner'

export default function StudyPlanner() {
  const initial = getState()
  const [openedAt] = useState(() => Date.now())
  const stored = initial.studyPlanner
  const hasSavedSchedule = (initial.studyScheduleTasks ?? []).length > 0
  const [settings, setSettings] = useState<Omit<StudyPlannerSettings, 'configuredAt'>>(
    stored
      ? {
          examDate: stored.examDate,
          dailyHours: stored.dailyHours,
          restDay: stored.restDay,
          selectedOptionals: stored.selectedOptionals,
        }
      : defaultStudyPlannerSettings(),
  )
  const [savedSettings, setSavedSettings] = useState(stored)
  const [completed, setCompleted] = useState<string[]>(
    initial.planTaskCompletions?.[localDateKey()] ?? [],
  )
  const { user, configured } = useAccount()
  const revisionStats = getRevisionStats()
  const today = localDateKey()
  const isRestDay = new Date().getDay() === settings.restDay
  const tasks = useMemo(
    () => buildDailyPlan(settings, getState().subjectProgress, today, revisionStats.due),
    [revisionStats.due, settings, today],
  )
  const completedCount = tasks.filter((task) => completed.includes(task.id)).length
  const examTime = new Date(`${settings.examDate}T00:00:00+05:00`).getTime()
  const examDatePassed = Number.isFinite(examTime) && examTime < openedAt
  const daysLeft = Math.max(0, Math.ceil((examTime - openedAt) / 86400000))

  function saveSettings() {
    saveStudyPlanner(settings)
    setSavedSettings(getState().studyPlanner)
  }

  function toggleTask(taskId: string) {
    const done = togglePlanTask(today, taskId)
    setCompleted((current) => (
      done ? [...new Set([...current, taskId])] : current.filter((id) => id !== taskId)
    ))
  }

  const setupContent = (
    <div className="space-y-7">
      <Section
        title="Plan settings"
        description="Change your exam date, daily study time, light-study day or optional subjects whenever your routine changes."
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-pine">
              Target examination date
              <input
                type="date"
                value={settings.examDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setSettings((current) => ({ ...current, examDate: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-pine">
              Study hours each day
              <input
                type="number"
                min={1}
                max={12}
                value={settings.dailyHours}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  dailyHours: Number(event.target.value) || 1,
                }))}
                className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-pine">
              Weekly light-study day
              <select
                value={settings.restDay}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  restDay: Number(event.target.value),
                }))}
                className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground"
              >
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                  .map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-pine">Your optional subjects</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allOptionalSubjects.map((subject) => {
                const selected = settings.selectedOptionals.includes(subject)
                return (
                  <label
                    key={subject}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      selected ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => setSettings((current) => ({
                        ...current,
                        selectedOptionals: selected
                          ? current.selectedOptionals.filter((name) => name !== subject)
                          : [...current.selectedOptionals, subject],
                      }))}
                      className="h-4 w-4 accent-emerald-800"
                    />
                    {subject}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveSettings}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900"
            >
              <Save className="h-4 w-4" /> Save settings
            </button>
            <p className="text-xs text-muted-foreground">
              {savedSettings
                ? `Last configured ${new Date(savedSettings.configuredAt).toLocaleDateString()}.`
                : 'Save once to activate your personal settings.'}{' '}
              {user
                ? 'Your plan can sync with your signed-in account.'
                : configured
                  ? 'Sign in to carry this plan across devices.'
                  : 'Sign in whenever you want to use this plan across devices.'}
            </p>
          </div>
        </div>
      </Section>

      <FpscSyllabusPlanner />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="My Study Dashboard"
        description="See what is due, what is done, what was missed and what comes next. Adjust your saved schedule without rebuilding it."
      />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Link to="/account/dashboard" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800">My CSS Vista</Link>
            <Link to="/exam-intelligence" className="inline-flex min-h-10 items-center rounded-lg bg-emerald-800 px-4 text-xs font-bold text-white">Exam Intelligence</Link>
          </div>
          <PrintMenu answersAvailable={false} label="Print or save plan" />
        </div>

        <PlannerDashboard />

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-600"><CalendarCheck2 className="h-4 w-4 text-emerald-800" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Exam countdown</span></div>
            <p className="mt-2 text-2xl font-bold text-pine">{examDatePassed ? '--' : daysLeft}</p>
            <p className="text-xs text-muted-foreground">{examDatePassed ? 'Set a new exam date in Plan management.' : 'days to your selected examination date'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-600"><RotateCcw className="h-4 w-4 text-emerald-800" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Smart revision</span></div>
            <p className="mt-2 text-2xl font-bold text-pine">{revisionStats.due}</p>
            <p className="text-xs text-muted-foreground">MCQs currently due for revision</p>
          </div>
        </section>

        <div id="plan-management">
          {hasSavedSchedule ? (
            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Plan management</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Change the plan, import a new schedule or use the FPSC syllabus</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Your dashboard stays simple. Open this only when you want to make bigger changes.</p>
                </div>
                <Settings2 className="h-5 w-5 shrink-0 text-slate-600" />
              </summary>
              <div className="border-t border-slate-200 p-4 sm:p-6">{setupContent}</div>
            </details>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <div className="mb-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Create your plan</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Set up the schedule once, then manage it from the dashboard</h2>
              </div>
              {setupContent}
            </section>
          )}
        </div>

        <details className="rounded-2xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none p-5 sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-500">Optional support</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">CSS Vista automatic daily suggestions</h2>
            <p className="mt-1 text-xs text-slate-500">These are separate smart suggestions based on subject progress and revision due. Your saved schedule above remains the main plan.</p>
          </summary>
          <div className="border-t border-slate-200 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-pine">{isRestDay ? 'Light study and recovery' : "Today's suggested preparation"}</p>
                <p className="text-xs text-muted-foreground">{completedCount}/{tasks.length} suggestions completed</p>
              </div>
            </div>
            <div className="space-y-2">
              {tasks.map((task, index) => {
                const done = completed.includes(task.id)
                return (
                  <article key={task.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${done ? 'border-emerald-200 bg-emerald-50' : 'bg-white'}`}>
                    <button type="button" onClick={() => toggleTask(task.id)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'text-muted-foreground hover:bg-secondary'}`} aria-label={done ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}>
                      {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className={`font-bold ${done ? 'text-emerald-900 line-through' : 'text-pine'}`}>{task.title}</h3><Badge tone="gray">{task.subject}</Badge></div>
                      <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {task.minutes} min</span>
                      <Link to={task.to} className="inline-flex h-9 items-center gap-1 rounded-md bg-pine px-3 text-xs font-bold text-white hover:bg-emerald-900">Start <ChevronRight className="h-4 w-4" /></Link>
                    </div>
                  </article>
                )
              })}
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="h-4 w-4" /> Suggestions rotate daily and prioritise lower-progress subjects.</p>
          </div>
        </details>
      </div>
    </div>
  )
}
