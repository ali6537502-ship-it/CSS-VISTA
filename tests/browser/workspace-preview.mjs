/** Global workspace rollout against the real native auth/data/release services. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
import { selectWorkspacePreview } from './preview-fixture.mjs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env={...process.env}
for (const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[key]
const php=(...args)=>(process.env.CSSV_TEST_PHP_CONTAINER ? execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}) : execFileSync('php',args,{env,encoding:'utf8'})).trim()
php('tests/pro/fixture.php','reset-rate')
const emails=['selected','other'].map(label=>`preview-${label}-${randomUUID()}@example.invalid`)
for (const email of emails) php('tests/current-affairs/setup.php','user',email)
selectWorkspacePreview(emails[0])
php('tests/workspace-preview/fixture.php','paused')
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},reducedMotion:'reduce',hasTouch:true})
await isolateNetwork(context,base)
const page=await context.newPage(), errors=[], results=[]
page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message))
const output='test-artifacts/workspace-preview'
mkdirSync(output,{recursive:true})
const login=async index=>{
  const response=await context.request.post(base+'/api/auth/login.php',{data:{email:emails[index],password:'TEST ONLY native fixture password'}})
  assert.equal(response.status(),200); return (await response.json()).user.id
}
async function logout() {
  const token=(await context.cookies()).find(cookie=>cookie.name==='cssv_csrf')?.value
  assert.equal((await context.request.post(base+'/api/auth/logout.php',{headers:{'X-CSRF-Token':decodeURIComponent(token)},data:{}})).status(),200)
}
async function classic() {
  await page.getByRole('heading',{name:'Free features',exact:true}).waitFor()
  assert.equal(await page.locator('.student-workspace').count(),0)
}
async function check(name,run) {
  console.log('CHECK',name)
  try { await run();results.push({name,status:'passed'});console.log('PASS',name) }
  catch(error) {results.push({name,status:'failed',error:error.message});await page.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});throw error}
  finally {writeFileSync(`${output}/results.json`,JSON.stringify({results,errors},null,2))}
}
try {
  await check('guest-single-window-signup',async()=>{
    const guest=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}})
    await isolateNetwork(guest,base)
    const guestPage=await guest.newPage()
    await guestPage.goto(base+'/account?mode=create')
    await guestPage.getByRole('heading',{name:'Account details',exact:true}).waitFor()
    for(const title of ['Personal information','Your studies','Your connection with CSS Vista','Your profile photo']) await guestPage.getByRole('heading',{name:title,exact:true}).waitFor()
    assert.equal(await guestPage.locator('.student-workspace').count(),0)
    await guestPage.screenshot({path:`${output}/global-guest-signup-390.png`,fullPage:true})
    await guest.close()
  })
  const owner=await login(0)
  await check('selected-account-all-seven-sections-and-task-save',async()=>{
    const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const token=decodeURIComponent((await context.cookies()).find(cookie=>cookie.name==='cssv_csrf').value)
    const payload={'cssvista:v1':{studyPlanner:{examDate:'2027-12-01',dailyHours:2,restDay:5,selectedOptionals:['Political Science','Criminology','European History','Punjabi','Environmental Sciences'],configuredAt:now.toISOString()},studyScheduleTasks:[{id:'pilot-task',syllabusItemId:'manual:pilot',subject:'Political Science',topic:'TEST ONLY retained study task',paper:'Paper I',section:'Personal task',date:today,minutes:30,status:'not-started'}],bookmarks:['TEST ONLY retained bookmark'],quizResults:[{id:'pilot-result',type:'quiz',category:'TEST ONLY',score:3,total:5,date:now.toISOString()}]}}
    assert.equal((await context.request.put(base+'/api/student/progress.php',{headers:{'X-CSRF-Token':token},data:{payload}})).status(),200)
    const routes={dashboard:'Today’s Study Plan',tasks:'Study Planner',subjects:'My Subjects',practice:'Practice',progress:'My Performance',library:'My Library',settings:'Account & Settings'}
    for(const width of [320,375,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900})
      for(const [route,title] of Object.entries(routes)) {
        await page.goto(base+'/account/'+route)
        await page.getByRole('heading',{name:title,exact:true}).waitFor()
        await page.locator('.student-workspace').waitFor()
        assert.equal(await page.locator('.ws-feature').filter({hasText:/Pro · membership required|Membership & Payments|Précis Lab|My Answer Performance/}).count(),0)
        if(route==='subjects') await page.getByRole('heading',{name:'Political Science',exact:true}).waitFor()
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflow at ${width}`)
        assert.equal(await page.getByRole('navigation',{name:'Primary mobile navigation',exact:true}).count(),0)
        if(width===390||width===1440) await page.screenshot({path:`${output}/selected-${route}-${width}.png`,fullPage:true})
      }
    }
    await page.goto(base+'/account/dashboard')
    await page.getByRole('button',{name:'Mark TEST ONLY retained study task complete',exact:true}).click()
    await page.getByText('1 of 1 scheduled tasks complete',{exact:true}).waitFor()
    await page.reload()
    await page.getByRole('button',{name:'Mark TEST ONLY retained study task incomplete',exact:true}).waitFor()
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).quizResults[0].id),'pilot-result')
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).bookmarks[0]),'TEST ONLY retained bookmark')
    await page.goto(base+'/account/settings')
    const synced=page.waitForResponse(r=>r.url().endsWith('/api/student/progress.php')&&r.request().method()==='PUT'&&r.status()===200)
    await page.getByRole('button',{name:'Sync progress now',exact:true}).click();await synced
    const remote=await(await context.request.get(base+'/api/student/progress.php')).json()
    assert.equal(remote.payload['cssvista:v1'].studyScheduleTasks[0].status,'completed')
  })
  await check('kill-switch-and-network-failure-retain-classic-records',async()=>{
    php('tests/workspace-preview/fixture.php','off')
    await page.goto(base+'/account/dashboard');await classic()
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).studyScheduleTasks[0].status),'completed')
    await page.screenshot({path:`${output}/classic-selected-1440.png`,fullPage:true})
    selectWorkspacePreview(emails[0])
    const failure=route=>route.fulfill({status:503,json:{error:'fixture_failure'}})
    await page.route('**/api/auth/workspace-preview.php',failure)
    await page.reload();await classic()
    await page.unroute('**/api/auth/workspace-preview.php',failure)
    await page.reload();await page.locator('.student-workspace').waitFor()
  })
  await check('other-account-modern-and-isolated',async()=>{
    await logout();await login(1)
    await page.goto(base+'/account/dashboard');await page.locator('.student-workspace').waitFor()
    const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')||'{}'))
    assert.ok(!(state.studyScheduleTasks||[]).some(task=>task.id==='pilot-task'))
    assert.ok(!(state.quizResults||[]).some(result=>result.id==='pilot-result'))
    assert.ok(!(state.bookmarks||[]).includes('TEST ONLY retained bookmark'))
    for(const route of ['subjects','practice','directory','more','tasks','progress','library','settings','plan']) {
      await page.goto(base+'/account/'+route);await page.locator('.student-workspace').waitFor()
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`global ${route} overflow`)
    }
    await page.screenshot({path:`${output}/modern-other-1440.png`,fullPage:true})
  })
  await check('late-selected-response-cannot-enable-next-account',async()=>{
    await logout();await login(0)
    let release,reached,handled
    const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{reached=resolve}),finished=new Promise(resolve=>{handled=resolve})
    let first=true
    const handler=async route=>{
      if(!first)return route.continue()
      first=false
      const response=await route.fetch();reached();await gate
      await route.fulfill({response}).catch(()=>{});handled()
    }
    await page.route('**/api/auth/workspace-preview.php',handler)
    await page.goto(base+'/account/dashboard');await started
    await logout();const other=await login(1)
    await page.evaluate(()=>window.dispatchEvent(new Event('cssvista:profile-updated')))
    await page.waitForFunction(id=>localStorage.getItem('cssvista:progress-owner')===id,other)
    release();await finished;await page.locator('.student-workspace').waitFor()
    assert.equal(await page.getByText('TEST ONLY retained study task',{exact:true}).count(),0)
    await page.unroute('**/api/auth/workspace-preview.php',handler)
    assert.notEqual(other,owner)
  })
  await check('selected-incomplete-profile-uses-single-window-and-keeps-gate',async()=>{
    await logout()
    php('tests/pro/fixture.php','incomplete',owner)
    await login(0)
    await page.setViewportSize({width:390,height:900})
    await page.goto(base+'/account/dashboard')
    await page.getByRole('heading',{name:'Complete your account',exact:true}).waitFor()
    for(const title of ['Account details','Personal information','Your studies','Your connection with CSS Vista','Your profile photo'])await page.getByRole('heading',{name:title,exact:true}).waitFor()
    assert.equal((await context.request.get(base+'/api/student/progress.php')).status(),403,'Preview cannot bypass incomplete-profile authorization')
    await page.getByLabel('Education',{exact:false}).fill('TEST ONLY restored qualification')
    await page.getByLabel('Have you previously studied with Miss Sadia Zahoor or Sir Ali Hassan Sargana?',{exact:false}).selectOption('No')
    await page.getByRole('button',{name:'Finish account setup',exact:true}).click()
    await page.getByRole('heading',{name:'Today’s Study Plan',exact:true}).waitFor()
    await page.getByRole('button',{name:'Mark TEST ONLY retained study task incomplete',exact:true}).waitFor()
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).bookmarks.includes('TEST ONLY retained bookmark')))
  })
  assert.deepEqual(errors,[])
  console.log('PASS global browser rollout: all seven sections at six widths, task persistence, rollback/failure fallback, modern accounts, single-window guest signup and late-response/account isolation.')
} finally {writeFileSync(`${output}/results.json`,JSON.stringify({results,errors},null,2));await browser.close()}
