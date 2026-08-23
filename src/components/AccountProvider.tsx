import {
  useCallback, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { accountServiceConfigured, getSupabaseClient } from '@/lib/supabase'
import {
  AccountContext,
  type AccountContextValue,
  type ActionResult,
  type SyncStatus,
} from '@/lib/accountContext'
import {
  clearCloudStudentProgress,
  clearLocalStudentProgress,
  syncStudentProgress,
} from '@/lib/accountSync'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'

// Batch active-study writes so question taps and planner edits do not create a
// database request every few seconds. Pending progress still flushes on hide.
const CLOUD_SYNC_DEBOUNCE_MS = 60_000

export function AccountProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(accountServiceConfigured)
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const syncTimer = useRef<number | null>(null)
  const syncInFlight = useRef(false)

  const syncNow = useCallback(async (): Promise<ActionResult> => {
    if (!client || !user) return { error: 'Sign in to sync progress.' }
    if (syncInFlight.current) return {}
    syncInFlight.current = true
    setSyncStatus('syncing')
    setSyncError('')
    try {
      await syncStudentProgress(client, user.id)
      setLastSyncedAt(new Date())
      setSyncStatus('synced')
      return {}
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Progress could not be synced.'
      setSyncStatus('error')
      setSyncError(message)
      return { error: message }
    } finally {
      syncInFlight.current = false
    }
  }, [client, user])

  useEffect(() => {
    if (!accountServiceConfigured) return

    let active = true
    getSupabaseClient().then((nextClient) => {
      if (!active) return
      setClient(nextClient)
      if (!nextClient) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!client) return
    let active = true
    client.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => void syncNow(), 0)
    return () => window.clearTimeout(timer)
  }, [user, syncNow])

  useEffect(() => {
    const scheduleSync = () => {
      if (!user || !client) return
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current)
      syncTimer.current = window.setTimeout(() => {
        syncTimer.current = null
        void syncNow()
      }, CLOUD_SYNC_DEBOUNCE_MS)
    }
    const flushPendingSync = () => {
      if (!user || !client) return
      if (syncTimer.current !== null) {
        window.clearTimeout(syncTimer.current)
        syncTimer.current = null
      }
      void syncNow()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingSync()
    }
    window.addEventListener(PROGRESS_CHANGED_EVENT, scheduleSync)
    window.addEventListener('online', flushPendingSync)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener(PROGRESS_CHANGED_EVENT, scheduleSync)
      window.removeEventListener('online', flushPendingSync)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current)
    }
  }, [client, syncNow, user])

  const value = useMemo<AccountContextValue>(() => ({
    configured: accountServiceConfigured,
    loading,
    user,
    syncStatus,
    syncError,
    lastSyncedAt,
    async signIn(email, password) {
      if (!client) return { error: 'Account service is not configured yet.' }
      const { error } = await client.auth.signInWithPassword({ email, password })
      return error ? { error: error.message } : {}
    },
    async signUp(email, password, fullName) {
      if (!client) return { error: 'Account service is not configured yet.' }
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/account`,
        },
      })
      if (error) return { error: error.message }
      return { confirmationRequired: !data.session }
    },
    async signInWithGoogle() {
      if (!client) return { error: 'Account service is not configured yet.' }
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/account` },
      })
      return error ? { error: error.message } : {}
    },
    async requestPasswordReset(email) {
      if (!client) return { error: 'Account service is not configured yet.' }
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account?reset=1`,
      })
      return error ? { error: error.message } : {}
    },
    async updatePassword(password) {
      if (!client || !user) return { error: 'Open the password-reset link from your email first.' }
      const { error } = await client.auth.updateUser({ password })
      return error ? { error: error.message } : {}
    },
    async signOut() {
      if (!client) return {}
      const { error } = await client.auth.signOut()
      return error ? { error: error.message } : {}
    },
    syncNow,
    async resetProgress() {
      try {
        clearLocalStudentProgress()
        if (client && user) await clearCloudStudentProgress(client, user.id)
        setSyncStatus(user ? 'synced' : 'idle')
        setLastSyncedAt(user ? new Date() : null)
        return {}
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Progress could not be reset.',
        }
      }
    },
  }), [client, lastSyncedAt, loading, syncError, syncNow, syncStatus, user])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
