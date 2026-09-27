import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID,
  canShowAuthenticatedAccountAd,
  deriveAdPageState,
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

test('the official AdSense loader is present once in the initial document head', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../index.html', import.meta.url), 'utf8'))
  const loader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6131271603014611'
  assert.equal(source.split(loader).length - 1, 1)
  assert.match(
    source,
    /<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-6131271603014611"\s+crossorigin="anonymous"\s*><\/script>/,
  )
  assert.ok(source.indexOf(loader) < source.indexOf('</head>'))
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
// Indexability and advertising remain separate decisions, but the monetisation
// boundary deliberately fails closed on non-substantial and private surfaces.
// ---------------------------------------------------------------------------

test('advertising is independent of indexability while thin surfaces fail closed', () => {
  // Indexable public content that deliberately carries no advertising.
  for (const path of ['/privacy-policy', '/cookie-policy', '/terms-and-conditions', '/contact']) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.indexable, true, path)
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, false, path)
  }
  // Noindex public utility pages stay usable but are not review surfaces.
  for (const path of ['/gk', '/one-liner-gk', '/language-grammar', '/css-past-paper-analysis']) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.indexable, false, path)
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, false, path)
  }
})

test('private account routes remain noindex and never enable Auto Ads', () => {
  const manualOverviewPages = [
    '/account', '/account/dashboard', '/account/tasks', '/account/progress',
    '/account/english', '/account/library', '/account/mpt', '/account/mpt/history',
    '/account/mpt/performance',
  ]
  for (const path of manualOverviewPages) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.access, 'authenticated', path)
    assert.equal(policy.indexable, false, path)
    assert.equal(policy.adMode, 'manual', path)
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, false, path)
    assert.equal(getAdRoutePolicy(path).manualAdsEnabled, true, path)
  }
  for (const path of ['/account/current-affairs', '/account/factbook', '/account/saved', '/dashboard', '/factbook', '/exam-intelligence', '/study-planner']) {
    assert.equal(getAdRoutePolicy(path).autoAdsEnabled, false, path)
    assert.equal(getAdRoutePolicy(path).manualAdsEnabled, false, path)
  }
})

test('MPT overview permits one manual unit while every active assessment stays ad-free', () => {
  const overview = getAdRoutePolicy('/mpt')
  assert.equal(overview.autoAdsEnabled, false)
  assert.equal(overview.manualAdsEnabled, true)
  assert.equal(overview.minimumHeight, 250)

  const active = getAdRoutePolicy('/mpt', '', { activeAssessment: true })
  assert.equal(active.autoAdsEnabled, false)
  assert.equal(active.manualAdsEnabled, false)
  assert.equal(active.minimumHeight, 0)

  for (const path of ['/mpt/bank/everyday-science', '/account/mpt/entrance', '/account/mpt/exam/mock-1', '/account/mpt/results/mock-1']) {
    const policy = getAdRoutePolicy(path)
    assert.equal(policy.autoAdsEnabled, false, path)
    assert.equal(policy.manualAdsEnabled, false, path)
  }
})

test('only substantial publisher content can opt into advertising', () => {
  for (const route of ROUTE_REGISTRY) {
    if (route.adMode === 'enabled') {
      assert.equal(route.access, 'public', route.path)
      assert.equal(route.contentQuality, 'substantial', route.path)
    }
    if (['utility', 'interactive', 'private', 'incomplete', 'legal', 'document'].includes(route.contentQuality)) {
      assert.notEqual(route.adMode, 'enabled', route.path)
    }
  }
})

