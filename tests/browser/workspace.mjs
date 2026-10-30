// Presentation fixtures only. Native authorization/sync are verified separately.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
const origin=process.env.CSSV_TEST_BROWSER_ORIGIN || 'http://localhost:5174'
if (!['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw Error('Loopback only')
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const context=await browser.newContext({reducedMotion:'reduce',ignoreHTTPSErrors:true})
let currentUser='fixture-a'
await context.route('**/*',async route=>{
 const url=new URL(route.request().url())
 if(url.origin!==origin) return route.abort()
 if(!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/workspace-preview.php') return route.fulfill({ json: { enabled: true, user_id: currentUser } })
 let data={}
 if(url.pathname==='/api/auth/session.php') data={ok:true,authenticated:true,provider:'hostinger',user:{id:currentUser,email:currentUser+'@example.invalid',display_name:'Test Student',profile_complete:true,user_metadata:{full_name:'Test Student'}}}
 else if(url.pathname==='/api/pro-release.php') data={paused:true}
 else if(url.pathname==='/api/student/progress.php') data=route.request().method()==='GET'?{payload:{}}:{ok:true,updated_at:new Date().toISOString()}
 else return route.fulfill({status:503,json:{error:'fixture_unavailable',message:'Service unavailable in presentation fixture'}})
 return route.fulfill({json:data})
})
const page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
page.setDefaultTimeout(30000)
mkdirSync('test-artifacts/workspace',{recursive:true})
try{
 await page.goto(origin+'/account/dashboard')
 await page.waitForTimeout(700);await page.evaluate(() => window.dispatchEvent(new Event('focus')))
 await page.waitForTimeout(300);await page.goto(origin+'/account/dashboard');await page.waitForTimeout(700);await page.evaluate(() => window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:'Today’s Study Plan',exact:true}).waitFor()
 assert.ok(await page.getByText('Nothing scheduled today.',{exact:false}).count())
 const today=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
 await page.evaluate(today=>{const state=(JSON.parse(localStorage.getItem('cssvista:v1')) || {});state.studyPlanner={examDate:'2027-02-01',dailyHours:4,restDay:5,selectedOptionals:['Political Science','Criminology','European History','Punjabi','Environmental Sciences'],configuredAt:new Date().toISOString()};state.studyScheduleTasks=[{id:'fixture-task',syllabusItemId:'political-science:0:0',subject:'Political Science',topic:'Review political theory',paper:'Paper I',section:'Introduction',date:today,minutes:30,status:'not-started'}];state.bookmarks=['fixture-mcq'];state.quizResults=[{id:'fixture-result',type:'quiz',category:'Science',score:4,total:5,date:new Date().toISOString()}];localStorage.setItem('cssvista:v1',JSON.stringify(state))},today)
 await page.reload();await page.waitForTimeout(700);await page.evaluate(() => window.dispatchEvent(new Event('focus')))
 await page.getByRole('button',{name:'Mark Review political theory complete',exact:true}).click()
 await page.getByText('1 of 1 scheduled tasks complete',{exact:true}).waitFor()
 await page.reload();await page.waitForTimeout(700);await page.evaluate(() => window.dispatchEvent(new Event('focus')))
 await page.getByRole('button',{name:'Mark Review political theory incomplete',exact:true}).waitFor()
 await page.evaluate(() => { window.fixtureSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key,value) { if (key === 'cssvista:v1') throw new DOMException('Fixture quota failure','QuotaExceededError'); return window.fixtureSetItem.call(this,key,value) } })
 await page.getByRole('button',{name:'Mark Review political theory incomplete',exact:true}).click()
 await page.getByText('Task could not be saved on this device. Try again.',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).studyScheduleTasks[0].status),'completed')
 await page.evaluate(() => { Storage.prototype.setItem = window.fixtureSetItem })
 const widths=[320,375,390,768,1024,1440],routes=['dashboard','tasks','subjects','practice','progress','library','settings','more']
 for(const width of widths){
  console.log('Checking width',width)
  await page.setViewportSize({width,height:960})
  for(const route of routes){
   await page.goto(origin+'/account/'+route); await page.waitForTimeout(700);await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.locator('.ws-content').waitFor(); await page.waitForTimeout(200)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${route} ${width}`)
   assert.equal(await page.getByRole('navigation',{name:'Primary mobile navigation',exact:true}).count(),0)
   if ([390,1440].includes(width)) { await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)}); await page.screenshot({path:`test-artifacts/workspace/${route}-${width}-viewport.png`}) }
  }
  if (width < 1024) {
    await page.getByRole('navigation',{name:'Student mobile navigation'}).getByRole('link',{name:'More',exact:true}).click()
    await page.getByRole('heading',{name:'Your workspace',exact:true}).waitFor()
    await page.getByRole('link',{name:'Subjects',exact:true}).click()
    await page.getByRole('heading',{name:'My Subjects',exact:true}).waitFor()
  } else {
    await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click()
    await page.getByRole('button',{name:'Expand sidebar',exact:true}).click()
  }
  await page.keyboard.press('Tab')
  assert.ok(await page.evaluate(()=>['A','BUTTON','INPUT','SELECT'].includes(document.activeElement.tagName)),'Keyboard focus reaches a control')
  await page.goto(origin+'/account/dashboard');await page.getByRole('heading',{name:'Today’s Study Plan',exact:true}).waitFor()
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});await page.waitForTimeout(200)
  await page.screenshot({path:`test-artifacts/workspace/dashboard-${width}.png`,fullPage:true})
 }
 await page.goto(origin+'/account/subjects');await page.getByRole('combobox').selectOption('comparative')
 await page.getByRole('heading',{name:'Comparative Study of Major Religions (For Non-Muslims)',exact:true}).waitFor()
 assert.equal(await page.getByRole('heading',{name:'Islamic Studies',exact:true}).count(),0)
 await page.goto(origin+'/account/directory');await page.getByRole('searchbox').fill('daily pdf')
 await page.getByRole('heading',{name:'Current Affairs Daily PDFs',exact:true}).waitFor()
 await page.getByRole('button',{name:'Unpin Current Affairs Daily PDFs',exact:true}).click()
 await page.goto(origin+'/account/dashboard');assert.equal(await page.getByRole('link',{name:'Current Affairs Daily PDFs Free',exact:true}).count(),0)
 await page.getByRole('button',{name:'Dismiss getting started',exact:true}).click()
 await page.reload();await page.getByRole('button',{name:'Reopen getting started',exact:true}).click()
 await page.goto(origin+'/account/precis');await page.getByRole('heading',{name:'CSS Vista Pro is temporarily unavailable',exact:true}).waitFor()
 await page.goto(origin+'/account/mpt');await page.getByRole('heading',{name:'Today’s Study Plan',exact:true}).waitFor()
 await page.goto(origin+'/account/progress');await page.getByText('4 / 5',{exact:false}).waitFor()
 currentUser='fixture-b';await page.reload();await page.waitForTimeout(700);await page.evaluate(() => window.dispatchEvent(new Event('focus')));await page.locator('.ws-content').waitFor()
 assert.equal(await page.evaluate(()=>(JSON.parse(localStorage.getItem('cssvista:v1'))?.quizResults ?? []).length),0)
 assert.equal(await page.evaluate(()=>localStorage.getItem('cssvista:workspace:v1:fixture-b')),null)
 assert.deepEqual(errors,[])
 writeFileSync('test-artifacts/workspace/result.json',JSON.stringify({widths,routes,errors,scope:'Mocked native API; frontend presentation and local persistence only'},null,2))
 console.log('Workspace fixture checks passed: six widths, eight routes, task refresh, alternative, search, pins, pause, MPT and account switch.')
}catch(error){await page.screenshot({path:'test-artifacts/workspace/failure.png',fullPage:true});console.error(await page.locator('body').innerText());throw error}finally{await browser.close()}
