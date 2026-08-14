import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  BookOpen, CalendarCheck2, Check, ChevronRight, Clock3, RotateCcw, Save, Target,
} from 'lucide-react'
import { Badge, PageHeader, Section } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import {
  getState, saveStudyPlanner, togglePlanTask, type StudyPlannerSettings,
} from '@/lib/store'
import { getRevisionStats } from '@/lib/progress'
import { useAccount } from '@/lib/accountContext'
import {
  allOptionalSubjects, buildDailyPlan, defaultStudyPlannerSettings, localDateKey,
} from '@/lib/studyPlanner'

export default function StudyPlanner() {
  const initial = getState()
  const [openedAt] = useState(() => Date.now())
  const stored = initial.studyPlanner
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

  return (
    <div>
      <PageHeader
        title="My CSS Study Planner"
        description="A personal, syllabus-based daily plan that uses your selected subjects, available study time, progress and due revisions."
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div className="flex justify-end">
          <PrintMenu answersAvailable={false} label="Print or save plan" />
        </div>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="vista-card p-4">
            <CalendarCheck2 className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{daysLeft}</p>
            <p className="text-xs text-muted-foreground">Days to selected exam date</p>
          </div>
          <div className="vista-card p-4">
            <Target className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{completedCount}/{tasks.length}</p>
            <p className="text-xs text-muted-foreground">Today&apos;s tasks completed</p>
          </div>
          <div className="vista-card p-4">
            <RotateCcw className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{revisionStats.due}</p>
            <p className="text-xs text-muted-foreground">MCQs due for smart revision</p>
          </div>
        </section>

        <Section
          title="Set up your plan"
          description="Your settings and task completion are part of your progress record."
        >
          <div className="rounded-xl border bg-white p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-pine">
                Target examination date
                <input
                  type="date"
                  value={settings.examDate}
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
                <Save className="h-4 w-4" /> Save and rebuild plan
              </button>
              <p className="text-xs text-muted-foreground">
                {savedSettings
                  ? `Last configured ${new Date(savedSettings.configuredAt).toLocaleDateString()}.`
                  : 'Save once to activate your personal plan.'}{' '}
                {user
                  ? 'This plan can sync with your signed-in account.'
                  : configured
                    ? 'Sign in to carry this plan across devices.'
                    : 'It is currently saved on this device.'}
              </p>
            </div>
          </div>
        </Section>

        <div className="print-area">
        <Section
          title={isRestDay ? 'Today: light study and recovery' : "Today's preparation plan"}
          description={isRestDay
            ? 'Keep the streak alive with a lighter schedule. Complete the most important tasks only.'
            : 'The lowest-progress subjects and due revisions receive priority automatically.'}
        >
          <div className="space-y-2">
            {tasks.map((task, index) => {
              const done = completed.includes(task.id)
              return (
                <article
                  key={task.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${
                    done ? 'border-emerald-200 bg-emerald-50/70' : 'bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                      done ? 'border-emerald-700 bg-emerald-700 text-white' : 'text-muted-foreground hover:bg-secondary'
                    }`}
                    aria-label={done ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                  >
                    {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-bold ${done ? 'text-emerald-900 line-through' : 'text-pine'}`}>
                        {task.title}
                      </h3>
                      <Badge tone="gray">{task.subject}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> {task.minutes} min
                    </span>
                    <Link
                      to={task.to}
                      className="inline-flex h-9 items-center gap-1 rounded-md bg-pine px-3 text-xs font-bold text-white hover:bg-emerald-900"
                    >
                      Start <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Plan tasks rotate daily and automatically prioritise lower-progress subjects.
          </p>
        </Section>
        </div>
      </div>
    </div>
  )
}
