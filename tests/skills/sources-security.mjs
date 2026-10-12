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
  if (body) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = jar.get('cssv_csrf') || jar.get('cssv_owner_csrf') || ''; Object.assign(headers, extra) }
  const response = await fetch('http://localhost:4173/api/' + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  for (const cookie of response.headers.getSetCookie()) { const p = cookie.split(';')[0], i = p.indexOf('='); jar.set(p.slice(0, i), p.slice(i + 1)) }
  return { status: response.status, data: await response.json(), headers: response.headers }
}
async function user(label) {
  const email = `skills-${label}-${randomUUID()}@example.invalid`, id = php('tests/current-affairs/setup.php', 'user', email), jar = new Map()
  assert.equal((await call('auth/login.php', jar, { email, password: 'TEST ONLY native fixture password' })).status, 200)
  return { id, jar }
}


const a=await user('source'),free=await user('source-free');php('tests/precis/fixture.php','activate',a.id)
const raw=JSON.parse(readFileSync(new URL('../../public/api/_premium_files/general-ability-course.json',import.meta.url)))
for(const unit of raw.units){const lesson=unit.lessons[0],id='ability:'+unit.id+':'+lesson.id
 const selected=await call('student/tutor.php?context='+encodeURIComponent(id),a.jar)
 assert.equal(selected.status,200,JSON.stringify(selected.data));assert.ok(selected.data.context.text.includes(lesson.idea));assert.ok(!selected.data.context.text.includes(JSON.stringify(lesson.exercise.proof)))
 assert.equal(selected.data.context.feature,unit.stage==='Logical reasoning'?'tutor':'maths')
 assert.equal((await call('student/tutor.php?context='+encodeURIComponent(id),free.jar)).status,403)
}
assert.equal((await call('student/tutor.php?category=ability',a.jar)).data.contexts.length,50)
assert.equal((await call('student/tutor.php?category=ability&offset=50',a.jar)).data.contexts.length,25)
const reviewer=JSON.parse(php('tests/pro/fixture.php','reviewer')),owner=new Map([['cssv_owner_session',reviewer.token],['cssv_owner_csrf',reviewer.csrf]])
const topic=JSON.parse(php('tests/topics/fixture.php','definition','test-only-skills-source-'+randomUUID()))
const imported=await call('admin/topics.php',owner,{action:'import',request_id:randomUUID(),expected_revision:0,topic})
assert.equal(imported.status,200,JSON.stringify(imported.data))
const context='topic:'+topic.id+':'+imported.data.version_id+':'+topic.sections[0].id,path='student/tutor.php?context='+encodeURIComponent(context)
assert.equal((await call(path,a.jar)).status,404,'Draft source exposed to teaching')
const publication=await call('admin/topics.php',owner,{action:'publish',request_id:randomUUID(),expected_revision:imported.data.revision,topic_id:topic.id,version_id:imported.data.version_id,reviewed:true,review_note:'TEST ONLY synthetic source validation; no production data or real academic publication.'})
assert.equal(publication.status,200,JSON.stringify(publication.data))
php('tests/skills/fixture.php','normalize-topic',imported.data.version_id)
const source=await call(path,a.jar);assert.equal(source.status,200,JSON.stringify(source.data));assert.ok(source.data.context.text.includes(topic.sections[0].blocks[0]));assert.equal(source.data.context.sources.length,topic.sections[0].reference_ids.length)
assert.equal((await call(path,free.jar)).status,403)
const removed=await call('admin/topics.php',owner,{action:'unpublish',request_id:randomUUID(),expected_revision:publication.data.revision,topic_id:topic.id});assert.equal(removed.status,200)
assert.equal((await call(path,a.jar)).status,404,'Withdrawn teaching source exposed')
assert.equal((await call('student/ai-usage.php',a.jar)).data.operations.length,0)
console.log('PASS scoped source integration: 25 Ability unit contexts, pagination, deterministic key withholding, Free denial, draft/reviewed/withdrawn topic lifecycle, one-section references and zero model calls')
