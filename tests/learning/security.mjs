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
console.log('PASS: native free preparation and writing ownership, profile, CSRF, immutable versions, replay and concurrent saves; external action endpoint remains closed.')
