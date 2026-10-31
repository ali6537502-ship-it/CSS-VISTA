/** Browser regression test of the built answer-writing timer, on loopback only.
 * Never touches a student account, production site or real provider APIs.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { startArtifactPreview } from './artifact-preview.mjs'

const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const { server, origin } = await startArtifactPreview(resolve(root, 'dist'))
const browser = await chromium.launch({
  executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
})
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
await context.route('**/*', route => {
  const req = route.request()
  if (req.method() !== 'GET' || new URL(req.url()).origin !== origin) return route.abort('blockedbyclient')
  return route.continue()
})
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: async (kind) => {
        if (kind !== 'screen') throw new Error('Unexpected wake lock kind')
        const target = new EventTarget()
        return Object.assign(target, {
          released: false,
          async release() { this.released = true; this.dispatchEvent(new Event('release')) },
        })
      },
    },
  })
})
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))

try {
  await page.goto(origin + '/answer-timer')
  await page.getByRole('button', { name: 'Single Question Timer' }).waitFor()
  assert.equal(await page.getByRole('timer', { name: 'Time remaining' }).textContent(), '35:00')
  assert.equal(await page.getByRole('button', { name: 'Ask my permission' }).count() > 0
    || await page.getByText('Not supported in this browser').count() > 0
    || await page.getByText('Blocked in browser settings').count() > 0, true)

  await page.getByRole('button', { name: 'Keep screen on' }).click()
  assert.equal(await page.getByRole('button', { name: /Requested · Turn off/ }).count(), 1,
    'Wake-lock toggle clearly indicates requested, not already active')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByText('Screen awake is active while this page stays visible.', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.equal(await page.getByText('Screen awake is active while this page stays visible.', { exact: false }).count(), 0,
    'Screen wake lock status is hidden once timer is paused')

  // Seed from a non-timer route; otherwise a pagehide handler on the old timer
  // correctly persists its current clock over this simulated saved session.
  await page.goto(origin + '/')
  await page.evaluate(() => localStorage.setItem('cssvista:single-answer-timer', JSON.stringify({
    minutes: 35, question: 'A paused restored question', remaining: -50, running: false, savedAt: 1_000_000,
  })))
  await page.goto(origin + '/answer-timer')
  await page.getByRole('timer', { name: 'Elapsed overtime' }).waitFor()
  assert.equal(await page.getByRole('timer', { name: 'Elapsed overtime' }).textContent(), '-00:50')
  await page.getByRole('button', { name: /Resume/ }).last().click()
  await page.waitForTimeout(1250)
  assert.match(await page.getByRole('timer', { name: 'Elapsed overtime' }).textContent(), /^-00:5[1-3]$/)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: /Resume/ }).last().waitFor()
  const paused = await page.getByRole('timer', { name: 'Elapsed overtime' }).textContent()
  await page.waitForTimeout(1250)
  assert.equal(await page.getByRole('timer', { name: 'Elapsed overtime' }).textContent(), paused,
    'Pausing stops the signed clock')

  await page.evaluate(() => localStorage.setItem('cssvista:paper-attempt', JSON.stringify({
    questions: ['Q1', 'Q2', 'Q3', 'Q4'], current: 2, paused: true,
    times: [2600, 2700, null, null], questionElapsedBase: 700,
    totalLeftBase: 5200, runningStartedAt: null,
  })))
  await page.reload()
  await page.getByRole('button', { name: 'Full Paper: MCQs + 4 Answers' }).click()
  await page.getByRole('button', { name: 'Resume attempt' }).click()
  await page.getByText('33:20', { exact: true }).waitFor()
  await page.getByText('86:40', { exact: true }).waitFor()
  await page.waitForTimeout(1100)
  assert.equal(await page.getByText('33:20', { exact: true }).count(), 1,
    'Paused paper time stays fixed after restore')
  assert.equal(await page.getByRole('button', { name: 'Resume', exact: true }).count(), 1)

  // Finish before the corrupted-storage test so pagehide cannot re-save the
  // previously running paper over the intentionally malformed fixture.
  await page.getByRole('button', { name: 'End paper' }).click()
  await page.getByText('Paper attempt complete').waitFor()
  await page.evaluate(() => localStorage.setItem('cssvista:paper-attempt', '{"questions":["Q1"]}'))
  await page.reload()
  await page.getByRole('button', { name: 'Full Paper: MCQs + 4 Answers' }).click()
  assert.equal(await page.getByRole('button', { name: 'Resume attempt' }).count(), 0,
    'Corrupted local storage is ignored, not offered as a resumable paper')
  // Exercise the 3-hour whole-paper flow with a simulated 10-minute MCQ attempt.
  // Leave the timer page before writing a mock snapshot, so its pagehide handler
  // cannot replace the fixture with a previous attempt during navigation.
  await page.goto(origin + '/')
  await page.evaluate(() => localStorage.setItem('cssvista:paper-attempt', JSON.stringify({
    questions: ['Q1', 'Q2', 'Q3', 'Q4'], current: -1, paused: true,
    times: [null, null, null, null], questionTargetSeconds: 1800,
    mcqElapsedSeconds: null, questionElapsedBase: 600,
    totalLeftBase: 10200, runningStartedAt: null,
  })))
  await page.goto(origin + '/answer-timer')
  await page.getByRole('button', { name: 'Full Paper: MCQs + 4 Answers' }).click()
  await page.getByRole('button', { name: 'Resume attempt' }).click()
  await page.getByText('MCQ section (20 questions)', { exact: true }).waitFor()
  await page.getByRole('button', { name: /^Finish MCQs [—-] start Q1$/ }).click()
  await page.getByText('MCQs completed in 10:00', { exact: false }).waitFor()
  await page.getByText('Current answer allocation: 42:30', { exact: true }).waitFor()
  // Finishing Q1 promptly transfers the saved writing time to the remaining answers.
  await page.getByRole('button', { name: /^Finish Q1 [—-] start Q2$/ }).click()
  await page.getByText(/Current answer allocation: 56:/).waitFor()
  await page.getByRole('button', { name: 'End paper' }).click()
  assert.deepEqual(errors, [], 'No timer JavaScript page errors')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true,
    'Timer setup fits small phones without horizontal scrolling')
  console.log('PASS answer timer: signed overtime, pause, preserved paused paper clocks, corrupted storage, mobile width, no page errors')
} catch (error) {
  mkdirSync('test-artifacts/answer-timer', { recursive: true })
  await page.screenshot({ path: 'test-artifacts/answer-timer/failure.png', fullPage: true }).catch(() => {})
  console.error(await page.evaluate(() => ({ scroll: scrollY, width: innerWidth, height: innerHeight, buttons: [...document.querySelectorAll('button')].filter(button => button.textContent?.includes('Full Paper:')).map(button => ({ text: button.textContent, box: button.getBoundingClientRect().toJSON() })) })))
  throw error
} finally {
  await context.close()
  await browser.close()
  server.close()
}
