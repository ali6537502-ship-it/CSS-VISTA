// Visual review only. This entry point is never part of the production build.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import type { AccountUser } from '../../src/lib/accountContext'
import { AccountContext } from '../../src/lib/accountContext'
import { SiteContentProvider } from '../../src/components/SiteContentProvider'
import App from '../../src/App'
import '../../src/index.css'
const fixtureUser = { id: 'a1111111-1111-4111-8111-111111111111', email: 'test-reader@example.invalid', user_metadata: { full_name: 'Test Reader' } } as AccountUser
function Review() {
  const [user, setUser] = useState<AccountUser | null>(fixtureUser)
  const unavailable = async () => ({ error: 'This review uses a test account. Authentication is tested separately.' })
  return <AccountContext.Provider value={{ configured: true, loading: false, user, passwordRecovery: false, syncStatus: 'idle', syncBackend: null, syncError: '', lastSyncedAt: null,
    signIn: unavailable, signUp: unavailable, resendVerification: unavailable, verifyEmail: unavailable, requestPasswordReset: unavailable, updatePassword: unavailable,
    clearPasswordRecovery() {}, signOut: async () => { setUser(null); return {} }, syncNow: async () => ({}), resetProgress: async () => ({}),
  }}><SiteContentProvider><App /></SiteContentProvider></AccountContext.Provider>
}
window.history.replaceState(null, '', '/account/dashboard')
createRoot(document.getElementById('root')!).render(<BrowserRouter><Review /></BrowserRouter>)
