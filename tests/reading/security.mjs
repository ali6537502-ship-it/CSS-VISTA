import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw new Error('Disposable database required')
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k]
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim():execFileSync('php',args,{env,encoding:'utf8'}).trim()
async function call(path,body,jar=new Map(),extra={}){const headers={Accept:'application/json','User-Agent':'CSSVistaReadingIsolation',...extra};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||''}const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1))}const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw new Error(`Non-JSON ${r.status} from ${path}: ${raw.slice(0,2400)}`)}return{status:r.status,data,headers:r.headers}}
async function user(label){const email=`reading-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)).status,200);return{id,jar}}

const a=await user('a'),b=await user('b'),incomplete=await user('incomplete')
async function make(u){const r=await call('student/learning.php',{action:'attempt_save',expected_version:0,target_year:2027,target_date:null,daily_minutes:90,stage:'starting',optional_subject_ids:[],request_id:randomUUID()},u.jar);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.attempt_id}
const attempt=await make(a),other=await make(b),second=await make(a),endpoint='student/planner.php'
php('tests/planner/fixture.php','clear-rate',a.id,attempt)
const source=php('tests/reading/fixture.php','source',a.id,attempt)
const get=(query='',u=a,id=attempt)=>call(`${endpoint}?attempt=${id}&view=reading${query}`,undefined,u.jar)
const mutate=(body,u=a,id=attempt)=>call(endpoint,{request_id:randomUUID(),attempt_id:id,...body},u.jar)
const detail=(kind,id)=>get('&kind='+kind+'&source_id='+encodeURIComponent(id))
const initial=await detail('current_affairs',source);assert.equal(initial.status,200,JSON.stringify(initial.data));let item=initial.data.items[0]
assert.equal(item.date,'2003-04-05');assert.equal(item.version,0);assert.equal(item.read_date,null)
assert.equal((await get('',b,attempt)).status,404);assert.equal((await get()).headers.get('cache-control').includes('no-store'),true)
assert.equal((await call(endpoint)).status,401);php('tests/pro/fixture.php','incomplete',incomplete.id);assert.equal((await get('',incomplete,attempt)).status,403)
assert.equal((await get('&kind=unknown')).status,422);assert.equal((await get('&filter=unknown')).status,422);assert.equal((await get('&source_id='+source, b,other)).status,200,'Published sources remain readable for other accounts')
const body=(source,operation,extra={})=>({action:'reading_save',kind:source.kind,source_id:source.source_id,source_hash:source.source_hash,expected_version:source.version,operation,...extra})
const saved={...body(item,'save'),request_id:randomUUID()}
assert.equal((await mutate(saved,a,attempt)).status,200);assert.equal((await mutate(saved)).status,200,'Exact receipt replay failed')
assert.equal((await mutate({...saved,operation:'read'})).status,409,'Changed request reused receipt')
assert.equal((await mutate(body(item,'read'))).status,409,'Stale version accepted')
assert.equal((await mutate(body(item,'save'),b,attempt)).status,404,'Foreign attempt updated')
assert.equal((await call(endpoint,{...saved,request_id:randomUUID()},a.jar,{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call(endpoint+`?attempt=${attempt}&view=reading`,undefined,a.jar,{'X-CSSV-User':b.id})).status,409)
item=(await detail('current_affairs',source)).data.items[0];assert.equal(item.saved,true);assert.equal(item.read_date,null,'Bookmark invented reading')
assert.equal((await mutate({...body(item,'read'),source_hash:'0'.repeat(64)})).status,409,'Changed source accepted')
assert.equal((await mutate({...body(item,'read'),read_date:'2003-04-05'})).status,422,'Client supplied completion date')
assert.equal((await mutate(body(item,'review',{outcome:'recalled'}))).status,409,'Unread source received revision')
const read={...body(item,'read'),request_id:randomUUID()};assert.equal((await mutate(read)).status,200)
item=(await detail('current_affairs',source)).data.items[0];assert.equal(item.read_date,(await get()).data.today);assert.ok(item.next_revision>item.read_date)
assert.equal((await mutate(body(item,'read'))).status,409,'Same version inflated reading');assert.equal((await mutate(body(item,'review',{outcome:'recalled'}))).status,409,'Early revision accepted')
let dimensions=(await call(`${endpoint}?attempt=${attempt}&view=readiness`,undefined,a.jar)).data.dimensions;assert.equal(dimensions.current_affairs.reading_declarations,1);assert.equal(dimensions.mcq.total,0);assert.equal(dimensions.overall_percentage,null)
let report=(await call(`${endpoint}?attempt=${attempt}&view=reviews`,undefined,a.jar)).data.reviews.periods['7'].current;assert.equal(report.current_affairs_readings,1,'Reading completion used old publication date');assert.equal(report.reading_reviews,0)
assert.equal((await get('&range=7&filter=read')).data.items.some(i=>i.source_id===source),false,'Old source presented as this week’s news')
assert.equal((await get('&filter=read',a,second)).data.items.length,0,'Separate attempt inherited records')
const priorSource=php('tests/reading/fixture.php','source',a.id,second);php('tests/reading/fixture.php','prior',a.id,second)
let earlier=(await get('&source_id='+priorSource,a,second)).data.items[0];assert.equal((await mutate(body(earlier,'read'),a,second)).status,200)
earlier=(await get('&source_id='+priorSource,a,second)).data.items[0];assert.equal(earlier.read_date,'2004-05-06','Earlier owned plan date was replaced')
assert.equal((await call(`${endpoint}?attempt=${second}&view=readiness`,undefined,a.jar)).data.dimensions.current_affairs.reading_declarations,1)
assert.equal((await call(`${endpoint}?attempt=${second}&view=reviews`,undefined,a.jar)).data.reviews.periods['7'].current.current_affairs_readings,0,'Old plan reading relabelled as newly read')
php('tests/reading/fixture.php','due',a.id,attempt);item=(await detail('current_affairs',source)).data.items[0]
const raced=await Promise.all([mutate(body(item,'review',{outcome:'recalled'})),mutate(body(item,'review',{outcome:'needs_review'}))]);assert.deepEqual(raced.map(r=>r.status).sort(),[200,409],'Concurrent reviews lost CAS')
item=(await detail('current_affairs',source)).data.items[0];assert.equal(item.review_count,1);assert.ok(item.next_revision>item.read_date)
php('tests/reading/fixture.php','due',a.id,attempt);const plan=(await call(`${endpoint}?attempt=${attempt}`,undefined,a.jar)).data;assert.ok(plan.proposal.selection.tasks.length===0,'Setup guard failed')
assert.equal((await mutate({action:'settings_save',expected_version:0,religion_choice:'islamic-studies'})).status,200)
assert.ok((await call(`${endpoint}?attempt=${attempt}`,undefined,a.jar)).data.proposal.selection.tasks.some(t=>t.kind==='reading_revision'),'Due reading not proposed')
item=(await detail('current_affairs',source)).data.items[0];php('tests/reading/fixture.php','change',a.id,attempt);assert.equal((await mutate(body(item,'review',{outcome:'recalled'}))).status,409,'Changed content received recall credit')
item=(await detail('current_affairs',source)).data.items[0];assert.equal(item.source_changed,true);assert.equal((await mutate(body(item,'review',{outcome:'recalled'}))).status,409)
assert.equal((await mutate(body(item,'read'))).status,200);assert.equal((await call(`${endpoint}?attempt=${attempt}&view=readiness`,undefined,a.jar)).data.dimensions.current_affairs.reading_declarations,1,'Corrected article counted twice')
const vista=(await get('&kind=vistagram')).data.items[0];assert.ok(vista?.sources.length,'Missing published Vistagram references');assert.equal((await mutate(body(vista,'read'))).status,200)
assert.equal((await call(`${endpoint}?attempt=${attempt}&view=readiness`,undefined,a.jar)).data.dimensions.reading.vistagram_readings,1)
const receipt=await call(endpoint+'?request_id='+read.request_id,undefined,a.jar);assert.equal(receipt.status,200);assert.equal((await call(endpoint+'?request_id='+read.request_id,undefined,b.jar)).status,404)
php('tests/precis/fixture.php','activate',a.id);php('tests/pro/fixture.php','expire',a.id);assert.equal((await get('&filter=read')).status,200,'Expiry erased free-access reading history')
item=(await detail('current_affairs',source)).data.items[0];assert.equal((await mutate(body(item,'unsave'))).status,200,'Expiry revoked existing free reading organisation')
item=(await detail('current_affairs',source)).data.items[0];assert.equal((await mutate(body(item,'save'))).status,200)
php('tests/reading/fixture.php','withdraw',a.id,attempt);assert.equal((await detail('current_affairs',source)).status,404)
const archived=(await get('&filter=saved')).data.items.find(i=>i.source_id===source);assert.equal(archived.available,false);assert.ok(archived.read_date);assert.equal((await mutate(body(archived,'read'))).status,404,'Withdrawn source accepted new work')
php('tests/reading/fixture.php','future',a.id,attempt);try{assert.equal((await get()).data.items.some(i=>i.date==='2003-04-05'),false,'Future scheduled edition exposed')}finally{php('tests/reading/fixture.php','restore',a.id,attempt)}
assert.equal(JSON.parse(php('tests/reading/fixture.php','counts',a.id,attempt)).ai_operations,0)
assert.equal((await fetch('http://localhost:4173/api/_planner_reading.php')).status,404)
assert.equal((await fetch('http://localhost:4173/vistagram-content/index.json')).status,200,'Public Vistagram promise revoked')
console.log('PASS: published CA/Vistagram source identity, owned attempt isolation, CSRF/profile/account guards, exact receipt recovery, version/source races, bookmark vs reading vs recall evidence, server PST completion dates, publication windows, corrected/withdrawn/future source guards, due-plan integration, original reading evidence, expiry continuity and zero AI dispatch.')
