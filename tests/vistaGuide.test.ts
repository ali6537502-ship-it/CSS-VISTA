import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildVistaNotesCommand, cssGuideSubjects, pmsGuideSubjects, generateVistaPlan,
  guideUnits, plannedVistaUnits, readVistaPreferences, selectedVistaSubjects,
  type VistaSubject, type VistaPreferences,
} from '../src/features/planner/vistaGuideModel.ts'

function prefs(extra: Partial<VistaPreferences> = {}): VistaPreferences {
  return {version:1,subjectsPerDay:2,dailyMinutes:180,restDays:[],targetDate:'2026-11-30',startDate:'2026-11-12',mode:'rotate',selectedOptionals:[],alternative:'islamic-studies',studySubjects:null,prioritySubjects:[],selectedEssayThemes:null,...extra}
}
function subject(id:string,topics:string[]): VistaSubject {
  return {id,title:id,designation:'compulsory',marks:100,sections:[{id:'s1',title:'Section A',topics:topics.map((title,i)=>({id:'vista-css:'+id+':s1:n'+i,title,detail:'Exact prescribed content for '+title}))}]}
}
test('PMS Vista consolidated dataset has 40 subjects with preserved sections',()=>{
  const data=JSON.parse(readFileSync('public/pms-punjab/vista-syllabus.json','utf8'))
  assert.equal(data.subjects.length,40)
  assert.equal(new Set(data.subjects.map((s:VistaSubject)=>s.id)).size,40)
  for(const s of data.subjects as VistaSubject[]) {
    assert.ok(s.sections.length>0,s.title)
    assert.ok(s.sections.some(sec=>sec.topics.length>0),s.title)
    assert.ok(guideUnits(s,'pms-punjab').every(u=>u.id.startsWith('pms-punjab:vista:')),s.title)
  }
})
test('schedules at most two distinct subjects per day and retains every chapter',()=>{
  const subjects=[subject('a',['a1','a2','a3']),subject('b',['b1','b2','b3']),subject('c',['c1','c2','c3'])]
  const plan=generateVistaPlan(subjects,'css',prefs(),[],{},'2026-11-12')
  assert.equal(plan.draft.length,9)
  for(const date of new Set(plan.draft.map(t=>t.date))) {
    const rows=plan.draft.filter(t=>t.date===date)
    assert.ok(new Set(rows.map(t=>t.subject)).size<=2)
    assert.ok(rows.reduce((n,t)=>n+t.minutes,0)<=180)
  }
})
test('finished chapters and already-scheduled tasks are not duplicated',()=>{
  const subjects=[subject('a',['one','two']),subject('b',['three'])]
  const old={id:'old',syllabusItemId:'vista-css:a:s1:n0',subject:'a',paper:'CSS',section:'Section A',topic:'one',date:'2026-11-12',minutes:45,status:'completed' as const,createdAt:'2026-11-01'}
  const result=generateVistaPlan(subjects,'css',prefs(),[old],{'vista-css:b:s1:n0':'completed'},'2026-11-12')
  assert.equal(result.draft.length,1)
  assert.equal(result.draft[0].topic,'two')
})
test('one subject per day respects a rest day and impossible deadline rejects',()=>{
  const subjects=[subject('a',['one','two']),subject('b',['three','four'])]
  const one=prefs({subjectsPerDay:1,restDays:[4]})
  const result=generateVistaPlan(subjects,'css',one,[],{},'2026-11-12')
  assert.equal(result.draft.length,4)
  assert.ok(result.draft.every(t=>new Date(t.date+'T12:00:00').getDay()!==4))
  assert.throws(()=>generateVistaPlan(subjects,'css',{...one,targetDate:'2026-11-13'},[],{},'2026-11-12'),/will not fit/)
})
test('legacy-safe preferences and comprehensive full syllabus command',()=>{
  const p=readVistaPreferences({subjectsPerDay:3,dailyMinutes:360,selectedOptionals:['History']})
  assert.equal(p.subjectsPerDay,3)
  const u=guideUnits(subject('a',['topic']),'css')[0]
  const text=buildVistaNotesCommand(u)
  assert.match(text,/Exact prescribed content/)
  assert.match(text,/Never invent citations or statistics/)
})
test('CSS guide includes a clearly labelled essay activity without pretending it was in syllabus JSON',()=>{
  const s=cssGuideSubjects({subjects:[{slug:'precis-composition',name:'English (Precis & Composition)',designation:'compulsory',marks:100,sections:[{title:'Writing',items:['Precis']}]}]},[{slug:'education',name:'Education',brief:'A research theme',sections:[{letter:'A',title:'Definitions'}]}])
  assert.ok(s.some(x=>x.id==='essay'))
  assert.match(s.find(x=>x.id==='essay')!.sections[0].title,/not an FPSC syllabus extract/)
  assert.equal(selectedVistaSubjects(s,'css',prefs()).length,2)
})

