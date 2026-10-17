import test from 'node:test'
import assert from 'node:assert/strict'
import { remainingSeconds, signedRemainingSeconds } from '../src/hooks/useAccurateCountdown.ts'

test('countdowns derive time from a deadline instead of interval tick counts', () => {
  assert.equal(remainingSeconds(65_000, 5_000), 60)
  assert.equal(remainingSeconds(65_001, 5_000), 61)
  assert.equal(remainingSeconds(5_000, 65_000), 0)
})

test('countdowns fail safely for invalid clock values', () => {
  assert.equal(remainingSeconds(Number.NaN, 0), 0)
  assert.equal(remainingSeconds(1000, Number.POSITIVE_INFINITY), 0)
})

test('answer-writing overtime continues below zero without changing standard countdowns', () => {
  assert.equal(signedRemainingSeconds(65_000, 5_000), 60)
  assert.equal(signedRemainingSeconds(65_000, 65_000), 0)
  assert.equal(signedRemainingSeconds(65_000, 66_000), -1)
  assert.equal(signedRemainingSeconds(65_000, 365_000), -300)
  assert.equal(remainingSeconds(65_000, 365_000), 0)
})

test('overtime helpers safely reject invalid clock values', () => {
  assert.equal(signedRemainingSeconds(Number.NaN, 0), 0)
  assert.equal(signedRemainingSeconds(1000, Number.POSITIVE_INFINITY), 0)
})
