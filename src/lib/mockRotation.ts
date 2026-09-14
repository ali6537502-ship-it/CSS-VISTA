import type { CompetitiveMockKind } from '@/data/examBlueprints'

// Remembers which questions a device has already been served in each mock
// format, so "a new paper every time" holds across attempts and not merely
// within one.
//
// The builder treats this as a preference, not a constraint: when a topic's
// pool is genuinely small the remembered questions are allowed back rather than
// letting the section come up short. Storage failures (private browsing,
// disabled storage) degrade to "remember nothing", which simply means the seed
// alone decides the paper.

const KEY_PREFIX = 'cssvista:mock-served:'

/** Roughly six papers' worth of history per format - enough to stop repeats without pinning the pool. */
const HISTORY_LIMIT: Record<CompetitiveMockKind, number> = {
  mpt: 1200,
  'pms-gk': 600,
  'one-paper': 600,
}

function storageKey(kind: CompetitiveMockKind) {
  return `${KEY_PREFIX}${kind}`
}

export function recentlyServedIds(kind: CompetitiveMockKind): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(kind))
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

export function rememberServedIds(kind: CompetitiveMockKind, ids: readonly string[]): void {
  if (!ids.length) return
  try {
    // Newest first, so trimming drops the oldest attempts.
    const merged = [...new Set([...ids, ...recentlyServedIds(kind)])].slice(0, HISTORY_LIMIT[kind])
    localStorage.setItem(storageKey(kind), JSON.stringify(merged))
  } catch {
    /* storage unavailable - the attempt seed still makes the paper new */
  }
}

export function clearServedIds(kind: CompetitiveMockKind): void {
  try {
    localStorage.removeItem(storageKey(kind))
  } catch {
    /* nothing to clear */
  }
}

// ---------------------------------------------------------------------------
// In-progress attempt
// ---------------------------------------------------------------------------

const ATTEMPT_PREFIX = 'cssvista:mock-attempt:'

/**
 * A paper is only resumable if it can be rebuilt, and now that every attempt
 * gets a random seed the seed is the only thing that can rebuild it. Without
 * this, an accidental refresh forty minutes into a 200-minute MPT paper would
 * hand the candidate a different paper and silently drop the saved answers,
 * because the resume offer matches on the question set.
 */
const ATTEMPT_TTL_MS = 12 * 60 * 60 * 1000

function attemptKey(kind: CompetitiveMockKind) {
  return `${ATTEMPT_PREFIX}${kind}`
}

export function activeAttemptSeed(kind: CompetitiveMockKind): string | null {
  try {
    const raw = localStorage.getItem(attemptKey(kind))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { seed, savedAt } = parsed as { seed?: unknown; savedAt?: unknown }
    if (typeof seed !== 'string' || typeof savedAt !== 'number') return null
    // An attempt abandoned yesterday should not pin today's paper.
    if (Date.now() - savedAt > ATTEMPT_TTL_MS) {
      clearAttemptSeed(kind)
      return null
    }
    return seed
  } catch {
    return null
  }
}

export function rememberAttemptSeed(kind: CompetitiveMockKind, seed: string): void {
  try {
    localStorage.setItem(attemptKey(kind), JSON.stringify({ seed, savedAt: Date.now() }))
  } catch {
    /* storage unavailable - the attempt simply is not resumable */
  }
}

export function clearAttemptSeed(kind: CompetitiveMockKind): void {
  try {
    localStorage.removeItem(attemptKey(kind))
  } catch {
    /* nothing to clear */
  }
}
