import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {randomUUID} from 'node:crypto'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
async function call(path,jar=new Map(),body,extra={}){const headers={Accept:'application/json',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=jar.get('cssv_csrf')||''}const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const v of r.headers.getSetCookie()){const[pair]=v.split(';'),i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}return {status:r.status,headers:r.headers,data:await r.json()}}
async function user(){const email=`daily-native-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',jar,{email,password:'TEST ONLY native fixture password'})).status,200);return {id,jar}}
const a=await user(),b=await user(),incomplete=await user();php('tests/pro/fixture.php','incomplete',incomplete.id)
const endpoint='student/daily-study.php',get=(suffix='')=>call(endpoint+suffix,a.jar),seed=JSON.parse(php('tests/daily-study/fixture.php','seed',a.id)),before=php('tests/daily-study/fixture.php','digest',a.id)
assert.equal((await call(endpoint)).status,401);assert.equal((await call(endpoint,incomplete.jar)).status,403);assert.equal((await call(endpoint,a.jar,undefined,{'X-CSSV-User':b.id})).status,409)
assert.equal((await call(endpoint,a.jar,{})).status,405);for(const q of ['?course=../../admin','?course[]=x','?offset=-1','?offset=10001'])assert.equal((await get(q)).status,422)
const first=await get();assert.equal(first.status,200);assert.match(first.headers.get('cache-control'),/no-store/);assert.equal(first.data.catalog.length,20);assert.equal(first.data.has_more,true)
const all=[];for(let offset=0;offset<10000;offset+=20){const r=await get('?offset='+offset);all.push(...r.data.catalog);if(!r.data.has_more)break}assert.equal(new Set(all.map(x=>x.id)).size,all.length)
for(const id of seed.ids)assert.ok(all.some(x=>x.id===id));for(const id of seed.drafts)assert.ok(!all.some(x=>x.id===id));assert.ok(!all.some(x=>x.id==='ability'))
const exact=(await get('?course='+seed.ids[24])).data.catalog;assert.equal(exact.length,1);assert.equal(exact[0].id,seed.ids[24]);assert.match(exact[0].canonicalDestination,/^\/account\/preparation\?view=topics&topic=/)
const forbidden=['content','questions','answer','sources','created_by','content_hash'];for(const row of all)for(const key of forbidden)assert.ok(!(key in row))
php('tests/daily-study/fixture.php','withdraw',a.id,seed.ids[24]);assert.equal((await get('?course='+seed.ids[24])).data.catalog.length,0);assert.equal((await get('?course=ability')).data.catalog.length,0)
assert.equal(php('tests/daily-study/fixture.php','digest',a.id),before)
console.log('PASS: free daily catalog, authentication/profile/account checks, read-only method, bounded paging/exact published edition, withdrawal/draft exclusion, retired Ability exclusion, metadata-only response and retained writing hashes.')
