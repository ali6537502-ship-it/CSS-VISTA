import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const env = { ...process.env }
for (const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[key]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER
  ? execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}).trim()
  : execFileSync('php',args,{env,encoding:'utf8'}).trim()
const jar = new Map()
async function call(path, body, authenticated = true) {
  const headers = { Accept:'application/json', ...(authenticated ? {Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')} : {}) }
  if (body) { headers['Content-Type']='application/json'; headers['X-CSRF-Token']=jar.get('cssv_csrf') || '' }
  const r=await fetch('http://localhost:4173/api/'+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})})
  if (authenticated) for (const cookie of r.headers.getSetCookie()) { const part=cookie.split(';')[0],i=part.indexOf('=');jar.set(part.slice(0,i),part.slice(i+1)) }
  return {status:r.status,data:await r.json(),headers:r.headers}
}
const email='release-hold-'+randomUUID()+'@example.invalid', user=php('tests/current-affairs/setup.php','user',email)
assert.equal((await call('auth/login.php',{email,password:'TEST ONLY native fixture password'})).status,200)
php('tests/precis/fixture.php','activate',user)
const before=(await call('student/membership.php')).data.membership
const attempt=await call('student/learning.php',{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,daily_minutes:90,stage:'starting',optional_subject_ids:[]})
assert.equal(attempt.status,200)
try {
  php('tests/pro/release-fixture.php','pause')
  const status=await call('pro-release.php',undefined,false)
  assert.equal(status.status,200);assert.equal(status.data.paused,true);assert.match(status.headers.get('cache-control'),/no-store/)
  for (const endpoint of ['precis-feedback','handwriting','handwriting-image','tutor','ability','mentor','ai-usage']) {
    const r=await call('student/'+endpoint+'.php');assert.equal(r.status,503,endpoint+JSON.stringify(r.data));assert.equal(r.data.error,'pro_release_paused')
    assert.equal((await call('student/'+endpoint+'.php',undefined,false)).status,401,'Anonymous identity gate changed for '+endpoint)
  }
  for (const endpoint of ['precis','skills','topics','expression']) {
    assert.equal((await call('student/'+endpoint+'.php')).status,200,endpoint)
    assert.equal((await call('student/'+endpoint+'.php',undefined,false)).status,401)
  }
  const membership=await call('student/membership.php');assert.equal(membership.status,200);assert.deepEqual(membership.data.membership,before);assert.equal(membership.data.product.collection_enabled,false);assert.equal(membership.data.product.receiver_number,null)
  assert.equal((await call('student/membership.php',{action:'create',request_id:randomUUID(),return_to:'/account/dashboard',terms_version:'test-only-v1',product_revision:'test-only'})).status,503)
  assert.equal((await call('student/premium-content.php?file=study-material%2Fessay-themes.json')).status,503)
  const science=await call('student/premium-content.php?file=css-subject-mcqs%2Fgeneral-science-and-ability.json',undefined,false)
  assert.equal(science.status,200);assert.ok(science.data.length>0);assert.ok(science.data.every(q=>!['Basic arithmetic','Numerical ability','Deductive reasoning'].includes(q.topic)))
  for (const route of ['student/profile.php','student/grammar.php?attempt_id='+attempt.data.attempt_id,'student/learning.php']) assert.equal((await call(route)).status,200,route)
  assert.equal((await call('student/learning.php?attempt_id='+attempt.data.attempt_id)).status,200)
  assert.equal((await call('student/learning.php',{action:'writing_save',request_id:randomUUID(),expected_version:0,attempt_id:attempt.data.attempt_id,kind:'paragraph',title:'TEST ONLY retained free writing',text:'TEST ONLY. This independent saved paragraph remains part of the existing account.'})).status,200)
  console.log('PASS: Pro pause fails closed for active-member GET/POST, AI/upload/content; anonymous authentication retained; collection disabled; exact membership unchanged; free science/profile/Grammar/preparation/writing still work.')
} finally { php('tests/pro/release-fixture.php','restore') }
assert.equal((await call('pro-release.php')).data.paused,false,'Isolated authoring preview not restored')
