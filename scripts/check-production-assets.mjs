import { readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const publicDir = join(root, 'public')
const siteOrigin = process.env.SITE_ORIGIN || 'https://www.css-vista.com'
const origin = new URL(siteOrigin)
if (origin.protocol !== 'https:' || origin.pathname !== '/') {
  throw new Error(`SITE_ORIGIN must be an HTTPS origin: ${siteOrigin}`)
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  }))).flat()
}

async function checkAsset(path, expectedType) {
  const url = new URL(path, origin)
  let lastFailure = ''
  for (let attempt = 0; attempt < 3; attempt += 1) {
    url.searchParams.set('deployment-audit', `${Date.now().toString(36)}-${attempt}`)
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      })
      const contentType = response.headers.get('content-type') || ''
      if (response.ok && contentType.toLowerCase().includes(expectedType)) return null
      lastFailure = `HTTP ${response.status}, content-type ${contentType || 'missing'}`
      if (response.status !== 429 && response.status < 500) break
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }
  return `${path}: ${lastFailure}`
}

async function checkInParallel(entries, concurrency = 8) {
  const failures = []
  let cursor = 0
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < entries.length) {
      const entry = entries[cursor]
      cursor += 1
      const failure = await checkAsset(entry.path, entry.expectedType)
      if (failure) failures.push(failure)
    }
  }))
  return failures
}

const papers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const jsonPaths = (await walk(publicDir))
  .filter((path) => path.toLowerCase().endsWith('.json'))
  .map((path) => `/${relative(publicDir, path).split(sep).join('/')}`)

const entries = [
  ...papers.map((paper) => ({ path: paper.fileUrl, expectedType: 'application/pdf' })),
  ...jsonPaths.map((path) => ({ path, expectedType: 'application/json' })),
]
const failures = await checkInParallel(entries)

const [adsResponse, verificationResponse, homeResponse, productionEnv] = await Promise.all([
  fetch(new URL('/ads.txt', origin), { signal: AbortSignal.timeout(20_000) }),
  fetch(new URL('/googlec96e2248070e0570.html', origin), { signal: AbortSignal.timeout(20_000) }),
  fetch(origin, { signal: AbortSignal.timeout(20_000) }),
  readFile(join(root, '.env.production'), 'utf8'),
])
const [adsTxt, verification, homeHtml] = await Promise.all([
  adsResponse.text(),
  verificationResponse.text(),
  homeResponse.text(),
])

if (adsTxt.trim() !== 'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0') {
  failures.push('/ads.txt: publisher record is missing or malformed')
}
if (verification.trim() !== 'google-site-verification: googlec96e2248070e0570.html') {
  failures.push('/googlec96e2248070e0570.html: verification response is missing or malformed')
}

const supabaseUrl = productionEnv.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1].trim()
const entryScripts = [...homeHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1])
const entrySources = await Promise.all(entryScripts.map(async (path) => (
  await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20_000) })
).text()))
if (!supabaseUrl || !entrySources.some((source) => source.includes(supabaseUrl))) {
  failures.push('/: deployed JavaScript is missing the configured Supabase project URL')
}

for (const route of ['/book-summaries', '/books', '/language-grammar', '/one-liner-gk', '/opinions', '/past-papers']) {
  const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(20_000) })
  const contentType = response.headers.get('content-type') || ''
  const body = await response.text()
  if (!response.ok || !contentType.includes('text/html') || !body.includes('<div id="root">')) {
    failures.push(`${route}: SPA route is unavailable (HTTP ${response.status}, content-type ${contentType || 'missing'})`)
  }
}

if (failures.length > 0) {
  console.error(`Production asset audit failed with ${failures.length} error(s):`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Production asset audit passed: ${papers.length} registered PDFs, ${jsonPaths.length} JSON files, Supabase, ads.txt and Search Console verification are live.`)
}
