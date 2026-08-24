export interface SupabaseEnvironment {
  url?: string
  publishableKey?: string
  legacyAnonKey?: string
}

export interface SupabaseConfiguration {
  configured: boolean
  url: string | null
  publishableKey: string | null
  error: string | null
}

function decodeJwtPayload(key: string): Record<string, unknown> | null {
  const payload = key.split('.')[1]
  if (!payload || typeof globalThis.atob !== 'function') return null
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const decoded = JSON.parse(globalThis.atob(padded))
    return decoded && typeof decoded === 'object' ? decoded as Record<string, unknown> : null
  } catch {
    return null
  }
}

function isPrivilegedKey(key: string) {
  if (key.startsWith('sb_secret_')) return true
  return decodeJwtPayload(key)?.role === 'service_role'
}

function isPlaceholder(value: string) {
  return /^(?:your-|replace-|<)/i.test(value) || value.includes('your-project')
}

export function resolveSupabaseConfiguration(environment: SupabaseEnvironment): SupabaseConfiguration {
  const url = environment.url?.trim() || ''
  const publishableKey = environment.publishableKey?.trim()
    || environment.legacyAnonKey?.trim()
    || ''

  if (!url && !publishableKey) {
    return { configured: false, url: null, publishableKey: null, error: null }
  }
  if (!url || !publishableKey || isPlaceholder(url) || isPlaceholder(publishableKey)) {
    return {
      configured: false,
      url: null,
      publishableKey: null,
      error: 'Both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.',
    }
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { configured: false, url: null, publishableKey: null, error: 'The Supabase project URL is invalid.' }
  }

  const localProject = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1'
  if (parsedUrl.protocol !== 'https:' && !(localProject && parsedUrl.protocol === 'http:')) {
    return {
      configured: false,
      url: null,
      publishableKey: null,
      error: 'The Supabase project URL must use HTTPS outside local development.',
    }
  }

  if (isPrivilegedKey(publishableKey)) {
    return {
      configured: false,
      url: null,
      publishableKey: null,
      error: 'A Supabase secret or service-role key must never be used in the browser.',
    }
  }

  return {
    configured: true,
    url: parsedUrl.toString().replace(/\/$/, ''),
    publishableKey,
    error: null,
  }
}
