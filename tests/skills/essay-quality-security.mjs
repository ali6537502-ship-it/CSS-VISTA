import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim():execFileSync('php',args,{env,encoding:'utf8'}).trim()
const origin=process.env.CSSV_TEST_API_ORIGIN||'http://localhost:4173'
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Loopback tests only')
async function call(path,jar=new Map(),body){const headers={Accept:'application/json'};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=jar.get('cssv_csrf')||''}const r=await fetch(origin+'/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify({...body,request_id:body.request_id||randomUUID()})}:{})});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1))}return{status:r.status,data:await r.json()}}
async function account(label){const email=`quality-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',jar,{email,password:'TEST ONLY native fixture password'})).status,200);php('tests/precis/fixture.php','activate',id);return{id,jar}}
php('tests/skills/fixture.php','config','off')
const user=await account('owner'),other=await account('other'),endpoint='student/skills.php'
const attempt=await call('student/learning.php',user.jar,{action:'attempt_save',expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]});assert.equal(attempt.status,200)
const sources=JSON.parse(readFileSync(new URL('./essay-legacy-sources.json',import.meta.url)))
for(let n=0;n<sources.length;n++){
 const source=sources[n],id=php('tests/skills/fixture.php','essay-legacy-start',user.id,attempt.data.attempt_id,String(n)),path=endpoint+'?workspace_id='+id,digest=php('tests/skills/fixture.php','source-digest',user.id,id)
 const old=(await call(path,user.jar)).data;assert.equal(old.workspace.source.edition,'skills-2026-10-v3');assert.equal(old.workspace.source.stages[0].review,undefined)
 const response='This independent hypothetical response identifies the scope of the theme and distinguishes a relevant institutional issue from a neighbouring question that needs a different argument.'
 const saved=await call(endpoint,user.jar,{action:'save',workspace_id:id,expected_version:0,stage:'understanding',response,advance:true});assert.equal(saved.status,200)
 const fresh=await call(endpoint,user.jar,{action:'start',feature:'essay',lesson:source.id,level:source.level,attempt_id:attempt.data.attempt_id});assert.equal(fresh.status,200)
 const data=(await call(endpoint+'?workspace_id='+fresh.data.workspace_id,user.jar)).data
 assert.equal(data.workspace.source.edition,'essay-guidance-2026-10-v1');assert.equal(data.workspace.source.roadmap_brief,source.explanation);assert.deepEqual(data.workspace.source.roadmap,source.roadmap);assert.equal(data.workspace.source.stages.length,7);assert.ok(data.workspace.source.stages.every(s=>s.review.length===2))
 assert.equal((await call(path,other.jar)).status,404);php('tests/pro/fixture.php','expire',user.id)
 assert.equal((await call(path,user.jar)).data.saved.answers.understanding,response);assert.equal((await call(endpoint,user.jar,{action:'save',workspace_id:id,expected_version:1,stage:'understanding',response})).status,403);php('tests/precis/fixture.php','activate',user.id)
 assert.equal(php('tests/skills/fixture.php','source-digest',user.id,id),digest)
}
assert.deepEqual(JSON.parse(php('tests/skills/fixture.php','snapshot',user.id)),[])
console.log('PASS essay teaching editions: old snapshot bytes/hash and responses retained; new 7-stage guidance, original brief/roadmap, ownership, expiry/renewal and zero AI usage.')
