import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const email=`daily-flow-${randomUUID()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email),base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback fixtures only')
const seed=JSON.parse(php('tests/daily-study/fixture.php','seed',user)),before=php('tests/daily-study/fixture.php','digest',user,seed.writing)
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,reducedMotion:'reduce'});await isolateNetwork(context,base)
const page=await context.newPage(),errors=[],retired=[],server=[]
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500&&r.url().includes('/api/'))server.push({path:new URL(r.url()).pathname,status:r.status()})})
page.on('request',r=>{const p=new URL(r.url()).pathname;if(/\/api\/(student\/membership|pro-release)\.php$/.test(p)||r.method()==='POST'&&r.headers()['content-type']?.includes('application/json')&&['evaluate','ask','create_order','approve'].includes(r.postDataJSON()?.action))retired.push(p)})
const region=()=>page.getByRole('region',{name:'Daily study session',exact:true})
try {
  assert.equal((await context.request.post(base+'/api/auth/login.php',{data:{email,password:'TEST ONLY native fixture password'}})).status(),200)
  const routes=['/account/dashboard','/account/subjects','/account/practice','/account/progress','/account/library','/account/tasks','/account/settings','/account/preparation','/account/expression','/account/precis','/account/argumentation','/account/analytical-skills','/account/essay-builder','/account/gsa-tutor','/account/handwriting','/account/ask-vista','/account/answer-performance','/account/vistagram']
  // The four-card Learn/Write/Feedback/Review widget was intentionally
  // retired from My Account. Retain the original source records, routes,
  // session isolation, browser-width checks and safety assertions.
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:1000})
    for(const path of routes){
      await page.goto(base+path)
      await page.locator('main').first().waitFor()
      assert.equal(await region().count(),0,'Retired daily study interface at '+path)
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path+' horizontal overflow at '+width)
    }
  }
  await page.goto(base+'/account/practice')
  if(await page.locator('.student-workspace').count()){
    await page.getByRole('heading',{name:'General Science Course',exact:true}).waitFor()
    assert.equal(await page.getByRole('link',{name:'Open General Science Course'}).count(),1)
    assert.equal(await page.getByText('Argumentation Skills Builder',{exact:true}).count(),0)
    assert.equal(await page.getByText('Analytical Skills Builder',{exact:true}).count(),0)
    assert.equal(await page.getByText('Urdu & English Grammar',{exact:true}).count(),0)
    assert.equal(await page.getByText('Answer-Writing Practice',{exact:true}).count(),0)
    await page.setViewportSize({width:1440,height:1000})
    await page.locator('.ws-mentor-toggle').waitFor()
    assert.equal(await page.getByRole('group',{name:'Vista Mentor preparation options'}).getByRole('link',{name:'CSS Vista'}).count(),1)
    assert.equal(await page.getByRole('group',{name:'Vista Mentor preparation options'}).getByRole('link',{name:'PMS Vista'}).count(),1)
  }
  await page.goto(base+'/account/dashboard')
  await page.evaluate(id=>sessionStorage.setItem('cssvista:daily-study:v1:'+id,JSON.stringify({schema:1,owner:'foreign',course:'grammar-v5',minutes:30,stage:1,startedAt:Date.now()})),user)
  await page.reload()
  assert.equal(await region().count(),0,'Legacy foreign session cannot re-enable a removed interface')
  // Native fixtures for saved writing remain unmodified. Removing the visual
  // guide never triggers payment, evaluation, or external service requests.
  for(const path of ['/account/dashboard','/account/practice','/account/vistagram']){
    await page.goto(base+path)
    await page.addScriptTag({path:'tests/browser/node_modules/axe-core/axe.min.js'})
    const violations=await page.evaluate(async()=>{
      const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})
      return result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))
    })
    assert.deepEqual(violations,[],path+' automated accessibility')
  }
  assert.equal(php('tests/daily-study/fixture.php','digest',user,seed.writing),before)
  assert.deepEqual(errors,[]);assert.deepEqual(server,[]);assert.deepEqual(retired,[])
  mkdirSync('test-artifacts/daily-study',{recursive:true})
  await page.goto(base+'/account/dashboard')
  await page.screenshot({path:'test-artifacts/daily-study/desktop.png',fullPage:true})
  await page.setViewportSize({width:390,height:1000})
  await page.screenshot({path:'test-artifacts/daily-study/mobile.png',fullPage:true})
  writeFileSync('test-artifacts/daily-study/results.json',JSON.stringify({
    routes:routes.length,widths:[320,390,768,1024,1440],retiredWidgetAbsent:true,
    writingHashesPreserved:true,foreignSessionIgnored:true,axePages:3,
    pageErrors:errors,retiredRequests:retired,serverErrors:server,
    scope:'Synthetic Chromium lab, not physical-device/manual AT or academic approval'
  },null,2))
  console.log('PASS: retired study widget absent, account routes responsive, Vista Mentor and General Science integration, original writing records preserved, and no prohibited calls.')
} catch(error) {
  console.error('Daily study retirement browser failure at',page.url())
  mkdirSync('test-artifacts/daily-study',{recursive:true})
  await page.screenshot({path:'test-artifacts/daily-study/failure.png',fullPage:true})
  throw error
} finally { await browser.close() }
