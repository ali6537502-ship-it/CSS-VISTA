// Disposable presentation fixtures. Native planner authorization is checked separately.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'http://127.0.0.1:5178'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback fixtures only')
const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox'] })
const context = await browser.newContext({ viewport:{width:1440,height:1050}, timezoneId:'Asia/Karachi', reducedMotion:'reduce', ignoreHTTPSErrors:true })
let failSyllabus = false, slowSyllabus = false, delaySync = false
await context.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin !== base) return route.abort()
  if (url.pathname === '/fpsc-syllabus.json') {
    if (slowSyllabus) await new Promise(resolve => setTimeout(resolve,700))
    if (failSyllabus) return route.fulfill({ status:503, body:'Unavailable' })
  }
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/workspace-preview.php') return route.fulfill({ json: { enabled: true, user_id: 'planner-fixture' } })
  if (url.pathname === '/api/auth/session.php') return route.fulfill({ json:{ok:true,authenticated:true,provider:'hostinger',user:{id:'planner-fixture',email:'planner@example.invalid',display_name:'Ayesha',profile_complete:true,user_metadata:{full_name:'Ayesha'}}} })
  if (url.pathname === '/api/pro-release.php') return route.fulfill({ json:{paused:true} })
  if (url.pathname === '/api/student/progress.php') { if (delaySync) await new Promise(resolve=>setTimeout(resolve,700)); return route.fulfill({json:{ok:true,payload:{}}}) }
  if (url.pathname === '/api/student/planner.php' && url.searchParams.has('overview')) return route.fulfill({json:{attempts:[]}})
  return route.fulfill({status:503,json:{error:'fixture_unavailable',message:'Unavailable in the disposable fixture'}})
})
await context.addInitScript(() => {
  if (localStorage.getItem('cssvista:v1')) return
  const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const now = new Date(), today = key(now), previous = key(new Date(now.getFullYear(),now.getMonth(),now.getDate()-1,12)), tomorrow = key(new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,12))
  const task = (id,topic,date,time,minutes,status='in-progress') => ({id,syllabusItemId:`manual:${id}`,subject:'Political Science',paper:'Paper I',section:'Personal task',topic,date,time,minutes,status,createdAt:now.toISOString()})
  localStorage.setItem('cssvista:v1',JSON.stringify({
    studyPlanner:{examDate:'2027-12-01',dailyHours:1,restDay:5,selectedOptionals:['Political Science','Criminology','European History','Punjabi','Environmental Sciences'],configuredAt:now.toISOString()},
    studyScheduleTasks:[task('today-a','Review political theory',today,'09:00',60),task('today-b','Revise democratic institutions',today,'09:30',40),task('overdue','Revisit environmental policy',previous,'12:00',45),task('tomorrow','Plan a précis session',tomorrow,undefined,30),task('completed','Outline an analytical answer',previous,undefined,30,'completed')],
    syllabusItemStatuses:{'political-science:0:2':'completed'},goalChecklist:[{id:'existing-goal',text:'Finish one independent outline',completed:false}],quickNotes:'Keep Friday light.',bookmarks:['preserved-bookmark'],savedAnswers:[{id:'preserved-writing',text:'Independent fixture answer'}],quizResults:[{id:'preserved-result',score:7,total:10,category:'Science',date:now.toISOString(),type:'quiz'}],
  }))
  localStorage.setItem('cssvista:progress:v1',JSON.stringify({reviews:{due:{id:'fixture-due',cat:'General Science',level:1,streak:1,lapses:1,intervalDays:1,lastReviewedAt:Date.now()-86400000,dueAt:Date.now()-1000},upcoming:{id:'fixture-upcoming',cat:'English',level:2,streak:2,lapses:0,intervalDays:7,lastReviewedAt:Date.now()-100000,dueAt:Date.now()+86400000}},mistakes:[{id:'fixture-mistake',cat:'General Science',sel:1,count:2,revised:false,ts:Date.now()}]}))
})
const page = await context.newPage(), errors=[], accessibility=[]
page.setDefaultTimeout(20000)
page.on('pageerror', error => errors.push(error.message))
const tabs = () => page.getByRole('navigation',{name:'Study planner sections',exact:true})
const active = () => page.locator('.pl-panels>section:visible')
async function view(name) { await tabs().getByRole('link',{name,exact:false}).click(); await active().waitFor(); await page.evaluate(()=>document.fonts.ready) }
const output = 'test-artifacts/planner-restructure'
mkdirSync(output,{recursive:true})
try {
  await page.goto(base+'/account/tasks')
  await page.getByRole('heading',{name:'My Study Plan',exact:true}).waitFor()
  await active().getByRole('heading',{name:'Today’s tasks',exact:true}).waitFor()
  await page.getByText('40m above your saved daily availability.',{exact:false}).waitFor()
  await active().getByText('This time overlaps another unfinished task.').first().waitFor()
  const task = () => active().locator('[data-task-id="today-a"]').first()
  await task().getByRole('button',{name:'Mark Review political theory complete',exact:true}).click()
  await task().getByRole('button',{name:'Mark Review political theory incomplete',exact:true}).waitFor()
  await page.reload()
  await task().getByRole('button',{name:'Mark Review political theory incomplete',exact:true}).waitFor()
  await page.evaluate(()=>{window.savedStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='cssvista:v1')throw new DOMException('Fixture quota','QuotaExceededError');return window.savedStorageWrite.call(this,key,value)}})
  await task().getByRole('button',{name:'Mark Review political theory incomplete',exact:true}).click()
  await task().getByRole('alert').waitFor()
  assert.equal(await task().getByRole('button',{name:'Mark Review political theory incomplete',exact:true}).getAttribute('aria-pressed'),'true')
  await page.evaluate(()=>{Storage.prototype.setItem=window.savedStorageWrite})
  await task().getByRole('button',{name:'Edit Review political theory',exact:true}).click()
  await task().getByLabel('Estimated minutes',{exact:true}).fill('55')
  await task().getByRole('button',{name:'Move to tomorrow',exact:true}).click()
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('cssvista:v1'));state.studyScheduleTasks.find(t=>t.id==='today-a').status='in-progress';localStorage.setItem('cssvista:v1',JSON.stringify(state));window.dispatchEvent(new Event('cssvista:progress-changed'))});
  await task().getByRole('button',{name:'Save changes',exact:true}).click()
  assert.equal(await active().locator('[aria-labelledby="pl-today-title"] [data-task-id="today-a"]').count(),0)
  const savedTask=await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).studyScheduleTasks.find(t=>t.id==='today-a'))
  assert.equal(savedTask.minutes,55);assert.equal(savedTask.syllabusItemId,'manual:today-a');assert.equal(savedTask.status,'in-progress')
  await view('Week')
  await page.getByRole('button',{name:'Next week',exact:true}).click()
  await page.getByRole('button',{name:'Previous week',exact:true}).click()
  const tomorrow = await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
  await page.goto(base+`/account/tasks?view=week&date=${tomorrow}`)
  await active().getByRole('heading',{name:'Review political theory',exact:true}).waitFor()
  await active().locator('[data-task-id="today-a"]').getByRole('button',{name:'Edit Review political theory',exact:true}).click()
  await active().locator('[data-task-id="today-a"]').getByRole('button',{name:'Archive task',exact:true}).click()
  await view('Today')
  await active().getByText('Archived tasks · 1',{exact:true}).click()
  await active().getByRole('button',{name:'Restore Review political theory',exact:true}).click()
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).studyScheduleTasks.filter(t=>t.id==='today-a').length),1)
  await tabs().getByRole('link',{name:'Today',exact:true}).focus();await page.keyboard.press('Enter');await active().getByRole('heading',{name:'Today’s tasks',exact:true}).waitFor()
  await page.getByRole('button',{name:'Add or import tasks',exact:true}).click()
  const composer=page.getByRole('region',{name:'Create and import study tasks',exact:true})
  await composer.getByLabel('What will you study?',{exact:true}).fill('Review constitutional concepts')
  await composer.getByLabel('Subject (optional)',{exact:true}).fill('Political Science')
  await composer.getByRole('button',{name:'Add task',exact:true}).click()
  await composer.getByText('Task added to your saved schedule.',{exact:true}).waitFor()
  await composer.getByRole('button',{name:'Import schedule',exact:true}).click()
  const block = `CSSV_SCHEDULE_V1\n${JSON.stringify({title:'Focused revision',days:[{date:tomorrow,tasks:[{subject:'Punjabi',topic:'Read the saved syllabus source',activity:'Study',minutes:30,priority:'medium'}]}]})}\nEND_CSSV_SCHEDULE`
  await composer.getByLabel('Schedule block',{exact:true}).fill(block)
  await composer.getByRole('button',{name:'Import and create my schedule',exact:true}).click()
  await composer.getByText('Focused revision: 1 task added across 1 day.',{exact:true}).waitFor()
  await composer.getByLabel('Schedule block',{exact:true}).fill(block)
  await composer.getByRole('button',{name:'Import and create my schedule',exact:true}).click()
  await composer.getByText('This exact schedule is already saved. No duplicate tasks were added.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Close task composer',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'Add or import tasks',exact:true}).evaluate(el=>el===document.activeElement),true)
  await view('Goals')
  await active().getByLabel('New study goal',{exact:true}).fill('Revise one topic carefully')
  await active().getByRole('button',{name:'Add goal',exact:true}).click()
  await active().getByRole('button',{name:'Mark goal Revise one topic carefully complete',exact:true}).focus();await page.keyboard.press('Space')
  await active().getByLabel('Keep priorities, reminders and ideas together.',{exact:true}).fill('Keep Friday light. Review before practice.')
  await view('Week');await view('Goals')
  assert.equal(await active().getByLabel('Keep priorities, reminders and ideas together.',{exact:true}).inputValue(),'Keep Friday light. Review before practice.')
  await active().getByRole('button',{name:'Save notes',exact:true}).click()
  await view('Revision')
  await active().getByRole('heading',{name:'General Science revision',exact:true}).waitFor()
  await active().getByRole('button',{name:'Upcoming',exact:true}).click()
  await active().getByRole('heading',{name:'English revision',exact:true}).waitFor()
  await active().getByRole('button',{name:'Reviewed',exact:true}).click()
  assert.equal(await active().getByRole('heading',{name:'English revision',exact:true}).count(),1)
  await active().getByRole('button',{name:'Mark General Science mistake reviewed',exact:true}).click()
  await active().getByRole('button',{name:'Mark General Science mistake unreviewed',exact:true}).waitFor()
  await view('Settings')
  await active().getByLabel('Study hours each day',{exact:false}).fill('2')
  await active().getByRole('checkbox',{name:/Political Science/}).uncheck()
  assert.equal(await active().getByRole('button',{name:'Save settings',exact:true}).isDisabled(),true)
  await active().getByRole('checkbox',{name:/Political Science/}).check()
  await active().getByRole('button',{name:'Save settings',exact:true}).click()
  await active().getByText('Study settings saved on this device.',{exact:false}).waitFor()
  await page.goto(base+'/account/tasks?view=syllabus&subject=political-science&keep=1')
  await active().getByRole('heading',{name:'Political Science',exact:true}).waitFor()
  const topic = JSON.parse(readFileSync('public/fpsc-syllabus.json','utf8')).subjects.find(s=>s.slug==='political-science').sections[0].items[0]
  const progress=active().getByRole('combobox',{name:`Progress for ${topic}`,exact:true})
  await progress.selectOption('completed')
  const topicRow=progress.locator('..')
  await topicRow.getByRole('button',{name:'Add',exact:true}).click()
  const scheduling=page.getByRole('region',{name:'Add selected syllabus topics to schedule',exact:true})
  await scheduling.getByRole('button',{name:'Save planner tasks',exact:true}).click()
  await active().getByText('1 topic added to the saved planner',{exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')).syllabusItemStatuses['political-science:0:0']),'completed')
  await tabs().getByRole('link',{name:'Week',exact:true}).click()
  assert.equal(new URL(page.url()).searchParams.get('keep'),'1')
  await page.goBack();await active().getByRole('heading',{name:'Political Science',exact:true}).waitFor()
  // Direct aliases and refresh preserve substantive views and stored records.
  await page.goto(base+'/account/plan');await active().getByRole('heading',{name:'Schedule settings',exact:true}).waitFor()
  await page.goto(base+'/study-planner?view=goals');await active().getByText('Revise one topic carefully',{exact:true}).waitFor()
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')))
  assert.deepEqual(persisted.bookmarks,['preserved-bookmark']);assert.equal(persisted.savedAnswers[0].id,'preserved-writing');assert.equal(persisted.quizResults[0].id,'preserved-result');assert.ok(persisted.goalChecklist.some(goal=>goal.id==='existing-goal'))
  // Review every view at all required widths; each section remains reachable.
  for(const width of [320,375,390,768,1024,1440]) {
    await page.setViewportSize({width,height:1000})
    for(const id of ['today','week','syllabus','revision','goals','settings']) {
      await page.goto(base+`/account/tasks?view=${id}${id==='syllabus'?'&subject=political-science':''}`)
      await page.getByRole('heading',{name:'My Study Plan',exact:true}).waitFor()
      await active().getByRole('heading').first().waitFor();await page.evaluate(()=>document.fonts.ready)
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} overflows at ${width}`)
      assert.equal(await tabs().getByRole('link').count(),6)
      assert.equal(await page.locator('nav.ws-bottom').count(),1)
      if([390,768,1440].includes(width)) { await page.screenshot({path:`${output}/${id}-${width}.png`,fullPage:true}); await page.screenshot({path:`${output}/${id}-${width}-viewport.png`}) }
      if(width===390 && process.env.CSSV_TEST_AXE==='true') { await page.addScriptTag({content:readFileSync('tests/browser/node_modules/axe-core/axe.min.js','utf8')}); const scan=await page.evaluate(()=>axe.run(document.querySelector('main.pl-root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));accessibility.push({view:id,violations:scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}); }
    }
  }
  failSyllabus=true
  await page.goto(base+'/account/tasks?view=syllabus');await active().getByRole('button',{name:'Retry syllabus',exact:true}).waitFor();await page.screenshot({path:`${output}/syllabus-error.png`})
  failSyllabus=false;slowSyllabus=true;await active().getByRole('button',{name:'Retry syllabus',exact:true}).click();await active().getByText('Loading syllabus topics…',{exact:true}).waitFor();slowSyllabus=false;await active().getByRole('heading',{name:'Turn a topic into a plan.',exact:true}).waitFor()
  await page.goto(base+'/account/tasks?view=syllabus&subject=punjabi');await active().getByText('Syllabus detail unavailable',{exact:false}).waitFor();assert.equal(await active().getByRole('button',{name:'Add to Schedule',exact:true}).isDisabled(),true)
  await page.goto(base+'/account/tasks?view=syllabus&subject=essay');await active().getByRole('heading',{name:'Syllabus detail unavailable for this subject.',exact:true}).waitFor()
  assert.deepEqual(errors,[])
  if(accessibility.length){writeFileSync(`${output}/accessibility.json`,JSON.stringify(accessibility,null,2));assert.ok(accessibility.every(scan=>scan.violations.length===0),'Planner accessibility checks; see accessibility.json')}
  console.log('PASS: six planner views at 320/375/390/768/1024/1440; task completion/failed save/edit/archive/restore; manual/import deduplication; goals/notes; revision filters; valid optional settings; syllabus scheduling/progress; aliases/back/refresh and unrelated-record preservation.')
} finally { await browser.close() }
