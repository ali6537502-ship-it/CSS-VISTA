import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { chromium } from './node_modules/playwright-core/index.mjs'
import { build } from 'esbuild'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const base='https://localhost:3444',email=`workspace-browser-${randomUUID()}@example.invalid`
const user=php('tests/current-affairs/setup.php','user',email)
const seeded=JSON.parse(php('tests/workspace/fixture.php','seed',user))
const bundle=await build({entryPoints:['src/features/factbook/safety.ts'],bundle:true,write:false,format:'iife',globalName:'factbookSafety'})
const browser=await chromium.launch({headless:true,executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath()})
const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
await context.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort())
try{
 await page.goto(base+'/account');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await page.getByRole('button',{name:'Sign in securely',exact:true}).click();await page.waitForURL('**/account/dashboard')
 await page.getByRole('link',{name:'Resume saved work',exact:true}).waitFor()
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000})
  for(const [path,title] of [['/account/dashboard','Today'],['/account/learn','Learn'],['/account/writing','Write'],['/account/review','Review'],['/account/library','Library'],['/account/library/search','Search your library'],['/account/progress','Progress']]){
   await page.goto(base+path);await page.getByRole('heading',{name:title,exact:true,level:1}).waitFor()
   await page.getByRole('navigation',{name:'Study workspace'}).waitFor()
   assert.equal(await page.getByRole('navigation',{name:'Study workspace'}).getByRole('link').count(),6)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflow at ${width}`)
  }
 }
 await page.goto(base+'/account/library/search');await page.getByRole('textbox',{name:'Search saved work'}).fill('Synthetic research 03');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('link',{name:'Synthetic research 03',exact:true}).click();await page.waitForURL('**/account/preparation?writing='+seeded.writing[3]);await page.getByRole('textbox',{name:'Your writing',exact:true}).waitFor();await page.goBack();await page.getByRole('link',{name:'Synthetic research 03',exact:true}).waitFor()

 let factbookWrites=0
 page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/factbook/data.php'){try{if(request.postDataJSON()?.action==='save_entry')factbookWrites++}catch{}}})
 await page.goto(base+'/factbook?entry='+seeded.factbook)
 const editor=page.getByRole('textbox',{name:'Formatted note',exact:true})
 await editor.waitFor()
 await page.waitForTimeout(1600) // Longer than the existing autosave debounce.
 assert.equal(factbookWrites,0,'Opening retained work created an unrequested save')
 assert.ok((await editor.innerHTML()).includes('Legacy meaning'))
 assert.equal(await page.evaluate(()=>window.__factbookUnsafe||0),0,'Stored legacy markup executed in editor')
 await editor.focus()
 await editor.evaluate(node=>{
  const data=new DataTransfer();data.setData('text/html','<unknown><img src=x onerror="window.__factbookUnsafe=1"></unknown><p>Safe pasted text</p>')
  node.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}))
 })
 assert.ok((await editor.innerHTML()).includes('Safe pasted text'))
 assert.equal(await page.evaluate(()=>window.__factbookUnsafe||0),0,'Paste executed before sanitization')
 assert.equal(await editor.locator('img,[onerror],svg,math').count(),0)
 await page.getByRole('button',{name:'Close',exact:true}).click()
 await page.goto(base+'/account/library/search?q=Synthetic%20research%2003')
 await page.getByRole('link',{name:'Synthetic research 03',exact:true}).waitFor()
 // Exercise the actual maintained sanitizer in a real DOM, including repeat insertion.
 await page.addScriptTag({content:bundle.outputFiles[0].text})
 const attacks=[
  '<unknown><unknown><img src=x onerror="window.__unsafe=1"></unknown></unknown>',
  '<svg><g onload="window.__unsafe=1"></g></svg>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=window.__unsafe=1>">',
  '<a href="javascript:window.__unsafe=1" onclick="window.__unsafe=1">link</a>',
  '<form><input name=attributes><p onclick="window.__unsafe=1">Text</p></form>',
  '<p><iframe srcdoc="<script>parent.__unsafe=1</script>"></iframe>Safe</p>',
 ]
 for(const payload of attacks){
  const result=await page.evaluate(async html=>{
   window.__unsafe=0
   let clean=html
   for(let n=0;n<3;n++)clean=window.factbookSafety.sanitizeRichText(clean)
   const node=document.createElement('div');node.innerHTML=clean;document.body.append(node);await new Promise(r=>setTimeout(r,40));const bad=node.querySelector('script,img,svg,math,iframe,[onclick],[onerror],[onload]');const flag=window.__unsafe;node.remove();return {flag,bad:!!bad}
  },payload)
  assert.deepEqual(result,{flag:0,bad:false})
 }
 assert.equal(await page.evaluate(()=>window.factbookSafety.sanitizeRichText('<p>Meaning <strong>kept</strong> — اردو</p>')),'<p>Meaning <strong>kept</strong> — اردو</p>')
 mkdirSync('test-artifacts/workspace',{recursive:true});await page.evaluate(() => window.scrollTo(0,0));await page.screenshot({path:'test-artifacts/workspace/search.png',fullPage:true})
 php('tests/pro/fixture.php','incomplete',user)
 await page.goto(base+'/account/dashboard')
 await page.getByRole('heading',{name:'One profile. All your study services.',exact:true}).waitFor()
 assert.equal(await page.locator('main').count(),1,'Incomplete-profile state must retain one primary landmark')
 assert.deepEqual(errors,[])
 writeFileSync('test-artifacts/workspace/browser.json',JSON.stringify({widths:[320,390,768,1024,1440],routes:7,sanitizerAttacks:attacks.length,pageErrors:errors,scope:'Chromium lab; no physical device or assistive-technology certification'},null,2))
 console.log('PASS: built native sign-in, seven workspace views at five widths, exact saved-writing navigation and Back, six DOM sanitizer attack classes and repeated sanitization; no page errors.')
}finally{await browser.close()}
