import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { AccountContext, type AccountContextValue, type AccountUser, type ActionResult, type SyncStatus } from '@/lib/accountContext'
import { ACCOUNT_EXPIRED_EVENT, csrfToken, hostingerRequest, loadAccountSession, logoutHostinger, setHostingerAccountUser } from '@/lib/hostingerApi'
import { applyProgressSnapshot, captureProgressSnapshot, clearLocalStudentProgress } from '@/lib/accountSync'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'

const ACCOUNT_CHANGE_KEY = 'cssvista:account-change'
const PROGRESS_OWNER_KEY = 'cssvista:progress-owner'
const SYNC_DELAY = 60_000
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'The account service is temporarily unavailable. Please try again.' }
function stashProgress(id: string) {
  try { localStorage.setItem(`cssvista:account-progress:${id}`, JSON.stringify(captureProgressSnapshot())) } catch { /* The server retains previously synced progress. */ }
}
function moveProgress(nextId: string | null) {
  const oldId = localStorage.getItem(PROGRESS_OWNER_KEY)
  if (oldId && oldId !== nextId) { stashProgress(oldId); clearLocalStudentProgress() }
  if (nextId && nextId !== oldId) {
    const saved = localStorage.getItem(`cssvista:account-progress:${nextId}`)
    if (saved) { try { applyProgressSnapshot(JSON.parse(saved)) } catch { /* Ignore a malformed device cache. */ } }
  }
  if (nextId) localStorage.setItem(PROGRESS_OWNER_KEY, nextId)
  else localStorage.removeItem(PROGRESS_OWNER_KEY)
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AccountUser | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(new URLSearchParams(window.location.search).get('reset') === '1')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const userRef = useRef<AccountUser | null>(null)
  const sessionRequest = useRef<AbortController | null>(null)
  const authVersion = useRef(0)
  const authTransition = useRef(false)
  const hydrated = useRef(false)
  const syncInFlight = useRef<string | null>(null)
  const applyUser = useCallback((next: AccountUser | null) => {
    if (userRef.current?.id !== next?.id || !next) {
      try { moveProgress(next?.id ?? null) } catch { /* Browsers may disable local storage. */ }
      setSyncStatus('idle'); setSyncError(''); setLastSyncedAt(null)
    }
    userRef.current = next
    setHostingerAccountUser(next?.id ?? null)
    setUser(next)
  }, [])
  const refreshSession = useCallback(async () => {
    if (authTransition.current) return
    sessionRequest.current?.abort()
    const controller = new AbortController()
    sessionRequest.current = controller
    const version = ++authVersion.current
    try {
      const session = await loadAccountSession(controller.signal)
      if (version === authVersion.current) applyUser(session.authenticated ? session.user ?? null : null)
    } catch (error) {
      if (!controller.signal.aborted && version === authVersion.current) setSyncError(errorMessage(error))
    } finally { if (version === authVersion.current) setLoading(false) }
  }, [applyUser])
  useEffect(() => {
    const critical = /^\/(?:account|factbook|admin)(?:\/|$)/.test(location.pathname)
    if (!hydrated.current && (critical || csrfToken())) { hydrated.current = true; void refreshSession() }
    else if (!hydrated.current) setLoading(false)
  }, [location.pathname, refreshSession])
  useEffect(() => {
    const expire = (event: Event) => { const expected = (event as CustomEvent<{ userId?: string }>).detail?.userId; if (expected && expected !== userRef.current?.id) return; ++authVersion.current; sessionRequest.current?.abort(); applyUser(null); setSyncError('Your session has ended. Please sign in again.') }
    const check = () => { if (hydrated.current) void refreshSession() }
    const visibility = () => { if (document.visibilityState === 'visible') check() }
    const storage = (event: StorageEvent) => { if (event.key === ACCOUNT_CHANGE_KEY) check() }
    window.addEventListener(ACCOUNT_EXPIRED_EVENT, expire)
    window.addEventListener('focus', check)
    window.addEventListener('storage', storage)
    document.addEventListener('visibilitychange', visibility)
    return () => { sessionRequest.current?.abort(); window.removeEventListener(ACCOUNT_EXPIRED_EVENT, expire); window.removeEventListener('focus', check); window.removeEventListener('storage', storage); document.removeEventListener('visibilitychange', visibility) }
  }, [applyUser, refreshSession])
  const syncNow = useCallback(async (): Promise<ActionResult> => {
    const id = userRef.current?.id
    if (!id) return { error: 'Sign in to sync progress.' }
    if (syncInFlight.current === id) return {}
    syncInFlight.current = id
    setSyncStatus('syncing'); setSyncError('')
    try {
      const { syncStudentProgressToHostinger } = await import('@/lib/hostingerSync')
      await syncStudentProgressToHostinger(id)
      if (userRef.current?.id === id) { setSyncStatus('synced'); setLastSyncedAt(new Date()) }
      return {}
    } catch (error) {
      const message = errorMessage(error)
      if (userRef.current?.id === id) { setSyncStatus('error'); setSyncError(message) }
      return { error: message }
    } finally { if (syncInFlight.current === id) syncInFlight.current = null }
  }, [])
  const userId = user?.id
  useEffect(() => { if (userId) void syncNow() }, [userId, syncNow])
  useEffect(() => {
    if (!userId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => { if (syncInFlight.current === userId) return; clearTimeout(timer); timer = setTimeout(() => void syncNow(), SYNC_DELAY) }
    const flush = () => { clearTimeout(timer); void syncNow() }
    const visibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener(PROGRESS_CHANGED_EVENT, schedule)
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', visibility)
    return () => { clearTimeout(timer); window.removeEventListener(PROGRESS_CHANGED_EVENT, schedule); window.removeEventListener('online', flush); document.removeEventListener('visibilitychange', visibility) }
  }, [userId, syncNow])
  const broadcast = () => { try { localStorage.setItem(ACCOUNT_CHANGE_KEY, String(Date.now())) } catch { /* Focus checks also refresh the session. */ } }
  const value = useMemo<AccountContextValue>(() => ({
    configured: true, loading, user, passwordRecovery, syncStatus, syncBackend: user ? 'hostinger' : null, syncError, lastSyncedAt,
    async signIn(email, password) {
      authTransition.current = true
      sessionRequest.current?.abort(); const version = ++authVersion.current
      try {
        const response = await hostingerRequest<{ user: AccountUser }>('auth/login.php', { method: 'POST', body: JSON.stringify({ email, password }) })
        if (version === authVersion.current) { applyUser(response.user); hydrated.current = true; setLoading(false); broadcast() }
        return {}
      } catch (error) { return { error: errorMessage(error) } }
      finally { authTransition.current = false }
    },
    async signUp(email, password, fullName) {
      try {
        const result = await hostingerRequest<{ confirmation_required: boolean }>('auth/register.php', { method: 'POST', body: JSON.stringify({ email, password, full_name: fullName.trim() }) })
        return { confirmationRequired: result.confirmation_required }
      } catch (error) { return { error: errorMessage(error) } }
    },
    async requestPasswordReset(email) {
      try { await hostingerRequest('auth/forgot-password.php', { method: 'POST', body: JSON.stringify({ email }) }); return {} }
      catch (error) { return { error: errorMessage(error) } }
    },
    async resendVerification(email) {
      try { await hostingerRequest('auth/resend-verification.php', { method: 'POST', body: JSON.stringify({ email }) }); return {} }
      catch (error) { return { error: errorMessage(error) } }
    },
    async verifyEmail(token) {
      try { await hostingerRequest('auth/verify-email.php', { method: 'POST', body: JSON.stringify({ token }) }); return {} }
      catch (error) { return { error: errorMessage(error) } }
    },
    async updatePassword(password, currentPassword, resetToken) {
      try {
        await hostingerRequest(resetToken ? 'auth/reset-password.php' : 'auth/change-password.php', { method: 'POST', body: JSON.stringify(resetToken ? { password, token: resetToken } : { password, current_password: currentPassword }) })
        setPasswordRecovery(false)
        if (resetToken) applyUser(null)
        broadcast()
        return {}
      } catch (error) { return { error: errorMessage(error) } }
    },
    clearPasswordRecovery() { setPasswordRecovery(false) },
    async signOut() {
      if (userRef.current) { stashProgress(userRef.current.id); await syncNow() }
      sessionRequest.current?.abort(); ++authVersion.current
      try { await logoutHostinger(); applyUser(null); setPasswordRecovery(false); broadcast(); return {} }
      catch { return { error: 'We could not securely finish signing out. Please check your connection and try again.' } }
    },
    syncNow,
    async resetProgress() {
      const id = userRef.current?.id
      try {
        if (id) { const { clearHostingerStudentProgress } = await import('@/lib/hostingerSync'); await clearHostingerStudentProgress(id) }
        if (id === userRef.current?.id) { clearLocalStudentProgress(); if (id) localStorage.removeItem(`cssvista:account-progress:${id}`); setSyncStatus(id ? 'synced' : 'idle') }
        return {}
      } catch (error) { return { error: errorMessage(error) } }
    },
  }), [applyUser, lastSyncedAt, loading, passwordRecovery, syncError, syncNow, syncStatus, user])
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
