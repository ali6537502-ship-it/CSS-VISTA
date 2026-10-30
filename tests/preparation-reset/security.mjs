import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable test database required')
const base=process.env.CSSV_TEST_API_ORIGIN||'http://localhost:4173'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback only')
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...args)=>(process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}):execFileSync('php',args,{env,encoding:'utf8'})).trim()
async function call(path,u,method='GET',body,extra={}){
 const headers={Accept:'application/json',...extra};if(u){headers.Cookie=[...u.jar].map(([k,v])=>`${k}=${v}`).join('; ');headers['X-CSSV-User']??=u.id;if(u.generation)headers['X-CSSV-Preparation-Generation']??=u.generation}
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=u?.jar.get('cssv_csrf')||''}
 const r=await fetch(`${base}/api/${path}`,{method,headers,...(body?{body:JSON.stringify(body)}:{})});if(u)for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');u.jar.set(p.slice(0,i),p.slice(i+1))}const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw Error(`Non-JSON ${r.status} ${path}: ${raw.slice(0,500)}`)}return{status:r.status,data}
}
async function create(){const email=`reset-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),u={id,email,jar:new Map()};const r=await call('auth/login.php',u,'POST',{email,password:'TEST ONLY native fixture password'});assert.equal(r.status,200,JSON.stringify(r.data));return u}
const a=await create(),b=await create(),c=await create(),endpoint='student/preparation-reset.php'
const payload={'cssvista:v1':{studyPlanner:{selectedOptionals:['Punjabi'],examDate:'2027-10-01',dailyHours:3,restDay:0},studyScheduleTasks:[{id:'a',subject:'Punjabi',date:'2026-10-31'},{id:'b',subject:'English',date:'2026-10-31'},{id:'c',subject:'Punjabi',date:'2026-11-01'}],syllabusItemStatuses:{x:'completed'},bookmarks:['retained'],savedAnswers:[{id:'draft'}],quizResults:[{id:'quiz'}]},'cssvista:tool:pms-planner:v1':{version:1,settings:'{"selectedOptionals":["optional-punjabi"]}'},'cssvista:progress:v1':{activities:[]}}
const put=(u,p=payload)=>call('student/progress.php',u,'PUT',{payload:p})
const progress=u=>call('student/progress.php',u)
const preview=async(u,selection)=>{const r=await call(endpoint,u,'POST',{action:'preview',selection});assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
const apply=async(u,p,extra={})=>call(endpoint,u,'POST',{action:'reset',token:p.token,confirmation:'RESET',current_password:'TEST ONLY native fixture password',...extra})
const accepted=async(u,p)=>{const r=await apply(u,p);assert.equal(r.status,200,JSON.stringify(r.data));u.generation=r.data.control.generation;return r}
for(const u of [a,b,c])assert.equal((await put(u)).status,200)
const preservedA=php('tests/preparation-reset/fixture.php','identity',a.id),preservedB=php('tests/preparation-reset/fixture.php','identity',b.id)
assert.equal((await call(endpoint,null,'POST',{action:'preview',selection:{scope:'preparation'}})).status,401)
assert.equal((await call(endpoint,a,'GET')).status,405)
assert.equal((await call(endpoint,a,'POST',{action:'preview',selection:{scope:'preparation'}},{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call(endpoint,a,'POST',{action:'preview',selection:{scope:'preparation'}},{'X-CSSV-User':b.id})).status,409)
assert.equal((await call(endpoint,a,'POST',{action:'preview',selection:{scope:'timetable',start:'2026-02-30'}})).status,422)
assert.equal((await call(endpoint,a,'POST',{action:'preview',selection:{scope:'preparation'},user_id:b.id})).status,422)
const p=await preview(a,{scope:'timetable',subject:'Punjabi',start:'2026-10-31',end:'2026-10-31'})
assert.equal(p.counts['Timetable tasks'],1)
assert.deepEqual((await progress(a)).data.payload,payload,'Review mutated records')
assert.equal((await apply(b,p)).status,422,'Other account reused signed review')
assert.equal((await apply(a,p,{current_password:'wrong'})).status,422)
assert.equal((await apply(a,p,{confirmation:'yes'})).status,422)
await accepted(a,p)
assert.deepEqual((await progress(a)).data.payload['cssvista:v1'].studyScheduleTasks.map(t=>t.id),['b','c'])
assert.equal((await put({...a,generation:undefined})).status,409,'Old device restored reset tasks')
assert.equal((await put({...a,generation:'stale'})).status,409)
assert.equal((await apply(a,p)).data.control.generation,a.generation,'Retry applied reset twice')
assert.equal((await call(endpoint,a,'POST',{action:'status',token:p.token})).data.accepted,true)
assert.equal((await call('student/planner.php',a,'POST',{action:'anything',request_id:randomUUID()},{'X-CSSV-Preparation-Generation':'stale'})).status,409,'Old native write was not rejected')
const stale=await preview(a,{scope:'timetable'});const now=(await progress(a)).data.payload;now['cssvista:v1'].bookmarks.push('new');assert.equal((await put(a,now)).status,200);assert.equal((await apply(a,stale)).status,409,'Changed records erased using an outdated review')
const raced=await preview(a,{scope:'planner'});const receipts=await Promise.all([apply(a,raced),apply(a,raced)]);assert.ok(receipts.every(r=>r.status===200));assert.equal(receipts[0].data.control.generation,receipts[1].data.control.generation);a.generation=receipts[0].data.control.generation
assert.deepEqual((await progress(a)).data.payload['cssvista:v1'].studyScheduleTasks,[])
assert.deepEqual((await progress(a)).data.payload['cssvista:v1'].bookmarks,['retained','new'])
const f=await preview(a,{scope:'preparation',keep_settings:true});await accepted(a,f)
const after=(await progress(a)).data
assert.deepEqual(after.payload['cssvista:v1'],{studyPlanner:payload['cssvista:v1'].studyPlanner})
assert.deepEqual(after.payload['cssvista:tool:pms-planner:v1'],payload['cssvista:tool:pms-planner:v1'])
assert.ok(!after.payload['cssvista:progress:v1']);assert.equal(after.reset_control.events.length,1);assert.equal(after.reset_control.revision,3)
assert.equal(php('tests/preparation-reset/fixture.php','identity',a.id),preservedA,'Identity, membership, attempt containers or formal assessments changed')
assert.equal(php('tests/preparation-reset/fixture.php','identity',b.id),preservedB);assert.deepEqual((await progress(b)).data.payload,payload,'Other account records changed')
const forged={...after.payload,__cssv_reset_v1:{generation:'forged'}};assert.equal((await put(a,forged)).status,200);assert.equal((await progress(a)).data.reset_control.generation,a.generation,'Client forged reset marker')
const resetC=await preview(c,{scope:'preparation',keep_settings:false});await accepted(c,resetC);assert.deepEqual((await progress(c)).data.payload,[])
const populated=await create(), foreign=await create()
const native=JSON.parse(php('tests/preparation-reset/fixture.php','populate',populated.id));php('tests/preparation-reset/fixture.php','populate',foreign.id)
php('tests/precis/fixture.php','activate',populated.id);php('tests/planner/fixture.php','mpt',populated.id,native.attempt)
const retained=php('tests/preparation-reset/fixture.php','identity',populated.id), foreignCounts=php('tests/preparation-reset/fixture.php','counts',foreign.id)
assert.equal((await call(endpoint,populated,'POST',{action:'preview',selection:{scope:'attempt-plan',attempt_id:randomUUID()}})).status,404)
const one=await preview(populated,{scope:'attempt-plan',attempt_id:native.attempt,date:'2026-11-01'})
assert.equal(one.counts.attempt_daily_plans,1);assert.equal(one.counts.attempt_plan_tasks,1);await accepted(populated,one)
let counts=JSON.parse(php('tests/preparation-reset/fixture.php','counts',populated.id));assert.equal(counts.attempt_daily_plans,3);assert.equal(counts.attempt_plan_tasks,3);assert.equal(counts.attempt_unit_progress,2)
const allNative=await preview(populated,{scope:'preparation',keep_settings:false});assert.equal(allNative.counts.factbook_entries,1);assert.equal(allNative.counts.grammar_progress,2);await accepted(populated,allNative)
counts=JSON.parse(php('tests/preparation-reset/fixture.php','counts',populated.id));assert.ok(Object.values(counts).every(n=>n===0),JSON.stringify(counts))
assert.equal(php('tests/preparation-reset/fixture.php','identity',populated.id),retained,'Native writing/attempt settings/identity changed')
assert.equal(php('tests/preparation-reset/fixture.php','counts',foreign.id),foreignCounts,'Native foreign account records were removed')
console.log('PASS preparation reset: read-only signed review, password/CSRF/owner checks, date validation, subject/date scope, stale-review rejection, idempotent concurrent retries, stale-device/native mutation barrier, server-owned generation, planner/full retention, other-account isolation, CSS/PMS settings retention, populated moved-task FK cleanup, single-day/attempt scope, native reading/grammar/Factbook tree purge, protected writing/attempt settings and explicit clear.')
