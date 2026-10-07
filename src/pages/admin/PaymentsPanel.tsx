import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ownerRequest } from '@/lib/hostingerApi'
import { money, pakistanTime, type Product } from '@/features/membership/api'

type Review = { id: string; order_id: string; transaction_id: string; status: 'pending' | 'approved' | 'rejected'; submitted_at: string; reviewed_at: string | null; reviewed_by: string | null; review_reason: string | null; amount_minor: number; receiver_number: string; receiver_title: string; email: string; display_name: string; expires_at: string | null; proposed_expiry: string }
type Queue = { submissions: Review[]; has_more: boolean; product: Product }
const control = 'min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-pine'

function ReviewForm({ row, onReviewed }: { row: Review; onReviewed: () => void }) {
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [transaction, setTransaction] = useState('')
  const [receiver, setReceiver] = useState('')
  const [receivedAt, setReceivedAt] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const running = useRef(false)
  async function review(action: 'approve' | 'reject', event?: FormEvent) {
    event?.preventDefault()
    if (running.current) return
    if (!reason.trim()) { setError('Enter the review reason.'); return }
    const match = /^([0-9]{1,7})(?:\.([0-9]{1,2}))?$/.exec(amount.trim())
    if (action === 'approve' && (!match || !verified || !receivedAt)) { setError('Complete the actual receipt details and verification check.'); return }
    running.current = true; setBusy(true); setError('')
    try {
      await ownerRequest('admin/payments.php', { method: 'POST', body: JSON.stringify({ action, submission_id: row.id, reason: reason.trim(), ...(action === 'approve' ? { transaction_id: transaction, received_amount_minor: Number(match![1]) * 100 + Number((match![2] ?? '').padEnd(2, '0')), receiver_number: receiver, received_at: `${receivedAt.length === 16 ? receivedAt + ':00' : receivedAt}+05:00`, receipt_verified: verified } : {}) }) })
      onReviewed()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review failed. Reload the queue before retrying.') }
    finally { running.current = false; setBusy(false) }
  }
  return <form onSubmit={event => void review('approve', event)} className="mt-5 space-y-4 border-t pt-5">
    <p className="text-sm leading-6 text-slate-600">Compare with the actual Easypaisa receiving-account record. A member’s transaction ID alone does not verify receipt.</p>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Received transaction ID<input required value={transaction} onChange={e => setTransaction(e.target.value)} maxLength={80} className={control} /></label><label className="grid gap-2 text-sm font-semibold">Received amount (PKR)<input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className={control} /></label><label className="grid gap-2 text-sm font-semibold">Receiving number<input required type="tel" value={receiver} onChange={e => setReceiver(e.target.value)} maxLength={24} className={control} /></label><label className="grid gap-2 text-sm font-semibold">Received date and time (Pakistan)<input required type="datetime-local" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className={`${control} min-w-0 w-full`} /></label></div>
    <label className="grid gap-2 text-sm font-semibold">Review reason<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} rows={3} className={control} /></label>
    <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-800" />I checked actual receipt, account, amount, transaction and transfer time. This payment has not been used for another order.</label>
    {error && <p role="alert" className="text-sm leading-6 text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy || !verified} className="min-h-11 rounded-lg bg-pine px-5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving decision…' : 'Approve payment'}</button><button type="button" disabled={busy} onClick={() => void review('reject')} className="min-h-11 rounded-lg border border-red-300 px-5 text-sm font-semibold text-red-800 disabled:opacity-60">Reject submission</button></div>
  </form>
}

export default function PaymentsPanel() {
  const [status, setStatus] = useState('pending')
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<Queue>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [pending, setPending] = useState(false)
  const refresh = useCallback(() => setVersion(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController(); setPending(true)
    void ownerRequest<Queue>(`admin/payments.php?status=${status}&offset=${offset}`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) { setData(value); setError('') } }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Payments could not be loaded.') }).finally(() => { if (!controller.signal.aborted) setPending(false) })
    return () => controller.abort()
  }, [status, offset, version])
  return <main className="mx-auto max-w-5xl px-4 py-8"><h1 className="text-2xl font-bold text-slate-950">Membership payments</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">Verify actual receipt before granting access. Approval adds one 30-day period; rejecting a new submission preserves existing Pro access.</p>
    {data && !data.product.collection_enabled && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-950">New purchases are closed. Existing submitted transfers can still be reviewed.</p>}
    <div className="mt-6 flex flex-wrap items-end gap-3"><label className="grid gap-2 text-sm font-semibold">Submission status<select className={control} value={status} onChange={e => { setStatus(e.target.value); setOffset(0); setData(undefined) }}><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label><button disabled={pending} onClick={refresh} className={control}>{pending ? 'Refreshing…' : 'Refresh queue'}</button></div>
    {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 p-4 text-sm text-red-800">{error}</p>}
    {!data && !error && <p role="status" className="mt-5">Loading payment queue…</p>}
    {data?.submissions.length === 0 && <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-slate-500">No {status} submissions.</p>}
    <div className="mt-6 space-y-5">{data?.submissions.map(row => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{row.display_name || 'Member'}</h2><p className="break-all text-sm text-slate-500">{row.email}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{row.status === 'pending' ? 'Awaiting verification' : row.status === 'approved' ? 'Approved' : 'Rejected'}</span></header><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Expected transfer</dt><dd className="mt-1 font-semibold">{money(row.amount_minor)} · {row.receiver_title} · {row.receiver_number}</dd></div><div><dt className="text-slate-500">Submitted transaction</dt><dd className="mt-1 break-all font-semibold">{row.transaction_id}</dd></div><div><dt className="text-slate-500">Submitted</dt><dd className="mt-1">{pakistanTime(row.submitted_at)}</dd></div><div><dt className="text-slate-500">Current Pro expiry</dt><dd className="mt-1">{pakistanTime(row.expires_at)}</dd></div><div><dt className="text-slate-500">Proposed expiry if approved now</dt><dd className="mt-1">{pakistanTime(row.proposed_expiry)}</dd></div><div><dt className="text-slate-500">Order reference</dt><dd className="mt-1 break-all">{row.order_id}</dd></div></dl>{row.reviewed_at && <p className="mt-4 break-all text-xs text-slate-500">Reviewed {pakistanTime(row.reviewed_at)} · Admin reference: {row.reviewed_by}</p>}{row.review_reason && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6">{row.review_reason}</p>}{row.status === 'pending' && <ReviewForm row={row} onReviewed={refresh} />}</article>)}</div>
    {data && <nav aria-label="Payment pages" className="mt-5 flex flex-wrap gap-3"><button disabled={offset === 0 || pending} className={control} onClick={() => { setOffset(value => Math.max(0, value - 50)); setData(undefined) }}>Previous page</button><button disabled={!data.has_more || pending} className={control} onClick={() => { setOffset(value => value + 50); setData(undefined) }}>Next page</button></nav>}
  </main>
}
