import test from 'node:test'
import assert from 'node:assert/strict'
import { remainingSeconds } from '../src/hooks/useAccurateCountdown.ts'

test('countdowns derive time from a deadline instead of interval tick counts', () => {
  assert.equal(remainingSeconds(65_000, 5_000), 60)
  assert.equal(remainingSeconds(65_001, 5_000), 61)
  assert.equal(remainingSeconds(5_000, 65_000), 0)
})

test('countdowns fail safely for invalid clock values', () => {
  assert.equal(remainingSeconds(Number.NaN, 0), 0)
  assert.equal(remainingSeconds(1000, Number.POSITIVE_INFINITY), 0)
})
