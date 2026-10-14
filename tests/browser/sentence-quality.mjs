import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const root=new URL('../../',import.meta.url).pathname,base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444',env={...process.env}
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback only')
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{cwd:root,env,encoding:'utf8'}).trim():execFileSync('php',args,{cwd:root,env,encoding:'utf8'}).trim()
php('tests/skills/fixture.php','config','off')
const email=`sentence-quality-browser-${Date.now()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email);php('tests/precis/fixture.php','activate',user)
const lessons=JSON.parse(readFileSync(root+'/public/api/_premium_files/skills-curriculum.json')).lessons
const ids=['sentence-core','word-order','modifiers','academic-tone','causal-sentences','transformation']
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
async function signin(tab){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(email);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();await tab.waitForURL('**/account/dashboard')}
async function save(button){const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/student/skills.php'&&r.request().method()==='POST');await page.getByRole('button',{name:button,exact:true}).click();const r=await pending,d=await r.json();assert.equal(r.status(),200,JSON.stringify(d));await page.getByText(new RegExp('saved versions')).first().waitFor();return d}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Sentence quality horizontal overflow')}
async function grammarRoundtrip(original,workspace,version){
 const review=page.getByRole('link',{name:/^Review the existing Grammar lesson/});await review.click()
 await page.getByRole('link',{name:'Return to Expression Lab',exact:true}).waitFor()
 const direct=page.getByRole('link',{name:'Return to Expression Lab',exact:true}),href=await direct.getAttribute('href'),target=new URL(href,base)
 assert.equal(target.pathname,'/account/expression');assert.equal(target.searchParams.get('view'),'studio');assert.equal(target.searchParams.get('workspace'),workspace);assert.equal(target.searchParams.get('version'),version)
 await page.getByRole('link',{name:'Open reference',exact:true}).click();await page.getByRole('link',{name:/^Return to Day .* session$/}).click();await page.getByRole('link',{name:'Return to Expression Lab',exact:true}).click()
 await page.getByRole('heading',{name:'A complete sentence',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('workspace'),workspace);assert.equal(new URL(page.url()).searchParams.get('version'),version)
 // Switching to Error Lab and back through its linked lesson must retain this origin.
 await page.getByRole('link',{name:/^Review the existing Grammar lesson/}).click();await page.getByRole('button',{name:'Error Lab',exact:true}).click()
 // Answer an existing free Grammar question and follow its lesson/reference route.
 const lessonReview=page.getByRole('link',{name:'Review this lesson',exact:true})
 if(!await lessonReview.count()){
  if(!await page.getByRole('region',{name:'Practice question',exact:true}).count())await page.getByRole('button',{name:'Start session',exact:true}).click()
  await page.getByRole('region',{name:'Practice question',exact:true}).locator('li button').first().click()
 }
 await lessonReview.click();await page.getByRole('link',{name:'Return to Error Lab',exact:true}).waitFor()
 assert.equal(new URL(page.url()).searchParams.get('workspace'),workspace)
 await page.getByRole('link',{name:'Open reference',exact:true}).click();await page.getByRole('link',{name:/^Return to Day .* session$/}).click();await page.getByRole('link',{name:'Return to Error Lab',exact:true}).click()
 assert.equal(new URL(page.url()).searchParams.get('view'),'lab')
 await page.getByRole('link',{name:'Return to Expression Lab',exact:true}).click();await page.getByRole('heading',{name:'A complete sentence',exact:true}).waitFor()
 assert.equal(new URL(page.url()).searchParams.get('workspace'),workspace);assert.equal(new URL(page.url()).searchParams.get('version'),version)
 assert.equal(new URL(page.url()).searchParams.get('attempt'),attemptContext)
 if(new URL(original).searchParams.has('version'))assert.equal(await page.getByRole('button',{name:'Check & save response',exact:true}).count(),0)
}
let attemptContext
try{
 await signin(page);const csrf=(await context.cookies()).find(c=>c.name==='cssv_csrf').value
 const a=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]}});assert.equal(a.status(),200);const attempt=(await a.json()).attempt_id;attemptContext=attempt
 for(const id of ids){
  const lesson=lessons.find(l=>l.id===id),route='expression?view=studio'
  await page.goto(base+'/account/'+route);await page.getByRole('combobox',{name:'Learning level',exact:true}).selectOption(lesson.level);await page.getByRole('combobox',{name:'Lesson',exact:true}).selectOption(id);await page.getByRole('button',{name:'Start guided practice',exact:true}).click();await page.getByRole('heading',{name:'Understand the idea',exact:true}).waitFor();await page.getByText(lesson.task,{exact:true}).waitFor()
  const workspace=new URL(page.url()).searchParams.get('workspace'),path=base+'/api/student/skills.php?workspace_id='+workspace
  const before=await(await context.request.get(path)).json();assert.equal(before.saved,null);assert.equal(before.workspace.source.check.option_feedback,undefined)
  assert.equal(await page.getByText(/^Why this choice needs review:/).count(),0,'Reason revealed before an attempt')
  const wrong=(lesson.check.answer+1)%4;await page.getByRole('radio').nth(wrong).check();const saved=await save('Check & save response');await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor()
  assert.equal(saved.evidence.next,0,'Wrong recognition unlocked independent stages')
  const url=page.url();await page.reload();await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor()
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await overflow()}
  await page.getByRole('radio').nth(lesson.check.answer).check();await save('Save & continue');await page.getByRole('heading',{name:'Write independently',exact:true}).waitFor();assert.equal(await page.getByText(/^Why this choice needs review:/).count(),0,'Correct response kept an old wrong-choice reason')
  await page.goto(url+'&version='+saved.version_id);await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Check & save response',exact:true}).count(),0,'Earlier immutable response remained editable')
  if(id==='sentence-core'){
   // An earlier saved recognition response must return as the same immutable version.
   const prior=page.url()
   await grammarRoundtrip(prior,workspace,saved.version_id)
   await page.goto(url);await page.getByRole('heading',{name:'Write independently',exact:true}).waitFor()
   await page.locator('form textarea').fill('Stop.');await save('Save & continue');await page.getByRole('heading',{name:'Review the wording',exact:true}).waitFor()
   await page.locator('form textarea').fill('An imperative has the understood subject you and expresses a complete instruction.');await save('Save & continue');await page.getByRole('heading',{name:'Revise independently',exact:true}).waitFor()
   await page.locator('form textarea').fill('Wait.')
   // Hold the authoritative detail refresh after acceptance: an old Grammar link
   // must not remain actionable while the newly saved version is loading.
   let releaseDetail;const detailGate=new Promise(resolve=>{releaseDetail=resolve})
   const detailPattern='**/api/student/skills.php?*'
   await page.route(detailPattern,async route=>{const u=new URL(route.request().url());if(route.request().method()==='GET'&&u.searchParams.get('workspace_id')===workspace&&u.searchParams.get('view')!=='linked')await detailGate;await route.continue().catch(()=>{})})
   let revision
   try{
    const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/student/skills.php'&&r.request().method()==='POST')
    await page.getByRole('button',{name:'Save independent response',exact:true}).click();const response=await pending;assert.equal(response.status(),200);revision=await response.json()
    await page.getByText('Loading your learning workspace…',{exact:true}).waitFor()
    assert.equal(await page.getByRole('link',{name:/^Review the existing Grammar lesson/}).count(),0,'Old saved-version link remained actionable after acceptance')
   }finally{releaseDetail()}
   await page.getByText('beginner · '+revision.version+' saved versions',{exact:true}).waitFor()
   await page.unroute(detailPattern)

   assert.equal(revision.evidence.all_recorded,true,'Short independent sentences failed participation progression')
   await grammarRoundtrip(page.url(),workspace,revision.version_id)
   await page.getByRole('heading',{name:'Revise independently',exact:true}).waitFor();assert.equal(await page.locator('form textarea').inputValue(),'Wait.')
  }
  if(id==='transformation'){
   await page.setViewportSize({width:390,height:1000});mkdirSync(root+'/test-artifacts',{recursive:true});await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).locator('..').screenshot({path:root+'/test-artifacts/sentence-choice-feedback-mobile.png'})
   const device=await browser.newContext({ignoreHTTPSErrors:true}),tab=await device.newPage();await signin(tab);await tab.goto(page.url());await tab.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor();await device.close()
   php('tests/pro/fixture.php','expire',user);await page.reload();await page.getByText('Your saved versions and feedback remain here.',{exact:false}).waitFor();await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor();assert.equal(await page.locator('form textarea').count(),0);php('tests/precis/fixture.php','activate',user)
  }
 }
 // Read a retained v2 workspace using the same UI; no new task or reasons are substituted.
 const legacy=JSON.parse(readFileSync(root+'/tests/skills/sentence-legacy-sources.json'))[0],legacyId=php('tests/skills/fixture.php','sentence-legacy-start',user,attempt,'0'),legacyWrong=(legacy.check.answer+1)%4
 const old=await context.request.post(base+'/api/student/skills.php',{headers:{'X-CSRF-Token':csrf},data:{action:'save',request_id:crypto.randomUUID(),workspace_id:legacyId,expected_version:0,stage:'check',response:legacyWrong}});assert.equal(old.status(),200)
 await page.goto(base+'/account/expression?view=studio&workspace='+legacyId);await page.getByText(legacy.task,{exact:true}).waitFor();await page.getByText(legacy.check.explanation,{exact:true}).waitFor();assert.equal(await page.getByText(/^Why this choice needs review:/).count(),0,'v3 explanation relabelled old work')
 // Existing ordinary Expression and Précis paths must not become guided Studio paths.
 for(const [from,workspace,target] of [['expression','invalid-workspace','/account/expression'],['precis',legacyId,'/account/precis']]){
  await page.goto(base+'/grammar-course?day=2&from='+from+'&workspace='+workspace+'&writing='+legacyId)
  const link=page.getByRole('link',{name:from==='precis'?'Return to Précis Lab':'Return to Expression Lab',exact:true}),href=new URL(await link.getAttribute('href'),base)
  assert.equal(href.pathname,target);assert.equal(href.searchParams.get('workspace'),null);assert.equal(href.searchParams.get('view'),null);assert.equal(href.searchParams.get('writing'),legacyId)
 }
 assert.deepEqual(JSON.parse(php('tests/skills/fixture.php','snapshot',user)),[]);assert.deepEqual(errors,[])
 console.log('PASS actual Sentence Studio: six lessons/all levels, selected-choice feedback, immutable history, Grammar/Error Lab/reference return continuity, independent short writing and revision, refresh/device/expiry, v2 preserved, 320–1440 widths and zero AI usage')
}catch(error){console.log('Sentence quality failed:',error.message);throw error}finally{await browser.close()}
