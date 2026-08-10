import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  CalendarCheck2, ChevronRight, EyeOff, FileText, Flame, Globe, History,
  Infinity as InfinityIcon, Landmark, Play, Target,
} from 'lucide-react'
import { getStats, getVisitStreak, touchVisit } from '@/lib/store'
import { lastActivity, recentActivities } from '@/lib/progress'
import { mergedHomeCards } from '@/lib/admin'
import { defaultHomeCards } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import LiveCountdown from '@/components/LiveCountdown'

const RESUME_HIDDEN_KEY = 'cssvista:home:resume-hidden'
const HERO_HIDDEN_KEY = 'cssvista:home:hero-hidden'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export default function Home() {
  const stats = useMemo(() => getStats(), [])
  const activity = useMemo(() => lastActivity(), [])
  const activities = useMemo(() => recentActivities(4), [])
  const modules = useMemo(
    () => mergedHomeCards(defaultHomeCards).filter((card) => card.visible),
    [],
  )
  const [resumeHidden, setResumeHidden] = useState(
    () => localStorage.getItem(RESUME_HIDDEN_KEY) === '1',
  )
  const [heroHidden, setHeroHidden] = useState(
    () => localStorage.getItem(HERO_HIDDEN_KEY) === '1',
  )
  const [visit] = useState(() => {
    const current = getVisitStreak()
    return current.checkedInToday ? current : touchVisit()
  })

  const resumePath = activity?.path ?? '/gk/quiz?mode=random'
  const resumeLabel = activity?.label ?? 'Start a mixed GK quiz'
  const practiceProgress = stats.totalQuizzes ? stats.accuracy : 0

  function setResumeVisibility(hidden: boolean) {
    setResumeHidden(hidden)
    localStorage.setItem(RESUME_HIDDEN_KEY, hidden ? '1' : '0')
  }

  function setHeroVisibility(hidden: boolean) {
    setHeroHidden(hidden)
    localStorage.setItem(HERO_HIDDEN_KEY, hidden ? '1' : '0')
  }

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <div className="mx-auto max-w-[1520px] space-y-4 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <section className={heroHidden ? 'space-y-3' : 'grid gap-3 lg:grid-cols-[1.6fr_1fr]'}>
          {heroHidden ? (
            <div className="home-resume-enter flex items-center justify-between rounded-lg border bg-white px-3 py-2 shadow-sm sm:px-4">
              <span className="text-xs font-medium text-muted-foreground">Welcome panel hidden</span>
              <button
                type="button"
                onClick={() => setHeroVisibility(false)}
                className="inline-flex items-center gap-2 rounded-md bg-pine px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-900"
              >
                <History className="h-4 w-4" /> Show welcome panel
              </button>
            </div>
          ) : (
          <div className="vista-hero relative overflow-hidden rounded-xl px-5 py-5 text-white shadow-[0_14px_38px_rgba(4,69,43,0.16)] sm:px-7 sm:py-6">
            <div className="absolute -bottom-20 -right-16 opacity-[0.09]" aria-hidden="true">
              <Landmark className="h-80 w-80" strokeWidth={1} />
            </div>
            <button
              type="button"
              onClick={() => setHeroVisibility(true)}
              className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-emerald-950/35 px-2.5 py-2 text-[10px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-emerald-950/55 sm:right-4 sm:top-4 sm:text-xs"
              aria-label="Hide welcome panel"
            >
              <EyeOff className="h-3.5 w-3.5" /> Hide panel
            </button>
            <div className="relative z-10">
              <h1 className="font-display text-[27px] font-bold leading-tight sm:text-4xl lg:text-[38px]">
                {greeting()},{' '}
                <span className="block text-amber-400 sm:inline">aspirant</span>
              </h1>
              <span className="mt-3 block h-1 w-11 rounded-full bg-amber-400" />
              <p className="mt-3 text-sm text-emerald-50/90 sm:text-base">
                Your preparation command center
              </p>

              <div className="mt-5 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_100px] sm:gap-4">
                {resumeHidden ? (
                  <button
                    type="button"
                    onClick={() => setResumeVisibility(false)}
                    className="home-resume-enter inline-flex w-fit items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/15"
                  >
                    <History className="h-4 w-4" /> Show recent activity
                  </button>
                ) : (
                  <div className="home-resume-enter relative min-w-0 rounded-xl bg-white text-foreground shadow-lg">
                    <Link
                      to={resumePath}
                      className="group block rounded-xl p-3 pr-12 transition-transform hover:-translate-y-0.5 sm:p-4 sm:pr-16"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine text-white sm:h-11 sm:w-11">
                          <History className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="hidden text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:block">
                            Continue where you left off
                          </p>
                          <p className="truncate text-sm font-bold text-pine sm:text-[15px]">{resumeLabel}</p>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-emerald-700"
                              style={{ width: `${Math.max(8, practiceProgress)}%` }}
                            />
                          </div>
                        </div>
                        <span className="hidden items-center gap-1 rounded-md bg-pine px-3 py-2 text-xs font-bold text-white md:flex">
                          Resume <Play className="h-3.5 w-3.5 fill-current" />
                        </span>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setResumeVisibility(true)}
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border bg-white/95 p-1.5 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-pine sm:right-2.5 sm:top-2.5"
                      aria-label="Hide continue where you left off"
                      title="Hide this card"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">Hide</span>
                    </button>
                  </div>
                )}

                <Link to="/dashboard" className="group mx-auto hidden text-center sm:block">
                  <div
                    className="flex h-[82px] w-[82px] items-center justify-center rounded-full p-1.5 sm:h-24 sm:w-24 sm:p-2"
                    style={{
                      background: `conic-gradient(#79c66e ${practiceProgress * 3.6}deg, rgba(255,255,255,.18) 0deg)`,
                    }}
                  >
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-pine">
                      <span className="text-2xl font-black">{practiceProgress}%</span>
                      <span className="text-[8px] text-emerald-100 sm:text-[10px]">Overall progress</span>
                    </div>
                  </div>
                  <span className="mt-2 inline-flex items-center text-[10px] font-bold text-amber-300 sm:text-xs">
                    View progress <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
          )}

          <div className={heroHidden
            ? 'grid grid-cols-2 gap-3 lg:grid-cols-[0.85fr_0.85fr_1.3fr]'
            : 'grid grid-cols-2 gap-3 lg:grid-cols-1'
          }>
            <Link
              to="/dashboard"
              className="vista-card group relative flex min-w-0 items-center gap-3 overflow-hidden border-amber-200 bg-gradient-to-r from-amber-50/80 via-white to-emerald-50/60 p-3 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md sm:px-4"
            >
              <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-300/15 blur-2xl" aria-hidden="true" />
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20 sm:h-12 sm:w-12 sm:rounded-2xl">
                <Flame className="h-6 w-6 fill-white/20 sm:h-7 sm:w-7" />
              </span>
              <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className="whitespace-nowrap text-lg font-black leading-none text-pine sm:text-2xl">
                    {visit.current} <span className="text-xs font-bold text-foreground sm:text-base">day streak</span>
                  </p>
                  <span className="ml-auto hidden items-center gap-1 rounded-full border border-emerald-200 bg-white/80 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-800 sm:inline-flex">
                    <InfinityIcon className="h-3.5 w-3.5" /> No limit
                  </span>
                </div>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-amber-700 sm:hidden">
                  ∞ Unlimited comeback
                </p>
                <p className="mt-0.5 text-[9px] text-muted-foreground sm:mt-1 sm:text-xs">
                  Best {visit.best} · {visit.totalVisitDays} visits
                </p>
              </div>
            </Link>

            <Link
              to="/study-tools"
              className="vista-card flex min-w-0 items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-pine">
                <CalendarCheck2 className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-foreground sm:text-lg">Today’s plan</p>
                <p className="hidden text-xs text-muted-foreground sm:block">Daily challenge · Quiz · Revision</p>
              </div>
              <span className="hidden rounded-md bg-pine px-3 py-2 text-xs font-bold text-white xl:block">View plan</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-emerald-800 xl:hidden" />
            </Link>

            <div className="col-span-2 lg:col-span-1 [&>div]:h-full [&>div]:shadow-sm">
              <LiveCountdown compact />
            </div>
          </div>
        </section>

        <section aria-labelledby="primary-modules">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 id="primary-modules" className="font-display text-xl font-bold text-pine sm:text-2xl">
                Explore every preparation area
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                All main CSS Vista categories in one place.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              {modules.length} sections
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {modules.map((module) => {
              const ModuleIcon = cardIcons[module.icon] ?? Globe
              return (
                <Link
                  key={module.id}
                  to={module.to}
                  className="vista-card group relative min-h-[178px] overflow-hidden p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-700/40 hover:shadow-lg"
                >
                  <ModuleIcon className="absolute -bottom-7 -right-7 h-24 w-24 text-emerald-800/[0.07]" strokeWidth={1.25} />
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-white">
                    <ModuleIcon className="h-5 w-5" />
                  </span>
                  <div className="relative mt-3">
                    <h3 className="text-sm font-bold leading-snug text-pine sm:text-base">{module.title}</h3>
                    <span className="mt-2 block h-0.5 w-6 bg-amber-500" />
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                      {module.desc}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                      Open
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="vista-card overflow-hidden">
          <div className="flex items-center justify-between border-l-4 border-amber-500 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Recent activity</h2>
              <p className="text-xs text-muted-foreground">Continue your latest preparation work.</p>
            </div>
            <Link to="/dashboard" className="inline-flex items-center text-sm font-bold text-emerald-800">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {activities.length ? (
            <div className="grid border-t sm:grid-cols-2 xl:grid-cols-4">
              {activities.map((item, index) => (
                <Link
                  key={`${item.path}-${item.ts}`}
                  to={item.path}
                  className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/60 ${
                    index ? 'border-t sm:border-l sm:border-t-0' : ''
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-pine">
                    {item.type === 'past-paper' ? <FileText className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-emerald-700">{relativeTime(item.ts)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t px-5 py-6 text-sm text-muted-foreground">
              Your recent quizzes, categories and past papers will appear here after you begin.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
