/** Stub Google consent API only; no ads, third-party traffic or account writes. */
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startArtifactPreview } from './artifact-preview.mjs'
const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const { server, origin } = await startArtifactPreview(resolve(root, process.env.CSSV_SEO_ARTIFACT || 'dist'))
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const report = []
try {
 for (const width of [390, 1366]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await context.route('**/*', route => route.request().method() === 'GET' && new URL(route.request().url()).origin === origin && !new URL(route.request().url()).pathname.startsWith('/api/') ? route.continue() : route.abort())
  const page = await context.newPage()
  await page.goto(origin + '/cookie-policy', { waitUntil: 'networkidle' })
  const button = page.getByRole('button', { name: 'Privacy & Cookie Settings', exact: true })
  await button.waitFor()
  await page.clock.install()
  await button.click()
  await page.getByRole('status').filter({ hasText: 'Waiting for Google privacy choices' }).waitFor()
  assert.ok(await button.isDisabled())
  assert.equal(await page.locator('script[src*="adsbygoogle.js"]').count(), 0, 'Legal page stays ad-free')
  await page.evaluate(() => { window.privacyCalls = 0; window.googlefc.showRevocationMessage = () => { window.privacyCalls++ }; window.googlefc.callbackQueue[0].CONSENT_API_READY() })
  await page.getByRole('status').filter({ hasText: 'Privacy choices requested.' }).waitFor()
  assert.equal(await page.evaluate(() => window.privacyCalls), 1)
  // A fresh explicit request that receives no readiness signal must time out.
  await page.evaluate(() => { window.googlefc = {}; window.privacyCalls = 0 })
  await button.click()
  await page.clock.fastForward(10001)
  await page.getByRole('status').filter({ hasText: 'Google privacy choices are unavailable here.' }).waitFor()
  assert.ok(await button.isEnabled())
  assert.equal(await page.getByRole('link', { name: 'Open homepage', exact: true }).getAttribute('href'), '/')
  await page.evaluate(() => { window.googlefc.showRevocationMessage = () => { window.privacyCalls++ }; window.googlefc.callbackQueue[0].CONSENT_API_READY() })
  assert.equal(await page.evaluate(() => window.privacyCalls), 0, 'Expired request cannot open a late consent message')
  // Resume real-time scheduling before checking React's navigation commit.
  await page.clock.resume()
  // Navigation remounts the control and cancels its outstanding callback.
  await page.evaluate(() => { window.googlefc = {} })
  await button.click()
  await page.getByRole('link', { name: 'Cookie help', exact: true }).click()
  await page.waitForURL('**/cookie-policy#managing-cookies')
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Privacy & Cookie Settings' && !button.disabled))
  assert.ok(await button.isEnabled())
  await page.evaluate(() => { window.googlefc.showRevocationMessage = () => { window.privacyCalls++ }; window.googlefc.callbackQueue[0].CONSENT_API_READY() })
  assert.equal(await page.evaluate(() => window.privacyCalls), 0, 'Navigation cancels the prior request')
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  report.push({ width, delayedReady: true, timeoutFallback: true, lateCallbackCancelled: true, navigationCancelled: true, noAdLoader: true })
  await context.close()
 }
 console.log('PASS privacy choices: delayed readiness, honest unavailable fallback, cancelled late/navigation callbacks, ad-free legal document, mobile/desktop; stub Google API only.')
} finally {
 await mkdir(`${root}/test-artifacts`, { recursive: true })
 await writeFile(`${root}/test-artifacts/privacy-choices.json`, JSON.stringify(report, null, 2))
 await browser.close(); server.close()
}
