/**
 * Production route regression tests.
 *
 * These run against the GENERATED production output in `dist/`, resolved the
 * way Apache resolves a request on Hostinger. They therefore test direct URL
 * navigation and refresh behaviour, not in-app navigation: a route that only
 * works after the SPA has booted fails here, which is the point.
 *
 * Run `npm run build:hostinger` first. The suite skips itself when there is no
 * build to inspect so it never reports a false pass.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseHtaccess, resolveRequest } from '../scripts/lib/htaccess-resolver.mjs'
import {
  CANONICAL_ORIGIN, ROUTE_REDIRECTS, findRouteDefinition, getRoutePolicy,
} from '../src/data/routeRegistry.mjs'
import { getAdRoutePolicy } from '../src/lib/ads.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const built = existsSync(join(dist, '.htaccess')) && existsSync(join(dist, 'index.html'))

const rules = built ? parseHtaccess(readFileSync(join(dist, '.htaccess'), 'utf8')) : []

function request(path: string) {
  return resolveRequest(rules, dist, path)
}

function served(path: string) {
  const result = request(path)
  assert.equal(result.status, 200, `${path} returned HTTP ${result.status}`)
  assert.ok(result.file, `${path} resolved to no file`)
  return readFileSync(join(dist, result.file as string), 'utf8')
}

function metaRobots(html: string) {
  return /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? ''
}

function canonicalOf(html: string) {
  return /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? null
}

/**
 * The page's own primary content. The layout keeps the announcement ticker,
 * header and footer outside `<main>`, so measuring `<main>` is what stops ~390
 * words of shared chrome from satisfying these assertions on an empty page.
 */
