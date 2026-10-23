import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
async function call(path,jar=new Map(),body,extra={}){
 const headers={Accept:'application/json',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=jar.get('cssv_csrf')||jar.get('cssv_owner_csrf')||''}
 const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const v of r.headers.getSetCookie()){const [pair]=v.split(';'),i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}return {status:r.status,data:await r.json(),headers:r.headers}
}
async function user(){const email=`workspace-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',jar,{email,password:'TEST ONLY native fixture password'})).status,200);return {id,jar}}
const endpoint='student/workspace.php',a=await user(),b=await user();
const seeded=JSON.parse(php('tests/workspace/fixture.php','seed',a.id));
const before=php('tests/workspace/fixture.php','digest',a.id)
assert.equal((await call(endpoint)).status,401)
const incomplete=await user();php('tests/pro/fixture.php','incomplete',incomplete.id);assert.equal((await call(endpoint,incomplete.jar)).status,403)
assert.equal((await call(endpoint,a.jar,undefined,{'X-CSSV-User':b.id})).status,409)
assert.equal((await call(endpoint,a.jar,{action:'complete'})).status,405)
assert.equal((await call(endpoint+'?q='+encodeURIComponent('x'.repeat(121)),a.jar)).status,422)
assert.equal((await call(endpoint+'?type=not-real',a.jar)).status,422)
let hits=0
for(let i=0;i<30;i++){
 const q=`Synthetic research ${String(i).padStart(2,'0')}`,r=await call(endpoint+'?view=search&q='+encodeURIComponent(q),a.jar)
 assert.equal(r.status,200,JSON.stringify(r.data));assert.match(r.headers.get('cache-control'),/no-store/)
 if(r.data.items.slice(0,5).some(row=>row.id===seeded.writing[i]))hits++
 assert.equal((await call(endpoint+'?q='+encodeURIComponent(q),b.jar)).data.items.length,0)
}
assert.ok(hits/30>=0.9,`Top five relevance ${hits}/30`)
const first=(await call(endpoint+'?type=writing',a.jar)).data,second=(await call(endpoint+'?type=writing&offset=20',a.jar)).data
assert.equal(first.items.length,20);assert.equal(first.has_more,true);assert.equal(second.items.length,15);assert.equal(second.has_more,false)
assert.equal(new Set([...first.items,...second.items].map(row=>row.id)).size,35)
assert.deepEqual((await call(endpoint+'?type=writing',a.jar)).data.items,first.items)
assert.equal(php('tests/workspace/fixture.php','digest',a.id),before,'Read projection changed writing bytes, hashes or ownership')
php('tests/precis/fixture.php','activate',a.id)
assert.ok((await call(endpoint+'?view=catalog',a.jar)).data.catalog.some(row=>row.id==='ability'))
php('tests/workspace/fixture.php','pause','1')
try{
 const r=await call(endpoint+'?view=catalog',a.jar);assert.equal(r.data.paused,true);assert.deepEqual(r.data.catalog.map(row=>row.id),['grammar-v5']);assert.ok(r.data.items.every(row=>!['topics','skills','ability','mentor','handwriting'].includes(row.domain)))
 const admin=JSON.parse(readFileSync('test-artifacts/admin-session.json','utf8')),jar=new Map([['cssv_owner_session',admin.token],['cssv_owner_csrf',admin.csrf]])
 assert.equal((await call('admin/topics.php',jar,{action:'publish',request_id:randomUUID(),expected_revision:0})).status,503,'Publication bypassed hold')
}finally{php('tests/workspace/fixture.php','pause','0')}
php('tests/topics/fixture.php','reset-rate')
const admin=JSON.parse(readFileSync('test-artifacts/admin-session.json','utf8')),owner=new Map([['cssv_owner_session',admin.token],['cssv_owner_csrf',admin.csrf]])
const count=Number(php('tests/workspace/fixture.php','publication-count'))
await call('admin/topics.php',owner,{action:'not-valid'})
assert.equal(Number(php('tests/workspace/fixture.php','publication-count')),count+1,'Admin event lost through student FK')
php('tests/workspace/fixture.php','publication-limit')
assert.equal((await call('admin/topics.php',owner,{action:'not-valid'})).status,429,'Publication counter did not enforce threshold')
php('tests/topics/fixture.php','reset-rate')
console.log(`PASS: ${hits}/30 synthetic exact-title intents top-five; two-account isolation, pagination, read preservation, pause, method/profile guards and admin counter/429. This is not real-intent academic relevance validation.`)
