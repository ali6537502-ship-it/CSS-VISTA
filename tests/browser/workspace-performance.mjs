/** Comparable local artifact benchmark; API responses are sanitized, identical fixtures. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { startArtifactPreview } from './artifact-preview.mjs'

const beforeRoot = process.env.CSSV_PERFORMANCE_BEFORE
if (!beforeRoot) throw Error('Set CSSV_PERFORMANCE_BEFORE to a locally built original artifact')
const baseline = await startArtifactPreview(resolve(beforeRoot))
const current = await startArtifactPreview(resolve('dist'))
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const results = []
const output = 'test-artifacts/workspace-performance'
mkdirSync(output, { recursive: true })
try {
  for (let repeat = 1; repeat <= 3; repeat++) {
    for (const [label, preview, marker] of [['before', baseline, 'Free features'], ['after', current, 'Today’s Study Plan']]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
      const apiRequests = [], unexpected = []
      await context.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.origin !== preview.origin) return route.abort('blockedbyclient')
        if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/workspace-preview.php') return route.fulfill({ json: { enabled: true, user_id: 'performance-fixture' } })
        apiRequests.push(`${route.request().method()} ${url.pathname}`)
        let data
        if (url.pathname === '/api/workspace-release.php') data = { enabled: true }
        else if (url.pathname === '/api/auth/session.php') data = { ok: true, authenticated: true, provider: 'hostinger', user: { id: 'performance-fixture', email: 'benchmark@example.invalid', display_name: 'TEST ONLY Student', profile_complete: true, photo_complete: false, user_metadata: { full_name: 'TEST ONLY Student' } } }
        else if (url.pathname === '/api/pro-release.php') data = { paused: true }
        else if (url.pathname === '/api/student/progress.php') data = route.request().method() === 'GET' ? { payload: {} } : { ok: true, updated_at: '2026-10-26T12:00:00Z' }
        else if (url.pathname === '/api/student/membership.php') data = { membership: { status: 'free', starts_at: null, expires_at: null }, product: { name: 'Pro', collection_enabled: false }, orders: [] }
        else if (url.pathname === '/api/mpt/flow.php') data = { ok: true, enabled: false }
        else if (url.pathname === '/api/notifications.php') data = { ok: true, updates: [] }
        else if (url.pathname === '/api/content.php') data = { data: null }
        else { unexpected.push(url.pathname); return route.fulfill({ status: 503, json: { error: 'fixture_unavailable', message: 'Unavailable in isolated benchmark' } }) }
        return route.fulfill({ json: data })
      })
      await context.addInitScript(() => {
        localStorage.setItem('cssvista:progress-owner', 'performance-fixture')
        window.__metrics = { lcp: null, cls: 0, shifts: [] }
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__metrics.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) { window.__metrics.cls += entry.value; window.__metrics.shifts.push({ time: entry.startTime, value: entry.value, sources: (entry.sources || []).map(source => ({ node: source.node?.outerHTML?.slice(0, 300), previous: source.previousRect.toJSON(), current: source.currentRect.toJSON() })) }) } }).observe({ type: 'layout-shift', buffered: true })
      })
      const page = await context.newPage(), errors = []
      page.on('pageerror', error => errors.push(error.message))
      const client = await context.newCDPSession(page)
      await client.send('Network.enable')
      await client.send('Network.setCacheDisabled', { cacheDisabled: true })
      await client.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 400 * 1024, uploadThroughput: 100 * 1024, connectionType: 'cellular4g' })
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await page.goto(preview.origin + '/account/dashboard')
      await page.getByRole('heading', { name: marker, exact: true }).waitFor({ timeout: 60000 })
      const usefulContentMs = await page.evaluate(() => performance.now())
      await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500)
      const metrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource')
        const code = resources.filter(resource => /\.(?:js|css)(?:\?|$)/.test(resource.name))
        return { ...window.__metrics, codeBytes: code.reduce((sum, entry) => sum + entry.encodedBodySize, 0), codeTransferBytes: code.reduce((sum, entry) => sum + entry.transferSize, 0), codeRequests: code.length, requests: resources.length, assets: code.map(entry => ({ name: new URL(entry.name).pathname, bytes: entry.encodedBodySize })) }
      })
      assert.deepEqual(errors, [], `${label} page errors`)
      assert.deepEqual(unexpected, [], `${label} unexpected API requests`)
      results.push({ label, repeat, usefulContentMs, ...metrics, apiRequests })
      if (repeat === 1) await page.screenshot({ path: `${output}/${label}-390.png`, fullPage: true })
      await context.close()
    }
  }
  const median = numbers => numbers.slice().sort((a, b) => a - b)[Math.floor(numbers.length / 2)]
  const summary = Object.fromEntries(['before', 'after'].map(label => [label, Object.fromEntries(['usefulContentMs', 'lcp', 'cls', 'codeBytes', 'codeTransferBytes', 'codeRequests', 'requests'].map(key => [key, median(results.filter(row => row.label === label).map(row => row[key]))]))]))
  writeFileSync(`${output}/results.json`, JSON.stringify({ before: execFileSync('git', ['-C', resolve(beforeRoot, '..'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), conditions: { viewport: '390x844', cpuSlowdown: 4, latencyMs: 100, downloadKiBps: 400, uploadKiBps: 100, runs: 3, cache: 'disabled; fresh browser context per run', APIs: 'identical sanitized free-account responses; no live account or production API', transport: 'local preview; uncompressed assets' }, summary, results }, null, 2))
  console.log(JSON.stringify(summary))
} finally { await browser.close(); baseline.server.close(); current.server.close() }
