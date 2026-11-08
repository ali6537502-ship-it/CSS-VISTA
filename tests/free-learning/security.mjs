import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const php=(...args)=>execFileSync('php',args,{encoding:'utf8'}).trim()
async function call(path,jar=new Map(),body,extra={}) {
 const headers={Accept:'application/json',...extra}
 if(jar.size)headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']??=jar.get('cssv_csrf')||jar.get('cssv_owner_csrf')||''}
 const response=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})})
 for(const cookie of response.headers.getSetCookie()){const part=cookie.split(';')[0],i=part.indexOf('=');jar.set(part.slice(0,i),part.slice(i+1))}
 return {status:response.status,data:await response.json()}
}
async function user(label){const email=`free-learning-${label}-${randomUUID()}@example.invalid`,id=php('tests/current-affairs/setup.php','user',email),jar=new Map();assert.equal((await call('auth/login.php',jar,{email,password:'TEST ONLY native fixture password'})).status,200);return{id,jar}}
const a=await user('a'),b=await user('b'),incomplete=await user('incomplete')
php('tests/pro/fixture.php','incomplete',incomplete.id)
for(const endpoint of ['student/precis.php','student/skills.php?feature=argument','student/skills.php?feature=analysis','student/skills.php?feature=essay','student/expression.php','student/mentor.php','student/tutor.php','student/handwriting.php','current-affairs.php','student/topics.php']) {
 assert.equal((await call(endpoint)).status,401,endpoint)
 assert.equal((await call(endpoint,incomplete.jar)).status,403,endpoint)
 const opened=await call(endpoint,a.jar);assert.equal(opened.status,200,endpoint+' '+JSON.stringify(opened.data))
 assert.equal((await call(endpoint,a.jar,undefined,{'X-CSSV-User':b.id})).status,409,endpoint)
}
const order=php('tests/free-learning/fixture.php','legacy-order',a.id)
php('tests/precis/fixture.php','activate',a.id)
php('tests/pro/fixture.php','expire',a.id)
const before=php('tests/free-learning/fixture.php','snapshot',a.id)
const membership=await call('student/membership.php',a.jar)
assert.equal(membership.status,200);assert.equal(membership.data.membership.status,'free');assert.equal(membership.data.product.collection_enabled,false)
assert.equal((await call('student/membership.php?order_id='+order,a.jar)).data.order.id,order)
assert.equal((await call('student/membership.php?order_id='+order,b.jar)).status,404,'Earlier payment history leaked')
php('tests/pro/fixture.php','collection','on')
php('tests/skills/fixture.php','config','on')
for(const endpoint of ['student/membership.php','student/expression.php','student/precis-feedback.php','student/handwriting.php','student/tutor.php','student/skills.php']) {
 assert.equal((await call(endpoint,a.jar,{action:endpoint.includes('membership')?'create_order':'evaluate'}, {'X-CSRF-Token':'wrong'})).status,403,'Retired action bypassed CSRF')
 const rejected=await call(endpoint,a.jar,{action:endpoint.includes('membership')?'create_order':'evaluate',request_id:randomUUID()})
 assert.equal(rejected.status,410,'Retired action accepted: '+endpoint+' '+JSON.stringify(rejected.data))
}
assert.equal((await call('student/ability.php',a.jar)).status,410)
assert.equal((await call('student/ability.php')).status,401)
assert.equal((await call('student/tutor.php?category=ability',a.jar)).status,410)
assert.equal(php('tests/free-learning/fixture.php','snapshot',a.id),before,'Retired actions mutated old orders, grants or provider counters')
const admin=JSON.parse(php('tests/pro/fixture.php','reviewer')),owner=new Map([['cssv_owner_session',admin.token],['cssv_owner_csrf',admin.csrf]])
assert.equal((await call('admin/payments.php',owner,{action:'approve',order_id:order})).status,410,'Retired payment review can grant a subscription')
assert.equal(php('tests/free-learning/fixture.php','snapshot',a.id),before,'Retired review modified old records')
php('tests/skills/fixture.php','config','off')
console.log('PASS: fresh free accounts open learning without a subscription; profile/account isolation retained; historical orders remain owned/read-only; payment/provider flags cannot reopen retired actions; General Ability is retired; no provider usage or historical billing mutation.')
