/**
 * Route integrity gate for the production build.
 *
 * Every route in the authoritative registry is resolved the way Apache resolves
 * it on Hostinger — the same path a visitor gets by pasting the URL into the
 * address bar or refreshing the page. A route that only works through in-app
 * navigation is treated as broken, because for a visitor it is.
 *
 * Checked for every route: it resolves, it is not silently turned into a 404 or
 * redirected somewhere unrelated, its canonical and robots match the registry,
 * its sitemap membership matches its policy, and a deliberately nonexistent URL
 * still produces a genuine not-found response instead of a homepage soft 404.
 */
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseHtaccess, resolveRequest } from './lib/htaccess-resolver.mjs'
import { loadPastPaperContent } from './lib/past-paper-content.mjs'
import {
  CANONICAL_ORIGIN, ROUTE_REGISTRY, ROUTE_REDIRECTS, findRouteDefinition,
} from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR ? resolve(root, process.env.CSSV_CLIENT_DIR) : join(root, 'dist', 'client')

const rules = parseHtaccess(await readFile(join(clientDir, '.htaccess'), 'utf8'))
const failures = []
const cache = new Map()

async function servedHtml(file) {
  if (!cache.has(file)) cache.set(file, await readFile(join(clientDir, file), 'utf8'))
  return cache.get(file)
}

function meta(html, name) {
  return new RegExp(`<meta name="${name}" content="([^"]*)"`).exec(html)?.[1] ?? null
}

function canonicalOf(html) {
  return /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? null
}

/** Resolve a URL and assert it is a served page rather than an error or redirect. */
async function check(path, expectation) {
  const result = resolveRequest(rules, clientDir, path)
  if (result.status !== 200 || !result.file) {
    failures.push(`${path}: expected a served page, got HTTP ${result.status}${result.redirect ? ` -> ${result.redirect}` : ''}`)
    return null
  }
  const html = await servedHtml(result.file)
  const canonical = canonicalOf(html)
  const robots = meta(html, 'robots')

  if (expectation.canonical && canonical !== expectation.canonical) {
    failures.push(`${path}: canonical is ${canonical}, expected ${expectation.canonical}`)
  }
  if (expectation.indexable === true && !/^index, follow/.test(robots || '')) {
    failures.push(`${path}: indexable route served with robots "${robots}"`)
  }
  if (expectation.indexable === false && !/noindex/.test(robots || '')) {
    failures.push(`${path}: non-indexable route served with robots "${robots}"`)
  }
  return { html, canonical, robots, file: result.file }
}

// --- Registry routes -------------------------------------------------------
// Exact routes must each resolve to their own page with their own canonical.
for (const route of ROUTE_REGISTRY.filter((entry) => entry.match === 'exact')) {
  await check(route.path, {
    canonical: route.indexable ? `${CANONICAL_ORIGIN}${route.path}` : null,
    indexable: route.indexable,
  })
}

// --- Dynamic public families ----------------------------------------------
const paperContent = await loadPastPaperContent(root)
const indexablePapers = paperContent.filter((entry) => entry.indexable)
const documentPapers = paperContent.filter((entry) => !entry.indexable)

for (const entry of [...indexablePapers.slice(0, 20), ...documentPapers.slice(0, 20)]) {
  await check(`/past-papers/view/${entry.paper.id}`, {
    canonical: `${CANONICAL_ORIGIN}/past-papers/view/${entry.paper.id}`,
    indexable: entry.indexable,
  })
}

const collections = new Set(paperContent.map((entry) => `${entry.paper.examination.toLowerCase()}/${entry.paper.year}`))
for (const key of [...collections].slice(0, 20)) {
  await check(`/past-papers/${key}`, { canonical: `${CANONICAL_ORIGIN}/past-papers/${key}`, indexable: true })
}

const books = JSON.parse(await readFile(join(root, 'public', 'book-summaries', 'index.json'), 'utf8'))
for (const book of (books.books ?? []).slice(0, 20)) {
  await check(`/book-summaries/${book.slug}`, { canonical: `${CANONICAL_ORIGIN}/book-summaries/${book.slug}`, indexable: true })
}