function text(html: string) {
  const mains = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map((match) => match[1])
  return (mains.length ? mains.join(' ') : html)
    .replace(/<(script|style|svg)[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const sitemapUrls = new Set<string>()
if (built) {
  for (const name of readdirSync(dist).filter((file) => /^sitemap.*\.xml$/.test(file))) {
    for (const match of readFileSync(join(dist, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      if (!match[1].endsWith('.xml')) sitemapUrls.add(match[1])
    }
  }
}

/** Indexable routes: real content, self-canonical, indexable robots, in sitemap. */
const INDEXABLE = [
  '/', '/start-css', '/subjects/compulsory', '/subjects/compulsory/essay',
  '/subjects/compulsory/pakistan-affairs', '/subjects/compulsory/islamic-studies',
  '/subjects/optional', '/fpsc-syllabus', '/past-papers', '/notes', '/essay', '/mpt',
  '/mentors', '/services', '/analysis', '/psych-viva', '/fpsc-updates',
  '/handwritten-notes', '/books', '/journal', '/consultation',
  '/about', '/privacy-policy', '/terms-and-conditions', '/cookie-policy',
  '/copyright', '/editorial-policy', '/contact', '/disclaimer',
  '/book-summaries',
]

/** Routes deliberately kept out of search that must still be fully served. */
const FUNCTIONAL_NOINDEX = [
  '/legal', '/gk', '/one-liner-gk', '/language-grammar',
  '/css-mcqs', '/css-past-paper-analysis', '/current-affairs', '/daily-briefing', '/vistagram',
  '/subjects/selector', '/answer-writing', '/test-series', '/study-tools',
  '/games', '/grammar-vocabulary', '/answer-timer', '/lectures',
  '/account', '/account/dashboard', '/account/vistagram', '/account/settings', '/dashboard',
  '/factbook', '/exam-intelligence', '/study-planner', '/sadiaali', '/sadiaali/login',
]

test('the production build exists', { skip: built ? false : 'run npm run build:hostinger first' }, () => {
  assert.ok(built)
})

test('indexable routes are served with real content, self-canonical and indexable robots', { skip: !built }, () => {
  for (const path of INDEXABLE) {
    const route = findRouteDefinition(path)
    assert.ok(route, `${path} is not in the route registry`)
    assert.equal(route.indexable, true, `${path} should be indexable`)

    const html = served(path)
    assert.match(metaRobots(html), /^index, follow/, path)
    assert.equal(canonicalOf(html), `${CANONICAL_ORIGIN}${path}`, `${path} canonical`)
    assert.ok(sitemapUrls.has(`${CANONICAL_ORIGIN}${path}`), `${path} missing from sitemap`)

    const body = text(html)
    assert.ok(body.split(/\s+/).length > 120, `${path} has too little rendered content`)
    assert.ok(/<h1\b/.test(html), `${path} has no H1`)
    // The retired generic SEO templates must never come back.
    assert.equal(/Use .* as the main entry point/.test(body), false, `${path} contains retired template copy`)
    assert.equal(/What you can do here/.test(body), false, `${path} contains retired template copy`)
    assert.equal(/\b(Loading|under construction|coming soon)\b/i.test(body), false, `${path} shows a placeholder state`)
  }
})

test('the book-summary hub lists its real catalogue, not a loading shell', { skip: !built }, () => {
  const html = served('/book-summaries')
  const body = text(html)
  assert.ok(body.split(/\s+/).length > 2000, 'the hub should render the whole shelf')
  const links = new Set([...html.matchAll(/href="\/book-summaries\/([a-z0-9-]+)"/g)].map((m) => m[1]))
  assert.ok(links.size >= 100, `expected every book linked from the hub, found ${links.size}`)
  // Every book it links to must itself be a served, indexable page.
  for (const slug of [...links].slice(0, 10)) {
    assert.match(metaRobots(served(`/book-summaries/${slug}`)), /^index, follow/, slug)
  }
})

test('noindex routes remain fully served and stay out of the sitemap', { skip: !built }, () => {
  for (const path of FUNCTIONAL_NOINDEX) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.indexable, false, path)
    assert.equal(policy.sitemap, false, path)

    // Being unindexed must never make a page unreachable.
    const result = request(path)
    assert.equal(result.status, 200, `${path} returned HTTP ${result.status}`)
    assert.match(metaRobots(readFileSync(join(dist, result.file as string), 'utf8')), /noindex/, path)
    assert.equal(sitemapUrls.has(`${CANONICAL_ORIGIN}${path}`), false, `${path} leaked into the sitemap`)
  }
})

test('past-paper pages are served, and indexed only when real questions exist', { skip: !built }, () => {
  const paperUrls = [...sitemapUrls].filter((url) => url.includes('/past-papers/view/'))
  assert.ok(paperUrls.length > 100, 'expected many indexable paper pages')
  for (const url of paperUrls.slice(0, 15)) {
    const path = new URL(url).pathname
    const html = served(path)
    assert.match(metaRobots(html), /^index, follow/, path)
    assert.equal(canonicalOf(html), url, path)
    assert.match(html, /Questions recorded from this paper/, `${path} is indexed without recorded questions`)
  }

  // Document-only papers stay served and downloadable, but are not indexed.
  const documentPages = readdirSync(join(dist, 'seo', 'past-papers'))
    .filter((file) => {
      const html = readFileSync(join(dist, 'seo', 'past-papers', file), 'utf8')
      return /noindex/.test(metaRobots(html))
    })
    .slice(0, 10)
  assert.ok(documentPages.length > 0, 'expected document-only paper pages')
  for (const file of documentPages) {
    const path = `/past-papers/view/${file.replace(/\.html$/, '')}`
    const html = served(path)
    assert.match(metaRobots(html), /noindex/, path)
    assert.equal(sitemapUrls.has(`${CANONICAL_ORIGIN}${path}`), false, path)
    assert.match(html, /Open PDF/, `${path} lost its document access`)
  }
})

test('year archives, GK categories and book summaries resolve on direct navigation', { skip: !built }, () => {
  const families = [
    [...sitemapUrls].filter((url) => /\/past-papers\/(css|pms|ppsc|mpt)\/\d{4}$/.test(url)),
    [...sitemapUrls].filter((url) => url.includes('/gk/cat/')),
    [...sitemapUrls].filter((url) => /\/book-summaries\/[^/]+$/.test(url)),
  ]
  for (const family of families) {
    assert.ok(family.length > 0, 'expected URLs in this family')
    for (const url of family.slice(0, 8)) {
      const path = new URL(url).pathname
      const html = served(path)
      assert.equal(canonicalOf(html), url, path)
      assert.match(metaRobots(html), /^index, follow/, path)
      assert.ok(text(html).split(/\s+/).length > 120, `${path} has too little content`)
    }
  }
})

test('legacy paths redirect once, to a real destination, without looping', { skip: !built }, () => {
  for (const redirect of ROUTE_REDIRECTS) {
    const first = request(redirect.from)
    assert.equal(first.status, redirect.status, redirect.from)
    const target = new URL(first.redirect as string, CANONICAL_ORIGIN)
    assert.equal(target.pathname, redirect.to, redirect.from)

    const second = request(target.pathname)
    assert.equal(second.status, 200, `${redirect.to} does not resolve`)
    assert.notEqual(target.pathname, redirect.from, 'redirect loops onto itself')
  }
})

test('a nonexistent URL returns a genuine 404 and never a homepage soft 404', { skip: !built }, () => {
  for (const path of [
    '/this-page-does-not-exist',
    '/deeply/nested/made/up/url',
    '/subjects/compulsory/not-a-real-subject',
    '/past-papers/view/not-a-real-paper',
    '/book-summaries/not-a-real-book',
  ]) {
    const result = request(path)
    assert.equal(result.status, 404, path)
    const html = readFileSync(join(dist, result.file as string), 'utf8')
    assert.match(metaRobots(html), /noindex/, path)
    assert.equal(canonicalOf(html), null, `${path} must not claim a canonical`)
    assert.equal(sitemapUrls.has(`${CANONICAL_ORIGIN}${path}`), false, path)
    assert.match(html, /Page not found/, path)
  }
})

test('advertising state matches route policy across all nine page categories', { skip: !built }, () => {
  const expectations: [string, boolean][] = [
    ['/', true],                     // 1. indexed public content
    ['/notes', true],
    ['/gk', true],                   // 2. noindex public utility, still ad-eligible
    ['/book-summaries', true],
    ['/account/dashboard', true],    // 3. authenticated content
    ['/factbook', true],
    ['/account/settings', false],    // 4. authentication / sensitive transaction
    ['/sadiaali', false],            // 5. admin
    ['/gk/quiz', false],             // 7. interactive question / test state
    ['/five-minute', false],
    ['/privacy-policy', false],      // 9. legal
    ['/not-a-real-route', false],    // 6. error / unknown
  ]
  for (const [path, eligible] of expectations) {
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, eligible, path)
  }
  // 8. loading state, on an otherwise eligible route.
  assert.equal(getAdRoutePolicy('/notes', '', { loadingState: true }).autoAdsEnabled, false)
})

test('AdSense ownership, ads.txt and the publisher ID are intact in the build', { skip: !built }, () => {
  assert.equal(
    readFileSync(join(dist, 'ads.txt'), 'utf8').trim(),
    'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0',
  )
  const index = readFileSync(join(dist, 'index.html'), 'utf8')
  assert.match(index, /<meta name="google-adsense-account" content="ca-pub-6131271603014611"/)
  assert.equal(
    readFileSync(join(dist, 'googlec96e2248070e0570.html'), 'utf8').trim(),
    'google-site-verification: googlec96e2248070e0570.html',
  )
})

test('every sitemap URL resolves, is indexable and is self-canonical', { skip: !built }, () => {
  assert.ok(sitemapUrls.size > 400, `expected a populated sitemap, found ${sitemapUrls.size}`)
  for (const url of sitemapUrls) {
    const path = new URL(url).pathname
    const result = request(path)
    assert.equal(result.status, 200, `${url} returned HTTP ${result.status}`)
    const html = readFileSync(join(dist, result.file as string), 'utf8')
    assert.equal(/noindex/.test(metaRobots(html)), false, `${url} is served noindex`)
    assert.equal(canonicalOf(html), url, `${url} is not self-canonical`)
  }
})
