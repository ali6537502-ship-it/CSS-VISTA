import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback fixtures only')
const email=`free-browser-${randomUUID()}@example.invalid`
execFileSync('php',['tests/current-affairs/setup.php','user',email],{encoding:'utf8'})
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'})
await isolateNetwork(context,base)
const page=await context.newPage(),errors=[],billing=[],external=[]
page.on('pageerror',error=>errors.push(error.message))
page.on('request',request=>{
 const url=new URL(request.url())
 if(/\/api\/(?:student\/membership|admin\/payments|pro-release)\.php$/.test(url.pathname))billing.push(url.pathname)
 if(request.method()==='POST'&&request.headers()['content-type']?.includes('application/json')&&['evaluate','ask','create_order','approve'].includes(request.postDataJSON()?.action))external.push(url.pathname)
})
try{
 assert.equal((await context.request.post(base+'/api/auth/login.php',{data:{email,password:'TEST ONLY native fixture password'}})).status(),200)
 for(const path of ['/account/dashboard?plan=pro','/account/expression','/account/precis','/account/argumentation','/account/analytical-skills','/account/essay-builder','/account/answer-performance','/current-affairs','/study-material/essay-themes','/account/library','/account/handwriting','/account/ask-vista']){
  await page.goto(base+path)
  await page.getByRole('heading',{level:1}).first().waitFor()
  assert.equal(await page.getByText(/Active Pro|Explore Pro|Renew access|Checking Pro access|Pro is temporarily unavailable/).count(),0,path)
  const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')))
  assert.deepEqual(links.filter(link=>/^\/account\/(?:membership|general-ability|ai-usage)(?:[/?]|$)/.test(link)),[],path)
 }
 for(const [oldPath,destination] of [['general-ability','practice'],['membership','settings'],['ai-usage','progress']]){
  await page.goto(base+'/account/'+oldPath)
  await page.waitForURL(url=>url.pathname==='/account/'+destination)
 }
 await page.goto(base+'/account/library')
 await page.getByRole('heading',{name:'My Library',exact:true}).waitFor()
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Free library overflow at '+width)}
 assert.deepEqual(errors,[])
 assert.deepEqual(billing,[],'Learning still depends on subscription/launch checks')
 assert.deepEqual(external,[],'Free learning dispatches paid/external actions')
 mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/free-learning-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:1000});await page.screenshot({path:'test-artifacts/free-learning-mobile.png',fullPage:true})
 console.log('PASS: fresh account opens all remaining learning routes with no billing/launch requests, paywalls or external actions; Ability/checkout bookmarks retire safely; earlier work remains reachable; 320–1440px.')
}catch(error){mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/free-learning-failure.png',fullPage:true}).catch(()=>{});throw error}finally{await browser.close()}
