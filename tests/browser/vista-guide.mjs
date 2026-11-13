/**
 * UI regression of compiled PMS Vista and CSS Planner in isolated Chromium.
 * No user accounts or production APIs. Tests actual rendered interface.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { startArtifactPreview } from './artifact-preview.mjs'

const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const { server, origin } = await startArtifactPreview(resolve(root,'dist'))
const browser = await chromium.launch({
  executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium',
  headless: true, args: ['--no-sandbox'],
})
const report = {checkedAt:new Date().toISOString(),method:'Isolated build-artifact Chromium: desktop and mobile, no real accounts',results:[]}
await mkdir(resolve(root,'test-artifacts/vista'),{recursive:true})

async function check(width,height,exam) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'})
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin})
  await context.route('**/*',route=>{
    const request=route.request(),uri=new URL(request.url())
    if(request.method()!=='GET'||uri.origin!==origin||uri.pathname.startsWith('/api/'))return route.abort('blockedbyclient')
    return route.continue()
  })
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const path='/study-planner?exam='+exam+'&view=syllabus'
  const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'})
  assert.equal(response.status(),200,'planner route resolves')
  await page.locator('.vg-hero h2').waitFor({timeout:30000})
  assert.equal((await page.locator('.vg-hero h2').textContent()).trim(),exam==='pms-punjab'?'PMS Vista':'CSS Vista')
  const initialOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
  assert.equal(initialOverflow,false,exam+' '+width+'px initial horizontal overflow')
  assert.equal(await page.getByRole('button',{name:'Subjects and routine'}).count(),1)
  const initialSubjects=await page.locator('.vg-metrics strong').first().textContent()
  assert.ok(Number(initialSubjects)>0,'compulsory subjects automatically selected')
  assert.equal(await page.getByRole('link',{name:'Official PDF'}).count(),0,'no PDF redirects promoted in chapter guide')
  assert.equal(await page.locator('a[href*="/pms-punjab/syllabus/"]').count(),0,'syllabus content remains on page')
  if(exam==='pms-punjab'){
    await page.goto(origin+'/study-planner?exam=pms-punjab&view=pms')
    await page.locator('.vg-hero h2').waitFor()
    assert.equal((await page.locator('.vg-hero h2').textContent()).trim(),'PMS Vista','legacy PMS route lands in current guide')
    assert.equal(await page.getByText('Previous PMS planner').count(),0,'legacy label is retired')
    await page.goto(origin+path)
    await page.locator('.vg-hero h2').waitFor()
  }

  if(exam==='pms-punjab' && width>=1000) {
    await page.getByRole('button',{name:'View all subjects'}).click()
    assert.equal(await page.locator('.vg-subjects button').count(),41,'40 source documents and the new Mental Ability guidebook')
    await page.locator('.vg-subjects button').filter({hasText:'Punjabi'}).click()
    await page.locator('.vg-syllabus h3').filter({hasText:'Punjabi'}).waitFor()
    const first=page.locator('.vg-unit').first()
    assert.match(await first.textContent(),/بابا فرید/,'Punjabi renders in original script')
    await first.getByRole('button',{name:'Copy notes command'}).click()
    await page.getByText('Command copied.',{exact:false}).first().waitFor()
    const command=await page.evaluate(()=>navigator.clipboard.readText())
    assert.match(command,/بابا فرید/,'copied prompt has exact Punjabi chapter')
    assert.match(command,/Never invent citations or statistics/,'source integrity safeguards')
    await first.getByRole('button',{name:'Mark complete'}).click()
    await first.getByRole('button',{name:'Schedule revision'}).waitFor()
    await first.getByRole('button',{name:'Schedule revision'}).click()
    await page.getByText('Revision scheduled for',{exact:false}).first().waitFor()
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')||'{}'))
    assert.equal(saved.studyScheduleTasks.filter(t=>t.activity==='revision').length,1,'revision kept separate')
    assert.ok(Object.values(saved.syllabusItemStatuses||{}).some(v=>v==='completed'),'completion persisted')
    await page.screenshot({path:resolve(root,'test-artifacts/vista/pms-desktop-syllabus.png'),fullPage:true})
  }
  await page.getByRole('button',{name:'Subjects and routine'}).click()
  await page.getByRole('radio',{name:'3 subjects per day'}).check()
  await page.getByRole('radio',{name:'Rotate subjects daily'}).check()
  await page.getByRole('button',{name:'Save my preparation choices'}).click()
  assert.equal((await page.locator('.vg-metrics strong').nth(1).textContent()).trim(),'3','preference saved')

  if(width>=1000){
    await page.getByRole('button',{name:'Generate my plan'}).click()
    await page.locator('.vg-preview strong').first().waitFor({timeout:30000})
    assert.match(await page.locator('.vg-preview').first().textContent(),/new sessions/,'schedule preview')
    await page.getByRole('button',{name:'Confirm and save all sessions'}).click()
    await page.getByText(/syllabus sessions are ready/).waitFor()
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:v1')||'{}'))
    const schedule=(stored.studyScheduleTasks||[]).filter(t=>exam==='css'?!t.syllabusItemId.startsWith('pms-punjab:'):t.syllabusItemId.startsWith('pms-punjab:'))
    assert.ok(schedule.length>30,'full schedule saved not only preview')
    const subjectsByDay=new Map()
    for(const task of schedule){
      if(task.activity==='revision')continue
      if(!subjectsByDay.has(task.date))subjectsByDay.set(task.date,new Set())
      subjectsByDay.get(task.date).add(task.subject)
    }
    assert.ok([...subjectsByDay.values()].every(set=>set.size<=3),'no more than three subjects per day')

    if(exam==='pms-punjab') {
      const todayKey=await page.evaluate(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})
      const todayPms=schedule.filter(task=>task.date===todayKey)
      const visibleGuide=page.locator('.vg-pms-today')
      await visibleGuide.getByRole('heading',{name:"Today's PMS tasks",exact:true}).waitFor()
      assert.equal(await visibleGuide.locator('[data-task-id]').count(),Math.min(4,todayPms.length),'PMS guide shows saved tasks for today, never just setup screens')
      await visibleGuide.getByRole('link',{name:'Open PMS Today'}).click()
      await page.getByRole('heading',{name:"Today’s tasks",exact:true}).waitFor()
      assert.equal(await page.locator('.pl-agenda-section').first().locator('[data-task-id]').count(),todayPms.length,'PMS Today fetches confirmed saved sessions')
      assert.equal((await page.locator('.pl-agenda-section').first().textContent()).includes('Political theory: liberty'),false,'PMS Today excludes unrelated CSS work')
      await page.goto(origin+path)
      await page.locator('.vg-hero h2').waitFor()
    }
    await page.screenshot({path:resolve(root,'test-artifacts/vista/'+exam+'-desktop-schedule.png'),fullPage:true})
  } else {
    await page.getByRole('button',{name:'View all subjects'}).click()
    await page.locator('.vg-subjects button').last().waitFor()
    await page.screenshot({path:resolve(root,'test-artifacts/vista/'+exam+'-mobile.png'),fullPage:true})
  }
  const finalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
  assert.equal(finalOverflow,false,exam+' '+width+'px horizontal overflow')
  await page.addScriptTag({path:resolve(root,'tests/browser/node_modules/axe-core/axe.min.js')})
  const accessibility=await page.evaluate(async()=>{
    const result=await window.axe.run(document.querySelector('.vg-root'),{
      runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
    })
    return result.violations.filter(v=>v.impact==='critical'||v.impact==='serious')
      .map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)}))
  })
  assert.deepEqual(accessibility,[],exam+' '+width+'px serious accessibility violations: '+JSON.stringify(accessibility))
  assert.deepEqual(errors,[],exam+' JS runtime errors at '+width+'px')
  report.results.push({exam,width,height,initialOverflow,finalOverflow,subjects:Number(initialSubjects),runtimeErrors:errors})
  await context.close()
}

