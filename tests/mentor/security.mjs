import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const env = { ...process.env }; for (const k of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[k]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER ? execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', ...args], { env, encoding: 'utf8' }).trim() : execFileSync('php', args, { env, encoding: 'utf8' }).trim()
async function call(path, body, jar = new Map(), extra = {}) {
 const headers = { Accept: 'application/json', 'User-Agent': 'CSSVistaMentorIsolation', ...extra }
 if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
 if (body) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] ??= jar.get('cssv_csrf') || '' }
 const r = await fetch('http://localhost:4173/api/' + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
 for (const c of r.headers.getSetCookie()) { const p = c.split(';')[0], i = p.indexOf('='); jar.set(p.slice(0, i), p.slice(i + 1)) }
 return { status: r.status, data: await r.json(), headers: r.headers }
}
async function user(label) { const email = `mentor-${label}-${randomUUID()}@example.invalid`, id = php('tests/current-affairs/setup.php', 'user', email), jar = new Map(); assert.equal((await call('auth/login.php', { email, password: 'TEST ONLY native fixture password' }, jar)).status, 200); return { id, jar } }
const a = await user('free'), b = await user('other'), incomplete = await user('incomplete'), endpoint = 'student/mentor.php'
const settings = { action: 'attempt_save', expected_version: 0, target_year: 2027, target_date: null, daily_minutes: 120, stage: 'starting', optional_subject_ids: [] }
const make = async u => (await call('student/learning.php', { ...settings, request_id: randomUUID() }, u.jar)).data.attempt_id
const attempt = await make(a), bAttempt = await make(b)
assert.equal((await call(endpoint)).status, 401); assert.equal((await call(endpoint, undefined, a.jar, { 'X-CSSV-User': b.id })).status, 409)
php('tests/pro/fixture.php', 'incomplete', incomplete.id); assert.equal((await call(endpoint, undefined, incomplete.jar)).status, 403)
const initial = await call(endpoint, undefined, a.jar); assert.equal(initial.status, 200); assert.equal(initial.data.summary.first.percentage, null); assert.match(initial.headers.get('cache-control'), /no-store/)
const subject = initial.data.catalog[0].slug
const question = { action: 'question_save', request_id: randomUUID(), expected_version: 0, attempt_id: attempt, subject_id: subject, topic: 'TEST ONLY institutions', question: 'TEST ONLY practice question for independent human evaluation.', provenance: 'practice', source_reference: '' }
assert.equal((await call(endpoint, question, a.jar, { 'X-CSRF-Token': 'wrong' })).status, 403)
assert.equal((await call(endpoint, { ...question, attempt_id: bAttempt }, a.jar)).status, 404)
assert.equal((await call(endpoint, { ...question, user_id: b.id }, a.jar)).status, 422)
assert.equal((await call(endpoint, { ...question, provenance: 'official' }, a.jar)).status, 422)
assert.equal((await call(endpoint, { ...question, provenance: 'student_past_paper' }, a.jar)).status, 422)
const saved = await call(endpoint, question, a.jar); assert.equal(saved.status, 200, JSON.stringify(saved.data)); const id = saved.data.answer_id
assert.equal((await call(endpoint, question, a.jar)).data.answer_id, id)
assert.equal((await call(endpoint, { ...question, topic: 'changed' }, a.jar)).status, 409)
const get = async u => call(`${endpoint}?id=${id}`, undefined, u.jar)
assert.equal((await get(b)).status, 404); assert.equal((await call(endpoint + '?attempt=' + attempt, undefined, b.jar)).status, 404)
assert.equal((await get(a)).data.answer.status, 'not_attempted')
const date = '2026-01-01'
const evaluation = { action: 'evaluation_save', request_id: randomUUID(), id, expected_version: 1, obtained_marks: 0, maximum_marks: 20, evaluation_date: date, mentor_comment: 'TEST ONLY mentor comment', correction_reason: '' }
assert.equal((await call(endpoint, evaluation, a.jar)).status, 409, 'Unwritten answer scored')
const written = { action: 'written_save', request_id: randomUUID(), id, expected_version: 1, written_date: date }
assert.equal((await call(endpoint, written, b.jar)).status, 404)
assert.equal((await call(endpoint, written, a.jar)).data.version, 2); assert.equal((await call(endpoint, written, a.jar)).data.version, 2)
assert.equal((await get(a)).data.answer.percentage, null, 'Written action fabricated marks')
for (const invalid of [{ obtained_marks: -1 }, { obtained_marks: 21 }, { obtained_marks: 10.5 }, { maximum_marks: 0 }, { evaluation_date: '2100-01-01' }, { evaluation_date: '2000-01-01' }]) assert.equal((await call(endpoint, { ...evaluation, ...invalid, expected_version: 2, request_id: randomUUID() }, a.jar)).status, 422)
const marks = { ...evaluation, expected_version: 2 }; assert.equal((await call(endpoint, marks, a.jar)).data.version, 3)
assert.equal((await get(a)).data.answer.percentage, 0, 'Zero score became absent')
assert.equal((await call(endpoint, { ...written, request_id: randomUUID(), expected_version: 3 }, a.jar)).status, 409)
assert.equal((await call(endpoint, { ...marks, request_id: randomUUID(), expected_version: 3, obtained_marks: 10 }, a.jar)).status, 422, 'Correction without reason accepted')
const correction = { ...marks, request_id: randomUUID(), expected_version: 3, obtained_marks: 10, correction_reason: 'TEST ONLY original entry transcribed incorrectly' }
const competing = await Promise.all([call(endpoint, correction, a.jar), call(endpoint, { ...correction, request_id: randomUUID(), obtained_marks: 12 }, a.jar)])
assert.deepEqual(competing.map(r => r.status).sort(), [200, 409]); let record = (await get(a)).data.answer
assert.equal(record.evaluations.length, 2); assert.equal(record.evaluations[1].obtained_marks, 0, 'Original mentor entry overwritten')
if (competing[0].status === 200) assert.equal((await call(endpoint, correction, a.jar)).data.version, 4)
const repeatBody = { action: 'retry_save', request_id: randomUUID(), id, expected_version: 4 }
const repeatRace = await Promise.all([call(endpoint, repeatBody, a.jar), call(endpoint, { ...repeatBody, request_id: randomUUID() }, a.jar)])
assert.deepEqual(repeatRace.map(r => r.status).sort(), [200, 409], 'Two concurrent repeat requests created duplicate attempts')
const repeatId = repeatRace.find(r => r.status === 200).data.answer_id
assert.equal((await call(endpoint, { ...repeatBody, request_id: randomUUID() }, b.jar)).status, 404)
assert.equal((await call(`${endpoint}?id=${repeatId}`, undefined, a.jar)).data.answer.root_id, id)
await call(endpoint, { ...written, request_id: randomUUID(), id: repeatId }, a.jar)
assert.equal((await call(endpoint, { ...marks, request_id: randomUUID(), id: repeatId, obtained_marks: 20 }, a.jar)).status, 200)
let overview = (await call(endpoint, undefined, a.jar)).data
assert.equal(overview.summary.first.count, 1); assert.equal(overview.summary.retries.percentage, 100)
assert.equal(overview.summary.first.obtained, record.obtained_marks, 'Retry changed baseline')
const another = (await call(endpoint, { ...question, request_id: randomUUID(), topic: 'TEST ONLY larger denominator', provenance: 'student_past_paper', source_reference: 'TEST ONLY personally supplied reference; not official verification' }, a.jar)).data.answer_id
await call(endpoint, { ...written, id: another, request_id: randomUUID() }, a.jar)
await call(endpoint, { ...marks, id: another, obtained_marks: 90, maximum_marks: 100, request_id: randomUUID() }, a.jar)
overview = (await call(endpoint, undefined, a.jar)).data
assert.equal(overview.summary.first.percentage, Math.round(1000 * (90 + record.obtained_marks) / 120) / 10)
assert.equal((await call(endpoint + '?minimum=90&provenance=student_past_paper', undefined, a.jar)).data.answers.length, 1)
assert.equal((await call(endpoint + '?minimum=90&maximum=10', undefined, a.jar)).status, 422)
assert.equal((await call(endpoint + '?from=2026-01-02&to=2026-01-01', undefined, a.jar)).status, 422)
assert.equal((await call(endpoint + '?from=2026-01-02', undefined, a.jar)).data.summary.first.percentage, null)
assert.equal((await call(endpoint + '?topic=TEST%20ONLY%20institutions', undefined, a.jar)).data.summary.first.count, 1)
assert.equal((await call(endpoint + '?offset=-1', undefined, a.jar)).status, 422)
assert.equal((await get(a)).data.answer.series.length, 2)
php('tests/pro/fixture.php', 'expire', a.id); assert.equal((await get(a)).status, 200)
assert.equal((await call(endpoint, { ...question, request_id: randomUUID() }, a.jar)).status, 200, 'Expiry removed this free human-record capability')
php('tests/mentor/fixture.php', 'pages', a.id, attempt)
const page = (await call(endpoint, undefined, a.jar)).data, next = (await call(endpoint + '?offset=50', undefined, a.jar)).data
assert.equal(page.answers.length, 50); assert.equal(page.has_more, true); assert.equal(next.has_more, false)
assert.deepEqual(next.summary, page.summary, 'History page changed evidence denominator')
assert.equal(new Set([...page.answers, ...next.answers].map(a => a.id)).size, page.answers.length + next.answers.length)
assert.equal(php('tests/mentor/fixture.php', 'usage', a.id), '0', 'Human evaluation made an AI operation')
for (const file of ['_mentor.php', '_mentor_core.php', '_mentor_schema.php']) assert.equal((await fetch('http://localhost:4173/api/' + file)).status, 404)
console.log('PASS: native human mentor ownership/profile/CSRF/account-switch, honest provenance, written/evaluated transitions, integer/date validation, replay and concurrent correction preservation, retry separation, weighted/all-page/filter summaries, expiry continuity, private helper protection and zero AI operations.')
