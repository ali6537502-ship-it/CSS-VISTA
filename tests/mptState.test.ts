import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCandidateMockState, rollVisibleAt, timeAllowanceSeconds } from '../src/lib/mpt/state.ts'
import { formatRollNumber, isWellFormedRollNumber, normaliseRollNumber } from '../src/lib/mpt/rollNumber.ts'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/mpt-state-cases.json', import.meta.url), 'utf8'))

for (const item of fixture.cases) {
  test(`state engine mirror: ${item.name}`, () => {
    const state = getCandidateMockState(item.mock, item.session, item.application, item.attempt, Date.parse(item.now), item.signedIn)
    for (const [key, expected] of Object.entries(item.expect)) {
      const actual = ['phase', 'primary_action', 'exam_in_progress', 'next_transition_at'].includes(key)
        ? state[key as 'phase']
        : state.timestamps[key as 'exam_open_at']
      assert.deepEqual(actual, expected, `${key}`)
    }
  })
}

test('three reveal cases from Section 1A', () => {
  const open = Date.parse('2026-10-01T10:00:00Z')
  assert.equal(rollVisibleAt(open - 7_200_000, open, 10), open - 7_200_000 + 600_000)
  assert.equal(rollVisibleAt(open - 300_000, open, 10), open)
  assert.equal(rollVisibleAt(open + 180_000, open, 10), open + 180_000)
})

test('late entrants get only the remaining time', () => {
  const open = Date.parse('2026-10-01T10:00:00Z')
  const end = open + 200 * 60_000
  assert.equal(timeAllowanceSeconds(open - 1000, open, end), 12_000)
  assert.equal(timeAllowanceSeconds(open + 8 * 60_000, open, end), 192 * 60)
  assert.equal(timeAllowanceSeconds(end + 1, open, end), 0)
})

test('roll number typo check matches the server Damm digit', () => {
  // 48291 -> Damm check digit 8 (same table as public/api/_mpt_core.php).
  assert.equal(isWellFormedRollNumber('482918'), true)
  assert.equal(isWellFormedRollNumber('482 918'), true)
  assert.equal(isWellFormedRollNumber('482917'), false)
  assert.equal(isWellFormedRollNumber('428918'), false)
  assert.equal(isWellFormedRollNumber('082918'), false)
  assert.equal(isWellFormedRollNumber('48291'), false)
  assert.equal(normaliseRollNumber(' 482 917 '), '482917')
  assert.equal(formatRollNumber('482917'), '482 917')
})
