import {chromium} from './node_modules/playwright-core/index.mjs'
import {isolateNetwork} from './isolated-network.mjs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable native database required')
const base=process.env.CSSV_GRAMMAR_ORIGIN??'https://localhost:3444'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback runtime required')
const catalog=JSON.parse(readFileSync('public/grammar/v5/index.json','utf8')),concept=catalog.concepts[0]
const email=`grammar-browser-${randomUUID()}@example.invalid`,id=execFileSync('php',['tests/current-affairs/setup.php','user',email],{encoding:'utf8'}).trim()
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE??chromium.executablePath(),headless:true,args:['--no-sandbox']})
const errors=[],contexts=[]
async function device(){const c=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:1000}});contexts.push(c);await isolateNetwork(c,base);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);return {c,p}}
async function signin(p){await p.goto(base+'/account',{waitUntil:'domcontentloaded'});await p.getByLabel('Email address',{exact:true}).fill(email);await p.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await p.getByRole('button',{name:'Sign in securely',exact:true}).click().catch(async()=>{await p.getByRole('button',{name:'Sign in securely',exact:false}).click()});await p.waitForURL('**/account/dashboard')}
async function saved(p){await p.getByText('Saved to your account for this preparation attempt.',{exact:true}).waitFor()}
try{
 const a=await device();await signin(a.p);const cookies=await a.c.cookies(),csrf=cookies.find(c=>c.name==='cssv_csrf').value
 const request=await a.c.request.post(base+'/api/student/learning.php',{headers:{'X-CSRF-Token':csrf},data:{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,optional_subject_ids:[],daily_minutes:60,stage:'starting'}});assert.equal(request.status(),200);const attempt=(await request.json()).attempt_id
 const path=`/grammar-course?day=1&section=${concept.id}&attempt=${attempt}`,url=base+path
 await a.p.goto(url,{waitUntil:'domcontentloaded'});const note=a.p.getByRole('textbox',{name:/My note on/});await note.fill('Original account note from the first device.');await saved(a.p)
 const b=await device();await signin(b.p);await b.p.goto(url,{waitUntil:'domcontentloaded'});const second=b.p.getByRole('textbox',{name:/My note on/});await second.waitFor();assert.equal(await second.inputValue(),'Original account note from the first device.')
 await second.fill('A newer note saved on the second device.');await saved(b.p)
 await note.fill('An unsaved first-device revision that must survive conflict.');await a.p.getByText('This work changed on another device.',{exact:false}).waitFor();assert.equal(await note.inputValue(),'An unsaved first-device revision that must survive conflict.')
 await a.p.getByRole('button',{name:'Keep browser backup and load account copy',exact:true}).click();await saved(a.p);assert.equal(await note.inputValue(),'A newer note saved on the second device.')
 const backup=await a.p.evaluate(({id,attempt})=>{const prefix=`cssvista:grammar-course:v5:account:${id}:attempt:${attempt}:backup:`;return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>localStorage.getItem(k))},{id,attempt});assert(backup.some(x=>x.includes('An unsaved first-device revision')))
 // Commit once, lose the HTTP response, and recover through the retained request identity.
 let lost=false
 await a.p.route('**/api/student/grammar-v5.php',async route=>{if(!lost&&route.request().method()==='POST'){lost=true;await route.fetch();await route.abort();return}await route.continue()})
 const before=(await a.c.request.get(base+`/api/student/grammar-v5.php?attempt_id=${attempt}`)).json();const version=(await before).version
 await note.fill('The lost-response save must be recovered exactly once.');await a.p.getByRole('button',{name:'Retry account save',exact:true}).waitFor()
 await a.p.reload({waitUntil:'domcontentloaded'});await saved(a.p);await a.p.unroute('**/api/student/grammar-v5.php')
 const read=await a.c.request.get(base+`/api/student/grammar-v5.php?attempt_id=${attempt}`);const result=await read.json();assert.equal(result.version,version+1);assert.equal(result.state.notes[concept.id],'The lost-response save must be recovered exactly once.')
 await a.p.screenshot({path:'test-artifacts/grammar-v5-account-mobile.png',fullPage:true})
 assert.deepEqual(errors,[]);mkdirSync('test-artifacts',{recursive:true});writeFileSync('test-artifacts/grammar-v5-account-browser.json',JSON.stringify({passed:true,contentHash:catalog.contentHash,checks:['real browser sign-in','browser to native PHP to MySQL','fresh second device','mobile reading and note controls','conflict preserves live draft','backup before loading account copy','lost response exact replay'],pageErrors:errors},null,2))
 console.log('PASS: native signed-in grammar browser journeys, fresh-device read, concurrent edit recovery and exact lost-response replay.')
}finally{await Promise.all(contexts.map(c=>c.close()));await browser.close()}
