import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defaultPmsSettings, distributePmsTopics, encodePmsSettings, pmsCoverage, readPmsSettings, selectedPmsSubjects, taskExam, type PmsCatalogue } from '../src/features/planner/pmsModel.ts'
const catalogue = JSON.parse(readFileSync(new URL('../public/pms-punjab/catalogue.json', import.meta.url), 'utf8')) as PmsCatalogue
const manifest = JSON.parse(readFileSync(new URL('../content/pms-punjab/source-manifest.json', import.meta.url), 'utf8'))
test('every published PPSC subject has its unmodified, hashed PDF and source-linked outline', () => {
  assert.equal(catalogue.subjects.length,40); assert.equal(catalogue.subjects.filter(s => s.designation === 'optional').length,30)
  const ids = new Set<string>()
  for (const subject of catalogue.subjects) {
    const source=manifest.documents.find((d: { id:string }) => d.id===subject.id)
    assert.ok(source);assert.equal(source.sha256,subject.sha256);assert.match(subject.sourceUrl,/^https:\/\/www\.ppsc\.gop\.pk\/Forms\/PMS\//)
    const pdf=readFileSync(new URL('../public'+subject.file,import.meta.url));assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.equal(createHash('sha256').update(pdf).digest('hex'),source.sha256)
    assert.ok(subject.topics.length>0,subject.title)
    for (const topic of subject.topics) { assert.ok(!ids.has(topic.id));ids.add(topic.id);assert.match(topic.id,/^pms-punjab:2026-10:/);assert.ok(topic.page>=1);assert.ok(topic.detail.trim());assert.doesNotMatch(topic.detail,/Suggested readings:/i) }
  }
})
test('PMS selections are independent and alternatives occupy one current slot without changing history', () => {
  const state={...defaultPmsSettings, selectedOptionals:['optional-political-science','optional-punjabi']}
  const normal=selectedPmsSubjects(catalogue.subjects,state)
  assert.equal(normal.filter(s => s.designation==='compulsory').length,9)
  assert.ok(!normal.some(s=>s.id.includes('ethics')))
  assert.ok(selectedPmsSubjects(catalogue.subjects,{...state,alternative:'ethics'}).some(s=>s.id.includes('ethics')))
  assert.ok(!selectedPmsSubjects(catalogue.subjects,{...state,alternative:'ethics'}).some(s=>s.id==='compulsory-islamic-studies'))
  assert.deepEqual(readPmsSettings(JSON.parse(encodePmsSettings(state))),state)
  assert.deepEqual(readPmsSettings({selectedOptionals:['unknown']}).selectedOptionals,['unknown'])
  assert.equal(catalogue.subjects.find(s=>s.id==='optional-english-literature')?.marks,null,'Missing source marks are not invented')
})
test('distribution rotates genuine topics, skips rest days and respects shared CSS/PMS workload', () => {
  const subjects=catalogue.subjects.filter(s=>['optional-political-science','optional-punjabi'].includes(s.id))
  const chosen=new Set(subjects.flatMap(s=>s.topics.slice(0,2).map(t=>t.id)))
  const settings={...defaultPmsSettings,dailyMinutes:90,sessionMinutes:45,restDays:[0]}
  const existing=[{id:'css-preserved',syllabusItemId:'css:existing',date:'2026-10-31',minutes:60,status:'completed' as const,subject:'CSS',paper:'',section:'',topic:'Saved',createdAt:''}]
  const draft=distributePmsTopics(subjects,chosen,settings,'2026-10-31',existing)
  assert.equal(draft.length,4);assert.equal(draft[0].date,'2026-11-02');assert.equal(draft[1].date,'2026-11-02');assert.notEqual(draft[0].subject,draft[1].subject)
  assert.equal(draft[2].date,'2026-11-03');assert.equal(existing[0].id,'css-preserved')
  assert.ok(draft.every(t=>taskExam(t)==='pms-punjab'));assert.equal(taskExam(existing[0]),'css')
  assert.throws(()=>distributePmsTopics(subjects,chosen,{...settings,targetDate:'2026-11-01'},'2026-10-31',existing),/do not fit/)
  assert.throws(()=>distributePmsTopics(subjects,chosen,{...settings,restDays:[0,1,2,3,4,5,6]},'2026-10-31',existing),/study day/)
  assert.equal(distributePmsTopics(subjects,chosen,settings,'2026-11-02',draft.map((t,i)=>({...t,id:String(i),createdAt:'',status:'in-progress' as const}))).length,0)
})
test('manual coverage uses only this source outline and never claims assessment performance', () => {
  const subject=catalogue.subjects.find(s=>s.id==='optional-political-science')!
  assert.deepEqual(pmsCoverage(subject,{[subject.topics[0].id]:'completed','css:other':'completed'}),{completed:1,total:subject.topics.length,percent:Math.round(100/subject.topics.length)})
})
