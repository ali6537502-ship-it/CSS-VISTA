import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { answerStudy, backupLegacy, blankState, conceptProfile, normalizeStudy, stateKey } from '../src/features/grammar-v5/state.ts'
import type { Catalog } from '../src/features/grammar-v5/types.ts'
const catalog = JSON.parse(readFileSync('public/grammar/v5/index.json','utf8')) as Catalog
const q = catalog.items.find(q => q.type === 'objective')!
const day = 86400000, now = Date.UTC(2026,9,22)
test('the new edition never reads legacy answers as new mastery; backup is exact and scoped', () => {
  const old = '{"completed":[1],"notes":{"1":"私人 note with no truncation"}}'
  const data: Record<string,string> = {'cssvista:grammar-course:v3':old}
  const storage = {getItem:(k:string)=>data[k] ?? null,setItem:(k:string,v:string)=>{data[k]=v}}
  backupLegacy(storage)
  const backup = JSON.parse(data[`${stateKey()}:legacy-backup`])
  assert.equal(backup.value,old); assert.equal(backup.sourceKey,'cssvista:grammar-course:v3')
  backupLegacy(storage,'other-account')
  assert.equal(data[`${stateKey('other-account')}:legacy-backup`],undefined)
  assert.deepEqual(normalizeStudy(JSON.parse(old),catalog).completed,[])
  assert.equal(data['cssvista:grammar-course:v3'],old)
})
test('first response is immutable while repeated exposures and spaced retention remain separate', () => {
  const a = answerStudy(blankState(),q,q.answer!,now)
  let s = answerStudy(a,q,q.answer!,now+1000)
  assert.equal(s.answers[q.id].exposures,2); assert.equal(s.reviews[q.id].streak,1)
  assert.equal(s.answers[q.id].firstAt,now)
  s=answerStudy(s,q,q.answer!,now+day)
  assert.equal(s.reviews[q.id].streak,2)
  assert.equal(conceptProfile(s,catalog,now+day).find(c=>c.id===q.conceptId)!.retained,0,'Only one spaced success has occurred')
  s=answerStudy(s,q,q.answer!,now+4*day)
  assert.equal(conceptProfile(s,catalog,now+4*day).find(c=>c.id===q.conceptId)!.retained,1)
  s=answerStudy(s,q,(q.answer!+1)%4,now+5*day)
  assert.equal(s.answers[q.id].first,q.answer);assert.equal(s.reviews[q.id].streak,0)
  assert.equal(conceptProfile(s,catalog,now+5*day).find(c=>c.id===q.conceptId)!.unresolved,1)
  assert.equal(answerStudy(s,q,-1,now+6*day),s)
  assert.equal(answerStudy(s,q,q.answer!,now),s)
})
test('round-trip retains long original writing, notes, bookmarks, self-review and exact position', () => {
  const item=catalog.items.find(i=>i.type==='response')!, c=catalog.concepts[0]
  const s=blankState();s.notes[c.id]='Important text '.repeat(10000);s.drafts[item.id]='Original response '.repeat(10000)
  s.bookmarks=[c.id];s.studied=[c.id];s.selfReviews[item.id]='developing';s.cursor={day:13,section:'questions',item:item.id}
  const restored=normalizeStudy(JSON.parse(JSON.stringify(s)),catalog)
  assert.deepEqual(restored,s);assert.equal(restored.completed.length,0)
  assert.notEqual(stateKey('a','one'),stateKey('a','two'));assert.notEqual(stateKey('a'),stateKey('b'));assert.notEqual(stateKey(),stateKey('a'))
})
test('every scored task points to a real principle, source and genuine reinforcement; all open formats exist', () => {
  const formats = new Set(catalog.items.filter(q=>q.type==='response').map(q=>q.kind))
  for(const kind of ['gap','multiple-gap','correction','transformation','combining','splitting','ordering','classification','function','comparison','paragraph-edit','writing','analysis']) assert(formats.has(kind as never),kind)
  for(const q of catalog.items.filter(q=>q.type==='objective')) {
    assert(catalog.concepts.some(c=>c.id===q.conceptId));assert(catalog.items.some(r=>r.id===q.reinforcementId && r.type==='response' && r.conceptId===q.conceptId))
  }
  for(let phase=1;phase<=4;phase++) {
    const items=catalog.items.filter(i=>i.group===`phase-${phase}`)
    const days=new Set(items.map(i=>catalog.concepts.find(c=>c.id===i.conceptId)!.day))
    assert(Math.min(...days)<=6);assert(Math.max(...days)<=phase*6)
    if(phase>1)assert([...days].some(d=>d<=6),'Cumulative assessment must revisit an earlier phase')
  }
})
