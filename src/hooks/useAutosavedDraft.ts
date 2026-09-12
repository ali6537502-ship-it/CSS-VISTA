import { useCallback, useEffect, useRef, useState } from 'react'

const PREFIX = 'cssvista:draft:'

function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeDraft<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    // Storage full or blocked - the caller surfaces this to the student.
    return false
  }
}

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Debounced autosave of in-progress work to localStorage, restored on mount.
 *
 * Timed answers and paper attempts used to live in React state alone, so a
 * refresh or an accidental back gesture destroyed them. This keeps a local
 * copy without changing where the student's explicitly-saved work goes.
 */
export function useAutosavedDraft<T>(key: string, value: T, options?: { delay?: number; enabled?: boolean }) {
  const delay = options?.delay ?? 800
  const enabled = options?.enabled ?? true
  const [status, setStatus] = useState<DraftStatus>('idle')
  const [restored, setRestored] = useState<T | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    setRestored(readDraft<T>(key))
    hydratedRef.current = true
  }, [key])

  useEffect(() => {
    if (!enabled || !hydratedRef.current) return
    setStatus('saving')
    const id = window.setTimeout(() => {
      setStatus(writeDraft(key, value) ? 'saved' : 'error')
    }, delay)
    return () => window.clearTimeout(id)
  }, [key, value, delay, enabled])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      /* nothing recoverable to do */
    }
    setRestored(null)
    setStatus('idle')
  }, [key])

  return { status, restored, clearDraft }
}

export default useAutosavedDraft
