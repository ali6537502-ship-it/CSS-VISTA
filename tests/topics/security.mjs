import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test')
  throw new Error('Disposable database required')
const env = { ...process.env }
for (const key of [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
])
  delete env[key]
const php = (...args) =>
  process.env.CSSV_TEST_PHP_CONTAINER
    ? execFileSync(
        'docker',
        [
          '--host=unix:///var/run/docker.sock',
          'exec',
          process.env.CSSV_TEST_PHP_CONTAINER,
          'php',
          ...args,
        ],
        { env, encoding: 'utf8' },
      ).trim()
    : execFileSync('php', args, { env, encoding: 'utf8' }).trim()
async function call(path, body, jar = new Map(), extra = {}) {
  const headers = { Accept: 'application/json', 'User-Agent': 'CSSVistaTopicsIsolation', ...extra }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  if (body) {
    headers['Content-Type'] = 'application/json'
    headers['X-CSRF-Token'] ??= jar.get('cssv_csrf') || jar.get('cssv_owner_csrf') || ''
  }
  const response = await fetch('http://localhost:4173/api/' + path, {
    headers,
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  })
  for (const value of response.headers.getSetCookie()) {
    const part = value.split(';')[0],
      i = part.indexOf('=')
    jar.set(part.slice(0, i), part.slice(i + 1))
  }
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Non-JSON ${response.status} from ${path}: ${text.slice(0, 1200)}`)
  }
  return { status: response.status, data, headers: response.headers }
}
async function user(label) {
  const email = `topics-${label}-${randomUUID()}@example.invalid`,
    id = php('tests/current-affairs/setup.php', 'user', email),
    jar = new Map()
  assert.equal(
    (await call('auth/login.php', { email, password: 'TEST ONLY native fixture password' }, jar))
      .status,
    200,
  )
  return { id, jar }
}
async function attempt(user) {
  const result = await call(
    'student/learning.php',
    {
      action: 'attempt_save',
      request_id: randomUUID(),
      expected_version: 0,
      target_year: 2027,
      target_date: null,
      optional_subject_ids: [],
      daily_minutes: 90,
      stage: 'starting',
    },
    user.jar,
  )
  assert.equal(result.status, 200, JSON.stringify(result.data))
  return result.data.attempt_id
}
const reviewer = JSON.parse(php('tests/pro/fixture.php', 'reviewer')),
  owner = new Map([
    ['cssv_owner_session', reviewer.token],
    ['cssv_owner_csrf', reviewer.csrf],
  ])
const a = await user('a'),
  b = await user('b'),
  incomplete = await user('incomplete'),
  own = await attempt(a),
  second = await attempt(a),
  foreign = await attempt(b)
php('tests/topics/fixture.php', 'reset-rate')
const topicId = 'test-only-' + randomUUID(),
  source = JSON.parse(php('tests/topics/fixture.php', 'definition', topicId)),
  editor = 'admin/topics.php',
  endpoint = 'student/topics.php'
assert.equal((await call(endpoint)).status, 401)
assert.equal((await call(editor)).status, 401)
assert.equal((await call(editor, undefined, a.jar)).status, 401)
php('tests/pro/fixture.php', 'incomplete', incomplete.id)
assert.equal((await call(endpoint, undefined, incomplete.jar)).status, 403)
const importBody = {
  action: 'import',
  expected_revision: 0,
  request_id: randomUUID(),
  topic: source,
}
assert.equal((await call(editor, importBody, owner, { 'X-CSRF-Token': 'wrong' })).status, 403)
let imported = await call(editor, importBody, owner)
assert.equal(imported.status, 200, JSON.stringify(imported.data))
assert.equal(imported.data.publication, 'draft')
assert.equal(
  (await call(editor, importBody, owner)).data.version_id,
  imported.data.version_id,
  'Import replay duplicated source version',
)
assert.equal(
  (await call(editor, { ...importBody, topic: { ...source, title: 'changed request' } }, owner))
    .status,
  409,
)
assert.equal(
  (await call(endpoint + `?attempt=${own}`, undefined, a.jar)).data.items.some(
    (t) => t.id === topicId,
  ),
  false,
  'Draft appeared in library',
)
const publish = {
  action: 'publish',
  request_id: randomUUID(),
  expected_revision: 1,
  topic_id: topicId,
  version_id: imported.data.version_id,
  reviewed: true,
  review_note: 'TEST ONLY reviewed fixture mechanics; no real educational publication.',
}
assert.equal((await call(editor, { ...publish, reviewed: false }, owner)).status, 422)
const published = await call(editor, publish, owner)
assert.equal(published.status, 200, JSON.stringify(published.data))
assert.equal(published.data.revision, 2)
assert.equal(
  (await call(editor, publish, owner)).data.revision,
  2,
  'Publication replay changed revision',
)
const get = (u = a, id = own) =>
  call(`${endpoint}?attempt=${id}&topic=${topicId}`, undefined, u.jar)
let detail = await get()
assert.equal(detail.status, 200, JSON.stringify(detail.data))
assert.equal(detail.data.content, null, 'Free member received full lesson')
assert.match(detail.headers.get('cache-control'), /no-store/)
assert.equal((await get(b, own)).status, 404)
assert.equal((await get(a, foreign)).status, 404)
assert.equal(
  (await call(endpoint + `?attempt=${own}`, undefined, a.jar, { 'X-CSSV-User': b.id })).status,
  409,
)
php('tests/precis/fixture.php', 'activate', a.id)
detail = await get()
assert.ok(detail.data.content)
assert.equal(detail.data.progress.state, 'not_started')
for (const q of detail.data.content.questions) {
  assert.equal(q.answer, undefined)
  assert.equal(q.explanation, undefined)
}
const mutation = (action, extra = {}, request = randomUUID()) => ({
  action,
  request_id: request,
  attempt_id: own,
  topic_id: topicId,
  topic_version_id: detail.data.topic.version_id,
  content_hash: detail.data.topic.content_hash,
  expected_version: detail.data.progress.version,
  ...extra,
})
const act = async (body, user = a) => call(endpoint, body, user.jar)
const bookmark = mutation('bookmark', { bookmarked: true })
assert.equal((await act(bookmark)).status, 200)
assert.equal((await act(bookmark)).status, 200)
assert.equal(
  (await act({ ...bookmark, bookmarked: false })).status,
  409,
  'Different request intent reused receipt',
)
assert.equal(
  (await call(endpoint + '?request_id=' + bookmark.request_id, undefined, a.jar)).status,
  200,
)
assert.equal(
  (await call(endpoint + '?request_id=' + bookmark.request_id, undefined, b.jar)).status,
  404,
)
detail = await get()
assert.equal(detail.data.progress.state, 'not_started', 'Bookmark invented learning')
assert.equal(detail.data.progress.started_at, null)
assert.equal(
  (await call(endpoint, mutation('begin'), a.jar, { 'X-CSRF-Token': 'wrong' })).status,
  403,
)
assert.equal((await act({ ...mutation('begin'), content_hash: '0'.repeat(64) })).status, 409)
assert.equal((await act({ ...mutation('begin'), mastered: true })).status, 422)
assert.equal((await act(mutation('begin'), b)).status, 404)
assert.equal((await act(mutation('begin'))).status, 200)
detail = await get()
for (const s of source.sections) {
  assert.equal((await act(mutation('checkpoint', { section_id: s.id }))).status, 200)
  detail = await get()
}
assert.equal(
  detail.data.progress.state,
  'learning',
  'Study declarations manufactured understanding',
)
const answers = { 'learn-1': 0, 'learn-2': 1, 'learn-3': 2 },
  quiz = mutation('quiz', { choices: answers })
assert.equal((await act({ ...quiz, choices: { 'learn-1': 0 } })).status, 422)
const checked = await act(quiz)
assert.equal(checked.status, 200, JSON.stringify(checked.data))
assert.equal(checked.data.check.score, 100)
assert.equal(checked.data.state, 'understood')
assert.equal((await act(quiz)).data.check.score, 100, 'Exact quiz receipt not replayed')
detail = await get()
assert.equal(detail.data.progress.next_revision > detail.data.today, true)
assert.equal(
  (
    await act(
      mutation('review', { choices: { 'revision-1': 0, 'revision-2': 1, 'revision-3': 2 } }),
    )
  ).status,
  409,
  'Early recall accepted',
)
const draft = 'TEST ONLY student practice sentence with independent observations. '.repeat(7).trim()
assert.equal(
  (
    await act(
      mutation('draft', { notes: 'TEST ONLY private notes', draft, expected_draft_version: 0 }),
    )
  ).status,
  200,
)
detail = await get()
assert.equal(detail.data.progress.state, 'practised')
assert.equal(detail.data.progress.draft_version, 1)
assert.equal(
  (await act(mutation('draft', { notes: 'stale notes', draft, expected_draft_version: 0 }))).status,
  409,
  'Older draft overwrote saved writing',
)
const raced = await Promise.all([
  act(mutation('bookmark', { bookmarked: true })),
  act(mutation('bookmark', { bookmarked: false })),
])
assert.deepEqual(raced.map((r) => r.status).sort(), [200, 409], 'Concurrent devices lost topic CAS')
detail = await get()
php('tests/topics/fixture.php', 'due', a.id, own, detail.data.topic.version_id)
detail = await get()
assert.equal(detail.data.progress.state, 'revision_due')
assert.equal((await act(mutation('bookmark', { bookmarked: true }))).status, 200)
detail = await get()
const dueCatalog = (await call(endpoint + `?attempt=${own}`, undefined, a.jar)).data
assert.equal(dueCatalog.stats.due, 1, 'Persisted due work disappeared from due count')
assert.equal(dueCatalog.stats.mastered, 0, 'Due recall counted as current mastery')
assert.equal(
  (
    await act(
      mutation('review', { choices: { 'revision-1': 0, 'revision-2': 1, 'revision-3': 2 } }),
    )
  ).data.state,
  'mastered',
)
detail = await get()
assert.equal(detail.data.progress.review_count, 1)
php('tests/topics/fixture.php', 'due', a.id, own, detail.data.topic.version_id)
detail = await get()
assert.equal(
  (
    await act(
      mutation('review', { choices: { 'revision-1': 3, 'revision-2': 3, 'revision-3': 3 } }),
    )
  ).data.check.passed,
  false,
)
detail = await get()
assert.equal(detail.data.progress.review_count, 2, 'Failed recall erased cumulative review history')
php('tests/topics/fixture.php', 'due', a.id, own, detail.data.topic.version_id)
detail = await get()
assert.equal(
  (
    await act(
      mutation('review', { choices: { 'revision-1': 0, 'revision-2': 1, 'revision-3': 2 } }),
    )
  ).data.check.passed,
  true,
)
detail = await get()
assert.equal(
  detail.data.progress.next_revision,
  new Date(Date.parse(detail.data.today + 'T00:00:00Z') + 3 * 86400000).toISOString().slice(0, 10),
  'Failed recall skipped the first successful interval',
)
assert.equal(
  (await get(a, second)).data.progress.version,
  0,
  'Separate attempts inherited topic work',
)
const history = await call(
  `${endpoint}?view=history&attempt=${own}&topic=${topicId}`,
  undefined,
  a.jar,
)
assert.equal(history.status, 200)
assert.equal(history.data.records[0].notes, 'TEST ONLY private notes')
assert.equal(history.data.checks.length, 4)
assert.equal((await call(`${endpoint}?view=history&attempt=${own}`, undefined, b.jar)).status, 404)
const updated = {
  ...source,
  summary: 'TEST ONLY corrected source, preserving the original study record.',
}
imported = await call(
  editor,
  { action: 'import', request_id: randomUUID(), expected_revision: 2, topic: updated },
  owner,
)
assert.equal(imported.status, 200, JSON.stringify(imported.data))
assert.notEqual(imported.data.version_id, detail.data.topic.version_id)
assert.equal(
  (await get()).data.topic.version_id,
  detail.data.topic.version_id,
  'Draft replaced published edition',
)
assert.equal(
  (
    await call(
      editor,
      {
        ...publish,
        request_id: randomUUID(),
        expected_revision: 3,
        version_id: imported.data.version_id,
      },
      owner,
    )
  ).status,
  200,
)
assert.equal(
  (await act(mutation('begin'))).status,
  409,
  'Old source accepted new work after publication changed',
)
detail = await get()
assert.equal(detail.data.progress.state, 'not_started')
assert.equal(detail.data.progress.notes, '')
assert.equal(detail.data.older_versions, 1)
assert.equal(
  (await call(`${endpoint}?view=history&attempt=${own}&topic=${topicId}`, undefined, a.jar)).data
    .records[0].notes,
  'TEST ONLY private notes',
)
php('tests/pro/fixture.php', 'expire', a.id)
detail = await get()
assert.equal(detail.data.content, null, 'Expired member fetched premium lesson')
assert.equal((await act(mutation('begin'))).status, 403, 'Expired member began new premium work')
assert.equal(
  (await call(endpoint + '?request_id=' + quiz.request_id, undefined, a.jar)).status,
  200,
  'Expiry erased an accepted quiz receipt',
)
assert.equal(
  (await call(`${endpoint}?view=history&attempt=${own}&topic=${topicId}`, undefined, a.jar)).data
    .checks.length,
  4,
  'Expiry erased owned results',
)
assert.equal(
  (
    await call(
      editor,
      { action: 'unpublish', expected_revision: 4, request_id: randomUUID(), topic_id: topicId },
      owner,
    )
  ).status,
  200,
)
assert.equal((await get()).data.available, false)
assert.equal(
  (await get(b, foreign)).status,
  404,
  'Unpublished source disclosed to unrelated member',
)
assert.equal(
  (await call(endpoint + `?attempt=${own}`, undefined, a.jar)).data.items.some(
    (t) => t.id === topicId,
  ),
  false,
  'Unpublished topic remained in catalogue',
)
assert.equal(JSON.parse(php('tests/topics/fixture.php', 'counts', a.id, own)).ai_operations, 0)
assert.equal((await fetch('http://localhost:4173/api/_topics.php')).status, 404)
assert.equal((await fetch('http://localhost:4173/api/_topics_schema.php')).status, 404)
console.log(
  'PASS: native topic import/publish/replay, private content and hidden keys, member/profile/CSRF/expected-user guards, attempt ownership, exact receipts, source/draft/device conflicts, evidence states, due recall, immutable checks/editions, withdrawal, expiry history and zero AI calls.',
)
