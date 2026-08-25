import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Activity, CheckCircle2, Cloud, LoaderCircle, LockKeyhole, LogOut, Mail, RefreshCw,
  ShieldCheck, UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { useAccount } from '@/lib/accountContext'

type Mode = 'sign-in' | 'create'
const googleAuthEnabled = import.meta.env.VITE_SUPABASE_GOOGLE_AUTH_ENABLED === 'true'

export default function Account() {
  const {
    configured, loading, user, signIn, signUp, signInWithGoogle, signOut,
    requestPasswordReset, updatePassword, passwordRecovery, clearPasswordRecovery,
    syncNow, syncStatus, syncError, lastSyncedAt,
  } = useAccount()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const resetMode = passwordRecovery || searchParams.get('reset') === '1'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')
    const result = mode === 'sign-in'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, fullName)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.confirmationRequired) {
      setMessage('Check your email to confirm the account, then return here to sign in.')
    }
  }

  async function sendPasswordReset() {
    setMessage('')
    setError('')
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    const previousRequest = Number(sessionStorage.getItem('cssvista:last-password-reset') ?? 0)
    if (Date.now() - previousRequest < 60_000) {
      setMessage('A reset request was already sent recently. Please check your inbox and spam folder before requesting another link.')
      return
    }
    setSubmitting(true)
    const result = await requestPasswordReset(email.trim())
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    sessionStorage.setItem('cssvista:last-password-reset', String(Date.now()))
    setMessage('If an account exists for this email, a secure password-reset link has been sent.')
  }

  async function saveNewPassword(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (newPassword !== confirmPassword) {
      setError('The two password entries do not match.')
      return
    }
    setUpdatingPassword(true)
    const result = await updatePassword(newPassword)
    setUpdatingPassword(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setChangePasswordOpen(false)
    clearPasswordRecovery()
    setSearchParams({})
    setMessage('Your password has been updated successfully.')
  }

  const displayName = typeof user?.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : user?.email?.split('@')[0]

  return (
    <div>
      <PageHeader
        title="Your CSS Vista Account"
        description="Sign in to carry your study hours, question-speed history, quiz results, streaks, saved MCQs, mistake notebook and study tools across devices."
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        {loading ? (
          <div className="vista-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Checking your account…
          </div>
        ) : !configured ? (
          <div className="vista-card p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Cloud className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-pine">Account sign-in is being connected</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The secure account and progress-sync foundation is installed, but this environment still needs its
              Supabase project connection. Guest mode remains fully available and your current progress stays safely
              in this browser.
            </p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-pine px-4 text-sm font-semibold text-white"
            >
              Continue in Guest Mode
            </Link>
          </div>
        ) : user ? (
          <div className="space-y-5">
            {(resetMode || changePasswordOpen) && (
              <form onSubmit={saveNewPassword} className="vista-card border-l-4 border-l-amber-400 p-6">
                <h2 className="text-xl font-bold text-pine">{resetMode ? 'Choose a new password' : 'Change your password'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use at least eight characters. This replaces the old password immediately.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-11 flex-1 rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="New password"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-11 rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="flex h-11 items-center justify-center gap-2 rounded-md bg-pine px-5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {updatingPassword && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Save new password
                  </button>
                  {!resetMode && <button type="button" onClick={() => { setChangePasswordOpen(false); setNewPassword(''); setConfirmPassword('') }} className="h-11 rounded-md border px-5 text-sm font-semibold text-pine">Cancel</button>}
                </div>
              </form>
            )}
            {message && <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
            {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div className="grid gap-5 md:grid-cols-[1.15fr_.85fr]">
              <section className="vista-card p-6">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-pine">
                <UserRound className="h-7 w-7" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-700">Signed in</p>
              <h2 className="mt-1 text-2xl font-bold text-pine">{displayName || 'CSS aspirant'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/dashboard"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white"
                >
                  <Activity className="h-4 w-4" /> Daily progress report
                </Link>
                <button
                  onClick={() => void syncNow()}
                  disabled={syncStatus === 'syncing'}
                  className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-pine disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncStatus === 'syncing' ? 'Syncing…' : 'Sync progress now'}
                </button>
                <button
                  onClick={() => void signOut()}
                  className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
                {!resetMode && <button onClick={() => setChangePasswordOpen((open) => !open)} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-foreground hover:bg-secondary"><LockKeyhole className="h-4 w-4" /> Change password</button>}
              </div>
              </section>
              <section className="vista-card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-pine">
                <Cloud className="h-5 w-5" /> Progress sync
              </h2>
              <div className="mt-4 rounded-lg bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  {syncStatus === 'syncing'
                    ? <LoaderCircle className="h-4 w-4 animate-spin" />
                    : <CheckCircle2 className="h-4 w-4" />}
                  {syncStatus === 'syncing' ? 'Synchronising your progress' : 'Local-first sync is active'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-900/70">
                  Your device keeps working offline. When connected, student progress is merged into your private
                  account record.
                </p>
              </div>
              {lastSyncedAt && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Last synced: {lastSyncedAt.toLocaleString()}
                </p>
              )}
              {syncError && <p className="mt-3 text-xs font-medium text-red-700">{syncError}</p>}
              </section>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_.85fr]">
            <section className="vista-card p-5 sm:p-7">
              <div className="grid grid-cols-2 rounded-lg bg-secondary p-1">
                <button
                  onClick={() => { setMode('sign-in'); setError(''); setMessage('') }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'sign-in' ? 'bg-white text-pine shadow-sm' : 'text-muted-foreground'}`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMode('create'); setError(''); setMessage('') }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'create' ? 'bg-white text-pine shadow-sm' : 'text-muted-foreground'}`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4">
                {mode === 'create' && (
                  <label className="block text-sm font-medium">
                    Your name
                    <div className="relative mt-1.5">
                      <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                        autoComplete="name"
                        className="h-11 w-full rounded-md border bg-white pl-9 pr-3 outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Your full name"
                      />
                    </div>
                  </label>
                )}
                <label className="block text-sm font-medium">
                  Email address
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      className="h-11 w-full rounded-md border bg-white pl-9 pr-3 outline-none focus:ring-2 focus:ring-ring"
                      placeholder="you@example.com"
                    />
                  </div>
                </label>
                <label className="block text-sm font-medium">
                  Password
                  <div className="relative mt-1.5">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={8}
                      autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      className="h-11 w-full rounded-md border bg-white pl-9 pr-3 outline-none focus:ring-2 focus:ring-ring"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </label>
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                {message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {mode === 'sign-in' ? 'Sign in securely' : 'Create my account'}
                </button>
                {mode === 'sign-in' && (
                  <button
                    type="button"
                    onClick={() => void sendPasswordReset()}
                    disabled={submitting}
                    className="w-full text-center text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline disabled:opacity-60"
                  >
                    Forgot your password?
                  </button>
                )}
                {mode === 'sign-in' && <p className="text-center text-xs leading-relaxed text-muted-foreground">A secure recovery email is sent only when requested. Signed-in students can change their password directly without an email.</p>}
              </form>

              {googleAuthEnabled && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                  </div>
                  <button
                    onClick={() => void signInWithGoogle()}
                    className="flex h-11 w-full items-center justify-center rounded-md border bg-white px-4 text-sm font-semibold hover:bg-secondary"
                  >
                    Continue with Google
                  </button>
                </>
              )}
            </section>

            <aside className="vista-card h-fit p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-pine">
                <ShieldCheck className="h-5 w-5" /> What your account saves
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  'Quiz attempts, scores and streak history',
                  'Daily study hours and question response-time trends',
                  'Saved MCQs and mistake notebook',
                  'Checklists, timers and study-tool entries',
                  'Recent learning activity across your devices',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                Your existing guest progress is merged into the account after sign-in. CSS Vista never uploads admin
                settings, internal files or unrelated browser data.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
