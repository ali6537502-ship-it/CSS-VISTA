import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, Copy, LoaderCircle } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { AccountPage } from './shared'
import { learningDestination, membershipRequest, money, pakistanTime, requestIdentity, statusLabels, useMembership, useMembershipExpired, type OrderResponse, type Overview } from '@/features/membership/api'

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'

function OrderDetail({ id }: { id: string }) {
  const { user } = useAccount()
  const { data, error, pending, refresh } = useMembership<OrderResponse>(`?order_id=${encodeURIComponent(id)}`)
  const [transaction, setTransaction] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const running = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function mutate(action: 'submit' | 'cancel', event?: FormEvent) {
    event?.preventDefault()
    if (!user || running.current) return
    running.current = true; setBusy(true); setMessage('')
    const identity = requestIdentity(user.id, `${id}:${action}:${transaction.trim().toUpperCase()}`)
    try {
      await membershipRequest<OrderResponse>(user.id, '', { action, order_id: id, ...(action === 'submit' ? { request_id: identity.id, transaction_id: transaction.trim() } : {}) })
      identity.done()
      if (alive.current) { setTransaction(''); setMessage(action === 'submit' ? 'Payment awaiting verification. Access starts after approval.' : 'Order cancelled.'); refresh() }
    } catch (cause) { if (alive.current) setMessage(cause instanceof Error ? cause.message : 'The request failed. Refresh the order status before retrying.') }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(data?.order.receiver_number ?? ''); setMessage('Receiving number copied.') }
    catch { setMessage('Copy is unavailable. Select and copy the receiving number below.') }
  }
  if (!data) return <div role={error ? 'alert' : 'status'} className="rounded-xl border p-5">{error || 'Loading your order…'}{error && <button className={`${secondary} mt-3`} onClick={refresh}>Try again</button>}</div>
  const order = data.order
  const editable = order.status === 'awaiting_payment' || order.status === 'rejected'
  return <section className="space-y-6">
    <Link to="/account/membership" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-pine"><ArrowLeft className="h-4 w-4" />All payments</Link>
    <header><h2 className="text-xl font-bold text-slate-950">{statusLabels[order.status]}</h2><p className="mt-2 break-all text-sm text-slate-500">Order reference: {order.id}</p><p className="mt-2 text-sm text-slate-600">{money(order.amount_minor)} · {order.duration_days} days · created {pakistanTime(order.created_at)}</p></header>
    {pending && <p role="status" className="text-sm text-slate-500">Refreshing order status…</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-lg border bg-slate-50 p-4 text-sm">{message}</p>}
    {order.status === 'awaiting_verification' && <p className="rounded-xl bg-amber-50 p-5 leading-7 text-amber-950">Your transaction has been submitted for review. Please do not send another payment for this order. Pro activates after an administrator verifies actual receipt.</p>}
    {order.grant && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="font-semibold text-emerald-950">This payment credited 30 days</h3><p className="mt-2 text-sm leading-6">Period: {pakistanTime(order.grant.starts_at)} to {pakistanTime(order.grant.expires_at)}. Your current membership may include later renewals.</p><Link to={learningDestination(order.return_to)} className={`${button} mt-4`}>Return to learning</Link></div>}
    {editable && !data.collection_enabled && <p role="status" className="rounded-xl border p-5 text-sm leading-7">Payment collection is paused. Do not send a transfer for this order.</p>}
    {editable && data.collection_enabled && <div className="rounded-xl border border-slate-200 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-950">Easypaisa transfer</h3><p className="mt-2 text-sm leading-6 text-slate-600">Match the receiving account and amount before transferring. Use the transaction ID from your receipt; the order reference is for CSS Vista only.</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">Receiving account</dt><dd className="mt-1 font-semibold">{order.receiver_title}</dd></div><div><dt className="text-sm text-slate-500">Amount</dt><dd className="mt-1 font-semibold">{money(order.amount_minor)}</dd></div><div><dt className="text-sm text-slate-500">Receiving number</dt><dd className="mt-1 select-text text-xl font-semibold tracking-wide">{order.receiver_number}</dd></div><div><button type="button" className={secondary} onClick={() => void copy()}><Copy className="h-4 w-4" />Copy number</button></div></dl>
      <form onSubmit={event => void mutate('submit', event)} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Easypaisa transaction ID<input required minLength={4} maxLength={80} pattern="[A-Za-z0-9-]+" autoComplete="off" value={transaction} onChange={event => setTransaction(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal focus:ring-2 focus:ring-pine" /></label><p className="text-sm text-slate-500">Never share a wallet PIN, OTP, password or identity document.</p><button disabled={busy || pending} className={button}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Submit transaction for review</button></form>
      <button type="button" disabled={busy} onClick={() => void mutate('cancel')} className="mt-4 min-h-11 text-sm font-semibold text-slate-600 underline">Cancel unpaid order</button><p className="mt-2 text-xs leading-6 text-slate-500">Cancel only if you have not sent a transfer. Submit an existing transfer for review instead.</p>
    </div>}
    <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">Purchase terms for this order</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{order.terms_text}</p></details>
    <section><h3 className="font-semibold">Submission history</h3>{order.submissions.length === 0 ? <p className="mt-2 text-sm text-slate-500">No transaction submitted yet.</p> : <ol className="mt-3 divide-y rounded-xl border">{order.submissions.map(s => <li key={s.id} className="space-y-2 p-4 text-sm"><p className="font-semibold">{s.status === 'pending' ? 'Awaiting verification' : s.status === 'approved' ? 'Approved' : 'Rejected'} · <span className="break-all">{s.transaction_id}</span></p><p className="text-slate-500">Submitted {pakistanTime(s.submitted_at)}{s.reviewed_at && ` · reviewed ${pakistanTime(s.reviewed_at)}`}</p>{s.review_reason && <p className="leading-6">{s.review_reason}</p>}</li>)}</ol>}</section>
  </section>
}

export default function MembershipPage() {
  const { user } = useAccount()
  const [params, setParams] = useSearchParams()
  const id = params.get('order')
  const [offset, setOffset] = useState(0)
  const { data, error, pending, refresh } = useMembership<Overview>(`?offset=${offset}`)
  const [acceptedRevision, setAcceptedRevision] = useState<string | null>(null)
  const accepted = !!data?.product.product_revision && acceptedRevision === data.product.product_revision
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const running = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function create() {
    if (!user || !data || !accepted || running.current) return
    running.current = true; setBusy(true); setFailure('')
    const destination = learningDestination(params.get('returnTo'))
    const identity = requestIdentity(user.id, `create:${destination}:${data.product.product_revision}`)
    try {
      const response = await membershipRequest<OrderResponse>(user.id, '', { action: 'create', request_id: identity.id, return_to: destination, terms_version: data.product.terms_version, product_revision: data.product.product_revision })
      identity.done(); if (alive.current) { setParams({ order: response.order.id }); refresh() }
    } catch (cause) { if (alive.current) setFailure(cause instanceof Error ? cause.message : 'The order could not be created. Refresh your payment history before retrying.') }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  const expired = useMembershipExpired(data?.membership.expires_at)
  const active = data?.membership.status === 'active' && !expired
  return <AccountPage title="Membership & Payments" intro="One account for your preparation, membership and payment history.">
    {id ? <OrderDetail key={id} id={id} /> : <div className="space-y-8">
      {!data ? <div role={error ? 'alert' : 'status'} className="rounded-xl border p-5">{error || 'Loading membership…'}{error && <button onClick={refresh} className={`${secondary} mt-3`}>Try again</button>}</div> : <>
        <section className="rounded-xl border border-slate-200 p-5 sm:p-6"><h2 className="text-xl font-bold">{active ? 'Pro Active' : expired ? 'Your Pro access has expired' : 'Your free account'}</h2>{active && <p className="mt-2 text-sm leading-6">Expires {pakistanTime(data.membership.expires_at)}.</p>}<p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">Your preparation records belong to your account. Subscription expiry does not reset your progress or delete your saved work.</p></section>
        <section className="rounded-xl border border-slate-200 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-slate-950">Pro — 30 Days</h2><p className="mt-2 text-sm text-slate-500">One-time payment · manual renewal</p></div><p className="text-2xl font-semibold text-pine">{money(data.product.amount_minor)}</p></div><p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">A first purchase starts at approval. Renewing while Pro is active adds 30 days to your existing expiry.</p>
          {data.product.collection_enabled ? <><div className="mt-5 border-t pt-5"><h3 className="font-semibold">Purchase terms</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{data.product.terms_text}</p></div><label className="mt-5 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={accepted} onChange={event => setAcceptedRevision(event.target.checked ? data.product.product_revision : null)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-800" />I have read and accept these purchase terms.</label><button type="button" disabled={!accepted || busy || pending} onClick={() => void create()} className={`${button} mt-5`}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{active ? 'Create renewal order' : expired ? 'Renew access — 30 days' : 'Get Pro — 30 days'}</button></> : <p role="status" className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-600">Pro purchases are not open yet. No payment is required. Your existing free study tools remain available.</p>}
          {failure && <p role="alert" className="mt-4 text-sm leading-6 text-red-800">{failure}</p>}
        </section>
        <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Payment history</h2><button type="button" disabled={pending} onClick={refresh} className={secondary}>{pending ? 'Refreshing…' : 'Refresh status'}</button></div>{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}{data.orders.length === 0 ? <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-slate-500">You have no payment orders.</p> : <ul className="mt-4 divide-y rounded-xl border">{data.orders.map(order => <li key={order.id}><Link to={`?order=${order.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50"><span><span className="block font-semibold">{statusLabels[order.status]}</span><span className="mt-1 block text-sm text-slate-500">{pakistanTime(order.created_at)}</span></span><span className="text-sm font-semibold">{money(order.amount_minor)} · View order</span></Link></li>)}</ul>}<nav aria-label="Payment history pages" className="mt-4 flex flex-wrap gap-3"><button disabled={offset === 0 || pending} className={secondary} onClick={() => setOffset(value => Math.max(0, value - 50))}>Previous page</button><button disabled={!data.has_more || pending} className={secondary} onClick={() => setOffset(value => value + 50)}>Next page</button></nav></section>
      </>}
    </div>}
  </AccountPage>
}
