import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...a)=>{const bin=process.env.CSSV_TEST_PHP_CONTAINER?'docker':'php',args=process.env.CSSV_TEST_PHP_CONTAINER?['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...a]:a;return execFileSync(bin,args,{env,encoding:'utf8'}).trim()}
const fixture=(...a)=>php('tests/precis/feedback-fixture.php',...a)
async function call(path,body,jar=new Map(),extra={}){const headers={Accept:'application/json','User-Agent':'CSSVistaPrecisFeedbackIsolation',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||''}const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const s=c.split(';')[0],i=s.indexOf('=');jar.set(s.slice(0,i),s.slice(i+1))}return{status:r.status,data:await r.json()}}
async function user(){const email=`precis-feedback-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);const a=await call('student/learning.php',{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:120,stage:'starting',optional_subject_ids:[]},jar);assert.equal(a.status,200);return{id,jar,attempt:a.data.attempt_id}}
async function save(u,text,previous,source){const b={action:'writing_save',request_id:randomUUID(),expected_version:previous?.version||0,...(previous?{id:previous.writing_id}:source?{original:source,source_label:'TEST ONLY private original',word_limit:20}:{passage_id:'example-1'}),attempt_id:u.attempt,title:'TEST ONLY qualified claim',text,scratch:{central_idea:'TEST ONLY qualified controlling idea'},self_check:{fidelity:0},timer:null};const r=await call('student/precis.php',b,u.jar);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
const body=v=>({action:'evaluate',request_id:randomUUID(),version_id:v,policy_version:'TEST-precis-v1',accepted:true})
const get=(u,path='')=>call('student/precis-feedback.php'+path,undefined,u.jar),evaluate=(u,b,extra)=>call('student/precis-feedback.php',b,u.jar,extra),usage=u=>JSON.parse(fixture('snapshot',u.id))
fixture('config','off')
assert.equal((await call('student/precis-feedback.php')).status,401)
const a=await user(),b=await user();php('tests/precis/fixture.php','activate',a.id)
const initial=await save(a,'TEST ONLY money can never contribute to happiness. She go to school.')
assert.equal((await get(a)).data.configuration.enabled,false);assert.equal((await evaluate(a,body(initial.version_id))).status,503)
fixture('config','on')
assert.equal((await evaluate(a,body(initial.version_id),{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await evaluate(a,body(initial.version_id),{'X-CSSV-User':b.id})).status,409)
assert.equal((await evaluate(b,body(initial.version_id))).status,404)
assert.equal((await evaluate(a,{...body(initial.version_id),original:'Injected source'})).status,422)
assert.equal((await evaluate(a,{...body(initial.version_id),accepted:false})).status,422)
assert.equal((await evaluate(a,{...body(initial.version_id),policy_version:'obsolete'})).status,409)
assert.equal((await get(b,`?version_id=${initial.version_id}`)).status,404)
const generic=await call('student/learning.php',{action:'writing_save',request_id:randomUUID(),expected_version:0,attempt_id:a.attempt,kind:'precis',title:'TEST ONLY generic',text:'TEST ONLY generic writing is not source bound.'},a.jar);assert.equal(generic.status,200);assert.equal((await evaluate(a,body(generic.data.version_id))).status,404)
const req=body(initial.version_id),first=await evaluate(a,req);assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.operation.state,'succeeded')
assert.equal((await evaluate(a,req)).data.operation.id,first.data.operation.id)
assert.equal((await get(a,`?request_id=${req.request_id}`)).data.operation.id,first.data.operation.id,'Lost response cannot recover accepted identity')
assert.equal((await get(b,`?request_id=${req.request_id}`)).status,404)
assert.equal((await evaluate(a,body(initial.version_id))).status,409)
assert.equal((await evaluate(a,{...req,policy_version:'changed'})).status,409)
const input=JSON.parse(fixture('input',first.data.operation.id));assert.equal(input.title,'TEST ONLY qualified claim');assert.equal(input.student_text,'TEST ONLY money can never contribute to happiness. She go to school.');assert.equal(input.rubric.version,'precis-source-v1');assert.equal(Object.keys(input.rubric.criteria).length,12);assert.ok(input.original.length>20);assert.ok(!('model' in input));assert.ok(!('self_check' in input),'Self-rating uploaded as mastery evidence');assert.equal(fixture('generic-execute',first.data.operation.id),'blocked')
assert.equal((await get(a,`?version_id=${initial.version_id}`)).data.feedback.skills.length,12)
const rewrite=await save(a,'TEST ONLY money can contribute to comfort, while happiness depends on further conditions. She goes to school.',initial)
assert.equal((await get(a,`?before=${initial.version_id}&after=${rewrite.version_id}`)).data.comparison.available,false)
assert.equal((await evaluate(a,{...req,version_id:rewrite.version_id})).status,409)
assert.equal((await evaluate(a,body(rewrite.version_id))).data.operation.state,'succeeded')
const snapshot=JSON.stringify(usage(a)),comparison=(await get(a,`?before=${initial.version_id}&after=${rewrite.version_id}`)).data.comparison
assert.equal(comparison.available,true);assert.equal(comparison.skills.find(s=>s.skill==='fidelity').before,'needs_work');assert.equal(comparison.skills.find(s=>s.skill==='fidelity').after,'supported');assert.deepEqual(comparison.no_longer_reported,['subject_verb_agreement']);assert.equal(JSON.stringify(usage(a)),snapshot,'Comparison used a model')
assert.equal((await get(a,`?before=${rewrite.version_id}&after=${initial.version_id}`)).status,422);assert.equal((await get(b,`?before=${initial.version_id}&after=${rewrite.version_id}`)).status,404)
const third=await save(a,'TEST ONLY next version.',rewrite);assert.equal((await evaluate(a,body(third.version_id))).status,409)
const grammar=(await call('student/grammar.php?attempt_id='+a.attempt,undefined,a.jar)).data;assert.ok(grammar.profile.writing.items.some(s=>s.code==='subject_verb_agreement'),'Précis finding missing from shared attempt Grammar profile')
const expression=(await call('student/expression.php',undefined,a.jar)).data;assert.ok(expression.profile.items.some(s=>s.code==='subject_verb_agreement'),'Précis finding missing from Writing Error Profile')
const free=await user();const freeWriting=await call('student/learning.php',{action:'writing_save',request_id:randomUUID(),expected_version:0,attempt_id:free.attempt,kind:'precis',title:'TEST ONLY',text:'TEST ONLY free record.'},free.jar);assert.equal((await evaluate(free,body(freeWriting.data.version_id))).status,404)
php('tests/pro/fixture.php','expire',a.id);assert.equal((await evaluate(a,req)).data.operation.id,first.data.operation.id);assert.equal((await get(a,`?version_id=${initial.version_id}`)).data.feedback.skills.length,12);assert.equal((await evaluate(a,body(third.version_id))).status,409)
// Bound failures separately from successful use; validate source and title anchors.
fixture('config','on','1');const c=await user();php('tests/precis/fixture.php','activate',c.id)
const malformed=await save(c,'TEST ONLY MALFORMED');for(let i=0;i<3;i++){const r=await evaluate(c,body(malformed.version_id));assert.equal(r.data.operation.state,'failed');assert.equal(r.data.operation.accounting,'released')}assert.equal((await evaluate(c,body(malformed.version_id))).status,409);assert.equal(Number(usage(c).find(r=>r.feature==='precis').accepted),3)
const titleUser=await user();php('tests/precis/fixture.php','activate',titleUser.id);const badTitle=await save(titleUser,'TEST ONLY TITLE_ANCHOR');assert.equal((await evaluate(titleUser,body(badTitle.version_id))).data.operation.state,'failed')
const d=await user();php('tests/precis/fixture.php','activate',d.id);const unknown=await save(d,'TEST ONLY UNKNOWN'),unknownReq=body(unknown.version_id),unknownOp=(await evaluate(d,unknownReq)).data.operation
assert.equal(unknownOp.state,'unknown');assert.equal(unknownOp.accounting,'reserved');assert.equal((await evaluate(d,unknownReq)).data.operation.id,unknownOp.id);assert.equal((await evaluate(d,body(unknown.version_id))).status,409);assert.equal(Number(usage(d)[0].provider_calls),1)
const race=await user();php('tests/precis/fixture.php','activate',race.id);const x=await save(race,'TEST ONLY first wording.'),y=await save(race,'TEST ONLY second wording.');const competed=await Promise.all([evaluate(race,body(x.version_id)),evaluate(race,body(y.version_id))]);assert.deepEqual(competed.map(r=>r.status).sort(),[200,409]);assert.equal(Number(usage(race)[0].provider_calls),1)
fixture('config','on','2');const same=await user();php('tests/precis/fixture.php','activate',same.id);const z=await save(same,'TEST ONLY same version competing.');const raced=await Promise.all([evaluate(same,body(z.version_id)),evaluate(same,body(z.version_id))]);assert.deepEqual(raced.map(r=>r.status).sort(),[200,409]);assert.equal(Number(usage(same)[0].accepted),1)
// Accepted work completes across midnight/expiry with its fixed saved rubric and source.
const accepted=await user();php('tests/precis/fixture.php','activate',accepted.id);const earlier=await save(accepted,'TEST ONLY accepted wording.');const reserved=JSON.parse(fixture('reserve',accepted.id,JSON.stringify(body(earlier.version_id)),'2026-10-07T18:59:59Z')).id;assert.ok(reserved);fixture('normalize-json',reserved);php('tests/precis/fixture.php','different-original',accepted.id,earlier.writing_id);php('tests/pro/fixture.php','expire',accepted.id);fixture('execute',reserved);assert.equal(Number(usage(accepted).find(r=>r.bucket_date==='2026-10-07').used),1)
const undispatched=await user();php('tests/precis/fixture.php','activate',undispatched.id);const waiting=await save(undispatched,'TEST ONLY not yet dispatched.');const waitingId=JSON.parse(fixture('reserve',undispatched.id,JSON.stringify(body(waiting.version_id)))).id;assert.ok(waitingId);fixture('config','off');fixture('execute',waitingId);assert.equal(Number(usage(undispatched)[0].provider_calls),0);assert.equal(Number(usage(undispatched)[0].reserved),0)
fixture('config','on','2');const corrupt=await user();php('tests/precis/fixture.php','activate',corrupt.id);const corruptWriting=await save(corrupt,'TEST ONLY intact writing.');const corruptId=JSON.parse(fixture('reserve',corrupt.id,JSON.stringify(body(corruptWriting.version_id)))).id;fixture('corrupt-input',corruptId);fixture('execute',corruptId);assert.equal(Number(usage(corrupt)[0].provider_calls),0,'Invalid snapshot counted a dispatch');assert.equal(Number(usage(corrupt)[0].reserved),0);
// Real persisted skill evidence is attempt/source-specific, and expires without deleting history.
fixture('config','on','12');const profileUser=await user();php('tests/precis/fixture.php','activate',profileUser.id);const records=[]
for(let i=0;i<3;i++){const source=`TEST ONLY original ${i} argues that learning may improve judgement when learners reflect carefully, while completion alone cannot establish understanding or guarantee future success.`;const r=await save(profileUser,`TEST ONLY learning can never improve judgement ${i}.`,undefined,source);records.push(r);assert.equal((await evaluate(profileUser,body(r.version_id))).data.operation.state,'succeeded')}
assert.equal((await get(profileUser,'?attempt_id='+profileUser.attempt)).data.profile.items.find(s=>s.skill==='fidelity').state,'Weak')
for(let i=0;i<3;i++){const r=await save(profileUser,`TEST ONLY learning may improve judgement through reflection ${i}.`,records[i]);assert.equal((await evaluate(profileUser,body(r.version_id))).data.operation.state,'succeeded')}
assert.equal((await get(profileUser,'?attempt_id='+profileUser.attempt)).data.profile.items.find(s=>s.skill==='fidelity').state,'Improving')
const priorUsage=JSON.stringify(usage(profileUser));assert.equal((await get(profileUser,'?attempt_id='+profileUser.attempt)).data.profile.reviewed_sources,3);assert.equal(JSON.stringify(usage(profileUser)),priorUsage)
fixture('age-evidence',profileUser.id);assert.equal((await get(profileUser,'?attempt_id='+profileUser.attempt)).data.profile.reviewed_sources,0);assert.ok((await get(profileUser,'?version_id='+records[0].version_id)).data.feedback)
assert.equal((await get(b,'?attempt_id='+profileUser.attempt)).status,404)
fixture('config','on','2');const bounds=await user();php('tests/precis/fixture.php','activate',bounds.id);const long=await save(bounds,Array(701).fill('word').join(' '));assert.equal((await evaluate(bounds,body(long.version_id))).status,422);const paragraphs=await save(bounds,'TEST ONLY first paragraph.\n\nTEST ONLY second paragraph.');assert.equal((await evaluate(bounds,body(paragraphs.version_id))).status,422)
const longSource=await save(bounds,'TEST ONLY source limit.',undefined,Array(2001).fill('word').join(' '));assert.equal((await evaluate(bounds,body(longSource.version_id))).status,422)
php('tests/pro/fixture.php','incomplete',b.id);assert.equal((await get(b)).status,403)
fixture('config','off')
console.log('PASS: native source/title/rubric/version ownership, profile/CSRF/Pro gates, strict bounds and anchors, immutable snapshots, shared findings, races/two-per-day policy, idempotent status recovery, malformed/unknown/preflight accounting, fixed Karachi date across expiry, source-specific skills and zero-call comparisons/profiles. Synthetic disposable output only; no real provider invocation.')
