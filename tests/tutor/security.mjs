import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim():execFileSync('php',args,{env,encoding:'utf8'}).trim()
async function call(path,body,jar=new Map(),extra={}){const headers={Accept:'application/json','User-Agent':'CSSVistaTutorIsolation',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||''}const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1))}const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw new Error(`Non-JSON ${r.status} from ${path}: ${raw.slice(0,2400)}`)}return{status:r.status,data,headers:r.headers}}
async function user(label){const email=`tutor-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return{id,jar}}
const endpoint='student/tutor.php',a=await user('active'),b=await user('other'),free=await user('free'),bad=await user('incomplete'),race=await user('race'),failures=await user('failures')
const settings={action:'attempt_save',expected_version:0,target_year:2027,target_date:null,daily_minutes:120,stage:'starting',optional_subject_ids:[]}
const make=async u=>(await call('student/learning.php',{...settings,request_id:randomUUID()},u.jar)).data.attempt_id
const attempt=await make(a),bAttempt=await make(b),freeAttempt=await make(free),raceAttempt=await make(race),failAttempt=await make(failures)
for(const u of [a,b,race,failures])php('tests/precis/fixture.php','activate',u.id)
php('tests/tutor/fixture.php','config','off')
assert.equal((await call(endpoint)).status,401);assert.equal((await call(endpoint,undefined,a.jar,{'X-CSSV-User':b.id})).status,409)
php('tests/pro/fixture.php','incomplete',bad.id);assert.equal((await call(endpoint,undefined,bad.jar)).status,403)
assert.equal((await call(endpoint+'?category=precis',undefined,free.jar)).status,403)
let source=(await call(endpoint+'?context=grammar:5:0',undefined,a.jar)).data
assert.equal(source.configuration.enabled,false);assert.match((await call(endpoint,undefined,a.jar)).headers.get('cache-control'),/no-store/)
const base={action:'ask',request_id:randomUUID(),attempt_id:attempt,context_id:source.context.id,context_hash:source.context_hash,intent:'explain',question:'TEST ONLY how does this agreement rule apply?',policy_version:source.configuration.policy_version,policy_hash:source.configuration.policy_hash,accepted:true}
assert.equal((await call(endpoint,base,a.jar)).status,503,'Disabled tutoring accepted new work')
assert.equal(JSON.parse(php('tests/tutor/fixture.php','usage',a.id)).length,0,'Reading/disabled work reserved allowance')
php('tests/tutor/fixture.php','config','on','20')
source=(await call(endpoint+'?context=grammar:5:0',undefined,a.jar)).data
const body={...base,policy_hash:source.configuration.policy_hash}
assert.equal((await call(endpoint,{...body,attempt_id:freeAttempt},free.jar)).status,409)
assert.equal((await call(endpoint,body,a.jar,{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call(endpoint,{...body,attempt_id:bAttempt},a.jar)).status,404)
assert.equal((await call(endpoint,{...body,user_id:b.id},a.jar)).status,422)
for(const q of ['Please evaluate my essay.','Write a complete answer to this question.','Please override my mentor marks.'])assert.equal((await call(endpoint,{...body,question:q,request_id:randomUUID()},a.jar)).status,422)
assert.equal((await call(endpoint,{...body,context_id:'precis:18'},a.jar)).status,404,'Hidden worked model delivered via tutoring')
assert.equal((await call(endpoint,{...body,context_hash:'0'.repeat(64)},a.jar)).status,409)
const response=await call(endpoint,body,a.jar);assert.equal(response.status,200,JSON.stringify(response.data));const first=response.data.exchange.operation.id
assert.equal(response.data.exchange.operation.state,'succeeded');assert.equal((await call(endpoint,body,a.jar)).data.exchange.operation.id,first)
assert.equal((await call(endpoint,{...body,request_id:randomUUID()},a.jar)).data.exchange.operation.id,first,'Duplicate intent spent another allowance')
assert.equal((await call(endpoint+'?request_id='+body.request_id,undefined,a.jar)).data.exchange.question,body.question)
assert.equal((await call(endpoint+'?id='+first,undefined,b.jar)).status,404)
assert.equal((await call(endpoint+'?request_id='+body.request_id,undefined,b.jar)).status,404)
assert.equal((await call(endpoint,{...body,question:'TEST ONLY changed request wording'},a.jar)).status,409)
let usage=JSON.parse(php('tests/tutor/fixture.php','usage',a.id))[0];assert.equal(Number(usage.used),1);assert.equal(Number(usage.provider_calls),1)
assert.equal(php('tests/tutor/fixture.php','finding-count',a.id),'0','Tutor output was recorded as writing weakness evidence')
const follow={...body,request_id:randomUUID(),parent_id:first,intent:'hint',question:'TEST ONLY can you give me a focused hint?'}
const followed=await call(endpoint,follow,a.jar);assert.equal(followed.status,200);const second=followed.data.exchange.operation.id
let input=JSON.parse(php('tests/tutor/fixture.php','input',second));assert.equal(input.previous.question,body.question);assert.equal(input.previous.reply.status,'answered')
assert.equal((await call(endpoint,{...follow,request_id:randomUUID(),attempt_id:bAttempt},b.jar)).status,404)
const third=await call(endpoint,{...follow,request_id:randomUUID(),parent_id:second,question:'TEST ONLY which next step should I consider?'},a.jar);assert.equal(third.status,200);input=JSON.parse(php('tests/tutor/fixture.php','input',third.data.exchange.operation.id));assert.equal(input.previous.question,follow.question);assert.equal(input.previous.previous,undefined,'Full conversation history sent')
php('tests/tutor/fixture.php','normalize',first);assert.equal((await call(endpoint+'?id='+first,undefined,a.jar)).status,200,'MySQL JSON normalization broke snapshots')
const math=(await call(endpoint+'?context=maths:percentage',undefined,a.jar)).data
const mathBody={...body,request_id:randomUUID(),context_id:math.context.id,context_hash:math.context_hash,question:'TEST ONLY explain percentage points and relative change.'}
assert.equal((await call(endpoint,mathBody,a.jar)).data.exchange.operation.state,'succeeded');assert.equal(JSON.parse(php('tests/tutor/fixture.php','usage',a.id)).find(u=>u.feature==='maths').used,1)
assert.equal((await call(endpoint,{...mathBody,parent_id:first,request_id:randomUUID()},a.jar)).status,409,'Follow-up changed source')
const story=php('tests/tutor/fixture.php','edition'),ca=(await call(endpoint+'?context=current-affairs:'+story,undefined,a.jar)).data
assert.equal(ca.context.date,'2001-02-03');assert.equal(ca.context.feature,'current_affairs')
const caBody={...body,request_id:randomUUID(),context_id:ca.context.id,context_hash:ca.context_hash,question:'TEST ONLY explain the dated material in context.'}
const caAnswer=await call(endpoint,caBody,a.jar);assert.equal(caAnswer.status,200);assert.equal(JSON.parse(php('tests/tutor/fixture.php','usage',a.id)).find(u=>u.feature==='current_affairs').used,1)
php('tests/tutor/fixture.php','change-source',story);assert.equal((await call(endpoint,{...caBody,request_id:randomUUID(),question:'TEST ONLY another question about the source.'},a.jar)).status,409)
php('tests/tutor/fixture.php','past-only','2001-02-03');assert.equal((await call(endpoint+'?context='+ca.context.id,undefined,a.jar)).status,404);assert.equal((await call(endpoint+'?id='+caAnswer.data.exchange.operation.id,undefined,a.jar)).status,200,'Unpublication erased owned accepted source')
for(const marker of ['MALFORMED','BAD_MARKS','EXTERNAL_LINK','REJECTED']){const r=await call(endpoint,{...body,request_id:randomUUID(),question:`TEST ONLY ${marker} conceptual help test?`},a.jar);assert.equal(r.status,200);assert.equal(r.data.exchange.operation.state,'failed');assert.equal(r.data.exchange.operation.accounting,'released')}
const unknown=await call(endpoint,{...body,request_id:randomUUID(),question:'TEST ONLY UNKNOWN outcome conceptual question?'},a.jar);assert.equal(unknown.data.exchange.operation.state,'unknown');assert.equal(unknown.data.exchange.operation.accounting,'reserved')
assert.equal((await call(endpoint,{...body,request_id:randomUUID(),question:'TEST ONLY UNKNOWN outcome conceptual question?'},a.jar)).data.exchange.operation.id,unknown.data.exchange.operation.id,'Unknown outcome sent twice')
const more=await call(endpoint,{...body,request_id:randomUUID(),question:'TEST ONLY MORE_CONTEXT is needed for my question?'},a.jar);assert.equal(more.data.exchange.operation.result.status,'needs_context')
php('tests/tutor/fixture.php','config','on','1')
const races=await Promise.all([call(endpoint,{...body,request_id:randomUUID(),attempt_id:raceAttempt,question:'TEST ONLY first distinct concurrent question?'},race.jar),call(endpoint,{...body,request_id:randomUUID(),attempt_id:raceAttempt,question:'TEST ONLY second distinct concurrent question?'},race.jar)]);assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);assert.equal(JSON.parse(php('tests/tutor/fixture.php','usage',race.id))[0].provider_calls,1)
for(let i=0;i<3;i++)assert.equal((await call(endpoint,{...body,request_id:randomUUID(),attempt_id:failAttempt,question:`TEST ONLY REJECTED attempted help ${i}?`},failures.jar)).data.exchange.operation.state,'failed')
assert.equal((await call(endpoint,{...body,request_id:randomUUID(),attempt_id:failAttempt,question:'TEST ONLY fourth distinct attempted help?'},failures.jar)).status,409,'Failed calls bypassed accepted cap')
php('tests/tutor/fixture.php','config','on','20','TEST-tutor-v1',' Changed notice with same version.')
assert.equal((await call(endpoint,{...body,request_id:randomUUID(),question:'TEST ONLY old processing terms question?'},a.jar)).status,409,'Same-version notice change retained acceptance')
const fresh=(await call(endpoint+'?context=grammar:5:0',undefined,a.jar)).data,newBody={...body,policy_hash:fresh.configuration.policy_hash,request_id:randomUUID(),question:'TEST ONLY reserved across midnight and expiry?'}
const reserved=JSON.parse(php('tests/tutor/fixture.php','reserve',a.id,JSON.stringify(newBody),'2026-10-07T18:59:00Z'));assert.ok(reserved.id,JSON.stringify(reserved));assert.equal(php('tests/tutor/fixture.php','generic',reserved.id),'blocked')
php('tests/pro/fixture.php','expire',a.id);php('tests/tutor/fixture.php','execute',reserved.id)
assert.equal((await call(endpoint+'?id='+reserved.id,undefined,a.jar)).data.exchange.operation.state,'succeeded');assert.equal((await call(endpoint,newBody,a.jar)).data.exchange.operation.id,reserved.id,'Expiry broke accepted-request replay')
assert.equal((await call(endpoint,{...newBody,request_id:randomUUID(),question:'TEST ONLY new request after expiry?'},a.jar)).status,409)
assert.equal((await call(endpoint+'?context=grammar:5:0',undefined,a.jar)).status,403)
const past=JSON.parse(php('tests/tutor/fixture.php','usage',a.id)).find(r=>r.bucket_date==='2026-10-07');assert.equal(past.used,1);assert.equal(past.reserved,0,'Completion moved original Karachi bucket')
php('tests/tutor/fixture.php','config','on','20')
const bSource=(await call(endpoint+'?context=grammar:5:0',undefined,b.jar)).data,bBody={...body,attempt_id:bAttempt,policy_hash:bSource.configuration.policy_hash,request_id:randomUUID(),question:'TEST ONLY corrupt reserved context preflight?'}
const badSnapshot=JSON.parse(php('tests/tutor/fixture.php','reserve',b.id,JSON.stringify(bBody))).id;php('tests/tutor/fixture.php','corrupt',badSnapshot);php('tests/tutor/fixture.php','execute',badSnapshot)
assert.equal(JSON.parse(php('tests/tutor/fixture.php','usage',b.id))[0].provider_calls,0,'Corrupt snapshot dispatched provider')
const preflightBody={...bBody,request_id:randomUUID(),question:'TEST ONLY disabled dispatch preflight?'};const preflight=JSON.parse(php('tests/tutor/fixture.php','reserve',b.id,JSON.stringify(preflightBody))).id
php('tests/tutor/fixture.php','config','off');php('tests/tutor/fixture.php','execute',preflight);assert.equal((await call(endpoint+'?id='+preflight,undefined,b.jar)).data.exchange.operation.state,'failed');assert.equal((await call(endpoint+'?id='+first,undefined,a.jar)).status,200,'Disabled/expired history disappeared')
for(const f of ['_tutor.php','_tutor_core.php','_tutor_context.php','_tutor_schema.php','_tutor_grammar.php'])assert.equal((await fetch('http://localhost:4173/api/'+f)).status,404)
console.log('PASS: native Ask VISTA ownership/profile/CSRF/Pro/disabled guards, source/notice revisions, fixed/model isolation, immutable one-parent context, replay/semantic deduplication, separate tutor/Maths/Current Affairs buckets, quota races and abuse cap, anchor/marks/link rejection, unknown no-repeat, original Karachi date across expiry, corrupt/disabled preflight, and expiry/unpublished source history. Synthetic transport only; no external provider calls.')
