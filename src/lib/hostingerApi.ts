import type { AccountUser } from './accountContext'
type ApiFailure = { error?: string; message?: string }
export const ACCOUNT_EXPIRED_EVENT = 'cssvista:account-expired'
export const accountServiceConfigured = true
export const hostingerAccountBackendEnabled = true
let accountUserId: string | null = null
export function setHostingerAccountUser(id: string | null) { accountUserId = id }
export function currentHostingerAccountUser() { return accountUserId }
export function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)cssv_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}
export class HostingerApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code = '') { super(message); this.status = status; this.code = code }
}
export async function hostingerRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (accountUserId && !headers.has('X-CSSV-User') && !path.startsWith('auth/')) headers.set('X-CSSV-User', accountUserId)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken()
    if (token) headers.set('X-CSRF-Token', token)
  }
  const response = await fetch(`/api/${path}`, { ...init, method, headers, credentials: 'same-origin', cache: 'no-store' })
  const data = await response.json().catch(() => ({})) as T & ApiFailure
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('auth/')) window.dispatchEvent(new Event(ACCOUNT_EXPIRED_EVENT))
    throw new HostingerApiError(data.message || 'The account service could not complete this request. Please try again.', response.status, data.error)
  }
  return data
}
export type AccountSession = { ok: boolean; authenticated: boolean; provider: 'hostinger'; user?: AccountUser }
export function loadAccountSession(signal?: AbortSignal) { return hostingerRequest<AccountSession>('auth/session.php', { signal }) }
export async function ensureHostingerSession() {
  const session = await loadAccountSession()
  return session.authenticated && (!accountUserId || session.user?.id === accountUserId)
}
export async function logoutHostinger() {
  if (!csrfToken()) {
    const current = await loadAccountSession()
    if (!current.authenticated) return
    throw new HostingerApiError('Refresh your account page before signing out securely.', 403)
  }
  await hostingerRequest<{ ok: boolean }>('auth/logout.php', { method: 'POST', body: '{}' })
}
export function loadHostingerProgress(userId: string) {
  return hostingerRequest<{ payload: Record<string, unknown> }>('student/progress.php', { headers: { 'X-CSSV-User': userId } })
}
export function saveHostingerProgress(payload: Record<string, unknown>, userId: string) {
  return hostingerRequest<{ ok: boolean; updated_at: string }>('student/progress.php', { method: 'PUT', headers: { 'X-CSSV-User': userId }, body: JSON.stringify({ payload }) })
}
export function clearHostingerProgress(userId: string) {
  return hostingerRequest<{ ok: boolean }>('student/progress.php', { method: 'DELETE', headers: { 'X-CSSV-User': userId }, body: '{}' })
}
export async function ownerRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = document.cookie.match(/(?:^|;\s*)cssv_owner_csrf=([^;]+)/)?.[1]
  if (token) headers.set('X-CSRF-Token', decodeURIComponent(token))
  // The owner panel uses its own MFA session and CSRF cookie.
  const method = (init.method ?? 'GET').toUpperCase()
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(`/api/${path}`, { ...init, method, headers, credentials: 'same-origin', cache: 'no-store' })
  const body = await response.json().catch(() => ({})) as T & ApiFailure
  if (!response.ok) throw new HostingerApiError(body.message || 'This administrator request could not be completed.', response.status, body.error)
  return body
}
