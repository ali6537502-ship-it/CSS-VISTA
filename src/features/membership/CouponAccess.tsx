import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { currentHostingerAccountUser, hostingerRequest } from '@/lib/hostingerApi'
import { money, pakistanTime, requestIdentity, type Product } from './api'

type Offer = { kind: 'percent' | 'fixed' | 'complimentary'; base_amount_minor: number; amount_minor: number; duration_days: number; expires_at: string; coupon_revision: string }
type History = { enabled: boolean; has_more: boolean; redemptions: { id: string; order_id: string | null; amount_minor: number; base_amount_minor: number; created_at: string; starts_at: string | null; expires_at: string | null }[] }
const control = 'min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-pine disabled:opacity-60'
async function couponRequest<T>(user: string, query = '', body?: Record<string, unknown>, signal?: AbortSignal) {
  if (currentHostingerAccountUser() !== user) throw new Error('Please sign in again.')
  const data = await hostingerRequest<T>('student/coupons.php' + query, { signal, headers: { 'X-CSSV-User': user }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  if (currentHostingerAccountUser() !== user) throw new Error('Your account changed. Reopen your membership.')
  return data
}
export default function CouponAccess({ userId, product, returnTo, onChanged }: { userId: string; product: Product; returnTo: string; onChanged: (order?: string) => void }) {
  const [code, setCode] = useState(''), [offer, setOffer] = useState<Offer>(), [history, setHistory] = useState<History>(), [offset, setOffset] = useState(0), [version, setVersion] = useState(0), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [accepted, setAccepted] = useState(false)
  const running = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    const abort = new AbortController()
    void couponRequest<History>(userId, `?offset=${offset}`, undefined, abort.signal).then(data => { if (!abort.signal.aborted) { setHistory(data); setError('') } }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Coupon history could not be loaded.') })
    return () => abort.abort()
  }, [userId, offset, version])
  async function apply(event: FormEvent) {
    event.preventDefault(); if (running.current) return
    running.current = true; setBusy(true); setError(''); setMessage(''); setOffer(undefined); setAccepted(false)
    try { const data = await couponRequest<{ offer: Offer }>(userId, '', { action: 'quote', code }); if (alive.current) setOffer(data.offer) }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'The code could not be applied.') }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  async function redeem() {
    if (!offer || !accepted || running.current) return
    running.current = true; setBusy(true); setError(''); setMessage('')
    const identity = requestIdentity(userId, `coupon:${offer.coupon_revision}:${returnTo}`)
    try {
      const data = await couponRequest<{ order_id: string | null }>(userId, '', { action: 'redeem', code, coupon_revision: offer.coupon_revision, request_id: identity.id, return_to: returnTo, ...(offer.amount_minor > 0 ? { terms_version: product.terms_version, product_revision: product.product_revision } : {}) })
      identity.done()
      if (alive.current) { setMessage(data.order_id ? 'Discount applied to your payment order.' : 'Complimentary access credited: 30 days.'); setOffer(undefined); setCode(''); setAccepted(false); refresh(); onChanged(data.order_id ?? undefined) }
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Refresh your membership before retrying this request.') }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="rounded-xl border border-slate-200 p-5 sm:p-6"><h2 className="text-lg font-semibold">Coupon access</h2><p className="mt-2 text-sm leading-7 text-slate-600">Apply a code provided by CSS Vista. A code assigned to a student works only on that account. Coupons do not increase AI allowances.</p>
    {history?.enabled ? <form onSubmit={event => void apply(event)} className="mt-4 flex flex-wrap items-end gap-3"><label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold">Coupon code<input required maxLength={64} autoComplete="off" spellCheck={false} disabled={busy} value={code} onChange={e => { setCode(e.target.value); setOffer(undefined); setAccepted(false) }} className={`${control} w-full uppercase`} /></label><button disabled={busy} className={control}>{busy ? 'Please wait…' : 'Apply code'}</button></form> : <p role="status" className="mt-4 text-sm text-slate-600">{history ? 'Coupon redemption is not open yet.' : 'Loading coupon status…'}</p>}
    {offer && <div className="mt-5 rounded-lg bg-slate-50 p-4"><h3 className="font-semibold">{offer.amount_minor === 0 ? 'Complimentary Pro — 30 days' : `Your discounted price: ${money(offer.amount_minor)}`}</h3>{offer.amount_minor > 0 && <p className="mt-2 text-sm">Standard price {money(offer.base_amount_minor)}. Access begins after the discounted payment is verified.</p>}<p className="mt-2 text-sm leading-6">{offer.amount_minor === 0 ? 'No payment is required. Adds 30 days from now, or after your current Pro expiry.' : 'One coupon per order. Existing orders keep their agreed price.'} Code expires {pakistanTime(offer.expires_at)}.</p>{offer.amount_minor > 0 && <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{product.terms_text}</p>}<label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={accepted} disabled={busy} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />{offer.amount_minor === 0 ? 'I want to redeem this code for one complimentary 30-day Pro period.' : 'I accept the purchase terms and this discounted price.'}</label><button type="button" disabled={!accepted || busy} onClick={() => void redeem()} className={`${control} mt-4 bg-pine text-white`}>{offer.amount_minor === 0 ? 'Redeem complimentary access' : 'Create discounted order'}</button></div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-800">{error} <button type="button" className="underline" onClick={refresh}>Refresh coupon history</button></p>}{message && <p role="status" className="mt-4 text-sm">{message}</p>}
    {!!history?.redemptions.length && <><h3 className="mt-6 font-semibold">Coupon history</h3><ul className="mt-3 divide-y rounded-lg border">{history.redemptions.map(row => <li key={row.id} className="p-4 text-sm leading-6">{row.order_id ? <Link to={`?order=${row.order_id}`} className="font-semibold text-pine underline">Discounted order · {money(row.amount_minor)}</Link> : <><p className="font-semibold">Complimentary 30-day access</p><p>{pakistanTime(row.starts_at)} to {pakistanTime(row.expires_at)}</p></>}<p className="text-slate-500">Recorded {pakistanTime(row.created_at)}</p></li>)}</ul></>}
    {history && (history.has_more || offset > 0) && <nav aria-label="Coupon history pages" className="mt-4 flex flex-wrap gap-3"><button disabled={offset === 0 || busy} className={control} onClick={() => setOffset(v => Math.max(0, v - 50))}>Previous page</button><button disabled={!history.has_more || busy} className={control} onClick={() => setOffset(v => v + 50)}>Next page</button></nav>}
  </section>
}
