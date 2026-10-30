import { selectWorkspacePreview } from './preview-fixture.mjs'
/** Keyboard and automated accessibility review of populated, disposable native workspace pages. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env = { ...process.env }
for (const name of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[name]
const email = `accessibility-${randomUUID()}@example.invalid`
execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', 'tests/current-affairs/setup.php', 'user', email], { env, stdio: 'pipe' })
selectWorkspacePreview(email)
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'], headless: true })
const context = await browser.newContext({ ignoreHTTPSErrors: true, reducedMotion: 'reduce', hasTouch: true })
await isolateNetwork(context, base)
const page = await context.newPage(), results = [], errors = []
page.setDefaultTimeout(25000); page.on('pageerror', error => errors.push(error.message))
const output = 'test-artifacts/final-verification/accessibility'
mkdirSync(output, { recursive: true })
try {
  assert.equal((await context.request.post(base + '/api/auth/login.php', { data: { email, password: 'TEST ONLY native fixture password' } })).status(), 200)
  const csrf = (await context.cookies()).find(cookie => cookie.name === 'cssv_csrf').value
  const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const payload = { 'cssvista:v1': {
    studyPlanner: { examDate: '2027-12-01', dailyHours: 2, restDay: 5, selectedOptionals: ['Political Science', 'Criminology', 'European History', 'Punjabi', 'Environmental Sciences'], configuredAt: now.toISOString() },
    studyScheduleTasks: [{ id: randomUUID(), syllabusItemId: 'manual:accessibility', subject: 'Political Science', topic: 'TEST ONLY accessible study session', paper: 'Paper I', section: 'Personal task', date: today, minutes: 30, status: 'not-started' }],
    quizResults: [{ id: randomUUID(), type: 'quiz', category: 'TEST ONLY', score: 7, total: 10, date: now.toISOString() }],
    bookmarks: ['TEST ONLY saved record'],
  } }
  assert.equal((await context.request.put(base + '/api/student/progress.php', { headers: { 'X-CSRF-Token': csrf }, data: { payload } })).status(), 200)
  const routes = { dashboard: 'Today’s Study Plan', tasks: 'My Study Plan', subjects: 'My Subjects', practice: 'Practice', progress: 'My Performance', library: 'My Library', settings: 'Account & Settings' }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [route, title] of Object.entries(routes)) {
      await page.goto(`${base}/account/${route}`)
      await page.getByRole('heading', { name: title, exact: true }).waitFor()
      if (route === 'dashboard') await page.getByRole('button', { name: 'Mark TEST ONLY accessible study session complete', exact: true }).waitFor()
      if (route === 'settings') await page.getByRole('heading', { name: 'Your profile, your learning space', exact: true }).waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.addScriptTag({ content: readFileSync('tests/browser/node_modules/axe-core/axe.min.js', 'utf8') })
      const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.student-workspace'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })))
      results.push({ route, width, violations })
      await page.keyboard.press('Tab')
      assert.ok(await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement !== document.body && document.activeElement.getClientRects().length > 0), 'Keyboard focus reaches a visible element')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow at ${width}`)
    }
  }
  assert.deepEqual(results.filter(result => result.violations.length), [], 'Every reviewed workspace page must pass its accessibility scan')
  assert.deepEqual(errors, [])
  console.log('PASS native workspace accessibility: fourteen populated page/viewport scans with zero violations; visible keyboard focus and no horizontal overflow. Automated checks do not certify WCAG conformance.')
} finally {
  writeFileSync(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2))
  await browser.close()
}
