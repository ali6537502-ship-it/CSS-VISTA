import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAPER_QUESTION_SECONDS, PAPER_TOTAL_SECONDS,
  parseSingleSnapshot, parsePaperSnapshot,
  restoredSingleSeconds, restoredPaperClocks,
  type PaperSnapshot, type SingleTimerSnapshot,
} from '../src/lib/answerTimerRecovery.ts'

const single: SingleTimerSnapshot = {
  minutes: 35,
  question: 'Constitutional development of Pakistan',
  remaining: 120,
  running: true,
  savedAt: 1_000_000,
}

const paper: PaperSnapshot = {
  questions: ['Q1', 'Q2', 'Q3', 'Q4'],
  current: 2,
  paused: true,
  times: [2600, 2700, null, null],
  questionElapsedBase: 700,
  totalLeftBase: 5200,
  runningStartedAt: null,
}

test('restores running single timer with elapsed wall-clock time, including overtime', () => {
  assert.deepEqual(parseSingleSnapshot(single), single)
  assert.equal(restoredSingleSeconds(single, 1_030_000), 90)
  assert.equal(restoredSingleSeconds(single, 1_130_000), -10)
  assert.equal(restoredSingleSeconds(single, 999_000), 120)
})

test('paused single answer is unchanged while browser is closed', () => {
  const paused = { ...single, remaining: -150, running: false }
  assert.equal(restoredSingleSeconds(paused, 5_000_000), -150)
})

test('restores paused paper question and paper clocks without counting closed time', () => {
  assert.deepEqual(parsePaperSnapshot(paper), paper)
  assert.deepEqual(restoredPaperClocks(paper, 999_999_999), {
    questionLeft: PAPER_QUESTION_SECONDS - 700,
    paperLeft: 5200,
  })
})

test('restores running paper clocks through expiry and overtime', () => {
  const running = { ...paper, paused: false, runningStartedAt: 1_000_000 }
  assert.deepEqual(restoredPaperClocks(running, 1_060_000), {
    questionLeft: PAPER_QUESTION_SECONDS - 760,
    paperLeft: 5140,
  })
  assert.deepEqual(restoredPaperClocks({ ...running, questionElapsedBase: 2600, totalLeftBase: 20 }, 1_060_000), {
    questionLeft: 40,
    paperLeft: -40,
  })
  assert.equal(PAPER_TOTAL_SECONDS, 10800)
})

test('rejects invalid timer data rather than crashing on corrupted localStorage', () => {
  assert.equal(parseSingleSnapshot(null), null)
  assert.equal(parseSingleSnapshot({ ...single, remaining: Infinity }), null)
  assert.equal(parseSingleSnapshot({ ...single, minutes: -1 }), null)
  assert.equal(parseSingleSnapshot({ ...single, question: 42 }), null)
  assert.equal(parsePaperSnapshot(null), null)
  assert.equal(parsePaperSnapshot({ ...paper, current: 999 }), null)
  assert.equal(parsePaperSnapshot({ ...paper, times: ['NaN', null, null, null] }), null)
  assert.equal(parsePaperSnapshot({ ...paper, questions: ['Q1'] }), null)
  assert.equal(parsePaperSnapshot({ ...paper, questionElapsedBase: 'not a clock' }), null)
  assert.equal(parsePaperSnapshot({ ...paper, paused: true, runningStartedAt: 1_000_000 }), null)
  assert.equal(parsePaperSnapshot({ ...paper, paused: false, runningStartedAt: null }), null)
})
