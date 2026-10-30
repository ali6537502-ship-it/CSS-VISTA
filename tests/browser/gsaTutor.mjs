import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin=process.env.CSSV_GSA_BROWSER_ORIGIN||'http://127.0.0.1:5173'
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
   await context.close()
 }
 assert.deepEqual(problems,[],problems.join('; '))
}finally{await browser.close()}
