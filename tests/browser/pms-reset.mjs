/** Real native PMS scheduling and reset journeys, disposable records only. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
import { selectWorkspacePreview } from './preview-fixture.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback only')
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...args)=>(process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}):execFileSync('php',args,{env,encoding:'utf8'})).trim()
const email=`pms-browser-${randomUUID()}@example.invalid`,owner=php('tests/current-affairs/setup.php','user',email)
const otherEmail=`pms-other-${randomUUID()}@example.invalid`,otherOwner=php('tests/current-affairs/setup.php','user',otherEmail)
selectWorkspacePreview(email);php('tests/workspace-preview/fixture.php','paused')
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000},reducedMotion:'reduce',hasTouch:true})
await isolateNetwork(context,base)
const page=await context.newPage(),errors=[],checks=[],scans=[];page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message))
const out='test-artifacts/pms-reset';mkdirSync(out,{recursive:true})
const token=async()=>decodeURIComponent((await context.cookies()).find(c=>c.name==='cssv_csrf').value)
const login=async mail=>{const r=await context.request.post(base+'/api/auth/login.php',{data:{email:mail,password:'TEST ONLY native fixture password'}});assert.equal(r.status(),200,await r.text())}
const state=()=>page.evaluate(()=>{const id=localStorage.getItem('cssvista:progress-owner'),g=localStorage.getItem(`cssvista:sync-generation:v1:${id}`),key=g?`cssvista:reset-data:v1:${encodeURIComponent(id)}:${g}:${encodeURIComponent('cssvista:v1')}`:'cssvista:v1';return JSON.parse(localStorage.getItem(key)||'{}')})
const ready=()=>page.locator('.student-workspace').waitFor()
async function go(path){await page.goto(base+path);await ready()}
async function sync(){await go('/account/settings');const saved=page.waitForResponse(r=>r.url().endsWith('/api/student/progress.php')&&r.request().method()==='PUT'&&r.status()===200);await page.getByRole('button',{name:'Sync progress now',exact:true}).click();await saved}
async function check(name,run){console.log('CHECK',name);try{await run();checks.push({name,status:'passed'});console.log('PASS',name)}catch(e){checks.push({name,status:'failed',error:e.message});await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e}finally{writeFileSync(out+'/results.json',JSON.stringify({checks,errors,scans},null,2))}}
async function scan(name){await page.addScriptTag({content:readFileSync('tests/browser/node_modules/axe-core/axe.min.js','utf8')});const violations=await page.evaluate(async()=> (await window.axe.run(document.querySelector('[role=dialog]')||document.querySelector('.planner-workspace'),{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})));scans.push({name,violations});assert.deepEqual(violations,[],JSON.stringify(violations))}
const payload={'cssvista:v1':{studyPlanner:{examDate:'2027-12-01',dailyHours:2,restDay:5,selectedOptionals:['Political Science','Criminology','European History','Punjabi','Environmental Sciences'],configuredAt:new Date().toISOString()},studyScheduleTasks:[{id:'css-retained',syllabusItemId:'manual:css-retained',subject:'English Essay',paper:'CSS',section:'Personal task',topic:'TEST ONLY retained CSS session',date:'2026-11-04',time:'10:00',minutes:80,status:'not-started',createdAt:new Date().toISOString()}],bookmarks:['TEST ONLY retained bookmark'],savedAnswers:[{id:'retained-writing',text:'TEST ONLY private draft'}],quizResults:[]},'cssvista:tool:gsa-tutor:v1':{plan:{days:20,startDate:'2026-11-01'},completed:{'c1-s1-1':{at:'2026-10-30T10:00:00Z',selfRating:'gotit'}},revisit:{},bookmarks:{},bookmarkRemoved:{},drafts:{},quizHistory:{},last:'c1-s1-1'}}
let savedIds=[],chosenTitle=''
try{
 await login(email)
 assert.equal((await context.request.put(base+'/api/student/progress.php',{headers:{'X-CSRF-Token':await token()},data:{payload}})).status(),200)
 await check('fresh PMS state and complete official PDF directory',async()=>{
  await go('/account/tasks?exam=pms-punjab&view=week')
  await page.getByRole('button',{name:'Plan PMS topics',exact:true}).click()
  assert.equal(new URL(page.url()).searchParams.get('exam'),'pms-punjab')
  assert.equal(new URL(page.url()).searchParams.get('view'),'syllabus')
  await page.getByRole('heading',{name:'A new path. A clear plan.',exact:true}).waitFor()
  assert.equal(await page.locator('.pms-subject').count(),9);assert.equal((await state()).studyScheduleTasks.length,1)
  await page.getByRole('button',{name:'All 40 PDFs',exact:true}).click();assert.equal(await page.locator('.pms-subject').count(),40)
  assert.equal(await page.getByRole('link',{name:'Original PDF',exact:true}).count(),40)
  const pdf=await context.request.get(base+'/pms-punjab/syllabus/optional-punjabi.pdf');assert.equal(pdf.status(),200);assert.equal((await pdf.body()).subarray(0,4).toString(),'%PDF')
  assert.equal(await page.getByRole('link',{name:'Download all 40 syllabi · ZIP',exact:true}).getAttribute('href'),'/pms-punjab/ppsc-syllabi-2026-10-30.zip')
  await page.getByRole('button',{name:'My subjects',exact:true}).click()
  await page.screenshot({path:out+'/fresh-pms-1440.png',fullPage:true})
 })
 await check('Punjabi source topics render with readable mixed-direction text',async()=>{
  await page.getByRole('button',{name:'All 40 PDFs',exact:true}).click()
  await page.locator('.pms-subject-title').filter({hasText:/^Punjabi$/}).click()
  const panel=page.locator('.pms-topic-panel');await panel.getByRole('heading',{name:'Punjabi',exact:true}).waitFor()
  assert.match(await panel.locator('h4').first().innerText(),/[\u0600-\u06ff]/)
  assert.equal(await panel.locator('h4').first().getAttribute('dir'),'auto')
  await panel.locator('summary').first().click();await page.setViewportSize({width:390,height:844})
  await panel.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await page.screenshot({path:out+'/punjabi-topics-390.png'})
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'My subjects',exact:true}).click()
 })
 await check('independent subject choices, alternative and settings survive sync',async()=>{
  await page.getByRole('button',{name:'Subjects & availability',exact:true}).click()
  const settings=page.getByRole('region',{name:'PMS schedule settings',exact:true})
  await settings.getByLabel('Political Science',{exact:true}).check();await settings.getByLabel('Punjabi',{exact:true}).check()
  await settings.getByLabel('Daily available minutes',{exact:true}).fill('90');await settings.getByLabel('Minutes per topic session',{exact:true}).fill('45')
  await settings.getByLabel('Islamic Studies / Ethics',{exact:false}).selectOption('ethics')
  await settings.getByRole('button',{name:'Save PMS preferences',exact:true}).click()
  assert.equal(await page.locator('.pms-subject').count(),11)
  assert.equal(await page.locator('.pms-subject-title').filter({hasText:'Ethics for Non-Muslim Candidates'}).count(),1)
  assert.equal(await page.locator('.pms-subject-title').filter({hasText:'Islamic Studies'}).count(),0)
  assert.deepEqual((await state()).studyPlanner.selectedOptionals,payload['cssvista:v1'].studyPlanner.selectedOptionals)
  await sync();
  const second=await browser.newContext({ignoreHTTPSErrors:true});await isolateNetwork(second,base);assert.equal((await second.request.post(base+'/api/auth/login.php',{data:{email,password:'TEST ONLY native fixture password'}})).status(),200);const secondPage=await second.newPage();await secondPage.goto(base+'/account/tasks?exam=pms-punjab&view=syllabus');await secondPage.locator('.pms-subject-title').filter({hasText:'Political Science'}).waitFor();assert.equal(await secondPage.locator('.pms-subject').count(),11,'Fresh browser did not retrieve synced PMS choices');await second.close();
  await go('/account/tasks?exam=pms-punjab&view=syllabus');await page.locator('.pms-subject-title').filter({hasText:'Political Science'}).waitFor();assert.equal(await page.locator('.pms-subject').count(),11)
 })
 await check('source topics produce editable saved sessions without overwriting CSS',async()=>{
  await page.locator('.pms-subject-title').filter({hasText:'Political Science'}).click()
  await page.locator('.pms-topic-panel').getByRole('heading',{name:'Political Science',exact:true}).waitFor()
  const list=page.locator('.pms-topic-list');chosenTitle=await list.locator('h4').nth(1).innerText()
  for(const i of [1,2,3])await list.locator('input[type=checkbox]').nth(i).check()
  await page.getByLabel('Start date',{exact:true}).fill('2026-11-02')
  await page.getByRole('button',{name:'Preview 3 topics',exact:true}).click()
  const draft=page.getByRole('region',{name:'Review PMS schedule',exact:true});assert.equal(await draft.locator('.pms-draft-row').count(),3)
  await draft.getByLabel('Date',{exact:true}).first().fill('2026-11-04');await draft.getByLabel('Minutes',{exact:true}).first().fill('30')
  await draft.getByRole('button',{name:'Save 3 sessions',exact:true}).click();await page.getByText('3 PMS sessions saved.',{exact:false}).waitFor()
  const tasks=(await state()).studyScheduleTasks;assert.equal(tasks.length,4);assert.ok(tasks.some(t=>t.id==='css-retained'));savedIds=tasks.filter(t=>t.paper==='PMS Punjab').map(t=>t.id);assert.equal(savedIds.length,3)
  await sync();await go('/account/tasks?exam=pms-punjab&view=week&date=2026-11-04')
  const task=page.locator(`[data-task-id="${savedIds[0]}"]`).first();await task.waitFor();await task.getByRole('button',{name:`Edit ${chosenTitle}`,exact:true}).click();await task.getByLabel('Estimated minutes',{exact:true}).fill('35');await task.getByLabel('Time (optional)',{exact:true}).fill('10:15');await task.getByRole('button',{name:'Save changes',exact:true}).click();await task.getByText('This time overlaps another unfinished task.',{exact:true}).waitFor();await page.getByText(/above the daily availability in these settings across your timetables/).waitFor();await task.getByRole('button',{name:`Mark ${chosenTitle} complete`,exact:true}).click()
  assert.equal((await state()).studyScheduleTasks.find(t=>t.id===savedIds[0]).minutes,35);assert.equal((await state()).studyScheduleTasks.find(t=>t.id===savedIds[0]).status,'completed')
  await page.getByRole('button',{name:'CSS preparation',exact:true}).click();assert.equal(await page.locator(`[data-task-id="${savedIds[0]}"]`).count(),0)
  await go('/account/progress');await page.getByRole('region',{name:'PMS Punjab preparation progress',exact:true}).waitFor();assert.match(await page.getByRole('region',{name:'PMS Punjab preparation progress'}).innerText(),/1\s*\/\s*3/)
 })
 await check('revision sessions preserve earlier coverage and all required layouts are usable',async()=>{
  await go('/account/tasks?exam=pms-punjab&view=syllabus&pmsSubject=optional-political-science')
  await page.getByLabel('Revision sessions',{exact:false}).check()
  const list=page.locator('.pms-topic-list');await list.locator('input[type=checkbox]').nth(1).check()
  await page.getByLabel('Start date',{exact:true}).fill('2026-11-06');await page.getByRole('button',{name:'Preview 1 topics',exact:true}).click();await page.getByRole('button',{name:'Save 1 sessions',exact:true}).click()
  const revision=(await state()).studyScheduleTasks.find(t=>t.activity==='revision');assert.ok(revision);assert.equal(revision.status,'in-progress');assert.equal((await state()).syllabusItemStatuses[revision.syllabusItemId],'completed')
  for(const width of [320,375,390,768,1024,1440]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`PMS overflow ${width}`)
   assert.equal(await page.getByRole('navigation',{name:'Primary mobile navigation',exact:true}).count(),0)
   await page.getByRole('button',{name:'Subjects & availability',exact:true}).click();await page.getByRole('region',{name:'PMS schedule settings',exact:true}).waitFor();await page.getByRole('button',{name:'Subjects & availability',exact:true}).click()
   if(width===390||width===1440)await page.screenshot({path:`${out}/pms-subjects-${width}.png`,fullPage:true})
  }
  await scan('pms-syllabus')
  await go('/account/tasks?exam=pms-punjab&view=week&date=2026-11-06')
  await page.locator(`[data-task-id="${revision.id}"]`).getByRole('button',{name:`Mark ${chosenTitle} complete`,exact:true}).click();assert.equal((await state()).syllabusItemStatuses[revision.syllabusItemId],'completed')
  await page.locator(`[data-task-id="${revision.id}"]`).getByRole('button',{name:`Mark ${chosenTitle} incomplete`,exact:true}).click();assert.equal((await state()).syllabusItemStatuses[revision.syllabusItemId],'completed')
  await page.screenshot({path:out+'/pms-week-1440.png',fullPage:true})
 })
 await check('slow and failed syllabus loads keep saved work with recovery',async()=>{
  const failure=route=>route.fulfill({status:503,json:{error:'fixture_only'}})
  await page.route('**/pms-punjab/catalogue.json',failure);await go('/account/tasks?exam=pms-punjab&view=syllabus');await page.getByRole('heading',{name:'Syllabus temporarily unavailable'}).waitFor();assert.equal((await state()).studyScheduleTasks.length,5)
  await page.unroute('**/pms-punjab/catalogue.json',failure);await page.getByRole('button',{name:'Retry syllabus',exact:true}).click();await page.getByRole('heading',{name:'A new path. A clear plan.'}).waitFor()
 })
 await check('password-confirmed partial reset persists and outdated root data cannot return',async()=>{
  await sync();await go('/account/tasks?view=settings')
  await page.evaluate(id=>localStorage.setItem(`cssvista:single-answer-timer:owner:v1:${id}`,JSON.stringify({minutes:35,remaining:900,running:false,savedAt:Date.now(),question:'TEST ONLY retained timer'})),owner)
  let loseResetResponse=true
  const loseResponse=async route=>{
   const body=route.request().postDataJSON()
   if(loseResetResponse&&body?.action==='reset'&&body.current_password==='TEST ONLY native fixture password'){
    loseResetResponse=false;const response=await route.fetch();assert.equal(response.status(),200,await response.text());return route.abort('failed')
   }
   return route.continue()
  }
  await page.route('**/api/student/preparation-reset.php',loseResponse)
  await page.getByRole('button',{name:'Review reset options',exact:true}).click();const dialog=page.getByRole('dialog')
  await dialog.getByLabel('Subject',{exact:false}).and(dialog.locator('select')).selectOption('Political Science');await dialog.getByLabel('From date (optional)',{exact:true}).fill('2026-11-04');await dialog.getByLabel('Through date (optional)',{exact:true}).fill('2026-11-04');await dialog.getByRole('button',{name:'Review affected records',exact:true}).click()
  await page.setViewportSize({width:390,height:844});await scan('reset-review-dialog');await page.screenshot({path:out+'/reset-review-390.png'})
  await dialog.getByLabel('Current password',{exact:true}).fill('wrong');await dialog.getByLabel('Type RESET to confirm',{exact:true}).fill('RESET');await dialog.getByRole('button',{name:'Confirm reset',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal((await state()).studyScheduleTasks.length,5)
  await dialog.getByLabel('Current password',{exact:true}).fill('TEST ONLY native fixture password');await dialog.getByRole('button',{name:'Confirm reset',exact:true}).click();await dialog.waitFor({state:'hidden'})
  assert.equal(loseResetResponse,false,'The accepted reset response was interrupted and recovered through its receipt')
  await page.unroute('**/api/student/preparation-reset.php',loseResponse)
  assert.match(await page.evaluate(id=>localStorage.getItem(`cssvista:single-answer-timer:owner:v1:${id}`),owner),/TEST ONLY retained timer/,'A timetable reset cleared the active session recovery record')
  assert.ok(!(await state()).studyScheduleTasks.some(t=>t.id===savedIds[0]));assert.ok((await state()).studyScheduleTasks.some(t=>t.id==='css-retained'));assert.deepEqual((await state()).bookmarks,['TEST ONLY retained bookmark'])
  await page.evaluate(old=>localStorage.setItem('cssvista:v1',JSON.stringify(old)),payload['cssvista:v1']);await page.reload();await ready();await page.getByRole('heading',{name:'Schedule settings',exact:true}).waitFor();assert.ok(!(await state()).studyScheduleTasks.some(t=>t.id===savedIds[0]))
  await page.getByRole('button',{name:'Review reset options',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Review reset options',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Review reset options',exact:true}).evaluate(el=>el===document.activeElement),true)
 })
 await check('GSA progress remains editable after a timetable reset',async()=>{
  await go('/account/gsa-tutor')
  const course=page.frameLocator('iframe[title="CSS VISTA GSA Tutor interactive lessons and personal course schedule"]')
  await course.locator('.day-lesson').first().waitFor()
  await course.locator('.day-lesson').nth(1).click();await course.locator('.lesson-card').waitFor()
  await course.locator('[data-action="bookmark"]').click()
  await page.waitForFunction(()=>{const id=localStorage.getItem('cssvista:progress-owner'),gen=localStorage.getItem('cssvista:sync-generation:v1:'+id),key=`cssvista:reset-data:v1:${encodeURIComponent(id)}:${gen}:${encodeURIComponent('cssvista:tool:gsa-tutor:v1')}`;return Object.keys(JSON.parse(localStorage.getItem(key)||'{}').bookmarks||{}).length===1})
  assert.equal(await page.evaluate(()=>localStorage.getItem('cssvista:tool:gsa-tutor:v1')),null,'Iframe wrote the retired shared key')
  await page.goto(base+'/gsa-tutor');await page.getByRole('heading',{name:'GSA Tutor',exact:true}).waitFor();await page.getByText('1/141',{exact:true}).waitFor()
  let releaseCloud;const heldCloud=new Promise(resolve=>{releaseCloud=resolve})
  const slowOther=async route=>{if(route.request().method()==='GET'&&route.request().headers()['x-cssv-user']===otherOwner)await heldCloud;return route.continue()}
  await page.route('**/api/student/progress.php',slowOther)
  assert.equal((await context.request.post(base+'/api/auth/logout.php',{headers:{'X-CSRF-Token':await token()},data:{}})).status(),200);await login(otherEmail);await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await page.getByText('0/141',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('cssvista:progress-owner')),otherOwner,'Public course retained the previous owner')
  releaseCloud();await page.unroute('**/api/student/progress.php',slowOther);await page.getByText('Account progress synced',{exact:true}).waitFor();assert.equal(await page.getByText('1/141',{exact:true}).count(),0)
  assert.equal((await context.request.post(base+'/api/auth/logout.php',{headers:{'X-CSRF-Token':await token()},data:{}})).status(),200);await login(email);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('1/141',{exact:true}).waitFor()
  await go('/account/tasks?view=settings')
 })
 await check('full reset keeps identity/settings, clears preparation and isolates another account',async()=>{
  const before=(await(await context.request.get(base+'/api/student/profile.php')).json()).profile
  await page.evaluate(id=>{localStorage.setItem(`cssvista:single-answer-timer:owner:v1:${id}`,JSON.stringify(JSON.stringify({minutes:35,remaining:900,running:false,savedAt:Date.now(),question:'TEST ONLY private timer'})));localStorage.setItem(`cssvista:grammar-course:v5:account:${id}`,JSON.stringify({dirty:true,notes:{a:'TEST ONLY old grammar'}}));localStorage.setItem(`cssvista:english-guide:v1:${id}`,JSON.stringify({'complete-thought':{draft:'TEST ONLY earlier guide draft'}}))},owner)
  await page.getByRole('button',{name:'Review reset options',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('What would you like to reset?',{exact:false}).selectOption('preparation');await dialog.getByRole('button',{name:'Review affected records',exact:true}).click();await dialog.getByLabel('Current password',{exact:true}).fill('TEST ONLY native fixture password');await dialog.getByLabel('Type RESET to confirm',{exact:true}).fill('RESET');await dialog.getByRole('button',{name:'Confirm reset',exact:true}).click();await page.getByText('Preparation reset applied. Your login, profile and membership are retained.',{exact:true}).waitFor()
  await page.reload();await ready();await page.getByRole('heading',{name:'Schedule settings',exact:true}).waitFor();const fresh=await state();assert.equal((fresh.studyScheduleTasks||[]).length,0);assert.equal((fresh.bookmarks||[]).length,0);assert.deepEqual(fresh.studyPlanner.selectedOptionals,payload['cssvista:v1'].studyPlanner.selectedOptionals)
  assert.ok(await page.evaluate(id=>localStorage.getItem(`cssvista:study-reset:v1:${id}`),owner));
  assert.equal(await page.evaluate(id=>localStorage.getItem(`cssvista:english-guide:v1:${id}`),owner),null,'Full reset retained owned English guide drafts')
  assert.equal(await page.evaluate(id=>{const g=localStorage.getItem('cssvista:sync-generation:v1:'+id);return localStorage.getItem(`cssvista:reset-data:v1:${encodeURIComponent(id)}:${g}:${encodeURIComponent('cssvista:tool:gsa-tutor:v1')}`)},owner),null,'Full reset retained GSA course records');assert.equal(await page.evaluate(id=>localStorage.getItem(`cssvista:single-answer-timer:owner:v1:${id}`),owner),null)
  const after=(await(await context.request.get(base+'/api/student/profile.php')).json()).profile;for(const key of ['display_name','email','phone','education','profile_photo_path'])assert.equal(after[key],before[key])
  assert.equal((await context.request.post(base+'/api/auth/logout.php',{headers:{'X-CSRF-Token':await token()},data:{}})).status(),200);await login(otherEmail);await go('/account/dashboard');await page.getByRole('heading',{name:'Today’s Study Plan',exact:true}).waitFor();assert.equal(((await state()).studyScheduleTasks||[]).length,0);assert.ok(!JSON.stringify(await state()).includes('retained-writing'))
 })
 assert.deepEqual(errors,[]);console.log('PASS native PMS and reset browser journeys, six responsive widths, accessible controls, persistence, failure recovery and account isolation.')
}finally{writeFileSync(out+'/results.json',JSON.stringify({checks,errors,scans},null,2));await browser.close()}
