import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim():execFileSync('php',args,{env,encoding:'utf8'}).trim()
const origin=process.env.CSSV_TEST_API_ORIGIN||'http://localhost:4173';if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Loopback only')
async function call(path,jar=new Map(),body,extra={}){const headers={...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=jar.get('cssv_csrf')||'';Object.assign(headers,extra)}const r=await fetch(origin+'/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify({request_id:randomUUID(),...body})}:{})});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1))}return{status:r.status,data:await r.json()}}
async function account(){const email=`free-expression-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',jar,{email,password:'TEST ONLY native fixture password'})).status,200);return{id,jar}}
const user=await account(),other=await account(),api='student/skills.php'
php('tests/skills/fixture.php','config','on') // Stale enable flags must not restore cancelled evaluation.
assert.equal((await call(api)).status,401)
const overview=await call(api,user.jar);assert.equal(overview.status,200);assert.notEqual(overview.data.membership.status,'active');assert.deepEqual(overview.data.access,{allowed:true,kind:'free'});assert.equal(overview.data.configuration.enabled,false)
assert.equal(overview.data.catalog.length,33);assert.equal(new Set(overview.data.catalog.map(l=>l.chapter)).size,16);assert.deepEqual([...new Set(overview.data.catalog.map(l=>l.chapter))],Array.from({length:16},(_,i)=>i+1))
const attempt=await call('student/learning.php',user.jar,{action:'attempt_save',expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]});assert.equal(attempt.status,200)
const course=JSON.parse(readFileSync(new URL('../../public/api/_premium_files/skills-curriculum.json',import.meta.url))).lessons.filter(l=>l.feature==='sentence')
let first
for(const [index,lesson] of course.entries()){
 // Separate curriculum batches without weakening the production rate limit.
 if(index%8===0)php('tests/skills/fixture.php','config','on')
 const start={action:'start',feature:'sentence',lesson:lesson.id,level:lesson.level,attempt_id:attempt.data.attempt_id}
 if(!first)assert.equal((await call(api,user.jar,start,{'X-CSRF-Token':'bad'})).status,403)
 const created=await call(api,user.jar,start);assert.equal(created.status,200,JSON.stringify(created.data));const id=created.data.workspace_id,path=api+'?workspace_id='+id
 const source=(await call(path,user.jar)).data.workspace.source
 for(const key of ['answer','explanation','option_feedback'])assert.equal(source.check[key],undefined)
 assert.equal((await call(path,other.jar)).status,404)
 assert.equal((await call(api,user.jar,{action:'save',workspace_id:id,expected_version:0,stage:'revision',response:'Do not allow a skipped stage.'})).status,409)
 let version=0
 for(const [stage,response] of [['check',(lesson.check.answer+1)%4],['check',lesson.check.answer],['draft','I keep the materials for one study task on my desk. This arrangement lets me find the current notes without searching through other subjects. It may be useful when I follow it consistently, although another learner might prefer a different arrangement. Before the next session I check whether the notes still match the planned task, and I put unrelated pages in their own folder so that I can keep the focus clear.'],['reflection','I will check the reference, intended action and condition before revising.'],['revision','I keep only the notes for my current task on the desk. This arrangement can make them easier to locate because other materials are stored separately. Its usefulness depends on whether I maintain the system; it is not a promise of better examination marks. I also check the folder before the next session and remove any material that belongs to a different task, while keeping the useful notes available for later review.']]){
  const body={action:'save',request_id:randomUUID(),workspace_id:id,expected_version:version,stage,response,advance:true}
  const saved=await call(api,user.jar,body);assert.equal(saved.status,200,JSON.stringify(saved.data));version++
  if(stage==='check'&&response!==lesson.check.answer){assert.equal(saved.data.evidence.next,0);assert.equal(saved.data.evidence.check_feedback.correct,false)}
  if(stage==='revision')assert.equal(saved.data.evidence.all_recorded,true)
  if(!first&&stage==='draft'){const replay=await call(api,user.jar,body);assert.equal(replay.data.version_id,saved.data.version_id)}
 }
 const detail=(await call(path,user.jar)).data;assert.equal(detail.versions.length,5);assert.equal(detail.saved.version,5);assert.match(detail.saved.text,/I keep only/);assert.equal(detail.access.kind,'free');assert.equal((await call('student/learning.php?writing_id='+detail.workspace.writing_id,user.jar)).data.writing.kind,lesson.writing_kind||'sentence')
 const rejected=await call(api,user.jar,{action:'save',workspace_id:id,expected_version:0,stage:'draft',response:'Stale draft.'});assert.equal(rejected.status,409)
 const evaluation=await call(api,user.jar,{action:'evaluate',workspace_id:id,version_id:detail.saved.version_id,policy_version:'TEST-skills-v1',policy_hash:'0'.repeat(64),accepted:true});assert.notEqual(evaluation.status,200)
 first ||= {id,detail}
}
assert.deepEqual(JSON.parse(php('tests/skills/fixture.php','snapshot',user.id)),[],'AI operation created by free practice')
const reopened=(await call(api+'?workspace_id='+first.id,user.jar)).data;assert.equal(reopened.saved.version_id,first.detail.saved.version_id)
php('tests/skills/fixture.php','config','off')
console.log('PASS free expression: all 33 lessons/16 chapters, wrong/correct feedback, ordered independent writing/review/revision, immutable versions, replay, stale conflict, reopen, no membership, foreign access/CSRF/auth checks, cancelled evaluation and zero AI usage')
