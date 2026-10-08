import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { execFileSync, execFile } from 'node:child_process'
import { promisify } from 'node:util'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const exec = promisify(execFile)
function phpArgs(args) {
  const env = { ...process.env };for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
  return process.env.CSSV_TEST_PHP_CONTAINER ? ['docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],env] : ['php',args,env]
}
function php(...args) {const [file,cmd,env]=phpArgs(args);return execFileSync(file,cmd,{encoding:'utf8',env}).trim()}
async function parallelPhp(...args) {const [file,cmd,env]=phpArgs(args);return (await exec(file,cmd,{encoding:'utf8',env})).stdout.trim()}
const admin=JSON.parse(await readFile('test-artifacts/admin-session.json','utf8')),owner=new Map([['cssv_owner_session',admin.token],['cssv_owner_csrf',admin.csrf]])
async function call(path,body,jar=new Map(),extra={}) {
 const headers={Accept:'application/json','User-Agent':'CSSVistaLearningIsolation',...extra}
 if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||jar.get('cssv_owner_csrf')||''}
 const response=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})})
 for(const c of response.headers.getSetCookie()){const s=c.split(';')[0],i=s.indexOf('=');jar.set(s.slice(0,i),s.slice(i+1))}
 return {status:response.status,data:await response.json()}
}
async function user(label){const email=`learning-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return{id,jar}}
const a=await user('a'),b=await user('b'), incomplete=await user('incomplete')
php('tests/pro/fixture.php','incomplete',incomplete.id)
for(const path of ['student/learning.php','student/ai-usage.php','admin/ai-usage.php'])assert.equal((await call(path)).status,401)
assert.equal((await call('student/learning.php',undefined,incomplete.jar)).status,403)
assert.equal((await call('admin/ai-usage.php',undefined,a.jar)).status,401)
const settings={action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:'2027-02-20',daily_minutes:120,stage:'starting',optional_subject_ids:['political-science']}
assert.equal((await call('student/learning.php',settings,a.jar,{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call('student/learning.php',settings,a.jar,{'X-CSSV-User':b.id})).status,409)
assert.equal((await call('student/learning.php',{...settings,user_id:b.id},a.jar)).status,422)
const created=await call('student/learning.php',settings,a.jar);assert.equal(created.status,200,JSON.stringify(created.data));const attemptId=created.data.attempt_id
assert.equal((await call('student/learning.php',settings,a.jar)).data.attempt_id,attemptId)
assert.equal((await call('student/learning.php',{...settings,target_year:2028,target_date:null},a.jar)).status,409)
assert.equal((await call('student/learning.php?attempt_id='+attemptId,undefined,b.jar)).status,404)
const update={...settings,id:attemptId,request_id:randomUUID(),expected_version:1,stage:'in_progress'}
const edited=await Promise.all([call('student/learning.php',update,a.jar),call('student/learning.php',{...update,request_id:randomUUID(),daily_minutes:180},a.jar)])
assert.deepEqual(edited.map(r=>r.status).sort(),[200,409],'Concurrent settings edits lost a version')
const writingBody={action:'writing_save',request_id:randomUUID(),expected_version:0,attempt_id:attemptId,kind:'paragraph',title:'TEST writing',text:'She go to school.'}
assert.equal((await call('student/learning.php',writingBody,b.jar)).status,404,'Cross-user attempt binding accepted')
const saved=await call('student/learning.php',writingBody,a.jar);assert.equal(saved.status,200,JSON.stringify(saved.data));const writingId=saved.data.writing_id,versionId=saved.data.version_id
assert.equal((await call('student/learning.php',writingBody,a.jar)).data.version_id,versionId)
assert.equal((await call('student/learning.php',{...writingBody,text:'Changed duplicate'},a.jar)).status,409)
assert.equal((await call('student/learning.php?version_id='+versionId,undefined,b.jar)).status,404)
assert.equal((await call('student/learning.php?writing_id='+writingId,undefined,b.jar)).status,404)
const revision={...writingBody,id:writingId,expected_version:1,request_id:randomUUID(),text:'She goes to school.'}
const revisions=await Promise.all([call('student/learning.php',revision,a.jar),call('student/learning.php',{...revision,request_id:randomUUID(),text:'She attends school.'},a.jar)])
assert.deepEqual(revisions.map(r=>r.status).sort(),[200,409],'Concurrent writing edits lost a version')
assert.equal((await call('student/learning.php?version_id='+versionId,undefined,a.jar)).data.writing_version.text,'She go to school.','Old wording was overwritten')
assert.equal((await call('student/learning.php?writing_id='+writingId,undefined,a.jar)).data.writing.versions.length,2)
assert.equal((await call('student/ai-usage.php',undefined,a.jar)).data.live_actions_enabled,false)
assert.equal((await call('student/ai-usage.php',{action:'evaluate',version_id:versionId},a.jar)).status,405,'Published an unapproved AI action')
const reserve=(req,feature='paragraph',version=versionId,enabled='on',clock='2026-10-07T18:59:59Z')=>['tests/learning/fixture.php','reserve',a.id,req,feature,version,enabled,clock]
const denied=JSON.parse(php(...reserve(randomUUID())));assert.equal(denied.error,'DomainException','Free account accepted premium work')
php('tests/learning/fixture.php','pro',a.id)
assert.equal(JSON.parse(php(...reserve(randomUUID(),'paragraph',versionId,'off'))).error,'LogicException','Disabled provider accepted work')
assert.equal(JSON.parse(php(...reserve(randomUUID(),'full_answer'))).error,'InvalidArgumentException','Full-answer scope accepted')
const request=randomUUID(), raced=await Promise.all([parallelPhp(...reserve(request)),parallelPhp(...reserve(request))])
const ops=raced.map(JSON.parse);assert.ok(ops.every(r=>r.id),JSON.stringify(ops));assert.equal(ops[0].id,ops[1].id,'Duplicate reserve consumed twice');const operationId=ops[0].id
assert.equal(JSON.parse(php(...reserve(request,'sentence'))).error,'InvalidArgumentException')
assert.equal(JSON.parse(php(...reserve(randomUUID()))).error,'DomainException','Allowance exceeded')
const competing=await Promise.all([parallelPhp(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-12T00:00:00Z')),parallelPhp(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-12T00:00:00Z'))])
assert.equal(competing.map(JSON.parse).filter(r=>r.id).length,1,'Distinct concurrent requests overspent the last allowance')
assert.equal(competing.map(JSON.parse).filter(r=>r.error==='DomainException').length,1)
const undispatched=competing.map(JSON.parse).find(r=>r.id).id
php('tests/learning/fixture.php','execute-disabled',undispatched)
let unavailable=(await call('student/ai-usage.php?operation_id='+undispatched,undefined,a.jar)).data.operation
assert.equal(unavailable.state,'failed');assert.equal(unavailable.accounting,'released')
const unstartedBucket=JSON.parse(php('tests/learning/fixture.php','snapshot',a.id)).find(r=>r.bucket_date==='2026-10-12')
assert.equal(Number(unstartedBucket.provider_calls),0,'Preflight failure counted a provider dispatch')
for(let n=0;n<2;n++){
 const retry=JSON.parse(php(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-12T00:00:00Z'))).id
 assert.ok(retry);php('tests/learning/fixture.php','execute',retry,'rejected')
}
assert.equal(JSON.parse(php(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-12T00:00:00Z'))).error,'DomainException','Repeated known failures bypassed the accepted-attempt cap')
assert.equal((await call('student/ai-usage.php?operation_id='+operationId,undefined,b.jar)).status,404)
php('tests/learning/fixture.php','execute',operationId,'invalid')
let op=(await call('student/ai-usage.php?operation_id='+operationId,undefined,a.jar)).data.operation
assert.equal(op.state,'failed');assert.equal(op.accounting,'released','Known invalid result consumed successful allowance')
let bucket=JSON.parse(php('tests/learning/fixture.php','snapshot',a.id)).find(r=>r.bucket_date==='2026-10-07')
assert.equal(Number(bucket.used),0);assert.equal(Number(bucket.provider_calls),1)
const unknown=JSON.parse(php(...reserve(randomUUID()))).id;php('tests/learning/fixture.php','execute',unknown,'unknown')
op=(await call('student/ai-usage.php?operation_id='+unknown,undefined,a.jar)).data.operation;assert.equal(op.state,'unknown');assert.equal(op.accounting,'reserved')
php('tests/learning/fixture.php','execute-disabled',unknown)
assert.equal((await call('student/ai-usage.php?operation_id='+unknown,undefined,a.jar)).data.operation.accounting,'reserved','Disabled transport incorrectly released an unknown outcome')
php('tests/learning/fixture.php','execute',unknown,'valid')
assert.equal((await call('student/ai-usage.php?operation_id='+unknown,undefined,a.jar)).data.operation.state,'unknown','Unknown outcome blindly dispatched again')
const nextDay=JSON.parse(php(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-07T19:00:00Z'))).id
php('tests/learning/fixture.php','execute',nextDay,'valid');php('tests/learning/fixture.php','execute',nextDay,'valid')
const snapshot=JSON.parse(php('tests/learning/fixture.php','snapshot',a.id));assert.equal(Number(snapshot.find(r=>r.bucket_date==='2026-10-08').used),1);assert.equal(Number(snapshot.find(r=>r.bucket_date==='2026-10-08').provider_calls),1)
php('tests/pro/fixture.php','expire',a.id)
php('tests/learning/fixture.php','finalize',unknown)
assert.equal((await call('student/ai-usage.php?operation_id='+unknown,undefined,a.jar)).data.operation.state,'succeeded','Accepted result discarded after Pro expiry')
assert.equal(Number(JSON.parse(php('tests/learning/fixture.php','snapshot',a.id)).find(r=>r.bucket_date==='2026-10-07').used),1,'Completion charged the wrong Pakistan day')
assert.equal(JSON.parse(php(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-09T00:00:00Z'))).error,'DomainException','Expired Pro accepted new work')
assert.equal((await call('student/learning.php?version_id='+versionId,undefined,a.jar)).data.writing_version.text,writingBody.text)
assert.equal((await call('student/learning.php', {...revision,expected_version:2,request_id:randomUUID(),text:'A saved revision after expiry.'},a.jar)).status,200,'Free owned writing storage incorrectly gated by Pro')
php('tests/learning/fixture.php','pro',a.id)
const stale=JSON.parse(php(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-10T00:00:00Z'))).id
php('tests/learning/fixture.php','age',stale);php('tests/learning/fixture.php','sweep')
assert.equal((await call('student/ai-usage.php?operation_id='+stale,undefined,a.jar)).data.operation.accounting,'released')
const inFlight=JSON.parse(php(...reserve(randomUUID(),'paragraph',versionId,'on','2026-10-11T00:00:00Z'))).id
php('tests/learning/fixture.php','start',inFlight);php('tests/learning/fixture.php','age',inFlight);php('tests/learning/fixture.php','sweep')
assert.equal((await call('student/ai-usage.php?operation_id='+inFlight,undefined,a.jar)).data.operation.state,'unknown')
const report=await call('admin/ai-usage.php?period=month',undefined,owner);assert.equal(report.status,200);assert.equal(JSON.stringify(report.data).includes(writingBody.text),false,'Admin usage report exposed writing')
assert.equal(report.data.estimated_cost_usd,null,'Unverified cost invented')
assert.equal((await call('student/learning.php?offset=-1',undefined,a.jar)).status,422)
await call('auth/logout.php',{},a.jar);assert.equal((await call('student/learning.php',undefined,a.jar)).status,401)
console.log('PASS: native account eligibility/CSRF/ownership, settings and writing concurrency, immutable wording, idempotency, disabled/excluded AI scopes, atomic quota limits, token accounting, unknown/no-retry, midnight/expiry continuity, conservative recovery and privacy-safe admin reports. No provider network calls.')
