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
const sources=JSON.parse(readFileSync(new URL('./legacy-sources.json',import.meta.url))),course=JSON.parse(readFileSync(new URL('../../public/api/_premium_files/skills-curriculum.json',import.meta.url)))
for(let n=0;n<sources.length;n++){
 const source=sources[n],legacyId=php('tests/skills/fixture.php','legacy-start',user.id,attempt.data.attempt_id,String(n)),path=endpoint+'?workspace_id='+legacyId
 const digest=php('tests/skills/fixture.php','source-digest',user.id,legacyId)
 const before=await call(path,user.jar);assert.equal(before.status,200);assert.equal(before.data.workspace.source.edition,'skills-2026-10-v1');assert.equal(before.data.saved,null)
 const wrong=(source.check.answer+1)%4
 const saved=await call(endpoint,user.jar,{action:'save',workspace_id:legacyId,expected_version:0,stage:'check',response:wrong});assert.equal(saved.status,200)
 const retained=(await call(path,user.jar)).data.saved.evidence.check_feedback
 assert.equal(retained.chosen,source.check.options[wrong]);assert.equal(retained.explanation,source.check.explanation);assert.equal(retained.choice_explanation,undefined)
 const fresh=await call(endpoint,user.jar,{action:'start',feature:source.feature,lesson:source.id,level:source.level,attempt_id:attempt.data.attempt_id});assert.equal(fresh.status,200)
 const freshId=fresh.data.workspace_id,freshPath=endpoint+'?workspace_id='+freshId,freshDetail=(await call(freshPath,user.jar)).data,newLesson=course.lessons.find(l=>l.id===source.id)
 assert.equal(freshDetail.workspace.source.edition,course.version);assert.notEqual(freshDetail.workspace.source.task,source.task)
 for(const key of ['answer','explanation','option_feedback'])assert.equal(freshDetail.workspace.source.check[key],undefined,'Unanswered source leaked feedback')
 const response={action:'save',workspace_id:freshId,expected_version:0,stage:'check',response:wrong,request_id:randomUUID()}
 const first=await call(endpoint,user.jar,response);assert.equal(first.status,200)
 assert.equal(first.data.evidence.check_feedback.choice_explanation,newLesson.check.option_feedback[wrong]);assert.equal(first.data.evidence.check_feedback.correct,false)
 assert.equal((await call(endpoint,user.jar,response)).data.version_id,first.data.version_id,'Replay created another answer')
 const current=(await call(freshPath,user.jar)).data;assert.equal(current.workspace.version,1);assert.equal(current.saved.evidence.next,0)
 const corrected=await call(endpoint,user.jar,{action:'save',workspace_id:freshId,expected_version:1,stage:'check',response:newLesson.check.answer,advance:true});assert.equal(corrected.status,200);assert.equal(corrected.data.evidence.next,1)
 const original=(await call(freshPath+'&version_id='+first.data.version_id,user.jar)).data;assert.equal(original.saved.evidence.check_feedback.choice_explanation,newLesson.check.option_feedback[wrong]);assert.equal(original.saved.evidence.check_feedback.correct,false)
 assert.equal((await call(freshPath,other.jar)).status,404);assert.equal((await call(path,other.jar)).status,404)
 php('tests/pro/fixture.php','expire',user.id)
 assert.deepEqual((await call(path,user.jar)).data.saved.evidence.check_feedback,retained,'Expiry changed old feedback')
 assert.equal((await call(freshPath+'&version_id='+first.data.version_id,user.jar)).data.saved.evidence.check_feedback.choice_explanation,newLesson.check.option_feedback[wrong])
 assert.equal((await call(endpoint,user.jar,{action:'save',workspace_id:freshId,expected_version:2,stage:freshDetail.workspace.source.stages[1].id,response:'TEST ONLY this independent new paid response must be rejected after expiry, despite otherwise valid wording.'})).status,403)
 php('tests/precis/fixture.php','activate',user.id)
 assert.equal(php('tests/skills/fixture.php','source-digest',user.id,legacyId),digest,'Existing source hash/bytes were rewritten')
}
assert.deepEqual(JSON.parse(php('tests/skills/fixture.php','snapshot',user.id)),[])
console.log('PASS reasoning source editions: v1 question/feedback/bytes retained, current focused tasks and chosen feedback, hidden unanswered reasons, immutable wrong/correct history, exact replay, ownership, expiry/renewal and zero AI usage')
