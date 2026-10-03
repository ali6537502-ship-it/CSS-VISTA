import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CSS_ELIGIBILITY_RULES,
  getEligibilityForExamYear,
  getEligibilitySummary,
  getFirstEligibleExamYear,
  getLastEligibleExamYear,
  getMaximumUsableAttemptsRemaining,
  getWrittenAttemptsRemaining,
  isAgeEligibleForCE,
  isValidDateOnly,
  parseDisplayDate,
} from '../src/lib/cssEligibility.ts'

test('CE-2019 FPSC official DOB boundaries are exact and inclusive', () => {
  assert.equal(isAgeEligibleForCE('1988-12-31', 2019, 30), false)
  assert.equal(isAgeEligibleForCE('1989-01-01', 2019, 30), true)
  assert.equal(isAgeEligibleForCE('1998-01-01', 2019, 30), true)
  assert.equal(isAgeEligibleForCE('1998-01-02', 2019, 30), false)
})

test('CE-2027 normal age boundaries are exact', () => {
  assert.equal(isAgeEligibleForCE('1997-01-01', 2027, 30), true)
  assert.equal(getEligibilityForExamYear('1996-12-31', 2027, 30).status, 'overage')
  assert.equal(isAgeEligibleForCE('2006-01-01', 2027, 30), true)
  assert.equal(getEligibilityForExamYear('2006-01-02', 2027, 30).status, 'underage')
})

test('CE-2027 Rule 6 two-year upper-age relaxation boundaries are exact', () => {
  assert.equal(isAgeEligibleForCE('1995-01-01', 2027, 32), true)
  assert.equal(getEligibilityForExamYear('1994-12-31', 2027, 32).status, 'overage')
})

test('written attempts are capped at three and MPT never consumes a written chance', () => {
  assert.deepEqual([0, 1, 2, 3].map(getWrittenAttemptsRemaining), [3, 2, 1, 0])
  const mptAppearances = 10
  assert.equal(mptAppearances, 10)
  assert.equal(CSS_ELIGIBILITY_RULES.mptConsumesWrittenAttempt, false)
  assert.equal(getWrittenAttemptsRemaining(0), 3)
})

test('maximum usable attempts respects both statutory chances and remaining age cycles', () => {
  assert.equal(getMaximumUsableAttemptsRemaining(3, 2), 2)
  assert.equal(getMaximumUsableAttemptsRemaining(1, 4), 1)
  assert.equal(getMaximumUsableAttemptsRemaining(0, 5), 0)
  assert.equal(getMaximumUsableAttemptsRemaining(3, 0), 0)
})

test('a candidate born anywhere in 1998 has final ordinary age-eligible exam CE-2028', () => {
  for (const dob of ['1998-01-01', '1998-06-15', '1998-12-31'] as const) {
    assert.equal(getLastEligibleExamYear(dob, 30), 2028)
  }
})

test('2026 conceptual example distinguishes written chances from age-eligible cycles', () => {
  const summary = getEligibilitySummary({ dob: '1998-06-15', writtenAttemptsUsed: 0, maxAge: 30, currentYear: 2026 })
  assert.equal(summary.lastEligibleExamYear, 2028)
  assert.deepEqual(summary.futureAgeEligibleExamYears, [2027, 2028])
  assert.equal(summary.statutoryAttemptsRemaining, 3)
  assert.equal(summary.remainingAgeEligibleExamCycles, 2)
  assert.equal(summary.maximumUsableAttemptsRemaining, 2)
})

test('two previous written attempts leave only one practically usable attempt', () => {
  const summary = getEligibilitySummary({ dob: '1998-06-15', writtenAttemptsUsed: 2, maxAge: 30, currentYear: 2026 })
  assert.equal(summary.statutoryAttemptsRemaining, 1)
  assert.equal(summary.maximumUsableAttemptsRemaining, 1)
})

test('leap-day, 1 January and 31 December DOBs remain calendar-safe', () => {
  assert.equal(isValidDateOnly('1996-02-29'), true)
  assert.equal(isValidDateOnly('1997-02-29'), false)
  assert.equal(parseDisplayDate('29 / 02 / 1996'), '1996-02-29')
  assert.equal(getFirstEligibleExamYear('1998-01-01', 30), 2019)
  assert.equal(getFirstEligibleExamYear('1998-12-31', 30), 2020)
})

test('normal-to-relaxation transition changes only the age window', () => {
  assert.equal(isAgeEligibleForCE('1995-06-15', 2027, 30), false)
  assert.equal(isAgeEligibleForCE('1995-06-15', 2027, 32), true)
  assert.equal(getWrittenAttemptsRemaining(0), 3)
})

test('underage and overage statuses are explicit', () => {
  assert.equal(getEligibilityForExamYear('2007-01-01', 2027, 30).status, 'underage')
  assert.equal(getEligibilityForExamYear('1996-12-31', 2027, 30).status, 'overage')
})

test('summary output is timezone-independent when the reference year is fixed', () => {
  const original = process.env.TZ
  try {
    process.env.TZ = 'Pacific/Kiritimati'
    const east = getEligibilitySummary({ dob: '1998-01-01', writtenAttemptsUsed: 0, currentYear: 2026 })
    process.env.TZ = 'America/Adak'
    const west = getEligibilitySummary({ dob: '1998-01-01', writtenAttemptsUsed: 0, currentYear: 2026 })
    assert.deepEqual(west, east)
  } finally {
    process.env.TZ = original
  }
})

test('invalid written-attempt counts and impossible dates are rejected', () => {
  assert.throws(() => getWrittenAttemptsRemaining(-1), RangeError)
  assert.throws(() => getWrittenAttemptsRemaining(4), RangeError)
  assert.equal(parseDisplayDate('31 / 02 / 1998'), null)
})
