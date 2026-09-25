// Real-browser journey for the MPT portal (Section 21 E2E), desktop + mobile.
// Local/manual run against the disposable database (see docs/mpt/TEST-REPORT.md):
//   PHP_CLI_SERVER_WORKERS=4 php -S localhost:4174 -t dist tests/mpt/spa-router.php
//   node tests/mpt/browser.mjs [screenshot-dir]
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable CI database required')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = 'http://localhost:4174'
const shots = process.argv[2] || 'test-artifacts/mpt-screens'
mkdirSync(shots, { recursive: true })
const fixture = (...args) => JSON.parse(execFileSync('php', ['tests/mpt/fixtures.php', ...args.map(String)], { encoding: 'utf8' }))
const step = (name) => console.log(`- ${name}`)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

async function contextFor(user, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  if (user) {
    await context.addCookies([
      { name: 'cssv_session', value: user.session, url: origin, httpOnly: true },
      { name: 'cssv_csrf', value: user.csrf, url: origin },
    ])
  }
  return context
}
// The site's once-per-session promotional dialog is dismissed like a visitor would.
async function visit(page, url) {
  await page.goto(url)
  const close = page.getByRole('button', { name: 'Close bundle offer' })
  try { await close.click({ timeout: 2500 }) } catch { /* not shown on this route or already dismissed */ }
}
const noHorizontalScroll = async (page, label) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(overflow <= 1, `${label}: horizontal scroll of ${overflow}px`)
}

