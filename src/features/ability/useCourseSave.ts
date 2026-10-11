import { useState } from 'react'
import { learningRequest } from '@/features/learning/api'
import { HostingerApiError } from '@/lib/hostingerApi'
import type { Receipt } from './api'

type Pending = { body: Record<string, unknown>; missing?: boolean }
function readPending(key: string): Pending | null {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(key) || 'null',
    ) as Pending | null
    return saved &&
      typeof saved.body?.request_id === 'string' &&
      /^[a-f0-9-]{36}$/i.test(saved.body.request_id) &&
      ['exercise', 'quiz', 'position'].includes(String(saved.body.action))
      ? saved
      : null
  } catch {
    return null
  }
}
/** Recover an owned receipt before any repeat dispatch. The component is keyed by account. */
export function useCourseSave(userId: string, refresh: () => void) {
  const key = `cssvista:ability:pending:v1:${userId}`
  const [pending, setPending] = useState<Pending | null>(() => readPending(key))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Receipt>()
  function clear() {
    setPending(null)
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* Reopening will recover the same receipt. */
    }
  }
  function finished(data: Receipt) {
    clear()
    setResult(data)
    setError('')
    refresh()
  }
  async function dispatch(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      finished(await learningRequest<Receipt>(userId, 'ability.php', body))
    } catch (cause) {
      if (
        cause instanceof HostingerApiError &&
        [403, 409, 422].includes(cause.status)
      )
        clear()
      setError(
        cause instanceof Error
          ? cause.message
          : 'The save could not be confirmed. Check its saved result before retrying.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function save(body: Record<string, unknown>) {
    if (busy || pending) return
    const next = { body: { ...body, request_id: crypto.randomUUID() } }
    try {
      sessionStorage.setItem(key, JSON.stringify(next))
    } catch {
      setError(
        'Your browser could not keep a recovery request. Enable browser storage before submitting; your answer has not been sent.',
      )
      return
    }
    setPending(next)
    await dispatch(next.body)
  }
  async function recover() {
    if (!pending || busy) return
    setBusy(true)
    setError('')
    try {
      finished(
        await learningRequest<Receipt>(
          userId,
          `ability.php?request_id=${encodeURIComponent(String(pending.body.request_id))}`,
        ),
      )
    } catch (cause) {
      if (cause instanceof HostingerApiError && cause.status === 404) {
        const next = { ...pending, missing: true }
        setPending(next)
        try {
          sessionStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* No write is sent here. */
        }
        setError(
          'No saved result was found. You can retry this same request or discard it and edit your answer.',
        )
      } else
        setError(
          cause instanceof Error
            ? cause.message
            : 'The saved result could not be checked.',
        )
    } finally {
      setBusy(false)
    }
  }
  return {
    busy,
    error,
    result,
    pending,
    save,
    recover,
    retry: () => {
      if (pending?.missing && !busy) void dispatch(pending.body)
    },
    discard: () => {
      if (pending?.missing && !busy) {
        clear()
        setError('')
      }
    },
  }
}
