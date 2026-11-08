import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

let owner='student-a'
const source=readFileSync('src/lib/accountSync.ts','utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const moduleExports={}
new Function('exports','require',code)(moduleExports,path=>{
 if(path==='./preparationStorage')return {preparationOwner:()=>owner}
 if(path==='@/lib/progressEvents')return {notifyProgressChanged:()=>{}}
 throw Error('Unknown test module '+path)
})
const merge=(moduleExports as {mergeProgressSnapshots:(cloud:Record<string,unknown>,local:Record<string,unknown>)=>Record<string,unknown>}).mergeProgressSnapshots
const key='cssvista:tool:fitness-coach:v1'
const prior='2026-11-02T01:00:00Z',later='2026-11-02T02:00:00Z'
const fixture=(changedAt:string)=>({ownerId:'student-a',updatedAt:changedAt,
  profile:{target:65},weights:[],workouts:{},meals:{},homeRecipes:[]})
test('latest plan wins, with both devices retaining distinct weight logs and workout days',()=>{
 owner='student-a'
 const cloud={...fixture(later),profile:{target:68},weights:[{date:'2026-11-01',weight:62}],
  workouts:{'2026-11-01':prior},meals:{'2026-11-01':{breakfast:true}}}
 const local={...fixture(prior),weights:[{date:'2026-11-02',weight:62.2}],
  workouts:{'2026-11-02':later},meals:{'2026-11-02':{lunch:true}}}
 const combined=merge({[key]:cloud},{[key]:local})[key] as typeof cloud
 assert.equal(combined.profile.target,68)
 assert.equal(combined.weights.length,2)
 assert.equal(Object.keys(combined.workouts).length,2)
 assert.equal(Object.keys(combined.meals).length,2)
})
test('old device does not restore deleted recipes or outdated daily choices',()=>{
 owner='student-a'
 const old={...fixture(prior),homeRecipes:[{id:'home-1',name:'Old dish'}],dailyAvailability:{'2026-11-02':{eggs:true}}}
 const newData={...fixture(later),homeRecipes:[],dailyAvailability:{'2026-11-02':{eggs:false}}}
 const combined=merge({[key]:old},{[key]:newData})[key] as typeof old
 assert.equal(combined.homeRecipes.length,0)
 assert.equal(combined.dailyAvailability['2026-11-02'].eggs,false)
})
test('cross-account snapshots cannot be copied into the new account',()=>{
 owner='student-b'
 const old={...fixture(prior),profile:{target:66}}
 assert.equal(merge({[key]:old},{})[key],undefined)
 const current={...old,ownerId:'student-b'}
 assert.equal((merge({[key]:old},{[key]:current})[key] as typeof old).ownerId,'student-b')
 owner='student-a'
})
