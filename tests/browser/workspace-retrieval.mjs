import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { chromium } from './node_modules/playwright-core/index.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const email=`retrieval-browser-${randomUUID()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email)
const fixture=JSON.parse(php('tests/workspace/retrieval-fixture.php','seed',user))
php('tests/precis/fixture.php','activate',user)
const browser=await chromium.launch({headless:true,executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath()})
const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message))
await context.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort())
try{
 await page.goto('https://localhost:3444/account');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await page.getByRole('button',{name:'Sign in securely',exact:true}).click();await page.waitForURL('**/account/dashboard')
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('https://localhost:3444/account/library/search?type=writing&state=saved')
  await page.getByRole('link',{name:'Climate adaptation policy outline',exact:true}).waitFor()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Filter overflow at ${width}`)
  if(width===320){mkdirSync('test-artifacts/workspace-retrieval',{recursive:true});await page.screenshot({path:'test-artifacts/workspace-retrieval/filters-320.png',fullPage:true})}
 }
 await page.getByRole('textbox',{name:'Search saved work',exact:true}).fill('climate policy');await page.getByRole('button',{name:'Search',exact:true}).click()
 await page.getByRole('link',{name:'Climate adaptation policy outline',exact:true}).waitFor()
 assert.equal(new URL(page.url()).searchParams.get('state'),'saved');assert.equal(new URL(page.url()).searchParams.get('type'),'writing')
 await page.getByRole('combobox',{name:'Work status',exact:true}).selectOption('unfinished');await page.getByRole('status').filter({hasText:'No available saved work'}).waitFor()
 await page.goBack();await page.getByRole('link',{name:'Climate adaptation policy outline',exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Work status',exact:true}).inputValue(),'saved')
 await page.goto('https://localhost:3444/account/library/search?collection='+fixture.collection);await page.getByRole('link',{name:'Budget evidence notes',exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'My Factbook collection',exact:true}).inputValue(),fixture.collection)
 await page.goto('https://localhost:3444/account/library/search?source=current-affairs&from=2002-03-04&to=2002-03-04');await page.getByRole('link',{name:'TEST ONLY Climate finance briefing visible',exact:true}).waitFor();assert.equal(await page.getByLabel('From date',{exact:true}).inputValue(),'2002-03-04')
 await page.goto('https://localhost:3444/account/review');await page.getByRole('link',{name:'English Grammar — scheduled retrieval',exact:true}).waitFor();await page.getByRole('link',{name:'Précis — fixed-drill review',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:/^General Ability —/}).count(),1)
 await page.goto('https://localhost:3444/account/progress');await page.getByRole('heading',{name:'Account evidence',exact:true}).waitFor();await page.getByRole('link',{name:'Saved paragraph writing',exact:true}).waitFor();await page.getByRole('heading',{name:'This browser’s preparation record',exact:true}).waitFor()
 php('tests/workspace/fixture.php','seed',user)
 await page.goto('https://localhost:3444/account/library/search?type=writing&state=saved&from=2026-01-01')
 await page.getByRole('button',{name:'More results',exact:true}).click();await page.getByRole('button',{name:'Previous results',exact:true}).waitFor()
 for(const [key,value] of [['type','writing'],['state','saved'],['from','2026-01-01'],['offset','20']])assert.equal(new URL(page.url()).searchParams.get(key),value)
 await page.goBack();await page.getByRole('button',{name:'More results',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.has('offset'),false)
 assert.deepEqual(errors,[])
 console.log('PASS: native built search controls at five widths; saved/query filters survive submit and Back; owned collection, source/date retrieval and three native review domains; no page errors. Synthetic Chromium verification only.')
}catch(error){console.log(await page.locator('form').ariaSnapshot());throw error}finally{await browser.close()}
