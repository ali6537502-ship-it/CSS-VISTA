import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {randomUUID} from 'node:crypto'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable runtime required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const email=`catalog-${randomUUID()}@example.invalid`,user=php('tests/current-affairs/setup.php','user',email),jar=new Map()
async function call(path,body){const headers={Accept:'application/json',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'X-CSSV-User':user};if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=jar.get('cssv_csrf')||''}const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const v of r.headers.getSetCookie()){const[pair]=v.split(';'),i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}return {status:r.status,data:await r.json()}}
assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'})).status,200)
const seeded=JSON.parse(php('tests/workspace/catalog-fixture.php','seed',user))
const get=(suffix='')=>call('student/workspace.php?view=catalog'+suffix),query='&q='+encodeURIComponent(seeded.needle)
assert.equal((await get('&subject=unknown')).status,422);assert.equal((await get('&state=saved')).status,422)
const free=await get(query);assert.equal(free.status,200);assert.equal(free.data.catalog.length,0);assert.ok(free.data.catalog_subjects.every(v=>v.count===0))
php('tests/precis/fixture.php','activate',user)
const before=php('tests/workspace/fixture.php','digest',user)
const first=(await get(query)).data,second=(await get(query+'&offset=20')).data
assert.equal(first.catalog.length,20);assert.equal(first.has_more,true);assert.equal(second.catalog.length,5);assert.equal(second.has_more,false)
assert.deepEqual([...first.catalog,...second.catalog].map(r=>r.id),seeded.ids);assert.deepEqual(first.items,[])
for(const row of first.catalog){assert.ok(row.subjectIds.every(v=>['pakistan-affairs','current-affairs'].includes(v)));assert.match(row.canonicalDestination,/^\/account\/preparation\?view=topics&topic=test-only-catalog-/);assert.equal(row.editionId,seeded.versions[seeded.ids.indexOf(row.id)])}
const encoded=JSON.stringify(first);for(const secret of ['questions','blocks','owner-source','content_hash','answer','created_by'])assert.ok(!encoded.includes(secret),secret+' leaked')
const filtered=(await get(query+'&subject=pakistan-affairs')).data;assert.equal(filtered.catalog.length,13);assert.equal(filtered.catalog_subjects.find(v=>v.id==='current-affairs').count,13);assert.ok(filtered.catalog.every(v=>v.subjectIds.includes('pakistan-affairs')))
assert.equal((await get('&q=%25_')).data.catalog.length,0,'Wildcards must be literal text')
const all=[];for(let offset=0;offset<=10000;offset+=20){const page=(await get('&offset='+offset)).data;all.push(...page.catalog);if(!page.has_more)break}assert.equal(new Set(all.map(v=>v.id)).size,all.length,'Fixed courses repeated across pages');assert.equal(all.filter(v=>v.id==='grammar-v5').length,1)
php('tests/workspace/catalog-fixture.php','withdraw',user,seeded.ids[0]);assert.equal((await get(query+'&subject=pakistan-affairs')).data.catalog.length,12)
php('tests/workspace/fixture.php','pause','1');try{const paused=(await get()).data;assert.deepEqual(paused.catalog.map(v=>v.id),['grammar-v5']);assert.equal(paused.catalog_subjects.find(v=>v.id==='pakistan-affairs').count,0);assert.equal((await get('&offset=20')).data.catalog.length,0)}finally{php('tests/workspace/fixture.php','pause','0')}
php('tests/pro/fixture.php','expire',user);assert.deepEqual((await get()).data.catalog.map(v=>v.id),['grammar-v5']);assert.ok((await get(query)).data.catalog_subjects.every(v=>v.count===0));
assert.equal(php('tests/workspace/fixture.php','digest',user),before)
console.log('PASS: catalog native subject mappings, global pagination without repeated fixed courses, literal search, published-edition ownership, draft/withdrawal/pause/free filtering and metadata-only responses; saved writing unchanged.')
