import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPreparationReset, resetsSince } from '../src/features/preparation-reset/model.ts'
import { bindPreparationStorage, preparationGenerationKey, preparationPhysicalKey, preparationWriteCurrent, setPreparationGeneration } from '../src/lib/preparationStorage.ts'
const snapshot={'cssvista:v1':{studyPlanner:{selectedOptionals:['Punjabi']},studyScheduleTasks:[{id:'a',subject:'Punjabi',date:'2026-10-31'},{id:'b',subject:'English',date:'2026-10-31'},{id:'c',subject:'Punjabi',date:'2026-11-01'}],syllabusItemStatuses:{x:'completed'},bookmarks:['saved'],savedAnswers:[{id:'writing'}],goalText:'Goal'},'cssvista:tool:pms-planner:v1':{version:1,settings:'{}'},'cssvista:tool:my-tasks-archive:v1':{a:true,c:true},'cssvista:progress:v1':{activities:[{id:'history'}]},unrelated:{retained:true}}
test('subject/date reset retains other tasks, coverage, bookmarks and writing',()=>{
  const next=applyPreparationReset(snapshot,{scope:'timetable',subject:'Punjabi',start:'2026-10-31',end:'2026-10-31'}) as typeof snapshot
  assert.deepEqual(next['cssvista:v1'].studyScheduleTasks.map(t=>t.id),['b','c']);assert.deepEqual(next['cssvista:v1'].savedAnswers,snapshot['cssvista:v1'].savedAnswers);assert.deepEqual(next['cssvista:tool:my-tasks-archive:v1'],{c:true});assert.equal(snapshot['cssvista:v1'].studyScheduleTasks.length,3)
})
test('planner and preparation reset have explicit retention boundaries',()=>{
  const plan=applyPreparationReset(snapshot,{scope:'planner'}) as typeof snapshot
  assert.deepEqual(plan['cssvista:v1'].studyScheduleTasks,[]);assert.deepEqual(plan['cssvista:v1'].syllabusItemStatuses,{x:'completed'});assert.equal(plan['cssvista:v1'].goalText,'')
  const full=applyPreparationReset(snapshot,{scope:'preparation'})
  assert.deepEqual(full['cssvista:v1'],{studyPlanner:snapshot['cssvista:v1'].studyPlanner});assert.ok(full['cssvista:tool:pms-planner:v1']);assert.ok(!full['cssvista:progress:v1']);assert.deepEqual(full.unrelated,{retained:true})
  assert.deepEqual(applyPreparationReset(snapshot,{scope:'preparation',keep_settings:false}),{unrelated:{retained:true}})
  assert.deepEqual(applyPreparationReset(snapshot,{scope:'attempt-plan',attempt_id:'owned'}),snapshot)
})
test('reset replay applies only events after a known generation and partitions old tabs',()=>{
  const events=[{scope:'timetable' as const,id:'one',at:''},{scope:'planner' as const,id:'two',at:''}]
  assert.deepEqual(resetsSince({generation:'two',revision:2,full_reset:null,events},'one'),[events[1]])
  const values=new Map<string,string>()
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)}})
  bindPreparationStorage('a');assert.equal(preparationPhysicalKey('cssvista:v1'),'cssvista:v1');assert.equal(preparationWriteCurrent(),true)
  values.set(preparationGenerationKey('a'),'one');assert.equal(preparationWriteCurrent(),false,'Old document cannot write after another tab reset')
  setPreparationGeneration('a','one');assert.equal(preparationWriteCurrent(),true);assert.notEqual(preparationPhysicalKey('cssvista:v1'),'cssvista:v1')
  const own=preparationPhysicalKey('cssvista:v1');bindPreparationStorage('b');assert.notEqual(preparationPhysicalKey('cssvista:v1'),own)
})

test('unsupported partial records are retained instead of being silently rewritten',()=>{
  assert.throws(()=>applyPreparationReset({'cssvista:v1':'unsupported'},{scope:'timetable'}),/format needs review/)
  assert.throws(()=>applyPreparationReset({'cssvista:v1':{studyScheduleTasks:'unsupported'}},{scope:'planner'}),/format needs review/)
})
