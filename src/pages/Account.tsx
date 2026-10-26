import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { ProfileGate } from '@/components/ProfileGate'
import { StudentProfilePanel } from '@/components/StudentProfilePanel'
import { AuthenticatedAccountAd } from '@/components/Ads'
import { useAccount } from '@/lib/accountContext'
import AccessForm from '@/features/account/AccessForm'
import { accountDestination, accessIssues, type AccessValues, type AccountMode } from '@/features/account/accessForm'

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-60'
export default function Account() {
  const account = useAccount()
  const { loading, user } = account
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const mode: AccountMode = params.get('mode') === 'create' ? 'create' : 'sign-in'
  const destination = accountDestination(params.get('returnTo'))
  const pending = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const [token, setToken] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    return value
  })
  useEffect(() => { if (token) window.history.replaceState(null, '', window.location.pathname + window.location.search) }, [token])
  const codeRecovery = params.get('recovery') === 'code'
  const reset = params.get('reset') === '1' || codeRecovery
  const [resetCode, setResetCode] = useState('')
  const verify = params.get('verify') === '1'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AccessValues, string>>>({})
  const values = { name, email, password, confirmation, resetCode }
  function clear() { setError(''); setMessage(''); setFieldErrors({}) }
  function switchMode(next: AccountMode) {
    if (pending.current) return
    clear(); const query = new URLSearchParams(params); query.set('mode', next); setParams(query)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    clear()
    const invalid = accessIssues(values, mode, reset, codeRecovery)
    if (Object.keys(invalid).length) { setFieldErrors(invalid); setError('Please check the highlighted details.'); requestAnimationFrame(() => document.getElementById(`access-${Object.keys(invalid)[0]}`)?.focus()); return }
    pending.current = true; setBusy(true)
    try {
      const result = reset ? await account.updatePassword(password, undefined, token, codeRecovery ? { email: email.trim(), code: resetCode } : undefined)
        : mode === 'create' ? await account.signUp(email.trim(), password, name.trim())
        : await account.signIn(email.trim(), password)
      if (!alive.current) return
      if (result.error) { setError(result.error); return }
      setPassword(''); setConfirmation('')
      if (reset) { setToken(''); account.clearPasswordRecovery(); const query = new URLSearchParams(); if (params.has('returnTo')) query.set('returnTo', destination); setParams(query, { replace: true }); setMessage('Your password has been updated. Sign in with your new password.'); return }
      navigate(`/account?returnTo=${encodeURIComponent(destination)}`, { replace: true })
    } catch { if (alive.current) setError('Please check your connection and try again.') }
    finally { pending.current = false; if (alive.current) setBusy(false) }
  }
  async function sendResetEmail() {
    if (pending.current) return
    clear()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter your email address first.'); return }
    pending.current = true; setBusy(true)
    try {
      const result = await account.requestPasswordReset(email.trim())
      if (!alive.current) return
      if (result.error) setError(result.error)
      else { const query = new URLSearchParams(); query.set('recovery', 'code'); if (params.has('returnTo')) query.set('returnTo', destination); setToken(''); setPassword(''); setConfirmation(''); setParams(query); setMessage('If this account is eligible, a password-reset email will arrive shortly. Please also check your spam folder.') }
    } finally { pending.current = false; if (alive.current) setBusy(false) }
  }
  async function verifyAddress() {
    clear(); setBusy(true)
    try {
      const result = await account.verifyEmail(token)
      if (result.error) setError(result.error)
      else { setToken(''); setParams({}); setMessage('Your email is verified. You can now sign in.') }
    } finally { setBusy(false) }
  }
  async function signOut() {
    clear(); setBusy(true)
    try { const result = await account.signOut(); if (result.error) setError(result.error) }
    finally { setBusy(false) }
  }
  if (!loading && user && !user.profile_complete && !reset && !verify) return <ProfileGate>{null}</ProfileGate>
  if (!loading && user && !reset && !verify && params.get('settings') !== '1') return <Navigate to={destination} replace />
  const notices = <div>{error && <p role="alert" className="ac-error">{error}</p>}{message && <p role="status" className="ac-success">{message}</p>}</div>
  return <main>
    {(user || verify) && <PageHeader title="Your CSS Vista Account" description="Create your free student account, complete your profile and keep your preparation connected across devices." />}
    <div className={user || verify ? "mx-auto max-w-4xl px-4 py-8 sm:py-10" : "mx-auto max-w-6xl px-4 py-8 sm:py-10"}>
      {loading ? <div className="vista-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status"><LoaderCircle className="h-5 w-5 animate-spin" />Checking your account…</div>
        : verify ? <section className="vista-card mx-auto max-w-lg p-6"><h2 className="mb-3 text-xl font-bold text-pine">Verify your email</h2>{notices}{token ? <><p className="mb-5 text-sm text-muted-foreground">This is a legacy confirmation link. New CSS Vista accounts no longer require email verification.</p><button className={button} disabled={busy} onClick={() => void verifyAddress()}>{busy ? 'Verifying…' : 'Verify my email'}</button></> : <p>This verification link is incomplete. <Link className="font-semibold underline" to="/account">Return to sign in.</Link></p>}</section>
        : user && !reset ? <div className="space-y-5">{notices}<div className="grid gap-5 md:grid-cols-2"><section className="vista-card p-6"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Signed in</p><h2 className="mt-2 break-words text-2xl font-bold text-pine">{user.display_name || user.email.split('@')[0]}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p><div className="mt-6 flex flex-wrap gap-3"><Link className={button} to="/account/dashboard">Open My CSS Vista</Link><Link className={button} to="/account/progress">My Progress</Link><Link className="inline-flex min-h-11 items-center font-semibold text-pine underline" to="/account/settings">Profile & settings</Link><button className="min-h-11 rounded-md border px-4 font-semibold" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button></div></section><section className="vista-card p-6"><h2 className="text-lg font-bold text-pine">Progress sync</h2><p className="mt-3 text-sm text-muted-foreground">Your device keeps working offline. When connected, progress is merged into your private account.</p><button className={`${button} mt-4`} disabled={account.syncStatus === 'syncing'} onClick={() => void account.syncNow()}>{account.syncStatus === 'syncing' ? 'Syncing…' : 'Sync progress now'}</button>{account.lastSyncedAt && <p className="mt-3 text-xs text-muted-foreground">Last synced: {account.lastSyncedAt.toLocaleString()}</p>}{account.syncError && <p role="alert" className="mt-3 text-sm text-red-800">{account.syncError}</p>}</section></div><StudentProfilePanel key={user.id} email={user.email} /><AuthenticatedAccountAd sensitiveControlsVisible={reset || verify} /></div>
        : <AccessForm mode={mode} reset={reset} codeRecovery={codeRecovery} hasToken={!!token} returnTo={destination} busy={busy} values={values} errors={fieldErrors} notices={notices} onSubmit={event => void submit(event)} onMode={switchMode} onReset={() => void sendResetEmail()} onBack={() => account.clearPasswordRecovery()} onChange={(key, value) => { ({ name: setName, email: setEmail, password: setPassword, confirmation: setConfirmation, resetCode: setResetCode })[key](value); setFieldErrors(current => { const next = { ...current }; delete next[key]; return next }) }} />}
    </div>
  </main>
}
