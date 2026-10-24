import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable test database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444',root=new URL('../../',import.meta.url).pathname.replace(/\/$/,''),env={...process.env}
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Browser fixtures may only target loopback')
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{cwd:root,env,encoding:'utf8'}).trim():execFileSync('php',args,{cwd:root,env,encoding:'utf8'}).trim()
php('tests/precis/feedback-fixture.php','config','off')
const email=`precis-browser-${Date.now()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email)
php('tests/precis/fixture.php','activate',user)
const questions=JSON.parse(php('tests/precis/fixture.php','questions')),q=questions['qualification-tech'],skillQuestions=Object.values(questions).filter(item=>item.skill===q.skill)
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'})
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000)
async function signin(tab,address=email){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(address);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');const pending=tab.waitForResponse(response=>new URL(response.url()).pathname==='/api/auth/login.php'&&response.request().method()==='POST');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();assert.equal((await pending).status(),200);await tab.waitForURL('**/account/dashboard')}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow')}
try{
 await signin(page)
 const csrf=(await context.cookies()).find(cookie=>cookie.name==='cssv_csrf').value
 async function makeAttempt(year){const response=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:year,target_date:null,optional_subject_ids:[],daily_minutes:60,stage:'starting'}});assert.equal(response.status(),200);return(await response.json()).attempt_id}
 const attempt=await makeAttempt(2027),other=await makeAttempt(2028)
 const url=base+`/account/precis?view=skills&attempt=${attempt}&skill=${q.skill}&question=${q.id}`
 await page.goto(url)
 const drill=page.getByRole('region',{name:'Précis drill',exact:true})
 await drill.getByRole('radio').first().waitFor();assert.equal(await drill.count(),1)
 assert.equal(await page.getByRole('combobox',{name:'Practice layout',exact:true}).inputValue(),'guided')
 assert.equal(await drill.getByRole('status').count(),0,'Feedback revealed before attempt')
 const catalog=await(await context.request.get(base+'/api/student/precis.php')).json()
 for(const question of catalog.catalog.questions){assert.equal(question.answer,undefined);assert.equal(question.explanation,undefined)}
 let lost=false
 await page.route('**/api/student/precis.php',async route=>{if(!lost&&route.request().method()==='POST'&&route.request().postDataJSON().action==='drill_answer'){lost=true;await route.fetch();await route.abort();return}await route.continue()})
 const wrong=(q.answer+1)%q.options.length
 await drill.getByRole('radio').nth(wrong).check();await drill.getByRole('button',{name:'Check and save response',exact:true}).click()
 await drill.getByRole('alert').waitFor()
 await drill.getByRole('button',{name:'Reload saved response',exact:true}).click()
 await drill.getByText('Review this distinction',{exact:true}).waitFor()
 assert.equal(php('tests/precis/fixture.php','response-count',user,attempt,q.id),'1','Recovery resubmitted the response')
 await page.unroute('**/api/student/precis.php')
 await page.reload();await drill.getByText('Last saved response:',{exact:false}).waitFor();assert.equal(await drill.getByRole('radio').nth(wrong).isChecked(),true)
 await drill.getByRole('radio').nth(q.answer).check();await drill.getByRole('button',{name:'Check and save response',exact:true}).click();await drill.getByText('Correct for this drill',{exact:true}).waitFor()
 assert.equal(php('tests/precis/fixture.php','response-count',user,attempt,q.id),'2')
 const progress=await(await context.request.get(base+`/api/student/precis.php?attempt_id=${attempt}`)).json(),profile=progress.profile.items.find(item=>item.skill===q.skill)
 assert.equal(profile.first_correct,0);assert.equal(profile.state,'Needs review','Immediate retry erased spaced review')
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await overflow()}
 await page.setViewportSize({width:390,height:1000});mkdirSync(root+'/test-artifacts',{recursive:true});await drill.screenshot({path:root+'/test-artifacts/precis-guided-mobile.png'})
 const index=skillQuestions.findIndex(item=>item.id===q.id),direction=index<skillQuestions.length-1?'Next question':'Previous question'
 await page.getByRole('button',{name:direction,exact:true}).click();await drill.getByRole('radio').first().waitFor();assert.notEqual(new URL(page.url()).searchParams.get('question'),q.id);assert.equal(await drill.count(),1)
 await page.getByRole('combobox',{name:'Practice layout',exact:true}).selectOption('all');await drill.nth(skillQuestions.length-1).waitFor();assert.equal(await drill.count(),skillQuestions.length)
 const otherProgress=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/student/precis.php'&&new URL(response.url()).searchParams.get('attempt_id')===other)
 await page.getByRole('combobox',{name:'Preparation attempt',exact:true}).selectOption(other)
 assert.deepEqual((await(await otherProgress).json()).saved_drills,[])
 await page.getByText('Loading your saved drill responses…',{exact:true}).waitFor({state:'hidden'})
 await page.locator('[role="region"] input[type=radio]:checked').waitFor({state:'hidden'})
 assert.equal(await page.locator('[role="region"] input[type=radio]:checked').count(),0,'Saved choices crossed attempts')
 assert.equal(await drill.getByRole('status').count(),0)
 await page.goto(url);await drill.getByText('Correct for this drill',{exact:true}).waitFor()
 const second=await browser.newContext({ignoreHTTPSErrors:true}),tab=await second.newPage();await signin(tab);await tab.goto(url);await tab.getByRole('region',{name:'Précis drill'}).getByText('Correct for this drill',{exact:true}).waitFor();await second.close()
 await page.goto(base+`/account/precis?view=skills&attempt=${attempt}&skill=${q.skill}`)
 const unattempted=skillQuestions.find(item=>item.id!==q.id)
 await drill.getByText(unattempted.prompt,{exact:true}).waitFor();assert.equal(await drill.getByRole('status').count(),0)
 await page.getByRole('combobox',{name:'Practice layout',exact:true}).selectOption('all')
 for(const item of skillQuestions.filter(item=>item.id!==q.id)){
  const target=drill.filter({has:page.getByText(item.prompt,{exact:true})})
  await target.getByRole('radio').nth(item.answer).check();await target.getByRole('button',{name:'Check and save response',exact:true}).click();await target.getByText('Correct for this drill',{exact:true}).waitFor()
 }
 await page.goto(base+`/account/precis?view=skills&attempt=${attempt}&skill=${q.skill}`)
 await drill.getByText(q.prompt,{exact:true}).waitFor()
 assert.equal(await drill.count(),1,'Outstanding review should resume after all questions have responses')
 // Preserve the real independent-writing and immutable revision flow.
 await page.goto(base+`/account/precis?view=write&attempt=${attempt}`)
 await page.getByRole('button',{name:'2. Identify',exact:true}).click();await page.getByRole('textbox',{name:/^One-sentence controlling idea/}).fill('TEST ONLY material wealth alone cannot ensure lasting happiness.')
 await page.getByRole('button',{name:'7. Draft',exact:true}).click();await page.getByRole('textbox',{name:/^Your independent Précis/}).fill('TEST ONLY money can provide comfort, but lasting happiness also depends on relationships and inner peace.')
 await page.getByRole('button',{name:'8. Title',exact:true}).click();await page.getByRole('textbox',{name:/^Your title/}).fill('TEST ONLY material comfort and happiness')
 await page.getByRole('button',{name:'Save my Précis',exact:true}).click();await page.getByRole('heading',{name:'Saved Précis and revision history',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Compare with the handbook model',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'7. Draft',exact:true}).click();await page.getByRole('textbox',{name:/^Your independent Précis/}).fill('TEST ONLY material possessions provide comfort; however, lasting happiness can require relationships and non-material well-being.')
 await page.getByRole('button',{name:'Save my rewrite',exact:true}).click();await page.getByRole('heading',{name:'Saved Précis and revision history',exact:true}).waitFor()
 await page.getByRole('combobox',{name:'Compare with an earlier version',exact:true}).selectOption({label:'Version 1'});await page.getByRole('heading',{name:'What changed between your drafts',exact:true}).waitFor()
 await page.getByRole('button',{name:'Compare with the handbook model',exact:true}).click();await page.getByRole('heading',{name:'Beyond Material Wealth',exact:true}).waitFor()
 const writingUrl=page.url();await page.reload();await page.getByRole('heading',{name:'Beyond Material Wealth',exact:true}).waitFor()
 await page.goto(base+`/account/precis?view=course&attempt=${attempt}`);await page.getByRole('button',{name:/^Day 4 ·/}).click()
 const positionSave=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/student/precis.php'&&response.request().method()==='POST'&&response.request().postDataJSON().action==='progress_save')
 await page.getByRole('button',{name:'Save course position',exact:true}).click();assert.equal((await positionSave).status(),200)
 await page.goto(base+`/account/precis?view=course&attempt=${attempt}`);await page.getByRole('button',{name:/^Day 4 ·/,pressed:true}).waitFor()
 php('tests/pro/fixture.php','expire',user);await page.goto(writingUrl);await page.getByRole('heading',{name:'Your history is preserved',exact:true}).waitFor();await page.getByRole('heading',{name:'Beyond Material Wealth',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Save my rewrite',exact:true}).count(),0)
 const rejected=await context.request.post(base+'/api/student/precis.php',{headers:{'X-CSRF-Token':csrf},data:{action:'drill_answer',request_id:crypto.randomUUID(),attempt_id:attempt,question_id:q.id,choice:q.answer}});assert.equal(rejected.status(),403,'Expiry allowed new paid practice')
 const freeEmail=`precis-free-browser-${Date.now()}@example.invalid`;php('tests/current-affairs/setup.php','user',freeEmail)
 const freeContext=await browser.newContext({ignoreHTTPSErrors:true}),freeTab=await freeContext.newPage();await signin(freeTab,freeEmail);await freeTab.goto(writingUrl);await freeTab.getByText('An active Pro membership is required.',{exact:false}).waitFor();assert.equal((await freeContext.request.get(base+'/api/student/precis.php?writing_id='+new URL(writingUrl).searchParams.get('writing'))).status(),404);await freeContext.close()
 php('tests/pro/release-fixture.php','pause');await page.reload();await page.getByRole('heading',{name:'CSS Vista Pro is temporarily unavailable',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Beyond Material Wealth',exact:true}).count(),0)
 assert.equal((await context.request.get(base+'/api/student/precis.php?writing_id='+new URL(writingUrl).searchParams.get('writing'))).status(),503,'History opt-in bypassed release hold')
 assert.equal(php('tests/precis/fixture.php','usage',user),'0');assert.deepEqual(errors,[])
 console.log('PASS actual Précis browser: one-at-a-time navigation, hidden unanswered keys, lost-response read-only recovery, restored choices/feedback, first-attempt/spaced evidence, attempt/device isolation, 320–1440 widths, independent writing/revision, delayed model, course resume, expired read-only history, new paid work rejected, free/foreign history denied; zero AI operations')
}catch(error){console.log('Précis browser failed at',new URL(page.url()).pathname);throw error}finally{php('tests/pro/release-fixture.php','restore');await browser.close()}
