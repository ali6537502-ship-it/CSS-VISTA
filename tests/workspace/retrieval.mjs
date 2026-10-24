import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
async function call(path,jar=new Map(),body){
 const headers={Accept:'application/json'};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=jar.get('cssv_csrf')||''}
 const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})})
 for(const v of r.headers.getSetCookie()){const [pair]=v.split(';'),i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}
 return {status:r.status,data:await r.json()}
}
async function user(){const email=`retrieval-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',jar,{email,password:'TEST ONLY native fixture password'})).status,200);const fixture=JSON.parse(php('tests/workspace/retrieval-fixture.php','seed',id));return {id,jar,fixture}}
const a=await user(),b=await user()
async function read(params={},u=a){const r=await call('student/workspace.php?'+new URLSearchParams(params),u.jar);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
for(const params of [{state:'mastered'},{from:'2026-02-30'},{from:'2026-03-01',to:'2026-02-01'},{course:'x\nOR 1=1'},{collection:'foreign-not-a-uuid'},{q:'one two three four five six seven eight nine'}])assert.equal((await call('student/workspace.php?'+new URLSearchParams(params),a.jar)).status,422)
assert.equal((await call('student/workspace.php?q=%FF',a.jar)).status,422)
const free=await read({view:'review'});assert.deepEqual(free.items.map(i=>i.domain),['grammar']);assert.equal(free.items[0].review_count,1,'Future retrieval was included early')
assert.equal((await read({view:'search',source:'current-affairs'})).items.length,0)
php('tests/precis/fixture.php','activate',a.id);php('tests/precis/fixture.php','activate',b.id)
const before=php('tests/workspace/retrieval-fixture.php','digest',a.id)
const review=await read({view:'review'});assert.deepEqual(review.items.map(i=>i.domain).sort(),['ability','grammar','precis']);assert.equal(new Set(review.items.map(i=>i.domain+':'+i.id)).size,3)
assert.ok(review.items.find(i=>i.domain==='grammar').destination.includes('mode=due'))
assert.ok(review.items.find(i=>i.domain==='ability').destination.includes('unit='+a.fixture.ability_unit))
assert.equal(review.items.find(i=>i.domain==='ability').review_reason,'unresolved_mistake')
assert.equal(review.items.find(i=>i.domain==='precis').review_count,1,'Future spaced retries were counted as due')
assert.equal((await read({state:'unfinished',type:'precis'})).items[0].review_count,2,'Pending spaced retry was discarded')
for(const item of review.items)assert.equal((await read({view:'review'},b)).items.some(other=>other.id===item.id),false,'Foreign account review leaked')
const legacy=await read({course:'grammar-legacy'});assert.equal(legacy.items.length,1);assert.ok(legacy.items[0].destination.includes('view=legacy'))
const saved=await read({state:'saved',type:'writing'});assert.equal(saved.items.length,6)
assert.equal((await read({state:'unfinished',type:'writing'})).items.length,0,'Unscored writing was classified by engagement')
const collection=await read({view:'search',collection:a.fixture.collection});assert.deepEqual(collection.items.map(i=>i.id),[a.fixture.factbook])
assert.ok(collection.collections.some(c=>c.id===a.fixture.collection));assert.ok(collection.collections.every(c=>c.id!==b.fixture.collection))
const foreignCollection=await read({view:'search',collection:a.fixture.collection},b);assert.equal(foreignCollection.items.length,0);assert.deepEqual(foreignCollection.facets.courses,[])
const dated=await read({view:'search',from:'2002-03-04',to:'2002-03-04'});assert.deepEqual(dated.items.map(i=>i.id),['ca:'+a.fixture.stories.visible])
assert.equal((await read({view:'search',source:'current-affairs'})).items.length,1,'Withdrawn/future Current Affairs metadata escaped permission filtering')
for(const marker of ['PRIVATE_CA_BODY_NEVER_SEARCHED','PRIVATE_GRAMMAR_NOTE','PRIVATE_LEGACY_NOTE','PRIVATE_FACTBOOK_BODY','PRIVATE_SOURCE_NOTE_NEVER_SEARCHED'])assert.equal((await read({view:'search',q:marker})).items.length,0,'Private body entered metadata search')
const intents=[
 ['math','ability'],['quantitative reasoning','ability'],['English grammar','grammar-v5'],['tenses','grammar-v5'],['English language rules','grammar-v5'],
 ['sentence structure','sentence'],['expression improvement','sentence'],['argumentation','argument'],['claims evidence','argument'],['analytical skills','analysis'],
 ['essay themes','essay'],['thesis outline','essay'],['précis compression','precis'],['summary fidelity','precis'],
 ['adaptation outline',a.fixture.writing[0]],['climate policy',a.fixture.writing[0]],['federalism revision',a.fixture.writing[1]],['essay federalism',a.fixture.writing[1]],
 ['water governance',a.fixture.writing[2]],['governance argument',a.fixture.writing[2]],['education précis',a.fixture.writing[3]],['reform draft',a.fixture.writing[3]],
 ['inflation evidence',a.fixture.writing[4]],['inflation paragraph',a.fixture.writing[4]],['repair reflection',a.fixture.writing[5]],['sentence reflection',a.fixture.writing[5]],
 ['budget notes',a.fixture.factbook],['fiscal reference',a.fixture.source],['climate finance','ca:'+a.fixture.stories.visible],['earlier grammar',a.fixture.attempt],
]
let hits=0
for(const [q,id] of intents){const r=await read({view:'search',q});if(r.items.slice(0,5).some(row=>row.id===id))hits++;else console.log('MISS',q,r.items.slice(0,5).map(i=>i.id));assert.ok(!JSON.stringify(r).includes('PRIVATE_'))}
assert.ok(hits/intents.length>=0.9,`Natural-language fixture relevance ${hits}/${intents.length}`)
assert.equal(php('tests/workspace/retrieval-fixture.php','digest',a.id),before,'Search/facets/review mutated original source records')
php('tests/workspace/fixture.php','pause','1')
try{
 const paused=await read({view:'review'});assert.deepEqual(paused.items.map(i=>i.domain),['grammar'])
 const hidden=await read({view:'search',source:'current-affairs'});assert.equal(hidden.items.length,0);assert.ok(hidden.facets.sources.every(i=>i.id!=='current-affairs'))
}finally{php('tests/workspace/fixture.php','pause','0')}
php('tests/pro/fixture.php','expire',a.id)
assert.equal((await read({view:'search',source:'current-affairs'})).items.length,0)
assert.deepEqual((await read({view:'review'})).items.map(i=>i.domain),['grammar'])
assert.equal(php('tests/workspace/retrieval-fixture.php','digest',a.id),before,'Expiry changed retained work')
php('tests/precis/fixture.php','activate',a.id)
php('tests/workspace/retrieval-fixture.php','resolve',a.id,JSON.stringify(a.fixture))
assert.deepEqual((await read({view:'review'})).items.map(i=>i.domain),['grammar'],'Latest corrected evidence left duplicate/resolved mistakes in the queue')
console.log(`PASS: ${hits}/${intents.length} natural-language intents against synthetic personal records/current catalog; saved/unfinished/course/source/date/collection filters, active-only CA, separate Grammar archives/due, Ability/Précis latest evidence, permission-filtered facets and read-only preservation. Not academic or user-panel approval.`)
