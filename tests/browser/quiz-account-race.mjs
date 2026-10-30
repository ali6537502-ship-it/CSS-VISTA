/** A late question response must not record account A's saved session under B. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env = { ...process.env }
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
const emails = ['a', 'b'].map(suffix => `quiz-race-${Date.now()}-${suffix}@example.invalid`)
for (const email of emails) execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', 'tests/current-affairs/setup.php', 'user', email], { env, stdio: 'pipe' })
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
await isolateNetwork(context, base)
const page = await context.newPage(); page.setDefaultTimeout(20000)
const login = async email => {
  const response = await context.request.post(base + '/api/auth/login.php', { data: { email, password: 'TEST ONLY native fixture password' } })
  assert.equal(response.status(), 200)
  return (await response.json()).user.id
}
try {
  await login(emails[0])
  await page.goto(base + '/gk/quiz?mode=daily')
  await page.getByRole('button', { name: 'Save question 1', exact: true }).click()
  let release, reached, settled
  const gate = new Promise(resolve => { release = resolve })
  const started = new Promise(resolve => { reached = resolve })
  const delivered = new Promise(resolve => { settled = resolve })
  let hold = true
  await page.route('**/mcq/cat-*.json', async route => {
    if (!hold) return route.continue()
    hold = false
    const response = await route.fetch()
    reached(); await gate
    await route.fulfill({ response }); settled()
  })
  await page.goto(base + '/gk/quiz?mode=saved'); await started
  const oldId = await page.evaluate(() => localStorage.getItem('cssvista:progress-owner'))
  const csrf = (await context.cookies()).find(cookie => cookie.name === 'cssv_csrf').value
  assert.equal((await context.request.post(base + '/api/auth/logout.php', { headers: { 'X-CSRF-Token': decodeURIComponent(csrf), 'X-CSSV-User': oldId }, data: {} })).status(), 200)
  const nextId = await login(emails[1])
  await page.evaluate(() => window.dispatchEvent(new Event('cssvista:profile-updated')))
  await page.waitForFunction(id => localStorage.getItem('cssvista:progress-owner') === id, nextId)
  await page.getByText('You have not saved any questions yet.', { exact: false }).waitFor()
  release(); await delivered
  // Let the delivered JSON and React work settle before checking durable effects.
  await page.waitForTimeout(250)
  const activities = await page.evaluate(() => JSON.parse(localStorage.getItem('cssvista:progress:v1') || '{}').activities || [])
  assert.ok(!activities.some(activity => activity.type === 'quiz' && activity.label === 'Saved Questions'), 'Late A question loading must not create a saved-quiz activity in B records')
  console.log('PASS native quiz race: delayed A question response after B-session hydration creates no B activity or saved-question exposure.')
} finally { await browser.close() }
