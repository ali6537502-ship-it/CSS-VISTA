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

function announce(message: string, mode: TimerAlertMode, urgent: boolean) {
  if (mode === 'tones' || mode === 'both') playTone(urgent)
  if (mode === 'voice' || mode === 'both') {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(message)
        utterance.lang = 'en-GB'
        utterance.rate = 0.95
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
) {
  const previousRef = useRef(remaining)
  const [banner, setBanner] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = remaining
    if (!running || remaining >= previous) return

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
    if (urgent) backgroundNotification(message)
  }, [remaining, running, allocatedSeconds, mode])

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  return banner
}

interface DocumentPictureInPictureHost extends Window {
  documentPictureInPicture?: {
    requestWindow: (options: { width: number; height: number }) => Promise<Window>
  }
}

/** Always-on-top while the parent browser tab stays open (supported desktops only). */
export function useFloatingAnswerTimer(label: string, display: string, running: boolean) {
  const pipRef = useRef<Window | null>(null)
  const [floating, setFloating] = useState(false)
  const supported = typeof window !== 'undefined'
    && Boolean((window as DocumentPictureInPictureHost).documentPictureInPicture)

  const close = useCallback(() => {
    const pip = pipRef.current
    pipRef.current = null
    setFloating(false)
    if (pip && !pip.closed) pip.close()
  }, [])

  const open = useCallback(async () => {
    const api = (window as DocumentPictureInPictureHost).documentPictureInPicture
    if (!api) return
    if (pipRef.current && !pipRef.current.closed) { pipRef.current.focus(); return }
    try {
      const pip = await api.requestWindow({ width: 320, height: 195 })
      pipRef.current = pip
      const doc = pip.document
      doc.title = 'CSS Vista — Timer'
      const style = doc.createElement('style')
      style.textContent = `body{box-sizing:border-box;margin:0;background:#f8fafc;color:#143b2c;font-family:system-ui,sans-serif;text-align:center;padding:15px}#label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600}#clock{font-size:48px;line-height:1.2;font-weight:800;font-variant-numeric:tabular-nums;margin:9px 0}#state{font-size:11px;color:#64748b}button{margin-top:8px;padding:7px 18px;border:0;border-radius:7px;background:#143b2c;color:white;cursor:pointer}#clock.overdue{color:#dc2626}`
      const title = doc.createElement('div')
      title.id = 'label'
      const time = doc.createElement('div')
      time.id = 'clock'
      const state = doc.createElement('div')
      state.id = 'state'
      const dismiss = doc.createElement('button')
      dismiss.textContent = '× Close floating timer'
      dismiss.type = 'button'
      dismiss.addEventListener('click', () => pip.close())
      doc.body.append(style, title, time, state, dismiss)
      pip.addEventListener('pagehide', () => {
        if (pipRef.current === pip) { pipRef.current = null; setFloating(false) }
      }, { once: true })
      setFloating(true)
    } catch {
      // Browser refused Picture-in-Picture; the page timer still operates.
    }
  }, [])

  useEffect(() => {
    const pip = pipRef.current
    if (!pip || pip.closed) return
    const title = pip.document.getElementById('label')
    const clock = pip.document.getElementById('clock')
    const state = pip.document.getElementById('state')
    if (title) title.textContent = label
    if (clock) {
      clock.textContent = display
      clock.classList.toggle('overdue', display.startsWith('-'))
    }
    if (state) state.textContent = display.startsWith('-') ? 'Overtime' : running ? 'Running' : 'Paused'
  }, [label, display, running, floating])

  useEffect(() => () => {
    const pip = pipRef.current
    if (pip && !pip.closed) pip.close()
  }, [])

  return { supported, floating, open, close }
}
