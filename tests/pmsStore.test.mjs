import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const temporary=mkdtempSync(join(tmpdir(),'cssv-pms-store-'))
const file=join(temporary,'store.mjs')
await build({stdin:{contents:"export * from './src/lib/store.ts'; export * from './src/lib/preparationStorage.ts'; export * from './src/lib/accountSync.ts'",resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,format:'esm',platform:'node',logLevel:'silent'})
const store=await import(pathToFileURL(file).href)
process.on('exit',()=>rmSync(temporary,{recursive:true,force:true}))
function fixture(){const values=new Map();globalThis.localStorage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};globalThis.window=new EventTarget();store.bindPreparationStorage(null);return values}
const draft={syllabusItemId:'pms-punjab:2026-10:optional-punjabi:abcdef123456:1',subject:'Punjabi',paper:'PMS Punjab',section:'Syllabus',topic:'Verified source topic',date:'2026-11-02',minutes:45}
test('PMS revision completion stays separate from manually completed topic coverage',()=>{
 fixture();localStorage.setItem('cssvista:v1',JSON.stringify({syllabusItemStatuses:{[draft.syllabusItemId]:'completed'},studyScheduleTasks:[]}))
 const [revision]=store.addStudyScheduleTasks([{...draft,activity:'revision'}]);assert.equal(revision.status,'in-progress')
 store.updateStudyScheduleTask(revision.id,{status:'completed'});store.updateStudyScheduleTask(revision.id,{status:'in-progress'});assert.equal(store.getState().syllabusItemStatuses[draft.syllabusItemId],'completed')
 store.setSyllabusItemStatus(draft.syllabusItemId,'completed');assert.equal(store.getState().studyScheduleTasks[0].status,'in-progress','Outline check completed an unattempted revision')
 const [css]=store.addStudyScheduleTasks([{...draft,syllabusItemId:'css:existing',subject:'English',date:'2026-11-03'}]);store.updateStudyScheduleTask(css.id,{status:'completed'});assert.equal(store.getState().syllabusItemStatuses['css:existing'],'completed')
})
test('adding sessions never trims saved records and repeated topics in a batch are deduplicated',()=>{
 fixture();const initial=Array.from({length:3000},(_,i)=>({...draft,id:'saved-'+i,syllabusItemId:'old-'+i,createdAt:'',status:'completed'}));localStorage.setItem('cssvista:v1',JSON.stringify({studyScheduleTasks:initial}))
 assert.equal(store.addStudyScheduleTasks([draft]).length,0);assert.equal(store.getState().studyScheduleTasks.length,3000);assert.equal(store.getState().studyScheduleTasks[0].id,'saved-0')
 fixture();assert.equal(store.addStudyScheduleTasks([draft,draft]).length,1)
})
test('post-reset partitions ignore legacy tab writes and old account stashes',()=>{
 const values=fixture();localStorage.setItem('cssvista:progress-owner','a');store.bindPreparationStorage('a')
 store.addStudyScheduleTasks([draft]);values.set(store.preparationGenerationKey('a'),'reset-one');store.updateStudyScheduleTask(store.getState().studyScheduleTasks[0].id,{status:'completed'});assert.notEqual(store.getState().studyScheduleTasks[0].status,'completed','Stale document write persisted')
 store.setPreparationGeneration('a','reset-one');store.applyProgressSnapshot({'cssvista:v1':{studyScheduleTasks:[]}});localStorage.setItem('cssvista:v1',JSON.stringify({studyScheduleTasks:[{...draft,id:'old-client'}]}))
 assert.deepEqual(store.captureProgressSnapshot()['cssvista:v1'].studyScheduleTasks,[])
 assert.equal(store.restoredAccountProgress('a',{'cssvista:v1':{studyScheduleTasks:[draft]}}),null)
 store.stashAccountProgress('a');assert.equal(JSON.parse(localStorage.getItem('cssvista:account-progress:a')).generation,'reset-one')
 store.bindPreparationStorage('b');assert.equal(store.captureProgressSnapshot('b')['cssvista:v1'],undefined,'Other owner imported legacy roots')
})
