import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim():execFileSync('php',args,{env,encoding:'utf8'}).trim()
async function call(path,body,jar=new Map(),extra={}){const headers={Accept:'application/json','User-Agent':'CSSVistaPrecisIsolation',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||''}const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1))}return{status:r.status,data:await r.json()}}
async function user(label){const email=`precis-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return{id,jar}}
const a=await user('active'),b=await user('other'),free=await user('free'),incomplete=await user('incomplete'),endpoint='student/precis.php'
const settings={action:'attempt_save',expected_version:0,target_year:2027,target_date:null,daily_minutes:120,stage:'starting',optional_subject_ids:[]}
const make=async u=>(await call('student/learning.php',{...settings,request_id:randomUUID()},u.jar)).data.attempt_id
const attempt=await make(a),other=await make(a),bAttempt=await make(b),fAttempt=await make(free)
assert.equal((await call(endpoint)).status,401);assert.equal((await call(endpoint,undefined,a.jar,{'X-CSSV-User':b.id})).status,409)
php('tests/pro/fixture.php','incomplete',incomplete.id);assert.equal((await call(endpoint,undefined,incomplete.jar)).status,403)
assert.equal((await call(endpoint,undefined,free.jar)).data.catalog,null,'Free account received premium curriculum')
php('tests/precis/fixture.php','activate',a.id);php('tests/precis/fixture.php','activate',b.id)
const overview=(await call(endpoint,undefined,a.jar)).data;assert.equal(overview.catalog.chapters.length,25);assert.equal(overview.catalog.questions.length,39);assert.equal(overview.evaluation_enabled,false)
for(const p of overview.catalog.passages){assert.equal(p.model,undefined);assert.equal(p.model_title,undefined)}for(const q of overview.catalog.questions){assert.equal(q.answer,undefined);assert.equal(q.explanation,undefined)}
const body={action:'writing_save',request_id:randomUUID(),expected_version:0,attempt_id:attempt,passage_id:'example-1',title:'TEST ONLY material comfort and happiness',text:'TEST ONLY money can provide comfort, but lasting happiness also depends on relationships and inner peace.',scratch:{central_idea:'TEST ONLY wealth does not guarantee happiness',rewrite_task:'TEST ONLY protect qualification'},self_check:{fidelity:2},timer:null}
assert.equal((await call(endpoint,body,a.jar,{'X-CSRF-Token':'wrong'})).status,403);assert.equal((await call(endpoint,{...body,attempt_id:bAttempt},a.jar)).status,404)
assert.equal((await call(endpoint,{...body,user_id:b.id},a.jar)).status,422);assert.equal((await call(endpoint,{...body,attempt_id:fAttempt},free.jar)).status,403)
assert.equal((await call(endpoint,{...body,self_check:{fidelity:6}},a.jar)).status,422)
const saved=await call(endpoint,body,a.jar);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal((await call(endpoint,body,a.jar)).data.version_id,saved.data.version_id)
const history=(await call(endpoint,undefined,a.jar)).data;assert.match(history.writing[0].updated_at,/T.*Z$/,'History date lacks an explicit UTC timezone');assert.equal(typeof history.writing[0].version,'number');assert.equal(typeof history.attempts[0].target_year,'number')
assert.equal((await call(endpoint,{...body,title:'Changed identity'},a.jar)).status,409)
const url=`${endpoint}?writing_id=${saved.data.writing_id}`
assert.equal((await call(url,undefined,b.jar)).status,404)
let record=(await call(url,undefined,a.jar)).data;assert.equal(record.context.title,body.title);assert.equal(record.context.self_check.fidelity,2);assert.equal(record.source.id,'example-1')
const reveal={action:'reveal_model',request_id:randomUUID(),writing_id:saved.data.writing_id};assert.equal((await call(endpoint,reveal,a.jar)).status,409,'Early model revealed')
const rewrite={...body,request_id:randomUUID(),id:saved.data.writing_id,expected_version:1,text:'TEST ONLY money offers comfort; however, lasting happiness can require non-material well-being.',title:'TEST ONLY beyond material possession'};delete rewrite.passage_id
assert.equal((await call(endpoint,{...rewrite,passage_id:'example-2'},a.jar)).status,422,'Rewrite changed original')
assert.equal((await call(endpoint,{...rewrite,attempt_id:other},a.jar)).status,409)
const revised=await call(endpoint,rewrite,a.jar);assert.equal(revised.status,200,JSON.stringify(revised.data));assert.equal((await call(endpoint,{...rewrite,request_id:randomUUID()},a.jar)).status,409,'Stale writer overwrote history')
record=(await call(`${url}&version_id=${saved.data.version_id}`,undefined,a.jar)).data;assert.equal(record.version.text,body.text);assert.equal(record.context.title,body.title)
const model=await call(endpoint,reveal,a.jar);assert.equal(model.status,200,JSON.stringify(model.data));assert.equal(model.data.model.title,'Beyond Material Wealth')
// Preserve the pre-existing free writing utility, but do not treat an unbound
// generic version as a Précis Lab attempt for model disclosure / future AI.
const genericBase=await call(endpoint,{...body,request_id:randomUUID()},a.jar);assert.equal(genericBase.status,200)
const generic=await call('student/learning.php',{action:'writing_save',request_id:randomUUID(),id:genericBase.data.writing_id,expected_version:1,attempt_id:attempt,kind:'precis',title:'TEST ONLY generic utility revision',text:'TEST ONLY different wording saved through the existing free utility.'},a.jar);assert.equal(generic.status,200)
assert.equal((await call(endpoint,{action:'reveal_model',request_id:randomUUID(),writing_id:genericBase.data.writing_id},a.jar)).status,409,'Unbound generic revision bypassed the Lab context gate')
assert.equal((await call(`${endpoint}?writing_id=${genericBase.data.writing_id}`,undefined,a.jar)).data.context,null)
const mismatch=await call(endpoint,{...body,request_id:randomUUID()},a.jar);assert.equal(mismatch.status,200)
assert.equal((await call(endpoint,{...rewrite,request_id:randomUUID(),id:mismatch.data.writing_id},a.jar)).status,200)
php('tests/precis/fixture.php','different-original',a.id,mismatch.data.writing_id)
assert.equal((await call(endpoint,{action:'reveal_model',request_id:randomUUID(),writing_id:mismatch.data.writing_id},a.jar)).status,422,'A model for another source edition was revealed')
const custom={...body,request_id:randomUUID(),original:'TEST ONLY private practice source with at least twenty words for learning, keeping its original meaning and relevant logical qualification during compression.',source_label:'TEST ONLY personally supplied teaching passage',word_limit:25};delete custom.passage_id
const customSaved=await call(endpoint,custom,a.jar);assert.equal(customSaved.status,200);assert.equal((await call(`${endpoint}?writing_id=${customSaved.data.writing_id}&version_id=${saved.data.version_id}`,undefined,a.jar)).status,404,'Wrong-record version accepted')
const own=(await call(`${endpoint}?writing_id=${customSaved.data.writing_id}`,undefined,a.jar)).data;assert.equal(own.source.limit,25);assert.equal(own.source.text,custom.original)
const prog={action:'progress_save',request_id:randomUUID(),attempt_id:attempt,expected_version:0,current_day:4,completed:[1,2,3]}
assert.equal((await call(endpoint,prog,a.jar)).status,200);assert.equal((await call(endpoint,prog,a.jar)).data.version,1)
assert.equal((await call(endpoint,{...prog,request_id:randomUUID(),current_day:5},a.jar)).status,409)
assert.equal((await call(endpoint,{...prog,request_id:randomUUID(),expected_version:1,completed:[]},a.jar)).status,200)
assert.deepEqual((await call(`${endpoint}?attempt_id=${attempt}`,undefined,a.jar)).data.completed,[1,2,3],'Completed days erased')
assert.equal((await call(`${endpoint}?attempt_id=${attempt}`,undefined,b.jar)).status,404)
const questions=JSON.parse(php('tests/precis/fixture.php','questions')),q=questions['qualification-tech'],answer={action:'drill_answer',request_id:randomUUID(),attempt_id:attempt,question_id:q.id,choice:(q.answer+1)%3}
assert.equal((await call(endpoint,{...answer,choice:99},a.jar)).status,422);const wrong=await call(endpoint,answer,a.jar);assert.equal(wrong.data.correct,false)
assert.equal((await call(endpoint,answer,a.jar)).data.correct,false);assert.equal((await call(endpoint,{...answer,choice:q.answer},a.jar)).status,409)
assert.equal((await call(endpoint,{...answer,attempt_id:bAttempt},b.jar)).status,200,'Same request identity in another account collided with the response ledger')
assert.equal((await call(endpoint,{...answer,request_id:randomUUID(),choice:q.answer},a.jar)).data.correct,true)
let profile=(await call(`${endpoint}?attempt_id=${attempt}`,undefined,a.jar)).data.profile;assert.equal(profile.items[6].first_correct,0);assert.equal(profile.items[6].state,'Needs review')
php('tests/precis/fixture.php','spaced',a.id,attempt,q.id);profile=(await call(`${endpoint}?attempt_id=${attempt}`,undefined,a.jar)).data.profile;assert.equal(profile.items[6].state,'Improving');assert.equal(profile.items[6].first_correct,0)
assert.equal((await call(`${endpoint}?attempt_id=${other}`,undefined,a.jar)).data.profile.items[6].questions,0)
const competing=await Promise.all([call(endpoint,{...prog,request_id:randomUUID(),expected_version:2,current_day:5},a.jar),call(endpoint,{...prog,request_id:randomUUID(),expected_version:2,current_day:6},a.jar)]);assert.deepEqual(competing.map(r=>r.status).sort(),[200,409])
php('tests/pro/fixture.php','expire',a.id);assert.equal((await call(endpoint,undefined,a.jar)).data.catalog,null);record=(await call(url,undefined,a.jar)).data;assert.equal(record.model.title,model.data.model.title,'Expiry removed revealed history')
assert.equal((await call(endpoint,rewrite,a.jar)).data.version_id,revised.data.version_id,'Expiry broke accepted-save replay');assert.equal((await call(endpoint,{...rewrite,request_id:randomUUID(),expected_version:2},a.jar)).status,403)
assert.equal((await call(`${endpoint}?attempt_id=${attempt}`,undefined,a.jar)).status,200)
assert.equal(php('tests/precis/fixture.php','usage',a.id),'0','Ordinary Précis learning made an AI operation')
for(const file of ['_precis.php','_precis_core.php','_precis_schema.php','_precis_questions.php','_precis_handbook.php'])assert.equal((await fetch('http://localhost:4173/api/'+file)).status,404)
console.log('PASS: native Précis profile/ownership/CSRF/Pro content enforcement, immutable original/title/version context, delayed owned model reveal, custom source/explicit limit, replay/concurrency, first-response/spaced evidence, expiry history and zero AI operations.')