test('40-subject structure includes all 1,414 leaf topics, 5 Urdu and Punjabi parts and prescribed reading lists',()=>{
  const d=JSON.parse(readFileSync('public/pms-punjab/vista-syllabus.json','utf8'))
  assert.equal(d.subjects.filter((s:VistaSubject)=>s.designation==='compulsory').length,10)
  assert.equal(d.subjects.filter((s:VistaSubject)=>s.designation==='optional').length,30)
  assert.equal(d.subjects.reduce((sum:number,s:VistaSubject)=>sum+s.sections.length,0),179)
  assert.equal(d.subjects.reduce((sum:number,s:VistaSubject)=>sum+guideUnits(s,'pms-punjab').length,0),1414)
  for(const name of ['Urdu','Punjabi']){
    const subject=d.subjects.find((s:VistaSubject)=>s.title===name) as VistaSubject
    assert.ok(subject)
    assert.equal(subject.sections.length,5)
    assert.equal(subject.readings?.length,name==='Urdu'?19:21)
  }
  const punjabi=d.subjects.find((s:VistaSubject)=>s.title==='Punjabi') as VistaSubject
  assert.match(guideUnits(punjabi,'pms-punjab').map(u=>u.syllabus).join('\n'),/جگراتے/)
  const urdu=d.subjects.find((s:VistaSubject)=>s.title==='Urdu') as VistaSubject
  assert.match(guideUnits(urdu,'pms-punjab').map(u=>u.syllabus).join('\n'),/شہرِ کوفے کا ایک آدمی/)
})
test('nested official chapters are scheduled individually with parent syllabus context',()=>{
  const nested:VistaSubject={id:'optional-law',title:'Law',designation:'optional',marks:100,sections:[{
    id:'s1',title:'Paper I',topics:[{id:'pms-punjab:vista:optional-law:s1:n1',title:'Constitutional law',detail:'Foundations',
      children:[{id:'pms-punjab:vista:optional-law:s1:n1-1',title:'Judicial review',detail:'Scope and grounds'},
                {id:'pms-punjab:vista:optional-law:s1:n1-2',title:'Separation of powers',detail:'Executive and legislature'}]}],
  }]}
  const units=guideUnits(nested,'pms-punjab')
  assert.equal(units.length,2)
  assert.match(units[0].syllabus,/Constitutional law/)
  assert.match(units[0].syllabus,/Foundations/)
  assert.match(units[0].syllabus,/Scope and grounds/)
})
test('six-hour single-subject days can contain multiple realistic sessions',()=>{
  const topics=Array.from({length:12},(_,i)=>'Chapter '+(i+1))
  const result=generateVistaPlan([subject('a',topics)],'css',prefs({subjectsPerDay:1,dailyMinutes:360,targetDate:''}),[],{},'2026-11-12')
  assert.equal(result.draft.length,12)
  const first=result.draft.filter(t=>t.date==='2026-11-12')
  assert.ok(first.length>1)
  assert.ok(first.reduce((sum,t)=>sum+t.minutes,0)<=360)
  assert.ok(result.draft.every(t=>t.minutes>=30&&t.minutes<=600))
})
test('three-subject rotation preserves daily time and distinct-subject bounds',()=>{
  const subjects=['a','b','c','d'].map(name=>subject(name,Array.from({length:8},(_,i)=>name+'-'+i)))
  const result=generateVistaPlan(subjects,'css',prefs({subjectsPerDay:3,dailyMinutes:180,targetDate:''}),[],{},'2026-11-12')
  for(const date of new Set(result.draft.map(t=>t.date))){
    const today=result.draft.filter(t=>t.date===date)
    assert.ok(new Set(today.map(t=>t.subject)).size<=3)
    assert.ok(today.reduce((n,t)=>n+t.minutes,0)<=180)
  }
})

