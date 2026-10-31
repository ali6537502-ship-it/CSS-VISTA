import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin=process.env.CSSV_GSA_BROWSER_ORIGIN||'http://127.0.0.1:5173'
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Loopback fixtures only')
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const problems=[]
await mkdir('test-artifacts/gsa-tutor',{recursive:true})
try{
 for(const width of [375,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900}})
   const page=await context.newPage()
   page.on('pageerror',e=>problems.push(width+': '+e.message))
   const fetched=[]
   page.on('request',request=>{if(request.url().includes('/gsa-tutor/content/'))fetched.push(request.url())})
   await page.goto(origin+'/gsa-tutor/studio.html',{waitUntil:'networkidle'})
   await page.getByRole('heading',{name:'Choose how much time you have.'}).waitFor()
   assert.equal(fetched.filter(x=>x.includes('chapter-')).length,0,'do not download chapters until they are needed')
   await page.locator('[data-days="8"]').click()
   await page.locator('[data-action="saveplan"]').click()
   await page.locator('[data-action="expandplan"]').click()
   assert.equal(await page.locator('.day').count(),8)
   assert.equal(await page.locator('.day-lesson').count(),141)
   await page.locator('.day-lesson').first().click()
   await page.locator('.lesson-card').waitFor()
   assert.equal(fetched.filter(x=>x.includes('chapter-')).length,1,'only one chapter fetched for the first lesson')
   let beats=0
   while(await page.locator('[data-action="nextbeat"]').count()){
     await page.locator('[data-action="nextbeat"]').click()
     if(++beats>40)throw Error('Lesson sequence is stuck')
   }
   if(await page.locator('[data-choice]').count())await page.locator('[data-choice]').first().click()
   if(await page.locator('[data-action="torecall"]').count())await page.locator('[data-action="torecall"]').click()
   await page.locator('#recall').fill('The observable universe is the region from which signals have reached us. Scientific observations inform models, while the observable boundary is not a physical wall. Light travel time reveals earlier stages of cosmic history.')
   await page.locator('[data-action="reveal"]').click()
   await page.locator('.compare').waitFor()
   await page.locator('[data-grade="gotit"]').click()
   await page.locator('[data-action="finish"]').click()
   await page.getByText('1 / 141').first().waitFor()
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:tool:gsa-tutor:v1')))
   assert.ok(state.completed['c1-s1-1'])
   assert.ok(state.drafts['c1-s1-1'])
   await page.locator('[data-view="course"]').last().click()
   assert.ok(await page.locator('.day-lesson.done').count()===1)
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)
   assert.ok(overflow<=2,'unwanted horizontal scroll at '+width+': '+overflow)
   await page.screenshot({path:'test-artifacts/gsa-tutor/learning-'+width+'.png',fullPage:true})
   if(width===375){
     await page.locator('.day-lesson').first().click();await page.locator('.lesson-card').waitFor()
     const empty={plan:null,completed:{},drafts:{}}
     await page.evaluate(empty=>{localStorage.setItem('cssvista:progress-owner','standalone-fixture-b');localStorage.setItem('cssvista:tool:gsa-tutor:v1',JSON.stringify(empty))},empty)
     await page.locator('[data-action="bookmark"]').click()
     await page.getByRole('heading',{name:'Study account changed',exact:true}).waitFor()
     assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:tool:gsa-tutor:v1'))),empty,'Stale standalone page overwrote another account')
     await page.getByRole('button',{name:'Reload course',exact:true}).click();await page.getByRole('heading',{name:'Choose how much time you have.',exact:true}).waitFor()
     await page.locator('[data-days="8"]').click();await page.locator('[data-action="saveplan"]').click()
     await context.route(origin+'/gsa-isolation-helper.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Disposable storage-event fixture</title>'}))
     const second=await context.newPage();await second.goto(origin+'/gsa-isolation-helper.html')
     await second.evaluate(empty=>{localStorage.setItem('cssvista:tool:gsa-tutor:v1',JSON.stringify(empty));localStorage.setItem('cssvista:progress-owner','standalone-fixture-c')},empty)
     await page.getByRole('heading',{name:'Study account changed',exact:true}).waitFor();assert.equal(await page.locator('.day-lesson').count(),0)
     await page.getByRole('button',{name:'Reload course',exact:true}).click();await page.getByRole('heading',{name:'Choose how much time you have.',exact:true}).waitFor();await second.close()
     await page.locator('[data-days="8"]').click();await page.locator('[data-action="saveplan"]').click();await page.locator('.day-lesson').first().click();await page.locator('.lesson-card').waitFor()
     await page.evaluate(()=>{localStorage.setItem('cssvista:sync-generation:v1:standalone-fixture-c','fixture-reset');localStorage.removeItem('cssvista:tool:gsa-tutor:v1')})
     await page.locator('[data-action="bookmark"]').click();await page.getByRole('alert').filter({hasText:'could not be saved'}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('cssvista:tool:gsa-tutor:v1')),null)
     await page.reload();await page.getByRole('heading',{name:'Choose how much time you have.',exact:true}).waitFor();await page.locator('[data-days="8"]').click();await page.locator('[data-action="saveplan"]').click()
     assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(`cssvista:reset-data:v1:standalone-fixture-c:fixture-reset:${encodeURIComponent('cssvista:tool:gsa-tutor:v1')}`)).plan.days),8)
     assert.equal(await page.evaluate(()=>localStorage.getItem('cssvista:tool:gsa-tutor:v1')),null)
   }
   await context.close()
 }
 assert.deepEqual(problems,[],problems.join('; '))
 console.log('PASS standalone GSA: three responsive lesson journeys, stale writer/account-switch redaction, real reload recovery and reset-generation isolation.')
}finally{await browser.close()}
