import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
if (process.env.CSSV_EXPECT_OLD_SIGNUP !== 'true') throw Error('Historical reproduction: use only with the pre-signup built artifact and CSSV_EXPECT_OLD_SIGNUP=true')
const base = 'https://localhost:3444'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
await isolateNetwork(context, base)
const page = await context.newPage(); page.setDefaultTimeout(20000)
mkdirSync('test-artifacts/signup/before', { recursive: true })
try {
  await page.goto(base + '/account?mode=create')
  await page.getByLabel('Full name', { exact: true }).fill('TEST ONLY Before')
  await page.getByLabel('Email address', { exact: true }).fill(`signup-before-${Date.now()}@example.invalid`)
  await page.getByLabel('Password', { exact: true }).fill('TEST ONLY signup password')
  await page.getByLabel('Confirm password', { exact: true }).fill('TEST ONLY signup password')
  await page.screenshot({ path: 'test-artifacts/signup/before/create-390.png', fullPage: true })
  await page.getByRole('button', { name: 'Create my free account', exact: true }).click()
  await page.getByLabel(/^Contact number/).fill('+923001234567')
  await page.getByLabel('Date of birth', { exact: true }).fill('2000-01-01')
  await page.getByLabel(/^Gender/).selectOption('Other')
  await page.getByLabel('City', { exact: true }).fill('TEST ONLY')
  await page.getByLabel('Province / region', { exact: true }).fill('TEST ONLY')
  await page.getByLabel('Country', { exact: true }).fill('Pakistan')
  await page.getByRole('button', { name: 'Save & continue', exact: true }).click()
  await page.getByText('Please tell us whether you previously studied with Miss Sadia Zahoor or Sir Ali Hassan Sargana.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'About you', exact: true }).count(), 1)
  await page.screenshot({ path: 'test-artifacts/signup/before/hidden-history-error-390.png', fullPage: true })
  console.log('REPRODUCED: existing first profile section cannot save until a hidden history question on the second section is answered. Disposable fixture only.')
} finally { await browser.close() }
