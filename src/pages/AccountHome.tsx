import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, Bookmark, CalendarCheck2, ClipboardList, Languages, Newspaper, Target, UserRound } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { getState, getStats } from '@/lib/store'
import { activeStudyTasks, dueStudyTasks, localTaskDateKey, readTaskArchiveState } from '@/lib/myTasks'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { dailyEnglishStatus } from '@/components/DailyEnglishPanel'
import { briefingRoot, displayDate, latestRange, overviewSchema, pakistanDate } from '@/features/current-affairs/model'
import { useBriefing } from '@/features/current-affairs/useBriefing'
import { AuthenticatedAccountAd } from '@/components/Ads'

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function daysRemaining(examDate?: string) {
  if (!examDate) return null
  const target = new Date(`${examDate}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86_400_000))
}

/**
 * One destination. The status line is the only number on the card: it says
 * where the student stands without turning the page into a metrics wall.
 *
 * Motion lives in `.cssv-choice` (src/index.css): the cards rise in with a
 * stagger, lift on hover and carry a sheen that follows the pointer. The
 * stylesheet disables all of it under prefers-reduced-motion.
 */
function ChoiceCard({ to, icon: Icon, title, status, index }: { to: string; icon: ComponentType<{ className?: string }>; title: string; status: string; index: number }) {
  // Hand the sheen the pointer position. Cheap enough to run inline: it only
  // writes two custom properties and never triggers a React render.
  function track(event: { currentTarget: HTMLElement; clientX: number; clientY: number }) {
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--cssv-choice-x', `${event.clientX - box.left}px`)
    event.currentTarget.style.setProperty('--cssv-choice-y', `${event.clientY - box.top}px`)
  }
  return (
    <Link
      to={to}
      onPointerMove={track}
      style={{ '--cssv-choice-index': String(index) } as CSSProperties}
      className="cssv-choice flex min-h-[9.5rem] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:p-6"
    >
      <span className="cssv-choice-icon grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-5">
        <span className="cssv-choice-title block text-lg font-bold text-slate-950">{title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          {status}
          <ArrowRight className="cssv-choice-arrow h-4 w-4 shrink-0 text-emerald-700" />
        </span>
      </span>
    </Link>
  )
}

export default function AccountHome() {
  const { user } = useAccount()
  const [version, setVersion] = useState(0)
  const [syllabusTotal, setSyllabusTotal] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  useEffect(() => {
    let active = true
    fetch('/fpsc-syllabus.json')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('unavailable')))
      .then((data: { subjects?: Array<{ sections?: Array<{ items?: string[] }> }> }) => {
        if (!active) return
        setSyllabusTotal((data.subjects ?? []).reduce(
          (total, subject) => total + (subject.sections ?? []).reduce((count, section) => count + (section.items?.length ?? 0), 0),
          0,
        ))
      })
      .catch(() => { if (active) setSyllabusTotal(0) })
    return () => { active = false }
  }, [])

  // The edition card reads the same overview the reading desk uses, so it always
  // names the edition the student would actually open.
  const briefing = useBriefing('view=overview&date=' + latestRange, overviewSchema)

  const snapshot = useMemo(() => {
    void version
    const state = getState()
    const stats = getStats()
    const activeTasks = activeStudyTasks(state.studyScheduleTasks ?? [], readTaskArchiveState())
    const today = localTaskDateKey()
    const todayTasks = activeTasks.filter((task) => task.date === today)
    const remaining = dueStudyTasks(activeTasks).today.filter((task) => task.status !== 'completed')
    const statuses = Object.values(state.syllabusItemStatuses ?? {})
    const mocks = state.quizResults.filter((result) => result.mockKind === 'gk' || result.mockKind === 'mpt')
    return {
      stats,
      plan: state.studyPlanner,
      examDate: state.studyPlanner?.examDate,
      remaining,
      todayMinutes: todayTasks.reduce((sum, task) => sum + task.minutes, 0),
      syllabusCompleted: statuses.filter((status) => status === 'completed').length,
      mocks: mocks.length,
      saved: (state.bookmarks?.length ?? 0) + (state.savedAnswers?.length ?? 0),
      english: dailyEnglishStatus(),
    }
  }, [version])

  const name = (user?.display_name || '').trim().split(/\s+/)[0]
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Karachi' }).format(new Date()))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const examDays = daysRemaining(snapshot.examDate)
  const examYear = snapshot.examDate ? new Date(`${snapshot.examDate}T12:00:00`).getFullYear() : null
  const syllabusPercent = syllabusTotal ? Math.round((snapshot.syllabusCompleted / syllabusTotal) * 100) : 0

  const summary = briefing.data?.summary
  const affairsStatus = !summary
    ? 'Your daily developments, explained'
    : !summary.published
      ? 'Your next edition is being prepared'
      : `${summary.date === pakistanDate() ? 'Today' : displayDate(summary.date)} · ${summary.unread} unread`

  const context = [
    examYear ? `CSS ${examYear}` : null,
    examDays === null ? null : `${examDays} days left`,
    snapshot.stats.streak ? `${snapshot.stats.streak}-day streak` : null,
  ].filter(Boolean).join(' · ')

  const choices = [
    { to: briefingRoot, icon: Newspaper, title: 'Current Affairs', status: affairsStatus },
    {
      to: '/account/tasks', icon: CalendarCheck2, title: 'Today’s Tasks',
      status: snapshot.remaining.length
        ? `${snapshot.remaining.length} task${snapshot.remaining.length === 1 ? '' : 's'} · ${formatMinutes(snapshot.todayMinutes)} planned`
        : 'Nothing left for today',
    },
    {
      to: '/account/english', icon: Languages, title: 'Daily English',
      status: snapshot.english.completed >= snapshot.english.total
        ? 'Completed for today'
        : `${snapshot.english.completed} of ${snapshot.english.total} parts done`,
    },
    {
      to: '/account/progress', icon: Target, title: 'Practice & Mocks',
      status: snapshot.stats.attempted
        ? `${snapshot.stats.accuracy}% accuracy · ${snapshot.mocks} mock${snapshot.mocks === 1 ? '' : 's'}`
        : 'Start your first practice set',
    },
    {
      to: '/fpsc-syllabus', icon: BookOpen, title: 'My Syllabus',
      status: syllabusPercent ? `${syllabusPercent}% complete` : 'Mark your first topic',
    },
    {
      to: '/account/library', icon: Bookmark, title: 'My Library',
      status: snapshot.saved ? `${snapshot.saved} saved item${snapshot.saved === 1 ? '' : 's'}` : 'Save what is worth revisiting',
    },
  ]

  const continueReading = briefing.data?.continue_reading?.[0]
  const plan = snapshot.plan
  const restDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][plan?.restDay ?? 5]
  const planSummary = plan
    ? [examYear ? `CSS ${examYear}` : null, `${plan.dailyHours} hour${plan.dailyHours === 1 ? '' : 's'} a day`, `${restDay} is your light day`].filter(Boolean).join(' · ')
    : 'Set your exam date and study hours, and CSS Vista builds the schedule with you.'

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{greeting}{name ? `, ${name}` : ''}</h1>
            {context && <p className="mt-2 text-sm text-slate-500">{context}</p>}
          </div>
          <Link
            to="/account/settings"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-emerald-700 hover:text-emerald-800"
          >
            {user?.photo_complete
              ? <img src="/api/student/photo-view.php" alt="" className="h-7 w-7 rounded-full object-cover" />
              : <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100"><UserRound className="h-4 w-4" /></span>}
            My profile
          </Link>
        </header>

        <section className="mt-10" aria-label="Your study plan">
          <Link
            to="/study-planner"
            className="cssv-choice flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:p-6"
            style={{ '--cssv-choice-index': '0' } as CSSProperties}
          >
            <span className="cssv-choice-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
              <ClipboardList className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="cssv-choice-title block text-lg font-bold text-slate-950">{plan ? 'My Study Plan' : 'Create your study plan'}</span>
              <span className="mt-1 block text-sm text-slate-500">{planSummary}</span>
            </span>
            <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white">
              {plan ? 'Edit plan' : 'Start'} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </section>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-[.14em] text-slate-400">What would you like to do today?</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {choices.map((choice, index) => <ChoiceCard key={choice.title} {...choice} index={index} />)}
        </div>

        {(continueReading || snapshot.remaining.length > 0) && (
          <section className="mt-12" aria-label="Pick up where you left off">
            <h2 className="text-sm font-semibold uppercase tracking-[.14em] text-slate-400">Pick up where you left off</h2>
            <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
              {continueReading && (
                <Link to={`${briefingRoot}/${continueReading.id}`} className="flex items-center gap-4 py-4 hover:text-emerald-800">
                  <Newspaper className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{continueReading.headline}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{continueReading.category} · continue reading</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              )}
              {snapshot.remaining.slice(0, 3).map((task) => (
                <Link key={task.id} to="/account/tasks" className="flex items-center gap-4 py-4 hover:text-emerald-800">
                  <CalendarCheck2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{task.topic}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{task.subject} · {formatMinutes(task.minutes)}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Signed-in account content. Advertising eligibility is decided by the
            route registry, not by this page. */}
        <div className="mt-12"><AuthenticatedAccountAd /></div>
      </div>
    </main>
  )
}
