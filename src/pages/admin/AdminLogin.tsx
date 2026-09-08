import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react'

const OWNER_EMAIL = 'alihassansargana1@gmail.com'
const input = 'h-11 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

type Stage = 'loading' | 'login' | 'setup-email' | 'setup-details' | 'reset-email' | 'reset-details' | 'totp-setup' | 'totp'

async function api(path: string, body?: Record<string, unknown>) {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => null) as { ok?: boolean, configured?: boolean, authenticated?: boolean, stage?: string, secret?: string | null, message?: string } | null
  if (!response.ok || !data?.ok) throw new Error(data?.message || 'The request could not be completed.')
  return data
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('loading')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    void api('/api/admin-auth/status.php')
      .then((data) => {
        if (!active) return
        if (data.authenticated) navigate('/admin', { replace: true })
        else setStage(data.configured ? 'login' : 'setup-email')
      })
      .catch((reason) => { if (active) { setError(reason instanceof Error ? reason.message : 'Admin login is unavailable.'); setStage('login') } })
    return () => { active = false }
  }, [navigate])

  async function run(task: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await task() } catch (reason) { setError(reason instanceof Error ? reason.message : 'The request could not be completed.') } finally { setBusy(false) }
  }

  function validatePassword() {
    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('Use at least 12 characters with letters and numbers.')
    if (password !== confirmPassword) throw new Error('The two passwords do not match.')
  }

  async function requestCode(purpose: 'setup' | 'reset') {
    await run(async () => {
      const data = await api('/api/admin-auth/request-code.php', { email: OWNER_EMAIL, purpose })
      setNotice(data.message || 'Check your email for the six-digit code.')
      setStage(purpose === 'setup' ? 'setup-details' : 'reset-details')
    })
  }

  async function finishPassword(purpose: 'setup' | 'reset') {
    await run(async () => {
      validatePassword()
      const data = await api(purpose === 'setup' ? '/api/admin-auth/setup.php' : '/api/admin-auth/reset-password.php', { email: OWNER_EMAIL, code, password })
      setPassword(''); setConfirmPassword(''); setCode('')
      if (data.secret) { setTotpSecret(data.secret); setStage('totp-setup') } else setStage('totp')
    })
  }

  async function signIn() {
    await run(async () => {
      const data = await api('/api/admin-auth/login.php', { email: OWNER_EMAIL, password })
      setPassword('')
      if (data.stage === 'totp_setup' && data.secret) { setTotpSecret(data.secret); setStage('totp-setup') } else setStage('totp')
    })
  }

  async function verifyTotp() {
    await run(async () => {
      if (!/^\d{5,6}$/.test(totpCode)) throw new Error('Enter the current authenticator code.')
      await api('/api/admin-auth/verify-totp.php', { code: totpCode.padStart(6, '0') })
      navigate('/admin', { replace: true })
    })
  }

  async function regenerateTotp() {
    await run(async () => {
      const data = await api('/api/admin-auth/regenerate-totp.php', {})
      if (!data.secret) throw new Error('Could not generate a new setup key.')
      setTotpSecret(data.secret)
      setTotpCode('')
      setNotice('A new private setup key was generated. Delete the old entry from your authenticator app and use this new key.')
    })
  }

  const title = stage === 'setup-email' || stage === 'setup-details'
    ? 'Create private admin account'
    : stage === 'reset-email' || stage === 'reset-details'
      ? 'Reset admin password'
      : stage === 'totp-setup'
        ? 'Set up two-factor security'
        : stage === 'totp'
          ? 'Two-factor verification'
          : 'Private admin login'

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          {stage === 'totp' || stage === 'totp-setup' ? <ShieldCheck className="mx-auto h-10 w-10 text-pine" /> : <Lock className="mx-auto h-10 w-10 text-pine" />}
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">CSS Vista owner only</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-pine">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">This login is separate from every student account.</p>
        </div>

        {notice && <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {stage === 'loading' && <p className="mt-6 text-center text-sm text-muted-foreground">Checking private admin status…</p>}

        {(stage === 'login' || stage === 'setup-email' || stage === 'reset-email') && (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Admin email<input className={input + ' mt-1'} value={OWNER_EMAIL} readOnly /></label>
            {stage === 'login' && <label className="block text-sm font-medium">Admin password<input type="password" className={input + ' mt-1'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>}
            <button disabled={busy} onClick={() => stage === 'login' ? void signIn() : void requestCode(stage === 'setup-email' ? 'setup' : 'reset')} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-pine py-3 text-sm font-semibold text-white disabled:opacity-60">
              {stage === 'login' ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {busy ? 'Please wait…' : stage === 'login' ? 'Continue to security code' : 'Email me a verification code'}
            </button>
            {stage === 'login' && <button onClick={() => { setError(''); setStage('reset-email') }} className="w-full text-sm font-semibold text-emerald-800 underline underline-offset-2">Forgot admin password?</button>}
            {stage === 'reset-email' && <button onClick={() => { setError(''); setStage('login') }} className="w-full text-sm font-semibold text-emerald-800 underline underline-offset-2">Back to sign in</button>}
          </div>
        )}

        {(stage === 'setup-details' || stage === 'reset-details') && (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Six-digit email code<input inputMode="numeric" autoComplete="one-time-code" className={input + ' mt-1 text-center text-lg tracking-[0.3em]'} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
            <label className="block text-sm font-medium">New admin password<input type="password" autoComplete="new-password" className={input + ' mt-1'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12+ characters, letters and numbers" /></label>
            <label className="block text-sm font-medium">Confirm password<input type="password" autoComplete="new-password" className={input + ' mt-1'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            <button disabled={busy} onClick={() => void finishPassword(stage === 'setup-details' ? 'setup' : 'reset')} className="w-full rounded-md bg-pine py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : stage === 'setup-details' ? 'Create admin account' : 'Save new admin password'}</button>
            <button disabled={busy} onClick={() => void requestCode(stage === 'setup-details' ? 'setup' : 'reset')} className="w-full text-sm font-semibold text-emerald-800 underline underline-offset-2">Send a new code</button>
          </div>
        )}

        {(stage === 'totp-setup' || stage === 'totp') && (
          <div className="mt-6 space-y-4">
            {stage === 'totp-setup' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-bold text-pine">In Google Authenticator or Microsoft Authenticator:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground"><li>Tap + and choose “Enter a setup key”.</li><li>Account: CSS Vista Owner</li><li>Type: Time based</li><li>Enter the key below.</li></ol>
                <button type="button" onClick={() => void navigator.clipboard.writeText(totpSecret)} className="mt-3 w-full break-all rounded-md border bg-white p-3 font-mono text-xs font-bold text-pine">{totpSecret}</button>
                <p className="mt-2 text-center text-xs text-muted-foreground">Tap the key to copy it.</p>
                <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-medium text-amber-800">Keep this key private. Never send it in a message or screenshot.</p>
                <button type="button" disabled={busy} onClick={() => void regenerateTotp()} className="mt-3 w-full rounded-md border border-amber-300 bg-white py-2.5 text-xs font-bold text-amber-800 disabled:opacity-60">Generate a new private setup key</button>
              </div>
            )}
            <label className="block text-sm font-medium">Authenticator code<input inputMode="numeric" autoComplete="one-time-code" placeholder="6 digits" className={input + ' mt-1 text-center text-lg tracking-[0.3em]'} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
            <button disabled={busy} onClick={() => void verifyTotp()} className="w-full rounded-md bg-pine py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Verifying…' : 'Verify and open admin panel'}</button>
            {stage === 'totp' && <button onClick={() => setStage('login')} className="w-full text-sm font-semibold text-emerald-800 underline underline-offset-2">Start again</button>}
          </div>
        )}

        <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground underline underline-offset-2">Return to website</Link>
      </div>
    </div>
  )
}