// --- Redirects -------------------------------------------------------------
// One hop to the final canonical URL, never a chain and never a loop.
for (const redirect of ROUTE_REDIRECTS) {
  const result = resolveRequest(rules, clientDir, redirect.from)
  if (result.status !== redirect.status) {
    failures.push(`${redirect.from}: expected HTTP ${redirect.status}, got ${result.status}`)
    continue
  }
  const target = new URL(result.redirect, CANONICAL_ORIGIN)
  if (target.pathname !== redirect.to) {
    failures.push(`${redirect.from}: redirects to ${target.pathname}, expected ${redirect.to}`)
    continue
  }
  const second = resolveRequest(rules, clientDir, target.pathname)
  if (second.status !== 200) failures.push(`${redirect.from}: redirect target ${redirect.to} does not resolve (HTTP ${second.status})`)
  if (!findRouteDefinition(redirect.to)) failures.push(`${redirect.from}: redirect target ${redirect.to} is not a known route`)
}

// --- Genuine 404s ----------------------------------------------------------
// An unknown URL must never masquerade as the homepage or inherit its canonical.
const fakeUrls = [
  '/this-page-does-not-exist',
  '/subjects/compulsory/not-a-real-subject',
  '/deeply/nested/made/up/url',
  '/past-papers/view/not-a-real-paper',
  '/book-summaries/not-a-real-book',
  '/gk/cat/not-a-real-category',
]
for (const url of fakeUrls) {
  const result = resolveRequest(rules, clientDir, url)
  if (result.status !== 404) {
    failures.push(`${url}: a nonexistent URL returned HTTP ${result.status} instead of 404`)
    continue
  }
  const html = await servedHtml(result.file ?? '404.html')
  const canonical = canonicalOf(html)
  if (canonical === `${CANONICAL_ORIGIN}/`) failures.push(`${url}: the not-found page inherits the homepage canonical`)
  if (!/noindex/.test(meta(html, 'robots') ?? '')) failures.push(`${url}: the not-found page is not noindex`)
}

// --- Sitemap correspondence ------------------------------------------------
const sitemapUrls = new Set()
for (const name of ['sitemap.xml', 'sitemap-core.xml', 'sitemap-gk.xml', 'sitemap-past-papers.xml', 'sitemap-past-paper-collections.xml']) {
  let xml
  try { xml = await readFile(join(clientDir, name), 'utf8') } catch { continue }
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (match[1].endsWith('.xml')) continue
    sitemapUrls.add(match[1])
  }
}

for (const url of sitemapUrls) {
  const path = new URL(url).pathname
  const result = resolveRequest(rules, clientDir, path)
  if (result.status !== 200 || !result.file) {
    failures.push(`sitemap: ${url} does not resolve (HTTP ${result.status})`)
    continue
  }
  const html = await servedHtml(result.file)
  if (/noindex/.test(meta(html, 'robots') ?? '')) failures.push(`sitemap: ${url} is served noindex`)
  const canonical = canonicalOf(html)
  if (canonical !== url) failures.push(`sitemap: ${url} is not self-canonical (canonical is ${canonical})`)
}

// Routes the registry keeps out of search must not appear in the sitemap.
for (const route of ROUTE_REGISTRY.filter((entry) => entry.match === 'exact' && !entry.sitemap)) {
  if (sitemapUrls.has(`${CANONICAL_ORIGIN}${route.path}`)) {
    failures.push(`sitemap: non-indexable route ${route.path} must not be listed`)
  }
}
for (const entry of documentPapers) {
  if (sitemapUrls.has(`${CANONICAL_ORIGIN}/past-papers/view/${entry.paper.id}`)) {
    failures.push(`sitemap: document-only paper ${entry.paper.id} must not be listed`)
  }
}

if (failures.length) {
  console.error(`Route integrity audit failed with ${failures.length} problem(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(
  `Route integrity verified: ${ROUTE_REGISTRY.filter((r) => r.match === 'exact').length} registry routes, `
  + `${ROUTE_REDIRECTS.length} redirect(s), ${fakeUrls.length} nonexistent URLs return a genuine 404, `
  + `and all ${sitemapUrls.size} sitemap URLs resolve, are indexable and are self-canonical.`,
)
