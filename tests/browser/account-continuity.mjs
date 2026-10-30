import { selectWorkspacePreview } from './preview-fixture.mjs'
/** Remaining workspace preservation checks against disposable native accounts only. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env = { ...process.env }
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
const stamp = Date.now()
const accounts = ['a', 'b'].map(suffix => `continuity-${stamp}-${suffix}@example.invalid`)
for (const email of accounts) execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', 'tests/current-affairs/setup.php', 'user', email], { env, stdio: 'pipe' })
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })
await isolateNetwork(context, base)
const page = await context.newPage()
page.setDefaultTimeout(20000)
page.on('dialog', dialog => dialog.accept())
const output = 'test-artifacts/account-continuity'
mkdirSync(output, { recursive: true })
const results = []
async function login(index) {
  selectWorkspacePreview(accounts[index])
  if (!/^\/account\/?$/.test(new URL(page.url()).pathname)) await page.goto(base + '/account')
  await page.getByLabel('Email address', { exact: true }).fill(accounts[index])
  await page.getByLabel('Password', { exact: true }).fill('TEST ONLY native fixture password')
  await page.getByRole('button', { name: 'Sign in securely', exact: true }).click()
  await page.locator('.student-workspace').waitFor()
  if (new URL(page.url()).pathname !== '/account/dashboard') await page.goto(base + '/account/dashboard')
  await page.getByRole('heading', { name: 'Today’s Study Plan', exact: true }).waitFor()
}
async function logout() {
  await page.goto(base + '/account/settings')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.waitForURL(/\/account(?:\?|$)/)
  await page.getByLabel('Email address', { exact: true }).waitFor()
}
async function check(name, run) {
  console.log('CHECK', name)
  try { await run(); results.push({ name, status: 'passed' }); console.log('PASS', name) }
  catch (error) { results.push({ name, status: 'failed', error: error.message }); await page.screenshot({ path: `${output}/${name}-failure.png`, fullPage: true }).catch(() => {}); throw error }
  finally { writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2)) }
}
try {
  await login(0)
  await check('timer-account-isolation', async () => {
    await page.goto(base + '/answer-timer')
    await page.getByPlaceholder('Paste or type the question you will attempt on paper…').fill('Account A private answer question')
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor()
    await logout()
    await login(1)
    await page.goto(base + '/answer-timer')
    assert.equal(await page.getByPlaceholder('Paste or type the question you will attempt on paper…').inputValue(), '', 'A different student must not see the previous student’s timer question')
    await logout()
    await login(0)
    await page.goto(base + '/answer-timer')
    assert.equal(await page.getByPlaceholder('Paste or type the question you will attempt on paper…').inputValue(), 'Account A private answer question', 'Original student retains their timer question')
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.getByRole('button', { name: 'Full Paper: MCQs + 4 Answers', exact: true }).click()
    await page.getByPlaceholder('Question 1…', { exact: true }).fill('Account A private paper question')
    await page.getByRole('button', { name: /Start.*paper/i }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await logout(); await login(1)
    await page.goto(base + '/answer-timer')
    await page.getByRole('button', { name: 'Full Paper: MCQs + 4 Answers', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Resume attempt', exact: true }).count(), 0)
    assert.equal(await page.getByPlaceholder('Question 1…', { exact: true }).inputValue(), '')
    await logout(); await login(0)
    await page.goto(base + '/answer-timer')
    await page.getByRole('button', { name: 'Full Paper: MCQs + 4 Answers', exact: true }).click()
    await page.getByRole('button', { name: 'Resume attempt', exact: true }).click()
    await page.getByRole('button', { name: /^Finish MCQs/ }).click()
    await page.getByText('Question 1 of 4 - Account A private paper question', { exact: true }).waitFor()
  })
  await check('offline-sync-recovery', async () => {
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.goto(base + '/account/settings')
    await page.getByRole('button', { name: 'Sync progress now', exact: true }).waitFor()
    await page.locator('.ws-sidebar').getByRole('link', { name: 'My Study Plan', exact: true }).click()
    await page.getByRole('button', { name: 'Add or import tasks', exact: true }).click()
    const composer = page.getByRole('region', { name: 'Create and import study tasks', exact: true })
    await composer.getByLabel('What will you study?', { exact: true }).waitFor()
    await context.setOffline(true)
    await composer.getByLabel('What will you study?', { exact: true }).fill('Offline task retained')
    await composer.getByRole('button', { name: 'Add task', exact: true }).click()
    await page.getByRole('button', { name: 'Close task composer', exact: true }).click()
    await page.getByRole('button', { name: 'Mark Offline task retained complete', exact: true }).click()
    // Trigger the established background flush without a full document navigation.
    // Private ad-free destinations can require a clean document; there is no offline page cache.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
      delete document.visibilityState
    })
    await page.getByText('Account sync needs attention. Your device records are retained.', { exact: false }).waitFor()
    const local = await page.evaluate(() => JSON.parse(localStorage.getItem('cssvista:v1')).studyScheduleTasks.find(task => task.topic === 'Offline task retained'))
    assert.equal(local.status, 'completed')
    const recovered = page.waitForResponse(response => response.url().endsWith('/api/student/progress.php') && response.request().method() === 'PUT' && response.status() === 200)
    await context.setOffline(false)
    await recovered
    const remote = await (await context.request.get(base + '/api/student/progress.php')).json()
    assert.equal(remote.payload['cssvista:v1'].studyScheduleTasks.find(task => task.id === local.id).status, 'completed')
    await page.reload()
    await page.locator('.ws-sidebar').getByRole('link', { name: 'My Study Plan', exact: true }).click()
    await page.getByRole('button', { name: 'Mark Offline task retained incomplete', exact: true }).waitFor()
  })
  await check('bookmark-library-reopen', async () => {
    await page.goto(base + '/gk/quiz?mode=daily')
    const question = page.locator('#gk-quiz-question-1')
    const stem = await question.locator('p[id^="gk-quiz-stem-"]').textContent()
    await question.getByRole('radio').first().click()
    await question.getByRole('button', { name: 'Save question 1', exact: true }).click()
    await page.goto(base + '/account/library')
    await page.getByRole('link', { name: /Saved MCQs/ }).click()
    await page.getByRole('heading', { name: 'Saved Questions', exact: true }).waitFor()
    assert.ok((await page.locator('#gk-quiz-question-list').textContent()).includes(stem))
    await page.reload()
    await page.getByRole('heading', { name: 'Saved Questions', exact: true }).waitFor()
    assert.ok((await page.locator('#gk-quiz-question-list').textContent()).includes(stem))
    // A genuine research bookmark also survives the library return and account switch.
    await page.goto(base + '/account/library')
    await page.getByRole('link', { name: /Research bookmarks/ }).click()
    const source = page.locator('article').first()
    const save = source.getByRole('button', { name: /^Save / })
    await save.click()
    const sourceTitle = await source.getByRole('heading').textContent()
    await page.goto(base + '/account/library')
    await page.getByRole('link', { name: /Research bookmarks/ }).click()
    await page.getByRole('button', { name: /Saved only \(1\)/ }).click()
    assert.equal(await page.locator('article').count(), 1)
    assert.equal(await page.locator('article').getByRole('heading').textContent(), sourceTitle)
    const destination = await page.locator('article').getByRole('link', { name: /^Open / }).getAttribute('href')
    assert.equal(new URL(destination).protocol, 'https:')
    await logout(); await login(1)
    await page.goto(base + '/resources')
    await page.getByRole('button', { name: /Saved only \(0\)/ }).waitFor()
    await page.goto(base + '/gk/quiz?mode=saved')
    await page.getByText('You have not saved any questions yet.', { exact: false }).waitFor()
    await page.goto(base + '/gk/quiz?mode=daily')
    await page.locator('#gk-quiz-question-1').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Resume attempt', exact: true }).count(), 0)
    await logout(); await login(0)
    await page.goto(base + '/gk/quiz?mode=daily')
    await page.getByRole('button', { name: 'Resume attempt', exact: true }).click()
    await page.getByText('1/10 answered', { exact: true }).waitFor()
  })
  await check('sync-conflicts-preserve-records', async () => {
    await page.goto(base + '/account/settings')
    const remote = await (await context.request.get(base + '/api/student/progress.php')).json()
    const state = remote.payload['cssvista:v1']
    // An independent client adds a goal and changes a task while this device retains its copy.
    state.goalChecklist = [...(state.goalChecklist || []), { id: 'remote-only-goal', text: 'Independent remote goal', completed: false }]
    const localTask = state.studyScheduleTasks.find(task => task.topic === 'Offline task retained')
    localTask.status = 'not-started'
    const csrf = (await context.cookies()).find(cookie => cookie.name === 'cssv_csrf').value
    const update = await context.request.put(base + '/api/student/progress.php', { headers: { 'X-CSRF-Token': decodeURIComponent(csrf) }, data: { payload: remote.payload } })
    assert.equal(update.status(), 200)
    const saved = page.waitForResponse(response => response.url().endsWith('/api/student/progress.php') && response.request().method() === 'PUT' && response.status() === 200)
    await page.getByRole('button', { name: 'Sync progress now', exact: true }).click(); await saved
    // Preserve the established local-wins, per-record merge rather than inventing new conflict policy.
    const merged = await page.evaluate(() => JSON.parse(localStorage.getItem('cssvista:v1')))
    assert.equal(merged.studyScheduleTasks.find(task => task.id === localTask.id).status, 'completed')
    assert.ok(merged.goalChecklist.some(goal => goal.id === 'remote-only-goal'))
    const cloud = await (await context.request.get(base + '/api/student/progress.php')).json()
    assert.ok(cloud.payload['cssvista:v1'].goalChecklist.some(goal => goal.id === 'remote-only-goal'))
    assert.ok(cloud.payload['cssvista:progress:v1'].savedMcqs.length > 0)
  })
  await check('failed-sync-write-and-retry', async () => {
    const failPut = route => route.request().method() === 'PUT'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'fixture_unavailable', message: 'TEST ONLY temporary synchronization failure' }) })
      : route.continue()
    await page.route('**/api/student/progress.php', failPut)
    await page.goto(base + '/account/tasks?view=goals')
    await page.getByLabel('New study goal', { exact: true }).fill('Pending retry goal')
    await page.getByRole('button', { name: 'Add goal', exact: true }).click()
    await page.getByRole('link', { name: 'Open profile and account settings', exact: true }).click()
    await page.getByRole('button', { name: 'Sync progress now', exact: true }).click()
    await page.getByText('Sync needs attention', { exact: true }).waitFor({ state: 'attached' })
    assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('cssvista:v1')).goalChecklist.some(goal => goal.text === 'Pending retry goal')))
    const beforeRetry = await (await context.request.get(base + '/api/student/progress.php')).json()
    assert.ok(!beforeRetry.payload['cssvista:v1'].goalChecklist.some(goal => goal.text === 'Pending retry goal'))
    await page.unroute('**/api/student/progress.php', failPut)
    const saved = page.waitForResponse(response => response.url().endsWith('/api/student/progress.php') && response.request().method() === 'PUT' && response.status() === 200)
    await page.getByRole('button', { name: 'Sync progress now', exact: true }).click(); await saved
    const afterRetry = await (await context.request.get(base + '/api/student/progress.php')).json()
    assert.ok(afterRetry.payload['cssvista:v1'].goalChecklist.some(goal => goal.text === 'Pending retry goal'))
  })
  await check('late-sync-account-switch', async () => {
    let release
    const gate = new Promise(resolve => { release = resolve })
    let reached
    const started = new Promise(resolve => { reached = resolve })
    let completed
    const handled = new Promise(resolve => { completed = resolve })
    let intercept = true
    const handler = async route => {
      if (intercept && route.request().method() === 'GET') {
        intercept = false
        const response = await route.fetch()
        reached(); await gate
        await route.fulfill({ response }); completed()
      } else await route.continue()
    }
    await page.route('**/api/student/progress.php', handler)
    await page.getByRole('button', { name: 'Sync progress now', exact: true }).click()
    await started
    // Switch the real native session without destroying this document, so the
    // delayed A response can actually arrive after B's UI has hydrated.
    const oldId = await page.evaluate(() => localStorage.getItem('cssvista:progress-owner'))
    const csrf = (await context.cookies()).find(cookie => cookie.name === 'cssv_csrf').value
    assert.equal((await context.request.post(base + '/api/auth/logout.php', { headers: { 'X-CSRF-Token': decodeURIComponent(csrf), 'X-CSSV-User': oldId }, data: {} })).status(), 200)
    selectWorkspacePreview(accounts[1])
    const switchedSession = await context.request.post(base + '/api/auth/login.php', { data: { email: accounts[1], password: 'TEST ONLY native fixture password' } })
    assert.equal(switchedSession.status(), 200)
    const nextId = (await switchedSession.json()).user.id
    await page.evaluate(() => window.dispatchEvent(new Event('cssvista:profile-updated')))
    await page.waitForFunction(id => localStorage.getItem('cssvista:progress-owner') === id, nextId)
    release()
    await handled
    await page.unroute('**/api/student/progress.php', handler)
    await page.goto(base + '/account/tasks')
    await page.getByRole('heading', { name: 'My Study Plan', exact: true }).waitFor()
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('cssvista:v1') || '{}'))
    assert.ok(!(state.studyScheduleTasks || []).some(task => task.topic === 'Offline task retained'))
    assert.ok(!(state.goalChecklist || []).some(goal => goal.id === 'remote-only-goal'))
    const remote = await (await context.request.get(base + '/api/student/progress.php')).json()
    assert.ok(!(remote.payload['cssvista:v1']?.studyScheduleTasks || []).some(task => task.topic === 'Offline task retained'))
    await logout(); await login(0)
  })
  await check('mock-result-performance-sync', async () => {
    // Exercise the existing PKT registration window without modifying any release flag.
    await page.clock.setFixedTime(new Date('2026-10-26T15:30:00Z'))
    await page.goto(base + '/gk/quiz?mode=pms-mock')
    await page.getByLabel('Student full name', { exact: true }).fill('TEST ONLY Mock Candidate')
    await page.getByRole('button', { name: 'Enter today’s mock', exact: true }).click()
    await page.locator('#gk-quiz-question-1').getByRole('radio').first().click()
    const readMockSession = () => page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith('cssvista:quiz-session:pms-mock:'))
      const value = JSON.parse(localStorage.getItem(key))
      return typeof value === 'string' ? JSON.parse(value) : value
    })
    const beforeRefresh = await readMockSession()
    await page.clock.setFixedTime(new Date('2026-10-26T15:31:00Z'))
    // Refresh must offer the same unfinished paper and retain its original deadline.
    await page.reload()
    await page.getByRole('button', { name: 'Enter today’s mock', exact: true }).click()
    await page.getByRole('button', { name: 'Resume attempt', exact: true }).click()
    await page.getByText('1/100 answered', { exact: true }).waitFor()
    assert.equal((await readMockSession()).deadline, beforeRefresh.deadline)
    for (let index = 0; index < 10; index += 1) {
      const questions = page.locator('#gk-quiz-question-list article')
      assert.equal(await questions.count(), 10)
      for (let question = 0; question < 10; question += 1) await questions.nth(question).getByRole('radio').first().click()
      if (index < 9) await page.getByRole('navigation', { name: 'Questions pages', exact: true }).getByRole('button', { name: 'Next', exact: true }).click()
    }
    await page.getByText('100/100 answered', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Finish & see result', exact: true }).click()
    await page.getByText('Previous mock record', { exact: true }).waitFor()
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem('cssvista:v1')).quizResults.find(result => result.mockKind === 'gk'))
    assert.equal(record.total, 100)
    assert.equal(record.studentName, 'TEST ONLY Mock Candidate')
    await page.goto(base + '/account/progress')
    await page.getByText(`${record.score}/${record.total}`, { exact: false }).first().waitFor()
    await page.reload()
    await page.getByRole('heading', { name: 'My Performance', exact: true }).waitFor()
    await page.getByRole('heading', { name: 'Recorded practice history', exact: true }).waitFor()
    const syllabusMetric = page.locator('.ws-metric').filter({ has: page.getByText('Syllabus progress', { exact: true }) })
    assert.equal(await syllabusMetric.locator('p').nth(1).textContent(), '0', 'Completing a personal task must not create syllabus coverage')
    assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('cssvista:v1')).quizResults.filter(result => result.id === id).length, record.id), 1)
    await page.screenshot({ path: `${output}/mock-record.png`, fullPage: true })
    await page.goto(base + '/account/settings')
    const save = page.waitForResponse(response => response.url().endsWith('/api/student/progress.php') && response.request().method() === 'PUT' && response.status() === 200)
    await page.getByRole('button', { name: 'Sync progress now', exact: true }).click(); await save
    const remote = await (await context.request.get(base + '/api/student/progress.php')).json()
    assert.equal(remote.payload['cssvista:v1'].quizResults.filter(result => result.id === record.id).length, 1)
    await page.goto(base + '/gk/quiz?mode=mpt-mock')
    await page.waitForURL('**/gk')
    await logout(); await login(1)
    await page.goto(base + '/gk/quiz?mode=pms-mock')
    assert.equal(await page.getByLabel('Student full name', { exact: true }).inputValue(), '')
    await logout(); await login(0)
    await page.clock.setFixedTime(new Date())
  })
  await check('touch-landscape-and-reduced-viewport', async () => {
    const destinations = [
      ['dashboard', 'Today’s Study Plan'], ['tasks', 'My Study Plan'], ['subjects', 'My Subjects'],
      ['practice', 'Practice'], ['progress', 'My Performance'], ['library', 'My Library'], ['settings', 'Account & Settings'],
    ]
    for (const [width, height] of [[390, 844], [844, 390], [768, 1024], [1024, 768]]) {
      await page.setViewportSize({ width, height })
      for (const [route, title] of destinations) {
        await page.goto(base + '/account/' + route)
        await page.getByRole('heading', { name: title, exact: true }).waitFor()
        if (route === 'settings') await page.getByRole('heading', { name: 'Your profile, your learning space', exact: true }).waitFor()
        await page.waitForFunction(() => !Array.from(document.querySelectorAll('[role="status"]')).some(element => element.getClientRects().length && /^Loading/.test(element.textContent.trim())))
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow at ${width}x${height}`)
        if (width < 1024) {
          const bottom = page.getByRole('navigation', { name: 'Student mobile navigation', exact: true })
          await bottom.getByRole('link', { name: 'More', exact: true }).tap()
          await page.getByRole('heading', { name: 'Your workspace', exact: true }).waitFor()
          assert.equal(await page.locator('nav.ws-bottom:visible').count(), 1)
          await page.getByRole('link', { name: 'Account & Settings', exact: true }).tap()
          await page.getByRole('button', { name: 'Sync progress now', exact: true }).waitFor()
          await page.getByRole('heading', { name: 'Your profile, your learning space', exact: true }).waitFor()
        }
      }
      await page.screenshot({ path: `${output}/settings-${width}x${height}.png`, fullPage: true })
    }
    // A reduced viewport approximates keyboard space; it does not emulate an OS keyboard.
    await page.setViewportSize({ width: 390, height: 420 })
    await page.goto(base + '/account/tasks')
    await page.getByRole('button', { name: 'Add or import tasks', exact: true }).tap()
    const input = page.getByLabel('What will you study?', { exact: true })
    await input.fill('Narrow viewport task')
    const submit = page.getByRole('button', { name: 'Add task', exact: true })
    await submit.scrollIntoViewIfNeeded()
    assert.equal(await submit.evaluate(element => {
      const rect = element.getBoundingClientRect()
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
    }), true, 'Bottom navigation does not obstruct the task submit target')
    await submit.tap()
    await page.getByRole('button', { name: 'Close task composer', exact: true }).tap()
    await page.getByRole('button', { name: 'Mark Narrow viewport task complete', exact: true }).waitFor()
    await page.screenshot({ path: `${output}/reduced-viewport.png`, fullPage: true })
  })
} finally { await browser.close() }
