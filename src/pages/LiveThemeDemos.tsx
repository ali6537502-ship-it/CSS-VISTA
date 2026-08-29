import { useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Landmark,
  Orbit,
  Play,
  Sparkles,
  Target,
  Waves,
} from 'lucide-react'

const themes = [
  {
    id: 'video',
    number: '01',
    name: 'Cinematic Green Flow',
    summary: 'A real muted video loop, compressed to about 2 MB with an automatic lightweight fallback.',
    icon: Play,
  },
  {
    id: 'aurora',
    number: '02',
    name: 'Emerald Aurora',
    summary: 'Slow cinematic light, soft particles and a calm premium atmosphere.',
    icon: Sparkles,
  },
  {
    id: 'orbit',
    number: '03',
    name: 'Knowledge Orbit',
    summary: 'Living orbital rings represent subjects moving around one clear goal.',
    icon: Orbit,
  },
  {
    id: 'horizon',
    number: '04',
    name: 'Pakistan Horizon',
    summary: 'A moving night horizon with a subtle national and aspirational identity.',
    icon: Landmark,
  },
  {
    id: 'pages',
    number: '05',
    name: 'Living Knowledge',
    summary: 'Floating pages and softly moving study lines create an academic mood.',
    icon: BookOpen,
  },
  {
    id: 'momentum',
    number: '06',
    name: 'Momentum Waves',
    summary: 'Continuous flowing lines make progress feel active and forward-moving.',
    icon: Waves,
  },
] as const

type ThemeId = (typeof themes)[number]['id']

