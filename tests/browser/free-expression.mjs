import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim():execFileSync('php',args,{env,encoding:'utf8'}).trim()
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback only')
const email=`free-expression-browser-${Date.now()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email)
const lessons=JSON.parse(readFileSync(new URL('../../public/api/_premium_files/skills-curriculum.json',import.meta.url))).lessons
php('tests/skills/fixture.php','config','off')
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000)
async function signin(tab){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(email);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();await tab.waitForURL('**/account/dashboard')}
async function save(name){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/student/skills.php'&&r.request().method()==='POST');await page.getByRole('button',{name,exact:true}).click();const r=await response,data=await r.json();assert.equal(r.status(),200,JSON.stringify(data));await page.getByText(`saved versions`,{exact:false}).first().waitFor();return data}
async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow')}
try{
 await signin(page);const csrf=(await context.cookies()).find(c=>c.name==='cssv_csrf').value
 const attempt=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]}});assert.equal(attempt.status(),200)
 await page.goto(base+'/account/expression');await page.getByRole('region',{name:'Expression course chapters'}).waitFor();assert.equal(await page.locator('section[aria-label="Expression course chapters"] details').count(),16)
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await noOverflow()}
 await page.setViewportSize({width:390,height:900})
 await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname})
 mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/free-expression-chapters.png',fullPage:true})
 const axe=await page.evaluate(async()=>await window.axe.run(document.querySelector('main')||document.body,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}}));assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.length})),[])
 let last
 for(const id of ['sentence-core','expression-topic','expression-concession']){
  const lesson=lessons.find(l=>l.id===id)
  await page.goto(base+'/account/expression?view=studio&lesson='+id);assert.equal(await page.getByRole('combobox',{name:'Learning level',exact:true}).inputValue(),lesson.level);assert.equal(await page.getByRole('combobox',{name:'Lesson',exact:true}).inputValue(),id)
  await page.getByRole('button',{name:'Start guided practice',exact:true}).click();await page.getByRole('heading',{name:'Understand the idea',exact:true}).waitFor()
  await page.getByRole('radio').nth((lesson.check.answer+1)%4).check();const wrong=await save('Check & save response');assert.equal(wrong.evidence.next,0)
  await page.getByText('Why this choice needs review: '+lesson.check.option_feedback[(lesson.check.answer+1)%4],{exact:true}).waitFor()
  await page.getByRole('radio').nth(lesson.check.answer).check();await save('Save & continue');await page.getByRole('heading',{name:'Write independently',exact:true}).waitFor()
  const draft=id==='sentence-core'?'Stop.':'A shared reading space may suit learners who need a quiet place to work, provided that its hours fit their schedules. A learner who arrives after it closes would need another arrangement. The recommendation therefore depends on practical access rather than an assumption that the same space suits everyone.'
  await page.locator('form textarea').fill(draft);await save('Save & continue');await page.getByRole('heading',{name:'Review the wording',exact:true}).waitFor()
  await page.locator('form textarea').fill('I will preserve the intended action and make the relevant condition clear.');await save('Save & continue');await page.getByRole('heading',{name:'Revise independently',exact:true}).waitFor()
  await page.locator('form textarea').fill(id==='sentence-core'?'Wait.':draft.replace('may suit','can suit'));last=await save('Save independent response');assert.equal(last.evidence.all_recorded,true)
  await page.getByRole('link',{name:'Choose the next lesson',exact:true}).waitFor();await noOverflow()
  assert.equal(await page.getByRole('button',{name:/Evaluate|Request instructional feedback/}).count(),0);assert.equal(await page.getByRole('link',{name:/Ask VISTA|Handwritten paragraph/}).count(),0)
  const url=page.url();await page.reload();await page.getByRole('heading',{name:lesson.title,exact:true}).waitFor();assert.equal(await page.locator('form textarea').inputValue(),id==='sentence-core'?'Wait.':draft.replace('may suit','can suit'))
  if(id==='expression-topic'){
   const device=await browser.newContext({ignoreHTTPSErrors:true}),tab=await device.newPage();await signin(tab);await tab.goto(url);await tab.getByRole('heading',{name:lesson.title,exact:true}).waitFor();assert.equal(await tab.locator('form textarea').inputValue(),draft.replace('may suit','can suit'));await device.close()
  }
 }
 await page.goto(base+'/account/expression?view=writing');await page.getByRole('button',{name:'New writing',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/Evaluate/}).count(),0)
 await page.getByRole('button',{name:'New writing',exact:true}).click();await page.getByLabel('Writing title',{exact:true}).fill('TEST ONLY independent expression')
 await page.getByRole('combobox',{name:/^Preparation attempt/}).selectOption({index:1});await page.getByLabel('Your writing',{exact:true}).fill('The learner keeps a clear record of questions for the next review.')
 await page.getByRole('button',{name:'Save writing',exact:true}).click();await page.getByRole('heading',{name:'Saved wording',exact:true}).waitFor()
 await page.getByRole('textbox',{name:/^Your rewrite/}).fill('The learner records unresolved questions to guide the next review session.');await page.getByRole('button',{name:'Save rewrite',exact:true}).click();await page.locator('[aria-label="Saved writing text"]').filter({hasText:'records unresolved questions'}).waitFor();await page.reload();await page.getByRole('heading',{name:'Saved wording',exact:true}).waitFor()
 assert.match(await page.getByLabel('Saved writing text',{exact:true}).innerText(),/records unresolved questions/)
 const firstVersion=await page.getByRole('combobox',{name:/^Saved version/}).locator('option').last().getAttribute('value');await page.getByRole('combobox',{name:/^Saved version/}).selectOption(firstVersion);await page.getByText('The learner keeps a clear record of questions for the next review.',{exact:true}).first().waitFor()
 assert.deepEqual(JSON.parse(php('tests/skills/fixture.php','snapshot',user)),[]);assert.deepEqual(errors,[])
 mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/free-expression-mobile.png',fullPage:true})
 console.log('PASS free expression browser: chapter discovery, automatic level selection, three complete writing journeys, wrong-answer explanation, saved revision, refresh/second-device recovery, independent writing/rewrite/version recovery, no AI/scanner links, 320–1440 widths and WCAG A/AA axe checks')
}catch(error){mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/free-expression-failure.png',fullPage:true});console.error('URL',page.url(),'PAGE',await page.locator('main').innerText());throw error}finally{await browser.close()}
