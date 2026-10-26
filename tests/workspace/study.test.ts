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
