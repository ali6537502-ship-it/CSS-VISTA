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
  const email = `ability-${label}-${randomUUID()}@example.invalid`, id = php('tests/current-affairs/setup.php', 'user', email), jar = new Map()
  assert.equal((await call('auth/login.php', jar, { email, password: 'TEST ONLY native fixture password' })).status, 200)
  return { id, jar }
}
const a = await user('active'), b = await user('other'), free = await user('free'), incomplete = await user('incomplete'), endpoint = 'student/ability.php'
assert.equal((await call(endpoint)).status, 401)
assert.equal((await call(endpoint, free.jar)).status, 403)
php('tests/pro/fixture.php', 'incomplete', incomplete.id)
assert.equal((await call(endpoint, incomplete.jar)).status, 403)
php('tests/precis/fixture.php', 'activate', a.id); php('tests/precis/fixture.php', 'activate', b.id)
assert.equal((await call(endpoint, a.jar, undefined, { 'X-CSSV-User': b.id })).status, 409)
const overview = await call(endpoint, a.jar), version = overview.data.course_version
assert.equal(overview.status, 200); assert.equal(overview.data.units.length, 25)
assert.match(overview.headers.get('cache-control'), /no-store/)
assert.equal(overview.data.units.filter(u => u.complete).length, 0)
const raw = JSON.parse(readFileSync(new URL('../../public/api/_premium_files/general-ability-course.json', import.meta.url))), first = raw.units[0], lesson = first.lessons[0]
for (const unit of raw.units) {
  const response = await call(`${endpoint}?unit=${unit.id}`, a.jar)
  assert.equal(response.status, 200, unit.id)
  for (const l of response.data.unit.lessons) for (const key of ['answer', 'proof', 'explanation']) assert.equal(l.exercise[key], undefined)
  for (const q of response.data.unit.quiz) for (const key of ['answer', 'proof', 'explanation']) assert.equal(q[key], undefined)
}
const make = fields => ({ request_id: randomUUID(), course_version: version, unit: first.id, ...fields })
const base = make({ action: 'exercise', lesson: lesson.id, answer: '0' })
assert.equal((await call(endpoint, a.jar, base, { 'X-CSRF-Token': 'wrong' })).status, 403)
assert.equal((await call(endpoint, free.jar, base)).status, 403)
assert.equal((await call(endpoint, a.jar, { ...base, correct: true, score: 100 })).status, 422)
assert.equal((await call(endpoint, a.jar, { ...base, course_version: '0'.repeat(64) })).status, 409)
assert.equal((await call(endpoint, a.jar, { ...base, lesson: raw.units[1].lessons[0].id })).status, 404)
assert.equal((await call(endpoint, a.jar, { ...base, answer: '1/0' })).status, 422)
const wrong = await call(endpoint, a.jar, base)
assert.equal(wrong.status, 200); assert.equal(wrong.data.feedback.correct, false)
const repeated = await Promise.all([call(endpoint, a.jar, base), call(endpoint, a.jar, base)])
assert.ok(repeated.every(r => r.data.response_id === wrong.data.response_id))
assert.equal(JSON.parse(php('tests/ability/fixture.php', a.id)).responses, 1)
assert.equal((await call(endpoint, a.jar, { ...base, answer: lesson.exercise.answer })).status, 409)
assert.equal((await call(`${endpoint}?request_id=${base.request_id}`, b.jar)).status, 404)
assert.equal((await call(`${endpoint}?request_id=${base.request_id}`, a.jar)).data.response_id, wrong.data.response_id)
for (const l of first.lessons) assert.equal((await call(endpoint, a.jar, make({ action: 'exercise', lesson: l.id, answer: l.exercise.answer }))).data.feedback.correct, true)
assert.equal((await call(endpoint, a.jar)).data.units[0].complete, false, 'Exercises alone manufactured completion')
const choices = Object.fromEntries(first.quiz.map(q => [q.id, q.answer])), quiz = make({ action: 'quiz', choices })
const failedChoices = { ...choices, [first.quiz[0].id]: (first.quiz[0].answer + 1) % 4, [first.quiz[1].id]: (first.quiz[1].answer + 1) % 4 }
assert.equal((await call(endpoint, a.jar, { ...quiz, choices: {} })).status, 422)
const failed = await call(endpoint, a.jar, { ...quiz, request_id: randomUUID(), choices: failedChoices })
assert.equal(failed.data.feedback.score, 60); assert.equal(failed.data.feedback.passed, false)
assert.equal((await call(endpoint, a.jar)).data.units[0].complete, false)
const passed = await call(endpoint, a.jar, quiz); assert.equal(passed.data.feedback.score, 100)
assert.equal((await call(endpoint, a.jar)).data.units[0].complete, true)
assert.equal((await call(endpoint, b.jar)).data.units[0].complete, false)
const reversed = { ...quiz, choices: Object.fromEntries(Object.entries(choices).reverse()) }
assert.equal((await call(endpoint, a.jar, reversed)).data.response_id, passed.data.response_id)
await call(endpoint, a.jar, { ...quiz, request_id: randomUUID(), choices: failedChoices })
assert.equal((await call(endpoint, a.jar)).data.units[0].complete, true, 'Retake deleted earned progress')
const position = make({ action: 'position', lesson: first.lessons[2].id })
assert.equal((await call(endpoint, a.jar, position)).status, 200)
assert.equal((await call(endpoint, a.jar)).data.position.lesson_id, first.lessons[2].id)
const before = (await call(`${endpoint}?view=history`, a.jar)).data.history.length
php('tests/pro/fixture.php', 'expire', a.id)
assert.equal((await call(endpoint, a.jar)).status, 403)
assert.equal((await call(endpoint, a.jar, make({ action: 'exercise', lesson: lesson.id, answer: lesson.exercise.answer }))).status, 403)
assert.equal((await call(endpoint, a.jar, quiz)).data.response_id, passed.data.response_id, 'Expiry broke exact receipt replay')
assert.equal((await call(`${endpoint}?view=history`, a.jar)).data.history.length, before)
assert.equal((await call(`${endpoint}?view=history`, b.jar)).data.history.length, 0)
php('tests/precis/fixture.php', 'activate', a.id)
assert.equal((await call(endpoint, a.jar)).data.units[0].complete, true, 'Renewal lost study history')
assert.equal(JSON.parse(php('tests/ability/fixture.php', a.id)).ai_operations, 0)
for (const path of ['_ability.php', '_ability_core.php', '_ability_schema.php', '_premium_files/general-ability-course.json']) assert.ok([403, 404].includes((await fetch('http://localhost:4173/api/' + path)).status))
console.log('PASS: all 25 native course topics, Pro/profile/CSRF/ownership, hidden keys, server grading/completion, concurrent receipt replay, history/expiry/renewal, private files and zero AI calls.')
