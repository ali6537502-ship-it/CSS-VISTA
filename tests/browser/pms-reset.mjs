/** Native PMS Vista, CSS record preservation and password-confirmed reset (disposable account only). */
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
const env={...process.env}
for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...args)=>(process.env.CSSV_TEST_PHP_CONTAINER
  ? execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'})
  : execFileSync('php',args,{env,encoding:'utf8'})).trim()
const email='vista-native-'+randomUUID()+'@example.invalid'
const owner=php('tests/current-affairs/setup.php','user',email)
selectWorkspacePreview(email)
php('tests/workspace-preview/fixture.php','paused')
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:900},reducedMotion:'reduce'})
await isolateNetwork(context,base)
const page=await context.newPage(),checks=[],errors=[]
page.setDefaultTimeout(25000)
page.on('pageerror',error=>errors.push(error.message))
const out='test-artifacts/pms-reset'
mkdirSync(out,{recursive:true})
const token=async()=>decodeURIComponent((await context.cookies()).find(c=>c.name==='cssv_csrf').value)
const state=()=>page.evaluate(()=>{
  const owner=localStorage.getItem('cssvista:progress-owner')
  const generation=localStorage.getItem('cssvista:sync-generation:v1:'+owner)
  const physical=generation?'cssvista:reset-data:v1:'+encodeURIComponent(owner)+':'+generation+':'+encodeURIComponent('cssvista:v1'):'cssvista:v1'
  return JSON.parse(localStorage.getItem(physical)||'{}')
})
async function go(path){await page.goto(base+path);await page.locator('.student-workspace').waitFor()}
async function check(name,run){
  console.log('CHECK',name)
  try{await run();checks.push({name,status:'passed'});console.log('PASS',name)}
  catch(error){checks.push({name,status:'failed',error:error.message});await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw error}
  finally{writeFileSync(out+'/results.json',JSON.stringify({checks,errors},null,2))}
}
async function sync(){
  await go('/account/settings')
  const saved=page.waitForResponse(response=>response.url().endsWith('/api/student/progress.php')&&response.request().method()==='PUT'&&response.status()===200)
  await page.getByRole('button',{name:'Sync progress now',exact:true}).click()
  await saved
}
const catalog=JSON.parse(readFileSync('public/pms-punjab/vista-syllabus.json','utf8'))
const political=catalog.subjects.find(s=>s.id==='optional-political-science')
assert.ok(political,'Political Science is in the official catalogue')
function leaf(node){return node.children?.length?leaf(node.children[0]):node}
const first=leaf(political.sections.flatMap(section=>section.topics)[0])
const now=new Date().toISOString()
const day='2026-11-12'
const payload={'cssvista:v1':{
  studyPlanner:{examDate:'2027-12-01',dailyHours:3,restDay:5,selectedOptionals:['Political Science','Criminology'],configuredAt:now},
  studyScheduleTasks:[
    {id:'css-retained',syllabusItemId:'manual:css-retained',subject:'English Essay',paper:'CSS',section:'Personal task',topic:'TEST ONLY retained CSS session',date:day,minutes:60,status:'not-started',createdAt:now},
    {id:'pms-retained',syllabusItemId:first.id,subject:'Political Science',paper:'PMS Punjab',section:'Official syllabus',topic:first.title,date:day,minutes:45,status:'not-started',createdAt:now},
  ],
  syllabusItemStatuses:{},bookmarks:['TEST ONLY retained bookmark'],
  savedAnswers:[{id:'retained-writing',text:'TEST ONLY private draft'}],quizResults:[],
},'cssvista:tool:gsa-tutor:v1':{
  plan:{days:20,startDate:'2026-11-01'},completed:{'c1-s1-1':{at:'2026-10-30T10:00:00Z',selfRating:'gotit'}},
  revisit:{},bookmarks:{},bookmarkRemoved:{},drafts:{},quizHistory:{},last:'c1-s1-1',
}}
try{
  const auth=await context.request.post(base+'/api/auth/login.php',{data:{email,password:'TEST ONLY native fixture password'}})
  assert.equal(auth.status(),200,await auth.text())
  assert.equal((await context.request.put(base+'/api/student/progress.php',{headers:{'X-CSRF-Token':await token()},data:{payload}})).status(),200)
  await check('unified PMS Vista guide opens without the old PDF-first interface',async()=>{
    await go('/account/tasks?exam=pms-punjab&view=syllabus')
    await page.getByRole('heading',{name:'PMS Vista',exact:true,level:1}).waitFor()
    await page.locator('.vg-root').waitFor()
    assert.equal(await page.locator('.pms-subject').count(),0)
    assert.equal(await page.getByRole('link',{name:'Original PDF',exact:true}).count(),0)
    assert.equal((await state()).studyScheduleTasks.length,2)
    await page.getByRole('button',{name:'View all subjects'}).click()
    assert.equal(await page.locator('.vg-subjects button').count(),40)
    await page.locator('.vg-subjects button').filter({hasText:'Punjabi'}).click()
    await page.locator('.vg-syllabus').getByText('بابا فرید',{exact:false}).first().waitFor()
    assert.equal(await page.locator('.vg-unit h4').first().getAttribute('dir'),'auto')
    await page.screenshot({path:out+'/pms-vista-desktop.png',fullPage:true})
  })
  await check('shared PMS and CSS settings preserve previously saved records',async()=>{
    await page.getByRole('button',{name:'Subjects and routine'}).click()
    await page.getByRole('radio',{name:'3 subjects per day'}).check()
    await page.getByRole('button',{name:'Save my preparation choices'}).click()
    assert.equal((await page.locator('.vg-metrics strong').nth(1).textContent()).trim(),'3')
    assert.ok((await state()).studyScheduleTasks.some(t=>t.id==='css-retained'))
    assert.ok((await state()).studyScheduleTasks.some(t=>t.id==='pms-retained'))
    await sync()
    await go('/account/tasks?exam=pms-punjab&view=syllabus')
    await page.locator('.vg-root').waitFor()
    const pmsSession=(await state()).studyScheduleTasks.find(t=>t.id==='pms-retained')
    assert.ok(pmsSession)
    await page.getByRole('button',{name:'CSS preparation'}).click()
    await page.getByRole('heading',{name:'CSS Vista',exact:true,level:1}).waitFor()
    await page.getByRole('button',{name:'PMS Punjab'}).click()
    await page.getByRole('heading',{name:'PMS Vista',exact:true,level:1}).waitFor()
  })
  await check('mobile and desktop responsive navigation and safe reset availability',async()=>{
    for(const width of [320,375,390,768,1024,1440]){
      await page.setViewportSize({width,height:900})
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'PMS overflow at '+width)
      if(width===390||width===1440)await page.screenshot({path:out+'/pms-'+width+'.png',fullPage:true})
    }
    await go('/account/tasks?exam=pms-punjab&view=settings')
    await page.getByRole('button',{name:'Review reset options'}).waitFor()
  })
  await check('partial timetable reset requires password and preserves CSS records',async()=>{
    await page.getByRole('button',{name:'Review reset options'}).click()
    const dialog=page.getByRole('dialog')
    await dialog.getByLabel('Subject',{exact:false}).and(dialog.locator('select')).selectOption('Political Science')
    await dialog.getByLabel('From date (optional)').fill(day)
    await dialog.getByLabel('Through date (optional)').fill(day)
    await dialog.getByRole('button',{name:'Review affected records'}).click()
    await dialog.getByLabel('Current password').waitFor()
    await dialog.getByLabel('Current password').fill('bad-password')
    await dialog.getByLabel('Type RESET to confirm').fill('RESET')
    await dialog.getByRole('button',{name:'Confirm reset'}).click()
    await dialog.getByRole('alert').waitFor()
    assert.equal((await state()).studyScheduleTasks.length,2)
    await dialog.getByLabel('Current password').fill('TEST ONLY native fixture password')
    await dialog.getByRole('button',{name:'Confirm reset'}).click()
    await dialog.waitFor({state:'hidden'})
    const after=await state()
    assert.ok(after.studyScheduleTasks.some(t=>t.id==='css-retained'))
    assert.ok(!after.studyScheduleTasks.some(t=>t.id==='pms-retained'))
    assert.deepEqual(after.bookmarks,['TEST ONLY retained bookmark'])
  })
  await check('full preparation reset retains account identity and clears study records',async()=>{
    const before=(await(await context.request.get(base+'/api/student/profile.php')).json()).profile
    await page.getByRole('button',{name:'Review reset options'}).click()
    const dialog=page.getByRole('dialog')
    await dialog.getByLabel('What would you like to reset?').selectOption('preparation')
    await dialog.getByRole('button',{name:'Review affected records'}).click()
    await dialog.getByLabel('Current password').fill('TEST ONLY native fixture password')
    await dialog.getByLabel('Type RESET to confirm').fill('RESET')
    await dialog.getByRole('button',{name:'Confirm reset'}).click()
    await dialog.waitFor({state:'hidden'})
    const after=await state()
    assert.equal((after.studyScheduleTasks||[]).length,0)
    assert.equal((after.bookmarks||[]).length,0)
    assert.deepEqual(after.studyPlanner.selectedOptionals,payload['cssvista:v1'].studyPlanner.selectedOptionals)
    const account=(await(await context.request.get(base+'/api/student/profile.php')).json()).profile
    for(const key of ['display_name','email','phone','education','profile_photo_path'])assert.equal(account[key],before[key])
  })
  assert.deepEqual(errors,[])
  console.log('PASS PMS Vista and CSS Vista route parity, native progress preservation, partial/full password-confirmed reset and responsive layouts.')
}finally{writeFileSync(out+'/results.json',JSON.stringify({checks,errors},null,2));await browser.close()}
