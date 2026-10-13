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
 const headers={'User-Agent':'CSSVistaHandwritingPrivacy',Accept:'application/json',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['X-CSRF-Token']??=jar.get('cssv_csrf')||'';if(!(body instanceof FormData))headers['Content-Type']='application/json'}
 const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:body instanceof FormData?body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const v=c.split(';')[0],i=v.indexOf('=');jar.set(v.slice(0,i),v.slice(i+1))}
 return{status:r.status,data:(r.headers.get('Content-Type')||'').includes('application/json')?await r.json():new Uint8Array(await r.arrayBuffer()),headers:r.headers}
}
async function user(label){const email=`handwriting-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return{id,jar}}
php('tests/handwriting/fixture.php','images');php('tests/handwriting/fixture.php','config','on')
const owner=await user('privacy-owner'),other=await user('privacy-other');php('tests/precis/fixture.php','activate',owner.id)
const attempt=await call('student/learning.php',{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:60,stage:'starting',optional_subject_ids:[]},owner.jar);assert.equal(attempt.status,200)
async function upload(title){const form=new FormData();form.set('request_id',randomUUID());form.set('attempt_id',attempt.data.attempt_id);form.set('title',title);form.set('policy_version','TEST-only-v1');form.set('image',new Blob([await readFile(new URL('../../test-artifacts/handwriting-test.jpg',import.meta.url))],{type:'image/jpeg'}),'TEST-only.jpg');const r=await call('student/handwriting.php',form,owner.jar);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.page_id}
async function detail(id){const r=await call('student/handwriting.php?page_id='+id,undefined,owner.jar);assert.equal(r.status,200);return r.data.page}
async function remove(id,expected=0,request=randomUUID(),jar=owner.jar){return call('student/handwriting.php',{action:'discard_image',page_id:id,expected_version:expected,request_id:request},jar)}
try{
 const id=await upload('TEST ONLY privacy uploaded'),image='student/handwriting-image.php?page_id='+id
 assert.equal((await call(image,undefined,owner.jar)).status,200)
 assert.equal((await remove(id,0,randomUUID(),new Map())).status,401)
 assert.equal((await remove(id,0,randomUUID(),other.jar)).status,404)
 assert.equal((await call('student/handwriting.php',{action:'discard_image',page_id:id,expected_version:0,request_id:randomUUID()},owner.jar,{'X-CSRF-Token':'invalid'})).status,403)
 assert.equal((await remove(id,99)).status,409);assert.equal((await detail(id)).image_available,true)
 const request=randomUUID(),first=await remove(id,0,request);assert.equal(first.status,200);assert.equal(first.data.image_retired,true);assert.equal(first.data.image_deleted,true)
 assert.equal((await remove(id,0,request)).status,200);assert.equal((await call(image,undefined,owner.jar)).status,404)
 assert.deepEqual(JSON.parse(php('tests/handwriting/fixture.php','disk',id)),{deleted:true,path_retained:false,exists:false})
 const transId=await upload('TEST ONLY privacy keep transcription');const extract=await call('student/handwriting.php',{action:'extract',page_id:transId,expected_version:0,request_id:randomUUID()},owner.jar);assert.equal(extract.status,200)
 const before=await detail(transId),usage=php('tests/handwriting/fixture.php','usage',owner.id)
 php('tests/handwriting/fixture.php','force-delete-failure',transId)
 const failed=await remove(transId,before.transcription.version);assert.equal(failed.status,200);assert.equal(failed.data.image_deleted,false)
 const retired=await detail(transId);assert.equal(retired.image_cleanup_pending,true);assert.equal(retired.image_available,false);assert.deepEqual(retired.transcription,before.transcription);assert.deepEqual(retired.operation,before.operation)
 assert.equal((await call('student/handwriting-image.php?page_id='+transId,undefined,owner.jar)).status,404)
 php('tests/handwriting/fixture.php','restore-image',transId);php('tests/handwriting/fixture.php','cleanup')
 assert.equal((await detail(transId)).image_cleanup_pending,false);assert.deepEqual((await detail(transId)).transcription,before.transcription)
 assert.equal(php('tests/handwriting/fixture.php','usage',owner.id),usage,'Image removal consumed AI')
 const confirmation=await call('student/handwriting.php',{action:'confirm',page_id:transId,expected_version:before.transcription.version,confirmed:true,request_id:randomUUID()},owner.jar);assert.equal(confirmation.status,200)
 const saved=await detail(transId);assert.ok(saved.confirmed_text_version_id);assert.deepEqual(saved.transcription,before.transcription)
 const unknownId=await upload('TEST ONLY UNKNOWN privacy pending');assert.equal((await call('student/handwriting.php',{action:'extract',page_id:unknownId,expected_version:0,request_id:randomUUID()},owner.jar)).status,200)
 const unresolved=await detail(unknownId),reserved=php('tests/handwriting/fixture.php','usage',owner.id);assert.equal(unresolved.operation.state,'unknown')
 php('tests/pro/fixture.php','expire',owner.id);assert.equal((await remove(unknownId)).status,200)
 assert.deepEqual((await detail(unknownId)).operation,unresolved.operation);assert.equal(php('tests/handwriting/fixture.php','usage',owner.id),reserved)
 assert.equal((await detail(transId)).confirmed_text_version_id,saved.confirmed_text_version_id)
 console.log('PASS handwriting image removal: CSRF/ownership/version checks, exact replay, immediate private-image retirement, safe failed deletion/cleanup retry, unchanged transcription/confirmed text, unresolved operation/expiry and zero additional AI usage. Test-only images and transport.')
}finally{php('tests/handwriting/fixture.php','config','off')}
