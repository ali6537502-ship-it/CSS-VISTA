import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { visibleControl } from './visible-control.mjs'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') {
  throw Error('Disposable test database required')
}
const root = new URL('../../', import.meta.url).pathname
const env = { ...process.env }
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER
  ? execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', ...args], { cwd: root, env, encoding: 'utf8' }).trim()
  : execFileSync('php', args, { cwd: root, env, encoding: 'utf8' }).trim()
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw Error('Loopback preview required')
const topic = JSON.parse(php('tests/topics/fixture.php', 'definition', 'test-only-option-order-' + Date.now()))
topic.learning_format = 'guided-course'
topic.questions[0].prompt = 'TEST ONLY: This deliberately longer scenario checks that a complete question and its assumptions remain readable on a narrow screen after option reordering. It is synthetic test content, not an examination question. ' + topic.questions[0].prompt
const reviewer = JSON.parse(php('tests/pro/fixture.php', 'reviewer'))
const headers = { Cookie: `cssv_owner_session=${reviewer.token}; cssv_owner_csrf=${reviewer.csrf}`, 'X-CSRF-Token': reviewer.csrf, 'Content-Type': 'application/json' }
// Node uses the native HTTP loopback API; browser traffic uses the isolated HTTPS proxy.
async function nativeAdmin(data) {
  const response = await fetch('http://localhost:4173/api/admin/topics.php', { method: 'POST', headers, body: JSON.stringify(data) })
  const result = await response.json()
  assert.equal(response.status, 200, JSON.stringify(result))
  return result
}
const imported = await nativeAdmin({ action: 'import', request_id: randomUUID(), expected_revision: 0, topic })
await nativeAdmin({ action: 'publish', request_id: randomUUID(), expected_revision: imported.revision, topic_id: topic.id, version_id: imported.version_id, reviewed: true, review_note: 'TEST ONLY synthetic option mapping; isolated CI database, not academic content or production publication.' })
php('tests/topics/fixture.php', 'reset-rate')
const email = `topic-options-${Date.now()}@example.invalid`
const user = php('tests/current-affairs/setup.php', 'user', email)
php('tests/precis/fixture.php', 'activate', user)
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || chromium.executablePath(), args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 1000 } })
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(error.message))
page.setDefaultTimeout(30000)
async function choose(locator) {
  await visibleControl(locator, 'check')
}
try {
  await page.goto(base + '/account')
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('TEST ONLY native fixture password')
  await page.getByRole('button', { name: 'Sign in securely', exact: true }).click()
  await page.waitForURL('**/account/dashboard')
  const csrf = (await context.cookies()).find(cookie => cookie.name === 'cssv_csrf').value
  const response = await context.request.post(base + '/api/student/learning.php', { headers: { 'X-CSRF-Token': csrf }, data: { action: 'attempt_save', request_id: randomUUID(), expected_version: 0, target_year: 2027, target_date: null, daily_minutes: 60, stage: 'starting', optional_subject_ids: [] } })
  assert.equal(response.status(), 200)
  const attempt = (await response.json()).attempt_id
  const path = base + '/account/preparation?attempt=' + attempt + '&view=topics&topic=' + topic.id
  async function save(name) {
    const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/student/topics.php')
    const reread = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/student/topics.php' && new URL(r.url()).searchParams.get('topic') === topic.id && !new URL(r.url()).searchParams.has('view'))
    const [saved] = await Promise.all([pending, reread, visibleControl(page.getByRole('button', { name, exact: true }))])
    assert.equal(saved.status(), 200, await saved.text())
    return saved.request().postDataJSON()
  }
  let changedOrders = 0
  for (const question of topic.questions.filter(q => q.mode === 'learn')) {
    await page.goto(path + '&topicMode=read&topicSection=' + question.section_id)
    await page.getByRole('button', { name: 'Try the checkpoint', exact: true }).click()
    const region = page.getByRole('region', { name: 'Guided checkpoint', exact: true })
    const order = await region.locator('label').allTextContents()
    if (JSON.stringify(order) !== JSON.stringify(question.options)) changedOrders++
    const wrong = (question.answer + 1) % 4
    await choose(region.getByRole('radio', { name: question.options[wrong], exact: true }))
    assert.deepEqual(await region.locator('label').allTextContents(), order, 'Selection changed option order')
    assert.equal((await save('Check this answer')).choice, wrong)
    await region.getByText('Your answer: ' + question.options[wrong], { exact: true }).waitFor()
    await region.getByText('Correct answer: ' + question.options[question.answer], { exact: true }).waitFor()
    await page.reload()
    await page.getByRole('button', { name: 'Try the checkpoint', exact: true }).click()
    await page.getByRole('button', { name: 'Try this question again', exact: true }).click()
    assert.deepEqual(await region.locator('label').allTextContents(), order, 'Reload/retry changed option order')
    await choose(region.getByRole('radio', { name: question.options[question.answer], exact: true }))
    assert.equal((await save('Check this answer')).choice, question.answer)
    await region.getByText('You got it.', { exact: true }).waitFor()
  }
  assert.ok(changedOrders > 0, 'Options still render in authoring order')
  for (const mode of ['learn', 'revision']) {
    if (mode === 'revision') php('tests/topics/fixture.php', 'due', user, attempt, imported.version_id)
    await page.goto(path + '&topicMode=' + (mode === 'learn' ? 'check' : 'revise'))
    for (const question of topic.questions.filter(q => q.mode === mode)) {
      const field = page.locator('fieldset').filter({ has: page.getByText(question.prompt, { exact: false }) })
      await choose(field.getByRole('radio', { name: question.options[question.answer], exact: true }))
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Question form overflow at ' + width)
    }
    const sent = await save('Save & check answers')
    assert.deepEqual(sent.choices, Object.fromEntries(topic.questions.filter(q => q.mode === mode).map(q => [q.id, q.answer])))
    await page.getByRole('heading', { name: 'Saved result: 3 of 3 correct', exact: true }).waitFor()
    await page.reload()
    await page.getByRole('heading', { name: 'Saved result: 3 of 3 correct', exact: true }).waitFor()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: reordered guided/check/recall labels submit canonical choices; wrong/correct feedback, retry, refresh and saved results remain accurate. Synthetic isolated data only.')
} finally {
  await browser.close()
}
