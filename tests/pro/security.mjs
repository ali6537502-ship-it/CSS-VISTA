import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Isolated CI database required')
function php(...args) {
  if (process.env.CSSV_TEST_PHP_CONTAINER) {
    const env = { ...process.env }; for (const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[name]
    return execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8',env}).trim()
  }
  return execFileSync('php',args,{encoding:'utf8'}).trim()
}
const admin = JSON.parse(await readFile('test-artifacts/admin-session.json','utf8'))
const owner = new Map([['cssv_owner_session',admin.token],['cssv_owner_csrf',admin.csrf]])
async function call(path, body, jar = new Map(), extra = {}) {
  const headers = { Accept:'application/json','User-Agent':'CSSVistaProIsolationTest',...extra }
  if(jar.size) headers.Cookie = [...jar].map(([k,v])=>`${k}=${v}`).join('; ')
  if(body) { headers['Content-Type']='application/json'; headers['X-CSRF-Token'] ??= jar.get('cssv_csrf') || jar.get('cssv_owner_csrf') || '' }
  const response=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})})
  for(const value of response.headers.getSetCookie()) { const part=value.split(';')[0], i=part.indexOf('='); jar.set(part.slice(0,i),part.slice(i+1)) }
  const data=await response.json(); return {status:response.status,data,headers:response.headers}
}
async function user(label) {
  const email=`pro-${label}-${randomUUID()}@example.invalid`, jar=new Map()
  const id=php('tests/current-affairs/setup.php','user',email)
  const result=await call('auth/login.php',{email,password:'TEST ONLY native fixture password'},jar)
  assert.equal(result.status,200,JSON.stringify(result.data)); return {id,jar,email}
}
php('tests/pro/fixture.php','reset-rate')
const path='student/membership.php', reviewPath='admin/payments.php'
assert.equal((await call(path)).status,401)
assert.equal((await call(reviewPath)).status,401)
const a=await user('a'), b=await user('b'), incomplete=await user('incomplete')
php('tests/pro/fixture.php','incomplete',incomplete.id)
assert.equal((await call(path,undefined,incomplete.jar)).status,403,'Profile eligibility bypassed')
php('tests/pro/fixture.php','collection','off')
const initial=await call(path,undefined,a.jar)
assert.equal(initial.status,200); assert.equal(initial.data.membership.status,'free'); assert.equal(initial.data.product.amount_minor,195000)
assert.equal(initial.data.product.collection_enabled,false); assert.equal(initial.data.product.receiver_number,null)
assert.match(initial.headers.get('cache-control'),/no-store/)
let revision=null
const createBody=()=>({product_revision:revision,action:'create',request_id:randomUUID(),terms_version:'test-only-v1',return_to:'/grammar-course'})
assert.equal((await call(path,createBody(),a.jar)).status,503,'Closed collection created an order')
php('tests/pro/fixture.php','collection','on')
revision=(await call(path,undefined,a.jar)).data.product.product_revision
assert.equal((await call(path,{...createBody(),product_revision:'stale'},a.jar)).status,409,'Stale commercial details accepted')
assert.equal((await call(path,createBody(),a.jar,{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call(path,createBody(),a.jar,{'X-CSSV-User':b.id})).status,409)
assert.equal((await call(path,{...createBody(),amount_minor:1},a.jar)).status,422)
assert.equal((await call(reviewPath,{action:'approve'},a.jar)).status,401,'Student could review payments')
async function create(member,body=createBody()) {
  const result=await call(path,body,member.jar); assert.equal(result.status,200,JSON.stringify(result.data)); assert.equal(result.data.order.amount_minor,195000);return {order:result.data.order,body}
}
const first=await create(a)
assert.equal((await call(path,first.body,a.jar)).data.order.id,first.order.id,'Create replay duplicated order')
assert.equal((await call(path,{...first.body,return_to:'/vistagram'},a.jar)).status,409,'Idempotency intent changed')
assert.equal((await call(path+'?order_id='+first.order.id,undefined,b.jar)).status,404)
assert.equal((await call(path,{action:'cancel',order_id:first.order.id},b.jar)).status,404)
async function submit(member,order,transaction_id='TEST-'+randomUUID()) {
  const body={action:'submit',order_id:order.id,request_id:randomUUID(),transaction_id}
  const result=await call(path,body,member.jar); assert.equal(result.status,200,JSON.stringify(result.data));return {order:result.data.order,body,submission:result.data.order.submissions[0]}
}
const submitted=await submit(a,first.order)
assert.equal(submitted.order.status,'awaiting_verification')
assert.equal((await call(path,undefined,a.jar)).data.membership.status,'free','Claim activated access without review')
assert.equal((await call(path,submitted.body,a.jar)).data.order.submissions.length,1,'Submission replay duplicated history')
assert.equal((await call(path,{...submitted.body,transaction_id:'DIFFERENT'},a.jar)).status,409)
assert.equal((await call(path,{action:'cancel',order_id:first.order.id},a.jar)).status,409,'Cancelled pending transfer')
function approve(s) {return {action:'approve',submission_id:s.submission.id,reason:'ISOLATED TEST: actual receipt verified',receipt_verified:true,transaction_id:s.submission.transaction_id,received_amount_minor:195000,receiver_number:'03055199994',received_at:new Date().toISOString().replace(/\.\d{3}Z$/,'Z')}}
const approval=approve(submitted)
assert.equal((await call(reviewPath,approval,owner,{'X-CSRF-Token':'wrong'})).status,403)
assert.equal((await call(reviewPath,{...approval,receipt_verified:false},owner)).status,422)
assert.equal((await call(reviewPath,{...approval,received_amount_minor:1},owner)).status,409)
assert.equal((await call(reviewPath,{...approval,received_at:'2026-99-99T00:00:00Z'},owner)).status,422)
const approvals=await Promise.all([call(reviewPath,approval,owner),call(reviewPath,approval,owner)])
for(const result of approvals) assert.equal(result.status,200,JSON.stringify(result.data))
const active=(await call(path,undefined,a.jar)).data.membership
assert.equal(active.status,'active'); assert.equal(new Date(active.expires_at)-new Date(active.starts_at),30*86400000)
assert.equal((await call(reviewPath,{action:'reject',submission_id:submitted.submission.id,reason:'TEST conflict'},owner)).status,409,'Rejected approved grant')
const reuse=await submit(b,(await create(b)).order,submitted.submission.transaction_id.toLowerCase())
assert.equal((await call(reviewPath,approve(reuse),owner)).status,409,'Transaction reused across accounts')
assert.equal((await call(path,undefined,b.jar)).data.membership.status,'free','Failed approval partially committed')
const rejected=await submit(a,(await create(a)).order)
assert.equal((await call(reviewPath,{action:'reject',submission_id:rejected.submission.id,reason:'TEST: no matching receipt'},owner)).status,200)
assert.equal((await call(path,undefined,a.jar)).data.membership.expires_at,active.expires_at,'Rejection removed existing entitlement')
const resubmitted=await submit(a,rejected.order)
assert.equal(resubmitted.order.submissions.length,2,'Resubmission overwrote rejection history')
const renewal2=await submit(a,(await create(a)).order)
const renewals=await Promise.all([call(reviewPath,approve(resubmitted),owner),call(reviewPath,approve(renewal2),owner)])
for(const result of renewals) assert.equal(result.status,200,JSON.stringify(result.data))
assert.equal(new Date((await call(path,undefined,a.jar)).data.membership.expires_at)-new Date(active.expires_at),60*86400000,'Concurrent distinct renewals lost time')
const cancelled=(await create(b)).order
assert.equal((await call(path,{action:'cancel',order_id:cancelled.id},b.jar)).status,200)
assert.equal((await call(path,{action:'cancel',order_id:cancelled.id},b.jar)).status,200)
assert.equal((await call(path,{action:'submit',order_id:cancelled.id,request_id:randomUUID(),transaction_id:'TEST-CANCELLED'},b.jar)).status,409)
const redirect=(await create(b,{...createBody(),return_to:'https://evil.invalid'})).order
assert.equal(redirect.return_to,'/account/dashboard')
const c=await user('race')
const race=await submit(c,(await create(c)).order)
const secondReviewer=JSON.parse(php('tests/pro/fixture.php','reviewer'))
const owner2=new Map([['cssv_owner_session',secondReviewer.token],['cssv_owner_csrf',secondReviewer.csrf]])
const raced=await Promise.all([call(reviewPath,approve(race),owner),call(reviewPath,{action:'reject',submission_id:race.submission.id,reason:'TEST competing decision'},owner2)])
assert.deepEqual(raced.map(r=>r.status).sort(),[200,409],'Approval/rejection race did not resolve to one decision')
const raceDetail=(await call(path+'?order_id='+race.order.id,undefined,c.jar)).data.order
assert.equal(raceDetail.grant!==null,raceDetail.status==='approved','Race left inconsistent grant/order state')
php('tests/pro/fixture.php','collection','off')
assert.equal((await call(path+'?order_id='+redirect.id,undefined,b.jar)).data.collection_enabled,false)
assert.equal((await call(path,{action:'submit',order_id:redirect.id,request_id:randomUUID(),transaction_id:'TEST-PAUSED'},b.jar)).status,503)
php('tests/pro/fixture.php','learning',a.id)
const progress=php('tests/pro/fixture.php','progress',a.id)
const history=(await call(path,undefined,a.jar)).data.orders
php('tests/pro/fixture.php','expire',a.id)
assert.equal((await call(path,undefined,a.jar)).data.membership.status,'expired')
assert.equal(php('tests/pro/fixture.php','progress',a.id),progress,'Expiry deleted saved learning state')
assert.deepEqual((await call(path,undefined,a.jar)).data.orders,history,'Expiry changed order history')
assert.equal((await call(path+'?order_id='+first.order.id,undefined,a.jar)).data.order.grant!==null,true)
assert.equal((await call(path+'?offset=-1',undefined,a.jar)).status,422)
assert.equal((await call(reviewPath+'?status=approved',undefined,owner)).data.submissions.filter(row=>row.email===a.email).length,3)
await call('auth/logout.php',{},a.jar)
assert.equal((await call(path,undefined,a.jar)).status,401)
console.log('PASS: real PHP/MySQL ownership, eligibility, CSRF, closed collection, price tampering, idempotency, receipt checks, concurrent approval/renewal, transaction reuse, rejection/resubmission, cancellation, safe return, expiry/history and logout.')
