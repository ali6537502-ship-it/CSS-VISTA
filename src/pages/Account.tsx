import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { ProfileGate } from '@/components/ProfileGate'
import { StudentProfilePanel } from '@/components/StudentProfilePanel'
import { AuthenticatedAccountAd } from '@/components/Ads'
import { useAccount } from '@/lib/accountContext'
import { safeReturnTo } from '@/features/current-affairs/model'

const field = 'mt-1.5 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-60'
export default function Account() {
  const account = useAccount()
  const { loading, user } = account
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState<'sign-in' | 'create'>(params.get('mode') === 'create' ? 'create' : 'sign-in')
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
  function clear() { setError(''); setMessage('') }
  async function submit(event: FormEvent) {
    event.preventDefault(); clear()
    if ((mode === 'create' || reset) && password !== confirmation) { setError('The two password entries do not match.'); return }
    setBusy(true)
    try {
      const result = reset ? await account.updatePassword(password, undefined, token, codeRecovery ? { email: email.trim(), code: resetCode } : undefined)
        : mode === 'create' ? await account.signUp(email.trim(), password, name.trim())
        : await account.signIn(email.trim(), password)
      if (result.error) { setError(result.error); return }
      setPassword(''); setConfirmation('')
      if (reset) { setToken(''); account.clearPasswordRecovery(); setParams({}); setMode('sign-in'); setMessage('Your password has been updated. Sign in with your new password.'); return }
      navigate(safeReturnTo(params.get('returnTo')), { replace: true })
    } catch { setError('Please check your connection and try again.') }
    finally { setBusy(false) }
  }
  async function sendResetEmail() {
    clear()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter your email address first.'); return }
    setBusy(true)
    try {
      const result = await account.requestPasswordReset(email.trim())
      if (result.error) setError(result.error)
      else { setParams({ recovery: 'code' }); setMessage('If this account is eligible, a password-reset email will arrive shortly. Please also check your spam folder.') }
    } finally { setBusy(false) }
  }
  async function verifyAddress() {
    clear(); setBusy(true)
    try {
      const result = await account.verifyEmail(token)
      if (result.error) setError(result.error)
      else { setToken(''); setParams({}); setMessage('Your email is verified. You can now sign in.'); setMode('sign-in') }
    } finally { setBusy(false) }
  }
  async function signOut() {
    clear(); setBusy(true)
    try { const result = await account.signOut(); if (result.error) setError(result.error) }
    finally { setBusy(false) }
  }
  if (!loading && user && !user.profile_complete && !reset && !verify) return <ProfileGate>{null}</ProfileGate>
  if (!loading && user && !reset && !verify && params.get('settings') !== '1') return <Navigate to={safeReturnTo(params.get('returnTo'))} replace />
  const notices = <div aria-live="polite">{error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}</div>
  return <div>
    <PageHeader title="Your CSS Vista Account" description="Your free account keeps tasks, schedules, Daily English, Current Affairs and study progress together across devices." />
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      {loading ? <div className="vista-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status"><LoaderCircle className="h-5 w-5 animate-spin" />Checking your account…</div>
        : verify ? <section className="vista-card mx-auto max-w-lg p-6"><h2 className="mb-3 text-xl font-bold text-pine">Verify your email</h2>{notices}{token ? <><p className="mb-5 text-sm text-muted-foreground">This is a legacy confirmation link. New CSS Vista accounts no longer require email verification.</p><button className={button} disabled={busy} onClick={() => void verifyAddress()}>{busy ? 'Verifying…' : 'Verify my email'}</button></> : <p>This verification link is incomplete. <Link className="font-semibold underline" to="/account">Return to sign in.</Link></p>}</section>
        : user && !reset ? <div className="space-y-5">{notices}<div className="grid gap-5 md:grid-cols-2"><section className="vista-card p-6"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Signed in</p><h2 className="mt-2 break-words text-2xl font-bold text-pine">{user.display_name || user.email.split('@')[0]}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p><div className="mt-6 flex flex-wrap gap-3"><Link className={button} to="/account/dashboard">Open My CSS Vista</Link><Link className={button} to="/account/progress">My Progress</Link><Link className="inline-flex min-h-11 items-center font-semibold text-pine underline" to="/account/settings">Profile & settings</Link><button className="min-h-11 rounded-md border px-4 font-semibold" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button></div></section><section className="vista-card p-6"><h2 className="text-lg font-bold text-pine">Progress sync</h2><p className="mt-3 text-sm text-muted-foreground">Your device keeps working offline. When connected, progress is merged into your private account.</p><button className={`${button} mt-4`} disabled={account.syncStatus === 'syncing'} onClick={() => void account.syncNow()}>{account.syncStatus === 'syncing' ? 'Syncing…' : 'Sync progress now'}</button>{account.lastSyncedAt && <p className="mt-3 text-xs text-muted-foreground">Last synced: {account.lastSyncedAt.toLocaleString()}</p>}{account.syncError && <p role="alert" className="mt-3 text-sm text-red-800">{account.syncError}</p>}</section></div><StudentProfilePanel key={user.id} email={user.email} /><AuthenticatedAccountAd sensitiveControlsVisible={reset || verify} /></div>
        : <div className="grid gap-5 md:grid-cols-[1.05fr_.95fr]"><section className="vista-card p-5 sm:p-6">
          {reset ? <h2 className="mb-5 text-xl font-bold text-pine">Choose a new password</h2> : <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1" role="group" aria-label="Account action">{(['sign-in', 'create'] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); clear() }} className={`min-h-11 rounded-md px-3 text-sm font-semibold ${mode === value ? 'bg-white text-pine shadow-sm' : 'text-muted-foreground'}`}>{value === 'sign-in' ? 'Sign in' : 'Create account'}</button>)}</div>}
          {notices}
          {reset && !token && !codeRecovery ? <p className="text-sm">This reset link is incomplete. <Link className="font-semibold underline" to="/account">Request a new password-reset email.</Link></p> : <form onSubmit={(event) => void submit(event)} className="space-y-4">
            {codeRecovery && <><label className="block text-sm font-medium">Account email<input className={field} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block text-sm font-medium">Six-digit reset code<input className={field} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))} /></label></>}
            {!reset && mode === 'create' && <label className="block text-sm font-medium">Full name<input className={field} required maxLength={160} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>}
            {!reset && <label className="block text-sm font-medium">Email address<input className={field} type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
            {!reset && mode === 'create' && <p className="text-xs text-muted-foreground">No verification code is required. Use an email you can access because password recovery is sent there.</p>}
            <label className="block text-sm font-medium">{reset ? 'New password' : 'Password'}<input className={field} type="password" required minLength={reset || mode === 'create' ? 8 : undefined} autoComplete={reset || mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {(reset || mode === 'create') && <><p className="text-xs text-muted-foreground">Use at least eight characters and a password you do not use elsewhere.</p><label className="block text-sm font-medium">Confirm password<input className={field} type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label></>}
            <button type="submit" disabled={busy} className={`${button} w-full`}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{reset ? 'Update password' : mode === 'create' ? 'Create my free account' : 'Sign in securely'}</button>
            {!reset && <button type="button" disabled={busy} className="min-h-11 w-full text-sm font-semibold text-pine underline" onClick={() => void sendResetEmail()}>Forgot your password?</button>}
          </form>}
          {codeRecovery && <button type="button" disabled={busy} onClick={() => void sendResetEmail()} className="mt-3 min-h-11 text-sm font-semibold text-pine underline">Send a new reset code</button>}
          {reset ? <Link to="/account" className="mt-3 block min-h-11 text-sm font-semibold text-pine underline" onClick={() => account.clearPasswordRecovery()}>Back to sign in</Link> : <Link to="/account?recovery=code" className="mt-3 block min-h-11 text-sm font-semibold text-pine underline">Already have a reset code?</Link>}
        </section><aside className="vista-card h-fit p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold text-pine"><ShieldCheck className="h-5 w-5" />What your account saves</h2><ul className="mt-4 space-y-3 text-sm text-muted-foreground">{['Your tasks, schedules and completion history', 'Daily English completion and study-tool progress', 'Current Affairs reading, facts and saved developments', 'Quiz attempts, MCQ scores, mocks and study history', 'Saved MCQs, checklists and personal study tools'].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>)}</ul><p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Account creation is free and immediate. Your existing guest study progress is merged after you complete your profile.</p></aside></div>}
    </div>
  </div>
}