test('a selected one-subject day cannot silently add a second already-scheduled subject',()=>{
  const a=subject('a',['one','two','three']), b=subject('b',['four','five'])
  const old={id:'old-1',syllabusItemId:'vista-css:a:s1:n0',subject:'a',paper:'CSS',section:'Section A',topic:'one',
    date:'2026-11-12',minutes:60,status:'in-progress' as const,createdAt:'2026-11-11'}
  const result=generateVistaPlan([a,b],'css',prefs({subjectsPerDay:1,dailyMinutes:180,targetDate:''}),[old],{},'2026-11-12')
  const first=result.draft.filter(t=>t.date==='2026-11-12')
  assert.ok(first.length>0)
  assert.deepEqual([...new Set(first.map(t=>t.subject))],['a'])
  assert.ok(first.reduce((n,t)=>n+t.minutes,0)+old.minutes<=180)
})
test('PMS English Essay schedules research, outlines, writing and review, never the assessment instructions',()=>{
  const source=JSON.parse(readFileSync('public/pms-punjab/vista-syllabus.json','utf8'))
  const index=JSON.parse(readFileSync('src/data/bundled/essay-themes-index.json','utf8'))
  const essay=pmsGuideSubjects(source,index.themes).find((s:VistaSubject)=>s.id==='compulsory-english-essay')!
  const selected=prefs({studySubjects:['compulsory-english-essay'],selectedEssayThemes:[index.themes[0].slug],targetDate:''})
  const activities=plannedVistaUnits(essay,'pms-punjab',selected)
  assert.equal(activities.length,4)
  assert.ok(activities.every(unit=>unit.resourceSlug===index.themes[0].slug))
  assert.match(activities.map(unit=>unit.title).join(' | '),/Research the theme/)
  assert.match(activities.map(unit=>unit.title).join(' | '),/Build arguments and outline/)
  assert.match(activities.map(unit=>unit.title).join(' | '),/Write a full essay/)
  const plan=generateVistaPlan([essay],'pms-punjab',selected,[],{},'2026-11-12')
  assert.equal(plan.draft.length,4)
  assert.ok(plan.draft.every(task=>task.syllabusItemId.includes(':theme:')))
  assert.throws(()=>generateVistaPlan([essay],'pms-punjab',{...selected,selectedEssayThemes:[]},[],{},'2026-11-12'),/Select at least one essay theme/)
})
test('selected starting subjects and priority order override the original catalogue order',()=>{
  const papers=[subject('a',['a1','a2']),subject('b',['b1','b2']),subject('c',['c1','c2'])]
  const chosen=prefs({studySubjects:['a','c'],prioritySubjects:['c','a'],subjectsPerDay:1,targetDate:''})
  assert.deepEqual(selectedVistaSubjects(papers,'css',chosen).map(s=>s.id),['c','a'])
  const result=generateVistaPlan(papers,'css',chosen,[],{},'2026-11-12')
  assert.equal(result.scheduledSubjects,2)
  assert.equal(result.draft[0].subject,'c')
  assert.ok(result.draft.every(task=>task.subject!=='b'))
  assert.equal(selectedVistaSubjects(papers,'css',{...chosen,studySubjects:[]}).length,0)
  const old=readVistaPreferences({version:1,selectedOptionals:[]})
  assert.equal(old.studySubjects,null)
  assert.deepEqual(old.prioritySubjects,[])
})
test('essay activity cards link to theme preparation instead of a generic copied command',()=>{
  const card=readFileSync('src/features/planner/PlannerTask.tsx','utf8')
  const guide=readFileSync('src/features/planner/VistaStudyGuide.tsx','utf8')
  assert.match(card,/legacyEssayInstruction/)
  assert.match(card,/Build essay theme/)
  assert.match(guide,/u\.resource!=='essay'&&<CopyNotes/)
  assert.match(guide,/Choose your starting subjects and priority/)
})
test('Essay Themes 2027 adds exactly 25 clearly labelled preparation units, not fictional prescribed sections',()=>{
  const source=JSON.parse(readFileSync('public/pms-punjab/vista-syllabus.json','utf8'))
  const index=JSON.parse(readFileSync('src/data/bundled/essay-themes-index.json','utf8'))
  assert.equal(index.themes.length,25)
  const subjects=pmsGuideSubjects(source,index.themes)
  const essay=subjects.find(s=>s.id==='compulsory-english-essay')!
  assert.ok(essay.sections.some(section=>/not prescribed PPSC syllabus/.test(section.title)))
  const themes=guideUnits(essay,'pms-punjab').filter(unit=>unit.resourceSlug)
  assert.equal(themes.length,100)
  assert.equal(new Set(themes.map(unit=>unit.resourceSlug)).size,25)
  assert.ok(themes.some(unit=>unit.id.endsWith(':draft')))
  assert.equal(essay.officialGuidance?.length,2)
  assert.ok(essay.officialGuidance?.some(line=>line.includes('conceptual clarity')))
  assert.ok(!themes.some(unit=>unit.title.startsWith('The candidates are expected')))
  const prompt=buildVistaNotesCommand(themes[0])
  assert.match(prompt,/SUPPLEMENTARY ESSAY RESEARCH ROADMAP/)
  assert.doesNotMatch(prompt,/EXACT PRESCRIBED SYLLABUS/)
})


