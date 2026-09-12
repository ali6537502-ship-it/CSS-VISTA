import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable CI database required')
const base = 'http://localhost:4173/api/'
const a = new Map(), b = new Map()
async function call(path, body, jar = new Map(), extra = {}, method = body === undefined ? 'GET' : 'POST') {
  const headers = { Accept: 'application/json', 'User-Agent': 'CSSVistaNativeTest', ...extra }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && !('X-CSRF-Token' in headers)) headers['X-CSRF-Token'] = jar.get('cssv_csrf') || jar.get('cssv_owner_csrf') || ''
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) })
  for (const cookie of response.headers.getSetCookie()) { const first = cookie.split(';')[0]; jar.set(first.slice(0, first.indexOf('=')), first.slice(first.indexOf('=') + 1)) }
  const data = await response.json().catch(() => ({}))
  return { status: response.status, data, headers: response.headers }
}
async function mailToken(email, kind) {
  const files = await readdir('test-artifacts/account-mail')
  for (const file of files.reverse()) {
    const raw = await readFile('test-artifacts/account-mail/' + file, 'utf8')
    if (raw.includes(email) && raw.includes(`?${kind}=1#token=`)) return raw.match(/#token=([A-Za-z0-9_-]{64})/)?.[1]
  }
  throw new Error('Expected test email was not accepted by the local mail transport')
}
const email = 'native-recovery@example.invalid', password = 'TEST ONLY original password', next = 'TEST ONLY replacement password'
assert.equal((await call('auth/supabase-session.php', {})).status, 410)
assert.equal((await call('auth/register.php', { email, password, full_name: 'TEST ONLY Reader' }, a, { Origin: 'https://untrusted.invalid' })).status, 403)
assert.equal((await call('auth/register.php', { email, password, full_name: 'TEST ONLY Reader' }, a)).status, 202)
assert.equal((await call('auth/login.php', { email, password }, a)).status, 403, 'Unverified account signed in')
const verification = await mailToken(email, 'verify')
assert.ok(verification)
assert.equal((await call('auth/verify-email.php', { token: verification }, a)).status, 200)
assert.equal((await call('auth/verify-email.php', { token: verification }, a)).status, 400, 'Verification replay accepted')
const login = await call('auth/login.php', { email, password }, a)
assert.equal(login.status, 200, JSON.stringify(login.data))
const id = login.data.user.id
assert.ok(login.headers.getSetCookie().some((cookie) => cookie.startsWith('cssv_session=') && /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie)))
assert.equal((await call('auth/session.php', undefined, a)).data.user.id, id)
assert.equal((await call('auth/forgot-password.php', { email }, a)).status, 202)
assert.equal((await call('auth/forgot-password.php', { email: 'absent@example.invalid' })).status, 202)
const reset = await mailToken(email, 'reset')
assert.ok(reset)
const oldSession = new Map(a)
assert.equal((await call('auth/reset-password.php', { token: reset, password: next })).status, 200)
assert.equal((await call('auth/reset-password.php', { token: reset, password: next })).status, 400)
assert.equal((await call('auth/session.php', undefined, oldSession)).data.authenticated, false)
assert.equal((await call('auth/login.php', { email, password }, a)).status, 401)
assert.equal((await call('auth/login.php', { email, password: next }, a)).status, 200)
assert.equal((await call('auth/change-password.php', { current_password: next, password }, a, { 'X-CSRF-Token': 'wrong' })).status, 403)
assert.equal((await call('auth/change-password.php', { current_password: 'wrong', password }, a)).status, 422)
assert.equal((await call('auth/change-password.php', { current_password: next, password }, a)).status, 200)
const otherEmail = 'native-second@example.invalid'
const otherId = execFileSync('php', ['tests/current-affairs/setup.php', 'user', otherEmail], { encoding: 'utf8' }).trim()
assert.equal((await call('auth/login.php', { email: otherEmail, password: 'TEST ONLY native fixture password' }, b)).status, 200)
const query = (table, operation, values, filters = []) => ({ table, operation, values, filters })
const eq = (column, value) => ({ column, operator: 'eq', value })
async function db(body, jar = a) { return call('factbook/data.php', body, jar) }
assert.equal((await db(query('users', 'select'))).status, 422)
assert.equal((await call('factbook/data.php', query('factbook_subjects', 'select'))).status, 401)
const subjectResult = await db(query('factbook_subjects', 'insert', { name: 'TEST ONLY Economics', user_id: id }))
assert.equal(subjectResult.status, 200, JSON.stringify(subjectResult.data))
const subject = subjectResult.data.data[0].id
assert.equal((await db(query('factbook_subjects', 'select'), b)).data.data.length, 0)
assert.equal((await db(query('factbook_subjects', 'insert', { name: 'Attack', user_id: id }), b)).status, 403)
const categoryResult = await db(query('factbook_categories', 'insert', { name: 'TEST ONLY IMF', subject_id: subject }))
assert.equal(categoryResult.status, 200, JSON.stringify(categoryResult.data))
const category = categoryResult.data.data[0].id
assert.equal((await db(query('factbook_categories', 'update', { parent_id: category }, [eq('id', category)]))).status, 422)
assert.equal((await db(query('factbook_categories', 'insert', { name: 'Foreign', subject_id: subject }), b)).status, 404)
const draft = { subject_id: subject, category_id: category, title: 'TEST ONLY annual report', entry_type: 'statistic', content: { value: '42', year: '2099' }, importance: 'must-revise', revision_status: 'learning', bookmarked: true, personal_remarks: 'TEST ONLY', position: 0 }
const saved = await db({ action: 'save_entry', entry: draft, tags: ['TEST', 'test'], sources: [{ title: 'TEST ONLY primary source', web_address: 'https://example.invalid/report', position: 0 }] })
assert.equal(saved.status, 200, JSON.stringify(saved.data))
const entry = saved.data.data.id
assert.equal(saved.data.data.source_count, 1)
assert.equal((await db(query('factbook_entries', 'select', undefined, [{ column: 'search_text', operator: 'ilike', value: '%2099%' }]))).data.data.length, 1)
assert.equal((await db(query('factbook_subjects', 'select'))).data.data[0].entry_count, 1)
assert.equal((await db({ action: 'save_entry', entry: { ...draft, id: entry, title: 'TEST ONLY edited' }, tags: ['Revision'], sources: [] })).status, 200)
assert.equal((await db(query('factbook_revisions', 'select'))).data.data.length, 1)
assert.equal((await db(query('factbook_revisions', 'select'), b)).data.data.length, 0)
assert.equal((await db({ action: 'save_entry', entry: { ...draft, id: entry, title: 'Should roll back' }, tags: [], sources: [{ web_address: 'javascript:alert(1)' }] })).status, 422)
assert.equal((await db(query('factbook_entries', 'select'))).data.data[0].title, 'TEST ONLY edited')
assert.equal((await db(query('factbook_entries', 'update', { user_id: otherId }, [eq('id', entry)]))).status, 403)
assert.equal((await call('factbook/data.php', query('factbook_entries', 'select'), b, { 'X-CSSV-User': id })).status, 409)
const collection = (await db(query('factbook_collections', 'insert', { name: 'TEST ONLY revision' }))).data.data[0].id
assert.equal((await db({ action: 'collection_entries', collection_id: collection, entry_ids: [entry] })).status, 200)
assert.equal((await db({ action: 'collection_entries', collection_id: collection, entry_ids: [] }, b)).status, 404)
assert.equal((await db(query('factbook_preferences', 'upsert', { default_view: 'revision', source_reminders: true }))).status, 200)
const image = new FormData()
image.set('entry_id', entry); image.set('alt_text', 'TEST ONLY one pixel'); image.set('image', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8n8AAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'fixture.png')
const upload = await call('factbook/media.php', image, a)
assert.equal(upload.status, 201, JSON.stringify(upload.data))
const mediaId = upload.data.media.id
assert.equal((await call('factbook/media.php?id=' + mediaId, undefined, b)).status, 404)
assert.equal((await call('factbook/media.php?id=' + mediaId, undefined, a)).status, 200)
assert.equal((await call('factbook/media.php', { id: mediaId }, b, {}, 'DELETE')).status, 404)
assert.equal((await call('admin/content.php', { content: {} }, a)).status, 401)
assert.equal((await call('admin/test-series.php', undefined, a)).status, 401)
assert.equal((await call('student/reports.php', { question_id: 'TEST ONLY question', note: 'TEST ONLY report' }, a)).status, 201)
const ownerSession = JSON.parse(await readFile('test-artifacts/admin-session.json', 'utf8'))
const owner = new Map([['cssv_owner_session', ownerSession.token], ['cssv_owner_csrf', ownerSession.csrf]])
assert.equal((await call('admin/content.php', { content: { caTopics: [], priceOverrides: {}, updates: [] } }, owner)).status, 200)
assert.deepEqual((await call('content.php')).data.data.content.updates, [])
assert.equal((await call('admin/account-mail.php', undefined, owner)).data.transport, 'hostinger-php-mail')
assert.equal((await call('auth/logout.php', {}, a)).status, 200)
assert.equal((await db(query('factbook_entries', 'select'))).status, 401)
assert.equal((await call('auth/login.php', { email, password }, a)).status, 200)
assert.equal((await db(query('factbook_entries', 'select'))).data.data[0].id, entry)
assert.equal((await db({ action: 'delete_all', confirmation: 'wrong' })).status, 422)
assert.equal((await db({ action: 'delete_all', confirmation: 'DELETE MY FACTBOOK' })).status, 200)
assert.equal((await db(query('factbook_subjects', 'select'))).data.data.length, 0)
assert.equal((await call('factbook/media.php?id=' + mediaId, undefined, a)).status, 404)
for (const file of await readdir('dist/assets')) if (file.endsWith('.js')) assert.doesNotMatch(await readFile('dist/assets/' + file, 'utf8'), /supabase\.co|sb_publishable_|@supabase/)
console.log('PASS: native registration, email verification, password recovery, single-use tokens, old-session revocation, password change, cookie security, private factbook CRUD/search/revisions/media/collections, cross-user isolation, rollback, owner CMS and persistence.')