async function checkLegacyCssScheduleNotes() {
  const source=JSON.parse(readFileSync(resolve(root,'public/fpsc-syllabus.json'),'utf8'))
  const selected=source.subjects.find(subject=>subject.sections.some(section=>section.items.length))
  assert.ok(selected,'official source contains a CSS syllabus topic')
  const sectionIndex=selected.sections.findIndex(section=>section.items.length)
  const section=selected.sections[sectionIndex]
  const taskId=selected.slug+':'+sectionIndex+':0'
  const context=await browser.newContext({viewport:{width:1280,height:900}})
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin})
  await context.addInitScript(({selected,section,taskId})=>{
    const now=new Date()
    const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')
    localStorage.setItem('cssvista:v1',JSON.stringify({syllabusItemStatuses:{},studyScheduleTasks:[
      {id:'legacy-css-command',syllabusItemId:taskId,subject:selected.name,paper:'CSS',section:section.title,topic:section.items[0],date,minutes:45,status:'not-started',createdAt:new Date().toISOString()},
      {id:'personal-manual-task',syllabusItemId:'manual:personal-example',subject:'General',paper:'',section:'Personal task',topic:'Take a study break',date,minutes:15,status:'not-started',createdAt:new Date().toISOString()},
    ]}))
  },{selected,section,taskId})
  const page=await context.newPage()
  const response=await page.goto(origin+'/study-planner?exam=css&view=today',{waitUntil:'domcontentloaded'})
  assert.equal(response.status(),200)
  const legacy=page.locator('[data-task-id="legacy-css-command"]')
  await legacy.waitFor({timeout:30000})
  await legacy.getByRole('button',{name:'Copy analytical notes command'}).click()
  await legacy.getByText('Command copied.',{exact:false}).waitFor()
  const command=await page.evaluate(()=>navigator.clipboard.readText())
  assert.ok(command.includes(section.items[0]),'exact source topic retained for legacy CSS tasks')
  assert.match(command,/EXAMINATION: CSS/)
  assert.match(command,/FPSC SYLLABUS TOPIC OR SECTION/)
  assert.match(command,/REAL photographs, maps/)
  assert.match(command,/Never invent citations or statistics/)
  const manual=page.locator('[data-task-id="personal-manual-task"]')
  assert.equal(await manual.getByRole('button',{name:'Copy analytical notes command'}).count(),0,'personal tasks cannot be misrepresented as the FPSC syllabus')
  report.results.push({exam:'css',scenario:'historical syllabus schedule notes',sourceTopic:taskId,commandCopied:true})
  await context.close()
}
try{
  await checkLegacyCssScheduleNotes()
  await check(1440,900,'pms-punjab')
  await check(390,844,'pms-punjab')
  await check(1440,900,'css')
  await check(375,812,'css')
  await check(768,1024,'pms-punjab')
  console.log(JSON.stringify(report,null,2))
}finally{
  await writeFile(resolve(root,'test-artifacts/vista/report.json'),JSON.stringify(report,null,2))
  await browser.close()
  await new Promise(resolve=>server.close(resolve))
}
