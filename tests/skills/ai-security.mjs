import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const env = { ...process.env }
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER
  ? execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', ...args], { env, encoding: 'utf8' }).trim()
  : execFileSync('php', args, { env, encoding: 'utf8' }).trim()
async function call(path, jar = new Map(), body, extra = {}) {
  const headers = { ...extra }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  if (body) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = jar.get('cssv_csrf') || ''; Object.assign(headers, extra) }
  const response = await fetch('http://localhost:4173/api/' + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  for (const cookie of response.headers.getSetCookie()) { const p = cookie.split(';')[0], i = p.indexOf('='); jar.set(p.slice(0, i), p.slice(i + 1)) }
  return { status: response.status, data: await response.json(), headers: response.headers }
}
async function user(label) {
  const email = `skills-${label}-${randomUUID()}@example.invalid`, id = php('tests/current-affairs/setup.php', 'user', email), jar = new Map()
  assert.equal((await call('auth/login.php', jar, { email, password: 'TEST ONLY native fixture password' })).status, 200)
  return { id, jar }
}


const a=await user('AI'), b=await user('AI-other'), endpoint='student/skills.php'
php('tests/precis/fixture.php','activate',a.id);php('tests/precis/fixture.php','activate',b.id)
php('tests/skills/fixture.php','config','on')
try {
 const attempt=(await call('student/learning.php',a.jar,{action:'attempt_save',request_id:randomUUID(),expected_version:0,target_year:2027,target_date:null,optional_subject_ids:[],daily_minutes:60,stage:'starting'})).data.attempt_id
 const raw=JSON.parse(readFileSync(new URL('../../public/api/_premium_files/skills-curriculum.json',import.meta.url)))
 const roadmap=JSON.parse(readFileSync(new URL('../../public/study-material/essay-themes.json',import.meta.url)))
 const make=fields=>({request_id:randomUUID(),...fields})
 for(const feature of ['sentence','argument','analysis','essay']) {
  const lesson=raw.lessons.find(l=>l.feature===feature&&l.level==='beginner')
  const create=await call(endpoint,a.jar,make({action:'start',feature,lesson:lesson?.id||roadmap.themes[0].slug,level:'beginner',attempt_id:attempt}))
  assert.equal(create.status,200);const id=create.data.workspace_id
  let d=(await call(endpoint+'?workspace_id='+id,a.jar)).data
  if(feature!=='essay') {
   const fixed=await call(endpoint,a.jar,make({action:'save',workspace_id:id,expected_version:0,stage:'check',response:lesson.check.answer,advance:true}))
   assert.equal(fixed.status,200)
   d=(await call(endpoint+'?workspace_id='+id,a.jar)).data
   assert.equal((await call(endpoint,a.jar,make({action:'evaluate',workspace_id:id,version_id:d.saved.version_id,policy_version:d.configuration.policy_version,policy_hash:d.configuration.policy_hash,accepted:true}))).status,422)
  }
  const stage=d.workspace.source.stages[feature==='essay'?0:1].id
  const saved=await call(endpoint,a.jar,make({action:'save',workspace_id:id,expected_version:d.workspace.version,stage,response:'A trial could help students if staffing permits it, but the evidence of demand remains unverified.'}))
  assert.equal(saved.status,200)
  const request=make({action:'evaluate',workspace_id:id,version_id:saved.data.version_id,policy_version:d.configuration.policy_version,policy_hash:d.configuration.policy_hash,accepted:true})
  assert.equal((await call(endpoint,b.jar,request)).status,404)
  const accepted=JSON.parse(php('tests/skills/fixture.php','reserve',a.id,JSON.stringify(request)));assert.ok(accepted.id,JSON.stringify(accepted));php('tests/skills/fixture.php','normalize-operation',accepted.id)
  const op=await call(endpoint,a.jar,request);assert.equal(op.status,200,JSON.stringify(op.data));assert.equal(op.data.operation.state,'succeeded')
  assert.equal(op.data.operation.result.criteria.length,feature==='sentence'?6:feature==='essay'?7:8)
  assert.match(op.data.operation.result.summary,/TEST ONLY/)
  const repeat=await call(endpoint,a.jar,request);assert.equal(repeat.data.operation.id,op.data.operation.id)
  const receipt=await call(endpoint+'?request_id='+request.request_id,a.jar);assert.equal(receipt.data.operation.id,op.data.operation.id)
  assert.equal((await call(endpoint,a.jar,{...request,request_id:randomUUID()})).status,409)
  const versions=[]
  for(const token of ['MALFORMED','UNKNOWN']) {
   d=(await call(endpoint+'?workspace_id='+id,a.jar)).data
   const v=await call(endpoint,a.jar,make({action:'save',workspace_id:id,expected_version:d.workspace.version,stage,response:token+' a separate independent response for deterministic test failure recovery.'}))
   assert.equal(v.status,200)
   const r=await call(endpoint,a.jar,make({action:'evaluate',workspace_id:id,version_id:v.data.version_id,policy_version:d.configuration.policy_version,policy_hash:d.configuration.policy_hash,accepted:true}))
   assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.operation.state,token==='MALFORMED'?'failed':'unknown')
   versions.push(r.data.operation)
  }
  const bucket=JSON.parse(php('tests/skills/fixture.php','snapshot',a.id)).find(r=>r.feature===(feature==='argument'?'argumentation':feature))
  assert.equal(Number(bucket.used),1);assert.equal(Number(bucket.reserved),1);assert.equal(Number(bucket.provider_calls),3)
  d=(await call(endpoint+'?workspace_id='+id,a.jar)).data
  assert.equal((await call(endpoint,a.jar,make({action:'evaluate',workspace_id:id,version_id:d.saved.version_id,policy_version:d.configuration.policy_version,policy_hash:d.configuration.policy_hash,accepted:true}))).status,409)
  assert.equal((await call('student/ai-usage.php?operation_id='+versions[1].id,b.jar)).status,404)
 }
 for (const changed of ['notice','model']) {
  php('tests/skills/fixture.php','config','on')
  const member=await user('preflight-'+changed);php('tests/precis/fixture.php','activate',member.id)
  const a=await call('student/learning.php',member.jar,make({action:'attempt_save',expected_version:0,target_year:2027,target_date:null,optional_subject_ids:[],daily_minutes:60,stage:'starting'}))
  const w=await call(endpoint,member.jar,make({action:'start',feature:'essay',lesson:roadmap.themes[0].slug,level:'beginner',attempt_id:a.data.attempt_id}))
  const before=(await call(endpoint+'?workspace_id='+w.data.workspace_id,member.jar)).data
  const saved=await call(endpoint,member.jar,make({action:'save',workspace_id:w.data.workspace_id,expected_version:0,stage:'understanding',response:'This independent explanation identifies the scope of the theme and a question for further research.'}))
  const request=make({action:'evaluate',workspace_id:w.data.workspace_id,version_id:saved.data.version_id,policy_version:before.configuration.policy_version,policy_hash:before.configuration.policy_hash,accepted:true})
  const reserved=JSON.parse(php('tests/skills/fixture.php','reserve',member.id,JSON.stringify(request)));assert.ok(reserved.id,JSON.stringify(reserved))
  php('tests/skills/fixture.php','config','on',changed==='notice'?' Changed private processing notice.':'',changed==='model'?'TEST-only-different-model':'TEST-only-model')
  const recovered=await call(endpoint,member.jar,request);assert.equal(recovered.status,200,JSON.stringify(recovered.data));assert.equal(recovered.data.operation.id,reserved.id);assert.equal(recovered.data.operation.state,'failed')
  const usage=JSON.parse(php('tests/skills/fixture.php','snapshot',member.id))[0];assert.equal(Number(usage.used),0);assert.equal(Number(usage.reserved),0);assert.equal(Number(usage.provider_calls),0)
 }
 console.log('PASS skills TEST ONLY AI: four schemas, immutable input, once-only dispatch, rubric persistence, ownership, changed-notice/model preflight release without dispatch, malformed release and unresolved reservation; real-provider academic validation remains blocked')
} finally {php('tests/skills/fixture.php','config','off')}
