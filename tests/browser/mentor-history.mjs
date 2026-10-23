import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444',root=new URL('../../',import.meta.url).pathname,env={...process.env}
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback fixtures only')
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{cwd:root,env,encoding:'utf8'}).trim():execFileSync('php',args,{cwd:root,env,encoding:'utf8'}).trim()
const email=`mentor-history-browser-${Date.now()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email)
php('tests/precis/fixture.php','activate',id)
const snapshot=()=>JSON.parse(php('tests/mentor/fixture.php','snapshot',id))
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
async function signin(tab,address=email){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(address);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();await tab.waitForURL('**/account/dashboard')}
async function save(name){const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/student/mentor.php'&&r.request().method()==='POST');await page.getByRole('button',{name,exact:true}).click();const reply=await pending;assert.equal(reply.status(),200,JSON.stringify(await reply.json()))}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mentor horizontal overflow')}
try{
 await signin(page)
 const csrf=(await context.cookies()).find(c=>c.name==='cssv_csrf').value
 const attempt=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]}});assert.equal(attempt.status(),200)
 const catalog=await(await context.request.get(base+'/api/student/mentor.php')).json()
 await page.goto(base+'/account/answer-performance?new=question')
 await page.getByLabel('Subject',{exact:true}).selectOption(catalog.catalog[0].slug);await page.getByLabel('Topic',{exact:true}).fill('TEST ONLY account continuity');await page.getByLabel('Question',{exact:true}).fill('TEST ONLY independently authored practice question for a human mentor.');await save('Save question')
 await page.getByRole('heading',{name:'Write independently',exact:true}).waitFor();await save('I Have Written This Answer')
 await page.getByRole('heading',{name:'Add Mentor Evaluation',exact:true}).waitFor();await page.getByLabel('Obtained marks',{exact:true}).fill('0');await page.getByLabel('Maximum marks',{exact:true}).fill('20');await page.getByLabel('Mentor comment (optional)',{exact:true}).fill('TEST ONLY original comment, preserved verbatim.');await save('Save mentor evaluation')
 await page.getByRole('heading',{name:'Entry history',exact:true}).waitFor();await page.getByRole('button',{name:'Correct entered result',exact:true}).click()
 await page.getByLabel('Obtained marks',{exact:true}).fill('10');await page.getByLabel('Mentor comment (optional)',{exact:true}).fill('TEST ONLY corrected transcription, not AI feedback.');await page.getByLabel('Reason for correction',{exact:true}).fill('TEST ONLY transcription corrected against mentor sheet.');await save('Save corrected entry')
 await page.getByText('Entry 2 · 10/20 · 50%',{exact:true}).waitFor();await page.getByText('Entry 1 · 0/20 · 0%',{exact:true}).waitFor()
 const original=page.url(),answerId=new URL(original).searchParams.get('id')
 await save('Start a repeat attempt');await page.getByRole('heading',{name:'Write independently',exact:true}).waitFor();await save('I Have Written This Answer')
 await page.getByRole('heading',{name:'Add Mentor Evaluation',exact:true}).waitFor();await page.getByLabel('Obtained marks',{exact:true}).fill('15');await page.getByLabel('Maximum marks',{exact:true}).fill('20');await page.getByLabel('Mentor comment (optional)',{exact:true}).fill('TEST ONLY separate repeat comment.');await save('Save mentor evaluation')
 await page.getByRole('heading',{name:'Same-question history',exact:true}).waitFor()
 await page.goto(original);await page.getByText('Entry 2 · 10/20 · 50%',{exact:true}).waitFor()
 const before=snapshot(),record=await(await context.request.get(base+'/api/student/mentor.php?id='+answerId)).json()
 assert.equal(before.answers,2);assert.equal(before.evaluations,3)
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await overflow()}
 php('tests/pro/fixture.php','expire',id);await page.reload();await page.getByText('Your saved questions, mentor marks, comments and correction history are retained. Renew Pro to reopen your records.',{exact:true}).waitFor()
 assert.equal(await page.getByRole('heading',{name:'Entry history',exact:true}).count(),0);assert.equal(await page.getByRole('link',{name:'Read saved attempts',exact:true}).count(),0)
 assert.equal((await context.request.get(base+'/api/student/mentor.php?id='+answerId)).status(),403)
 assert.equal((await context.request.post(base+'/api/student/mentor.php',{headers:{'X-CSRF-Token':csrf},data:{action:'retry_save',id:answerId,expected_version:4,request_id:crypto.randomUUID()}})).status(),403)
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await overflow()}
 await page.setViewportSize({width:390,height:1000});mkdirSync(root+'/test-artifacts',{recursive:true});await page.screenshot({path:root+'/test-artifacts/mentor-expired-mobile.png',fullPage:true})
 assert.deepEqual(snapshot(),before,'Expiry or refused retry changed mentor records')
 php('tests/precis/fixture.php','activate',id);await page.reload();await page.getByText('Entry 2 · 10/20 · 50%',{exact:true}).waitFor();await page.getByText('Entry 1 · 0/20 · 0%',{exact:true}).waitFor();await page.getByRole('heading',{name:'Same-question history',exact:true}).waitFor()
 await page.getByText('TEST ONLY original comment, preserved verbatim.',{exact:true}).waitFor();await page.getByText('Correction: TEST ONLY transcription corrected against mentor sheet.',{exact:true}).waitFor()
 assert.deepEqual(await(await context.request.get(base+'/api/student/mentor.php?id='+answerId)).json(),record);assert.deepEqual(snapshot(),before)
 const device=await browser.newContext({ignoreHTTPSErrors:true}),tab=await device.newPage();await signin(tab);await tab.goto(original);await tab.getByText('Entry 1 · 0/20 · 0%',{exact:true}).waitFor();await device.close()
 const otherEmail=`mentor-history-other-${Date.now()}@example.invalid`,otherId=php('tests/current-affairs/setup.php','user',otherEmail);php('tests/precis/fixture.php','activate',otherId)
 const other=await browser.newContext({ignoreHTTPSErrors:true}),otherPage=await other.newPage();await signin(otherPage,otherEmail);assert.equal((await other.request.get(base+'/api/student/mentor.php?id='+answerId)).status(),404);await other.close()
 php('tests/pro/release-fixture.php','pause');await page.reload();await page.getByRole('heading',{name:'CSS Vista Pro is temporarily unavailable',exact:true}).waitFor();assert.equal((await context.request.get(base+'/api/student/mentor.php?id='+answerId)).status(),503)
 assert.equal(php('tests/mentor/fixture.php','usage',id),'0');assert.deepEqual(errors,[])
 console.log('PASS mentor browser: actual question/written/zero-mark/correction/repeat workflow; expiry paywall and truthful retention notice; unchanged native rows and exact renewed records; comments/corrections/first-repeat history, second-device persistence, other-account denial, 320–1440 widths, pause priority and zero AI operations')
}catch(error){console.log(error.message);mkdirSync(root+'/test-artifacts',{recursive:true});await page.screenshot({path:root+'/test-artifacts/mentor-history-failure.png',fullPage:true});console.log('Mentor browser failed at',new URL(page.url()).pathname,'alerts:',await page.getByRole('alert').allTextContents());throw error}finally{php('tests/pro/release-fixture.php','restore');await browser.close()}
