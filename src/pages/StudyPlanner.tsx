import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarClock, Check, ChevronRight, Clock3, Info, RotateCcw, Save, Target } from 'lucide-react'
import { PageHeader, Section, Badge } from '@/components/shared'
import { useAccount } from '@/lib/accountContext'
import { getState, saveStudyPlanner, togglePlanTask, getRevisionStats, type StudyPlannerSettings } from '@/lib/store'
import { compulsorySubjects, optionalGroups } from '@/data/syllabus'

const OPTIONAL_NAMES = optionalGroups.flatMap((g) => g.subjects.map((s) => s.name)).sort((a, b) => a.localeCompare(b))
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayNumber(key: string): number {
  return key.split('-').reduce((sum, part) => sum + Number(part), 0)
}

function defaultSettings(): StudyPlannerSettings {
  return { examDate: '2027-01-27', dailyHours: 4, restDay: 5, selectedOptionals: [] }
}

interface PlanTask {
  id: string
  subject: string
  title: string
  detail: string
  minutes: number
  to: string
}

function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildTasks(settings: StudyPlannerSettings, progress: Record<string, number>, date: string, dueReviews: number): PlanTask[] {
  const compulsory = compulsorySubjects.map((s) => ({ name: s.name, slug: s.slug, progress: progress[s.slug] ?? 0, compulsory: true }))
  const optionals = settings.selectedOptionals.map((name) => {
    const slug = slugifyName(name)
    return { name, slug, progress: progress[slug] ?? 0, compulsory: false }
  })
  const ordered = [...compulsory, ...optionals].sort((a, b) => a.progress - b.progress || a.name.localeCompare(b.name))
  const taskCount = Math.max(3, Math.min(5, Math.round(settings.dailyHours)))
  const offset = ordered.length ? dayNumber(date) % ordered.length : 0
  const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)]
  const templates = [
    { title: 'Learn one syllabus unit', detail: 'Read the notes or watch the relevant lecture.', minutes: 50 },
    { title: 'Practise active recall', detail: 'Close the notes and reproduce the main headings.', minutes: 35 },
    { title: 'Write one timed answer', detail: 'Attempt one analytical answer with an outline.', minutes: 30 },
    { title: 'Revise and consolidate', detail: 'Review weak areas and update short notes.', minutes: 35 },
    { title: 'Attempt focused practice', detail: 'Use questions linked to this subject.', minutes: 30 },
  ]
  const tasks: PlanTask[] = Array.from({ length: taskCount }, (_, i) => {
    const subject = rotated[i % Math.max(1, rotated.length)] ?? compulsory[0]
    const template = templates[i % templates.length]
    const to =
      i === 2
        ? `/answer-evaluation?subject=${encodeURIComponent(subject.name)}`
        : subject.compulsory
          ? `/subjects/compulsory/${subject.slug}`
          : '/lectures'
    return { id: `${date}-${subject.slug}-${i}`, subject: subject.name, title: template.title, detail: template.detail, minutes: template.minutes, to }
  })
  if (dueReviews > 0) {
    tasks[0] = {
      id: `${date}-smart-revision`,
      subject: 'Smart Revision',
      title: `Complete ${Math.min(20, dueReviews)} due questions`,
      detail: 'These questions are due now according to your personal revision schedule.',
      minutes: 25,
      to: '/gk/quiz?mode=revision',
    }
  }
  return tasks
}

