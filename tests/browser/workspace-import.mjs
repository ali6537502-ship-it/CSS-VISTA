import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { chromium } from './node_modules/playwright-core/index.mjs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const email=`import-browser-${randomUUID()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email)
const seeded=JSON.parse(php('tests/workspace/fixture.php','seed',user)),foreign=randomUUID()
const answer={id:'test-only-local-answer',question:'TEST ONLY Institutions and public trust',subject:'TEST ONLY Governance',date:'2025-01-01',minutes:40,outline:'Original outline',intro:'Original introduction',text:'  Original body — اردو x² = 4 🧪\r\n<img src=x onerror="window.__unsafeImport=1">  ',conclusion:'Original conclusion'}
let raw=JSON.stringify({savedAnswers:[answer],quizResults:[{score:100}],subjectProgress:{test:100}})
const browser=await chromium.launch({headless:true,executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath()})
const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message))
await context.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort())
async function login(p){await p.goto('https://localhost:3444/account');await p.getByLabel('Email address',{exact:true}).fill(email);await p.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await p.getByRole('button',{name:'Sign in securely',exact:true}).click();await p.waitForURL('**/account/dashboard')}
async function open(){await page.goto('https://localhost:3444/account/library');await page.getByRole('button',{name:'Preview browser writing imports',exact:true}).click()}
async function select(){await page.getByRole('button',{name:'Preview: '+answer.question,exact:true}).click();await page.getByRole('combobox',{name:'Destination preparation attempt',exact:true}).selectOption(seeded.attempt)}
let posts=0,drop=false
await page.route('**/api/student/learning.php',async route=>{
 if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='writing_save'){
  posts++
  if(drop){drop=false;const response=await route.fetch();assert.equal(response.status(),200,'The injected lost response must follow a real committed save');await route.abort('failed');return}
 }
 await route.continue()
})
try{
 await login(page)
 await page.evaluate(({raw,foreign})=>{localStorage.setItem('cssvista:v1',raw);localStorage.setItem(`cssvista:draft:learning:v1:${foreign}:new`,JSON.stringify({title:'FOREIGN ACCOUNT DRAFT',kind:'paragraph',text:'FOREIGN PRIVATE TEXT'}))},{raw,foreign})
 const priorRequest=randomUUID(),draft={title:'TEST ONLY Own account draft',text:'TEST ONLY pending normal writing',kind:'paragraph',attemptId:seeded.attempt,baseVersion:0}
 const prior=await page.evaluate(async({user,request,draft,attempt})=>{
  const body={action:'writing_save',expected_version:0,attempt_id:attempt,kind:draft.kind,title:draft.title,text:draft.text}
  const csrf=decodeURIComponent(document.cookie.split('; ').find(v=>v.startsWith('cssv_csrf='))?.slice('cssv_csrf='.length)||'')
  const response=await fetch('/api/student/learning.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,'X-CSSV-User':user},body:JSON.stringify({...body,request_id:request})})
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body))),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')
  localStorage.setItem(`cssvista:draft:learning:v1:${user}:new`,JSON.stringify(draft));sessionStorage.setItem(`cssvista:learning-request:${user}:writing:new`,JSON.stringify({id:request,hash}))
  return response.status
 },{user,request:priorRequest,draft,attempt:seeded.attempt});assert.equal(prior,200);posts=0
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await open();assert.equal(await page.getByRole('button',{name:'Preview: '+answer.question,exact:true}).count(),0,'Unscoped writing was adopted without inspection')
  assert.equal((await page.locator('main').innerText()).includes('FOREIGN PRIVATE TEXT'),false)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Import controls overflow at ${width}`)
 }
 await page.getByRole('button',{name:'Preview: Your unsaved account writing draft',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Confirm import as new writing',exact:true}).count(),0);await page.getByRole('link',{name:'Resume original writing draft',exact:true}).waitFor()
 await page.getByRole('button',{name:'Check earlier writing receipt',exact:true}).click();await page.getByRole('link',{name:'Open earlier confirmed writing',exact:true}).waitFor();assert.equal(posts,0)
 raw=await page.evaluate(()=>localStorage.getItem('cssvista:v1'));assert.deepEqual(JSON.parse(raw).savedAnswers,[answer]);assert.deepEqual(JSON.parse(raw).quizResults,[{score:100}])
 await page.getByRole('button',{name:'Inspect this browser’s saved answers',exact:true}).click();await select()
 const confirm=page.getByRole('button',{name:'Confirm import as new writing',exact:true}),ownership=page.getByRole('checkbox',{name:/I recognise this as my own writing/})
 assert.equal(await confirm.isDisabled(),true);assert.equal(posts,0)
 await page.setViewportSize({width:320,height:1000})
 await page.evaluate(async()=>{window.scrollTo(0,0);await document.fonts.ready;await new Promise(requestAnimationFrame)})
 await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname})
 const violations=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});assert.deepEqual(violations,[])
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Selected preview overflows at 320 pixels')
 mkdirSync('test-artifacts/workspace-import',{recursive:true});await page.screenshot({path:'test-artifacts/workspace-import/preview-320.png',fullPage:true})
 const [exported]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export original browser writing',exact:true}).click()]);const backup=JSON.parse(readFileSync(await exported.path(),'utf8'));assert.equal(backup.unscopedBrowserRecord,raw);assert.deepEqual(JSON.parse(backup.accountDraft),draft)
 await ownership.focus();await page.keyboard.press('Space');assert.equal(await ownership.isChecked(),true)
 await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('cssvista:v1'));data.savedAnswers[0].text='Changed after preview';localStorage.setItem('cssvista:v1',JSON.stringify(data))})
 await confirm.click();await page.getByRole('alert').filter({hasText:'changed after this preview'}).waitFor();assert.equal(posts,0)
 await page.evaluate(raw=>localStorage.setItem('cssvista:v1',raw),raw)
 await page.getByRole('button',{name:'Refresh browser preview',exact:true}).click();await select();await ownership.check();drop=true;await confirm.click();await page.getByRole('alert').waitFor();assert.equal(posts,1)
 assert.equal(await page.evaluate(()=>localStorage.getItem('cssvista:v1')),raw)
 await open();assert.equal(posts,1,'Reopening replayed a mutation automatically')
 await page.getByRole('button',{name:'Check save receipt',exact:true}).click();const saved=page.getByRole('link',{name:'Open confirmed writing version 1',exact:true});await saved.waitFor();const destination=await saved.getAttribute('href');assert.ok(destination.includes('&version='))
 await saved.click();await page.getByRole('heading',{name:answer.question,exact:true}).waitFor();const savedText=await page.locator('main').innerText();for(const text of ['Original outline','Original introduction','Original conclusion','Original body — اردو x² = 4 🧪','2025-01-01'])assert.ok(savedText.includes(text))
 assert.equal(await page.evaluate(()=>window.__unsafeImport||0),0)
 assert.equal(await page.evaluate(()=>localStorage.getItem('cssvista:v1')),raw)
 // Re-preview the unchanged original and same destination: native receipt replay creates no duplicate.
 await open();await page.getByRole('button',{name:'Inspect this browser’s saved answers',exact:true}).click();await select();await ownership.check();await confirm.click();await page.getByRole('status').filter({hasText:'Account save confirmed'}).waitFor();assert.equal(posts,2)
 assert.equal(await page.getByRole('link',{name:'Open confirmed writing version 1',exact:true}).getAttribute('href'),destination)
 const second=await browser.newContext({ignoreHTTPSErrors:true});await second.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort());const another=await second.newPage();await login(another);await another.goto('https://localhost:3444'+destination);await another.getByRole('heading',{name:answer.question,exact:true}).waitFor();assert.ok((await another.locator('main').innerText()).includes('Original body — اردو x² = 4 🧪'));
 await another.evaluate(answer=>{const state=JSON.parse(localStorage.getItem('cssvista:v1')||'{}');state.savedAnswers=[Object.fromEntries(Object.entries(answer).reverse())];localStorage.setItem('cssvista:v1',JSON.stringify(state))},answer)
 await another.goto('https://localhost:3444/account/library');await another.getByRole('button',{name:'Preview browser writing imports',exact:true}).click();await another.getByRole('button',{name:'Inspect this browser’s saved answers',exact:true}).click();await another.getByRole('button',{name:'Preview: '+answer.question,exact:true}).click();await another.getByRole('combobox',{name:'Destination preparation attempt',exact:true}).selectOption(seeded.attempt);await another.getByRole('checkbox',{name:/I recognise this as my own writing/}).check();await another.getByRole('button',{name:'Confirm import as new writing',exact:true}).click();await another.getByRole('link',{name:'Open confirmed writing version 1',exact:true}).waitFor();assert.equal(await another.getByRole('link',{name:'Open confirmed writing version 1',exact:true}).getAttribute('href'),destination,'Restored cache field ordering created another account record');await second.close()
 const writingId=new URL(destination,'https://localhost').searchParams.get('writing')
 const data=await page.evaluate(async id=>{const r=await fetch('/api/student/learning.php?writing_id='+id);return r.json()},writingId);assert.equal(data.writing.versions.length,1)
 await page.goto('https://localhost:3444/account/progress');await page.getByRole('heading',{name:'This browser’s preparation record',exact:true}).waitFor();const retained=await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')));assert.deepEqual(retained.savedAnswers,[answer]);assert.deepEqual(retained.quizResults,[{score:100}]);assert.deepEqual(retained.subjectProgress,{test:100})
 assert.deepEqual(errors,[])
 console.log('PASS: explicit local preview/ownership/destination; changed source refused; lost response after real commit recovered by read-only receipt; replay creates one exact immutable version; original raw JSON and history retained; separate browser session opens account copy; five widths and no page errors. Synthetic browser sessions, not physical-device certification.')
}finally{await browser.close()}
