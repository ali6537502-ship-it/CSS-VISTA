import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {execFileSync, execFile} from 'node:child_process'
import {promisify} from 'node:util'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const exec=promisify(execFile),env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const args=cmd=>process.env.CSSV_TEST_PHP_CONTAINER?['docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...cmd]]:['php',cmd]
const php=(...cmd)=>{const [bin,a]=args(cmd);return execFileSync(bin,a,{env,encoding:'utf8'}).trim()}
const parallel=async(...cmd)=>{const[bin,a]=args(cmd);return(await exec(bin,a,{env,encoding:'utf8'})).stdout.trim()}
async function call(path,body,jar=new Map(),extra={}){const headers={Accept:'application/json','User-Agent':'CSSVistaExpressionIsolation',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||''}const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const s=c.split(';')[0],i=s.indexOf('=');jar.set(s.slice(0,i),s.slice(i+1))}return{status:r.status,data:await r.json()}}
async function user(){const email=`expression-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);const a=await call('student/learning.php',{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:120,stage:'starting',optional_subject_ids:[]},jar);assert.equal(a.status,200);return{id,jar,attempt:a.data.attempt_id}}
async function save(u,text,kind='paragraph',previous){const body={action:'writing_save',request_id:randomUUID(),expected_version:previous?.version||0,...(previous?{id:previous.writing_id}:{}),attempt_id:u.attempt,kind,title:'TEST ONLY expression record',text};const r=await call('student/learning.php',body,u.jar);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
const body=v=>({action:'evaluate',request_id:randomUUID(),version_id:v,policy_version:'TEST-expression-v1',accepted:true})
const get=(u,path='')=>call('student/expression.php'+path,undefined,u.jar)
const evaluate=(u,b,extra)=>call('student/expression.php',b,u.jar,extra)
const usage=u=>JSON.parse(php('tests/expression/fixture.php','snapshot',u.id))
php('tests/expression/fixture.php','config','off')
assert.equal((await call('student/expression.php')).status,401)
const a=await user(),b=await user(),initial=await save(a,'She go to school.')
assert.equal((await get(a)).data.configuration.enabled,false)
assert.equal((await evaluate(a,body(initial.version_id))).status,503)
php('tests/expression/fixture.php','config','on')
assert.equal((await evaluate(a,body(initial.version_id))).status,409,'Free account admitted premium evaluation')
php('tests/learning/fixture.php','pro',a.id)
assert.equal((await evaluate(a,body(initial.version_id),{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await evaluate(a,body(initial.version_id),{'X-CSSV-User':b.id})).status,409)
assert.equal((await evaluate(b,body(initial.version_id))).status,404)
assert.equal((await evaluate(a,{...body(initial.version_id),text:'Changed payload'})).status,422)
assert.equal((await evaluate(a,{...body(initial.version_id),accepted:false})).status,422)
assert.equal((await evaluate(a,{...body(initial.version_id),policy_version:'obsolete'})).status,409)
assert.equal((await get(b,`?writing_id=${initial.writing_id}`)).status,404)
const req=body(initial.version_id),first=await evaluate(a,req);assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.operation.state,'succeeded')
assert.equal((await evaluate(a,req)).data.operation.id,first.data.operation.id,'Same request repeated paid work')
assert.equal((await evaluate(a,body(initial.version_id))).status,409,'Different request re-evaluated an already completed version')
assert.equal((await evaluate(a,{...req,policy_version:'different'})).status,409,'Reused request silently changed acknowledged policy')
let detail=(await get(a,`?writing_id=${initial.writing_id}`)).data
assert.equal(detail.version.feedback.findings[0].excerpt,'She go to school.');assert.equal(detail.version.feedback.findings[0].lesson_day,5)
assert.equal((await get(a)).data.profile.items[0].state,'Insufficient evidence')
const rewrite=await save(a,'She goes to school.','paragraph',initial)
const mismatch=await save(a,'TEST ONLY other writing.')
assert.equal((await get(a,`?writing_id=${initial.writing_id}&version_id=${mismatch.version_id}`)).status,422)
assert.equal((await evaluate(a,{...req,version_id:rewrite.version_id})).status,409)
let compare=(await get(a,`?before=${initial.version_id}&after=${rewrite.version_id}`)).data.comparison
assert.equal(compare.feedback_available,false);assert.deepEqual(compare.no_longer_reported,[])
assert.equal((await get(b,`?before=${initial.version_id}&after=${rewrite.version_id}`)).status,404)
assert.equal((await get(a,`?before=${rewrite.version_id}&after=${initial.version_id}`)).status,422)
assert.equal((await get(a,`?before=${initial.version_id}&after=${mismatch.version_id}`)).status,422)
assert.equal((await evaluate(a,body(rewrite.version_id))).status,200)
const snapshot=JSON.stringify(usage(a));compare=(await get(a,`?before=${initial.version_id}&after=${rewrite.version_id}`)).data.comparison
assert.equal(compare.feedback_available,true);assert.deepEqual(compare.no_longer_reported,['subject_verb_agreement']);assert.deepEqual(compare.still_reported,[])
assert.equal(JSON.stringify(usage(a)),snapshot,'Comparison spent an allowance')
assert.equal(compare.before.text,'She go to school.');assert.equal(compare.after.text,'She goes to school.')
assert.equal((await evaluate(a,body(mismatch.version_id))).status,409,'Exceeded daily paragraph allowance')
const sentence=await save(a,'She go to school.','sentence');assert.equal((await evaluate(a,body(sentence.version_id))).status,200)
const precis=await save(a,'TEST ONLY précis draft.','precis');assert.equal((await evaluate(a,body(precis.version_id))).status,422)
const overlong=await save(a,Array(81).fill('word').join(' '),'sentence');assert.equal((await evaluate(a,body(overlong.version_id))).status,422)
const multiple=await save(a,'First paragraph.\n\nSecond paragraph.');assert.equal((await evaluate(a,body(multiple.version_id))).status,422)
php('tests/pro/fixture.php','expire',a.id)
assert.equal((await evaluate(a,req)).data.operation.id,first.data.operation.id,'Expiry lost the accepted request result')
assert.equal((await get(a,`?writing_id=${initial.writing_id}&version_id=${initial.version_id}`)).data.version.feedback.findings.length,1)
assert.equal((await save(a,'TEST ONLY freely saved after expiry.','paragraph',rewrite)).version,3)
const newSentence=await save(a,'TEST ONLY new sentence.','sentence');assert.equal((await evaluate(a,body(newSentence.version_id))).status,409)
// Known failure retries are bounded separately from successful-use allowance.
const c=await user();php('tests/learning/fixture.php','pro',c.id);php('tests/expression/fixture.php','config','on','1')
const malformed=await save(c,'TEST ONLY MALFORMED');for(let n=0;n<3;n++){const r=await evaluate(c,body(malformed.version_id));assert.equal(r.data.operation.state,'failed');assert.equal(r.data.operation.accounting,'released')}
assert.equal((await evaluate(c,body(malformed.version_id))).status,409)
assert.equal(Number(usage(c).find(r=>r.feature==='paragraph').accepted),3)
const d=await user();php('tests/learning/fixture.php','pro',d.id)
const unknown=await save(d,'TEST ONLY UNKNOWN');const unknownReq=body(unknown.version_id),unknownOp=(await evaluate(d,unknownReq)).data.operation
assert.equal(unknownOp.state,'unknown');assert.equal(unknownOp.accounting,'reserved')
assert.equal((await evaluate(d,unknownReq)).data.operation.id,unknownOp.id)
assert.equal((await evaluate(d,body(unknown.version_id))).status,409,'Unknown result re-dispatched through another request identity')
assert.equal(Number(usage(d).find(r=>r.feature==='paragraph').provider_calls),1)
// Two different saved versions race for the final allowance, and two identities race on one version.
const race=await user();php('tests/learning/fixture.php','pro',race.id)
const x=await save(race,'TEST ONLY independent first wording.'),y=await save(race,'TEST ONLY independent second wording.')
const competed=await Promise.all([evaluate(race,body(x.version_id)),evaluate(race,body(y.version_id))]);assert.deepEqual(competed.map(r=>r.status).sort(),[200,409]);assert.equal(Number(usage(race)[0].provider_calls),1)
php('tests/expression/fixture.php','config','on','2')
const same=await user();php('tests/learning/fixture.php','pro',same.id);const z=await save(same,'TEST ONLY single version competing identities.')
const competedSame=await Promise.all([evaluate(same,body(z.version_id)),evaluate(same,body(z.version_id))]);assert.deepEqual(competedSame.map(r=>r.status).sort(),[200,409]);assert.equal(Number(usage(same)[0].accepted),1)
// Already accepted work uses its original Karachi date and can finish after expiry.
const accepted=await user();php('tests/learning/fixture.php','pro',accepted.id);const earlier=await save(accepted,'TEST ONLY accepted work across midnight.')
const original=JSON.parse(php('tests/expression/fixture.php','reserve',accepted.id,JSON.stringify(body(earlier.version_id)),'2026-10-07T18:59:59Z')).id;assert.ok(original)
php('tests/pro/fixture.php','expire',accepted.id);php('tests/expression/fixture.php','execute',original)
assert.equal(Number(usage(accepted).find(r=>r.bucket_date==='2026-10-07').used),1)
// Recurring evidence and improvement derive from actual saved results, not visit-time AI calls.
php('tests/expression/fixture.php','config','on','10')
const profileUser=await user();php('tests/learning/fixture.php','pro',profileUser.id)
const records=[]
for(const label of ['first','second','third']){const r=await save(profileUser,`TEST ONLY ${label}: She go to school.`);records.push(r);assert.equal((await evaluate(profileUser,body(r.version_id))).status,200)}
assert.equal((await get(profileUser)).data.profile.items[0].state,'Weak')
for(let i=0;i<records.length;i++){const r=await save(profileUser,`TEST ONLY corrected ${i}: She goes to school.`,'paragraph',records[i]);assert.equal((await evaluate(profileUser,body(r.version_id))).status,200)}
const profileSnapshot=JSON.stringify(usage(profileUser));assert.equal((await get(profileUser)).data.profile.items[0].state,'Improving');assert.equal(JSON.stringify(usage(profileUser)),profileSnapshot)
php('tests/expression/fixture.php','age-evidence',profileUser.id);assert.equal((await get(profileUser)).data.profile.items.length,0)
assert.ok((await get(profileUser,`?writing_id=${records[0].writing_id}`)).data.version.feedback,'Evidence aging deleted saved learning')
// Disabled execution releases an unstarted reservation without a provider dispatch.
const undispatched=await user();php('tests/learning/fixture.php','pro',undispatched.id);const waiting=await save(undispatched,'TEST ONLY not dispatched.')
const reserved=JSON.parse(php('tests/expression/fixture.php','reserve',undispatched.id,JSON.stringify(body(waiting.version_id)))).id;assert.ok(reserved)
php('tests/expression/fixture.php','config','off');php('tests/expression/fixture.php','execute',reserved)
assert.equal(Number(usage(undispatched)[0].provider_calls),0);assert.equal(Number(usage(undispatched)[0].reserved),0)
// A previously confirmed handwriting record cannot bypass its separate confirmation workflow.
php('tests/expression/fixture.php','bind-handwriting',a.id,initial.writing_id,initial.version_id)
assert.equal((await get(a,`?writing_id=${initial.writing_id}`)).status,409)
assert.equal((await evaluate(a,req)).status,409)
php('tests/pro/fixture.php','incomplete',b.id);assert.equal((await get(b)).status,403)
assert.equal((await get(a,'?offset=-1')).status,422)
console.log('PASS: native authentication/profile/CSRF/ownership, closed/free/expired gates, immutable version and policy identities, completed/pending deduplication, separate sentence/paragraph quotas and races, bounded failures, unknown/no-retry, original-date completion, disabled preflight, handwriting separation, private history and zero-call comparison. Labelled disposable transport only; no external provider calls.')
