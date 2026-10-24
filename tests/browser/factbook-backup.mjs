import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {chromium} from './node_modules/playwright-core/index.mjs'
import {ENTRY_TYPE_DEFINITIONS,createEmptyContent} from '../../src/features/factbook/entryTypes.ts'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const email=`factbook-browser-${randomUUID()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email)
const content=ENTRY_TYPE_DEFINITIONS.map(({type})=>({type,content:{...createEmptyContent(type),html:'<unknown><img src=x onerror="window.__unsafeFactbook=1"></unknown><p>TEST ONLY meaning <strong>kept</strong> — اردو x² = 4</p>'}}))
const seed=JSON.parse(php('tests/workspace/factbook-backup-fixture.php','seed',user,JSON.stringify(content),'autosave'))
php('tests/workspace/factbook-backup-fixture.php','rates',user)
const digest=()=>php('tests/workspace/factbook-backup-fixture.php','digest',user),before=digest()
const browser=await chromium.launch({headless:true,executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath()})
const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message))
await context.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort())
const base='https://localhost:3444',artifacts='test-artifacts/factbook-backup'
mkdirSync(artifacts,{recursive:true})
await context.tracing.start({screenshots:true,snapshots:true})
let writes=0
page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/factbook/data.php'&&request.postDataJSON()?.action==='save_entry')writes++})
try{
 await page.goto(base+'/account');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('TEST ONLY native fixture password');await page.getByRole('button',{name:'Sign in securely',exact:true}).click();await page.waitForURL('**/account/dashboard')
 const rich=seed.entries[content.findIndex(item=>item.type==='rich-note')]
 await page.goto(base+'/factbook?entry='+rich)
 const editor=page.getByRole('textbox',{name:'Formatted note',exact:true});await editor.waitFor();await page.waitForTimeout(1600)
 assert.match(await editor.innerText(),/meaning kept — اردو/);assert.equal(await editor.locator('[onerror],img,script').count(),0);assert.equal(writes,0);assert.equal(digest(),before)
 await page.getByRole('button',{name:'Close entry editor'}).click();assert.equal(new URL(page.url()).searchParams.get('entry'),null)
 await page.getByRole('button',{name:'Settings & Trash',exact:true}).click()
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export complete backup',exact:true}).click();const download=await downloading,file=artifacts+'/complete.json';await download.saveAs(file)
 const backup=JSON.parse(readFileSync(file,'utf8'));assert.equal(backup.entries.length,17);assert.equal(backup.related.factbook_revisions.length,1);assert.equal(backup.related.factbook_media.length,1);assert.ok(backup.entries.some(e=>e.deleted_at));assert.ok(backup.entries.some(e=>e.archived_at));assert.equal(digest(),before)
 await page.getByRole('button',{name:'Print active Factbook',exact:true}).click();const print=page.getByRole('dialog',{name:'Prepare Factbook document'});await print.waitFor();assert.match(await print.innerText(),/meaning kept — اردو/)
 await page.evaluate(()=>{window.print=()=>{window.__printChecked=document.body.classList.contains('factbook-printing');window.dispatchEvent(new Event('afterprint'))}})
 await print.getByRole('button',{name:'Open browser print / Save PDF',exact:true}).click();await page.waitForFunction(()=>window.__printChecked===true);assert.equal(await page.evaluate(()=>document.body.classList.contains('factbook-printing')),false)
 await page.getByRole('button',{name:'Close print settings'}).click();assert.equal(digest(),before);assert.equal(writes,0)
 const choose=()=>page.locator('input[type=file][accept*="json"]').setInputFiles(file)
 await choose();let modal=page.getByRole('dialog',{name:'Validate Factbook Backup'});await modal.waitFor();assert.equal(await modal.getByRole('button',{name:'Confirm Import',exact:true}).isDisabled(),true)
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Modal overflow '+width)}
 for(let i=0;i<15;i++){await page.keyboard.press('Tab');assert.ok(await modal.evaluate(node=>node.contains(document.activeElement)),'Tab escaped modal')}
 await page.addScriptTag({path:'tests/browser/node_modules/axe-core/axe.min.js'})
 const accessibility=await page.evaluate(async()=>window.axe.run(document.querySelector('[role=dialog]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(accessibility.violations.map(v=>v.id),[])
 await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});assert.ok(await page.evaluate(()=>document.activeElement!==document.body),'Focus not restored')
 await choose();modal=page.getByRole('dialog',{name:'Validate Factbook Backup'});await modal.waitFor()
 let lost=false,posts=0
 await page.route('**/api/factbook/backup.php',async route=>{if(route.request().method()!=='POST')return route.continue();posts++;if(lost)return route.continue();const response=await route.fetch();assert.equal(response.status(),200);lost=true;await route.abort('failed')})
 await modal.getByRole('checkbox',{name:/I recognise this as my own backup/}).check();await modal.getByRole('button',{name:'Confirm Import',exact:true}).click();await modal.getByRole('alert').waitFor();assert.match(await modal.getByRole('alert').innerText(),/interrupted|receipt/)
 await modal.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Check last restore receipt',exact:true}).click();await page.getByText(/Restore confirmed: 17 entries/).waitFor();assert.equal(posts,1,'Receipt check resent restore')
 const restoredDigest=digest();assert.notEqual(restoredDigest,before)
 await choose();modal=page.getByRole('dialog',{name:'Validate Factbook Backup'});await modal.getByRole('checkbox',{name:/I recognise this as my own backup/}).check();await modal.getByRole('button',{name:'Confirm Import',exact:true}).click();await modal.waitFor({state:'detached'});await page.getByText(/Earlier restore confirmed/).waitFor();assert.equal(digest(),restoredDigest,'Same-file retry duplicated records')
 const [downloaded]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export complete backup',exact:true}).click()]);const afterFile=artifacts+'/after.json';await downloaded.saveAs(afterFile);const after=JSON.parse(readFileSync(afterFile,'utf8'));assert.equal(after.entries.length,34);for(const entry of backup.entries)assert.deepEqual(after.entries.find(e=>e.id===entry.id),entry)
 const copiedRich=after.entries.find(e=>e.entry_type==='rich-note'&&e.id!==rich);await page.goto(base+'/factbook?entry='+copiedRich.id);await editor.waitFor();await page.waitForTimeout(1600);assert.equal(writes,0);assert.equal(digest(),restoredDigest);assert.equal(await page.evaluate(()=>window.__unsafeFactbook||0),0)
 assert.deepEqual(errors,[])
 writeFileSync(artifacts+'/browser.json',JSON.stringify({formats:17,widths:[320,390,768,1024,1440],lostResponseRecovered:true,readMutations:writes,axeViolations:[],pageErrors:errors,scope:'Built Chromium native test. No physical device, manual AT or PDF artifact certification.'},null,2))
 console.log('PASS: built native backup/download, safe read/print without autosave, 17 formats/all states/history/image bytes, restore modal at five widths, keyboard/focus/axe, real committed lost-response receipt and same-file replay; originals retained.')
}catch(error){writeFileSync(artifacts+'/failure.html',await page.content());await page.screenshot({path:artifacts+'/failure.png',fullPage:true});throw error}finally{await context.tracing.stop({path:artifacts+'/trace.zip'});await browser.close()}
