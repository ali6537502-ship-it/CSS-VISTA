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
const email=`essay-quality-browser-${Date.now()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email);php('tests/precis/fixture.php','activate',user)
const guides=JSON.parse(readFileSync(root+'/public/api/_premium_files/essay-guidance.json')).themes
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']}),context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message))
async function signin(tab){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(email);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();await tab.waitForURL('**/account/dashboard')}
async function save(name){const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/student/skills.php'&&r.request().method()==='POST');await page.getByRole('button',{name,exact:true}).click();assert.equal((await pending).status(),200)}
try{
 await signin(page);const csrf=(await context.cookies()).find(c=>c.name==='cssv_csrf').value,a=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]}});assert.equal(a.status(),200);const attempt=(await a.json()).attempt_id
 for(const [id,level] of [['education-knowledge-economy-and-human-capital','beginner'],['artificial-intelligence-automation-and-future-of-humanity','intermediate'],['palestine-international-law-and-crisis-of-global-governance','advanced']]){
  const guide=guides.find(g=>g.slug===id);await page.goto(base+'/account/essay-builder');await page.getByRole('combobox',{name:'Learning level',exact:true}).selectOption(level);await page.getByRole('combobox',{name:/^Existing essay theme/}).selectOption(id);await page.getByRole('button',{name:'Start guided practice',exact:true}).click();await page.getByRole('heading',{name:'1 · Understand the theme',exact:true}).waitFor();await page.getByText(guide.meaning,{exact:false}).first().waitFor()
  assert.equal(await page.getByText('Self-review this saved response',{exact:true}).count(),0)
  const workspace=new URL(page.url()).searchParams.get('workspace'),detail=(await(await context.request.get(base+'/api/student/skills.php?workspace_id='+workspace)).json()).workspace
  const stages=id.startsWith('education')?detail.source.stages:detail.source.stages.slice(0,1)
  for(const stage of stages){
   await page.getByRole('heading',{name:stage.title,exact:true}).waitFor()
   const responses={
    understanding:'Education develops knowledge and capabilities. This theme includes actual learning and whether people can apply skills, rather than simply recording enrolment.',
    brainstorm:'For a hypothetical school, I would group ideas into pupil access, classroom practice, opportunities to apply concepts and ways to assess learning. Attendance matters but cannot alone establish learning.',
    thesis:'A hypothetical school should assess pupils’ use of taught concepts as well as attendance, provided checks reflect what pupils had an opportunity to practise.',
    argument:'Attending a lesson shows presence, not whether a pupil can use the ideas. An application exercise could reveal that distinction, but its design must match the teaching and students’ opportunities to practise. These are proposed mechanisms, not verified effects.',
    analysis:'A poor exercise result could reflect an unclear question or unfamiliar vocabulary rather than lack of understanding. Comparing different ways of applying the same concept could help test this alternative, while avoiding a claim that one score measures all learning.',
    outline:'Thesis: check application as well as attendance. 1. Distinguish presence from learning. 2. Explain what an appropriate application task could reveal. 3. Consider unclear instructions as an alternative explanation. 4. Examine opportunities to practise. Conclusion: use bounded evidence and avoid treating a single score as complete proof.',
    practice:'A school needs evidence of what pupils can do with an idea, not only a register of who attended. An exercise tied to the lesson can help, but poor results may also reflect ambiguous instructions. Assessment should therefore combine appropriate tasks with attention to pupils’ opportunities to practise, rather than presenting a single score as complete proof of learning.'
   }
   const response=id.startsWith('education')?responses[stage.id]:id.startsWith('artificial')?'Automation can assist a task without establishing that a system should make final decisions. In a hypothetical college, I would distinguish routine application sorting from responsibility for a decision affecting an applicant.':'This theme requires separating humanitarian concerns, political interpretations and legal claims. A researcher must distinguish an allegation, a provisional legal measure and a final finding, and consult the actual authoritative document before asserting a legal conclusion.'
   await page.locator('form textarea').fill(response);await save('Save independent response');await page.getByText('Self-review this saved response',{exact:true}).click();await page.getByText(stage.review[0],{exact:true}).waitFor()
   for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Essay guide overflow')}
   if(stages.length>1&&stage!==stages.at(-1)){await save('Save & continue');await page.getByRole('heading',{name:stages[stages.indexOf(stage)+1].title,exact:true}).waitFor()}
  }
  if(id.startsWith('education')){const owned=(await(await context.request.get(base+'/api/student/skills.php?workspace_id='+workspace)).json());assert.equal(owned.saved.evidence.all_recorded,true);assert.ok(owned.saved.answers.outline.startsWith('Thesis: check application'))}
  await page.setViewportSize({width:390,height:1000});mkdirSync(root+'/test-artifacts',{recursive:true});await page.getByText('Self-review this saved response',{exact:true}).locator('..').screenshot({path:root+'/test-artifacts/essay-self-review-mobile.png'})
  const url=page.url();await page.reload();await page.getByText('Self-review this saved response',{exact:true}).waitFor()
  if(level==='advanced'){
   const device=await browser.newContext({ignoreHTTPSErrors:true}),tab=await device.newPage();await signin(tab);await tab.goto(url);await tab.getByText('Self-review this saved response',{exact:true}).waitFor();await device.close();php('tests/pro/fixture.php','expire',user);await page.reload();await page.getByText('Your saved versions and feedback remain here.',{exact:false}).waitFor();assert.equal(await page.locator('form textarea').count(),0);php('tests/precis/fixture.php','activate',user)
  }
 }
 const legacy=JSON.parse(readFileSync(root+'/tests/skills/essay-legacy-sources.json'))[0],old=php('tests/skills/fixture.php','essay-legacy-start',user,attempt,'0');await page.goto(base+'/account/essay-builder?workspace='+old);await page.getByText(legacy.explanation,{exact:true}).waitFor();assert.equal(await page.getByText('Self-review this saved response',{exact:true}).count(),0)
 assert.deepEqual(JSON.parse(php('tests/skills/fixture.php','snapshot',user)),[]);assert.deepEqual(errors,[])
 console.log('PASS essay real UI/native persistence: three themes/all levels, distinct explanations, all seven saved stages, post-attempt self-review, refresh/device/expiry, preserved older source and 320–1440 widths; no AI or mastery claim.')
}finally{await browser.close()}