export default function StudyPlanner() {
  const [now] = useState(() => Date.now())
  const existing = getState().studyPlanner
  const [settings, setSettings] = useState<StudyPlannerSettings>(
    existing
      ? { examDate: existing.examDate, dailyHours: existing.dailyHours, restDay: existing.restDay, selectedOptionals: existing.selectedOptionals }
      : defaultSettings(),
  )
  const [savedSettings, setSavedSettings] = useState(existing)
  const [completed, setCompleted] = useState<string[]>(() => getState().planTaskCompletions?.[todayKey()] ?? [])
  const { user, configured } = useAccount()
  const revision = getRevisionStats()
  const today = todayKey()
  const isRestDay = new Date().getDay() === settings.restDay
  const tasks = useMemo(
    () => buildTasks(settings, getState().subjectProgress, today, revision.due),
    [settings, today, revision.due],
  )
  const doneCount = tasks.filter((t) => completed.includes(t.id)).length
  const examTime = new Date(`${settings.examDate}T00:00:00+05:00`).getTime()
  const daysLeft = Math.max(0, Math.ceil((examTime - now) / 86400000))

  function handleSave() {
    saveStudyPlanner(settings)
    setSavedSettings(getState().studyPlanner)
  }

  function toggle(taskId: string) {
    const done = togglePlanTask(today, taskId)
    setCompleted((list) => (done ? [...new Set([...list, taskId])] : list.filter((id) => id !== taskId)))
  }

  return (
    <div>
      <PageHeader
        title="My CSS Study Planner"
        description="A personal, syllabus-based daily plan that uses your selected subjects, available study time, progress and due revisions."
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="vista-card p-4">
            <CalendarClock className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{daysLeft}</p>
            <p className="text-xs text-muted-foreground">Days to selected exam date</p>
          </div>
          <div className="vista-card p-4">
            <Target className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{doneCount}/{tasks.length}</p>
            <p className="text-xs text-muted-foreground">Today's tasks completed</p>
          </div>
          <div className="vista-card p-4">
            <RotateCcw className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{revision.due}</p>
            <p className="text-xs text-muted-foreground">MCQs due for smart revision</p>
          </div>
        </section>

        <Section title="Set up your plan" description="Your settings and task completion are part of your progress record.">
          <div className="rounded-xl border bg-white p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-pine">
                Target examination date
                <input type="date" value={settings.examDate} onChange={(e) => setSettings((s) => ({ ...s, examDate: e.target.value }))} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground" />
              </label>
              <label className="text-sm font-semibold text-pine">
                Study hours each day
                <input type="number" min={1} max={12} value={settings.dailyHours} onChange={(e) => setSettings((s) => ({ ...s, dailyHours: Number(e.target.value) || 1 }))} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground" />
              </label>
              <label className="text-sm font-semibold text-pine">
                Weekly light-study day
                <select value={settings.restDay} onChange={(e) => setSettings((s) => ({ ...s, restDay: Number(e.target.value) }))} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal text-foreground">
                  {DAY_NAMES.map((name, i) => <option key={name} value={i}>{name}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5">
              <p className="text-sm font-semibold text-pine">Your optional subjects</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {OPTIONAL_NAMES.map((name) => {
                  const checked = settings.selectedOptionals.includes(name)
                  return (
                    <label key={name} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${checked ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary/50'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSettings((s) => ({
                            ...s,
                            selectedOptionals: checked ? s.selectedOptionals.filter((n) => n !== name) : [...s.selectedOptionals, name],
                          }))
                        }
                        className="h-4 w-4 accent-emerald-800"
                      />
                      {name}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSave} className="inline-flex h-10 items-center gap-2 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900">
                <Save className="h-4 w-4" /> Save and rebuild plan
              </button>
              <p className="text-xs text-muted-foreground">
                {savedSettings?.configuredAt ? `Last configured ${new Date(savedSettings.configuredAt).toLocaleDateString()}.` : 'Save once to activate your personal plan.'}{' '}
                {user ? 'This plan can sync with your signed-in account.' : configured ? 'Sign in to carry this plan across devices.' : 'It is currently saved on this device.'}
              </p>
            </div>
          </div>
        </Section>

        <Section
          title={isRestDay ? 'Today: light study and recovery' : "Today's preparation plan"}
          description={isRestDay ? 'Keep the streak alive with a lighter schedule. Complete the most important tasks only.' : 'The lowest-progress subjects and due revisions receive priority automatically.'}
        >
          <div className="space-y-2">
            {tasks.map((task, index) => {
              const done = completed.includes(task.id)
              return (
                <article key={task.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${done ? 'border-emerald-200 bg-emerald-50/70' : 'bg-white'}`}>
                  <button
                    type="button"
                    onClick={() => toggle(task.id)}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'text-muted-foreground hover:bg-secondary'}`}
                    aria-label={done ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                  >
                    {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-bold ${done ? 'text-emerald-900 line-through' : 'text-pine'}`}>{task.title}</h3>
                      <Badge tone="gray">{task.subject}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> {task.minutes} min
                    </span>
                    <Link to={task.to} className="inline-flex h-9 items-center gap-1 rounded-md bg-pine px-3 text-xs font-bold text-white hover:bg-emerald-900">
                      Start <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4" /> Plan tasks rotate daily and automatically prioritise lower-progress subjects.
          </p>
        </Section>
      </div>
    </div>
  )
}
