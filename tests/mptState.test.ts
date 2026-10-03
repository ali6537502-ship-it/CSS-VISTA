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

test('every daily sitting has a distinct name and Pakistan time', async () => {
  const { mockSlot, mockSlotLabel, mockTimeWindow } = await import('../src/lib/mpt/copy.ts')
  assert.equal(mockSlotLabel({ exam_open_at: '2026-10-01T09:00:00.000Z' }), 'Afternoon MPT Mock · 2:00 PM PKT')
  assert.equal(mockSlotLabel({ exam_open_at: '2026-10-01T13:00:00.000Z' }), 'Evening MPT Mock · 6:00 PM PKT')
  // 14:00, 18:00 and 22:30 PKT (UTC+5).
  assert.equal(mockSlot('2026-10-01T10:00:00.000Z'), 'Afternoon')
  assert.equal(mockSlot('2026-10-01T17:30:00.000Z'), 'Night')
  assert.equal(mockSlot('2026-10-01T04:00:00.000Z'), 'Morning')
  assert.equal(mockSlotLabel({ exam_open_at: '2026-10-01T10:00:00.000Z' }), 'Afternoon MPT Mock · 3:00 PM PKT')
  assert.equal(mockSlotLabel({ exam_open_at: '2026-10-01T17:30:00.000Z' }), 'Night MPT Mock · 10:30 PM PKT')
  assert.equal(mockTimeWindow({ exam_open_at: '2026-10-01T10:00:00.000Z', exam_end_at: '2026-10-01T13:20:00.000Z' }), '3:00 PM – 6:20 PM PKT')
})
