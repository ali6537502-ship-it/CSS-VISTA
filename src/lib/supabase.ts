import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

export const accountServiceConfigured = Boolean(projectUrl && publishableKey)

let clientPromise: Promise<SupabaseClient<Database> | null> | null = null

export function getSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  if (!accountServiceConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => (
      createClient<Database>(projectUrl!, publishableKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    ))
  }
  return clientPromise
}
