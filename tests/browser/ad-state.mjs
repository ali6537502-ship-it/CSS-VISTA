/** Runtime advertising check. Uses a stub Google response: no real ad requests or clicks. */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { build } from 'esbuild'
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const result = await build({
  stdin: {
    resolveDir: root,
    loader: 'tsx',
    contents: `import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useNavigate } from 'react-router'
import { AdSenseProvider, AuthenticatedAccountAd } from './src/components/Ads'
function Fixture() {
  const [state, setState] = useState('loading')
  const navigate = useNavigate()
  return <AdSenseProvider><div data-cssv-ad-state={state === 'ready' ? undefined : state}>
    <h1>Runtime advertising fixture</h1>
    {['loading','empty','error','ready'].map(s => <button key={s} onClick={() => setState(s)}>{s}</button>)}
    <button onClick={() => navigate('/account')}>Open account</button>
    <AuthenticatedAccountAd />
  </div></AdSenseProvider>
}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[location.pathname]}><Fixture /></MemoryRouter>)`,
  },
  bundle: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.VITE_ADSENSE_SLOT_CONTENT': '""', 'process.env.NODE_ENV': '"production"' },
  alias: { '@': root + 'src' },
  plugins: [{
    name: 'ad-test-session',
    setup(build) {
      build.onResolve({ filter: /^@\/lib\/accountContext$/ }, () => ({ path: 'account', namespace: 'test-only' }))
      build.onResolve({ filter: /^@\/data\/notesBundleOffer$/ }, () => ({ path: 'offer', namespace: 'test-only' }))
      build.onLoad({ filter: /.*/, namespace: 'test-only' }, ({ path }) => ({
        contents: path === 'account'
          ? 'export const useAccount = () => ({ loading: false, user: { id: "test-only" }, passwordRecovery: false })'
          : 'export const isNotesBundleExclusiveWindow = () => false',
      }))
    },
  }],
})
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html')
  res.end(req.url === '/fixture.js' ? result.outputFiles[0].text : '<div id="root"></div><script src="/fixture.js"></script>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
try {
  for (const path of ['/notes', '/account', '/account/dashboard', '/account/english']) {
    const context = await browser.newContext()
    let loaderRequests = 0
    await context.route('https://pagead2.googlesyndication.com/**', route => {
      loaderRequests++
      return route.fulfill({ contentType: 'text/javascript', body: 'window.testAdRequests = 0; window.adsbygoogle = { push: function(){ window.testAdRequests++; } };' })
    })
    await context.addInitScript(() => { window.testDocumentId = crypto.randomUUID() })
    const page = await context.newPage()
    await page.goto(origin + path)
    await page.getByRole('heading', { name: 'Runtime advertising fixture' }).waitFor()
    await page.waitForTimeout(1600)
    assert.equal(loaderRequests, 0, `${path}: loading view must not request loader`)
    await page.getByRole('button', { name: 'empty', exact: true }).click()
    await page.waitForTimeout(1600)
    assert.equal(loaderRequests, 0, `${path}: empty view must not request loader`)
    await page.getByRole('button', { name: 'error', exact: true }).click()
    await page.waitForTimeout(1600)
    assert.equal(loaderRequests, 0, `${path}: error view must not request loader`)
    assert.equal(await page.locator('ins.adsbygoogle').count(), 0)
    await page.getByRole('button', { name: 'ready', exact: true }).click()
    if (path === '/notes') {
      await page.waitForFunction(() => window.adsbygoogle)
      assert.equal(loaderRequests, 1, 'Ready public content loads the official library once')
      const previousDocument = await page.evaluate(() => window.testDocumentId)
      await page.getByRole('button', { name: 'Open account', exact: true }).click()
      await page.waitForURL(origin + '/account')
      await page.getByRole('heading', { name: 'Runtime advertising fixture' }).waitFor()
      assert.notEqual(await page.evaluate(() => window.testDocumentId), previousDocument, 'Ad-free account receives a fresh document, not an SPA page with an executed Google library')
      await page.getByRole('button', { name: 'ready', exact: true }).click()
      await page.waitForTimeout(1600)
      assert.equal(loaderRequests, 1, 'New account document makes no additional Google requests')
      assert.equal(await page.evaluate(() => Boolean(window.adsbygoogle)), false, 'Executed library does not survive into the account')
    } else {
      await page.waitForTimeout(1600)
      assert.equal(loaderRequests, 0, `${path}: signing in does not enable ads on a utility/practice screen`)
    }
    assert.equal(await page.locator('ins.adsbygoogle').count(), 0, 'Account/manual slot stays absent')
    await context.close()
  }
  console.log('PASS runtime ad gate: public loading/error states stay ad-free, ready public content loads once, account utilities remain excluded, and navigation from an executed library gets a clean ad-free document. Stub Google responses only; no backend writes.')
} finally {
  await browser.close()
  server.close()
}
