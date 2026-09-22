import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { saveStudySession, type StudySession } from '@/lib/progress'

const IDLE_AFTER_MS = 90_000
const SAVE_EVERY_MS = 30_000

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function routeArea(pathname: string) {
  if (pathname === '/') return 'Planning & overview'
  if (pathname.startsWith('/mpt') || pathname.startsWith('/five-minute')) return 'MPT preparation'
  if (pathname.startsWith('/gk')) return 'GK World'
  if (pathname.startsWith('/subjects') || pathname.startsWith('/start-css')) return 'CSS subjects'
  if (pathname.startsWith('/notes') || pathname.startsWith('/handwritten-notes')) return 'Notes'
  if (pathname.startsWith('/book') || pathname.startsWith('/lectures')) return 'Reading & lectures'
  if (pathname.startsWith('/past-papers')) return 'Past papers'
  if (pathname.startsWith('/test-series')) return 'Written test series'
  if (pathname.startsWith('/answer')) return 'Answer writing'
  if (pathname.startsWith('/study-planner') || pathname.startsWith('/study-tools')) return 'Study planning'
  if (pathname.startsWith('/grammar') || pathname.startsWith('/language')) return 'Language practice'
  if (pathname.startsWith('/current-affairs')) return 'Current affairs'
  if (pathname.startsWith('/games')) return 'Learning games'
  return 'CSS preparation'
}

function shouldTrack(pathname: string) {
  return !pathname.startsWith('/sadiaali')
    && !pathname.startsWith('/account')
    && !pathname.startsWith('/live-theme-demos')
}

function createSession(pathname: string): StudySession {
  const now = Date.now()
  return {
    id: `study-${now}-${Math.random().toString(36).slice(2, 8)}`,
    date: localDateKey(),
    path: pathname,
    area: routeArea(pathname),
    seconds: 0,
    startedAt: now,
    updatedAt: now,
  }
}

export default function StudyActivityTracker() {
  const { pathname } = useLocation()
  const lastInteractionRef = useRef(0)

  useEffect(() => {
    const markActive = () => { lastInteractionRef.current = Date.now() }
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }))
    return () => events.forEach((event) => window.removeEventListener(event, markActive))
  }, [])

  useEffect(() => {
    if (!shouldTrack(pathname)) return

    let session = createSession(pathname)
    let lastTickAt = Date.now()
    let lastSavedSeconds = 0
    let lastSaveAt = Date.now()

    const flush = () => {
      if (session.seconds <= lastSavedSeconds) return
      saveStudySession(session)
      lastSavedSeconds = session.seconds
      lastSaveAt = Date.now()
    }

    const tick = () => {
      const now = Date.now()
      const nextDate = localDateKey(new Date(now))
      if (nextDate !== session.date) {
        flush()
        session = createSession(pathname)
        lastSavedSeconds = 0
        lastSaveAt = now
      }

      const elapsed = Math.min(10, Math.max(0, (now - lastTickAt) / 1000))
      const activelyStudying = document.visibilityState === 'visible'
        && now - lastInteractionRef.current <= IDLE_AFTER_MS
      if (activelyStudying) session.seconds += elapsed
      lastTickAt = now

      if (now - lastSaveAt >= SAVE_EVERY_MS) flush()
    }

    const handleVisibility = () => {
      tick()
      if (document.visibilityState === 'hidden') flush()
      else lastTickAt = Date.now()
    }
    const handlePageExit = () => {
      tick()
      flush()
    }

    lastInteractionRef.current = Date.now()
    const timer = window.setInterval(tick, 5_000)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageExit)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageExit)
      tick()
      flush()
    }
  }, [pathname])

  return null
}