const particles = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37) % 96}%`,
  top: `${12 + ((index * 29) % 74)}%`,
  delay: `${(index % 7) * -0.8}s`,
  duration: `${5 + (index % 5)}s`,
}))

function LiveBackdrop({ theme }: { theme: ThemeId }) {
  if (theme === 'video') {
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } }
    const allowMotion =
      !connection.connection?.saveData &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    return (
      <div className="live-wallpaper live-wallpaper-video" aria-hidden="true">
        {allowMotion && (
          <video
            className="live-wallpaper-video-media"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/videos/css-vista-live-green.mp4" type="video/mp4" />
          </video>
        )}
        <div className="live-wallpaper-video-tint" />
      </div>
    )
  }

  if (theme === 'aurora') {
    return (
      <div className="live-wallpaper live-wallpaper-aurora" aria-hidden="true">
        <div className="live-aurora-orb live-aurora-orb-one" />
        <div className="live-aurora-orb live-aurora-orb-two" />
        <div className="live-aurora-orb live-aurora-orb-three" />
        {particles.map((particle, index) => (
          <i
            key={index}
            className="live-particle"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
    )
  }

  if (theme === 'orbit') {
    return (
      <div className="live-wallpaper live-wallpaper-orbit" aria-hidden="true">
        <div className="live-orbit live-orbit-one"><i /></div>
        <div className="live-orbit live-orbit-two"><i /></div>
        <div className="live-orbit live-orbit-three"><i /></div>
        <div className="live-orbit-core"><Target /></div>
        <div className="live-grid-glow" />
      </div>
    )
  }

  if (theme === 'horizon') {
    return (
      <div className="live-wallpaper live-wallpaper-horizon" aria-hidden="true">
        <div className="live-horizon-sky" />
        {particles.slice(0, 12).map((particle, index) => (
          <i
            key={index}
            className="live-star"
            style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }}
          />
        ))}
        <Landmark className="live-horizon-monument" strokeWidth={0.8} />
        <div className="live-horizon-line live-horizon-line-one" />
        <div className="live-horizon-line live-horizon-line-two" />
      </div>
    )
  }

  if (theme === 'pages') {
    return (
      <div className="live-wallpaper live-wallpaper-pages" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="live-page"
            style={{
              left: `${6 + ((index * 14) % 88)}%`,
              top: `${5 + ((index * 23) % 70)}%`,
              animationDelay: `${index * -1.1}s`,
            }}
          >
            <span /><span /><span />
          </div>
        ))}
        <BookOpen className="live-pages-book" strokeWidth={0.8} />
      </div>
    )
  }

  return (
    <div className="live-wallpaper live-wallpaper-momentum" aria-hidden="true">
      <div className="live-wave live-wave-one" />
      <div className="live-wave live-wave-two" />
      <div className="live-wave live-wave-three" />
      <div className="live-wave live-wave-four" />
      <div className="live-momentum-pulse"><Flame /></div>
    </div>
  )
}

function LiveHero({ theme }: { theme: ThemeId }) {
  return (
    <section className={`live-demo-stage live-demo-${theme}`}>
      <LiveBackdrop theme={theme} />
      <div className="relative z-10 flex min-h-[520px] flex-col p-5 text-white sm:p-8 lg:min-h-[560px] lg:p-10">
        <div className="flex items-center justify-between gap-3">
          <img
            src="/images/logo.png?v=20260726"
            alt="CSS Vista official logo"
            className="h-12 w-auto rounded-md bg-white/95 object-contain px-2 sm:h-14"
          />
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            Live wallpaper preview
          </div>
        </div>

        <div className="mt-auto grid items-end gap-6 lg:grid-cols-[1fr_420px]">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Your preparation is alive
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Build momentum.
              <span className="block text-amber-300">Earn your future.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-emerald-50/80 sm:text-base">
              A focused command center that moves with your progress, your daily plan and the CSS 2027 countdown.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-emerald-950 shadow-lg transition-transform hover:-translate-y-0.5">
                <Play className="h-4 w-4 fill-current" />
                Continue preparation
              </button>
              <button className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15">
                <CalendarDays className="h-4 w-4" />
                Today&apos;s plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="live-glass-card col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">CSS 2027 countdown</p>
                  <p className="mt-1 font-mono text-xl font-bold sm:text-2xl">181 : 09 : 42 : 18</p>
                </div>
                <Clock3 className="h-7 w-7 text-amber-300" />
              </div>
            </div>
            <div className="live-glass-card">
              <Flame className="h-5 w-5 text-orange-300" />
              <p className="mt-2 text-2xl font-bold">12 days</p>
              <p className="text-xs text-white/65">Current streak</p>
            </div>
            <div className="live-glass-card">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <p className="mt-2 text-2xl font-bold">68%</p>
              <p className="text-xs text-white/65">Overall progress</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LiveThemeDemos() {
  const [selected, setSelected] = useState<ThemeId>('video')
  const active = themes.find((theme) => theme.id === selected) ?? themes[0]

  return (
    <div className="min-h-screen bg-[#f6f8f6]">
      <div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Live homepage concepts</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-pine sm:text-4xl">Choose the motion, not a new logo</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Every option below uses the existing CSS Vista logo unchanged. Select a theme to watch its real motion.
            </p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            Mobile friendly · Reduced-motion safe
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {themes.map((theme) => {
            const Icon = theme.icon
            const chosen = selected === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelected(theme.id)}
                aria-pressed={chosen}
                className={`rounded-xl border p-3 text-left transition-all ${
                  chosen
                    ? 'border-emerald-700 bg-pine text-white shadow-lg'
                    : 'border-emerald-900/10 bg-white text-pine hover:-translate-y-0.5 hover:border-emerald-700/35 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className={`h-5 w-5 ${chosen ? 'text-amber-300' : 'text-emerald-800'}`} />
                  <span className={`text-[11px] font-bold ${chosen ? 'text-white/50' : 'text-muted-foreground'}`}>
                    {theme.number}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold">{theme.name}</p>
                <p className={`mt-1 hidden text-[11px] leading-relaxed sm:block ${chosen ? 'text-white/65' : 'text-muted-foreground'}`}>
                  {theme.summary}
                </p>
              </button>
            )
          })}
        </div>

        <LiveHero key={active.id} theme={active.id} />

        <div className="mt-4 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
          <span className="font-bold text-pine">{active.number}. {active.name}:</span>{' '}
          {active.summary} This is live motion, not a static image.
          {active.id === 'video' && (
            <>
              {' '}Preview footage from{' '}
              <a
                className="font-semibold text-emerald-800 underline underline-offset-2"
                href="https://www.pexels.com/video/flowing-green-particles-12987971/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pexels
              </a>.
            </>
          )}
        </div>
      </div>
    </div>
  )
}
