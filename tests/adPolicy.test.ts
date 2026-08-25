import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AD_ACTIVE_TIME_MS,
  AD_COOLDOWN_MS,
  adContentIdentity,
  advanceActiveTime,
  claimAdOpportunity,
  createAdSessionState,
  getAdRoutePolicy,
  registerEligiblePageVisit,
} from '../src/lib/ads.ts'

test('strictly excluded routes fail closed with no reserved height', () => {
  const excluded = [
    '/',
    '/mpt',
    '/mpt/mock',
    '/gk',
    '/gk/quiz',
    '/five-minute',
    '/test-series',
    '/css-mcqs',
    '/answer-timer',
    '/past-papers/view/css-2025',
    '/notes/view/criminology/cybercrime',
    '/account',
    '/dashboard',
    '/exam-intelligence',
    '/privacy',
    '/not-a-real-route',
  ]

  excluded.forEach((path) => {
    const policy = getAdRoutePolicy(path)
    assert.equal(policy.eligible, false, path)
    assert.equal(policy.minimumHeight, 0, path)
  })
})

test('only substantial informational routes are eligible', () => {
  const eligible = [
    '/start-css',
    '/subjects/compulsory',
    '/subjects/compulsory/essay',
    '/subjects/optional',
    '/notes',
    '/past-papers',
    '/past-papers/css/2025',
    '/current-affairs',
    '/fpsc-syllabus',
    '/gk/cat/geography',
  ]

  eligible.forEach((path) => {
    const policy = getAdRoutePolicy(path)
    assert.equal(policy.eligible, true, path)
    assert.ok(policy.minimumHeight >= 250, path)
  })
})

test('current-affairs questions are excluded while informational tabs remain eligible', () => {
  assert.equal(getAdRoutePolicy('/current-affairs', '?tab=mcqs').eligible, false)
  assert.equal(getAdRoutePolicy('/current-affairs', '?tab=issue-files').eligible, true)
  assert.equal(getAdRoutePolicy('/current-affairs', '?tab=magazine').eligible, true)
})

test('filters, tabs, hashes, refreshes, and history restoration do not increment the counter', () => {
  let state = createAdSessionState()
  const first = registerEligiblePageVisit(state, { eligible: true, path: '/current-affairs', entryKey: 'a', at: 1_000 })
  state = first.state
  assert.equal(first.counted, true)
  assert.equal(state.eligiblePageCount, 1)

  for (const value of [
    { path: '/current-affairs?tab=issue-files', entryKey: 'b', at: 3_000 },
    { path: '/current-affairs#topic', entryKey: 'c', at: 5_000 },
    { path: '/current-affairs', entryKey: 'a', at: 7_000 },
  ]) {
    const repeated = registerEligiblePageVisit(state, { eligible: true, ...value })
    state = repeated.state
    assert.equal(repeated.counted, false)
  }
  assert.equal(state.eligiblePageCount, 1)
  assert.equal(adContentIdentity('/current-affairs?tab=issue-files#topic'), '/current-affairs')
})

test('every third distinct eligible page produces one page-count condition', () => {
  let state = createAdSessionState()
  const paths = ['/start-css', '/notes', '/past-papers', '/analysis', '/fpsc-updates', '/current-affairs']
  const due: number[] = []

  paths.forEach((path, index) => {
    const visit = registerEligiblePageVisit(state, {
      eligible: true,
      path,
      entryKey: `entry-${index}`,
      at: 10_000 + index * 2_000,
    })
    state = visit.state
    if (visit.thirdPageDue) due.push(index + 1)
  })

  assert.deepEqual(due, [3, 6])
  assert.equal(state.eligiblePageCount, 6)
})

test('excluded pages between eligible pages do not affect the third-page sequence', () => {
  let state = createAdSessionState()
  for (const [index, input] of [
    { eligible: true, path: '/start-css' },
    { eligible: true, path: '/notes' },
    { eligible: false, path: '/gk/quiz' },
    { eligible: true, path: '/past-papers' },
  ].entries()) {
    const visit = registerEligiblePageVisit(state, {
      ...input,
      entryKey: `entry-${index}`,
      at: 20_000 + index * 2_000,
    })
    state = visit.state
    if (index === 2) assert.equal(visit.thirdPageDue, false)
    if (index === 3) assert.equal(visit.thirdPageDue, true)
  }
  assert.equal(state.eligiblePageCount, 3)
})

test('active-time accumulation pauses when presence conditions are false', () => {
  let elapsed = 0
  for (let second = 0; second < 30; second += 1) elapsed = advanceActiveTime(elapsed, 1_000, true)
  for (let second = 0; second < 120; second += 1) elapsed = advanceActiveTime(elapsed, 1_000, false)
  assert.equal(elapsed, 30_000)
  for (let second = 0; second < 30; second += 1) elapsed = advanceActiveTime(elapsed, 1_000, true)
  assert.equal(elapsed, AD_ACTIVE_TIME_MS)
})

test('one opportunity handles both conditions and enforces cooldown', () => {
  const now = 100_000
  const first = claimAdOpportunity(createAdSessionState(), {
    entryKey: 'entry-third',
    at: now,
    trigger: 'combined',
  })
  assert.equal(first.claimed, true)

  const duplicate = claimAdOpportunity(first.state, {
    entryKey: 'entry-third',
    at: now + AD_COOLDOWN_MS + 1,
    trigger: 'delayed',
  })
  assert.equal(duplicate.claimed, false)
  assert.equal(duplicate.pendingCooldown, false)

  const cooled = claimAdOpportunity(first.state, {
    entryKey: 'entry-next',
    at: now + 1_000,
    trigger: 'third-page',
  })
  assert.equal(cooled.claimed, false)
  assert.equal(cooled.pendingCooldown, true)

  const afterCooldown = claimAdOpportunity(first.state, {
    entryKey: 'entry-next',
    at: now + AD_COOLDOWN_MS + 1,
    trigger: 'third-page',
  })
  assert.equal(afterCooldown.claimed, true)
})
