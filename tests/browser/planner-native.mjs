import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { isolateNetwork } from './isolated-network.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback only')
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const email=`planner-ui-${Date.now()}@example.invalid`
execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php','tests/current-affairs/setup.php','user',email],{env})
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000},reducedMotion:'reduce'})
await isolateNetwork(context,base)
const page=await context.newPage(),errors=[]
page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message))
mkdirSync('test-artifacts/planner-restructure',{recursive:true})
try {
 await page.goto(base+'/account')
 await page.getByLabel('Email address',{exact:true}).fill(email)
 await page.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password')
 await page.getByRole('button',{name:'Sign in securely',exact:true}).click()
 await page.waitForURL('**/account/dashboard')
 await page.goto(base+'/account/tasks')
 await page.getByText('Your agenda is open',{exact:true}).waitFor()
 await page.screenshot({path:'test-artifacts/planner-restructure/native-empty-1440.png',fullPage:true})
 await page.goto(base+'/account/preparation?new=attempt')
 await page.getByLabel('Target CSS year',{exact:true}).fill('2027')
 await page.getByLabel('Daily study time (minutes)',{exact:true}).fill('60')
 await page.getByRole('button',{name:'Save preparation attempt',exact:true}).click()
 await page.getByRole('heading',{name:'CSS 2027',exact:true}).waitFor()
 const attempt=new URL(page.url()).searchParams.get('attempt');assert.ok(attempt)
 await page.getByRole('combobox',{name:'Study track',exact:true}).selectOption('islamic-studies')
 await page.getByRole('button',{name:'Save study track',exact:true}).click()
 await page.getByRole('button',{name:'Review suggested plan',exact:true}).click()
 await page.getByRole('button',{name:'Save reviewed plan',exact:true}).click()
 await page.locator('.prep-task').first().waitFor()
 await page.reload();await page.locator('.prep-task').first().waitFor()
 const task=page.locator('.prep-task').first()
 await task.getByText('Record work or reschedule',{exact:true}).click()
 const minutes=task.getByLabel('Additional minutes studied',{exact:true})
 await minutes.fill('1')
 // A partial native entry keeps the remaining allocation and existing task identity.
 await task.getByRole('button',{name:'Save partial work',exact:true}).click()
 await page.locator('.prep-task').filter({hasText:'1 minutes recorded'}).first().waitFor()
 for(const width of [390,1440]) {
  await page.setViewportSize({width,height:1000})
  for(const [label,id] of [['Today’s plan','plan'],['Coverage','coverage'],['Reading & revision','reading'],['Preparation evidence','readiness'],['Reviews','reviews'],['History','history'],['Settings','settings']]) {
   await page.getByRole('navigation',{name:'Attempt workspace',exact:true}).getByRole('button',{name:label,exact:true}).click()
   await page.waitForURL(url=>url.searchParams.get('view')===id)
   await page.locator('.prep-workspace').waitFor()
   if(id==='reading' && new URL(page.url()).searchParams.get('kind')!=='vistagram') { await page.getByRole('link',{name:'Open free Vistagram reading',exact:true}).waitFor(); await page.screenshot({path:'test-artifacts/planner-restructure/native-reading-free-access.png',fullPage:true}); await page.getByRole('link',{name:'Open free Vistagram reading',exact:true}).click(); await page.locator('.prep-workspace').waitFor() }
   if(id==='settings')await page.getByLabel('Target CSS year',{exact:true}).waitFor()
   else await page.getByRole('heading',{name:{plan:'Continue learning',coverage:'Coverage matrix',reading:'Connect what you read',readiness:'Preparation evidence',reviews:'Progress reviews',history:'Saved plan history'}[id],exact:true}).waitFor()
   await page.waitForFunction(()=>!Array.from(document.querySelectorAll('[role=status]')).some(el=>el.textContent.trim().startsWith('Loading')))
   await page.evaluate(()=>document.fonts.ready)
   assert.equal(new URL(page.url()).searchParams.get('attempt'),attempt)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} overflow at ${width}`)
   await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)})
   await page.screenshot({path:`test-artifacts/planner-restructure/native-attempt-${id}-${width}.png`,fullPage:true});await page.screenshot({path:`test-artifacts/planner-restructure/native-attempt-${id}-${width}-viewport.png`})
  }
 }
 await page.goto(base+`/account/preparation?attempt=${attempt}&view=plan`)
 await page.locator('.prep-task').filter({hasText:'1 minutes recorded'}).first().waitFor()
 assert.deepEqual(errors,[])
 console.log('PASS: native empty planner; attempt creation, track selection, reviewed plan save, partial-work recording and refresh; seven native planner views at mobile/desktop with original attempt identity.')
} catch(error) { console.error({url:page.url(),headings:await page.getByRole('heading').allTextContents(),alerts:await page.getByRole('alert').allTextContents()});await page.screenshot({path:'test-artifacts/planner-restructure/native-failure.png',fullPage:true});throw error } finally {await browser.close()}
