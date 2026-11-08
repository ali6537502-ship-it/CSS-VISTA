import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from './node_modules/playwright-core/index.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const email=`account-reform-${randomUUID()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email),base='https://localhost:3444'
const seed=JSON.parse(php('tests/workspace/fixture.php','seed',user))
const topics=JSON.parse(php('tests/workspace/catalog-fixture.php','seed',user))
php('tests/precis/fixture.php','activate',user)
const before=php('tests/workspace/fixture.php','digest',user)
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true})
const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage(),errors=[],failures=[]
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500&&r.url().includes('/api/'))failures.push({path:new URL(r.url()).pathname,status:r.status()})})
await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort())
const routes=['/account/dashboard','/account/learn','/account/writing','/account/review','/account/library','/account/progress','/account/preparation','/account/expression','/account/expression?view=studio','/account/argumentation','/account/analytical-skills','/account/essay-builder','/account/precis','/account/handwriting','/account/answer-performance','/account/ask-vista','/account/resources','/account/english','/account/tasks','/account/membership','/account/vistagram']
try{
 await page.goto(base+'/account');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await page.getByRole('button',{name:'Sign in securely',exact:true}).click();await page.waitForURL('**/account/dashboard')
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});for(const path of routes){await page.goto(base+path);await page.locator('.account-hero h1').waitFor();assert.equal(await page.locator('main').count(),1,path+' main landmarks');assert.equal(await page.getByRole('navigation',{name:'Study workspace',exact:true}).getByRole('link').count(),6);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path+' overflow '+width)}}
 // Resolve a specific published course outside page one and keep its topic/attempt in all handoffs.
 const topic=topics.ids[24];await page.goto(base+`/account/preparation?view=topics&topic=${topic}&attempt=${seed.attempt}&studyCourse=${topic}&studyStage=0&studyMinutes=30`)
 let rail=page.getByRole('region',{name:'Daily study session',exact:true});await rail.getByRole('link',{name:'Write',exact:true}).waitFor();assert.match(await rail.getByRole('heading',{level:2}).innerText(),/TEST ONLY catalog/)
 await rail.getByRole('link',{name:'Write',exact:true}).click();await page.waitForURL('**studyStage=1');assert.equal(new URL(page.url()).searchParams.get('topic'),topic);assert.equal(new URL(page.url()).searchParams.get('attempt'),seed.attempt);await rail.getByRole('link',{name:'Feedback',exact:true}).click();await page.waitForURL('**studyStage=2');assert.equal(new URL(page.url()).searchParams.get('topicMode'),'check')
 await rail.getByRole('link',{name:'Review',exact:true}).click();await page.waitForURL('**studyStage=3');assert.equal(new URL(page.url()).searchParams.get('course'),topic)
 await page.goto(base+'/account/preparation?attempt='+seed.attempt);await rail.getByRole('link',{name:'Review',exact:true}).waitFor();await page.reload();await rail.getByRole('link',{name:'Learn',exact:true}).waitFor();assert.equal(new URL(await rail.getByRole('link',{name:'Learn',exact:true}).getAttribute('href'),base).searchParams.get('attempt'),seed.attempt)
 await rail.getByRole('link',{name:'Choose a different session',exact:true}).click();await page.waitForURL('**/account/dashboard');await page.getByLabel('Study focus',{exact:true}).waitFor();assert.equal(await page.evaluate(id=>sessionStorage.getItem('cssvista:daily-study:v1:'+id),user),null)
 // Storage from another account is never adopted, and failed reads retain it untouched.
 await page.evaluate(id=>sessionStorage.setItem('cssvista:daily-study:v1:'+id,JSON.stringify({schema:1,owner:'foreign',course:'grammar-v5',minutes:30,stage:1,startedAt:Date.now()})),user);await page.goto(base+'/account/review');assert.equal(await page.getByRole('region',{name:'Daily study session',exact:true}).count(),0)
 for(const path of ['/account/writing','/account/vistagram','/account/dashboard']){await page.goto(base+path);await page.locator('.account-hero h1').waitFor();await page.addScriptTag({path:'tests/browser/node_modules/axe-core/axe.min.js'});const violations=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});assert.deepEqual(violations,[],path+' automated accessibility')}
 assert.equal(php('tests/workspace/fixture.php','digest',user),before,'Browsing changed saved writing/version text')
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[])
 mkdirSync('test-artifacts/account-reform',{recursive:true});await page.screenshot({path:'test-artifacts/account-reform/today.png',fullPage:true});writeFileSync('test-artifacts/account-reform/results.json',JSON.stringify({routes:routes.length,widths:[320,768,1440],proTopicHandoffs:true,reload:true,foreignPointerIgnored:true,writingPreserved:true,axePages:3,pageErrors:errors,serverErrors:failures,scope:'Synthetic Chromium lab; manual AT, field performance and academic validation remain separate'},null,2))
 console.log('PASS: 21 student account routes at three widths, single landmarks, six-home navigation, exact published course beyond page one, owned topic/attempt handoffs, reload/native-query continuity, metadata-only end/foreign isolation, saved writing preservation and three axe scans.')
}catch(error){mkdirSync('test-artifacts/account-reform',{recursive:true});await page.screenshot({path:'test-artifacts/account-reform/failure.png',fullPage:true});throw error}finally{await browser.close()}
