import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID,
  canShowAuthenticatedAccountAd,
  getAdRoutePolicy,
  isAdSuppressedState,
  shouldProtectVignetteLink,
} from '../src/lib/ads.ts'
import {
  FUNCTIONAL_NOINDEX_ROUTES,
  INDEXABLE_STATIC_ROUTES,
  ROUTE_REGISTRY,
  getRoutePolicy,
} from '../src/data/routeRegistry.mjs'

test('publisher ID is the verified CSS Vista publisher', () => {
  assert.equal(ADSENSE_PUBLISHER_ID, 'ca-pub-6131271603014611')
  assert.equal(ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID, '1618565899')
  assert.match(ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID, /^\d+$/)
})

test('homepage allows Auto Ads below its protected top while manual units stay disabled', () => {
  const policy = getAdRoutePolicy('/')
  assert.equal(policy.autoAdsEnabled, true)
  assert.equal(policy.manualAdsEnabled, false)
  assert.equal(policy.placementType, 'pre-footer')
  assert.equal(policy.minimumHeight, 0)
})

test('homepage exposes a stable Auto Ads excluded-area boundary around search and hero', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8'))
  const topBoundary = source.indexOf('id="cssv-home-ad-free-top"')
  const hero = source.indexOf('<HomeHero />', topBoundary)
  const lowerContent = source.indexOf('<TimerHub', hero)
  assert.ok(topBoundary >= 0)
  assert.ok(hero > topBoundary)
  assert.ok(lowerContent > hero)
})

// ---------------------------------------------------------------------------
// The five policy dimensions are independent. These tests exist specifically to
// stop "authenticated implies no ads" and "noindex implies no ads" from being
// reintroduced.
// ---------------------------------------------------------------------------

test('advertising is independent of indexability', () => {
  // Indexable public content that deliberately carries no advertising.
  for (const path of ['/privacy-policy', '/cookie-policy', '/terms-and-conditions', '/contact']) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.indexable, true, path)
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, false, path)
  }
  // Noindex public utility pages that remain ad-eligible.
  for (const path of ['/gk', '/one-liner-gk', '/language-grammar', '/css-past-paper-analysis']) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.indexable, false, path)
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, true, path)
  }
})

test('advertising is independent of authentication', () => {
  // Authenticated content pages stay noindex but are ad-eligible by design.
  const authenticatedContent = [
    '/account', '/account/dashboard', '/account/current-affairs', '/account/factbook',
    '/account/saved', '/dashboard', '/factbook', '/exam-intelligence', '/study-planner',
  ]
  for (const path of authenticatedContent) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.access, 'authenticated', path)
    assert.equal(policy.indexable, false, path)
    assert.equal(policy.adMode, 'enabled', path)
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, true, path)
  }
})

test('authentication transactions, admin, assessments and viewers stay ad-free', () => {
  const adFree = [
    '/account/settings', '/account/search', '/admin', '/admin/login',
    '/gk/quiz', '/five-minute', '/daily-challenge', '/mpt/bank/everyday-science',
    '/past-papers/view/css-2026-essay', '/notes/view/political-science/sample',
    '/answer-evaluation', '/live-theme-demos',
    '/css-mcqs', '/test-series', '/answer-timer', '/current-affairs',
    '/legal', '/disclaimer', '/copyright', '/editorial-policy',
    '/not-a-real-route',
  ]
  for (const path of adFree) {
    const policy = getAdRoutePolicy(path)
    assert.equal(policy.autoAdsEnabled, false, path)
    assert.equal(policy.manualAdsEnabled, false, path)
    assert.equal(policy.minimumHeight, 0, path)
  }
})

test('transaction, error and loading states suppress ads on an otherwise eligible route', () => {
  assert.equal(getAdRoutePolicy('/account/dashboard').autoAdsEnabled, true)
  for (const state of [
    { authTransaction: true },
    { sensitiveControlsVisible: true },
    { activeAssessment: true },
    { errorState: true },
    { loadingState: true },
  ]) {
    assert.ok(isAdSuppressedState(state))
    assert.equal(getAdRoutePolicy('/account/dashboard', '', state).autoAdsEnabled, false, JSON.stringify(state))
  }
  assert.equal(isAdSuppressedState({}), null)
})

test('substantial public content is Auto Ads eligible and manual units stay off until audited', () => {
  const eligibleRoutes = [
    '/', '/start-css', '/subjects/compulsory', '/subjects/compulsory/islamic-studies',
    '/subjects/optional', '/notes', '/past-papers', '/past-papers/css/2025',
    '/fpsc-updates', '/fpsc-syllabus', '/mentors', '/about', '/opinions', '/services',
    '/book-summaries',
  ]
  for (const path of eligibleRoutes) {
    const policy = getAdRoutePolicy(path)
    assert.equal(policy.autoAdsEnabled, true, path)
    assert.equal(policy.manualAdsEnabled, false, path)
    assert.equal(policy.minimumHeight, 0, path)
  }
})

test('the unfinished lecture route is noindex and out of the sitemap but remains usable', () => {
  const route = ROUTE_REGISTRY.find((entry) => entry.path === '/lectures')
  assert.ok(route)
  assert.equal(route.indexable, false)
  assert.equal(route.sitemap, false)
  assert.equal(route.robots, 'noindex, follow')
  assert.equal(INDEXABLE_STATIC_ROUTES.some((entry) => entry.path === '/lectures'), false)
  // Being unindexed must never remove it from the site.
  assert.equal(FUNCTIONAL_NOINDEX_ROUTES.some((entry) => entry.path === '/lectures'), true)
})

