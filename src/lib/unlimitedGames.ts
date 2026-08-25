export const MATCHES_PER_GAME_SET = 10
export const QUESTIONS_PER_GAME_ROUND = 100

export function gameSeed(value: string) {
  return [...value].reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 2166136261)
}

export function seededGameShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items]
  let state = seed >>> 0
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0
    const target = state % (index + 1)
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export function unlimitedQuestionRound<T>(pool: T[], gameId: string, round: number, roundSize = QUESTIONS_PER_GAME_ROUND) {
  if (pool.length <= roundSize) return seededGameShuffle(pool, gameSeed(`${gameId}-round-${round}`))
  const roundsPerCycle = Math.ceil(pool.length / roundSize)
  const cycle = Math.floor(round / roundsPerCycle)
  const roundInCycle = round % roundsPerCycle
  const cyclePool = seededGameShuffle(pool, gameSeed(`${gameId}-cycle-${cycle}`))
  return cyclePool.slice(roundInCycle * roundSize, (roundInCycle + 1) * roundSize)
}

export interface GameMatchPair {
  concept: string
  match: string
}

export function unlimitedMatchingSet(pairs: GameMatchPair[], gameId: string, set: number) {
  const unique = [...new Map(pairs
    .filter((pair) => pair.concept.trim() && pair.match.trim())
    .map((pair) => [`${pair.concept.trim().toLocaleLowerCase()}::${pair.match.trim().toLocaleLowerCase()}`, {
      concept: pair.concept.trim(),
      match: pair.match.trim(),
    }])).values()]
  const reversible = [...unique, ...unique.map((pair) => ({ concept: pair.match, match: pair.concept }))]
  return seededGameShuffle(reversible, gameSeed(`${gameId}-set-${set}`)).slice(0, Math.min(MATCHES_PER_GAME_SET, reversible.length))
}