for (const [label, viewport] of [['mobile', { width: 375, height: 800 }], ['desktop', { width: 1280, height: 900 }]]) {
  step(`${label}: full candidate journey`)
  const [user] = fixture('users', 1, `browser-${label}`)
  const mock = fixture('mock', 120)
  const context = await contextFor(user, viewport)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  // Dashboard → Apply (direct URL load, not in-app navigation).
  await visit(page, `${origin}/account/dashboard`)
  await page.getByRole('link', { name: 'Apply Now' }).first().waitFor()
  const slotPattern = /(Morning|Afternoon|Evening) MPT Mock · \d{1,2}:\d{2} (AM|PM) PKT/
  assert.match(await page.textContent('body'), slotPattern, 'dashboard names the sitting and its time')
  const tile = page.getByRole('link', { name: /MPT Mocks.*3:00 PM & 10:30 PM daily/ })
  await tile.waitFor()
  assert.equal(await tile.getAttribute('href'), '/account/mpt', 'the dashboard grid has an MPT Mocks tile')
  await page.screenshot({ path: `${shots}/${label}-01-dashboard-apply.png`, fullPage: true })
  await page.getByRole('link', { name: 'Apply Now' }).first().click()
  await page.getByRole('heading', { name: /Application for MPT Mock/ }).waitFor()
  assert.match(await page.textContent('body'), slotPattern, 'apply screen names the sitting and its time')
  await noHorizontalScroll(page, `${label} apply`)
  await page.screenshot({ path: `${shots}/${label}-02-apply.png`, fullPage: true })
  const submit = page.getByRole('button', { name: 'Submit Application & Reserve Slot' })
  assert.equal(await submit.isDisabled(), true, 'submit disabled until the declaration is ticked')
  await page.getByRole('checkbox').check()
  await submit.click()
  await page.getByText('APPLICATION SUCCESSFUL').waitFor()
  await page.getByText('Your Roll Number will be issued in').waitFor()
  assert.equal(await page.getByText('YOUR ROLL NUMBER', { exact: true }).count(), 0, 'roll number hidden during the wait')
  await noHorizontalScroll(page, `${label} confirmation`)
  await page.screenshot({ path: `${shots}/${label}-03-confirmation-countdown.png`, fullPage: true })
  const code = page.url().match(/applications\/(MPTA-[^?]+)/)[1]
  const roll = fixture('roll', mock.slug, user.id).roll_number

  // In-place reveal: move the reveal to ~6 s from now and wait without reloading.
  fixture('travel', mock.slug, 9.9)
  await page.reload()
  await page.getByText('YOUR ROLL NUMBER', { exact: true }).waitFor({ timeout: 20_000 })
  assert.ok((await page.textContent('body')).includes(`${roll.slice(0, 3)} ${roll.slice(3)}`), 'grouped roll number shown')
  await page.screenshot({ path: `${shots}/${label}-04-roll-revealed.png`, fullPage: true })

  // Exam opened 2 minutes ago → dashboard says Enter Exam → gate → verified → start.
  fixture('travel', mock.slug, 112)
  await page.goto(`${origin}/account/dashboard`)
  await page.getByRole('link', { name: 'Enter Exam' }).first().click()
  await page.getByLabel('Enter your Roll Number').fill(roll.slice(0, 5) + String((Number(roll[5]) + 1) % 10))
  await page.getByRole('button', { name: 'Verify & Enter' }).click()
  await page.getByRole('alert').filter({ hasText: 'a digit looks wrong' }).waitFor()
  await page.getByLabel('Enter your Roll Number').fill(`${roll.slice(0, 3)} ${roll.slice(3)}`)
  await page.getByRole('button', { name: 'Verify & Enter' }).click()
  await page.getByRole('heading', { name: 'Candidate Verified' }).waitFor()
  const lateNote = /You are starting (\d+) minutes? late\. You have (\d+) minutes?\./.exec(await page.textContent('body'))
  assert.ok(lateNote, 'late-start note shown before Start')
  assert.equal(Number(lateNote[1]) + Number(lateNote[2]), 200, 'late minutes + remaining minutes = duration')
  assert.ok(Number(lateNote[1]) >= 2 && Number(lateNote[1]) <= 3)
  await noHorizontalScroll(page, `${label} verified`)
  await page.screenshot({ path: `${shots}/${label}-05-verified.png`, fullPage: true })
  await page.getByRole('button', { name: 'Start MPT Mock' }).click()
  await page.getByRole('timer').waitFor()
  await page.getByRole('radio').nth(0).check()
  await page.getByRole('radio').nth(5).check()
  await page.getByText(/Saved · /).waitFor({ timeout: 15_000 })
  await noHorizontalScroll(page, `${label} exam`)
  await page.screenshot({ path: `${shots}/${label}-06-exam.png`, fullPage: false })

  // Refresh mid-exam: same attempt, answers restored, timer not reset.
  const before = await page.getByRole('timer').textContent()
  await page.reload()
  await page.getByRole('timer').waitFor()
  assert.equal(await page.getByRole('radio').nth(0).isChecked(), true, 'answer restored after refresh')
  assert.equal(await page.getByRole('radio').nth(5).isChecked(), true, 'answer restored after refresh')
  const after = await page.getByRole('timer').textContent()
  assert.ok(after <= before, `timer did not reset (${before} → ${after})`)

  // A second device is locked out until it re-verifies.
  const other = await contextFor(user, viewport)
  const otherPage = await other.newPage()
  await otherPage.goto(`${origin}/account/mpt/exam/${mock.slug}`)
  await otherPage.getByRole('heading', { name: /Candidate Verification/ }).waitFor()
  await other.close()

  // Submit → result.
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Submit MPT Mock' }).first().click()
  await page.getByText(/Your result card will be available at/).waitFor({ timeout: 20_000 })
  assert.ok(page.url().endsWith(`/account/mpt/results/${code}`))
  await page.screenshot({ path: `${shots}/${label}-07a-submitted-pending.png`, fullPage: true })

  // 30 minutes after the mock ends: result card and wrong-answer bank open.
  fixture('travel', mock.slug, 230)
  fixture('sweep')
  await page.reload()
  await page.getByText('MPT MOCK RESULT CARD').waitFor({ timeout: 20_000 })
  await page.getByText(/Congratulations on completing CSS Vista MPT Mock/).waitFor()
  assert.match(await page.textContent('body'), slotPattern, 'result card names the sitting and its time')
  assert.ok((await page.textContent('body')).includes(`${roll.slice(0, 3)} ${roll.slice(3)}`), 'roll number on the card')
  await noHorizontalScroll(page, `${label} result`)
  await page.screenshot({ path: `${shots}/${label}-07-result-card.png`, fullPage: true })
  await page.goto(`${origin}/account/mpt/mistakes`)
  await page.getByRole('heading', { name: 'My Wrong MCQs' }).waitFor()
  await page.waitForLoadState('networkidle')
  await noHorizontalScroll(page, `${label} mistakes`)
  await page.screenshot({ path: `${shots}/${label}-07b-wrong-answers.png`, fullPage: true })

  // Section 19 widths: no horizontal scroll on the candidate's pages.
  if (label === 'mobile') {
    for (const width of [320, 360, 390, 414]) {
      await page.setViewportSize({ width, height: 800 })
      for (const path of [`/account/mpt/results/${code}`, `/account/mpt/applications/${code}`, '/account/mpt', '/account/mpt/history', '/account/mpt/performance', '/account/mpt/mistakes']) {
        await page.goto(`${origin}${path}`)
        await page.getByRole('heading', { level: 1 }).first().waitFor()
        await page.waitForLoadState('networkidle')
        await noHorizontalScroll(page, `${width}px ${path}`)
      }
    }
    await page.setViewportSize(viewport)
  }

  // History & performance pages load on direct navigation.
  await page.goto(`${origin}/account/mpt/history`)
  await page.getByText(`CSS MPT Mock ${Number(mock.slug.slice(9))}`).filter({ visible: true }).first().waitFor()
  await page.screenshot({ path: `${shots}/${label}-08-history.png`, fullPage: true })
  await page.goto(`${origin}/account/mpt/performance`)
  await page.getByText('Score over time (completed mocks)').waitFor()
  await page.screenshot({ path: `${shots}/${label}-09-performance.png`, fullPage: true })

  // Legacy direct exam link hands over to the portal, never to the exam.
  await page.goto(`${origin}/gk/quiz?mode=mpt-mock&slot=afternoon`)
  await page.waitForURL(`${origin}/account/mpt`)
  assert.deepEqual(errors, [], `${label}: page errors`)
  await context.close()
  fixture('set', mock.slug, 'status', 'ARCHIVED') // keep the next viewport's run independent
}

