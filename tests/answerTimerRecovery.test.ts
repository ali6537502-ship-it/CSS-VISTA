import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAPER_MCQ_SECONDS, PAPER_QUESTION_SECONDS, PAPER_TOTAL_SECONDS,
  allocatedAnswerSeconds, paperQuestionTargetSeconds,
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
    questionLeft: 45 * 60 - 700,
    paperLeft: 5200,
  })
})

test('restores running paper clocks through expiry and overtime', () => {
  const running = { ...paper, paused: false, runningStartedAt: 1_000_000 }
  assert.deepEqual(restoredPaperClocks(running, 1_060_000), {
    questionLeft: 45 * 60 - 760,
    paperLeft: 5140,
  })
  assert.deepEqual(restoredPaperClocks({ ...running, questionElapsedBase: 2600, totalLeftBase: 20 }, 1_060_000), {
    questionLeft: 40,
    paperLeft: -40,
  })
  assert.equal(PAPER_TOTAL_SECONDS, 10800)
})

test('allocates remaining paper time dynamically after MCQs and each answer', () => {
  assert.equal(PAPER_TOTAL_SECONDS, 3 * 3600)
  assert.equal(PAPER_MCQ_SECONDS, 30 * 60)
  assert.equal(PAPER_QUESTION_SECONDS, 37 * 60 + 30)
  // MCQs take 30 minutes: 150 minutes / 4 = 37 minutes 30 seconds per answer.
  assert.equal(allocatedAnswerSeconds(PAPER_TOTAL_SECONDS - PAPER_MCQ_SECONDS, 4), 2250)
  // MCQs finish in 10 minutes: 170 minutes / 4 = 42 minutes 30 seconds.
  assert.equal(allocatedAnswerSeconds(PAPER_TOTAL_SECONDS - 10 * 60, 4), 2550)
  // MCQs take 35 minutes: 145 minutes / 4 = 36 minutes 15 seconds.
  assert.equal(allocatedAnswerSeconds(PAPER_TOTAL_SECONDS - 35 * 60, 4), 2175)
  // After 10-minute MCQs and a 30-minute first answer: 140 / 3 = 46m40s.
  assert.equal(allocatedAnswerSeconds(PAPER_TOTAL_SECONDS - 10 * 60 - 30 * 60, 3), 2800)
  assert.equal(allocatedAnswerSeconds(101, 4), 25)
  assert.equal(allocatedAnswerSeconds(-25, 4), 0)
  assert.equal(allocatedAnswerSeconds(NaN, 4), 0)
  assert.equal(allocatedAnswerSeconds(100, 0), 0)
})

test('restores an MCQ section and a dynamically allocated descriptive question', () => {
  const mcqs: PaperSnapshot = {
    ...paper, current: -1, questionTargetSeconds: PAPER_MCQ_SECONDS, mcqElapsedSeconds: null,
    questionElapsedBase: 240, totalLeftBase: PAPER_TOTAL_SECONDS - 240,
  }
  assert.deepEqual(parsePaperSnapshot(mcqs), mcqs)
  assert.equal(paperQuestionTargetSeconds(mcqs), PAPER_MCQ_SECONDS)
  assert.deepEqual(restoredPaperClocks(mcqs), {
    questionLeft: PAPER_MCQ_SECONDS - 240, paperLeft: PAPER_TOTAL_SECONDS - 240,
  })
  const descriptive: PaperSnapshot = {
    ...paper, current: 0, questionTargetSeconds: 2550,
    mcqElapsedSeconds: 600, questionElapsedBase: 120, totalLeftBase: 10_080,
  }
  assert.deepEqual(restoredPaperClocks(descriptive), { questionLeft: 2430, paperLeft: 10_080 })
  // Legacy snapshots had no target, so resume with their original 45 minutes.
  assert.equal(paperQuestionTargetSeconds(paper), 45 * 60)
})

test('rejects invalid timer data rather than crashing on corrupted localStorage', () => {
  assert.equal(parseSingleSnapshot(null), null)
  assert.equal(parseSingleSnapshot({ ...single, remaining: Infinity }), null)
  assert.equal(parseSingleSnapshot({ ...single, minutes: -1 }), null)
  assert.equal(parseSingleSnapshot({ ...single, question: 42 }), null)
  assert.equal(parsePaperSnapshot(null), null)
  assert.equal(parsePaperSnapshot({ ...paper, current: 999 }), null)
  assert.equal(parsePaperSnapshot({ ...paper, current: -2 }), null)
  assert.equal(parsePaperSnapshot({ ...paper, questionTargetSeconds: -1 }), null)
  assert.equal(parsePaperSnapshot({ ...paper, mcqElapsedSeconds: Infinity }), null)
  assert.equal(parsePaperSnapshot({ ...paper, times: ['NaN', null, null, null] }), null)
  assert.equal(parsePaperSnapshot({ ...paper, questions: ['Q1'] }), null)
  assert.equal(parsePaperSnapshot({ ...paper, questionElapsedBase: 'not a clock' }), null)
  assert.equal(parsePaperSnapshot({ ...paper, paused: true, runningStartedAt: 1_000_000 }), null)
  assert.equal(parsePaperSnapshot({ ...paper, paused: false, runningStartedAt: null }), null)
})
