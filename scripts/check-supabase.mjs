import { createClient } from '@supabase/supabase-js'

const projectUrl = (
  process.env.SUPABASE_URL
  || process.env.VITE_SUPABASE_URL
  || ''
).trim()
const publishableKey = (
  process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_API_KEY
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || ''
).trim()

function fail(message) {
  console.error(`Supabase connection check failed: ${message}`)
  process.exitCode = 1
}

function jwtRole(key) {
  const payload = key.split('.')[1]
  if (!payload) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role ?? null
  } catch {
    return null
  }
}

if (!projectUrl || !publishableKey) {
  fail('set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or the matching VITE_ variables).')
} else if (publishableKey.startsWith('sb_secret_') || jwtRole(publishableKey) === 'service_role') {
  fail('use a publishable/anon key. Secret and service-role keys are intentionally rejected.')
} else {
  let parsedUrl
  try {
    parsedUrl = new URL(projectUrl)
  } catch {
    fail('SUPABASE_URL is not a valid URL.')
  }

  if (parsedUrl) {
    const client = createClient(parsedUrl.toString().replace(/\/$/, ''), publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const { count, error } = await client
      .from('site_content')
      .select('id', { count: 'exact', head: true })
      .eq('id', 'published')
      .abortSignal(AbortSignal.timeout(15_000))

    if (error) {
      const migrationHint = error.code === 'PGRST205'
        ? ' Run the SQL files in supabase/migrations in filename order.'
        : ''
      fail(`${error.message}${migrationHint}`)
    } else {
      console.log(`Supabase connected successfully: ${parsedUrl.hostname} (published content rows: ${count ?? 0}).`)
    }
  }
}
