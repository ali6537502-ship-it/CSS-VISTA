import { useEffect, useState } from 'react'
import type { z } from 'zod'
import { useAccount } from '@/lib/accountContext'
import { briefingRequest } from './api'

export function useBriefing<T>(query: string, schema: z.ZodType<T>) {
  const { user } = useAccount()
  const [revision, setRevision] = useState(0)
  const key = (user?.id || '') + ':' + query
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null)
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    void briefingRequest(query, schema, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult({ key, data }) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : 'The briefing could not be loaded. Please try again.' })
      })
    return () => controller.abort()
  }, [key, query, schema, user, revision])
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRevision((n) => n + 1) }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 300_000)
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [])
  const current = result?.key === key ? result : null
  return { data: current?.data, error: current?.error, loading: !current, retry: () => setRevision((n) => n + 1) }
}
