import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
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
async function mailToken(email, kind, previous = null) {
  const files = await readdir('test-artifacts/account-mail')
  for (const file of files.reverse()) {
    const raw = await readFile('test-artifacts/account-mail/' + file, 'utf8')
    if (raw.includes(email) && raw.includes(`?${kind}=1#token=`)) { const token = raw.match(/#token=([A-Za-z0-9_-]{64})/)?.[1]; if (token && token !== previous) return token }
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
assert.equal((await call('auth/forgot-password.php', { email }, a)).status, 202)
const expiredReset = await mailToken(email, 'reset', reset)
execFileSync('php', ['tests/account-native/expire.php', email])
assert.equal((await call('auth/reset-password.php', { token: expiredReset, password: next })).status, 400, 'Expired recovery token accepted')
// All twelve saved profile checks are enforced by the real API.
assert.equal((await call('auth/session.php', undefined, a)).data.user.profile_complete, false)
for (const [path, body] of [['current-affairs.php',undefined],['student/progress.php',undefined],['factbook/data.php',{table:'factbook_subjects',operation:'select'}],['student/test-series.php',{}],['student/reports.php',{}]]) {
  const blocked = await call(path, body, a)
  assert.equal(blocked.status,403,path); assert.equal(blocked.data.error,'profile_incomplete',path)
}
const completeProfile={display_name:'TEST ONLY Reader',phone:'+923001234567',whatsapp:'',date_of_birth:'2000-01-01',gender:'Other',city:'TEST ONLY City',province_region:'TEST ONLY Region',country:'Pakistan',css_attempt_year:2027,preparation_level:'Starting out',optional_subjects:['TEST ONLY Subject'],education:'TEST ONLY Degree'}
assert.equal((await call('student/profile.php',{...completeProfile,education:['malformed']},a)).status,422)
const details = await call('student/profile.php',completeProfile,a)
assert.equal(details.status,200,JSON.stringify(details.data));assert.equal(details.data.completion.completed,11)
assert.equal((await call('current-affairs.php',undefined,a)).status,403,'Missing photo unlocked services')
const profilePhoto = new FormData(); profilePhoto.append('photo',new Blob([Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCACgAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDhqKKKk8kKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9k=','base64')],{type:'image/jpeg'}),'test-only.jpg')
const photoSaved = await call('student/photo.php',profilePhoto,a)
assert.equal(photoSaved.status,200,JSON.stringify(photoSaved.data));assert.equal(photoSaved.data.completion.completed,12)
assert.equal((await call('auth/session.php',undefined,a)).data.user.profile_complete,true)
for (const key of ['display_name','phone','date_of_birth','gender','city','province_region','country','css_attempt_year','preparation_level','optional_subjects','education']) {
  if(key==='display_name') { assert.equal((await call('student/profile.php',{...completeProfile,display_name:''},a)).status,422);continue }
  const partial={...completeProfile,[key]:key==='optional_subjects'?[]:key==='css_attempt_year'?null:''}
  const saved=await call('student/profile.php',partial,a)
  assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.completion.complete,false,key)
  assert.equal((await call('current-affairs.php',undefined,a)).data.error,'profile_incomplete',key)
  assert.equal((await call('student/profile.php',completeProfile,a)).data.completion.complete,true)
}
assert.equal((await call('auth/session.php',undefined,a)).data.user.profile_complete,true)
assert.equal((await call('student/progress.php', { payload: {} }, a, {}, 'PUT')).status, 200, 'New account progress could not sync')
const otherEmail = 'native-second@example.invalid'
const otherId = execFileSync('php', ['tests/current-affairs/setup.php', 'user', otherEmail], { encoding: 'utf8' }).trim()
assert.equal((await call('auth/login.php', { email: otherEmail, password: 'TEST ONLY native fixture password' }, b)).status, 200)
assert.equal((await call('student/progress.php', { payload: { 'cssvista:v1': { test: 'private progress' } } }, a, {}, 'PUT')).status, 200)
assert.notDeepEqual((await call('student/progress.php', undefined, b)).data.payload, { 'cssvista:v1': { test: 'private progress' } })
assert.equal((await call('student/progress.php', { payload: {} }, b, { 'X-CSSV-User': id }, 'PUT')).status, 409)
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
assert.equal((await call('admin/account-mail-settings.php', undefined, a)).status, 401)
assert.equal((await call('student/reports.php', { question_id: 'TEST ONLY question', note: 'TEST ONLY report' }, a)).status, 201)
const ownerSession = JSON.parse(await readFile('test-artifacts/admin-session.json', 'utf8'))
const owner = new Map([['cssv_owner_session', ownerSession.token], ['cssv_owner_csrf', ownerSession.csrf]])
assert.equal((await call('admin/content.php', { content: { caTopics: [], priceOverrides: {}, updates: [] } }, owner)).status, 200)
assert.deepEqual((await call('content.php')).data.data.content.updates, [])
assert.equal((await call('admin/account-mail.php', undefined, owner)).data.transport, 'php-test')
const mailSettings = await call('admin/account-mail-settings.php', undefined, owner)
assert.equal(mailSettings.status, 200)
assert.equal(mailSettings.data.configured, true)
assert.equal(mailSettings.data.config_writable, false)
assert.equal('password' in mailSettings.data, false)
assert.equal((await call('auth/logout.php', {}, a)).status, 200)
assert.equal((await db(query('factbook_entries', 'select'))).status, 401)
assert.equal((await call('auth/login.php', { email, password }, a)).status, 200)
assert.equal((await db(query('factbook_entries', 'select'))).data.data[0].id, entry)
assert.equal((await db({ action: 'delete_all', confirmation: 'wrong' })).status, 422)
assert.equal((await db({ action: 'delete_all', confirmation: 'DELETE MY FACTBOOK' })).status, 200)
assert.equal((await db(query('factbook_subjects', 'select'))).data.data.length, 0)
assert.equal((await call('factbook/media.php?id=' + mediaId, undefined, a)).status, 404)
for (const file of await readdir('dist/assets')) if (file.endsWith('.js')) assert.doesNotMatch(await readFile('dist/assets/' + file, 'utf8'), /supabase\.co|sb_publishable_|@supabase/)
execFileSync('php',['tests/account-native/expire.php',otherEmail,'clear-test-rate'])
// Hostinger recovery codes are one-use, expire and allow at most five guesses.
async function latestCode(email) {
  const directory='test-artifacts/account-mail'
  const files=await Promise.all((await readdir(directory)).map(async file=>({file,modified:(await stat(directory+'/'+file)).mtimeMs})))
  files.sort((left,right)=>right.modified-left.modified)
  for (const {file} of files) {
    const raw=await readFile('test-artifacts/account-mail/'+file,'utf8')
    if(raw.includes(email)) {
      const code=raw.match(/password reset code: ([0-9]{6})/)?.[1]
      if(code){assert.match(raw,new RegExp(`For account: ${email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));return code}
    }
  }
  throw new Error('No native reset code captured')
}
assert.equal((await call('auth/forgot-password.php',{email},a)).status,202)
const primaryCode=await latestCode(email)
execFileSync('php',['tests/account-native/seed-stale-mail.php',email])
const capturedBefore=new Set(await readdir('test-artifacts/account-mail'))
assert.equal((await call('auth/forgot-password.php',{email:otherEmail},b)).status,202)
const newlyCaptured=(await readdir('test-artifacts/account-mail')).filter(file=>!capturedBefore.has(file))
assert.equal(newlyCaptured.length,1,'A reset request delivered an unrelated queued message')
assert.match(await readFile('test-artifacts/account-mail/'+newlyCaptured[0],'utf8'),new RegExp(`To: ${otherEmail}`))
const firstCode=await latestCode(otherEmail)
assert.notEqual(primaryCode,firstCode,'Two accounts received the same active reset code')
assert.equal((await call('auth/reset-password.php',{email:otherEmail,code:primaryCode,password:next})).status,400,'Another account code was accepted')
const linkedToken=await mailToken(otherEmail,'reset')
assert.equal((await call('auth/reset-password.php',{email:otherEmail,code:firstCode,password:next})).status,200)
assert.equal((await call('auth/reset-password.php',{email:otherEmail,code:firstCode,password})).status,400)
assert.equal((await call('auth/reset-password.php',{token:linkedToken,password})).status,400,'Code reset left old link usable')
assert.equal((await call('auth/session.php',undefined,b)).data.authenticated,false)
assert.equal((await call('auth/login.php',{email:otherEmail,password:next},b)).status,200)
assert.equal((await call('auth/forgot-password.php',{email:otherEmail},b)).status,202)
const guessedCode=await latestCode(otherEmail)
const wrongCode=guessedCode==='000000'?'000001':'000000'
for(let i=0;i<5;i++)assert.equal((await call('auth/reset-password.php',{email:otherEmail,code:wrongCode,password})).status,400)
assert.equal((await call('auth/reset-password.php',{email:otherEmail,code:guessedCode,password})).status,400,'Five-guess limit was bypassed')
assert.equal((await call('auth/forgot-password.php',{email:otherEmail},b)).status,202)
const expiredCode=await latestCode(otherEmail)
execFileSync('php',['tests/account-native/expire.php',otherEmail])
assert.equal((await call('auth/reset-password.php',{email:otherEmail,code:expiredCode,password})).status,400,'Expired code accepted')
assert.equal((await call('auth/forgot-password.php',{email:otherEmail},b)).status,202)
assert.equal((await call('auth/forgot-password.php',{email:otherEmail},b)).status,429,'Recovery request limit was not enforced')
console.log('PASS: native registration, email verification, password recovery, single-use tokens, old-session revocation, password change, cookie security, all 12 mandatory profile checks and unlock/relock, private factbook CRUD/search/revisions/media/collections, cross-user isolation, rollback, owner CMS and persistence.')
