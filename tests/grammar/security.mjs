import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import os from 'node:os'
import path from 'node:path'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const env = { ...process.env }; for (const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[k]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER ? execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim() : execFileSync('php',args,{env,encoding:'utf8'}).trim()
const bundle = path.join(os.tmpdir(), `cssv-grammar-security-${process.pid}.mjs`)
await build({entryPoints:['src/data/grammarCourse.ts'],outfile:bundle,bundle:true,platform:'node',format:'esm'})
const { grammarLessons: days } = await import(pathToFileURL(bundle).href)
async function call(url, body, jar = new Map(), extra = {}) {
 const headers = { Accept:'application/json', 'User-Agent':'CSSVistaGrammarIsolation', ...extra }
 if(jar.size) headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||''}
 const r=await fetch('http://localhost:4173/api/'+url,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})})
 for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1))}
 return {status:r.status,data:await r.json()}
}
async function user(label){const email=`grammar-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return{id,jar}}
const a=await user('a'), b=await user('b'), incomplete=await user('incomplete')
const settings={action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:120,stage:'starting',optional_subject_ids:[]}
const makeAttempt=async u=>(await call('student/learning.php',{...settings,request_id:randomUUID()},u.jar)).data.attempt_id
const attempt=await makeAttempt(a), other=await makeAttempt(a), bAttempt=await makeAttempt(b)
const url=`student/grammar.php?attempt_id=${attempt}`
assert.equal((await call(url)).status,401)
assert.equal((await call(url,undefined,b.jar)).status,404)
assert.equal((await call(url,undefined,a.jar,{'X-CSSV-User':b.id})).status,409)
php('tests/pro/fixture.php','incomplete',incomplete.id);assert.equal((await call(url,undefined,incomplete.jar)).status,403)
const empty=()=>({completed:[],scores:{},mistakes:[],notes:{},currentDay:1,sessions:{},attempts:[],lab:null,labHistory:[],reviews:{}})
const state=empty();state.notes['1']='TEST ONLY '+ 'a'.repeat(25000);state.completed=[1];state.scores['1']=100
const body={request_id:randomUUID(),expected_version:0,attempt_id:attempt,state,import_browser:true}
assert.equal((await call('student/grammar.php',body,a.jar,{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call('student/grammar.php',body,b.jar)).status,404)
assert.equal((await call('student/grammar.php',{...body,user_id:b.id},a.jar)).status,422)
assert.equal((await call('student/grammar.php',{...body,state:{...state,mistakes:['invented']}},a.jar)).status,422)
const saved=await call('student/grammar.php',body,a.jar);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.version,1)
assert.equal((await call('student/grammar.php',body,a.jar)).data.version,1,'Lost response replay created another save')
assert.equal((await call('student/grammar.php',{...body,state:{...state,currentDay:2}},a.jar)).status,409,'Same identity changed payload')
let read=await call(url,undefined,a.jar);assert.equal(read.data.state.notes['1'],state.notes['1']);assert.equal(read.data.imported_browser,true);assert.equal(read.data.profile.totals.questions,0,'Legacy score became mastery evidence')
assert.equal((await call(`student/grammar.php?attempt_id=${other}`,undefined,a.jar)).data.state,null,'Other attempt adopted progress')
assert.equal((await call(`student/grammar.php?attempt_id=${bAttempt}`,undefined,b.jar)).data.state,null)
const save=async (s,version,extra={})=>call('student/grammar.php',{request_id:randomUUID(),attempt_id:attempt,expected_version:version,state:s,...extra},a.jar)
assert.equal((await save(state,1,{import_browser:true})).status,409,'Imported over existing account state')
const q=days[0].drill[0],wrong=(q.answer+1)%q.options.length,at=Date.now(),id=randomUUID()
state.lab={id,mode:'targeted',day:1,ids:[q.id],position:0,answers:{[q.id]:wrong},first:{[q.id]:wrong},drafts:{},revealed:[],startedAt:at,finishedAt:at}
state.labHistory=[{id,mode:'targeted',day:1,at,ids:[q.id],first:{[q.id]:wrong}}]
assert.equal((await save(state,1)).status,200)
const bad=structuredClone(state);bad.lab.first[q.id]=q.answer;bad.labHistory[0].first[q.id]=q.answer
assert.equal((await save(bad,2)).status,409,'Recorded first responses modified')
const badOption=structuredClone(state);badOption.lab.answers[q.id]=99;assert.equal((await save(badOption,2)).status,422)
state.lab.answers[q.id]=q.answer
assert.equal((await save(state,2)).status,200,'Ordinary retry was blocked')
read=await call(url,undefined,a.jar);assert.equal(read.data.profile.totals.questions,1);assert.equal(read.data.profile.totals.correct,0,'Retry raised account first-response score')
const cleared=empty();assert.equal((await save(cleared,3)).status,200)
read=await call(url,undefined,a.jar);assert.equal(read.data.state.labHistory.length,1,'Past Lab result erased');assert.equal(read.data.profile.totals.questions,1,'Restart erased profile evidence')
const competing=await Promise.all([save({...cleared,notes:{'1':'TEST ONLY device one'}},4),save({...cleared,notes:{'1':'TEST ONLY device two'}},4)])
assert.deepEqual(competing.map(r=>r.status).sort(),[200,409],'Concurrent snapshots silently overwrote each other')
php('tests/grammar/fixture.php','expire',a.id)
assert.equal((await call(url,undefined,a.jar)).status,200,'Expiry removed Grammar history')
assert.equal((await save({...cleared,currentDay:2},5)).status,200,'Free ordinary practice required active Pro')
php('tests/grammar/fixture.php','feedback',a.id,attempt,'subject_verb_agreement')
php('tests/grammar/fixture.php','feedback',a.id,other,'article_usage')
php('tests/grammar/fixture.php','feedback',b.id,bAttempt,'punctuation')
read=await call(url,undefined,a.jar)
assert.equal(read.data.profile.writing.reviewed_wordings,3);assert.equal(read.data.profile.items[4].state,'Needs review');assert.equal(read.data.profile.items[4].writing[0].state,'Weak')
assert.equal(read.data.profile.items[12].writing.length,0,'Other attempt writing contaminated profile');assert.equal(read.data.profile.items[20].writing.length,0,'Other user writing contaminated profile')
assert.equal(php('tests/grammar/fixture.php','usage',a.id),'0','Ordinary Grammar/profile used AI allowance')
assert.ok(read.data.profile.items.every(i=>!['Stable','Mastered'].includes(i.state)))
for(const file of ['_grammar.php','_grammar_core.php','_grammar_catalog.php','_grammar_schema.php'])assert.equal((await fetch('http://localhost:4173/api/'+file)).status,404)
console.log('PASS: native Grammar ownership/profile/CSRF, explicit isolated import and long notes, exact idempotent replay, strict catalog validation, immutable Lab/first evidence, concurrent-device conflicts, expiry/free continuity, attempt-scoped writing profile and zero AI allowance/provider use.')
