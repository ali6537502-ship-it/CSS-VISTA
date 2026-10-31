import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync,mkdirSync} from 'node:fs'
import {isolateNetwork} from './isolated-network.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable test database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444',root=new URL('../../',import.meta.url).pathname.replace(/\/$/,''),env={...process.env}
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Browser fixtures may only target loopback')
for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{cwd:root,env,encoding:'utf8'}).trim():execFileSync('php',args,{cwd:root,env,encoding:'utf8'}).trim()
php('tests/skills/fixture.php','config','off')
const email=`skills-browser-${Date.now()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email)
php('tests/precis/fixture.php','activate',id)
const raw=JSON.parse(readFileSync(root+'/public/api/_premium_files/skills-curriculum.json'))
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'})
await isolateNetwork(context,base)
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
async function signin(tab){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(email);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');const response=tab.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login.php'&&r.request().method()==='POST');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();const login=await response;assert.equal(login.status(),200,'Native browser sign-in failed: '+(await login.json().catch(()=>({}))).error);await tab.waitForURL('**/account/dashboard')}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow')}
try{
 await signin(page)
 const cookies=await context.cookies(),csrf=cookies.find(c=>c.name==='cssv_csrf').value
 const request=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,optional_subject_ids:[],daily_minutes:60,stage:'starting'}})
 assert.equal(request.status(),200)
 for(const [feature,path] of [['sentence','expression?view=studio'],['argument','argumentation'],['analysis','analytical-skills'],['essay','essay-builder']]){
  await page.goto(base+'/account/'+path)
  const lesson=raw.lessons.find(l=>l.feature===feature&&l.level==='beginner')
  await page.getByRole('combobox',{name:feature==='essay'?/^Existing essay theme/:/^Lesson/}).selectOption(lesson?.id||JSON.parse(readFileSync(root+'/public/study-material/essay-themes.json')).themes[0].slug)
  await page.getByRole('button',{name:'Start guided practice',exact:true}).click()
  await page.getByRole('heading',{name:/1 · Understand the theme|Understand the idea/}).waitFor()
  await overflow()
  if(lesson){await page.getByRole('radio').nth(lesson.check.answer).check();await page.getByRole('button',{name:'Save & continue',exact:true}).click()}
  const field=page.locator('form textarea').first();await field.fill('My independent response explains a conditional reason and notes that actual demand and staffing evidence require checking before any conclusion about this hypothetical issue.')
  await page.getByRole('button',{name:'Save independent response',exact:true}).click()
  await page.getByText(new RegExp('beginner · '+(feature==='essay'?1:2)+' saved versions')).waitFor()
  await page.getByRole('heading',{name:'Saved work and earlier versions',exact:true}).waitFor()
  const link=page.getByRole('link',{name:'Ask VISTA about this activity',exact:true});await link.click();await page.getByText('Selected learning context',{exact:true}).waitFor();await page.getByText('Read the source context',{exact:true}).click();await page.getByText('Student response (unverified assertions; not an authoritative factual source)',{exact:false}).waitFor();await overflow()
 }
 await page.goto(base+'/account/essay-builder');await page.getByRole('link',{name:/beginner · 1 saved versions/}).first().click()
 const url=page.url()
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await overflow()}
 await page.setViewportSize({width:390,height:1000})
 let lost=false
 await page.route('**/api/student/skills.php',async route=>{if(!lost&&route.request().method()==='POST'&&route.request().postDataJSON().action==='save'){lost=true;await route.fetch();await route.abort();return}await route.continue()})
 await page.locator('form textarea').first().fill('This independent revision preserves my original meaning and clearly qualifies the proposed access policy by its staffing and demand conditions.')
 await page.getByRole('button',{name:'Save independent response',exact:true}).click()
 await page.getByRole('button',{name:'Check saved result',exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'Check saved result',exact:true}).click();await page.getByRole('heading',{name:'Check your last save',exact:true}).waitFor({state:'hidden'})
 await page.unroute('**/api/student/skills.php')
 await page.getByRole('combobox',{name:/^Compare an earlier version/}).selectOption({label:'Version 1'})
 await page.getByRole('heading',{name:'Version 1',exact:true}).waitFor()
 await page.reload();await page.getByRole('heading',{name:'Saved work and earlier versions',exact:true}).waitFor()
 const other=await browser.newContext({ignoreHTTPSErrors:true});await isolateNetwork(other,base);const tab=await other.newPage();await signin(tab);await tab.goto(url);await tab.getByText('This independent revision preserves my original meaning',{exact:false}).first().waitFor();await other.close()
 // Refine a highlighted passage through the actual controls and explicitly return it.
 await page.getByRole('combobox',{name:'Saved response',exact:true}).selectOption('understanding')
 await page.getByRole('combobox',{name:'Practice workspace',exact:true}).selectOption('sentence')
 const selection=page.getByLabel('Select a passage (optional)',{exact:false}), original=await selection.inputValue(), selected='This independent revision preserves my original meaning'
 assert.ok(original.startsWith(selected))
 await selection.evaluate((element,end)=>{element.focus();element.setSelectionRange(0,end);element.dispatchEvent(new KeyboardEvent('keyup',{key:'Shift',bubbles:true}))},selected.length)
 await page.getByText(`${selected.length} characters selected. Only that passage will be refined and returned.`,{exact:true}).waitFor()
 await page.getByRole('button',{name:'Open linked practice',exact:true}).click()
 const sentenceLesson=raw.lessons.find(l=>l.feature==='sentence'&&l.level==='beginner')
 await page.getByRole('heading',{name:'Understand the idea',exact:true}).waitFor()
 await page.getByRole('radio').nth(sentenceLesson.check.answer).check();await page.getByRole('button',{name:'Save & continue',exact:true}).click()
 await page.getByRole('heading',{name:'Write independently',exact:true}).waitFor();await page.locator('form textarea').fill('This independent revision retains my intended meaning.');await page.getByRole('button',{name:'Save & continue',exact:true}).click()
 await page.getByRole('heading',{name:'Review the wording',exact:true}).waitFor();await page.locator('form textarea').fill('The revision must keep my intended claim and the existing qualifications.');await page.getByRole('button',{name:'Save & continue',exact:true}).click()
 await page.getByRole('heading',{name:'Revise independently',exact:true}).waitFor();const improved='My independent revision preserves the intended meaning'
 await page.locator('form textarea').fill(improved);await page.getByRole('button',{name:'Save independent response',exact:true}).click()
 await page.getByText(/beginner · 4 saved versions/).waitFor()
 await page.getByRole('link',{name:'Return to the original workspace',exact:true}).click();await page.getByRole('button',{name:'Compare returned revision',exact:true}).click()
 await page.getByRole('button',{name:'Save revision of the selected passage',exact:true}).click();await page.getByText(/beginner · 3 saved versions/).waitFor()
 await page.getByRole('combobox',{name:'Saved response',exact:true}).selectOption('understanding')
 assert.equal(await page.getByLabel('Select a passage (optional)',{exact:false}).inputValue(),improved+original.slice(selected.length))
 mkdirSync(root+'/test-artifacts',{recursive:true});await page.screenshot({path:root+'/test-artifacts/skills-mobile.png',fullPage:true})
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:root+'/test-artifacts/skills-desktop.png',fullPage:true})
 php('tests/pro/fixture.php','expire',id);await page.reload();await page.getByRole('heading',{name:'Saved work and earlier versions',exact:true}).waitFor();await page.getByRole('button',{name:'Save independent response',exact:true}).waitFor();assert.ok(await page.locator('form textarea').count()>0,'Membership expiry blocked free writing practice')
 assert.deepEqual(errors,[])
 console.log('PASS actual built browser: four skills entry journeys, save/resume, owned Ask VISTA, 320–1440 widths, lost response receipt recovery, immutable comparison, selected-passage linked revision and return, independent signed-in device and free writing practice after membership expiry; no real provider calls')
}catch(e){console.log('Browser failed at',new URL(page.url()).pathname);throw e}finally{await browser.close()}