test('Vista Mentor groups both examination guides in desktop and mobile account menus',()=>{
  const sidebar=readFileSync('src/features/workspace/StudentWorkspace.tsx','utf8')
  const mobile=readFileSync('src/features/workspace/WorkspaceMobileDrawer.tsx','utf8')
  for(const source of [sidebar,mobile]){
    assert.match(source,/Vista Mentor/)
    assert.match(source,/CSS Vista/)
    assert.match(source,/PMS Vista/)
    assert.match(source,/\/account\/tasks\?exam=css&view=syllabus/)
    assert.match(source,/\/account\/tasks\?exam=pms-punjab&view=syllabus/)
  }
  assert.doesNotMatch(sidebar,/<StudyRail\s*\/>/)
})

test('account dashboard no longer mounts the obsolete four-step daily-study widget',()=>{
  const overview=readFileSync('src/pages/AccountHome.tsx','utf8')
  const directory=readFileSync('src/features/workspace/registry.ts','utf8')
  assert.doesNotMatch(overview,/<DailyStudyFlow\s*\/>/)
  assert.doesNotMatch(overview,/id="daily-study"/)
  assert.doesNotMatch(overview,/Preparation journey<\/h2>/)
  assert.doesNotMatch(directory,/to:'\/account\/dashboard#daily-study'/)
})

test('CSS and PMS share the chapter guide without promoting legacy PDF redirects or the previous PMS planner',()=>{
  const shell=readFileSync('src/features/planner/PlannerWorkspace.tsx','utf8')
  const guide=readFileSync('src/features/planner/VistaStudyGuide.tsx','utf8')
  assert.match(shell,/const Guide = lazy\(\(\) => import\('\.\/VistaStudyGuide'\)\)/)
  assert.doesNotMatch(shell,/import\('\.\/PlannerPms'\)/)
  assert.match(shell,/<Guide exam="pms-punjab"\/>/)
  assert.match(guide,/Read chapters here — no PDF required/)
  assert.doesNotMatch(guide,/href=\{active\.file\}/)
  assert.doesNotMatch(guide,/Official PDF/)
})

test('Practice replaces obsolete activity widgets with the original General Science Course',()=>{
  const practice=readFileSync('src/pages/account/WorkspaceSections.tsx','utf8')
  const source=readFileSync('src/features/daily-study/Flow.tsx','utf8')
  assert.match(practice,/General Science Course/)
  assert.match(practice,/<AccountGSATutorCard\s*\/>/)
  assert.match(practice,/\/account\/gsa-tutor/)
  assert.doesNotMatch(practice,/Write with focus/)
  assert.doesNotMatch(practice,/<FeatureFinder practice\s*\/>/)
  assert.doesNotMatch(practice,/Open answer timer/)
  assert.doesNotMatch(source,/pathname\.startsWith\('\/account\/'\)/)
})
