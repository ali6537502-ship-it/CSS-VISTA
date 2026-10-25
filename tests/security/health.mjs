import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable CI database required')
const base = 'http://localhost:4173/api/'
const fixture = JSON.parse(execFileSync('php', ['tests/security/health-fixture.php'], { encoding: 'utf8' }))
async function get(path, cookie = '', method = 'GET') {
  const response = await fetch(base + path, { method, headers: { Cookie: cookie } })
  assert.match(response.headers.get('cache-control') || '', /no-store/)
  return { status: response.status, data: await response.json() }
}
const publicHealth = await get('health.php')
assert.equal(publicHealth.status, 200)
assert.deepEqual(publicHealth.data, { ok: true })
assert.equal((await get('health.php', '', 'POST')).status, 405)
for (const cookie of ['', `${fixture.admin_cookie}=invalid`, `cssv_session=${fixture.student}`, ...['pending', 'expired', 'revoked'].map((state) => `${fixture.admin_cookie}=${fixture.sessions[state]}`)]) {
  const denied = await get('admin/health.php', cookie)
  assert.equal(denied.status, 401)
  assert.equal(denied.data.error, 'admin_authentication_required')
  for (const key of ['runtime', 'configured', 'database']) assert.equal(key in denied.data, false)
}
const owner = await get('admin/health.php', `${fixture.admin_cookie}=${fixture.sessions.verified}`)
assert.equal(owner.status, 200)
assert.equal(owner.data.ok, true)
assert.equal(owner.data.database.reachable, true)
assert.equal(typeof owner.data.runtime.pdo_mysql, 'boolean')
assert.equal(owner.data.configured.native_accounts, true)
for (const name of ['CSSV_APP_SECRET', 'CSSV_DB_PASSWORD']) assert.equal(JSON.stringify(owner.data).includes(process.env[name]), false, name + ' leaked')
console.log('PASS: minimal public liveness; private diagnostics reject anonymous, student, pending-MFA, expired and revoked sessions; verified MFA owner retains diagnostics.')
