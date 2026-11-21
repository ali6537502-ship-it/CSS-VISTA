import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Exercise the production account snapshot merge without changing the app build.
const source = readFileSync('src/lib/accountSync.ts', 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exports = {}
new Function('exports', 'require', js)(exports, (path) => {
  if (path === './preparationStorage') return {} // Merge selectors do not read or mutate device storage.
  if (path === '@/lib/progressEvents') return { notifyProgressChanged: () => {} }
  throw new Error('Unexpected dependency ' + path)
})
const merge = exports.mergeProgressSnapshots
const key = 'cssvista:tool:gsa-tutor:v1'
const t0 = '2026-10-30T10:00:00.000Z'
const t1 = '2026-10-30T11:00:00.000Z'
const t2 = '2026-10-30T12:00:00.000Z'

test('newer cloud timetable is not overwritten by an older device', () => {
  const cloud = { [key]: { plan: {days: 60, startDate: '2026-10-30', changedAt: t2}, completed: {A: {at: t1}} } }
  const local = { [key]: { plan: {days: 8, startDate: '2026-10-30', changedAt: t0}, completed: {B: {at: t1}} } }
  const merged = merge(cloud, local)[key]
  assert.equal(merged.plan.days, 60)
  assert.deepEqual(Object.keys(merged.completed).sort(), ['A', 'B'])
  assert.equal(merge(local, cloud)[key].plan.days, 60)
})

test('a later completion resolves earlier revision even on a second device', () => {
  const cloud = { [key]: { revisit: {A: {at: t0, kind: 'question'}} } }
  const local = { [key]: { completed: {A: {at: t2, selfRating: 'gotit'}} } }
  assert.equal(merge(cloud, local)[key].revisit.A, undefined)
  assert.equal(merge(local, cloud)[key].revisit.A, undefined)
  const newerRevision = { [key]: {revisit: {A: {at: t2, kind: 'question'}}} }
  const oldCompletion = { [key]: {completed: {A: {at: t0, selfRating: 'gotit'}}} }
  assert.ok(merge(newerRevision, oldCompletion)[key].revisit.A)
})

test('bookmarks honour a later explicit removal and can be re-added', () => {
  const saved = { [key]: { bookmarks: {A: {at: t0}} } }
  const removed = { [key]: { bookmarkRemoved: {A: {at: t1}} } }
  const merged = merge(saved, removed)[key]
  assert.equal(merged.bookmarks.A, undefined)
  assert.ok(merged.bookmarkRemoved.A)
  const restored = merge({[key]:merged}, { [key]: {bookmarks: {A: {at: t2}}} })[key]
  assert.ok(restored.bookmarks.A)
  assert.equal(restored.bookmarkRemoved.A, undefined)
})

test('unrelated study records remain untouched by GSA merge policy', () => {
  const cloud = {'cssvista:progress:v1': {same: {value: 'old'}}, [key]: { plan: {days: 20, changedAt:t1} } }
  const local = {'cssvista:progress:v1': {same: {value: 'new'}}, [key]: { plan: {days: 30, changedAt:t0} } }
  const result = merge(cloud, local)
  assert.equal(result['cssvista:progress:v1'].same.value, 'new')
  assert.equal(result[key].plan.days, 20)
})

test('cross-device review resolution wins over older incorrect answers', () => {
 const cloud = {
   [key]: {
     questionReview: {'Q-1': {at: t0, chapter: 6, unresolved: true}},
     quizAttempts: {first: {at: t0, chapter: 6, responses: {'Q-1': {correct: false, selected: 'A', at: t0}}}}
   }
 };
 const local = {
   [key]: {
     questionReview: {'Q-1': {at: t2, chapter: 6, unresolved: false}},
     quizAttempts: {second: {at: t2, chapter: 6, responses: {'Q-1': {correct: true, selected: 'D', at: t2}}}}
   }
 };
 for (const merged of [merge(cloud,local)[key],merge(local,cloud)[key]]) {
   assert.equal(merged.questionReview['Q-1'].unresolved,false);
   assert.deepEqual(Object.keys(merged.quizAttempts).sort(),['first','second']);
 }
});

test('newer incorrectly answered question can reopen a prior resolved question', () => {
 const older = { [key]: { questionReview: {'Q-1':{at:t0,chapter:6,unresolved:false}} } }
 const newer = { [key]: { questionReview: {'Q-1':{at:t2,chapter:6,unresolved:true}} } }
 assert.equal(merge(older,newer)[key].questionReview['Q-1'].unresolved,true);
 assert.equal(merge(newer,older)[key].questionReview['Q-1'].unresolved,true);
});

test('later dated recall wins and separate recall attempt histories survive device merges', () => {
 const cloud = {[key]:{
   reviewDue:{A:{at:t0,date:'2026-11-10',stage:1}},
   recallAttempts:{one:{at:t0,lessonId:'A',selfRating:'gotit'}}
 }};
 const local = {[key]:{
   reviewDue:{A:{at:t2,date:'2026-11-17',stage:2}},
   recallAttempts:{two:{at:t2,lessonId:'A',selfRating:'gotit'}}
 }};
 for(const merged of [merge(cloud,local)[key],merge(local,cloud)[key]]){
   assert.equal(merged.reviewDue.A.date,'2026-11-17');
   assert.equal(merged.reviewDue.A.stage,2);
   assert.deepEqual(Object.keys(merged.recallAttempts).sort(),['one','two']);
 }
});

test('responses to a shared practice session survive merges in both directions',()=>{
 const cloud={[key]:{quizAttempts:{shared:{at:t1,chapter:6,responses:{A:{at:t0,selected:'A'},B:{at:t1,selected:'B'}}}}}};
 const local={[key]:{quizAttempts:{shared:{at:t2,chapter:6,responses:{A:{at:t2,selected:'D'},C:{at:t2,selected:'C'}}}}}};
 for(const state of [merge(cloud,local)[key],merge(local,cloud)[key]]){
   assert.deepEqual(Object.keys(state.quizAttempts.shared.responses).sort(),['A','B','C']);
   assert.equal(state.quizAttempts.shared.responses.A.selected,'D');
 }
});

test('rescheduling histories from separate devices are additive',()=>{
 const cloud={[key]:{planHistory:{one:{at:t0,plan:{days:8}}}}};
 const local={[key]:{planHistory:{two:{at:t2,plan:{days:60}}}}};
 assert.deepEqual(Object.keys(merge(cloud,local)[key].planHistory).sort(),['one','two']);
});

test('finished assessments cannot be reopened by a stale device, and retain eligible responses',()=>{
 const questions=[{id:'A'},{id:'B'}];
 const cloud={[key]:{assessmentAttempts:{one:{at:t1,finishedAt:t1,questions,responses:{A:{at:t0,selected:'A'}},choiceEvents:{first:{at:t0}}}}}};
 const local={[key]:{assessmentAttempts:{one:{at:t2,finishedAt:null,questions,responses:{B:{at:t0,selected:'B'},A:{at:t2,selected:'D'}},choiceEvents:{second:{at:t2}}}}}};
 for(const merged of [merge(cloud,local)[key],merge(local,cloud)[key]]){
  const a=merged.assessmentAttempts.one;assert.equal(a.finishedAt,t1);assert.equal(a.responses.A.selected,'A');assert.equal(a.responses.B.selected,'B');assert.equal(Object.keys(a.choiceEvents).length,2);
 }
});

test('mock written responses merge without losing separate-device work or accepting post-submit changes',()=>{
 const cloud={[key]:{assessmentAttempts:{mock:{at:t1,finishedAt:t1,responses:{},writtenResponses:{A:{at:t0,text:'First response'}}}}}};
 const local={[key]:{assessmentAttempts:{mock:{at:t2,finishedAt:null,responses:{},writtenResponses:{A:{at:t2,text:'Too late'},B:{at:t0,text:'Other response'}}}}}};
 for(const merged of [merge(cloud,local)[key],merge(local,cloud)[key]]){
  const a=merged.assessmentAttempts.mock;assert.equal(a.finishedAt,t1);assert.equal(a.writtenResponses.A.text,'First response');assert.equal(a.writtenResponses.B.text,'Other response');
 }
});
