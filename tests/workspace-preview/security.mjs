/** Read-only presentation selector security, using disposable native identities only. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_API_ORIGIN || 'http://localhost:4173'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env = { ...process.env }
for (const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[key]
const php=(...args)=>(process.env.CSSV_TEST_PHP_CONTAINER ? execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{env,encoding:'utf8'}) : execFileSync('php',args,{env,encoding:'utf8'})).trim()
async function call(path, user, method='GET', data) {
  const headers = { Accept: 'application/json' }
  if (user) { headers.Cookie = [...user.cookies].map(([key,value])=>`${key}=${value}`).join('; '); headers['X-CSSV-User'] = user.id }
  if (data) { headers['Content-Type']='application/json'; headers['X-CSRF-Token']=user?.cookies.get('cssv_csrf') || '' }
  const response = await fetch(`${base}/api/${path}`, {method,headers,...(data?{body:JSON.stringify(data)}:{})})
  if (user) for (const cookie of response.headers.getSetCookie()) { const pair=cookie.split(';')[0], at=pair.indexOf('='); user.cookies.set(pair.slice(0,at),pair.slice(at+1)) }
  return {response, data:await response.json().catch(()=>null)}
}
async function create() {
  const email=`preview-${randomUUID()}@example.invalid`, id=php('tests/current-affairs/setup.php','user',email), user={email,id,cookies:new Map()}
  const login=await call('auth/login.php',user,'POST',{email,password:'TEST ONLY native fixture password'})
  assert.equal(login.response.status,200,JSON.stringify(login.data)); return user
}
php('tests/pro/fixture.php','reset-rate')
const selected=await create(), other=await create()
try {
  php('tests/workspace-preview/fixture.php','select',selected.email)
  assert.equal((await call('auth/workspace-preview.php')).response.status,401)
  assert.deepEqual((await call('workspace-release.php')).data,{enabled:true})
  const allowed=await call('auth/workspace-preview.php',selected)
  assert.equal(allowed.response.status,200); assert.deepEqual(allowed.data,{enabled:true,user_id:selected.id})
  assert.match(allowed.response.headers.get('cache-control'),/no-store/)
  assert.match(allowed.response.headers.get('vary'),/Cookie/)
  assert.deepEqual((await call('auth/workspace-preview.php',other)).data,{enabled:true,user_id:other.id})
  assert.equal((await call('auth/workspace-preview.php',{...selected,id:other.id})).response.status,409)
  assert.equal((await call('auth/workspace-preview.php',selected,'POST',{})).response.status,405)
  assert.equal((await call('_workspace_preview.php',selected)).response.status,404)
  php('tests/workspace-preview/fixture.php','off')
  assert.equal((await call('auth/workspace-preview.php',selected)).data.enabled,false)
  php('tests/workspace-preview/fixture.php','select',selected.email)
  php('tests/workspace-preview/fixture.php','unverify',selected.email)
  assert.equal((await call('auth/workspace-preview.php',selected)).data.enabled,true,'The pilot must follow the existing confirmation-optional native sign-in policy')
  php('tests/current-affairs/setup.php','expire',selected.id)
  assert.equal((await call('auth/workspace-preview.php',selected)).response.status,401)
  console.log('PASS native public rollout selector: both accounts/guest/expired and existing confirmation-optional sign-in, owner binding, GET-only, no-store, private helper denial, kill switch; no entitlement mutation.')
} finally { php('tests/workspace-preview/fixture.php','select',other.email) }
