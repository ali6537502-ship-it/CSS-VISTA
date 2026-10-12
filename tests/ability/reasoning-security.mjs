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
  const email = `reasoning-${label}-${randomUUID()}@example.invalid`, id = php('tests/current-affairs/setup.php', 'user', email), jar = new Map()
  assert.equal((await call('auth/login.php', jar, { email, password: 'TEST ONLY native fixture password' })).status, 200)
  return { id, jar }
}


const a=await user('course'),endpoint='student/ability.php';php('tests/precis/fixture.php','activate',a.id)
const course=JSON.parse(readFileSync(new URL('../../public/api/_premium_files/general-ability-course.json',import.meta.url)))
let overview=(await call(endpoint,a.jar)).data
const version=overview.course_version,first=course.units[0],body=fields=>({request_id:randomUUID(),course_version:version,...fields})
for(const lesson of first.lessons)assert.equal((await call(endpoint,a.jar,body({action:'exercise',unit:first.id,lesson:lesson.id,answer:lesson.exercise.answer}))).data.feedback.correct,true)
assert.equal((await call(endpoint,a.jar,body({action:'quiz',unit:first.id,choices:Object.fromEntries(first.quiz.map(q=>[q.id,q.answer]))}))).data.feedback.score,100)
const old=php('tests/ability/edition-fixture.php',a.id)
overview=(await call(endpoint,a.jar)).data
assert.equal(overview.units[0].complete,true,'Course update erased preserved maths evidence')
assert.equal(overview.position.unit_id,first.id)
assert.equal((await call(endpoint+'?unit='+first.id,a.jar)).data.latest.length,4)
assert.equal((await call(endpoint,a.jar,{...body({action:'exercise',unit:first.id,lesson:first.lessons[0].id,answer:first.lessons[0].exercise.answer}),course_version:old})).status,409,'Accepted stale new work')
for(const unit of course.units.slice(21)){
 const loaded=(await call(endpoint+'?unit='+unit.id,a.jar)).data
 assert.equal(loaded.compatible_versions.length,1,'New reasoning inherited fictional past evidence')
 for(const lesson of unit.lessons){
  assert.equal(loaded.unit.lessons.find(l=>l.id===lesson.id).exercise.answer,undefined)
  assert.equal((await call(endpoint,a.jar,body({action:'exercise',unit:unit.id,lesson:lesson.id,answer:'999'}))).status,422)
  const wrong=await call(endpoint,a.jar,body({action:'exercise',unit:unit.id,lesson:lesson.id,answer:String((lesson.exercise.answer+1)%4)}))
  assert.equal(wrong.data.feedback.correct,false)
  const right=await call(endpoint,a.jar,body({action:'exercise',unit:unit.id,lesson:lesson.id,answer:String(lesson.exercise.answer)}))
  assert.equal(right.data.feedback.correct,true);assert.equal(right.data.feedback.answer,lesson.exercise.options[lesson.exercise.answer])
 }
 assert.equal((await call(endpoint,a.jar,body({action:'quiz',unit:unit.id,choices:Object.fromEntries(unit.quiz.map(q=>[q.id,q.answer]))}))).data.feedback.score,100)
 assert.equal((await call(endpoint,a.jar)).data.units.find(u=>u.id===unit.id).complete,true)
}
assert.equal((await call('student/ai-usage.php',a.jar)).data.operations.length,0)
console.log('PASS native reasoning: all 12 practice checks and four quizzes, server keys, invalid/wrong/correct choices, preserved prior-edition maths evidence and last position, stale edition rejection and zero AI')
