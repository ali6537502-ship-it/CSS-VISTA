import {after, before, test} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {reviewContrast} from './contrast-review.mjs'

let browser, page
before(async () => {
  browser = await chromium.launch({executablePath: process.env.CSSV_BROWSER_EXECUTABLE || chromium.executablePath(), args: ['--no-sandbox']})
  page = await browser.newPage({viewport: {width: 390, height: 400}})
})
after(async () => {await browser?.close()})
async function measure(style, extras = '', body = 'white') {
  await page.setContent(`<html><head><style>html,body{margin:0;background:${body}}#sample{padding:24px;width:300px;font:16px Arial;${style}}</style></head><body><div id="sample">Reference contrast measurement</div>${extras}</body></html>`)
  return (await reviewContrast(page, [{nodes: [{target: ['#sample']}]}]))[0]
}
test('Reference black/white ratio and restoration of untouched style', async () => {
  const result = await measure('color:black;background:linear-gradient(white,white)')
  assert.equal(result.status, 'RENDERED_CONTRAST_PASS')
  assert.equal(result.worst.ratio, 21)
  assert.equal(result.worst.threshold, 4.5)
  assert.equal(await page.locator('#sample').evaluate(el => el.style.cssText), '')
})
test('Low contrast stays a failure, and large-text threshold is distinct', async () => {
  const small = await measure('color:#888;background:white')
  assert.equal(small.status, 'RENDERED_CONTRAST_FAIL')
  assert(Math.abs(small.worst.ratio - 3.5449) < .01)
  const large = await measure('color:#888;background:white;font-size:24px')
  assert.equal(large.status, 'RENDERED_CONTRAST_PASS')
  assert.equal(large.worst.threshold, 3)
})
test('Transparent foreground is composited; currentColor backgrounds are preserved', async () => {
  const alpha = await measure('color:rgba(0,0,0,.5);background:white')
  assert.equal(alpha.status, 'RENDERED_CONTRAST_FAIL')
  assert(Math.abs(alpha.worst.ratio - 3.9767) < .03)
  const hidden = await measure('color:white;background:currentColor', '', 'black')
  assert.equal(hidden.status, 'RENDERED_CONTRAST_FAIL')
  assert.equal(hidden.worst.ratio, 1)
})
test('Covered, clipped or complex text is unresolved rather than passed', async () => {
  assert.equal((await measure('color:black;background:white', '<div style="position:absolute;inset:0;background:red"></div>')).status, 'MANUAL_OBSCURED_TEXT')
  assert.equal((await measure('color:black;opacity:.5')).status, 'MANUAL_GROUP_OPACITY')
  assert.equal((await measure('color:black;filter:blur(1px)')).status, 'MANUAL_PAINT_FILTER')
  assert.equal((await measure('color:black;text-shadow:1px 1px black')).status, 'MANUAL_TEXT_SHADOW')
  assert.equal((await measure('color:black;white-space:nowrap;font-size:40px')).status, 'MANUAL_CLIPPED_TEXT')
})
test('A clipped ticker measurement is explicitly partial, never full-text certification', async () => {
  await page.setContent('<div class="vista-live-ticker" style="width:100px;overflow:hidden;background:white"><span id="sample" style="white-space:nowrap;color:black">A deliberately long reference announcement extending beyond its viewport</span></div>')
  const result = (await reviewContrast(page, [{nodes: [{target: ['#sample']}]}]))[0]
  assert.equal(result.status, 'RENDERED_VISIBLE_TICKER_PASS')
  assert.equal(result.unmeasured_offscreen_text, true)
})
test('Only the explicitly decorative clock separator receives its reviewed classification', async () => {
  await page.setContent('<div><span id="sample" aria-hidden="true">·</span><time datetime="2026-01-01">12:00</time></div>')
  assert.equal((await reviewContrast(page, [{nodes: [{target: ['#sample']}]}]))[0].status, 'REVIEWED_DECORATIVE_CLOCK_SEPARATOR')
  await page.setContent('<div id="sample" aria-hidden="true" style="color:white;background:white">Important text</div>')
  assert.equal((await reviewContrast(page, [{nodes: [{target: ['#sample']}]}]))[0].status, 'RENDERED_CONTRAST_FAIL')
})
