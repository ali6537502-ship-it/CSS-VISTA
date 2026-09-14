// Seeded pseudo-random generator used by the question forge and by mock-paper
// selection.
//
// Every forged question and every bank pick has to be reproducible from a seed:
// tests need a fixed paper, and a real attempt needs a brand new one. A shared
// generator keeps both on the same code path - the only difference between a
// test paper and a live paper is the seed string handed in.

export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number
  /** Uniform pick. Throws on an empty list so a silent short paper is impossible. */
  pick<T>(items: readonly T[]): T
  /** Fisher-Yates copy. */
  shuffle<T>(items: readonly T[]): T[]
  /** n distinct picks (or the whole list when it is shorter). */
  sample<T>(items: readonly T[], n: number): T[]
  /** true with probability p. */
  chance(p: number): boolean
  /** A derived generator, so one section's draw cannot shift another's. */
  fork(salt: string): Rng
}

/** xmur3 - string to a well-mixed 32-bit seed. */
export function hashSeed(value: string): number {
  let h = 1779033703 ^ value.length
  for (let index = 0; index < value.length; index += 1) {
    h = Math.imul(h ^ value.charCodeAt(index), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

/** A stable 32-bit fingerprint, used for forged question IDs. */
export function fingerprint(value: string): string {
  return hashSeed(value).toString(36).padStart(7, '0')
}

export function createRng(seed: string | number): Rng {
  let state = (typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)) || 0x9e3779b9

  // mulberry32: small, fast and far better distributed than the LCG the daily
  // challenge uses - the forge draws tens of numbers per question, where an
  // LCG's low bits visibly correlate.
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (!items.length) throw new Error('Rng.pick called with an empty list')
      return items[Math.floor(next() * items.length)]
    },
    shuffle: (items) => {
      const copy = [...items]
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1))
        ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
      }
      return copy
    },
    sample: (items, n) => rng.shuffle(items).slice(0, Math.max(0, n)),
    chance: (p) => next() < p,
    fork: (salt) => createRng(`${state >>> 0}|${salt}`),
  }
  return rng
}

/** A non-reproducible seed: one fresh mock paper per attempt. */
export function attemptSeed(prefix: string): string {
  const entropy = typeof globalThis.crypto?.getRandomValues === 'function'
    ? globalThis.crypto.getRandomValues(new Uint32Array(2)).join('-')
    : `${Math.random()}-${Math.random()}`
  return `${prefix}|${Date.now().toString(36)}|${entropy}`
}
