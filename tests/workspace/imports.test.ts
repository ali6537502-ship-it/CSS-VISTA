import assert from 'node:assert/strict'
import { test } from 'node:test'
import { importIdentity, importJournals, importSources, importText, retainImport } from '../../src/features/workspace/imports.ts'
const a='11111111-1111-4111-a111-111111111111', b='22222222-2222-4222-a222-222222222222', attempt='33333333-3333-4333-a333-333333333333'
const answer={id:'local-1',question:'Why institutions matter?',subject:'TEST ONLY',date:'2025-01-01',minutes:40,outline:'Original outline',intro:'Original introduction',text:'  Original response\r\nاردو x² = 4 🧪  ',conclusion:'Original conclusion'}
function storage(entries: Record<string,string>){const map=new Map(Object.entries(entries)),reads:string[]=[];return {map,reads,get length(){return map.size},key:(n:number)=>[...map.keys()][n]||null,getItem:(key:string)=>{reads.push(key);return map.get(key)??null},setItem:(key:string,value:string)=>{map.set(key,value)}}}
test('browser inspection is read only, account-scoped by default and explicitly includes unscoped answers',()=>{
 const own=`cssvista:draft:learning:v1:${a}:new`,foreign=`cssvista:draft:learning:v1:${b}:new`
 const s=storage({'cssvista:v1':JSON.stringify({savedAnswers:[answer],quizResults:[{score:100}]}),[own]:JSON.stringify({title:'Own draft',text:' Own text\r\nاردو ',kind:'paragraph'}),[foreign]:JSON.stringify({title:'FOREIGN',text:'FOREIGN',kind:'paragraph'})}),before=[...s.map]
 const scoped=importSources(s,a);assert.equal(scoped.sources.length,1);assert.equal(scoped.sources[0].text,'Own text\nاردو');assert.equal(s.reads.includes('cssvista:v1'),false);assert.equal(s.reads.includes(foreign),false)
 const result=importSources(s,a,true);assert.equal(result.sources.length,2);const copy=result.sources[1];for(const section of ['Original outline','Original introduction','Original response','Original conclusion','2025-01-01','Why institutions matter?'])assert.ok(copy.text.includes(section))
 assert.equal(copy.kind,'paragraph');assert.equal(copy.raw,JSON.stringify(answer));assert.deepEqual([...s.map],before)
})
test('malformed, duplicate, empty and oversized copies remain unmodified; no silent truncation of body',()=>{
 const raw=JSON.stringify({savedAnswers:[answer,{...answer},{...answer,id:'empty',text:'',outline:'',intro:'',conclusion:''},{...answer,id:'large',text:'x'.repeat(20001)}]});const s=storage({'cssvista:v1':raw});const result=importSources(s,a,true);assert.equal(result.sources.length,0);assert.equal(result.skipped,4);assert.equal(s.map.get('cssvista:v1'),raw)
 const corrupt=storage({'cssvista:v1':'{"unreadable'});assert.throws(()=>importSources(corrupt,a,true));assert.equal(corrupt.map.get('cssvista:v1'),'{"unreadable')
 assert.throws(()=>importText('\ud800',20000));assert.throws(()=>importText('x\0y',20000));assert.equal(importText(' 🧪 اردو\r\n ',20000),'🧪 اردو')
})
test('replay identity survives reordering and separates accounts, destinations and changed originals',async()=>{
 const source=importSources(storage({'cssvista:v1':JSON.stringify({savedAnswers:[answer]})}),a,true).sources[0]
 const key=await importIdentity(a,source,attempt),same=await importIdentity(a,source,attempt);assert.equal(key.request,same.request);assert.match(key.request,/^[a-f0-9-]{14}4[a-f0-9-]{21}$/)
 const reordered=importSources(storage({'cssvista:v1':JSON.stringify({savedAnswers:[{...answer,id:'new'},answer]})}),a,true).sources[1];assert.equal((await importIdentity(a,reordered,attempt)).request,key.request)
 assert.notEqual((await importIdentity(b,source,attempt)).request,key.request);assert.notEqual((await importIdentity(a,source,b)).request,key.request);assert.notEqual((await importIdentity(a,{...source,raw:source.raw+' '},attempt)).request,key.request)
 const s=storage({});retainImport(s,a,key);assert.deepEqual(importJournals(s,a),[key]);assert.deepEqual(importJournals(s,b),[]);assert.ok(!JSON.stringify([...s.map]).includes('Original response'))
 assert.throws(()=>retainImport({setItem(){throw Error('Quota')}},a,key),/Quota/)
})
