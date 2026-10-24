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
const email=`reasoning-quality-browser-${Date.now()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email);php('tests/precis/fixture.php','activate',user)
const lessons=JSON.parse(readFileSync(root+'/public/api/_premium_files/skills-curriculum.json')).lessons
const ids=['supporting-reasons','causal-arguments','counterarguments','evidence-quality','correlation-causation','trade-offs']
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
async function signin(tab){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(email);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();await tab.waitForURL('**/account/dashboard')}
async function save(button){const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/student/skills.php'&&r.request().method()==='POST');await page.getByRole('button',{name:button,exact:true}).click();const r=await pending,d=await r.json();assert.equal(r.status(),200,JSON.stringify(d));await page.getByText(new RegExp('saved versions')).first().waitFor();return d}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Reasoning quality horizontal overflow')}
try{
 await signin(page);const csrf=(await context.cookies()).find(c=>c.name==='cssv_csrf').value
 const a=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]}});assert.equal(a.status(),200);const attempt=(await a.json()).attempt_id
 for(const id of ids){
  const lesson=lessons.find(l=>l.id===id),route=lesson.feature==='argument'?'argumentation':'analytical-skills'
  await page.goto(base+'/account/'+route);await page.getByRole('combobox',{name:'Learning level',exact:true}).selectOption(lesson.level);await page.getByRole('combobox',{name:'Lesson',exact:true}).selectOption(id);await page.getByRole('button',{name:'Start guided practice',exact:true}).click();await page.getByRole('heading',{name:'Understand the idea',exact:true}).waitFor();await page.getByText(lesson.task,{exact:true}).waitFor()
  const workspace=new URL(page.url()).searchParams.get('workspace'),path=base+'/api/student/skills.php?workspace_id='+workspace
  const before=await(await context.request.get(path)).json();assert.equal(before.saved,null);assert.equal(before.workspace.source.check.option_feedback,undefined)
  assert.equal(await page.getByText(/^Why this choice needs review:/).count(),0,'Reason revealed before an attempt')
  const wrong=(lesson.check.answer+1)%4;await page.getByRole('radio').nth(wrong).check();const saved=await save('Check & save response');await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor()
  assert.equal(saved.evidence.next,0,'Wrong recognition unlocked independent stages')
  const url=page.url();await page.reload();await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor()
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await overflow()}
  await page.getByRole('radio').nth(lesson.check.answer).check();await save('Save & continue');await page.getByRole('heading',{name:lesson.feature==='argument'?'Your claim':'Explain a mechanism',exact:true}).waitFor();assert.equal(await page.getByText(/^Why this choice needs review:/).count(),0,'Correct response kept an old wrong-choice reason')
  await page.goto(url+'&version='+saved.version_id);await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Check & save response',exact:true}).count(),0,'Earlier immutable response remained editable')
  if(id==='trade-offs'){
   await page.setViewportSize({width:390,height:1000});mkdirSync(root+'/test-artifacts',{recursive:true});await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).locator('..').screenshot({path:root+'/test-artifacts/reasoning-choice-feedback-mobile.png'})
   const device=await browser.newContext({ignoreHTTPSErrors:true}),tab=await device.newPage();await signin(tab);await tab.goto(page.url());await tab.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor();await device.close()
   php('tests/pro/fixture.php','expire',user);await page.reload();await page.getByText('Your saved versions and feedback remain here.',{exact:false}).waitFor();await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[wrong],{exact:true}).waitFor();assert.equal(await page.locator('form textarea').count(),0);php('tests/precis/fixture.php','activate',user)
  }
 }
 // Read a retained v1 workspace using the same UI; no new task or reasons are substituted.
 const legacy=JSON.parse(readFileSync(root+'/tests/skills/legacy-sources.json'))[0],legacyId=php('tests/skills/fixture.php','legacy-start',user,attempt,'0'),legacyWrong=(legacy.check.answer+1)%4
 const old=await context.request.post(base+'/api/student/skills.php',{headers:{'X-CSRF-Token':csrf},data:{action:'save',request_id:crypto.randomUUID(),workspace_id:legacyId,expected_version:0,stage:'check',response:legacyWrong}});assert.equal(old.status(),200)
 await page.goto(base+'/account/argumentation?workspace='+legacyId);await page.getByText(legacy.task,{exact:true}).waitFor();await page.getByText(legacy.check.explanation,{exact:true}).waitFor();assert.equal(await page.getByText(/^Why this choice needs review:/).count(),0,'v2 explanation relabelled old work')
 assert.deepEqual(JSON.parse(php('tests/skills/fixture.php','snapshot',user)),[]);assert.deepEqual(errors,[])
 console.log('PASS actual reasoning UI: six lessons across both courses/all levels, focused tasks, hidden reasons before attempt, selected misconception feedback, wrong/correct progression, immutable older choice, refresh/device/expiry history, v1 preserved, 320–1440 widths and zero AI usage')
}catch(error){console.log('Reasoning quality failed:',error.message);throw error}finally{await browser.close()}
