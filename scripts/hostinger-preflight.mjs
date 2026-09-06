import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

function fail(message) {
  console.error(`HOSTINGER PREFLIGHT ERROR: ${message}`)
  process.exitCode = 1
}

function warn(message) {
  console.warn(`HOSTINGER PREFLIGHT WARNING: ${message}`)
}

const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 22 || nodeMajor >= 25) {
  fail(`Node ${process.versions.node} is outside the supported range ${packageJson.engines?.node || '>=22 <25'}. Use Node 22.x on Hostinger.`)
}

const siteOrigin = process.env.SITE_ORIGIN || 'https://www.css-vista.com'
let parsedOrigin
try {
  parsedOrigin = new URL(siteOrigin)
} catch {
  fail(`SITE_ORIGIN is not a valid URL: ${siteOrigin}`)
}

if (parsedOrigin) {
  if (parsedOrigin.protocol !== 'https:') fail('SITE_ORIGIN must use HTTPS.')
  if (parsedOrigin.hostname !== 'www.css-vista.com') fail('SITE_ORIGIN must be https://www.css-vista.com for production.')
  if (parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) fail('SITE_ORIGIN must be an origin only, without a path, query, or fragment.')
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  fail('VITE_SUPABASE_URL is present but does not look like a Supabase project URL.')
}

if (publishableKey && !publishableKey.startsWith('sb_publishable_')) {
  fail('VITE_SUPABASE_PUBLISHABLE_KEY must be a browser-safe sb_publishable_ key.')
}

for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('VITE_') || !value) continue
  if (value.startsWith('sb_secret_') || /service[_-]?role/i.test(value)) {
    fail(`${name} appears to contain a server secret. VITE_ variables are exposed to the browser.`)
  }
}

if (!supabaseUrl || !publishableKey) {
  warn('Supabase production variables are not present in the build environment. The public site can still build, but account-backed features may run in guest/fallback mode.')
}

const googleAuth = String(process.env.VITE_SUPABASE_GOOGLE_AUTH_ENABLED || 'false').toLowerCase()
if (!['true', 'false'].includes(googleAuth)) fail('VITE_SUPABASE_GOOGLE_AUTH_ENABLED must be true or false.')

console.log('Hostinger preflight passed: Node runtime, canonical origin, and public build-time environment are safe for deployment.')