step('admin sees who applied and who appeared')
const owner = JSON.parse(readFileSync('test-artifacts/admin-session.json', 'utf8'))
const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await adminContext.addCookies([
  { name: 'cssv_owner_session', value: owner.token, url: origin, httpOnly: true },
  { name: 'cssv_owner_csrf', value: owner.csrf, url: origin },
])
const adminPage = await adminContext.newPage()
await visit(adminPage, `${origin}/sadiaali`)
await adminPage.getByRole('button', { name: 'MPT examinations' }).click()
await adminPage.getByRole('heading', { name: 'MPT examinations' }).waitFor()
await adminPage.getByRole('button', { name: 'Open', exact: true }).first().click()
await adminPage.getByRole('tab', { name: 'Applications' }).waitFor()
await adminPage.getByRole('button', { name: 'Appeared', exact: true }).waitFor()
await adminPage.getByRole('cell', { name: 'Yes', exact: true }).first().waitFor()
await adminPage.screenshot({ path: `${shots}/admin-mpt-applied-appeared.png`, fullPage: true })
await adminContext.close()

step('logged-out visitor: apply leads through account creation and returns')
const anonymous = await contextFor(null, { width: 390, height: 844 })
const anon = await anonymous.newPage()
const openMock = fixture('mock', 180)
await visit(anon, `${origin}/account/mpt/apply/${openMock.slug}`)
await anon.waitForURL(/\/account\?returnTo=/)
assert.ok(decodeURIComponent(anon.url()).includes(`/account/mpt/apply/${openMock.slug}`), 'returnTo preserves the apply page')
await visit(anon, `${origin}/mpt`)
await anon.getByRole('button', { name: 'Apply for MPT Mock' }).click()
await anon.getByRole('dialog').getByText('Create your My CSS Vista account').waitFor()
await anon.screenshot({ path: `${shots}/mobile-10-public-login-modal.png` })
await anonymous.close()

await browser.close()
console.log(`MPT browser journey verified. Screenshots: ${shots}`)
