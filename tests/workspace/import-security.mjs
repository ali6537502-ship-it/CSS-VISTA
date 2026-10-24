import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
async function call(path,jar=new Map(),body,extra={}){
 const headers={Accept:'application/json',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=jar.get('cssv_csrf')||''}
 const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const v of r.headers.getSetCookie()){const [pair]=v.split(';'),i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}return {status:r.status,data:await r.json(),headers:r.headers}
}
async function user(){const email=`import-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',jar,{email,password:'TEST ONLY native fixture password'})).status,200);const created=await call('student/learning.php',jar,{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,optional_subject_ids:[],daily_minutes:45,stage:'starting'});assert.equal(created.status,200);return {id,jar,attempt:created.data.attempt_id}}
const a=await user(),b=await user(),request=randomUUID(),text='TEST ONLY original imported response\nاردو x² = 4 🧪\n  Preserve inner spaces.'
const input={action:'writing_save',request_id:request,expected_version:0,attempt_id:a.attempt,kind:'paragraph',title:'TEST ONLY browser import',text}
assert.equal((await call('student/learning.php?request_id='+request)).status,401)
assert.equal((await call('student/learning.php?request_id='+request,a.jar)).status,404)
assert.equal((await call('student/learning.php?request_id=invalid',a.jar)).status,422)
assert.equal((await call('student/learning.php?request_id='+request,a.jar,undefined,{'X-CSSV-User':b.id})).status,409)
const first=await call('student/learning.php',a.jar,input);assert.equal(first.status,200)
const duplicate=await Promise.all([call('student/learning.php',a.jar,input),call('student/learning.php',a.jar,input)]);for(const r of duplicate){assert.equal(r.status,200);assert.equal(r.data.writing_id,first.data.writing_id);assert.equal(r.data.version_id,first.data.version_id)}
const before=php('tests/workspace/fixture.php','digest',a.id)
const receipt=await call('student/learning.php?request_id='+request,a.jar);assert.equal(receipt.status,200);assert.equal(receipt.data.result.version_id,first.data.version_id);assert.equal(receipt.data.request_id,request);assert.ok(receipt.data.confirmed_at);assert.match(receipt.headers.get('cache-control'),/no-store/);assert.ok(!JSON.stringify(receipt.data).includes(text))
assert.equal((await call('student/learning.php?request_id='+request,b.jar)).status,404)
assert.equal((await call('student/learning.php?version_id='+first.data.version_id,b.jar)).status,404)
const copy=await call('student/learning.php?version_id='+first.data.version_id,a.jar);assert.equal(copy.data.writing_version.text,text);assert.equal(copy.data.writing_version.text_hash,createHash('sha256').update(text).digest('hex'))
assert.equal((await call('student/learning.php',a.jar,{...input,text:'Changed original'})).status,409)
assert.equal((await call('student/learning.php',a.jar,{...input,request_id:randomUUID(),attempt_id:b.attempt})).status,404)
assert.equal(php('tests/workspace/fixture.php','digest',a.id),before,'Receipt lookup, replay or refused source/owner changes mutated original writing')
const writing=await call('student/learning.php?writing_id='+first.data.writing_id,a.jar);assert.equal(writing.data.writing.versions.length,1)
php('tests/workspace/fixture.php','pause','1')
try{assert.equal((await call('student/learning.php?request_id='+request,a.jar)).status,200);assert.equal((await call('student/learning.php',a.jar,{...input,request_id:randomUUID(),kind:'precis'})).status,503)}finally{php('tests/workspace/fixture.php','pause','0')}
console.log('PASS: native import receipt ownership/no-store/body exclusion; concurrent duplicate replay yields one immutable version; exact UTF-8/hash preserved; source mutation/foreign attempt refused; pause does not erase receipts or permit paid imports.')
