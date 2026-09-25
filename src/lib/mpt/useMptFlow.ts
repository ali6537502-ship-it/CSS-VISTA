import { useEffect, useState } from 'react'
import { useAccount } from '@/lib/accountContext'
import { mptApi } from './api'

// Whether the MPT application flow is on for this visitor (D-10). `null` while
// unknown — callers render the existing experience until the server says yes,
// so prerendered HTML and flag-off visitors see the site exactly as before.
let cached: { userId: string | null; promise: Promise<boolean> } | null = null

export function useMptFlowEnabled() {
  const { user, loading } = useAccount()
  const userId = user?.id ?? null
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    if (loading) return
    let active = true
    if (!cached || cached.userId !== userId) {
      cached = { userId, promise: mptApi.config().then((value) => value.enabled).catch(() => false) }
    }
    cached.promise.then((value) => { if (active) setEnabled(value) })
    return () => { active = false }
  }, [userId, loading])
  return enabled
}
