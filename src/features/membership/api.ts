import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '@/lib/accountContext'
import { currentHostingerAccountUser, hostingerRequest } from '@/lib/hostingerApi'

export type Membership = { status: 'free' | 'active' | 'expired'; starts_at: string | null; expires_at: string | null }
export type Product = { name: string; amount_minor: number | null; currency: 'PKR'; duration_days: 30; collection_enabled: boolean; receiver_number: string | null; receiver_title: string | null; terms_version: string | null; terms_text: string | null; product_revision: string | null }
export type OrderStatus = 'awaiting_payment' | 'awaiting_verification' | 'approved' | 'rejected' | 'cancelled'
export type OrderSummary = { id: string; status: OrderStatus; amount_minor: number; created_at: string }
export type Submission = { id: string; transaction_id: string; status: 'pending' | 'approved' | 'rejected'; submitted_at: string; reviewed_at: string | null; review_reason: string | null }
export type Order = OrderSummary & { user_id: string; duration_days: number; receiver_number: string; receiver_title: string; terms_version: string; terms_text: string; return_to: string; submissions: Submission[]; grant: { activated_at: string; starts_at: string; expires_at: string } | null }
export type Overview = { membership: Membership; product: Product; orders: OrderSummary[]; has_more: boolean }
export type OrderResponse = { order: Order; membership: Membership; collection_enabled: boolean }
export const statusLabels: Record<OrderStatus, string> = { awaiting_payment: 'Awaiting payment', awaiting_verification: 'Payment awaiting verification', approved: 'Approved', rejected: 'Rejected — action required', cancelled: 'Cancelled' }
export function money(minor: number | null) { return minor === null ? 'Price unavailable' : new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(minor / 100) }
export function pakistanTime(value: string | null) { return value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value)) + ' PKT' : '—' }
const destinations = ['/account/dashboard', '/account/english', '/account/mpt', '/grammar-course', '/language-grammar', '/current-affairs', '/vistagram']
export function learningDestination(value: string | null) { return value && destinations.includes(value) ? value : '/account/dashboard' }

export async function membershipRequest<T>(userId: string, query = '', body?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  if (currentHostingerAccountUser() !== userId) throw new Error('Please sign in again to view your membership.')
  const result = await hostingerRequest<T>('student/membership.php' + query, { signal, headers: { 'X-CSSV-User': userId }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  if (currentHostingerAccountUser() !== userId) throw new Error('Your account changed. Please reopen Membership & Payments.')
  return result
}

/** Membership data is never placed in a shared local-storage cache. */
export function useMembership<T>(query = '') {
  const { user } = useAccount()
  const userId = user?.id
  const [snapshot, setSnapshot] = useState<{ userId?: string; query: string; data: T }> ()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(value => value + 1), [])
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    setPending(true)
    void membershipRequest<T>(userId, query, undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { setSnapshot({ userId, query, data }); setError('') }
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Membership could not be loaded.')
    }).finally(() => { if (!controller.signal.aborted) setPending(false) })
    return () => controller.abort()
  }, [userId, query, version])
  useEffect(() => {
    const focus = () => refresh()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 30_000)
    window.addEventListener('focus', focus)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [refresh])
  const data = snapshot && snapshot.userId === userId && snapshot.query === query ? snapshot.data : undefined
  return { data, error, pending, refresh }
}

/** Survives ambiguous network failure/refresh. Same intent keeps its identity. */
export function requestIdentity(userId: string, intent: string) {
  const key = `cssvista:payment-request:${userId}:${intent}`
  const generated = crypto.randomUUID()
  try {
    const prior = sessionStorage.getItem(key)
    const id = prior && /^[a-f0-9-]{36}$/i.test(prior) ? prior : generated
    sessionStorage.setItem(key, id)
    return { id, done: () => sessionStorage.removeItem(key) }
  } catch { return { id: generated, done: () => {} } }
}

/** Display timer only; the backend remains authoritative for every action. */
export function useMembershipExpired(expiresAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = window.setInterval(tick, 1000)
    window.addEventListener('focus', tick)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick) }
  }, [])
  return !!expiresAt && new Date(expiresAt).getTime() <= now
}
