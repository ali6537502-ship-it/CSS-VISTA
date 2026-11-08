import test from 'node:test'
import assert from 'node:assert/strict'
import { studyLink, studyMinutes, stageMinutes } from '../../src/features/workspace/study.ts'
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
 const { readStudySession, studySessionKey } = await import('../../src/features/workspace/studySession.ts')
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
 const { studyLesson } = await import('../../src/features/workspace/study.ts')
 assert.equal(studyLesson('/grammar-course?day=2&section=concepts&attempt=owned&studyStage=0&q=private','/grammar-course','grammar-v5'),'/grammar-course?day=2&section=concepts&attempt=owned')
 assert.equal(studyLesson('/grammar-course?view=legacy','/grammar-course','grammar-v5'),undefined)
 assert.equal(studyLesson('/account/preparation?view=topics&topic=other','/account/preparation?view=topics&topic=selected','selected'),undefined)
 assert.equal(studyLesson('https://foreign.invalid','/grammar-course','grammar-v5'),undefined)
})
