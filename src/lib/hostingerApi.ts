import type { SupabaseClient } from '@supabase/supabase-js'

type ApiFailure = { error?: string; message?: string }

export const hostingerAccountBackendEnabled = import.meta.env.VITE_ACCOUNT_BACKEND === 'hostinger'

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)cssv_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  if (!response.ok) throw new Error(data.error || data.message || 'Account service request failed.')
  return data
}

export async function ensureHostingerSession(client: SupabaseClient) {
  if (!hostingerAccountBackendEnabled) return false
  const current = await api<{ authenticated: boolean }>('auth/session.php')
  if (current.authenticated) return true
  const { data } = await client.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) return false
  await api<{ ok: boolean }>('auth/supabase-session.php', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken }),
  })
  return true
}

export async function logoutHostinger() {
  if (!hostingerAccountBackendEnabled || !csrfToken()) return
  await api<{ ok: boolean }>('auth/logout.php', { method: 'POST', body: '{}' })
}

export async function loadHostingerProgress() {
  return api<{ payload: Record<string, unknown> }>('student/progress.php')
}

export async function saveHostingerProgress(payload: Record<string, unknown>) {
  return api<{ ok: boolean; updated_at: string }>('student/progress.php', {
    method: 'PUT',
    body: JSON.stringify({ payload }),
  })
}

export async function clearHostingerProgress() {
  return api<{ ok: boolean }>('student/progress.php', { method: 'DELETE', body: '{}' })
}
