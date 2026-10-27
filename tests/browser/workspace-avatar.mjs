import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'http://127.0.0.1:5177'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback fixtures only')
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } })
let user = { id: 'avatar-fixture-a', email: 'avatar-a@example.invalid', display_name: 'Alice', user_metadata: { full_name: 'Alice' }, photo_complete: true, profile_complete: true }
let photoFails = false, delayed = false
const photoRequests = []
await context.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin !== base) return route.abort()
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/session.php') return route.fulfill({ json: { ok: true, authenticated: true, provider: 'hostinger', user } })
  if (url.pathname === '/api/pro-release.php') return route.fulfill({ json: { paused: true } })
  if (url.pathname === '/api/student/progress.php') return route.fulfill({ json: { payload: {}, ok: true } })
  if (url.pathname === '/api/student/photo-view.php') {
    photoRequests.push({ account: route.request().headers()['x-cssv-user'], query: url.search })
    if (delayed) await new Promise(resolve => setTimeout(resolve, 500))
    if (photoFails) return route.fulfill({ status: 404, json: { error: 'photo_not_found' } }).catch(() => {})
    return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#658773"/></svg>' }).catch(() => {})
  }
  return route.fulfill({ status: 503, json: { error: 'fixture_unavailable' } })
})
const page = await context.newPage()
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
const avatar = page.locator('.ws-account .ws-avatar')
const refresh = () => page.evaluate(() => window.dispatchEvent(new Event('cssvista:profile-updated')))
try {
  await page.goto(base + '/account/dashboard')
  await avatar.locator('img').waitFor()
  assert.ok(await avatar.locator('img').evaluate(img => img.complete && img.naturalWidth > 0))
  assert.deepEqual(photoRequests[0], { account: user.id, query: '' })
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await avatar.waitFor()
    const bounds = await avatar.boundingBox()
    assert.ok(bounds && bounds.width >= 34 && bounds.width <= 38 && bounds.height === bounds.width)
  }
  photoFails = true
  await refresh()
  await page.waitForFunction(() => document.querySelector('.ws-avatar')?.textContent === 'A')
  photoFails = false
  await refresh()
  await avatar.locator('img').waitFor()
  // A late photo response must not paint in the next student's header.
  delayed = true
  await refresh()
  user = { ...user, id: 'avatar-fixture-b', email: 'avatar-b@example.invalid', display_name: 'Beth', photo_complete: false }
  await refresh()
  await page.waitForFunction(() => document.querySelector('.ws-avatar')?.textContent === 'B')
  await page.waitForTimeout(650)
  assert.equal(await avatar.locator('img').count(), 0)
  assert.equal(await avatar.textContent(), 'B')
  await page.reload()
  await page.waitForFunction(() => document.querySelector('.ws-avatar')?.textContent === 'B')
  assert.deepEqual(errors, [])
  console.log('PASS: private profile photo, desktop/mobile sizing, failed-photo fallback, profile refresh and late-response account isolation.')
} catch (error) {
  console.error({ url: page.url(), photoRequests, errors, header: await page.locator('.ws-account').innerHTML().catch(() => 'No workspace header') })
  throw error
} finally {
  await browser.close()
}
