import type { SupabaseClient } from '@supabase/supabase-js'

type ApiFailure = { error?: string; message?: string }

// Hostinger is the production default after the verified data copy. Setting the
// variable to `supabase` is an immediate, deployment-only rollback switch.
export const hostingerAccountBackendEnabled = import.meta.env.VITE_ACCOUNT_BACKEND !== 'supabase'

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)cssv_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export class HostingerApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function hostingerRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken()
    if (token) headers.set('X-CSRF-Token', token)
  }
  const response = await fetch(`/api/${path}`, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({})) as T & ApiFailure
  if (!response.ok) throw new HostingerApiError(data.message || 'Account service request failed. Please try again.', response.status)
  return data
}

let sessionBridge: { userId: string; promise: Promise<boolean> } | null = null

export async function ensureHostingerSession(client: SupabaseClient) {
  if (!hostingerAccountBackendEnabled) return false
  const { data } = await client.auth.getSession()
  const session = data.session
  if (!session) return false
  if (sessionBridge?.userId === session.user.id) return sessionBridge.promise
  // Serialize account changes so two bridges cannot overwrite each other's cookie.
  if (sessionBridge) await sessionBridge.promise.catch(() => false)
  const promise = (async () => {
    const current = await hostingerRequest<{ authenticated: boolean; user?: { id: string } }>('auth/session.php')
    if (current.authenticated && current.user?.id === session.user.id) return true
    if (current.authenticated) await logoutHostinger()
    const latest = await client.auth.getSession()
    if (latest.data.session?.user.id !== session.user.id) return false
    await hostingerRequest<{ ok: boolean }>('auth/supabase-session.php', {
      method: 'POST', body: JSON.stringify({ access_token: latest.data.session.access_token }),
    })
    return true
  })()
  const bridge = { userId: session.user.id, promise }
  sessionBridge = bridge
  try { return await promise }
  finally { if (sessionBridge === bridge) sessionBridge = null }
}

export async function logoutHostinger() {
  if (!hostingerAccountBackendEnabled || !csrfToken()) return
  await hostingerRequest<{ ok: boolean }>('auth/logout.php', { method: 'POST', body: '{}' })
}

export async function loadHostingerProgress() {
  return hostingerRequest<{ payload: Record<string, unknown> }>('student/progress.php')
}

export async function saveHostingerProgress(payload: Record<string, unknown>) {
  return hostingerRequest<{ ok: boolean; updated_at: string }>('student/progress.php', {
    method: 'PUT',
    body: JSON.stringify({ payload }),
  })
}

export async function clearHostingerProgress() {
  return hostingerRequest<{ ok: boolean }>('student/progress.php', { method: 'DELETE', body: '{}' })
}
