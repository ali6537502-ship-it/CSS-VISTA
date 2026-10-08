import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {execFileSync,execFile} from 'node:child_process'
import {promisify} from 'node:util'
if(process.env.CI!=='true' || process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const exec=promisify(execFile)
function args(values){const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];return process.env.CSSV_TEST_PHP_CONTAINER?['docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...values],env]:['php',values,env]}
function php(...values){const[f,v,env]=args(values);return execFileSync(f,v,{env,encoding:'utf8'}).trim()}
async function parallel(...values){const[f,v,env]=args(values);return(await exec(f,v,{env,encoding:'utf8'})).stdout.trim()}
async function call(path,body,jar=new Map(),extra={}){
 const headers={'User-Agent':'CSSVistaHandwritingIsolation',Accept:'application/json',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['X-CSRF-Token']??=jar.get('cssv_csrf')||'';if(!(body instanceof FormData))headers['Content-Type']='application/json'}
 const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:body instanceof FormData?body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const v=c.split(';')[0],i=v.indexOf('=');jar.set(v.slice(0,i),v.slice(i+1))}
 return{status:r.status,data:(r.headers.get('Content-Type')||'').includes('application/json')?await r.json():new Uint8Array(await r.arrayBuffer()),headers:r.headers}
}
async function user(label){const email=`handwriting-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return{id,jar}}
php('tests/handwriting/fixture.php','images');php('tests/handwriting/fixture.php','config','off')
const a=await user('a'),b=await user('b'),free=await user('free'),incomplete=await user('incomplete');php('tests/pro/fixture.php','incomplete',incomplete.id)
for(const path of ['student/handwriting.php','student/handwriting-image.php?page_id='+randomUUID()])assert.equal((await call(path)).status,401)
assert.equal((await call('student/handwriting.php',undefined,incomplete.jar)).status,403)
const settings={action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:120,stage:'starting',optional_subject_ids:[]}
const attempt=(await call('student/learning.php',settings,a.jar)).data.attempt_id
const freeAttempt=(await call('student/learning.php',{...settings,request_id:randomUUID()},free.jar)).data.attempt_id
const jpg=await readFile('test-artifacts/handwriting-trailing.jpg')
const form=(request=randomUUID(),title='TEST ONLY normal',data=jpg,type='image/jpeg',target=attempt)=>{const f=new FormData();f.set('request_id',request);f.set('title',title);f.set('attempt_id',target);f.set('policy_version','TEST-only-v1');f.set('image',new Blob([data],{type}),'unsafe.php');return f}
const upload=async(title='TEST ONLY normal',data=jpg,type='image/jpeg')=>{const r=await call('student/handwriting.php',form(randomUUID(),title,data,type),a.jar);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.page_id}
php('tests/learning/fixture.php','pro',a.id)
assert.equal((await call('student/handwriting.php',form(),a.jar)).status,503,'Disabled feature accepted upload')
php('tests/handwriting/fixture.php','config','on')
assert.equal((await call('student/handwriting.php',form(randomUUID(),'TEST ONLY free',jpg,'image/jpeg',freeAttempt),free.jar)).status,409)
assert.equal((await call('student/handwriting.php',form(),a.jar,{'X-CSRF-Token':'bad'})).status,403)
assert.equal((await call('student/handwriting.php',form(),a.jar,{'X-CSSV-User':b.id})).status,409)
assert.equal((await call('student/handwriting.php',form(),b.jar)).status,409)
for(const [data,type] of [[Buffer.from('<svg>TEST ONLY</svg>'),'image/svg+xml'],[await readFile('test-artifacts/handwriting-test.gif'),'image/jpeg'],[Buffer.concat([jpg,Buffer.alloc(5242880)]),'image/jpeg'],[Buffer.from('not an image'),'image/jpeg'],[(await readFile('test-artifacts/handwriting-test.png')).subarray(0,45),'image/png']])assert.equal((await call('student/handwriting.php',form(randomUUID(),'TEST invalid',data,type),a.jar)).status,422)
for(const format of ['png','webp']){const valid=await upload('TEST ONLY valid '+format,await readFile('test-artifacts/handwriting-test.'+format),'image/'+format);php('tests/handwriting/fixture.php','expire-image',valid);php('tests/handwriting/fixture.php','cleanup')}
const rotated=await upload('TEST ONLY rotated',await readFile('test-artifacts/handwriting-oriented.jpg'));const rotatedImage=await call('student/handwriting-image.php?page_id='+rotated,undefined,a.jar);assert.equal(rotatedImage.status,200);php('tests/handwriting/fixture.php','expire-image',rotated);php('tests/handwriting/fixture.php','cleanup')
const request=randomUUID(),first=await call('student/handwriting.php',form(request),a.jar);assert.equal(first.status,200,JSON.stringify(first.data));const page=first.data.page_id
assert.equal((await call('student/handwriting.php',form(request),a.jar)).data.page_id,page)
assert.equal((await call('student/handwriting.php',form(request,'Changed intent'),a.jar)).status,409)
assert.equal((await call('student/handwriting.php?page_id='+page,undefined,b.jar)).status,404)
assert.equal((await call('student/handwriting-image.php?page_id='+page,undefined,b.jar)).status,404)
const image=await call('student/handwriting-image.php?page_id='+page,undefined,a.jar);assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/jpeg');assert.equal(Buffer.from(image.data).includes(Buffer.from('unsafe trailing payload')),false,'Upload was not normalized');assert.match(image.headers.get('Cache-Control'),/no-store/)
let state=(await call('student/handwriting.php?page_id='+page,undefined,a.jar)).data.page
assert.equal(state.state,'uploaded');assert.equal(JSON.stringify(state).includes('image_path'),false)
const action=(kind,id=page,v=0,extra={})=>({action:kind,request_id:randomUUID(),page_id:id,expected_version:v,...extra})
assert.equal((await call('student/handwriting.php',action('evaluate'),a.jar)).status,404,'Direct evaluation bypassed transcription')
const extraction=action('extract'),extracted=await call('student/handwriting.php',extraction,a.jar);assert.equal(extracted.status,200,JSON.stringify(extracted.data));assert.equal(extracted.data.operation.state,'succeeded')
assert.equal((await call('student/handwriting.php',extraction,a.jar)).data.operation_id,extracted.data.operation_id)
state=(await call('student/handwriting.php?page_id='+page,undefined,a.jar)).data.page;assert.equal(state.state,'awaiting_confirmation');assert.equal(state.transcription.version,1)
assert.equal((await call('student/handwriting.php',action('evaluate',page,1),a.jar)).status,409,'Evaluation accepted unconfirmed OCR')
assert.equal((await call('student/handwriting.php',action('confirm',page,1,{confirmed:false}),a.jar)).status,422)
assert.equal((await call('student/handwriting.php',action('confirm',page,1,{confirmed:true,text:'Substituted text'}),a.jar)).status,422)
const correction=action('edit',page,1,{text:'TEST ONLY: She goes to school.'}),edits=await Promise.all([call('student/handwriting.php',correction,a.jar),call('student/handwriting.php',{...correction,request_id:randomUUID(),text:'TEST ONLY: Another correction.'},a.jar)])
assert.deepEqual(edits.map(r=>r.status).sort(),[200,409])
state=(await call('student/handwriting.php?page_id='+page,undefined,a.jar)).data.page;assert.equal(state.transcription.version,2)
assert.equal((await call('student/handwriting.php',action('confirm',page,1,{confirmed:true}),a.jar)).status,409)
const confirm=action('confirm',page,2,{confirmed:true}),confirmed=await call('student/handwriting.php',confirm,a.jar);assert.equal(confirmed.status,200,JSON.stringify(confirmed.data));const confirmedVersion=confirmed.data.version_id
assert.equal((await call('student/handwriting.php',confirm,a.jar)).data.version_id,confirmedVersion)
assert.equal((await call('student/handwriting-image.php?page_id='+page,undefined,a.jar)).status,404)
assert.deepEqual(JSON.parse(php('tests/handwriting/fixture.php','disk',page)),{deleted:true,path_retained:false,exists:false})
assert.equal((await call('student/handwriting.php',action('evaluate',page,2,{text:'Substituted evaluation'}),a.jar)).status,422)
const evaluation=action('evaluate',page,2),evaluated=await call('student/handwriting.php',evaluation,a.jar);assert.equal(evaluated.status,200,JSON.stringify(evaluated.data));assert.equal(evaluated.data.operation.state,'succeeded');assert.equal(evaluated.data.operation.version_id,confirmedVersion)
assert.equal((await call('student/handwriting.php',evaluation,a.jar)).data.operation_id,evaluated.data.operation_id)
state=(await call('student/handwriting.php?page_id='+page,undefined,a.jar)).data.page;assert.equal(state.state,'completed')
const previousText=(await call('student/learning.php?version_id='+confirmedVersion,undefined,a.jar)).data.writing_version.text
assert.equal((await call('student/handwriting.php',action('edit',page,2,{text:'TEST ONLY: Saved rewrite.'}),a.jar)).status,200)
state=(await call('student/handwriting.php?page_id='+page,undefined,a.jar)).data.page;assert.equal(state.confirmed_version,null)
assert.equal((await call('student/handwriting.php',action('evaluate',page,3),a.jar)).status,409,'Edited text retained old confirmation')
assert.equal((await call('student/learning.php?version_id='+confirmedVersion,undefined,a.jar)).data.writing_version.text,previousText)
// Known unreadable and malformed outputs release success reservations while retaining dispatch usage.
const unreadable=await upload('TEST ONLY UNREADABLE');const unread=await call('student/handwriting.php',action('extract',unreadable),a.jar);assert.equal(unread.data.operation.accounting,'released')
assert.equal((await call('student/handwriting.php?page_id='+unreadable,undefined,a.jar)).data.page.state,'unreadable');assert.equal(JSON.parse(php('tests/handwriting/fixture.php','disk',unreadable)).deleted,true)
const malformed=await upload('TEST ONLY MALFORMED');const invalid=await call('student/handwriting.php',action('extract',malformed),a.jar);assert.equal(invalid.data.operation.state,'failed');assert.equal(invalid.data.operation.accounting,'released')
php('tests/handwriting/fixture.php','expire-image',malformed);php('tests/handwriting/fixture.php','cleanup')
assert.equal((await call('student/handwriting-image.php?page_id='+malformed,undefined,a.jar)).status,404)
// Unknown outcomes do not start a second provider call or free a reservation.
const unknownPage=await upload('TEST ONLY UNKNOWN'),unknownBody=action('extract',unknownPage),unknown=await call('student/handwriting.php',unknownBody,a.jar);assert.equal(unknown.data.operation.state,'unknown');assert.equal(unknown.data.operation.accounting,'reserved')
assert.equal((await call('student/handwriting.php',unknownBody,a.jar)).data.operation_id,unknown.data.operation_id)
assert.equal((await call('student/handwriting.php',action('extract',unknownPage),a.jar)).status,409)
// Owned status and confirmation survive expiry; new cost-bearing work does not.
php('tests/pro/fixture.php','expire',a.id)
assert.equal((await call('student/handwriting.php',action('confirm',page,3,{confirmed:true}),a.jar)).status,200)
assert.equal((await call('student/handwriting.php',action('evaluate',page,3),a.jar)).status,409)
assert.equal((await call('student/handwriting.php?page_id='+page,undefined,a.jar)).status,200)
assert.equal((await call('student/handwriting.php',evaluation,a.jar)).data.operation_id,evaluated.data.operation_id)
php('tests/learning/fixture.php','pro',a.id)
// Accepted operation completes after expiry and on its original Karachi bucket.
const pendingBody=action('evaluate',page,3),clock='2026-10-07T18:59:59Z'
const reserved=JSON.parse(php('tests/handwriting/fixture.php','reserve',a.id,JSON.stringify(pendingBody),clock));assert.ok(reserved.id,JSON.stringify(reserved))
php('tests/pro/fixture.php','expire',a.id);php('tests/handwriting/fixture.php','execute',reserved.id)
assert.equal((await call('student/ai-usage.php?operation_id='+reserved.id,undefined,a.jar)).data.operation.state,'succeeded')
const original=JSON.parse(php('tests/handwriting/fixture.php','usage',a.id)).find(r=>r.feature==='handwriting' && r.bucket_date==='2026-10-07');assert.ok(Number(original.used)>=1)
php('tests/learning/fixture.php','pro',a.id)
// Independent requests racing on the same page produce one accepted operation.
const racePage=await upload('TEST ONLY race'),raceBody=action('extract',racePage)
const race=await Promise.all([parallel('tests/handwriting/fixture.php','reserve',a.id,JSON.stringify(raceBody),'2026-10-08T19:00:00Z'),parallel('tests/handwriting/fixture.php','reserve',a.id,JSON.stringify({...raceBody,request_id:randomUUID()}),'2026-10-08T19:00:00Z')])
assert.equal(race.map(JSON.parse).filter(r=>r.id).length,1);assert.equal(race.map(JSON.parse).filter(r=>r.error==='DomainException').length,1)
// Failed deletion must never make the old raw image available after later edits.
const raceOp=race.map(JSON.parse).find(r=>r.id).id
// Complete the already accepted read with the labelled fixture before confirmation.
php('tests/handwriting/fixture.php','execute',raceOp)
php('tests/handwriting/fixture.php','force-delete-failure',racePage)
assert.equal((await call('student/handwriting.php',action('confirm',racePage,1,{confirmed:true}),a.jar)).status,200)
assert.equal((await call('student/handwriting.php?page_id='+racePage,undefined,a.jar)).data.page.image_cleanup_pending,true)
assert.equal((await call('student/handwriting.php',action('edit',racePage,1,{text:'TEST ONLY corrected after confirmation.'}),a.jar)).status,200)
assert.equal((await call('student/handwriting.php?page_id='+racePage,undefined,a.jar)).data.page.image_available,false,'Correction resurrected a raw image awaiting deletion')
assert.equal((await call('student/handwriting-image.php?page_id='+racePage,undefined,a.jar)).status,404)
php('tests/handwriting/fixture.php','restore-image',racePage);php('tests/handwriting/fixture.php','cleanup')
// Extraction has a hard accepted-attempt cap, even if every provider result fails.
const c=await user('quota');php('tests/learning/fixture.php','pro',c.id)
const ca=(await call('student/learning.php',{...settings,request_id:randomUUID()},c.jar)).data.attempt_id
const cpages=[];for(let n=0;n<3;n++){const r=await call('student/handwriting.php',form(randomUUID(),'TEST ONLY REJECTED quota '+n,jpg,'image/jpeg',ca),c.jar);assert.equal(r.status,200);cpages.push(r.data.page_id)}
for(let n=0;n<5;n++){const r=JSON.parse(php('tests/handwriting/fixture.php','reserve',c.id,JSON.stringify(action('extract',cpages[0])),'2026-10-09T19:00:00Z'));assert.ok(r.id,JSON.stringify(r));php('tests/handwriting/fixture.php','execute',r.id)}
const last=await Promise.all(cpages.slice(1).map(p=>parallel('tests/handwriting/fixture.php','reserve',c.id,JSON.stringify(action('extract',p)),'2026-10-09T19:00:00Z')))
assert.equal(last.map(JSON.parse).filter(r=>r.id).length,1,'Distinct pages overspent the final extraction attempt')
assert.equal(last.map(JSON.parse).filter(r=>r.error==='DomainException').length,1)
const cbucket=JSON.parse(php('tests/handwriting/fixture.php','usage',c.id)).find(r=>r.bucket_date==='2026-10-10' && r.feature==='handwriting_extract')
assert.equal(Number(cbucket.accepted),6);assert.equal(Number(cbucket.used),0);assert.equal(Number(cbucket.provider_calls),5)
php('tests/handwriting/fixture.php','orphan',a.id);assert.ok(JSON.parse(php('tests/handwriting/fixture.php','cleanup')).orphan_images_purged>=1)
php('tests/handwriting/fixture.php','config','off')
console.log('PASS: native eligibility/Pro/CSRF/ownership, closed upload, unsafe formats/size rejection, JPEG normalization/private serving, upload idempotency, immutable corrections and explicit exact-version confirmation, feedback binding, duplicate operations, unreadable/malformed/unknown outcomes, image cleanup/orphans, expiry and original Karachi bucket, concurrent dispatch protection. Labelled test transport only; no provider network calls.')
