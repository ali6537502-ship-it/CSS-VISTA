import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'http://localhost:5175'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback fixtures only')
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',ignoreHTTPSErrors:true})
let slow=false,fail=false
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());if(url.origin!==base)return route.abort()
 if(url.pathname==='/fpsc-syllabus.json'&&fail)return route.fulfill({status:503,body:'Unavailable'})
 if(url.pathname==='/fpsc-syllabus.json'&&slow)await new Promise(r=>setTimeout(r,1500))
 if(!url.pathname.startsWith('/api/'))return route.continue()
 let data={}
 if(url.pathname==='/api/auth/session.php')data={ok:true,authenticated:true,provider:'hostinger',user:{id:'visual-fixture',email:'visual@example.invalid',display_name:'Test Student',profile_complete:true,user_metadata:{full_name:'Test Student'}}}
 else if(url.pathname==='/api/pro-release.php')data={paused:true}
 else if(url.pathname==='/api/student/progress.php')data=route.request().method()==='GET'?{payload:{}}:{ok:true,updated_at:new Date().toISOString()}
 else return route.fulfill({status:503,json:{error:'fixture_unavailable',message:'Service unavailable in visual fixture'}})
 return route.fulfill({json:data})
})
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
mkdirSync('test-artifacts/visual-after',{recursive:true})
try{
 await page.goto(base+'/account/dashboard');await page.getByRole('heading',{name:'Today’s Study Plan',exact:true}).waitFor()
 await page.screenshot({path:'test-artifacts/visual-after/empty-dashboard-1440.png',fullPage:true})
 await page.evaluate(()=>{
  const d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const state=JSON.parse(localStorage.getItem('cssvista:v1'))||{}
  state.studyPlanner={examDate:'2027-02-01',dailyHours:4,restDay:5,selectedOptionals:['Political Science','Criminology','European History','Punjabi','Environmental Sciences'],configuredAt:new Date().toISOString()}
  state.studyScheduleTasks=[
   {id:'visual-1',syllabusItemId:'political-science:0:0',subject:'Political Science',topic:'Political theory: liberty & equality',paper:'Paper I',section:'Introduction',date:today,time:'09:00',minutes:60,status:'not-started'},
   {id:'visual-2',syllabusItemId:'environmental-sciences:0:0',subject:'Environmental Sciences',topic:'Review environmental policy',paper:'Single Paper',section:'Introduction',date:today,time:'11:30',minutes:45,status:'completed'},
   {id:'visual-3',syllabusItemId:'precis-composition:0:0',subject:'English Composition',topic:'Précis writing practice',paper:'Single Paper',section:'Introduction',date:today,time:'15:00',minutes:30,status:'not-started'}]
  state.syllabusItemStatuses={'environmental-sciences:0:0':'completed','political-science:0:1':'completed','political-science:0:2':'completed'}
  state.quizResults=[{id:'v1',type:'quiz',category:'General Science',score:8,total:10,date:new Date().toISOString()},{id:'v2',type:'quiz',category:'English',score:6,total:10,date:new Date().toISOString()}]
  state.bookmarks=['visual-question'];state.savedAnswers=[];localStorage.setItem('cssvista:v1',JSON.stringify(state))
 })
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:1000})
  for(const route of ['dashboard','tasks','subjects','practice','progress','library','settings']){
   await page.goto(base+'/account/'+route);await page.getByRole('heading',{name:{dashboard:'Today’s Study Plan',tasks:'My Study Plan',subjects:'My Subjects',practice:'Practice',progress:'My Performance',library:'My Library',settings:'Account & Settings'}[route],exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250)
   if(route==='dashboard')await page.getByRole('img',{name:"Today's scheduled tasks completed: 1 of 3",exact:true}).waitFor()
   if(route==='progress')await page.getByRole('img',{name:'Recorded MCQ accuracy percentage: 70 of 100',exact:true}).waitFor()
   if(route==='subjects')await page.getByRole('heading',{name:'Political Science',exact:true}).waitFor()
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflows at ${width}`)
   await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)})
   await page.screenshot({path:`test-artifacts/visual-after/${route}-${width}.png`,fullPage:width!==768});await page.screenshot({path:`test-artifacts/visual-after/${route}-${width}-viewport.png`})
  }
 }
 await page.goto(base+'/account/dashboard');await page.getByRole('button',{name:'Mark Political theory: liberty & equality complete',exact:true}).click()
 await page.getByText('2 of 3 scheduled tasks complete',{exact:true}).waitFor();await page.getByRole('img',{name:"Today's scheduled tasks completed: 2 of 3",exact:true}).waitFor()
 slow=true;await page.goto(base+'/account/subjects');await page.getByText('Loading topic coverage…',{exact:true}).waitFor();await page.screenshot({path:'test-artifacts/visual-after/subjects-loading.png'});slow=false
 fail=true;await page.reload();await page.getByText('Syllabus details could not be loaded.',{exact:false}).waitFor();await page.screenshot({path:'test-artifacts/visual-after/subjects-error.png'});fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('heading',{name:'Political Science',exact:true}).waitFor()
 assert.deepEqual(errors,[])
 console.log('PASS: visual fixtures reviewed across seven sections at 390, 768 and 1440; empty/loading/error/retry and task updates; no overflow or page errors.')
}finally{await browser.close()}
