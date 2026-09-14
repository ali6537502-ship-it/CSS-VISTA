import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { ownerRequest } from '@/lib/hostingerApi'

type Delivery = { accepted: number; failed: number; transport_ready: boolean }
type MailHealth = {
  transport: string
  transport_available: boolean
  settings: { host: string; port: number; encryption: string; user: string; from: string; from_name: string }
  queue: { status: string; count: number }[]
  delivery?: Delivery | null
  note: string
}
type MailSettings = {
  configured: boolean
  password_set: boolean
  config_writable: boolean
  host: string
  port: number
  encryption: 'ssl' | 'tls'
  user: string
  from: string
  from_name: string
  test_recipient: string
}

export default function AccountMailPanel() {
  const [health, setHealth] = useState<MailHealth | null>(null)
  const [settings, setSettings] = useState<MailSettings | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'load' | 'save' | 'retry' | ''>('load')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load(signal?: AbortSignal) {
    setError('')
    const [nextHealth, nextSettings] = await Promise.all([
      ownerRequest<MailHealth>('admin/account-mail.php', { signal }),
      ownerRequest<MailSettings>('admin/account-mail-settings.php', { signal }),
    ])
    setHealth(nextHealth)
    setSettings(nextSettings)
  }

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
      .catch(() => { if (!controller.signal.aborted) setError('Email status could not be loaded. Please retry.') })
      .finally(() => { if (!controller.signal.aborted) setBusy('') })
    return () => controller.abort()
  }, [])

  async function refresh() {
    setBusy('load'); setError(''); setNotice('')
    try { await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Email status is unavailable.') }
    finally { setBusy('') }
  }

  async function retryQueue() {
    setBusy('retry'); setError(''); setNotice('')
    try {
      const next = await ownerRequest<MailHealth>('admin/account-mail.php', { method: 'POST', body: '{}' })
      setHealth(next)
      setNotice(`Queue checked: ${next.delivery?.accepted ?? 0} accepted and ${next.delivery?.failed ?? 0} failed.`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Queued messages could not be retried.') }
    finally { setBusy('') }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!settings) return
    setBusy('save'); setError(''); setNotice('')
    try {
      const result = await ownerRequest<{ message: string; delivery: Delivery }>('admin/account-mail-settings.php', {
        method: 'POST',
        body: JSON.stringify({ ...settings, password }),
      })
      setPassword('')
      setNotice(`${result.message} Queued messages: ${result.delivery.accepted} accepted, ${result.delivery.failed} failed.`)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Hostinger SMTP could not be connected.') }
    finally { setBusy('') }
  }

  const ready = health?.transport_available === true
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="vista-card overflow-hidden">
        <div className="border-b bg-gradient-to-br from-pine to-pine/90 p-5 text-white sm:p-8">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-white/10 p-2.5"><Mail className="h-6 w-6" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Private owner settings</p>
              <h1 className="mt-1 font-display text-2xl font-bold">Account email delivery</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Connect a real Hostinger mailbox for verification links and password-reset codes. The password is saved only in the private server configuration.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-8">
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            {ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
            <div>
              <p className="font-semibold text-slate-900">{ready ? 'Authenticated Hostinger SMTP connected' : 'Account email is not connected'}</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{health?.note ?? 'Checking the production mail service…'}</p>
            </div>
          </div>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

          {settings ? (
            <form onSubmit={save} className="space-y-5">
              <div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-pine" /><h2 className="text-lg font-bold text-pine">Hostinger mailbox</h2></div>
                <p className="mt-1 text-sm text-muted-foreground">The test must pass before any setting is saved. A confirmation message will be sent to {settings.test_recipient}.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-800">SMTP host
                  <input value={settings.host} onChange={(e) => setSettings({ ...settings, host: e.target.value })} required className="mt-1.5 min-h-11 w-full rounded-md border bg-white px-3 font-normal" />
                </label>
                <label className="text-sm font-semibold text-slate-800">Mailbox email
                  <input type="email" autoComplete="username" value={settings.user} onChange={(e) => setSettings({ ...settings, user: e.target.value, from: e.target.value })} required className="mt-1.5 min-h-11 w-full rounded-md border bg-white px-3 font-normal" placeholder="noreply@css-vista.com" />
                </label>
                <label className="text-sm font-semibold text-slate-800">Mailbox password
                  <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required={!settings.password_set} className="mt-1.5 min-h-11 w-full rounded-md border bg-white px-3 font-normal" placeholder={settings.password_set ? 'Leave blank to keep current password' : 'Enter the Hostinger mailbox password'} />
                </label>
                <label className="text-sm font-semibold text-slate-800">Sender name
                  <input value={settings.from_name} onChange={(e) => setSettings({ ...settings, from_name: e.target.value })} required maxLength={100} className="mt-1.5 min-h-11 w-full rounded-md border bg-white px-3 font-normal" />
                </label>
                <label className="text-sm font-semibold text-slate-800">Encryption
                  <select value={settings.encryption} onChange={(e) => {
                    const encryption = e.target.value as 'ssl' | 'tls'
                    setSettings({ ...settings, encryption, port: encryption === 'ssl' ? 465 : 587 })
                  }} className="mt-1.5 min-h-11 w-full rounded-md border bg-white px-3 font-normal">
                    <option value="ssl">SSL — port 465</option>
                    <option value="tls">TLS — port 587</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-800">Sender address
                  <input type="email" value={settings.from} readOnly className="mt-1.5 min-h-11 w-full rounded-md border bg-slate-50 px-3 font-normal text-slate-600" />
                </label>
              </div>
              {!settings.config_writable && <p className="text-sm text-amber-800">The current private configuration is read-only. Hostinger file permissions must allow the website process to update it.</p>}
              <button type="submit" disabled={busy !== '' || !settings.config_writable} className="min-h-11 rounded-md bg-pine px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {busy === 'save' ? 'Testing Hostinger SMTP…' : 'Test, connect and retry queue'}
              </button>
            </form>
          ) : busy === 'load' && <p role="status">Loading secure mail settings…</p>}

          <div className="border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-bold text-pine">Delivery queue</h2><p className="mt-1 text-sm text-muted-foreground">Pending and failed messages remain encrypted until accepted or expired.</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void refresh()} disabled={busy !== ''} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 font-semibold disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${busy === 'load' ? 'animate-spin' : ''}`} />Refresh</button>
                <button type="button" onClick={() => void retryQueue()} disabled={busy !== '' || !ready} className="min-h-11 rounded-md border border-pine px-4 font-semibold text-pine disabled:opacity-50">{busy === 'retry' ? 'Retrying…' : 'Retry queued messages'}</button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(health?.queue ?? []).length > 0 ? health?.queue.map((row) => <div key={row.status} className="rounded-lg border bg-white p-3"><span className="text-sm capitalize text-muted-foreground">{row.status}</span><p className="text-2xl font-bold text-pine">{Number(row.count)}</p></div>) : <p className="col-span-full text-sm text-muted-foreground">No queued account emails.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
