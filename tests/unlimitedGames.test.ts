import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MATCHES_PER_GAME_SET,
  QUESTIONS_PER_GAME_ROUND,
  unlimitedMatchingSet,
  unlimitedQuestionRound,
} from '../src/lib/unlimitedGames.ts'

test('question games can generate arbitrarily high rounds from only their supplied pool', () => {
  const pool = Array.from({ length: 250 }, (_, index) => ({ id: index, topic: 'geography' }))
  const first = unlimitedQuestionRound(pool, 'world-map', 0)
  const distant = unlimitedQuestionRound(pool, 'world-map', 10_000)

  assert.equal(first.length, QUESTIONS_PER_GAME_ROUND)
  assert.equal(distant.length, QUESTIONS_PER_GAME_ROUND)
  assert.ok(distant.every((question) => question.topic === 'geography' && pool.includes(question)))
})

test('small subject pools remain playable for unlimited reshuffled rounds', () => {
  const pool = Array.from({ length: 12 }, (_, index) => index)
  assert.deepEqual([...unlimitedQuestionRound(pool, 'small-subject', 500)].sort((a, b) => a - b), pool)
})

test('matching games generate unlimited bounded sets with direct and reverse prompts', () => {
  const pairs = Array.from({ length: 8 }, (_, index) => ({ concept: `Concept ${index}`, match: `Answer ${index}` }))
  const set = unlimitedMatchingSet(pairs, 'concepts', 25_000)

  assert.equal(set.length, MATCHES_PER_GAME_SET)
  assert.ok(set.every((pair) => (
    pairs.some((source) => source.concept === pair.concept && source.match === pair.match)
    || pairs.some((source) => source.match === pair.concept && source.concept === pair.match)
  )))
})
