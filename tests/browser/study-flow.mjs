import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {chromium} from './node_modules/playwright-core/index.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const email=`study-flow-${randomUUID()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email)
const browser=await chromium.launch({headless:true,executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath()})
const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort())
try{
 await page.goto('https://localhost:3444/account');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await page.getByRole('button',{name:'Sign in securely',exact:true}).click();await page.waitForURL('**/account/dashboard')
 const flow=page.getByRole('region',{name:'Daily study session',exact:true});await flow.getByRole('link',{name:'Learn',exact:true}).waitFor()
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
 await page.getByLabel('Time available',{exact:true}).selectOption('15');await flow.getByRole('link',{name:'Learn',exact:true}).click();await page.waitForURL('**studyStage=0');assert.ok(!page.url().includes(user))
 const rail=page.getByRole('region',{name:'Daily study session',exact:true});await rail.getByRole('link',{name:'Write',exact:true}).click();await page.waitForURL('**studyStage=1');await rail.getByRole('link',{name:'Feedback',exact:true}).waitFor();await page.reload();await rail.getByRole('link',{name:'Feedback',exact:true}).click();await page.waitForURL('**studyStage=2');await rail.getByRole('link',{name:'Review',exact:true}).click();await page.waitForURL('**studyStage=3');await page.getByRole('heading',{name:'Review',exact:true,level:1}).waitFor();assert.equal(new URL(page.url()).searchParams.get('course'),'grammar-v5')
 assert.deepEqual(errors,[]);console.log('PASS: native Free daily study setup, five widths, Learn/Write/Feedback/Review navigation, reload, course-filtered review and no account identifier in session URLs.')
}finally{await browser.close()}
