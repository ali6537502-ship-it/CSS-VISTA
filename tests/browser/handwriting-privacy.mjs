import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const root=new URL('../../',import.meta.url).pathname,base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444',env={...process.env}
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback only')
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{cwd:root,env,encoding:'utf8'}).trim():execFileSync('php',args,{cwd:root,env,encoding:'utf8'}).trim()
php('tests/handwriting/fixture.php','images');php('tests/handwriting/fixture.php','config','on')
const email=`handwriting-privacy-browser-${Date.now()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email);php('tests/precis/fixture.php','activate',user)
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message))
async function signIn(tab){await tab.goto(base+'/account');await tab.getByLabel('Email address',{exact:true}).fill(email);await tab.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await tab.getByRole('button',{name:'Sign in securely',exact:true}).click();await tab.waitForURL('**/account/dashboard')}
async function action(name){const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/student/handwriting.php'&&r.request().method()==='POST');await page.getByRole('button',{name,exact:true}).click();const r=await pending;assert.equal(r.status(),200,JSON.stringify(await r.json()))}
try{
 await signIn(page);const csrf=(await context.cookies()).find(c=>c.name==='cssv_csrf').value
 const a=await context.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:crypto.randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]}});assert.equal(a.status(),200);const attempt=(await a.json()).attempt_id
 await page.goto(base+'/account/handwriting');await page.getByRole('combobox',{name:/^Preparation attempt/}).selectOption(attempt);await page.getByLabel('Writing title',{exact:true}).fill('TEST ONLY handwriting privacy browser');await page.getByLabel('Page image',{exact:true}).setInputFiles(root+'/test-artifacts/handwriting-test.jpg');await page.getByRole('checkbox',{name:'I understand how my page and confirmed text will be processed.',exact:true}).check();await action('Upload page')
 await page.getByRole('button',{name:'Extract handwriting',exact:true}).waitFor();const path=page.url();await action('Extract handwriting');await page.getByRole('textbox',{name:/^Transcribed paragraph/}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Remove temporary image',exact:true}).isEnabled(),false)
 await page.getByRole('checkbox',{name:'I no longer need this temporary image.',exact:true}).check()
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Handwriting privacy overflow')}
 const before=await page.getByRole('textbox',{name:/^Transcribed paragraph/}).inputValue();await action('Remove temporary image');await page.getByText('The temporary page image is no longer available. Saved text and feedback remain in your account.',{exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:/^Transcribed paragraph/}).inputValue(),before)
 await page.reload();await page.getByText('The temporary page image is no longer available.',{exact:false}).waitFor();assert.equal(await page.getByRole('textbox',{name:/^Transcribed paragraph/}).inputValue(),before)
 await page.getByRole('textbox',{name:/^Transcribed paragraph/}).fill('She goes to school. Her lessons help her understand new ideas.');await action('Save corrections');await page.getByRole('checkbox',{name:'I checked every word. This saved transcription matches my handwritten paragraph.',exact:true}).check();await action('Confirm transcription');await page.getByText('This exact saved version is confirmed.',{exact:false}).waitFor();await action('Evaluate confirmed paragraph');await page.getByRole('heading',{name:'Saved feedback',exact:true}).waitFor()
 const feedback=(await page.getByRole('heading',{name:'Saved feedback',exact:true}).locator('xpath=ancestor::section[1]').textContent());assert.ok(feedback.includes('TEST ONLY'),'Synthetic feedback lost its label')
 await page.setViewportSize({width:390,height:1000});mkdirSync(root+'/test-artifacts',{recursive:true});await page.getByText('The temporary page image is no longer available.',{exact:false}).locator('..').screenshot({path:root+'/test-artifacts/handwriting-image-removed-mobile.png'})
 const device=await browser.newContext({ignoreHTTPSErrors:true}),tab=await device.newPage();await signIn(tab);await tab.goto(path);await tab.getByRole('heading',{name:'Saved feedback',exact:true}).waitFor();await device.close()
 php('tests/pro/fixture.php','expire',user);await page.reload();await page.getByRole('heading',{name:'Saved feedback',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Evaluate confirmed paragraph',exact:true}).count(),0)
 await page.getByRole('link',{name:'Practise a rewrite',exact:true}).waitFor();assert.deepEqual(errors,[])
 console.log('PASS handwriting real UI/native workflow: upload, labelled extraction, explicit image removal, saved-wording preservation, correction/confirmation/feedback, refresh/device/expiry, rewrite link and 320–1440 widths. No genuine provider accuracy claim.')
}catch(error){console.log('Handwriting UI failure:',page.url(),(await page.locator('body').innerText()).slice(-1500));throw error}finally{php('tests/handwriting/fixture.php','config','off');await browser.close()}
