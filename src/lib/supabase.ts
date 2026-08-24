import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSupabaseConfiguration } from '@/lib/supabaseConfig'

const configuration = resolveSupabaseConfiguration({
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  legacyAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

export const accountServiceConfigured = configuration.configured
export const accountServiceConfigurationError = configuration.error

let clientPromise: Promise<SupabaseClient | null> | null = null

export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!accountServiceConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => (
      createClient(configuration.url!, configuration.publishableKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    )).catch(() => {
      // A blocked/lost lazy chunk must not leave the application in a rejected
      // singleton state. Callers can retry without crashing guest mode.
      clientPromise = null
      return null
    })
  }
  return clientPromise
}

export interface SupabaseConnectionResult {
  connected: boolean
  error: string | null
}

export async function checkSupabaseConnection(): Promise<SupabaseConnectionResult> {
  if (!accountServiceConfigured) {
    return {
      connected: false,
      error: accountServiceConfigurationError || 'Supabase is not configured.',
    }
  }
  const client = await getSupabaseClient()
  if (!client) return { connected: false, error: 'The Supabase client could not be loaded.' }

  try {
    const { error } = await client
      .from('site_content')
      .select('id', { count: 'exact', head: true })
      .eq('id', 'published')
    return error
      ? { connected: false, error: error.message }
      : { connected: true, error: null }
  } catch {
    return { connected: false, error: 'The Supabase project could not be reached.' }
  }
}
