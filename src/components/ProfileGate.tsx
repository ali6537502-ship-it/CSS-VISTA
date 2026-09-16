import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { StudentProfilePanel } from './StudentProfilePanel'

export function ProfileGate({ children }: { children: ReactNode }) {
  const { loading, user, signOut, updatePassword } = useAccount()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function logout() { setBusy(true); const result = await signOut(); setMessage(result.error || ''); setBusy(false) }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form)
    if (data.get('new') !== data.get('confirmation')) { setMessage('Passwords do not match.'); return }
    setBusy(true)
    const result = await updatePassword(String(data.get('new')), String(data.get('current')))
    setMessage(result.error || 'Your password has been updated.'); if (!result.error) form.reset(); setBusy(false)
  }
  if (loading) return <div className="mx-auto max-w-5xl animate-pulse px-4 py-10" role="status">Checking your account…</div>
  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/account?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }
  if (user.profile_complete) return <>{children}</>
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:py-12"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Welcome to your account</p><h1 className="mt-2 text-2xl font-bold text-pine">One profile. All your study services.</h1></div><button disabled={busy} onClick={() => void logout()} className="min-h-11 rounded-lg border px-4 text-sm font-semibold">Sign out</button></header><StudentProfilePanel key={user.id} email={user.email} /><details className="rounded-xl border bg-white/70 p-5"><summary className="cursor-pointer font-semibold text-pine">Account security</summary><form className="mt-4 grid max-w-lg gap-4" onSubmit={e => void password(e)}>{[['current','Current password'],['new','New password'],['confirmation','Confirm new password']].map(([name,label]) => <label className="text-sm" key={name}>{label}<input name={name} type="password" required minLength={name === 'current' ? undefined : 8} autoComplete={name === 'current' ? 'current-password' : 'new-password'} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>)}<button disabled={busy} className="min-h-11 rounded-lg bg-pine px-4 text-sm font-semibold text-white">Update password</button></form></details>{message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}</main>
}
