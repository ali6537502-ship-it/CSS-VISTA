import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable native database required')
const catalog=JSON.parse(readFileSync('public/grammar/v5/index.json','utf8')),q=catalog.items.find(q=>q.type==='objective'),r=catalog.items.find(q=>q.type==='response'),c=catalog.concepts[0]
const php=(...args)=>execFileSync('php',args,{encoding:'utf8'}).trim()
async function call(path,body,jar=new Map(),extra={}){
 const headers={Accept:'application/json','User-Agent':'CSSVistaGrammarV5Isolation',...extra}
 if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||''}
 const response=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})})
 for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1))}
 return {status:response.status,data:await response.json()}
}
async function user(label){const email=`gv5-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return {id,jar}}
const a=await user('a'),b=await user('b')
const settings={action:'attempt_save',expected_version:0,target_year:2027,target_date:null,daily_minutes:120,stage:'starting',optional_subject_ids:[]}
const makeAttempt=async u=>(await call('student/learning.php',{...settings,request_id:randomUUID()},u.jar)).data.attempt_id
const attempt=await makeAttempt(a),other=await makeAttempt(a),bAttempt=await makeAttempt(b),url=`student/grammar-v5.php?attempt_id=${attempt}`
assert.equal((await call(url)).status,401);assert.equal((await call(url,undefined,b.jar)).status,404)
const s={curriculumVersion:catalog.version,completed:[],studied:[],answers:{},drafts:{},selfReviews:{},revealed:[],notes:{},bookmarks:[],reviews:{},cursor:{day:1,section:'orientation',item:''},checks:{}}
// Seed genuine legacy state through its unchanged endpoint; compare it byte-for-byte after new saves.
const legacy={completed:[1],scores:{'1':75},mistakes:[],notes:{'1':'TEST ONLY legacy historical note'},currentDay:1,sessions:{},attempts:[],lab:null,labHistory:[],reviews:{}}
assert.equal((await call('student/grammar.php',{request_id:randomUUID(),expected_version:0,attempt_id:attempt,state:legacy,import_browser:true},a.jar)).status,200)
const legacyBefore=(await call(`student/grammar.php?attempt_id=${attempt}`,undefined,a.jar)).data.state
s.notes[c.id]='TEST ONLY '+ 'Long note '.repeat(24000);s.drafts[r.id]='Original independent response.';s.answers[q.id]={first:(q.answer+1)%4,firstAt:1000,latest:q.answer,latestAt:2000,exposures:2};s.reviews[q.id]={lastAt:2000,dueAt:86402000,streak:0,lapses:1}
const body={request_id:randomUUID(),attempt_id:attempt,expected_version:0,state:s}
assert.equal((await call('student/grammar-v5.php',body,a.jar,{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call('student/grammar-v5.php',body,b.jar)).status,404)
assert.equal((await call('student/grammar-v5.php',{...body,user_id:b.id},a.jar)).status,422)
let saved=await call('student/grammar-v5.php',body,a.jar);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.version,1);assert.equal(saved.data.state.notes[c.id],s.notes[c.id])
assert.equal((await call('student/grammar-v5.php',body,a.jar)).data.version,1,'Replay duplicated a save')
assert.equal((await call('student/grammar-v5.php',{...body,state:{...s,cursor:{day:2,section:'orientation',item:''}}},a.jar)).status,409)
const save=(state,version)=>call('student/grammar-v5.php',{request_id:randomUUID(),attempt_id:attempt,expected_version:version,state},a.jar)
const rewrite=structuredClone(s);rewrite.answers[q.id].first=q.answer;assert.equal((await save(rewrite,1)).status,409)
const unknown=structuredClone(s);unknown.answers.invented=s.answers[q.id];assert.equal((await save(unknown,1)).status,422)
const competing=await Promise.all([save({...s,notes:{[c.id]:'TEST ONLY first device'}},1),save({...s,notes:{[c.id]:'TEST ONLY second device'}},1)])
assert.deepEqual(competing.map(r=>r.status).sort(),[200,409])
const empty={...s,answers:{},reviews:{},drafts:{},notes:{}}
saved=await save(empty,2);assert.equal(saved.status,200);assert.equal(saved.data.state.drafts[r.id],s.drafts[r.id]);assert.equal(saved.data.state.answers[q.id].first,s.answers[q.id].first);assert.deepEqual(saved.data.state.reviews,s.reviews)
assert.equal((await call(url,undefined,a.jar)).data.version,3)
assert.equal((await call(`student/grammar-v5.php?attempt_id=${other}`,undefined,a.jar)).data.state,null)
assert.equal((await call(`student/grammar-v5.php?attempt_id=${bAttempt}`,undefined,b.jar)).data.state,null)
assert.deepEqual((await call(`student/grammar.php?attempt_id=${attempt}`,undefined,a.jar)).data.state,legacyBefore,'New course modified legacy records')
for(const path of ['_grammar_v5.php','_grammar_v5_core.php','_grammar_v5_catalog.php'])assert.equal((await fetch('http://localhost:4173/api/'+path)).status,404)
writeFileSync('test-artifacts/grammar-v5-security.json',JSON.stringify({passed:true,contentHash:catalog.contentHash,checks:['ownership','CSRF','unknown fields','exact idempotent replay','concurrent-device CAS','immutable first response','long text','restoration','canonical receipt','legacy preservation','attempt isolation','private implementation denial']},null,2))
console.log('PASS: native PHP/MySQL grammar v5 save/read, replay, concurrency, isolation, restoration and unchanged legacy data.')
