/** Read-only, public-page browser regression checks against a Hostinger artifact.
 * Run: npm ci --prefix tests/browser --ignore-scripts
 *      CSSV_BROWSER_EXECUTABLE=/usr/bin/chromium node tests/browser/seo-readiness.mjs
 * No PHP, account login, saved progress or backend mutation is used.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startArtifactPreview } from './artifact-preview.mjs'

const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const docRoot = resolve(root, process.env.CSSV_SEO_ARTIFACT || 'dist')
const { server, origin } = await startArtifactPreview(docRoot)
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const report = { observedAt: new Date().toISOString(), artifact: docRoot, method: 'Loopback resolver preview; desktop/mobile lab browser checks, no account data or backend writes.', pages: [] }
const paths = [
  '/',
  '/study-material/optional/accounting-and-auditing/paper-i-financial-accounting-50-marks',
  '/study-material/islamic-studies/introduction-to-islam/01-concept-of-islam-submission-faith-and-excellence',
  '/book-summaries/why-nations-fail',
  '/book-summaries/the-art-of-war', '/book-summaries/on-war', '/journal',
  '/book-summaries/capitalism-and-freedom', '/book-summaries/the-road-to-serfdom',
  '/book-summaries/the-better-angels-of-our-nature', '/book-summaries/brave-new-world',
  '/book-summaries/capital-in-the-twenty-first-century', '/book-summaries/pakistan-beyond-the-crisis-state',
  '/book-summaries/development-as-freedom', '/book-summaries/the-open-society-and-its-enemies',
  '/study-material/optional/constitutional-law/constitutional-history-of-pakistan',
  '/study-material/optional/constitutional-law/judiciary-judicial-independence-and-judicial-review',
  '/css-2026-written-result',
  '/past-papers/ppsc/2024', '/past-papers/css/2025',
  '/subjects/selector', '/css-eligibility-calculator', '/grammar-course',
  '/vistagram/pakistan-financial-inclusion-digital-finance',
  '/vistagram/seo-audit-deliberately-missing-20261014',
  '/seo-audit-deliberately-missing-20261014',
]
function schemaTypes(schemas) {
  return schemas.flatMap(schema => [...(Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']]), ...schemaTypes(schema['@graph'] || [])]).filter(Boolean)
}
try {
  for (const path of paths) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    // All dependencies in this smoke test must come from the local artifact.
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url())
      if (request.method() !== 'GET' || url.origin !== origin || url.pathname.startsWith('/api/')) return route.abort('blockedbyclient')
      return route.continue()
    })
    const page = await context.newPage(), errors = [], studyMetadataRequests = []
    page.on('request', (request) => { if (/\/studyMaterialMeta-[^/]+\.js/.test(request.url())) studyMetadataRequests.push(new URL(request.url()).pathname) })
    page.on('pageerror', error => errors.push(error.message))
    const response = await page.goto(origin + path, { waitUntil: 'networkidle' })
    const rawHTML = await response.text()
    await page.locator('main').first().waitFor()
    // Lazy route chunks can settle after network-idle while React transitions.
    await page.locator('h1').first().waitFor({ timeout: 15000 })
    await page.evaluate(() => document.fonts.ready)
    const state = await page.evaluate(() => ({
      title: document.title,
      canonical: [...document.querySelectorAll('link[rel=canonical]')].map(node => node.href),
      robots: [...document.querySelectorAll('meta[name=robots]')].map(node => node.content),
      h1: [...document.querySelectorAll('h1')].map(node => node.textContent.trim()),
      mainCharacters: document.querySelector('main').innerText.length,
      schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)),
      adLoaders: [...document.scripts].filter(node => /adsbygoogle/.test(node.src)).length,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }))
    const record = { path, status: response.status(), rawHTMLCharacters: rawHTML.length, ...state, errors }
    report.pages.push(record)
    assert.deepEqual(errors, [], `${path}: JavaScript errors`)
    const missing = path.includes('deliberately-missing')
    assert.equal(record.status, missing ? 404 : 200, `${path}: HTTP status`)
    assert.equal(state.overflow, false, `${path}: mobile overflow`)
    if (missing) {
      assert.ok(state.robots.some(value => value.includes('noindex')), 'Missing route must stay noindex')
      assert.equal(state.adLoaders, 0, 'Missing route must not load ads')
      assert.deepEqual(state.canonical, [], 'Missing route must not claim an article canonical after rendering')
    } else {
      assert.deepEqual(state.canonical, [`https://www.css-vista.com${path === '/' ? '/' : path}`], `${path}: canonical after rendering`)
      assert.ok(state.h1.length, `${path}: meaningful heading`)
    }
    if (/^\/past-papers\/(?:css|ppsc)\/\d{4}$/.test(path)) {
      assert.equal(new URL(page.url()).search, '', `${path}: defaults stay in the pathname`)
      assert.ok(state.robots.every(value => !/noindex/i.test(value)), `${path}: canonical collection stays indexable after rendering`)
      await page.getByRole('textbox', { name: 'Search past papers', exact: true }).fill('english')
      await page.waitForURL('**/*search=english*')
      await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'))
      assert.equal(new URL(page.url()).searchParams.get('exam'), null)
      assert.equal(new URL(page.url()).searchParams.get('year'), null)
    }
    if (path.includes('/study-material/') && path.split('/').length > 4) {
      const types = schemaTypes(state.schemas)
      assert.ok(types.includes('Article') && types.includes('BreadcrumbList'), `${path}: preserve substantive article/breadcrumb schema after rendering`)
    }
    if (path.startsWith('/study-material/optional/') && path.split('/').length > 4) {
      await page.locator('main article h2').first().waitFor()
      assert.equal(await page.locator('[data-cssv-ad-state="error"]').count(), 0, 'Actual optional notes load beyond the heading and skeleton')
    }
    if (['/subjects/selector', '/css-eligibility-calculator', '/grammar-course'].includes(path)) {
      assert.equal(state.adLoaders, 0, `${path}: focused learning remains ad-free`)
    }
    if (path === '/vistagram/pakistan-financial-inclusion-digital-finance') {
      assert.ok(state.robots.some(value => value.includes('noindex')), 'Vistagram publication/indexing hold remains in effect')
      assert.equal(state.adLoaders, 0, 'Vistagram remains ad-free')
      assert.ok(schemaTypes(state.schemas).includes('Article'), 'Vistagram preserves article schema')
      assert.ok(await page.getByRole('heading', { name: 'What financial inclusion means', exact: true }).count(), 'Full Vistagram article body is present')
    }
    if (path.startsWith('/book-summaries/')) {
      const reader = page.locator('.book-summary-reading-copy')
      await reader.getByRole('region', { name: 'Sources and quotation notes' }).waitFor()
      const text = await reader.innerText()
      record.quotationSourceLinks = await reader.locator('a[href^="https://"]').count()
      if (path.endsWith('/why-nations-fail')) {
        assert.ok(rawHTML.includes('Study-note wording (edition unverified)'), 'Unverified quotation is qualified in HTTP HTML')
        assert.ok(text.includes('have not yet been verified'), 'The real reader preserves the quotation qualification')
      } else if (path.endsWith('/the-art-of-war')) {
        assert.ok(rawHTML.includes('Lionel Giles') && text.includes('Lionel Giles'), 'Both renderings identify the actual translation')
        assert.ok(await reader.locator('a[href*="gutenberg.org"]').count(), 'Original text citation is a usable HTML link')
      } else if (path.endsWith('/on-war')) {
        assert.ok(rawHTML.includes('War is a mere continuation of policy by other means.'), 'Static page uses the attributed Graham wording')
        assert.ok(text.includes('War is a mere continuation of policy by other means.') && text.includes('Graham translation'), 'Real reader uses the same explicit translation')
      } else if (path.endsWith('/capitalism-and-freedom')) {
        assert.ok(rawHTML.includes('press.uchicago.edu'), 'The newly verified publisher record is in the HTTP response')
        assert.ok(await reader.locator('a[href*="press.uchicago.edu"]').count(), 'The real reader exposes the publisher record')
        assert.ok(text.includes('have not yet been verified'), 'Verified book identity does not silently certify the quotation')
      } else if (['/the-better-angels-of-our-nature', '/brave-new-world', '/development-as-freedom', '/the-open-society-and-its-enemies'].some((suffix) => path.endsWith(suffix))) {
        const locator = path.endsWith('/brave-new-world') ? 'Chapter III' : path.endsWith('/the-open-society-and-its-enemies') ? 'preface' : 'Introduction'
        assert.ok(rawHTML.includes('Quotation excerpt') && text.includes('Quotation excerpt'), 'Static and real readers identify excerpt wording')
        assert.ok(rawHTML.toLowerCase().includes(locator.toLowerCase()) && text.toLowerCase().includes(locator.toLowerCase()), 'The actual book-text locator survives hydration')
        assert.ok(record.quotationSourceLinks > 0, 'The book passage has a discoverable source link')
      } else if (path.endsWith('/capital-in-the-twenty-first-century')) {
        assert.ok(rawHTML.includes('jstor.org') && await reader.locator('a[href*="jstor.org"]').count(), 'Publisher-provided metadata citation is available in both readers')
        assert.ok(text.includes('have not yet been verified'), 'Bibliographic metadata does not certify the book quotation')
      } else {
        assert.ok(rawHTML.includes('Sources and quotation notes'), 'A book without a quotation can still have a real bibliography')
        assert.ok(record.quotationSourceLinks > 0, 'Previously verified title/author sources are discoverable in the reader')
        assert.equal(await page.getByRole('button', { name: 'Key quote', exact: true }).count(), 0, 'No quotation or copy action is invented for a source without one')
      }
    }
    if (path === '/journal') {
      assert.equal(await page.locator('#archive-text details').count(), 6, 'All existing Journal pieces have native text readers')
      assert.ok(rawHTML.includes('punishes the complainant more reliably than the accused.'), 'Raw HTTP includes source-supported main content')
      assert.ok(rawHTML.includes('Editorial clarification') && rawHTML.includes('weather.gov'), 'Clarifications and scientific source survive prerendering')
      await page.locator('#opinion-ali-hassan-text > summary').click()
      const archive = page.locator('#opinion-ali-hassan-text')
      assert.ok(await archive.locator('aside a[href*="weather.gov"]').count(), 'Pacific clarification cites primary weather guidance')
      assert.ok(await archive.locator('article').isVisible(), 'Native disclosure opens full article text on mobile')
      await page.locator('#opinion-eid-eve-chaman-phatak-text > summary').click()
      assert.match(await page.locator('#opinion-eid-eve-chaman-phatak-text aside').innerText(), /Sunday/, 'Calendar discrepancy is transparently marked')
      assert.match(await archive.locator('aside').allInnerTexts().then(texts => texts.join(' ')), /2010–2017/, 'Climate measurement retains its actual study window')
      await page.locator('#opinion-harassers-calculus-text > summary').click()
      const statistics = page.locator('#opinion-harassers-calculus-text aside')
      const statisticText = (await statistics.allInnerTexts()).join(' ')
      assert.match(statisticText, /ever-married women aged 15–49/, 'Survey population is explicitly defined')
      assert.match(statisticText, /2024–2025/, 'Complaint counts preserve their reporting period')
      await page.locator('#opinion-machines-at-war-text > summary').click()
      const targeting = page.locator('#opinion-machines-at-war-text aside')
      assert.match(await targeting.innerText(), /not a finding that AI selected the school/, 'A request for investigation is not shown as an investigative finding')
      assert.ok(await targeting.locator('a[href*="foreign.senate.gov"]').count(), 'The contemporaneous Senate letter is linked')
      record.archiveTranscripts = 6
      record.editorialClarifications = await page.locator('#archive-text aside').count()
    }
    if (path.includes('/constitutional-law/')) {
      const main = page.locator('main').first()
      await main.locator('a[href="https://na.gov.pk/uploads/documents/691ec19a6a212_270.pdf"]').first().waitFor()
      assert.ok(rawHTML.includes('691ec19a6a212_270.pdf'), 'Official constitutional source is present before JavaScript')
      assert.ok((await main.innerText()).includes('Twenty-seventh'), 'Real notes include the later enacted amendment')
    }
    if (path === '/css-2026-written-result') {
      assert.ok(rawHTML.includes('476-candidates-clear-css-written-examination'), 'Static result context includes the inspected APP report')
      assert.ok(await page.locator('a[href*="app.com.pk/national/476-candidates"]').count(), 'Result context source remains accessible after rendering')
    }
    if (path === '/subjects/selector') {
      await page.getByLabel('Your academic background').selectOption('Social Sciences / Arts')
      for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Next', exact: true }).click()
      await page.getByRole('button', { name: 'Generate suggestions', exact: true }).click()
      record.result = await page.locator('main').first().innerText()
      assert.equal(await page.getByText(/Valid - 600\/600 marks/).count(), 2, 'Both suggested combinations must satisfy 600 marks')
      assert.ok(!record.result.includes('Total is 900'), 'Never generate invalid 900-mark combinations')
    }
    if (path === '/css-eligibility-calculator') {
      const birthYear = new Date().getFullYear() - 25
      await page.getByPlaceholder('15 / 06 / 1998').fill(`15 / 06 / ${birthYear}`)
      await page.getByRole('button', { name: 'Calculate My CSS Eligibility' }).click()
      assert.ok(await page.getByText('Eligible', { exact: true }).count(), 'Calculator produces an age-eligible result')
      record.result = await page.locator('main').first().innerText()
    }
    if (path === '/') {
      assert.deepEqual(studyMetadataRequests, [], 'Ordinary homepage does not fetch subject/topic metadata indexes')
      record.earlyStudyMetadataRequests = studyMetadataRequests
      const track = page.locator('.vista-live-ticker-track')
      assert.equal(await track.evaluate((element) => getComputedStyle(element).animationName), 'none', 'Reduced motion is respected after all stylesheets apply')
      const streak = page.locator('.cssv-live-bar a').first()
      const streakBox = await streak.boundingBox()
      assert.ok(streakBox.height >= 44, 'Study streak has a usable mobile target')
      assert.ok(await streak.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
      }), 'Moving notices cannot cover the streak target')
      const countdown = page.locator('.cssv-countdown-card').first()
      assert.equal(await countdown.getAttribute('aria-label'), null, 'Countdown name comes from its visible text, rather than replacing it')
      assert.match(await countdown.ariaSnapshot(), /Updates every second/)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.getByRole('button', { name: 'Pause live updates', exact: true }).click()
      assert.equal(await track.evaluate((element) => getComputedStyle(element).animationPlayState), 'paused')
      await page.getByRole('button', { name: 'Resume live updates', exact: true }).click()
      assert.equal(await track.evaluate((element) => getComputedStyle(element).animationPlayState), 'running')
      await page.emulateMedia({ reducedMotion: 'reduce' })
    }
    if (path === '/grammar-course') {
      assert.ok(rawHTML.includes('he speaks English fluent'), 'Raw grammar page includes actual authored lesson explanation')
      assert.ok(state.robots.every(value => !value.includes('noindex')), 'Public grammar lesson remains intentionally indexable')
      await page.getByRole('button', { name: 'Read full lesson', exact: true }).click()
      record.fullLessonCharacters = (await page.locator('main').first().innerText()).length
      assert.ok(await page.getByText('What every word is doing', { exact: true }).count(), 'Guest can access authored grammar lesson')
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path}: no mobile overflow after interaction`)
    await context.close()
  }
  // A failed notes request must settle on its error screen, rather than
  // automatically retrying and moving adjacent-topic links on every render.
  for (const fixture of [
    { family: 'optional-notes', path: '/study-material/optional/accounting-and-auditing/paper-i-financial-accounting-50-marks', error: 'These notes could not be downloaded.' },
    { family: 'islamic-references', path: '/study-material/islamic-studies/introduction-to-islam/01-concept-of-islam-submission-faith-and-excellence', error: 'These references could not be downloaded.' },
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    const failedPath = fixture.path
    let failedRequests = 0
    await context.route('**/*', (route) => {
      const request = route.request(), url = new URL(request.url())
      if (request.method() !== 'GET' || url.origin !== origin || url.pathname.startsWith('/api/')) return route.abort('blockedbyclient')
      if (url.pathname === failedPath + '.json') {
        failedRequests++
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"fixture-unavailable"}' })
      }
      return route.continue()
    })
    try {
      const page = await context.newPage()
      const jsonResponses = []
      page.on('response', (response) => {
        const path = new URL(response.url()).pathname
        if (path.startsWith('/study-material/') && path.endsWith('.json')) jsonResponses.push({ path, status: response.status() })
      })
      await page.goto(origin + failedPath, { waitUntil: 'networkidle' })
      const alert = page.getByRole('alert').filter({ hasText: fixture.error })
      await alert.waitFor()
      const requestsWhenSettled = failedRequests
      const positionWhenSettled = await page.getByRole('navigation', { name: 'Adjacent topics', exact: true }).boundingBox()
      await page.waitForTimeout(1000)
      assert.equal(failedRequests, requestsWhenSettled, 'A failed notes download does not retry without user navigation or reload')
      assert.ok(failedRequests >= 1 && failedRequests <= 2, 'Only the initial mount request is allowed (including Strict Mode setup)')
      assert.equal(await alert.isVisible(), true, 'Download failure remains a stable, visible message')
      assert.deepEqual(await page.getByRole('navigation', { name: 'Adjacent topics', exact: true }).boundingBox(), positionWhenSettled, 'Adjacent-topic links stay in place after the failure settles')
      assert.equal(await page.locator('[data-cssv-ad-state="loading"]').count(), 0, 'Failure does not oscillate back to a loading screen')
      const nextLink = page.getByRole('navigation', { name: 'Adjacent topics', exact: true }).getByRole('link').first()
      const nextPath = await nextLink.getAttribute('href')
      await nextLink.click()
      await page.waitForURL(origin + nextPath)
      await page.locator('main article h2').first().waitFor()
      assert.equal(await alert.count(), 0, 'Navigating to another real topic clears the previous download failure')
      assert.ok(jsonResponses.some((response) => response.path === nextPath + '.json' && response.status === 200), 'Navigation fetches the next topic public JSON successfully')
      report.contentDownloadFailures ??= []
      report.contentDownloadFailures.push({ family: fixture.family, failedPath, fixtureStatus: 503, passed: true, failedRequests, stableError: true, adjacentLinksStable: true, nextPath, nextTopicLoaded: true, jsonResponses })
    } finally {
      await context.close()
    }
  }
  // A slow study-data chunk must not overwrite a later route's head. No API
  // or external connection is allowed, and no protected account is used.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    let releaseMetadata, signalMetadata
    const held = new Promise((resolve) => { releaseMetadata = resolve })
    const requested = new Promise((resolve) => { signalMetadata = resolve })
    await context.route('**/*', (route) => {
      const request = route.request(), url = new URL(request.url())
      if (request.method() !== 'GET' || url.origin !== origin || url.pathname.startsWith('/api/')) return route.abort('blockedbyclient')
      return route.continue()
    })
    await context.route(/\/studyMaterialMeta-[^/]+\.js/, async (route) => {
      signalMetadata()
      await held
      await route.continue().catch(() => {})
    })
    try {
      const page = await context.newPage()
      const initialPath = '/study-material/optional/accounting-and-auditing/paper-i-financial-accounting-50-marks'
      const response = await page.goto(origin + initialPath, { waitUntil: 'domcontentloaded' })
      const raw = await response.text()
      await Promise.race([requested, new Promise((_, reject) => setTimeout(() => reject(new Error('Study metadata request was not observed')), 10000))])
      const initialCanonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      assert.equal(initialCanonical, 'https://www.css-vista.com' + initialPath, 'Prerender canonical remains accurate while metadata is pending')
      assert.ok(raw.includes(initialCanonical), 'The pending head is the actual route-specific static head')
      const documentIdentity = await page.evaluate(() => performance.timeOrigin)
      await page.locator('header a[href="/"]').first().click()
      await page.waitForURL(origin + '/')
      await page.locator('h1').first().waitFor()
      assert.equal(await page.evaluate(() => performance.timeOrigin), documentIdentity, 'The race is actual SPA navigation, not a fresh document')
      releaseMetadata()
      await page.waitForLoadState('networkidle')
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://www.css-vista.com/')
      assert.ok(!(await page.title()).includes('Financial Accounting'), 'Late study import cannot replace the home title')
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
      assert.ok(!schemas.some((schema) => schema.includes(initialPath)), 'Late study schema does not remain on the home route')
      report.deferredMetadataNavigation = { passed: true, preservedPendingCanonical: initialCanonical, destination: '/', actualSpaNavigation: true }
    } finally {
      releaseMetadata()
      await context.close()
    }
  }
  report.passed = true
  console.log(`PASS: ${paths.length} public artifact routes; canonical/schema hydration, genuine 404, ad exclusions, mobile reflow, learning tools, sourced quotations/notes, result citation and six accessible Journal texts with clarifications.`)
} catch (error) {
  report.passed = false
  report.failure = error.message
  throw error
} finally {
  await mkdir(`${root}/test-artifacts`, { recursive: true })
  await writeFile(`${root}/test-artifacts/seo-browser.json`, JSON.stringify(report, null, 2))
  await browser.close()
  server.close()
}
