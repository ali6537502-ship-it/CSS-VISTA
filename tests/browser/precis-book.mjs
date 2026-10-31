import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback fixtures only')
const env = { ...process.env }
for (const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[key]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER
  ? execFileSync('docker', ['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args], { env, encoding:'utf8' }).trim()
  : execFileSync('php', args, { env, encoding:'utf8' }).trim()
const email = `precis-book-${randomUUID()}@example.invalid`
php('tests/current-affairs/setup.php', 'user', email)
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || chromium.executablePath(), headless:true, args:['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors:true, viewport:{width:390,height:1000}, reducedMotion:'reduce' })
await isolateNetwork(context, base)
const page = await context.newPage(), errors = [], evaluations = []
page.on('pageerror', error => errors.push(error.message))
page.on('request', request => { if (request.method() === 'POST' && request.postData()?.includes('"evaluate"')) evaluations.push(request.url()) })
try {
 const login = await context.request.post(base+'/api/auth/login.php', { data:{email,password:'TEST ONLY native fixture password'} })
 assert.equal(login.status(),200)
 const csrf = decodeURIComponent((await context.cookies()).find(cookie => cookie.name === 'cssv_csrf').value)
 const attempt = await context.request.post(base+'/api/student/learning.php', { headers:{'X-CSRF-Token':csrf}, data:{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,optional_subject_ids:[],daily_minutes:60,stage:'starting'} })
 assert.equal(attempt.status(),200)
 const attemptId = (await attempt.json()).attempt_id
 await page.goto(base+'/account/precis')
 await page.getByRole('heading',{name:'1. What a Précis Really Is',exact:true}).waitFor()
 assert.equal(await page.getByRole('navigation',{name:'Handbook chapters'}).getByRole('link').count(),25)
 assert.equal(await page.getByRole('button',{name:'Start reading',exact:true}).count(),0)
 await page.getByRole('link',{name:'18. Worked Examples: Beginner to Advanced',exact:true}).click()
 await page.getByRole('heading',{name:'Example 1: Simple contrast',exact:true}).waitFor()
 await page.getByText('Read the handbook response',{exact:true}).first().click()
 await page.getByRole('heading',{name:'Beyond Material Wealth',exact:true}).waitFor()
 await page.getByRole('link',{name:'Write my own response',exact:true}).first().click()
 await page.getByRole('heading',{name:'Write a Précis',exact:true}).waitFor()
 await page.getByLabel('Save my work under',{exact:true}).selectOption(attemptId)
 await page.getByRole('button',{name:'2. Identify',exact:true}).click()
 await page.getByLabel('One-sentence controlling idea',{exact:false}).fill('TEST ONLY material comfort does not guarantee lasting happiness.')
 await page.getByRole('button',{name:'7. Draft',exact:true}).click()
 const first = 'TEST ONLY wealth provides comfort, but lasting happiness also depends on relationships and inner peace.'
 await page.getByLabel('Your independent Précis',{exact:false}).fill(first)
 await page.getByRole('button',{name:'8. Title',exact:true}).click()
 await page.getByLabel('Your title',{exact:false}).fill('TEST ONLY Beyond Wealth')
 await page.getByRole('button',{name:'Save my Précis',exact:true}).click()
 await page.getByRole('heading',{name:'Saved Précis and revision history',exact:true}).waitFor()
 const originalUrl = new URL(page.url()), writingId = originalUrl.searchParams.get('writing'), firstVersion = originalUrl.searchParams.get('version')
 assert.ok(writingId && firstVersion)
 await page.reload()
 await page.getByRole('heading',{name:'Saved Précis and revision history',exact:true}).waitFor()
 await page.getByRole('link',{name:'Revise latest version',exact:true}).click()
 await page.getByRole('heading',{name:'Revise your saved Précis',exact:true}).waitFor()
 await page.getByRole('button',{name:'7. Draft',exact:true}).click()
 assert.equal(await page.getByLabel('Your independent Précis',{exact:false}).inputValue(),first)
 const revised = 'TEST ONLY material comfort cannot guarantee happiness, which also depends on supportive relationships and inner peace.'
 await page.getByLabel('Your independent Précis',{exact:false}).fill(revised)
 await page.getByRole('button',{name:'Save my rewrite',exact:true}).click()
 await page.getByRole('heading',{name:'Saved Précis and revision history',exact:true}).waitFor()
 assert.equal(new URL(page.url()).searchParams.get('writing'),writingId,'A revision created another writing record')
 const savedVersion = new URL(page.url()).searchParams.get('version')
 assert.notEqual(savedVersion,firstVersion)
 await page.getByLabel('Compare with an earlier version',{exact:false}).selectOption(firstVersion)
 await page.getByRole('heading',{name:'What changed between your drafts',exact:true}).waitFor()
 await page.getByRole('button',{name:'Compare with the handbook model',exact:true}).click()
 await page.getByRole('heading',{name:'Beyond Material Wealth',exact:true}).waitFor()
 await page.goto(base+`/account/precis?writing=${writingId}&version=${firstVersion}`)
 await page.getByRole('heading',{name:'Saved Précis and revision history',exact:true}).waitFor()
 assert.equal(await page.getByLabel('Saved version',{exact:false}).inputValue(),firstVersion,'An older saved-version link was ignored')
 for (const width of [320,390,768,1440]) { await page.setViewportSize({width,height:1000}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'History overflow at '+width) }
 await page.goto(base+'/account/precis?chapter=24')
 await page.getByRole('heading',{name:'Appendix B. Error-Correction Bank',exact:true}).waitFor()
 for (const width of [320,390,768,1440]) { await page.setViewportSize({width,height:1000}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Book table overflow at '+width) }
 assert.deepEqual(errors,[])
 assert.deepEqual(evaluations,[],'Book practice requested external evaluation')
 mkdirSync('test-artifacts',{recursive:true})
 await page.screenshot({path:'test-artifacts/precis-book-desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:1000})
 await page.screenshot({path:'test-artifacts/precis-book-mobile.png',fullPage:true})
 console.log('PASS: free native book reading without a schedule; all chapters; worked examples; saved draft reopen; same-record revision; older-version deep link; model comparison; 320–1440px; no evaluation dispatch. Original missing book text remains a source-review limitation.')
} catch (error) {
 console.error('Précis book failure at',page.url(),'alerts:',await page.getByRole('alert').allTextContents())
 mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/precis-book-failure.png',fullPage:true}).catch(()=>{})
 throw error
} finally { await browser.close() }
