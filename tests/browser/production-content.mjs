/** Read-only live rendering audit. Blocks ads, third parties and all writes. */
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { primaryContentText, contentFingerprint, shingles, similarity } from '../../scripts/lib/content-quality.mjs'
const origin = 'https://www.css-vista.com'
const paths = ['/', '/subjects/compulsory/current-affairs', '/subjects/optional', '/vistagram', '/vistagram/pakistan-financial-inclusion-digital-finance', '/current-affairs-daily', '/current-affairs-daily/2026-10-30', '/journal', '/journal/opinion-ali-hassan', '/book-summaries', '/book-summaries/why-nations-fail', '/past-papers', '/past-papers/ppsc/2024', '/css-mcqs', '/notes', '/study-material', '/grammar-course', '/study-tools', '/about', '/contact', '/editorial-policy', '/privacy-policy', '/account', '/answer-timer']
const output = process.env.CSSV_EVIDENCE_DIR || 'artifacts/production-content'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const report = { observedAt: new Date().toISOString(), method: 'Read-only ordinary and crawler HTTP plus desktop/mobile Chromium; real advertising and third parties blocked.', pages: [] }
try {
 for (const path of paths) {
  const ordinary = await fetch(origin + path).then(async r => ({status:r.status, html:await r.text()}))
  const crawler = await fetch(origin + path, {headers:{'user-agent':'Googlebot/2.1 (+http://www.google.com/bot.html)'}}).then(async r => ({status:r.status, html:await r.text()}))
  const initial = primaryContentText(ordinary.html), crawled = primaryContentText(crawler.html)
  for (const width of [390, 1366]) {
   const context = await browser.newContext({viewport:{width,height:900}})
   await context.route('**/*', route => {
    const u = new URL(route.request().url())
    return route.request().method() === 'GET' && u.origin === origin ? route.continue() : route.abort()
   })
   const page = await context.newPage(), errors=[]
   page.on('pageerror', e=>errors.push(e.message))
   await page.goto(origin+path,{waitUntil:'networkidle',timeout:45000})
   await page.locator('main').first().waitFor({timeout:15000})
   await page.locator('h1').first().waitFor({timeout:15000})
   const state = await page.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(n=>n.textContent),canonical:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,main:document.querySelector('main').outerHTML,overflow:document.documentElement.scrollWidth>innerWidth+1,adLoader:[...document.scripts].some(s=>s.src.includes('adsbygoogle.js'))}))
   const rendered = primaryContentText(state.main)
   const record={path,width,status:ordinary.status,crawlerStatus:crawler.status,crawlerEquivalent:contentFingerprint(initial)===contentFingerprint(crawled),initialCharacters:initial.length,renderedCharacters:rendered.length,initialRenderedSimilarity:similarity(shingles(initial),shingles(rendered)),...state,errors}
   delete record.main
   report.pages.push(record)
   await writeFile(`${output}/${path.replaceAll('/','_')||'home'}-${width}.txt`,rendered)
   if (['/','/book-summaries/why-nations-fail','/subjects/compulsory/current-affairs'].includes(path)) await page.screenshot({path:`${output}/${path.replaceAll('/','_')||'home'}-${width}.png`,fullPage:true})
   console.log(path,width,record.crawlerEquivalent,record.initialRenderedSimilarity.toFixed(2),state.overflow,errors)
   await context.close()
  }
 }
} finally { await browser.close(); await writeFile(output+'/report.json',JSON.stringify(report,null,2)) }
if(report.pages.some(p=>!p.crawlerEquivalent||p.errors.length||p.overflow||p.status!==200||!p.renderedCharacters||(p.path==='/subjects/compulsory/current-affairs' && (p.initialRenderedSimilarity<0.95 || !p.robots?.includes('noindex') || p.adLoader))))process.exitCode=1
