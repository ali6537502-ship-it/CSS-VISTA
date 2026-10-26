/** Optional guidance and feature discovery through the existing native account flow. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env = { ...process.env }
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
const email = `guidance-${Date.now()}@example.invalid`
execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', 'tests/current-affairs/setup.php', 'user', email], { env, stdio: 'pipe' })
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
await isolateNetwork(context, base)
const page = await context.newPage()
page.setDefaultTimeout(20000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
const academic = () => page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('cssvista:v1') || '{}')
  return { tasks: state.studyScheduleTasks || [], results: state.quizResults || [], statuses: state.syllabusItemStatuses || {}, optionals: state.studyPlanner?.selectedOptionals || [], bookmarks: state.bookmarks || [], answers: state.savedAnswers || [] }
})
async function home() {
  await page.goto(base + '/account/dashboard')
  await page.getByRole('heading', { name: 'Today’s Study Plan', exact: true }).waitFor()
  assert.equal(await page.locator('.ws-journey').getByText('Activity recorded', { exact: true }).count(), 0)
}
try {
  assert.equal((await context.request.post(base + '/api/auth/login.php', { data: { email, password: 'TEST ONLY native fixture password' } })).status(), 200)
  await home()
  const before = await academic()
  const dismiss = page.getByRole('button', { name: 'Dismiss getting started', exact: true })
  await dismiss.focus(); await page.keyboard.press('Space')
  await page.reload()
  await page.getByRole('button', { name: 'Reopen getting started', exact: true }).focus(); await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Dismiss getting started', exact: true }).waitFor()
  for (const [title, route] of [
    ['Select your subjects', '/account/subjects'], ['Create your study schedule', '/account/plan'],
    ['Study syllabus topics', '/fpsc-syllabus'], ['Practice and attempt mocks', '/account/practice'], ['Review and revise', '/account/progress'],
  ]) {
    await home()
    const link = page.locator('.ws-journey').getByRole('link', { name: new RegExp(title) })
    await link.focus(); await page.keyboard.press('Enter')
    await page.waitForURL(url => url.pathname === route)
    await page.getByRole('heading').first().waitFor()
    if (route === '/account/plan') assert.equal(await page.getByLabel('Target examination date', { exact: false }).inputValue(), '')
  }
  await home()
  assert.deepEqual(await academic(), before, 'Guidance visits do not create academic history or complete preparation steps')
  await page.getByRole('link', { name: 'Search features and resources', exact: true }).focus(); await page.keyboard.press('Enter')
  const search = page.getByRole('searchbox')
  await search.focus(); await page.keyboard.type('daily pdf')
  await page.getByRole('heading', { name: 'Current Affairs Daily PDFs', exact: true }).waitFor()
  const pin = page.getByRole('button', { name: /^(?:Unpin|Pin) Current Affairs Daily PDFs$/ })
  const wasPinned = await pin.getAttribute('aria-pressed') === 'true'
  await pin.focus(); await page.keyboard.press('Space')
  await page.reload()
  await search.fill('daily pdf')
  await page.getByRole('button', { name: `${wasPinned ? 'Pin' : 'Unpin'} Current Affairs Daily PDFs`, exact: true }).waitFor()
  await page.getByRole('button', { name: 'Clear', exact: true }).focus(); await page.keyboard.press('Enter')
  assert.equal(await search.inputValue(), '')
  await home()
  assert.equal(await page.getByRole('link', { name: 'Current Affairs Daily PDFs Free', exact: true }).count(), wasPinned ? 0 : 1)
  assert.deepEqual(await academic(), before)
  assert.deepEqual(errors, [])
  console.log('PASS native guidance: keyboard dismissal/reopen/refresh, all five real destinations, no seeded history or false completed stages; keyboard feature search, persisted pin/unpin and clear-query control.')
} finally { await browser.close() }
