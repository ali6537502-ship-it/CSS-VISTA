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
const base = 'http://localhost:4173'
async function call(path, jar = new Map(), body, extra = {}) {
  const headers = { 'User-Agent': 'CSSVistaPaidAccessIsolation', ...extra }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  if (body) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = jar.get('cssv_csrf') || '' }
  const response = await fetch(base + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  for (const cookie of response.headers.getSetCookie()) { const p = cookie.split(';')[0], i = p.indexOf('='); jar.set(p.slice(0, i), p.slice(i + 1)) }
  const text = await response.text()
  return { status: response.status, text, headers: response.headers, json: () => JSON.parse(text) }
}
const jar = new Map(), email = `paid-access-${randomUUID()}@example.invalid`
const id = php('tests/current-affairs/setup.php', 'user', email)
assert.equal((await call('/api/auth/login.php', jar, { email, password: 'TEST ONLY native fixture password' })).status, 200)
const files = ['study-material/essay-themes.json', 'one-liner-gk/general-ability.json', 'one-liner-gk/current-affairs-archive.json', 'one-liner-gk/pakistan-current-affairs.json', 'mcq/cat-general-ability-0.json', 'mcq/cat-current-affairs-0.json', 'css-subject-mcqs/current-affairs.json', 'recent-affairs/batch-2026-07-11_2026-08-16.json', 'magazines/css-vista-current-affairs-weekly-03-september-2026.pdf']
const paths = files.flatMap(file => ['/' + file, '/api/student/premium-content.php?file=' + file])
paths.push('/api/current-affairs.php', '/api/student/mentor.php', '/api/student/premium-content.php?file=current-affairs-issues', '/api/student/premium-content.php?file=current-affairs-topics')
for (const path of paths) {
  assert.equal((await call(path)).status, 401, 'Anonymous access: ' + path)
  const locked = await call(path, jar)
  assert.equal(locked.status, 403, 'Free account access: ' + path)
  assert.equal(locked.json().error, 'pro_required')
  assert.match(locked.headers.get('cache-control'), /no-store/)
}
const shared = '/api/student/premium-content.php?file=css-subject-mcqs/general-science-and-ability.json'
const freeScience = (await call(shared, jar)).json()
assert.ok(freeScience.length > 0)
assert.ok(freeScience.every(q => !['Basic arithmetic', 'Number patterns', 'Numerical ability', 'Arithmetic and percentages'].includes(q.topic)))
const precise = await call('/api/student/precis.php', jar)
assert.equal(precise.status, 200)
assert.equal(precise.json().catalog, null, 'Free account received the Précis course')
assert.equal((await call('/api/current-affairs.php?view=preferences', jar)).status, 200, 'Paid Current Affairs blocked free account settings')
const attemptResponse = await call('/api/student/learning.php', jar, { action: 'attempt_save', request_id: randomUUID(), expected_version: 0, target_year: 2027, target_date: null, daily_minutes: 60, stage: 'starting', optional_subject_ids: [] })
assert.equal(attemptResponse.status, 200)
const draft = { action: 'writing_save', request_id: randomUUID(), expected_version: 0, attempt_id: attemptResponse.json().attempt_id, kind: 'precis', title: 'TEST ONLY Précis', text: 'TEST ONLY private practice draft.' }
assert.equal((await call('/api/student/learning.php', jar, draft)).status, 403, 'Free account saved paid Précis practice')
assert.equal((await call('/api/student/premium-content.php?file=../config.php', jar)).status, 404)
assert.equal((await call('/api/_premium_files/current-affairs-issues.json', jar)).status, 404)
php('tests/precis/fixture.php', 'activate', id)
assert.equal((await call('/api/student/learning.php', jar, draft)).status, 200, 'Active Pro could not save Précis practice')
for (const path of paths) {
  const allowed = await call(path, jar)
  assert.equal(allowed.status, 200, 'Active Pro access: ' + path + ' ' + allowed.text.slice(0, 120))
  assert.match(allowed.headers.get('cache-control'), /no-store/)
  if (path.endsWith('.pdf')) assert.equal(allowed.headers.get('content-type'), 'application/pdf')
}
const full = (await call(shared, jar)).json()
assert.equal(full.length, JSON.parse(readFileSync('public/css-subject-mcqs/general-science-and-ability.json', 'utf8')).length)
assert.ok(full.length > freeScience.length)
const overview = await call('/api/student/mentor.php', jar)
php('tests/pro/fixture.php', 'expire', id)
for (const path of paths) assert.equal((await call(path, jar)).status, 403, 'Expired Pro access: ' + path)
assert.deepEqual((await call(shared, jar)).json(), freeScience, 'Expiry exposed Ability or removed free Science')
php('tests/precis/fixture.php', 'activate', id)
assert.deepEqual((await call('/api/student/mentor.php', jar)).json(), overview.json(), 'Membership expiry altered saved answer records')
console.log('PASS: anonymous/free/active/expired access for direct files and native APIs; private no-store JSON/PDF delivery; Précis catalog protection; free Science preservation; helper/path protection and renewal continuity.')
