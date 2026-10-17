/** Bounded artifact lab sample; no field CWV, no INP claim, no backend writes. */
import { chromium } from 'playwright-core'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startArtifactPreview } from './artifact-preview.mjs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const { server, origin } = await startArtifactPreview(resolve(root, 'dist'), { isolateNetwork: true })
const output = process.env.CSSV_PERFORMANCE_OUTPUT || `${root}/test-artifacts/seo-performance.json`
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'], headless: true })
await mkdir(`${root}/test-artifacts`, { recursive: true })
const report = {
  observedAt: new Date().toISOString(),
  method: 'Chromium PerformanceObserver, six fresh-context local artifact samples, no CPU/network throttling; external resources and all API requests blocked; preview-only CSP isolation permits same-origin public study-material/feed JSON and robots.txt fetches. 1.5-second observation after network idle and font readiness. No user interaction/INP measurement. Not field Core Web Vitals; local timings exclude real hosting/network/backend and advertising.',
  pages: [],
}
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    for (const path of ['/', '/study-material/optional/accounting-and-auditing/paper-i-financial-accounting-50-marks', '/css-eligibility-calculator']) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
      const blocked = [], failures = [], errors = []
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url())
        if (request.method() !== 'GET' || url.origin !== origin || url.pathname.startsWith('/api/')) {
          blocked.push(url.origin === origin ? url.pathname : url.origin + url.pathname)
          return route.abort('blockedbyclient')
        }
        return route.continue()
      })
      await context.addInitScript(() => {
        window.__cssvistaLab = { lcp: null, shifts: [], longTasks: [] }
        for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask']) {
          if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (type === 'largest-contentful-paint') window.__cssvistaLab.lcp = { startTime: entry.startTime, size: entry.size, element: entry.element?.tagName || null }
              if (type === 'layout-shift') window.__cssvistaLab.shifts.push({
                value: entry.value, startTime: entry.startTime, hadRecentInput: entry.hadRecentInput,
                sources: entry.sources.map(source => ({
                  element: source.node?.tagName || null,
                  label: source.node?.getAttribute?.('aria-label') || null,
                  previous: source.previousRect.toJSON(), current: source.currentRect.toJSON(),
                })),
              })
              if (type === 'longtask') window.__cssvistaLab.longTasks.push({ startTime: entry.startTime, duration: entry.duration })
            }
          }).observe({ type, buffered: true })
        }
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      page.on('requestfailed', request => failures.push({ url: new URL(request.url()).pathname, error: request.failure()?.errorText }))
      const response = await page.goto(origin + path, { waitUntil: 'networkidle' })
      await page.locator('h1').first().waitFor()
      if (path.startsWith('/study-material/optional/')) {
        // Do not report a skeleton/error loop as the normal loaded article.
        await page.locator('main article h2').first().waitFor()
        if (await page.locator('[data-cssv-ad-state="error"]').count()) throw new Error('Optional notes failed to load; discard the normal-content performance sample')
      }
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1500)
      const metrics = await page.evaluate(() => {
        const lab = window.__cssvistaLab
        let cls = 0, windowValue = 0, first = 0, previous = 0
        for (const entry of lab.shifts.filter(entry => !entry.hadRecentInput)) {
          if (entry.startTime - previous > 1000 || entry.startTime - first > 5000) { first = entry.startTime; windowValue = 0 }
          windowValue += entry.value; previous = entry.startTime; cls = Math.max(cls, windowValue)
        }
        const resources = performance.getEntriesByType('resource').map(entry => ({ path: new URL(entry.name).pathname, initiatorType: entry.initiatorType, duration: entry.duration, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize }))
        return {
          lcp: lab.lcp, cls, layoutShifts: lab.shifts, longTasks: lab.longTasks,
          inp: null, inpReason: 'No representative user interactions; no field data available.',
          navigation: performance.getEntriesByType('navigation').map(entry => ({ responseStart: entry.responseStart, domContentLoaded: entry.domContentLoadedEventEnd, loadEventEnd: entry.loadEventEnd, transferSize: entry.transferSize })),
          paint: performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTime: entry.startTime })),
          resources, resourceCount: resources.length,
          resourceTransferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        }
      })
      report.pages.push({ path, viewport, status: response.status(), ...metrics, blockedRequests: [...new Set(blocked)], requestFailures: failures, pageErrors: errors })
      await context.close()
    }
  }
  // Optional pinned/temporary CLI: never installs packages into the project.
  if (process.env.CSSV_LIGHTHOUSE_CLI) {
    const lighthouseOutput = `${root}/test-artifacts/lighthouse-local-mobile.json`
    const result = await promisify(execFile)(process.env.CSSV_LIGHTHOUSE_CLI, [origin, '--chrome-path=/usr/bin/chromium', '--chrome-flags=--headless --no-sandbox', '--only-categories=performance,accessibility,best-practices,seo', '--blocked-url-patterns=https://*', '--blocked-url-patterns=*/api/*', '--output=json', `--output-path=${lighthouseOutput}`, '--quiet'], { timeout: 180000, maxBuffer: 1024 * 1024 })
    const audit = JSON.parse(await readFile(lighthouseOutput, 'utf8'))
    const requests = audit.audits['network-requests'].details.items
    const externalSuccesses = requests.filter(request => !request.url.startsWith(origin) && request.statusCode >= 200)
    const apiRequests = requests.filter(request => new URL(request.url).pathname.startsWith('/api/'))
    report.lighthouse = { output: lighthouseOutput, stderr: result.stderr, localMobile: true, version: audit.lighthouseVersion, successfulExternalRequests: externalSuccesses.length, apiNetworkRequests: apiRequests.length }
    if (externalSuccesses.length || apiRequests.length) throw new Error('Lighthouse network isolation failed; discard this sample')
  }
} finally {
  await mkdir(`${root}/test-artifacts`, { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2))
  await browser.close()
  server.close()
}
console.log(`Recorded ${report.pages.length} local mobile/desktop lab samples to ${output}; no field CWV or INP determination.`)
