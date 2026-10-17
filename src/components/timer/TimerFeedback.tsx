import { useCallback, useEffect, useRef, useState } from 'react'

export type TimerAlertMode = 'off' | 'tones' | 'voice' | 'both'

export const TIMER_ALERTS = [
  { at: 5, text: 'Five minutes elapsed. Your outline should be ready.' },
  { at: 10, text: 'Ten minutes elapsed. Develop your main argument.' },
  { at: 20, text: 'Twenty minutes elapsed. Check balance and evidence.' },
  { at: 35, text: 'Thirty-five minutes elapsed. Conclude and review.' },
] as const

export function formatTimerSeconds(seconds: number) {
  const value = Math.abs(Math.trunc(seconds))
  const minutes = Math.floor(value / 60)
  const remainder = value % 60
  return `${seconds < 0 ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

let audioContext: AudioContext | undefined

/** Call from the Start/Resume click so browsers can unlock audio playback. */
export function unlockTimerAudio() {
  try {
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
    const AudioConstructor = window.AudioContext || audioWindow.webkitAudioContext
    if (!AudioConstructor) return
    audioContext ??= new AudioConstructor()
    if (audioContext.state === 'suspended') void audioContext.resume()
  } catch {
    // Browsers may disallow audio.
  }
}

function playTone(urgent: boolean) {
  try {
    unlockTimerAudio()
    if (!audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime
    const notes = urgent ? [880, 740, 880] : [660, 880]
    notes.forEach((frequency, index) => {
      const start = now + index * (urgent ? 0.24 : 0.19)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = urgent ? 'square' : 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(urgent ? 0.13 : 0.09, start + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.19)
    })
  } catch {
    // Audio is an optional enhancement.
  }
}

export function previewTimerAlert(mode: TimerAlertMode) {
  if (mode === 'off') return
  unlockTimerAudio()
  announce('Your focus timer is ready. Keep your writing clear and structured.', mode, false)
}

function announce(message: string, mode: TimerAlertMode, urgent: boolean) {
  if (mode === 'tones' || mode === 'both') playTone(urgent)
  if (mode === 'voice' || mode === 'both') {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(message)
        utterance.lang = 'en-GB'
        utterance.rate = 0.95
        utterance.pitch = 1.02
        utterance.volume = 0.95
        window.speechSynthesis.speak(utterance)
      }
    } catch {
      // Speech voices are not present in every browser.
    }
  }
}

export function canRequestTimerNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext
}

export async function requestTimerNotifications() {
  if (!canRequestTimerNotifications()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'unsupported'
  }
}

function backgroundNotification(message: string) {
  if (!document.hidden || !canRequestTimerNotifications() || Notification.permission !== 'granted') return
  try {
    const notification = new Notification('CSS Vista — answer timer', {
      body: message,
      tag: 'css-vista-answer-timer',
    })
    notification.onclick = () => { window.focus(); notification.close() }
  } catch {
    // Mobile browsers commonly require service-worker notifications instead.
  }
}

/** Milestone sounds, spoken cues and one overdue warning per question. */
export function useTimerFeedback(
  remaining: number,
  running: boolean,
  allocatedSeconds: number,
  mode: TimerAlertMode,
  notificationsEnabled = false,
) {
  const previousRef = useRef(remaining)
  const previousRunningRef = useRef(running)
  const previousAllocationRef = useRef(allocatedSeconds)
  const [banner, setBanner] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const previous = previousRef.current
    const justActivated = running && !previousRunningRef.current
    const allocationChanged = previousAllocationRef.current !== allocatedSeconds
    previousRef.current = remaining
    previousRunningRef.current = running
    previousAllocationRef.current = allocatedSeconds
    // Reloading, switching questions and resuming must never replay old alerts.
    if (!running || justActivated || allocationChanged || remaining >= previous) return

    let message: string | undefined
    let urgent = false
    if (previous > 0 && remaining <= 0) {
      message = 'Time is up. Overtime is now running.'
      urgent = true
    } else if (previous > -300 && remaining <= -300) {
      message = 'Five minutes over the allocated time.'
      urgent = true
    } else {
      const latest = TIMER_ALERTS.filter(({ at }) => at * 60 <= allocatedSeconds
        && previous > allocatedSeconds - at * 60
        && remaining <= allocatedSeconds - at * 60).at(-1)
      message = latest?.text
    }
    if (!message) return
    setBanner(message)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setBanner(null), 9000)
    announce(message, mode, urgent)
    if (urgent && notificationsEnabled) backgroundNotification(message)
  }, [remaining, running, allocatedSeconds, mode, notificationsEnabled])

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  return banner
}

/** Optional screen wake lock while a running timer is visible; permission is user-controlled. */
export function useTimerWakeLock(enabled: boolean) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
    && typeof window !== 'undefined' && window.isSecureContext
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled || !supported) return
    let disposed = false
    let requesting = false
    let sentinel: WakeLockSentinel | null = null
    async function acquire() {
      if (disposed || requesting || document.visibilityState !== 'visible' || sentinel) return
      requesting = true
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (disposed) { void lock.release(); return }
        sentinel = lock
        setError(null)
        setActive(true)
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null
          if (!disposed) setActive(false)
        })
      } catch {
        if (!disposed) {
          setActive(false)
          setError('The browser could not keep the screen awake. Check battery-saver settings or browser permissions.')
        }
      } finally {
        requesting = false
      }
    }
    const visibility = () => {
      if (document.visibilityState === 'visible') void acquire()
      else setActive(false)
    }
    document.addEventListener('visibilitychange', visibility)
    void acquire()
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', visibility)
      if (sentinel) void sentinel.release()
    }
  }, [enabled, supported])
  return { supported, active: enabled && active, error: enabled ? error : null }
}

interface DocumentPictureInPictureHost extends Window {
  documentPictureInPicture?: {
    requestWindow: (options: { width: number; height: number }) => Promise<Window>
  }
}

/** A user-initiated floating window, tied to the lifetime of the original page. */
export function useFloatingAnswerTimer(
  label: string,
  display: string,
  running: boolean,
  allocatedSeconds?: number,
  onToggle?: () => void,
) {
  const pipRef = useRef<Window | null>(null)
  const controlsRef = useRef({ onToggle })
  const [floating, setFloating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supported = typeof window !== 'undefined'
    && Boolean((window as DocumentPictureInPictureHost).documentPictureInPicture)

  useEffect(() => { controlsRef.current.onToggle = onToggle }, [onToggle])

  const close = useCallback(() => {
    const pip = pipRef.current
    pipRef.current = null
    setFloating(false)
    if (pip && !pip.closed) pip.close()
  }, [])

  const open = useCallback(async () => {
    const api = (window as DocumentPictureInPictureHost).documentPictureInPicture
    if (!api) {
      setError('Floating windows are not supported in this browser.')
      return
    }
    if (pipRef.current && !pipRef.current.closed) { pipRef.current.focus(); return }
    setError(null)
    try {
      // Browser requires a direct user gesture; never auto-open.
      const pip = await api.requestWindow({ width: 355, height: 235 })
      pipRef.current = pip
      const doc = pip.document
      doc.title = 'Vista | Focus timer'
      const style = doc.createElement('style')
      style.textContent = `
        *{box-sizing:border-box}
        body{margin:0;padding:16px;background:linear-gradient(145deg,#062c24,#125743);
          color:#ecfdf5;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
        header{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .brand{font-size:10px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:#a7f3d0}
        #state{font-size:10px;font-weight:750;padding:5px 8px;border:1px solid #ffffff33;
          border-radius:20px;color:#bbf7d0}
        #label{white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:12px;
          color:#d1fae5;margin-top:14px;font-weight:600}
        #clock{font-variant-numeric:tabular-nums;font-size:51px;letter-spacing:-.04em;
          font-weight:850;line-height:1.1;margin-top:4px}
        #clock.overdue{color:#fda4af}
        #progress{height:5px;background:#ffffff33;border-radius:99px;margin-top:13px;overflow:hidden}
        #progressFill{height:100%;width:100%;border-radius:99px;background:#6ee7b7;transition:width .4s ease}
        footer{display:flex;gap:9px;margin-top:14px}
        button{cursor:pointer;min-height:37px;border-radius:8px;border:1px solid #ffffff55;
          padding:7px 14px;color:#ecfdf5;background:#ffffff20;font-size:12px;font-weight:700}
        button:focus-visible{outline:2px solid white;outline-offset:2px}
        #toggle{background:#ecfdf5;border-color:#ecfdf5;color:#064e3b;flex:1}
        #close{flex:1}
      `
      doc.head.append(style)
      const header = doc.createElement('header')
      const brand = doc.createElement('span')
      brand.className = 'brand'
      brand.textContent = 'Vista · Focus companion'
      const state = doc.createElement('span')
      state.id = 'state'
      header.append(brand, state)

      const title = doc.createElement('div')
      title.id = 'label'
      const clock = doc.createElement('div')
      clock.id = 'clock'
      clock.setAttribute('role', 'timer')
      clock.setAttribute('aria-label', 'Answer time remaining')
      const progress = doc.createElement('div')
      progress.id = 'progress'
      progress.setAttribute('aria-hidden', 'true')
      const fill = doc.createElement('div')
      fill.id = 'progressFill'
      progress.append(fill)
      const footer = doc.createElement('footer')
      const toggle = doc.createElement('button')
      toggle.id = 'toggle'
      toggle.type = 'button'
      toggle.addEventListener('click', () => controlsRef.current.onToggle?.())
      const dismiss = doc.createElement('button')
      dismiss.id = 'close'
      dismiss.textContent = '× Close'
      dismiss.type = 'button'
      dismiss.addEventListener('click', () => pip.close())
      footer.append(toggle, dismiss)
      doc.body.append(header, title, clock, progress, footer)
      pip.addEventListener('pagehide', () => {
        if (pipRef.current === pip) { pipRef.current = null; setFloating(false) }
      }, { once: true })
      setFloating(true)
    } catch {
      setError('The browser did not open the floating timer. Check site permissions or use the timer in this tab.')
    }
  }, [])

  useEffect(() => {
    const pip = pipRef.current
    if (!pip || pip.closed) return
    const title = pip.document.getElementById('label')
    const clock = pip.document.getElementById('clock')
    const state = pip.document.getElementById('state')
    const toggle = pip.document.getElementById('toggle')
    const fill = pip.document.getElementById('progressFill')
    if (title) title.textContent = label
    if (clock) {
      clock.textContent = display
      clock.classList.toggle('overdue', display.startsWith('-'))
    }
    if (state) state.textContent = display.startsWith('-') ? 'Overtime' : running ? 'Running' : 'Paused'
    if (toggle) {
      toggle.textContent = running ? 'Ⅱ Pause timer' : '▶ Resume timer'
      ;(toggle as HTMLButtonElement).disabled = !onToggle
    }
    if (fill && allocatedSeconds) {
      const num = Number(display.replace('-', '').split(':')[0]) * 60
        + Number(display.split(':')[1])
      const remaining = display.startsWith('-') ? -num : num
      fill.style.width = `${Math.max(0, Math.min(100, (1 - remaining / allocatedSeconds) * 100))}%`
      fill.style.background = remaining < 0 ? '#fda4af' : '#6ee7b7'
    }
  }, [label, display, running, floating, allocatedSeconds, onToggle])

  useEffect(() => () => {
    const pip = pipRef.current
    if (pip && !pip.closed) pip.close()
  }, [])

  return { supported, floating, error, open, close }
}
