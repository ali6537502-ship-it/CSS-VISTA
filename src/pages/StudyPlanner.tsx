import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  BookOpen, CalendarCheck2, Check, ChevronRight, Clock3, Pencil, RotateCcw, Save, Sparkles,
} from 'lucide-react'
import { Badge, PageHeader } from '@/components/shared'
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

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
type DraftSettings = Omit<StudyPlannerSettings, 'configuredAt'>

const fieldLabel = 'block text-sm font-semibold text-slate-900'
const fieldInput = 'mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20'

/**
 * The four answers a plan needs. Shown open while there is no plan, and behind
 * an Edit button once there is one — so the page leads with the schedule
 * instead of the setup a student already finished.
 */
function PlanSettings({ settings, setSettings, onSave, saveLabel }: {
  settings: DraftSettings
  setSettings: (update: (current: DraftSettings) => DraftSettings) => void
  onSave: () => void
  saveLabel: string
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className={fieldLabel}>
          When is your exam?
          <input
            type="date"
            value={settings.examDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setSettings((current) => ({ ...current, examDate: event.target.value }))}
            className={fieldInput}
          />
        </label>
        <label className={fieldLabel}>
          Hours you can study a day
          <input
            type="number"
            min={1}
            max={12}
            value={settings.dailyHours}
            onChange={(event) => setSettings((current) => ({ ...current, dailyHours: Number(event.target.value) || 1 }))}
            className={fieldInput}
          />
        </label>
        <label className={fieldLabel}>
          Your lighter day each week
          <select
            value={settings.restDay}
            onChange={(event) => setSettings((current) => ({ ...current, restDay: Number(event.target.value) }))}
            className={fieldInput}
          >
            {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
        </label>
      </div>

      <div>
        <p className={fieldLabel}>Your optional subjects</p>
        <p className="mt-1 text-sm text-slate-500">Pick the optionals you have chosen. You can change these later.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allOptionalSubjects.map((subject) => {
            const selected = settings.selectedOptionals.includes(subject)
            return (
              <label
                key={subject}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                  selected ? 'border-emerald-700 bg-emerald-50 font-semibold text-emerald-950' : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
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

      <button
        type="button"
        onClick={onSave}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-6 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        <Save className="h-4 w-4" /> {saveLabel}
      </button>
    </div>
  )
}

function StepHeading({ step, title, detail }: { step: string; title: string; detail: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-900 text-sm font-bold text-white">{step}</span>
      <div>
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  )
}

export default function StudyPlanner() {
  const initial = getState()
  const [openedAt] = useState(() => Date.now())
  const stored = initial.studyPlanner
  const [settings, setSettings] = useState<DraftSettings>(
    stored
      ? { examDate: stored.examDate, dailyHours: stored.dailyHours, restDay: stored.restDay, selectedOptionals: stored.selectedOptionals }
      : defaultStudyPlannerSettings(),
  )
  const [savedSettings, setSavedSettings] = useState(stored)
  const [editing, setEditing] = useState(false)
  const [completed, setCompleted] = useState<string[]>(initial.planTaskCompletions?.[localDateKey()] ?? [])
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
  const hasPlan = Boolean(savedSettings)

  function saveSettings() {
    saveStudyPlanner(settings)
    setSavedSettings(getState().studyPlanner)
    setEditing(false)
  }

  function toggleTask(taskId: string) {
    const done = togglePlanTask(today, taskId)
    setCompleted((current) => (done ? [...new Set([...current, taskId])] : current.filter((id) => id !== taskId)))
  }

  const syncNote = user
    ? 'Your plan syncs with your signed-in account.'
    : configured
      ? 'Sign in to carry this plan across devices.'
      : 'Sign in whenever you want to use this plan across devices.'

  return (
    <div>
      <PageHeader
        title="My Study Plan"
        description="Set your exam date and study hours once, then work through the schedule day by day."
      />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/account/dashboard" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-800">
            ← My CSS Vista
          </Link>
          <PrintMenu answersAvailable={false} label="Print or save plan" />
        </div>

        {!hasPlan ? (
          /* First run: one guided path, nothing collapsed, nothing competing. */
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <StepHeading step="1" title="Tell us about your exam" detail="Four answers are all CSS Vista needs to build your schedule." />
              <PlanSettings settings={settings} setSettings={setSettings} onSave={saveSettings} saveLabel="Create my plan" />
              <p className="mt-4 text-xs text-slate-500">{syncNote}</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <StepHeading step="2" title="Choose what to study" detail="Pick topics from the FPSC syllabus and place them on your calendar." />
              <FpscSyllabusPlanner />
            </section>
          </>
        ) : (
          <>
            {/* The plan a student already made: a summary they can read at a
                glance, with the form only when they ask for it. */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Your plan</p>
                  <h2 className="mt-1.5 text-xl font-bold text-slate-950">
                    {examDatePassed ? 'Your exam date has passed' : `${daysLeft} days to your exam`}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(`${settings.examDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}{settings.dailyHours} hour{settings.dailyHours === 1 ? '' : 's'} a day
                    {' · '}{weekdays[settings.restDay]} is your lighter day
                    {settings.selectedOptionals.length ? ` · ${settings.selectedOptionals.length} optional${settings.selectedOptionals.length === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  aria-expanded={editing}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:border-emerald-700 hover:text-emerald-800"
                >
                  <Pencil className="h-4 w-4" /> {editing ? 'Close' : 'Edit plan'}
                </button>
              </div>

              {editing && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <PlanSettings settings={settings} setSettings={setSettings} onSave={saveSettings} saveLabel="Save changes" />
                  <p className="mt-4 text-xs text-slate-500">{syncNote}</p>
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-600"><CalendarCheck2 className="h-4 w-4 text-emerald-800" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Exam countdown</span></div>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{examDatePassed ? '—' : daysLeft}</p>
                  <p className="text-xs text-slate-500">{examDatePassed ? 'Edit your plan to set a new date.' : 'days remaining'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-600"><RotateCcw className="h-4 w-4 text-emerald-800" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Smart revision</span></div>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{revisionStats.due}</p>
                  <p className="text-xs text-slate-500">MCQs due for revision</p>
                </div>
              </div>
            </section>

            <PlannerDashboard />

            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Add topics to your schedule</h2>
                  <p className="mt-1 text-sm text-slate-500">Pick from the FPSC syllabus and place topics on any day.</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </summary>
              <div className="border-t border-slate-200 p-5 sm:p-6"><FpscSyllabusPlanner /></div>
            </details>

            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Sparkles className="h-4 w-4 text-emerald-800" /> Suggested extra practice</h2>
                  <p className="mt-1 text-sm text-slate-500">Optional ideas based on your weaker subjects. Separate from the schedule above.</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </summary>
              <div className="border-t border-slate-200 p-5 sm:p-6">
                <p className="text-sm font-semibold text-slate-900">{isRestDay ? 'Light study and recovery' : 'Ideas for today'}</p>
                <p className="text-xs text-slate-500">{completedCount}/{tasks.length} suggestions completed</p>
                <div className="mt-4 space-y-2">
                  {tasks.map((task, index) => {
                    const done = completed.includes(task.id)
                    return (
                      <article key={task.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                        <button type="button" onClick={() => toggleTask(task.id)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-slate-500 hover:border-emerald-700'}`} aria-label={done ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}>
                          {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><h3 className={`font-bold ${done ? 'text-emerald-900 line-through' : 'text-slate-900'}`}>{task.title}</h3><Badge tone="gray">{task.subject}</Badge></div>
                          <p className="mt-1 text-sm text-slate-500">{task.detail}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock3 className="h-3.5 w-3.5" /> {task.minutes} min</span>
                          <Link to={task.to} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-900 px-3 text-xs font-bold text-white hover:bg-emerald-800">Start <ChevronRight className="h-4 w-4" /></Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><BookOpen className="h-4 w-4" /> Suggestions rotate daily and prioritise lower-progress subjects.</p>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  )
}
