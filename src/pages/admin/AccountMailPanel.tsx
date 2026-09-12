import { useEffect, useState } from 'react'
import { ownerRequest } from '@/lib/hostingerApi'
type MailHealth = { transport: string; transport_available: boolean; queue: { status: string; count: number }[]; delivery?: { accepted: number; failed: number } | null; note: string }
export default function AccountMailPanel() {
  const [health, setHealth] = useState<MailHealth | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void ownerRequest<MailHealth>('admin/account-mail.php', { signal: controller.signal }).then(setHealth).catch(() => { if (!controller.signal.aborted) setError('Email status could not be loaded. Please retry.') })
    return () => controller.abort()
  }, [])
  async function refresh(retry = false) {
    setBusy(true); setError('')
    try { setHealth(await ownerRequest<MailHealth>('admin/account-mail.php', retry ? { method: 'POST', body: '{}' } : {})) }
    catch (e) { setError(e instanceof Error ? e.message : 'Email status is unavailable.') }
    finally { setBusy(false) }
  }
  return <section className="mx-auto max-w-3xl px-4 py-8"><div className="vista-card p-5 sm:p-8"><h1 className="text-2xl font-bold text-pine">Account email delivery</h1><p className="mt-3 text-sm text-muted-foreground">Verification and password-reset messages use your Hostinger mail transport. Expired links are removed from the delivery queue.</p>{error && <p role="alert" className="mt-4 text-red-800">{error}</p>}{health ? <><p className="mt-5 font-semibold">{health.transport === 'smtp' ? 'Hostinger SMTP' : 'Hostinger PHP mail'} — {health.transport_available ? 'transport available' : 'configuration required'}</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{health.queue.map((row) => <div key={row.status} className="rounded-lg border p-3"><span className="text-sm capitalize">{row.status}</span><p className="text-2xl font-bold text-pine">{Number(row.count)}</p></div>)}</div><p className="mt-4 text-sm text-muted-foreground">{health.note}</p>{health.delivery && <p role="status" className="mt-3 text-sm">Latest retry: {health.delivery.accepted} accepted, {health.delivery.failed} failed.</p>}</> : !error && <p role="status" className="mt-5">Loading email status…</p>}<div className="mt-5 flex flex-wrap gap-3"><button className="min-h-11 rounded-md border px-4 font-semibold" disabled={busy} onClick={() => void refresh()}>Refresh status</button><button className="min-h-11 rounded-md bg-pine px-4 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => void refresh(true)}>{busy ? 'Checking…' : 'Retry pending messages'}</button></div></div></section>
}
