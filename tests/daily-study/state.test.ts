import test from 'node:test'
import assert from 'node:assert/strict'
import { studyLink, studyMinutes, stageMinutes } from '../../src/features/daily-study/study.ts'
test('study links retain original edition and writing identifiers with bounded session context', () => {
 const url=new URL(studyLink('/account/preparation?writing=original&version=immutable','grammar-v5',30,2),'https://example.invalid')
 assert.equal(url.searchParams.get('writing'),'original');assert.equal(url.searchParams.get('version'),'immutable');assert.equal(url.searchParams.has('studyOwner'),false);assert.equal(url.searchParams.get('studyStage'),'2')
 assert.equal(new URL(studyLink('//foreign.invalid','course',999,9),'https://example.invalid').pathname,'/account/dashboard')
})
test('suggested allocations preserve the selected time without claiming completion', () => {
 for(const value of [15,30,60])assert.equal(stageMinutes(value).reduce((a,b)=>a+b,0),value)
 for(const value of [null,'-1','999','javascript:bad'])assert.equal(studyMinutes(value),30)
})

test('session metadata is bounded, expires and cannot be adopted by another account', async () => {
 const { readStudySession, studySessionKey } = await import('../../src/features/daily-study/session.ts')
 const value={schema:1,owner:'student-a',course:'grammar-v5',minutes:30,stage:1,startedAt:1000},raw=JSON.stringify(value)
 assert.deepEqual(readStudySession(raw,'student-a',2000),value)
 assert.equal(readStudySession(raw,'student-b',2000),undefined)
 assert.equal(readStudySession(raw,'student-a',86401000),undefined)
 assert.equal(readStudySession(raw,'student-a',999),undefined)
 for(const change of [{stage:4},{course:'../../admin'},{minutes:99},{body:'private writing'},{schema:2}])assert.equal(readStudySession(JSON.stringify({...value,...change}),'student-a',2000),undefined)
 assert.notEqual(studySessionKey('student-a'),studySessionKey('student-b'))
 assert.equal(readStudySession('{broken','student-a',2000),undefined)
})

test('the lesson handoff keeps native context without copying search or writing text', async () => {
 const { studyLesson } = await import('../../src/features/daily-study/study.ts')
 assert.equal(studyLesson('/grammar-course?day=2&section=concepts&attempt=owned&studyStage=0&q=private','/grammar-course','grammar-v5'),'/grammar-course?day=2&section=concepts&attempt=owned')
 assert.equal(studyLesson('/grammar-course?view=legacy','/grammar-course','grammar-v5'),undefined)
 assert.equal(studyLesson('/account/preparation?view=topics&topic=other','/account/preparation?view=topics&topic=selected','selected'),undefined)
 assert.equal(studyLesson('https://foreign.invalid','/grammar-course','grammar-v5'),undefined)
})

test('writing and feedback retain the owned workspace, immutable version and original topic attempt', async () => {
 const { studyDestinations }=await import('../../src/features/daily-study/handoffs.ts')
 const skill={id:'argument',title:'Argument',summary:'',canonicalDestination:'/account/argumentation',editionId:null}
 const workspace='/account/argumentation?workspace=owned&version=immutable'
 assert.deepEqual(studyDestinations(skill,workspace,workspace),[workspace,workspace,workspace,workspace])
 const topic={...skill,id:'test-topic',canonicalDestination:'/account/preparation?view=topics&topic=test-topic'}
 const paths=studyDestinations(topic,'/account/preparation?view=topics&topic=test-topic&attempt=owned&topicSection=three')
 for(const [index,mode] of [[1,'write'],[2,'check'],[3,'revise']] as const){const p=new URL(paths[index],'https://example.invalid').searchParams;assert.equal(p.get('attempt'),'owned');assert.equal(p.get('topic'),'test-topic');assert.equal(p.get('topicMode'),mode)}
 const precis={...skill,id:'precis',canonicalDestination:'/account/precis'}
 const p=new URL(studyDestinations(precis,undefined,'/account/precis?writing=owned&version=immutable')[2],'https://example.invalid').searchParams
 assert.equal(p.get('writing'),'owned');assert.equal(p.get('version'),'immutable');assert.equal(p.get('view'),'history')
})
