import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { transform } from 'esbuild'
import { readFile } from 'node:fs/promises'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const root=new URL('../../',import.meta.url).pathname.replace(/\/$/,''),base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444',env={...process.env}
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Loopback only')
for (const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{cwd:root,env,encoding:'utf8'}).trim():execFileSync('php',args,{cwd:root,env,encoding:'utf8'}).trim()
const source=await transform(await readFile(root+'/src/features/membership/proDestinations.ts','utf8'),{loader:'ts',format:'esm'})
const {isProDestination}=await import('data:text/javascript;base64,'+Buffer.from(source.code).toString('base64'))
const email='pro-pause-browser-'+Date.now()+'@example.invalid',id=php('tests/current-affairs/setup.php','user',email)
php('tests/precis/fixture.php','activate',id)
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,reducedMotion:'reduce',viewport:{width:390,height:1000}})
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
try {
  assert.equal((await context.request.post(base+'/api/auth/login.php',{data:{email,password:'TEST ONLY native fixture password'}})).status(),200)
  const csrf=(await context.cookies()).find(c=>c.name==='cssv_csrf').value
  const before=(await (await context.request.get(base+'/api/student/membership.php')).json()).membership
  const request=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,optional_subject_ids:[],daily_minutes:60,stage:'starting'}})
  assert.equal(request.status(),200);const attempt=(await request.json()).attempt_id
  php('tests/pro/release-fixture.php','pause')
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000})
    await page.goto(base+'/account/dashboard?plan=pro')
    await page.getByRole('heading',{name:'Free features',exact:true}).waitFor()
    assert.equal(await page.getByRole('link',{name:'Pro account',exact:true}).count(),0)
    const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))
    assert.deepEqual(links.filter(isProDestination),[],'Visible paused Pro links in account navigation')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow')
  }
  for (const path of ['/account/expression','/account/precis','/account/argumentation','/account/analytical-skills','/account/essay-builder','/account/general-ability','/account/handwriting','/account/ask-vista','/account/answer-performance','/account/ai-usage','/account/membership','/current-affairs','/study-material/essay-themes','/account/preparation?view=topics']) {
    await page.goto(base+path)
    await page.getByRole('heading',{name:'CSS Vista Pro is temporarily unavailable',exact:true}).waitFor()
    assert.equal(await page.locator('main textarea, main input[type=file]').count(),0)
  }
  await page.goto(base+'/account/preparation?attempt='+attempt)
  await page.getByRole('button',{name:'Reading & revision',exact:true}).click()
  assert.equal(new URL(page.url()).searchParams.get('kind'),'vistagram')
  assert.equal(await page.getByRole('button',{name:'Pro topic learning',exact:true}).count(),0)
  await page.getByRole('heading',{name:'Connect what you read',exact:true}).waitFor()
  assert.equal(await page.locator('option[value=current_affairs]').count(),0)
  await page.goto(base+'/grammar-course')
  await page.getByRole('heading',{name:/Grammar/i}).first().waitFor()
  assert.equal(await page.getByRole('heading',{name:'CSS Vista Pro is temporarily unavailable',exact:true}).count(),0)
  await page.goto(base+'/')
  assert.equal(await page.getByRole('heading',{name:'Weekly Current Affairs Magazine',exact:true}).count(),0)
  const after=(await (await context.request.get(base+'/api/student/membership.php')).json()).membership
  assert.deepEqual(after,before,'Pause changed membership/expiry')
  php('tests/pro/fixture.php','expire',id)
  for(const path of ['/account/general-ability?view=history','/account/precis?view=skills']){await page.goto(base+path);await page.getByRole('heading',{name:'CSS Vista Pro is temporarily unavailable',exact:true}).waitFor()}
  assert.equal((await context.request.get(base+'/api/student/ability.php?view=history')).status(),503,'Expired history bypassed production pause')
  assert.equal((await context.request.get(base+'/api/student/precis.php')).status(),503,'Expired Précis bypassed production pause')
  assert.deepEqual(errors,[])
  mkdirSync(root+'/test-artifacts',{recursive:true})
  await page.screenshot({path:root+'/test-artifacts/pro-paused-home.png'})
  console.log('PASS: active Pro account remains Free-only while paused; paid links omitted, fourteen direct routes plus expired history blocked, 320–1440 reflow, free Grammar and Vistagram reading retained, expiry unchanged, no page errors. Disposable database only.')
} finally { php('tests/pro/release-fixture.php','restore');await browser.close() }
