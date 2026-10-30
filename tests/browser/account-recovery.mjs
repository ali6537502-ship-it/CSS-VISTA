/** Successful recovery through real native APIs and local invalid-domain mail capture. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env = { ...process.env }
for (const name of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[name]
const php = (...args) => execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', ...args], { env, encoding: 'utf8' }).trim()
php('tests/account-native/signup-fixture.php', 'recovery')
const email = `recovery-browser-${randomUUID()}@example.invalid`
php('tests/current-affairs/setup.php', 'user', email)
const original = 'TEST ONLY native fixture password', next = 'TEST ONLY recovered account password'
const destination = '/account/library?from=recovery#saved'
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'], headless: true })
const old = await browser.newContext({ ignoreHTTPSErrors: true })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
await isolateNetwork(old, base); await isolateNetwork(context, base)
const page = await context.newPage(), errors = [], checks = []
page.setDefaultTimeout(20000); page.on('pageerror', error => errors.push(error.message))
const output = 'test-artifacts/final-verification/recovery'
mkdirSync(output, { recursive: true })
try {
  assert.equal((await old.request.post(base + '/api/auth/login.php', { data: { email, password: original } })).status(), 200)
  const csrf = (await old.cookies()).find(cookie => cookie.name === 'cssv_csrf').value
  const payload = { 'cssvista:v1': { bookmarks: ['TEST ONLY preserved bookmark'], quizResults: [{ id: randomUUID(), type: 'quiz', category: 'TEST ONLY', score: 4, total: 5, date: new Date().toISOString() }] } }
  assert.equal((await old.request.put(base + '/api/student/progress.php', { headers: { 'X-CSRF-Token': csrf }, data: { payload } })).status(), 200)
  const before = (await (await old.request.get(base + '/api/student/profile.php')).json()).profile
  await page.goto(`${base}/account?returnTo=${encodeURIComponent(destination)}`)
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Forgot your password?', exact: true }).click()
  await page.getByText('If this account is eligible, a password-reset email will arrive shortly. Please also check your spam folder.', { exact: true }).waitFor()
  const captured = JSON.parse(php('tests/account-native/read-recovery-mail.php', email))
  assert.equal(new URL(page.url()).searchParams.get('returnTo'), destination)
  await page.getByLabel('Six-digit reset code', { exact: true }).fill(captured.code)
  await page.getByLabel('New password', { exact: true }).fill(next)
  await page.getByLabel('Confirm password', { exact: true }).fill(next)
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await page.getByText('Your password has been updated. Sign in with your new password.', { exact: true }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('returnTo'), destination)
  assert.equal((await (await old.request.get(base + '/api/auth/session.php')).json()).authenticated, false)
  assert.equal((await old.request.post(base + '/api/auth/login.php', { data: { email, password: original } })).status(), 401)
  checks.push('Forgot-password UI captures a real native recovery message; valid code resets the password and revokes the old session and password')
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(next)
  await page.getByRole('button', { name: 'Sign in securely', exact: true }).click()
  await page.waitForURL(url => url.pathname === '/account/library' && url.searchParams.get('from') === 'recovery' && url.hash === '#saved')
  await page.getByRole('heading', { name: 'My Library', exact: true }).waitFor()
  const after = (await (await context.request.get(base + '/api/student/profile.php')).json()).profile
  for (const key of ['user_id', 'display_name', 'phone', 'education', 'optional_subjects', 'profile_photo_bytes']) assert.deepEqual(after[key], before[key])
  const restored = (await (await context.request.get(base + '/api/student/progress.php')).json()).payload
  assert.deepEqual(restored['cssvista:v1'].bookmarks, payload['cssvista:v1'].bookmarks)
  assert.deepEqual(restored['cssvista:v1'].quizResults, payload['cssvista:v1'].quizResults)
  assert.equal((await context.request.post(base + '/api/auth/reset-password.php', { data: { email, code: captured.code, password: next } })).status(), 400)
  checks.push('New password opens the intended query/hash destination; saved profile, bookmarks and results remain; used code cannot replay')
  await page.screenshot({ path: `${output}/restored-library-390.png`, fullPage: true })
  const linkContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await isolateNetwork(linkContext, base)
  const linkPage = await linkContext.newPage(), last = 'TEST ONLY recovered link password'
  linkPage.setDefaultTimeout(20000); linkPage.on('pageerror', error => errors.push(error.message))
  await linkPage.goto(`${base}/account?returnTo=${encodeURIComponent(destination)}`)
  await linkPage.getByLabel('Email address', { exact: true }).fill(email)
  await linkPage.getByRole('button', { name: 'Forgot your password?', exact: true }).click()
  await linkPage.getByText('If this account is eligible, a password-reset email will arrive shortly. Please also check your spam folder.', { exact: true }).waitFor()
  const link = JSON.parse(php('tests/account-native/read-recovery-mail.php', email, captured.token))
  await linkPage.goto(`${base}/account?reset=1&returnTo=${encodeURIComponent(destination)}#token=${link.token}`)
  await linkPage.getByLabel('New password', { exact: true }).fill(last)
  await linkPage.waitForFunction(() => location.hash === '')
  await linkPage.getByLabel('Confirm password', { exact: true }).fill(last)
  await linkPage.getByRole('button', { name: 'Update password', exact: true }).click()
  await linkPage.getByText('Your password has been updated. Sign in with your new password.', { exact: true }).waitFor()
  assert.equal((await (await context.request.get(base + '/api/auth/session.php')).json()).authenticated, false)
  await linkPage.getByLabel('Email address', { exact: true }).fill(email)
  await linkPage.getByLabel('Password', { exact: true }).fill(last)
  await linkPage.getByRole('button', { name: 'Sign in securely', exact: true }).click()
  await linkPage.waitForURL(url => url.pathname === '/account/library' && url.searchParams.get('from') === 'recovery' && url.hash === '#saved')
  await linkPage.getByRole('heading', { name: 'My Library', exact: true }).waitFor()
  assert.equal((await linkContext.request.post(base + '/api/auth/reset-password.php', { data: { token: link.token, password: last } })).status(), 400)
  const linkProfile = (await (await linkContext.request.get(base + '/api/student/profile.php')).json()).profile
  assert.equal(linkProfile.user_id, before.user_id)
  const linkProgress = (await (await linkContext.request.get(base + '/api/student/progress.php')).json()).payload
  assert.deepEqual(linkProgress['cssvista:v1'].bookmarks, payload['cssvista:v1'].bookmarks)
  assert.deepEqual(linkProgress['cssvista:v1'].quizResults, payload['cssvista:v1'].quizResults)
  await linkPage.screenshot({ path: `${output}/restored-library-1440.png`, fullPage: true })
  checks.push('Captured reset-link UI succeeds, strips the token fragment, preserves return path and records, revokes the prior session and rejects token replay')
  await linkContext.close()
  assert.deepEqual(errors, [])
  console.log('PASS native recovery:', checks.join('; '), '(local captured mail only; no external inbox delivery claimed)')
} finally {
  writeFileSync(`${output}/results.json`, JSON.stringify({ checks, errors, scope: 'Disposable native APIs and local captured mail; no real SMTP/inbox delivery' }, null, 2))
  await browser.close()
}
