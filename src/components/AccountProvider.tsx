import {
  useCallback, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { useLocation } from 'react-router'
import { accountServiceConfigured, getSupabaseClient } from '@/lib/supabase'
import {
  AccountContext,
  type AccountContextValue,
  type ActionResult,
  type SyncStatus,
} from '@/lib/accountContext'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { scheduleIdleWork } from '@/lib/idle'

// Batch active-study writes so question taps and planner edits do not create a
// database request every few seconds. Pending progress still flushes on hide.
const CLOUD_SYNC_DEBOUNCE_MS = 60_000
const AUTH_APP_ORIGIN = 'https://www.css-vista.com'

function authRedirect(path: string) {
  return new URL(path, AUTH_APP_ORIGIN).toString()
}

function hasPersistedSupabaseSession() {
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      if (window.localStorage.getItem(key)) return true
    }
  } catch {
    // Storage can be unavailable in strict/private browser modes.
  }
  return false
}

function isAuthCriticalRoute(pathname: string, search: string) {
  return /^\/(?:account|factbook|admin)(?:\/|$)/.test(pathname)
    || new URLSearchParams(search).has('reset')
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const shouldHydrateInitially = accountServiceConfigured
    && (isAuthCriticalRoute(location.pathname, location.search) || hasPersistedSupabaseSession())
  const [loading, setLoading] = useState(shouldHydrateInitially)
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(() => new URLSearchParams(window.location.search).get('reset') === '1')
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
      const { syncStudentProgress } = await import('@/lib/accountSync')
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
    if (!accountServiceConfigured || client) return

    const authCriticalRoute = isAuthCriticalRoute(location.pathname, location.search)
    const shouldLoadAccountRuntime = authCriticalRoute || hasPersistedSupabaseSession()
    if (!shouldLoadAccountRuntime) {
      setLoading(false)
      return
    }

    if (authCriticalRoute) setLoading(true)
    let active = true
    const cancel = scheduleIdleWork(() => {
      void getSupabaseClient().then((nextClient) => {
        if (!active) return
        setClient(nextClient)
        if (!nextClient) setLoading(false)
      })
    }, {
      timeout: authCriticalRoute ? 1_500 : 6_000,
      fallbackDelay: authCriticalRoute ? 0 : 2_500,
      immediate: authCriticalRoute,
    })
    return () => {
      active = false
      cancel()
    }
  }, [client, location.pathname, location.search])

  useEffect(() => {
    if (!client) return
    let active = true
    client.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
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
    passwordRecovery,
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
          emailRedirectTo: authRedirect('/account'),
        },
      })
      if (error) return { error: error.message }
      return { confirmationRequired: !data.session }
    },
    async signInWithGoogle() {
      if (!client) return { error: 'Account service is not configured yet.' }
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: authRedirect('/account') },
      })
      return error ? { error: error.message } : {}
    },
    async requestPasswordReset(email) {
      if (!client) return { error: 'Account service is not configured yet.' }
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirect('/account?reset=1'),
      })
      return error ? { error: error.message } : {}
    },
    async updatePassword(password) {
      if (!client || !user) return { error: 'Open the password-reset link from your email first.' }
      const { error } = await client.auth.updateUser({ password })
      if (!error) setPasswordRecovery(false)
      return error ? { error: error.message } : {}
    },
    clearPasswordRecovery() {
      setPasswordRecovery(false)
    },
    async signOut() {
      if (!client) return {}
      const { error } = await client.auth.signOut()
      return error ? { error: error.message } : {}
    },
    syncNow,
    async resetProgress() {
      try {
        const {
          clearCloudStudentProgress,
          clearLocalStudentProgress,
        } = await import('@/lib/accountSync')
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
  }), [client, lastSyncedAt, loading, passwordRecovery, syncError, syncNow, syncStatus, user])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