test('the mixed current-affairs page stays ad-free because it contains an active MCQ state', () => {
  assert.equal(getAdRoutePolicy('/current-affairs', '?tab=mcqs').autoAdsEnabled, false)
  assert.equal(getAdRoutePolicy('/current-affairs', '?tab=magazine').autoAdsEnabled, false)
})

test('vignettes are blocked for protected destinations and sensitive controls', () => {
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/gk/quiz' }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/past-papers' }), false)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/past-papers', download: true }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', external: true }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/notes', destinationPath: '/past-papers', navigationControl: true }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/', destinationPath: '/notes' }), false)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/', destinationPath: '/gk/quiz' }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/answer-timer', destinationPath: '/notes' }), true)
  assert.equal(shouldProtectVignetteLink({ currentPath: '/gk/quiz', destinationPath: '/notes' }), true)
})

test('the signed-in account unit follows the route policy, not the fact of authentication', () => {
  const authenticated = { authenticated: true }
  // Ad-eligible authenticated routes.
  assert.equal(canShowAuthenticatedAccountAd('/account', '', authenticated), true)
  assert.equal(canShowAuthenticatedAccountAd('/account/dashboard', '', authenticated), true)
  assert.equal(canShowAuthenticatedAccountAd('/dashboard', '', authenticated), true)
  // Authenticated routes the owner keeps ad-free.
  assert.equal(canShowAuthenticatedAccountAd('/account/settings', '', authenticated), false)
  assert.equal(canShowAuthenticatedAccountAd('/admin', '', authenticated), false)
  // Public routes never use the authenticated unit.
  assert.equal(canShowAuthenticatedAccountAd('/notes', '', authenticated), false)
  // Unsettled or sensitive states.
  assert.equal(canShowAuthenticatedAccountAd('/account', '', { authenticated: false }), false)
  assert.equal(canShowAuthenticatedAccountAd('/account', '', { authenticated: true, authLoading: true }), false)
  assert.equal(canShowAuthenticatedAccountAd('/account', '?reset=1', authenticated), false)
  assert.equal(canShowAuthenticatedAccountAd('/account', '', { authenticated: true, passwordRecovery: true }), false)
  assert.equal(canShowAuthenticatedAccountAd('/account', '', { authenticated: true, sensitiveControlsVisible: true }), false)
  assert.equal(canShowAuthenticatedAccountAd('/account', '', { authenticated: true, authTransaction: true }), false)
})

test('legacy artificial timing and page-count state is absent', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/lib/ads.ts', import.meta.url), 'utf8'))
  for (const legacy of ['AD_ACTIVE_TIME_MS', 'eligiblePageCount', 'third-page', 'setInterval']) {
    assert.equal(source.includes(legacy), false, legacy)
  }
  const componentSource = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/components/Ads.tsx', import.meta.url), 'utf8'))
  assert.equal(componentSource.includes('dataset.cssVistaAdsense'), false)
})

test('the advertising layer never derives eligibility from indexability or access', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/lib/ads.ts', import.meta.url), 'utf8'))
  const eligibility = source.slice(source.indexOf('export function getAdRoutePolicy'))
  assert.equal(/route\.indexable/.test(eligibility), false, 'ad eligibility must not read route.indexable')
  assert.equal(/route\.robots/.test(eligibility), false, 'ad eligibility must not read route.robots')
  assert.equal(/route\.access\b/.test(eligibility.slice(0, eligibility.indexOf('canShowAuthenticatedAccountAd'))), false)
})

test('privacy and policy pages are discoverable from the global header navigation', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'))
  for (const path of ['/legal', '/privacy-policy', '/cookie-policy', '/terms-and-conditions', '/disclaimer', '/copyright', '/editorial-policy', '/contact']) {
    assert.equal(source.includes(`to: '${path}'`) || source.includes(`to="${path}"`), true, path)
  }
  assert.equal(source.includes("label: 'Policies'"), true)
  assert.equal(source.includes('<ManagedContentAd'), false)
})

test('indexable routes have unique crawlable metadata and unknown paths fail closed', () => {
  assert.ok(ROUTE_REGISTRY.length >= 50)
  assert.equal(new Set(INDEXABLE_STATIC_ROUTES.map((route) => route.path)).size, INDEXABLE_STATIC_ROUTES.length)
  assert.equal(new Set(INDEXABLE_STATIC_ROUTES.map((route) => route.title)).size, INDEXABLE_STATIC_ROUTES.length)
  assert.equal(new Set(INDEXABLE_STATIC_ROUTES.map((route) => route.description)).size, INDEXABLE_STATIC_ROUTES.length)
  for (const route of INDEXABLE_STATIC_ROUTES) {
    assert.match(route.robots, /^index, follow$/)
    assert.equal(route.sitemap, true, route.path)
    assert.ok(route.h1.length > 8)
    assert.ok(route.description.length > 50)
  }
  assert.equal(getAdRoutePolicy('/made-up-page').autoAdsEnabled, false)
})

test('indexability fails closed for every content class that is not publishable', () => {
  for (const route of ROUTE_REGISTRY) {
    if (['interactive', 'utility', 'private', 'incomplete'].includes(route.contentQuality)) {
      assert.equal(route.indexable, false, route.path)
      assert.equal(route.sitemap, false, route.path)
    }
    if (route.access !== 'public') assert.equal(route.indexable, false, route.path)
  }
  const unknown = getRoutePolicy('/totally/made/up')
  assert.deepEqual(
    { known: unknown.known, indexable: unknown.indexable, sitemap: unknown.sitemap, adMode: unknown.adMode },
    { known: false, indexable: false, sitemap: false, adMode: 'disabled' },
  )
})