test('authentication transactions, admin, assessments and viewers stay ad-free', () => {
  const adFree = [
    '/account/settings', '/account/search', '/sadiaali', '/sadiaali/login',
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
  assert.equal(getAdRoutePolicy('/notes').autoAdsEnabled, true)
  for (const state of [
    { authTransaction: true },
    { sensitiveControlsVisible: true },
    { activeAssessment: true },
    { errorState: true },
    { loadingState: true },
  ]) {
    assert.ok(isAdSuppressedState(state))
    assert.equal(getAdRoutePolicy('/notes', '', state).autoAdsEnabled, false, JSON.stringify(state))
  }
  assert.equal(isAdSuppressedState({}), null)
})

test('substantial public content is Auto Ads eligible and manual units stay off until audited', () => {
  const eligibleRoutes = [
    '/', '/start-css', '/subjects/compulsory', '/subjects/compulsory/islamic-studies',
    '/subjects/optional', '/notes', '/past-papers', '/past-papers/css/2025',
    '/fpsc-updates', '/fpsc-syllabus', '/mentors', '/journal', '/services',
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

test('the signed-in account unit renders only on audited manual overview routes', () => {
  const authenticated = { authenticated: true }
  assert.equal(canShowAuthenticatedAccountAd('/account', '', authenticated), true)
  assert.equal(canShowAuthenticatedAccountAd('/account/dashboard', '', authenticated), true)
  assert.equal(canShowAuthenticatedAccountAd('/account/mpt', '', authenticated), true)
  assert.equal(canShowAuthenticatedAccountAd('/dashboard', '', authenticated), false)
  assert.equal(canShowAuthenticatedAccountAd('/account/settings', '', authenticated), false)
  assert.equal(canShowAuthenticatedAccountAd('/sadiaali', '', authenticated), false)
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

test('the advertising layer never derives eligibility from indexability', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/lib/ads.ts', import.meta.url), 'utf8'))
  const eligibility = source.slice(source.indexOf('export function getAdRoutePolicy'))
  assert.equal(/route\.indexable/.test(eligibility), false, 'ad eligibility must not read route.indexable')
  assert.equal(/route\.robots/.test(eligibility), false, 'ad eligibility must not read route.robots')
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

// ---------------------------------------------------------------------------
// The provider derives its page state from this function, so these assertions
// cover what production actually does rather than a copy of the logic.
// ---------------------------------------------------------------------------

/** Auto Ads eligibility exactly as AdSenseProvider computes it. */
function autoAdsFor(pathname: string, search: string, session: {
  user?: unknown
  loading?: boolean
  passwordRecovery?: boolean
}) {
  const state = deriveAdPageState({ pathname, search, user: session.user ?? null, ...session })
  return getAdRoutePolicy(pathname, search, state).autoAdsEnabled
}

test('Auto Ads never load over a sign-in, registration or password form', () => {
  const signedOut = { user: null }
  const signedIn = { user: { id: 'student' } }

  // The account route hosts both the credential form and the signed-in
  // overview. Signed out it is a transaction and must carry no advertising.
  assert.equal(autoAdsFor('/account', '', signedOut), false)
  assert.equal(autoAdsFor('/account', '', { ...signedIn, passwordRecovery: true }), false)
  assert.equal(autoAdsFor('/account', '?reset=1', signedIn), false)
  assert.equal(autoAdsFor('/account', '', { ...signedOut, loading: true }), false)
  assert.equal(autoAdsFor('/account', '', signedIn), false)

  // Every other authenticated route behaves the same way.
  for (const path of ['/account/dashboard', '/dashboard', '/factbook', '/exam-intelligence']) {
    assert.equal(autoAdsFor(path, '', signedOut), false, `${path} signed out`)
    assert.equal(autoAdsFor(path, '', signedIn), false, `${path} signed in`)
  }

  // Admin stays ad-free in every state.
  for (const session of [signedOut, signedIn]) {
    assert.equal(autoAdsFor('/sadiaali', '', session), false)
    assert.equal(autoAdsFor('/sadiaali/login', '', session), false)
  }

  // Public content is unaffected by whether anyone is signed in.
  for (const session of [signedOut, signedIn]) {
    assert.equal(autoAdsFor('/notes', '', session), true)
    assert.equal(autoAdsFor('/privacy-policy', '', session), false)
  }
})

test('the provider supplies the page state, so suppression is not inert', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/components/Ads.tsx', import.meta.url), 'utf8'))
  const provider = source.slice(source.indexOf('export function AdSenseProvider'))
  assert.ok(provider.includes('deriveAdPageState('), 'AdSenseProvider must derive the live page state')
  assert.ok(
    /getAdRoutePolicy\(\s*location\.pathname,\s*location\.search,\s*pageState/.test(provider),
    'AdSenseProvider must pass the page state into the policy',
  )
})
