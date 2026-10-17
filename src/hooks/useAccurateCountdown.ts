import { useCallback, useEffect, useRef, useState } from 'react'

function safeSeconds(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

export function remainingSeconds(deadlineMs: number, nowMs = Date.now()) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
}

/** Remaining whole seconds, preserving overdue time below zero. */
export function signedRemainingSeconds(deadlineMs: number, nowMs = Date.now()) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0
  return Math.ceil((deadlineMs - nowMs) / 1000)
}

/** Existing countdowns retain their stop-at-zero behavior unless overtime is opted into. */
export function useAccurateCountdown(initialSeconds: number, onExpire?: () => void, allowOvertime = false) {
  const initial = allowOvertime && Number.isFinite(initialSeconds) ? Math.round(initialSeconds) : safeSeconds(initialSeconds)
  const [remaining, setRemaining] = useState(initial)
  const [running, setRunning] = useState(false)
  const deadlineRef = useRef<number | null>(null)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const tick = useCallback(() => {
    const deadline = deadlineRef.current
    if (deadline === null) return
    const next = allowOvertime ? signedRemainingSeconds(deadline) : remainingSeconds(deadline)
    setRemaining((current) => current === next ? current : next)
    if (next > 0 || expiredRef.current) return
    expiredRef.current = true
    if (!allowOvertime) {
      deadlineRef.current = null
      setRunning(false)
    }
    onExpireRef.current?.()
  }, [allowOvertime])

  useEffect(() => {
    if (!running) return
    tick()
    const interval = window.setInterval(tick, 250)
    const refresh = () => tick()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [running, tick])

  const startFrom = useCallback((seconds: number) => {
    const next = allowOvertime && Number.isFinite(seconds) ? Math.round(seconds) : safeSeconds(seconds)
    expiredRef.current = next <= 0
    setRemaining(next)
    if (next === 0 && !allowOvertime) {
      deadlineRef.current = null
      setRunning(false)
      return
    }
    deadlineRef.current = Date.now() + next * 1000
    setRunning(true)
  }, [allowOvertime])

  const start = useCallback(() => {
    if (remaining <= 0 && !allowOvertime) return
    startFrom(remaining)
  }, [remaining, startFrom, allowOvertime])

  const pause = useCallback(() => {
    tick()
    deadlineRef.current = null
    setRunning(false)
  }, [tick])

  const reset = useCallback((seconds = initial) => {
    deadlineRef.current = null
    expiredRef.current = false
    setRemaining(allowOvertime && Number.isFinite(seconds) ? Math.round(seconds) : safeSeconds(seconds))
    setRunning(false)
  }, [initial, allowOvertime])

  const toggle = useCallback(() => {
    if (running) pause()
    else start()
  }, [pause, running, start])

  const getRemaining = useCallback(() => {
    const deadline = deadlineRef.current
    return deadline === null ? remaining : (allowOvertime ? signedRemainingSeconds(deadline) : remainingSeconds(deadline))
  }, [remaining, allowOvertime])

  return { remaining, running, start, startFrom, pause, reset, toggle, getRemaining }
}
