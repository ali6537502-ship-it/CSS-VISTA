import test from 'node:test'
import assert from 'node:assert/strict'
import { ADSENSE_PUBLISHER_ID, getAdRoutePolicy, shouldProtectVignetteLink } from '../src/lib/ads.ts'
import { INDEXABLE_STATIC_ROUTES, ROUTE_REGISTRY } from '../src/data/routeRegistry.mjs'

test('publisher ID is the verified CSS Vista publisher', () => {
  assert.equal(ADSENSE_PUBLISHER_ID, 'ca-pub-6131271603014611')
})

test('homepage is completely ad-free while ownership remains verifiable by meta tag and ads.txt', () => {
  const policy = getAdRoutePolicy('/')
  assert.equal(policy.autoAdsEnabled, false)
  assert.equal(policy.manualAdsEnabled, false)
  assert.equal(policy.placementType, 'pre-footer')
  assert.equal(policy.minimumHeight, 0)
})

test('private, legal, viewer and active question routes are ad-free', () => {
  const protectedRoutes = [
    '/mpt', '/mpt/bank/everyday-science', '/gk', '/gk/cat/islamic-general-knowledge',
    '/gk/quiz', '/five-minute', '/daily-challenge', '/css-mcqs', '/test-series',
    '/past-papers/view/css-2026-essay', '/notes/view/political-science/sample',
    '/account', '/dashboard', '/study-planner', '/factbook', '/admin', '/privacy',
    '/mentors', '/handwritten-notes', '/lectures', '/not-a-real-route',
  ]
  for (const path of protectedRoutes) {
    const policy = getAdRoutePolicy(path)
    assert.equal(policy.autoAdsEnabled, false, path)
    assert.equal(policy.manualAdsEnabled, false, path)
    assert.equal(policy.minimumHeight, 0, path)
  }
})

test('only substantial public content is fully monetization eligible', () => {
  const eligibleRoutes = [
    '/start-css', '/subjects/compulsory', '/subjects/compulsory/islamic-studies',
    '/subjects/optional', '/notes', '/past-papers', '/past-papers/css/2025',
    '/current-affairs', '/fpsc-updates', '/fpsc-syllabus', '/book-summaries',
    '/one-liner-gk', '/css-past-paper-analysis', '/opinions',
  ]
  for (const path of eligibleRoutes) {
    const policy = getAdRoutePolicy(path)
    assert.equal(policy.autoAdsEnabled, true, path)
    assert.equal(policy.manualAdsEnabled, true, path)
    assert.ok(policy.minimumHeight >= 250, path)
  }
})

test('unfinished lecture placeholder is noindex, ad-free and absent from static sitemap routes', () => {
  const route = ROUTE_REGISTRY.find((entry) => entry.path === '/lectures')
  assert.ok(route)
  assert.equal(route.indexable, false)
  assert.equal(route.robots, 'noindex, follow')
  assert.equal(route.adMode, 'none')
  assert.equal(INDEXABLE_STATIC_ROUTES.some((entry) => entry.path === '/lectures'), false)
})

test('current-affairs MCQ state is protected while informational content remains eligible', () => {
  assert.equal(getAdRoutePolicy('/current-affairs', '?tab=mcqs').autoAdsEnabled, false)
  assert.equal(getAdRoutePolicy('/current-affairs', '?tab=magazine').autoAdsEnabled, true)
})

test('vignettes are blocked for protected destinations and sensitive controls', () => {
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/gk/quiz' }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/past-papers' }), false)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/past-papers', download: true }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', external: true }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/past-papers', navigationControl: true }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/', destinationPath: '/notes' }), true)
})

test('legacy artificial timing and page-count state is absent', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/lib/ads.ts', import.meta.url), 'utf8'))
  for (const legacy of ['AD_ACTIVE_TIME_MS', 'eligiblePageCount', 'third-page', 'setInterval']) {
    assert.equal(source.includes(legacy), false, legacy)
  }
  const componentSource = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/components/Ads.tsx', import.meta.url), 'utf8'))
  assert.equal(componentSource.includes('dataset.cssVistaAdsense'), false)
})

test('indexable routes have unique crawlable metadata and unknown paths fail closed', () => {
  assert.ok(ROUTE_REGISTRY.length >= 50)
  assert.equal(new Set(INDEXABLE_STATIC_ROUTES.map((route) => route.path)).size, INDEXABLE_STATIC_ROUTES.length)
  assert.equal(new Set(INDEXABLE_STATIC_ROUTES.map((route) => route.title)).size, INDEXABLE_STATIC_ROUTES.length)
  assert.equal(new Set(INDEXABLE_STATIC_ROUTES.map((route) => route.description)).size, INDEXABLE_STATIC_ROUTES.length)
  for (const route of INDEXABLE_STATIC_ROUTES) {
    assert.match(route.robots, /^index, follow$/)
    assert.ok(route.h1.length > 8)
    assert.ok(route.description.length > 50)
  }
  assert.equal(getAdRoutePolicy('/made-up-page').autoAdsEnabled, false)
})
