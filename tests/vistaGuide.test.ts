import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildVistaNotesCommand, cssGuideSubjects, generateVistaPlan,
  guideUnits, readVistaPreferences, selectedVistaSubjects,
  type VistaSubject, type VistaPreferences,
} from '../src/features/planner/vistaGuideModel.ts'

function prefs(extra: Partial<VistaPreferences> = {}): VistaPreferences {
  return {version:1,subjectsPerDay:2,dailyMinutes:180,restDays:[],targetDate:'2026-11-30',startDate:'2026-11-12',mode:'rotate',selectedOptionals:[],alternative:'islamic-studies',...extra}
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
  const s=cssGuideSubjects({subjects:[{slug:'precis-composition',name:'English (Precis & Composition)',designation:'compulsory',marks:100,sections:[{title:'Writing',items:['Precis']}]}]})
  assert.ok(s.some(x=>x.id==='essay'))
  assert.match(s.find(x=>x.id==='essay')!.sections[0].title,/not an FPSC syllabus extract/)
  assert.equal(selectedVistaSubjects(s,'css',prefs()).length,2)
})
