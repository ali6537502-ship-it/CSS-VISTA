import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Isolated CI database required')
const base = 'http://localhost:4173/api/'
const edition = JSON.parse(await readFile('test-artifacts/edition.json', 'utf8'))
const admin = JSON.parse(await readFile('test-artifacts/admin-session.json', 'utf8'))
async function call(path, body, jar = new Map(), extra = {}) {
  const headers = { Accept: 'application/json', 'User-Agent': 'CSSVistaIsolationTest', ...extra }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + v).join('; ')
  if (body) {
    headers['Content-Type'] = 'application/json'
    if (!('X-CSRF-Token' in extra)) headers['X-CSRF-Token'] = jar.get('cssv_csrf') || jar.get('cssv_owner_csrf') || ''
  }
  const response = await fetch(base + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(';')[0]; jar.set(part.slice(0, part.indexOf('=')), part.slice(part.indexOf('=') + 1)) }
  const data = await response.json().catch(() => ({}))
  return { status: response.status, data, headers: response.headers }
}
async function user(email) {
  const id = execFileSync('php', ['tests/current-affairs/setup.php', 'user', email], { encoding: 'utf8' }).trim()
  const jar = new Map()
  const result = await call('auth/login.php', { email, password: 'TEST ONLY native fixture password' }, jar)
  assert.equal(result.status, 200, JSON.stringify(result.data))
  return { jar, email, id }

}
assert.equal((await call('current-affairs.php')).status, 401)
assert.equal((await call('admin/current-affairs.php')).status, 401)
assert.equal((await call('current-affairs/publish.php', edition)).status, 401)
const a = await user('isolation-a@example.invalid'), b = await user('isolation-b@example.invalid')
const first = await call('current-affairs.php?view=feed', undefined, a.jar)
assert.equal(first.status, 200, JSON.stringify(first.data))
assert.equal(first.data.items.length, 2, 'Deployed Git edition did not import automatically')
assert.match(first.headers.get('cache-control'), /no-store/)
assert.equal((await call('current-affairs.php?view=feed', undefined, b.jar)).data.items.length, 2, 'Shared edition missing for second student')
const id = edition.stories[0].id
const byCategory=await call('current-affairs.php?category='+encodeURIComponent(edition.stories[0].category),undefined,a.jar)
assert.ok(byCategory.data.items.every((item)=>item.category===edition.stories[0].category))
assert.ok((await call('current-affairs.php?q=TEST',undefined,a.jar)).data.items.length>0,'Archive search did not find sourced test stories')
assert.equal((await call('current-affairs.php?from=2000-01-01&to=2000-01-01',undefined,a.jar)).data.items.length,0)
assert.equal((await call('current-affairs.php?view=archive',undefined,a.jar)).data.days[0].publication_date,edition.date)
assert.equal((await call('current-affairs.php?view=story&id='+id,undefined,a.jar)).data.story.sources[0].title,edition.stories[0].sources[0].title)
assert.equal((await call('current-affairs.php?view=factbook',undefined,a.jar)).data.items[0].statistics[0].value,edition.stories[0].statistics[0].value)
assert.equal((await call('current-affairs.php',{action:'preferences',reading_mode:'full',preferred_categories:[edition.stories[0].category],display_name:'Fixture Reader'},a.jar)).status,200)
const preferences=await call('current-affairs.php?view=preferences',undefined,a.jar)
assert.equal(preferences.data.preferences.reading_mode,'full')
assert.equal(preferences.data.display_name,'Fixture Reader')
assert.equal((await call('current-affairs.php?view=preferences',undefined,b.jar)).data.preferences.reading_mode,'quick')
assert.equal((await call('current-affairs.php', { action: 'bookmark', id, saved: true }, a.jar, { 'X-CSRF-Token': 'wrong' })).status, 403)
assert.equal((await call('current-affairs.php', { action: 'bookmark', id, saved: true, user_id: a.id }, b.jar)).status, 422)
assert.equal((await call('current-affairs.php', { action: 'bookmark', id, saved: true }, a.jar)).status, 200)
assert.equal((await call('current-affairs.php?saved=1', undefined, a.jar)).data.items.length, 1)
assert.equal((await call('current-affairs.php?saved=1&user_id=' + a.id, undefined, b.jar)).data.items.length, 0)
assert.equal((await call('current-affairs.php', { action: 'reading', id, status: 'read' }, a.jar)).data.reading_status, 'read')
assert.equal((await call('current-affairs.php', { action: 'reading', id, status: 'opened' }, a.jar)).data.reading_status, 'read', 'Opening must not downgrade a read item')
assert.equal((await call('current-affairs.php', { action: 'reading', id, status: 'opened' }, b.jar)).data.reading_status, 'opened')
assert.equal((await call('current-affairs.php?reading=read', undefined, a.jar)).data.items.length, 1)
assert.equal((await call('current-affairs.php?reading=read', undefined, b.jar)).data.items.length, 0)
assert.equal((await call('current-affairs.php', undefined, a.jar, { 'X-CSSV-User': b.id })).status, 409)
assert.equal((await call('admin/current-affairs.php', { action: 'unpublish', date: edition.date }, a.jar)).status, 401)
const owner = new Map([['cssv_owner_session', admin.token], ['cssv_owner_csrf', admin.csrf]])
assert.equal((await call('admin/current-affairs.php', { action: 'publish', dataset: edition }, owner)).data.status, 'unchanged')
const invalid = structuredClone(edition); invalid.stories[0].statistics[0].source = 'No such source'
assert.equal((await call('admin/current-affairs.php', { action: 'publish', dataset: invalid }, owner)).status, 422)
const conflict = structuredClone(edition)
conflict.date = '2099-01-01'; conflict.published_at = '2099-01-01T00:00:00+05:00'
assert.equal((await call('admin/current-affairs.php', { action: 'publish', dataset: conflict }, owner)).status, 409)
assert.equal((await call('current-affairs.php', undefined, a.jar)).data.items.length, 2, 'Failed edition damaged published data')
assert.equal((await call('admin/current-affairs.php', { action: 'unpublish', date: edition.date }, owner)).status, 200)
assert.equal((await call('current-affairs.php', undefined, a.jar)).data.items.length, 0, 'Unchanged Git data must not undo unpublishing')
assert.equal((await call('admin/current-affairs.php', { action: 'publish', dataset: edition }, owner)).status, 200)
assert.equal((await call('current-affairs.php?saved=1', undefined, a.jar)).data.items.length, 1, 'Unpublishing lost saved state')
const publisher = await call('admin/current-affairs.php', { action: 'create_token', label: 'CI publisher' }, owner)
assert.equal(publisher.status, 200)
assert.equal((await call('current-affairs/publish.php', edition, new Map(), { Authorization: 'Bearer ' + publisher.data.token })).data.status, 'unchanged')
await call('admin/current-affairs.php', { action: 'revoke_token', id: publisher.data.id }, owner)
assert.equal((await call('current-affairs/publish.php', edition, new Map(), { Authorization: 'Bearer ' + publisher.data.token })).status, 401)
assert.equal((await call('auth/logout.php', {}, a.jar)).status, 200)
assert.equal((await call('current-affairs.php', undefined, a.jar)).status, 401)
await call('auth/login.php', { email: a.email, password: 'TEST ONLY native fixture password' }, a.jar)
assert.equal((await call('current-affairs.php?saved=1', undefined, a.jar)).data.items.length, 1)
execFileSync('php', ['tests/current-affairs/setup.php', 'expire', a.id])
assert.equal((await call('current-affairs.php', undefined, a.jar)).status, 401, 'Expired session accepted')
for (const path of ['_briefing_release/catalog.php', '_briefing_release/' + edition.date + '.php']) assert.equal((await call(path)).status, 404)
for (const file of await readdir('dist/assets')) if (file.endsWith('.js')) {
  const source=await readFile('dist/assets/'+file,'utf8')
  assert.equal(source.includes(process.env.CSSV_APP_SECRET),false,'Server secret found in browser bundle')
  assert.equal(source.includes(edition.stories[0].headline),false,'Protected edition found in browser bundle')
}
console.log('PASS: automatic Git release ingestion, shared editions, source validation, rollback, per-user isolation, CSRF, expiry, logout persistence, admin access and token revocation.')
