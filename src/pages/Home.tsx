import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  CalendarCheck2, CheckCircle2, ChevronRight, FileText, Flame, Globe,
  Landmark, Sparkles, Target,
} from 'lucide-react'
import { getState, getStats, getVisitStreak, touchVisit } from '@/lib/store'
import { getRevisionStats, recentActivities } from '@/lib/progress'
import { mergedHomeCards } from '@/lib/admin'
import { defaultHomeCards } from '@/data/homeCards'
import { cardIcons } from '@/data/homeCardIcons'
import LiveCountdown from '@/components/LiveCountdown'
import { useAccount } from '@/lib/accountContext'

function CinematicGreenFlow() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoEnabled, setVideoEnabled] = useState(false)

  useEffect(() => {
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (connection.connection?.saveData || reducedMotion.matches) return

    const timer = window.setTimeout(() => setVideoEnabled(true), 250)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const syncPlayback = () => {
      if (document.hidden) {
        video.pause()
      } else {
        void video.play().catch(() => undefined)
      }
    }

    syncPlayback()
    document.addEventListener('visibilitychange', syncPlayback)
    return () => document.removeEventListener('visibilitychange', syncPlayback)
  }, [videoEnabled])

  return (
    <div className="home-live-wallpaper" aria-hidden="true">
      {videoEnabled && (
        <video
          ref={videoRef}
          className="home-live-wallpaper-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/videos/css-vista-live-green-lite.mp4" type="video/mp4" />
        </video>
      )}
      <div className="home-live-wallpaper-tint" />
    </div>
  )
}

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
  const { user } = useAccount()
  const stats = useMemo(() => getStats(), [])
  const activities = useMemo(() => recentActivities(4), [])
  const modules = useMemo(
    () => mergedHomeCards(defaultHomeCards).filter((card) => card.visible),
    [],
  )
  const [visit] = useState(() => {
    const current = getVisitStreak()
    return current.checkedInToday ? current : touchVisit()
  })

  const practiceProgress = stats.totalQuizzes ? stats.accuracy : 0
  const plannerConfigured = useMemo(() => Boolean(getState().studyPlanner), [])
  const revisionDue = useMemo(() => getRevisionStats().due, [])
  const studentName = useMemo(() => {
    const fullName = user?.user_metadata?.full_name
    if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()
    return user?.email?.split('@')[0] || 'aspirant'
  }, [user])

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <div className="mx-auto max-w-[1520px] space-y-4 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <section className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="vista-hero relative overflow-hidden rounded-xl px-5 py-4 text-white shadow-[0_14px_38px_rgba(4,69,43,0.16)] sm:px-6 sm:py-4">
            <CinematicGreenFlow />
            <div className="absolute -bottom-20 -right-16 opacity-[0.09]" aria-hidden="true">
              <Landmark className="h-80 w-80" strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-[27px] font-bold leading-tight sm:text-[32px] lg:text-[34px]">
                    {greeting()},{' '}
                    <span className="block text-amber-400 sm:inline">{studentName}</span>
                  </h1>
                  <span className="mt-2 block h-1 w-10 rounded-full bg-amber-400" />
                  <p className="mt-2 text-sm text-emerald-50/90">
                    Your preparation command center
                  </p>
                </div>

                <Link
                  to="/dashboard"
                  className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-black/15 px-2.5 py-2 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/25"
                  aria-label={`${visit.current} day streak. Best ${visit.best}. Unlimited streak.`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Flame className="h-5 w-5 fill-white/20" />
                  </span>
                  <span>
                    <span className="block whitespace-nowrap text-xs font-black">
                      {visit.current} day streak <span className="text-amber-300">· ∞</span>
                    </span>
                    <span className="block text-[9px] text-emerald-50/75">
                      Best {visit.best} · {visit.totalVisitDays} visits
                    </span>
                  </span>
                </Link>
              </div>

              <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,560px)_84px] sm:justify-between sm:gap-3">
                <div className="min-w-0 max-w-[560px] [&>div]:shadow-lg">
                  <LiveCountdown compact hero />
                </div>

                <Link to="/dashboard" className="group mx-auto hidden text-center sm:block">
                  <div
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-full p-1.5 sm:h-20 sm:w-20"
                    style={{
                      background: `conic-gradient(#79c66e ${practiceProgress * 3.6}deg, rgba(255,255,255,.18) 0deg)`,
                    }}
                  >
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-pine">
                      <span className="text-xl font-black">{practiceProgress}%</span>
                      <span className="text-[8px] text-emerald-100">Overall progress</span>
                    </div>
                  </div>
                  <span className="mt-1 inline-flex items-center text-[10px] font-bold text-amber-300">
                    View progress <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/study-planner"
              className="vista-card group relative col-span-2 flex min-h-[118px] min-w-0 items-center gap-3 overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50/70 p-3 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-4 lg:h-full lg:flex-col lg:items-start lg:justify-center"
            >
              <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-300/15 blur-2xl" aria-hidden="true" />
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pine text-white shadow-md shadow-emerald-900/10">
                <CalendarCheck2 className="h-6 w-6" />
              </span>
              <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-black text-pine">Today’s plan</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800">
                    <Sparkles className="h-3 w-3" /> Personal
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {plannerConfigured
                    ? revisionDue
                      ? `${revisionDue} smart revision${revisionDue === 1 ? '' : 's'} ready today`
                      : 'You are caught up. Choose the next focused task.'
                    : 'Build a focused plan from your subjects, hours and targets.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    plannerConfigured ? `${revisionDue} due` : 'Set subjects',
                    'Practice',
                    'Review',
                  ].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-white/80 px-2 py-1 text-[10px] font-bold text-emerald-900">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {item}
                    </span>
                  ))}
                </div>
              </div>
              <span className="relative hidden rounded-md bg-pine px-3 py-2 text-xs font-bold text-white 2xl:block">Open plan</span>
              <ChevronRight className="relative h-5 w-5 shrink-0 text-emerald-800 transition-transform group-hover:translate-x-1 2xl:hidden" />
            </Link>
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
