import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
import { startArtifactPreview } from './artifact-preview.mjs'
const { server, origin } = await startArtifactPreview(resolve(import.meta.dirname, '../../dist'))
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless:true,args:['--no-sandbox'] })
try {
 for(const width of [390,1366]){
  const c=await browser.newContext({viewport:{width,height:900}})
  await c.route('**/*',r=>r.request().method()==='GET'&&new URL(r.request().url()).origin===origin&&!new URL(r.request().url()).pathname.startsWith('/api/')?r.continue():r.abort())
  const p=await c.newPage()
  await p.goto(origin+'/',{waitUntil:'networkidle'})
  assert.equal(await p.locator('a[href^="/book-summaries"]').count(),0,'No sidebar, homepage or footer summary links')
  assert.ok(await p.locator('a[href="/books"]').count(),'Original books remain discoverable')
  const r=await p.goto(origin+'/book-summaries/why-nations-fail',{waitUntil:'domcontentloaded'})
  assert.equal(r.status(),410)
  assert.match(await p.locator('h1').innerText(),/removed/)
  assert.equal(await p.locator('script[src*="adsbygoogle"]').count(),0)
  assert.match(await p.locator('meta[name=robots]').getAttribute('content'),/noindex/)
  await p.getByRole('link',{name:'Notes',exact:true}).click()
  await p.getByRole('heading', { name: 'CSS Notes by Sir Ali Hassan Sargana', exact: true }).waitFor()
  await p.locator('summary').filter({ hasText: 'Sample notes' }).first().click()
  await p.locator('a[href^="/notes/view/"]').first().waitFor({ state: 'visible' })
  assert.ok(await p.locator('a[href^="/notes/view/"]').count(), 'Remaining note samples still load')
  await c.close()
 }
 console.log('PASS mobile/desktop removal: no summary discovery links, 410 notice without ads, original books and notes preserved.')
}finally{await browser.close();server.close()}
