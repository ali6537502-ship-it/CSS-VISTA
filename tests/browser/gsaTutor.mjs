import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'

const origin=process.env.CSSV_GSA_BROWSER_ORIGIN||'http://127.0.0.1:5173'
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Loopback fixtures only')
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const problems=[]
await mkdir('test-artifacts/gsa-tutor',{recursive:true})
try{
 for(const width of [320,375,768,1440]){
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
   assert.ok(await page.locator('.day').count()>8,'Budgeted plan extends an unrealistic deadline')
   assert.equal(await page.locator('.day-lesson').count(),141)
   await page.locator('.day-lesson').first().click()
   await page.locator('.lesson-card').waitFor()
   assert.equal(fetched.filter(x=>x.includes('chapter-')).length,1,'only one chapter fetched for the first lesson')
   let beats=0
   while(await page.locator('[data-action="nextbeat"]').count()){
     await page.locator('[data-action="nextbeat"]').click()
     if(++beats>40)throw Error('Lesson sequence is stuck')
   }
   if(await page.locator('[data-choice]').count()){
     const prompt=(await page.locator('.lesson-card h2').innerText()).trim()
     const questions=JSON.parse(readFileSync('public/gsa-tutor/content/chapter-01.json','utf8')).questions
     const sourceQuestion=questions.find(q=>q.prompt===prompt)
     assert.ok(sourceQuestion,'Source question must be traceable to a verified key')
     await page.locator('[data-choice="'+sourceQuestion.answer+'"]').click()
   }
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
   if(width===768){
     await page.locator('[data-view="library"]').click()
     await page.locator('[data-chapter="9"]').click()
     await page.locator('[data-lesson="c9-s9-3"]').click()
     await page.locator('[data-osm="hyper"]').click()
     assert.match(await page.locator('.science-graphic svg').getAttribute('aria-label'),/Net water moves out/)
     assert.equal(await page.locator('[data-osm="hyper"]').getAttribute('aria-pressed'),'true')
     await page.locator('[data-view="library"]').click()
     await page.locator('[data-chapter="18"]').click()
     await page.locator('[data-lesson="c18-s18-1"]').click()
     await page.locator('[data-water="4"]').click()
     assert.match(await page.locator('.science-graphic svg').getAttribute('aria-label'),/step 5 highlighted/)
   }
   if(width===320){
     await page.locator('[data-view="library"]').click()
     await page.locator('[data-chapter="6"]').click()
     await page.locator('[data-lesson="c6-s6-4"]').click()
     await page.locator('[data-radio-mhz="300"]').focus()
     await page.keyboard.press('Enter')
     assert.equal(await page.locator('[data-radio-mhz="300"]').getAttribute('aria-pressed'),'true')
     assert.match(await page.locator('.model [role="status"]').innerText(),/1 m/)
     assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-radio-mhz')),'300','Interaction must retain keyboard focus')
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=2)
     await page.screenshot({path:'test-artifacts/gsa-tutor/radiation-320.png',fullPage:true})
     await page.locator('[data-view="practice"]').click()
     await page.locator('[data-practice="14"]').click()
     await page.locator('[data-analytical="GS26-W-BIO"]').click()
     await page.locator('#write').fill('Organic material is broken down without oxygen in a reactor. Biogas is distinct from the remaining digestate.')
     await page.locator('[data-action="revealwriting"]').click()
     await page.locator('[data-rubric="0"]').check()
     await page.locator('[data-action="saveevaluation"]').click()
     const evaluation=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('cssvista:tool:gsa-tutor:v1')).writingAttempts)[0])
     assert.equal(evaluation.evaluation,'learner-self-evaluation')
     assert.equal(evaluation.selfAwarded,1)
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=2)
     await page.screenshot({path:'test-artifacts/gsa-tutor/writing-320.png',fullPage:true})
   }
   if(width===1440){
     await page.evaluate(()=>document.documentElement.style.zoom='200%')
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=2,'No overflow at 200% zoom')
     await page.screenshot({path:'test-artifacts/gsa-tutor/zoom-200.png',fullPage:true})
   }
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
 console.log('PASS standalone GSA: four responsive lesson journeys, keyboard model controls, 200% zoom, pilot writing rubrics, stale writer/account-switch redaction, real reload recovery and reset-generation isolation.')
}finally{await browser.close()}
