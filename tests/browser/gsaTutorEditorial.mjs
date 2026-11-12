import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdir } from 'node:fs/promises'
const origin=process.env.CSSV_GSA_EDITORIAL_ORIGIN||'http://127.0.0.1:5175'
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local editorial fixtures only')
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const errors=[];await mkdir('test-artifacts/gsa-tutor',{recursive:true})
try{
 const response=await fetch(origin+'/__gsa-editorial__/index.json');assert.equal(response.status,200)
 const units=await response.json();assert.ok(units.length>=16)
 const spoof=await new Promise((resolve,reject)=>{const request=http.get(origin+'/__gsa-editorial__/index.json',{headers:{host:'foreign.invalid'}},response=>{response.resume();resolve(response.statusCode)});request.on('error',reject)});assert.ok([403,404].includes(spoof))
 for(const width of [320,768,1440]){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage()
  page.on('pageerror',e=>errors.push(e.message))
  const seed={plan:{days:20,startDate:'2026-11-12'},completed:{retained:{at:'2026-11-11'}},drafts:{retained:'Do not change'}}
  await page.addInitScript(seed=>localStorage.setItem('cssvista:tool:gsa-tutor:v1',JSON.stringify(seed)),seed)
  await page.goto(origin+'/gsa-tutor/studio.html?editorial=1',{waitUntil:'networkidle'})
  await page.locator('[data-view="editorial"]').last().click()
  assert.equal(await page.locator('[data-lesson]').count(),units.length)
  await page.locator('[data-lesson="c6-s6-4"]').click()
  await page.getByRole('navigation',{name:'Eight teaching stages'}).waitFor()
  for(let stage=0;stage<8;stage++){
   await page.locator('nav [data-unit-stage="'+stage+'"]').click()
   assert.ok((await page.locator('.lesson-card').innerText()).trim().length>60)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=2,'stage '+stage+' overflows at '+width)
   if(stage===5){
    await page.locator('[data-unit-option="A"]').first().click()
    assert.ok(await page.locator('.feedback').count()>0)
    assert.match(await page.locator('.feedback').first().innerText(),/draft key|reasoning/)
   }
   if(stage===6){await page.locator('#unit-writing').fill('This is an editorial response that must stay in memory.');await page.locator('[data-action="unitreveal"]').click();await page.getByRole('table').waitFor()}
  }
  {
   for(const unit of units){
    await page.locator('[data-view="editorial"]').first().click()
    await page.locator('[data-lesson="'+unit.lessonId+'"]').click()
    for(let stage=0;stage<8;stage++){
     await page.locator('nav [data-unit-stage="'+stage+'"]').click()
     assert.ok((await page.locator('.lesson-card').innerText()).trim().length>60)
     if(stage===5)await page.locator('[data-unit-option="A"]').first().click()
     if(stage===6)await page.locator('[data-action="unitreveal"]').click()
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=2,unit.lessonId+' stage '+stage+' overflows')
    }
   }
  }
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:tool:gsa-tutor:v1'))),seed,'Editorial preview changed saved student records')
  await page.screenshot({path:'test-artifacts/gsa-tutor/editorial-'+width+'.png',fullPage:true})
  await page.evaluate(()=>localStorage.setItem('cssvista:progress-owner','another-editorial-fixture'))
  await page.locator('[data-view="course"]').first().click()
  await page.getByRole('heading',{name:'Study account changed',exact:true}).waitFor()
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:tool:gsa-tutor:v1'))),seed)
  await context.close()
 }
 assert.deepEqual(errors,[])
 console.log('PASS editorial: 16 draft units, all eight stages at 320/768/1440, choice explanations, model rubric, source guards and zero saved-record writes.')
}finally{await browser.close()}
