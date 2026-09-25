import { useEffect, useState } from 'react'
import { serverNow } from './api'

/**
 * Server-corrected "now", ticking every `intervalMs`. Recomputes immediately
 * when the tab wakes, so a countdown is right after sleep or a clock change.
 */
export function useServerClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => serverNow())
  useEffect(() => {
    const tick = () => setNow(serverNow())
    const id = window.setInterval(tick, intervalMs)
    const wake = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [intervalMs])
  return now
}

/** Calls `onReached` once when server time passes `iso` (e.g. to re-fetch state). */
export function useBoundary(iso: string | null | undefined, now: number, onReached: () => void) {
  const target = iso ? Date.parse(iso) : Number.NaN
  const reached = Number.isFinite(target) && now >= target
  const [fired, setFired] = useState<string | null>(null)
  useEffect(() => {
    if (reached && iso && fired !== iso) {
      setFired(iso)
      onReached()
    }
  }, [reached, iso, fired, onReached])
}
