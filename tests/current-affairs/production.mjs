// Read-only deployment checks. No student credentials or test news are sent.
import assert from 'node:assert/strict'
const origin = 'https://www.css-vista.com'
const expectedSha = String(process.env.EXPECTED_DEPLOY_SHA || '').trim().toLowerCase()
assert.match(expectedSha, /^[0-9a-f]{40}$/, 'EXPECTED_DEPLOY_SHA must be the exact 40-character Git SHA for this workflow run')

async function get(path) {
  const separator = path.includes('?') ? '&' : '?'
  const cacheBustedPath = `${path}${separator}deploy_check=${expectedSha}&ts=${Date.now()}`
  return fetch(origin + cacheBustedPath, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } })
}

let exactDeploymentReady = false
for (let attempt = 1; attempt <= 30; attempt++) {
  try {
    const response = await get('/deployment-fingerprint.json')
    const fingerprint = await response.json().catch(() => ({}))
    const liveSha = String(fingerprint.gitSha || '').toLowerCase()
    console.log(`Deployment fingerprint attempt ${attempt}: HTTP ${response.status}, live=${liveSha || 'missing'}, expected=${expectedSha}`)
    if (response.status === 200 && fingerprint.schemaVersion === 1 && fingerprint.source === 'git-rev-parse-head' && liveSha === expectedSha) {
      exactDeploymentReady = true
      break
    }
  } catch {
    console.log(`Deployment fingerprint attempt ${attempt}: production endpoint did not respond.`)
  }
  if (attempt < 30) await new Promise((resolve) => setTimeout(resolve, 10000))
}
assert.ok(exactDeploymentReady, `Hostinger has not deployed the exact workflow SHA ${expectedSha}. Route HTTP 200 responses are not accepted as deployment proof.`)

let ready = false
for (let attempt = 1; attempt <= 18; attempt++) {
  try {
    const api = await get('/api/current-affairs.php')
    const data = await api.json().catch(() => ({}))
    if (api.status === 401 && data.ok === false) {
      const session = await (await get('/api/auth/session.php')).json()
      if (session.provider === 'hostinger') {
        const retired = await get('/api/account-migration.php')
        if (retired.status === 410 && (await retired.json()).error === 'migration_closed') {
          ready = true
          break
        }
      }
    }
    console.log('Waiting for the production briefing endpoint: HTTP ' + api.status)
  } catch {
    console.log('Waiting for the production briefing endpoint to respond.')
  }
  if (attempt < 18) await new Promise((resolve) => setTimeout(resolve, 10000))
}
assert.ok(ready, 'Hostinger has not exposed the authenticated briefing endpoint for the exact deployed SHA. Check deployment and private database configuration.')
const health = await (await get('/api/health.php')).json()
assert.equal(health.database?.reachable, true, 'Production database is not reachable')
assert.equal(health.database?.schema_ready, true, 'Existing account schema is not ready')
assert.equal(health.configured?.native_accounts, true, 'Native Hostinger accounts are not deployed')
for (const path of ['/daily-briefing','/account','/account/dashboard','/account/current-affairs','/account/current-affairs/archive','/account/factbook','/account/saved','/account/search','/account/settings']) {
  const response = await get(path)
  const html = await response.text()
  assert.equal(response.status, 200, path + ' is not deployed')
  assert.match(html, /id="root"/, path + ' did not return the application shell')
  if (path.startsWith('/account')) assert.ok(/noindex/i.test(response.headers.get('x-robots-tag') || '') || /<meta[^>]+name="robots"[^>]+noindex/i.test(html), path + ' is not protected from indexing')
  console.log('PASS: ' + path)
}
for (const path of ['/api/admin/current-affairs.php','/api/current-affairs.php?view=story&id=deployment-check']) {
  const response = await get(path)
  assert.equal(response.status, 401, path + ' must require authentication')
  assert.match(response.headers.get('cache-control') || '', /no-store/)
}
for (const path of ['/api/_briefing_release/catalog.php','/api/_current_affairs.php','/api/_mpt_papers/manifest.php','/api/_mpt_papers/paper-001.php','/api/_mpt_core.php']) assert.ok([403,404].includes((await get(path)).status), 'Internal release material is accessible: ' + path)
// The MPT flag endpoint must be reachable (an .htaccess <Files> rule once denied it).
{
  const response = await get('/api/mpt/flow.php')
  assert.equal(response.status, 200, '/api/mpt/flow.php must be reachable on Hostinger')
  assert.equal(typeof (await response.json()).enabled, 'boolean', '/api/mpt/flow.php must return the flag')
}
console.log(`PASS: exact deployment fingerprint ${expectedSha}, production routes, anonymous content protection, private response caching and backend readiness. Authenticated Current Affairs visibility must still be verified by the publishing workflow with an authorized account.`)
