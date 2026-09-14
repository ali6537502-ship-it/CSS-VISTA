import type { Rng } from './rng'

export type ForgeDifficulty = 'Basic' | 'Intermediate' | 'Advanced'

/**
 * What a generator returns.
 *
 * `answer` is the correct option's text rather than an index: the option order
 * is decided later, when the item is placed in a paper, so a generator can
 * never hand back a key that drifts out of sync with its own options.
 */
export interface ForgedItem {
  q: string
  answer: string
  distractors: string[]
  explanation: string
  topic: string
  difficulty: ForgeDifficulty
}

export type ForgeGenerator = (rng: Rng) => ForgedItem

/** Plain decimal formatting - trailing zeros dropped, thousands separated. */
export function num(value: number, dp = 2): string {
  const rounded = Number(value.toFixed(dp))
  return rounded.toLocaleString('en-US', { maximumFractionDigits: dp })
}

export function rupees(value: number, dp = 0): string {
  return `Rs ${num(value, dp)}`
}

/**
 * Three wrong options that are genuinely wrong and genuinely different.
 *
 * Candidates are the errors a candidate actually makes (wrong operation,
 * off-by-one, forgotten unit conversion). Anything that collides with the key
 * or with an earlier distractor is dropped, and the shortfall is filled with
 * small perturbations so a generator can never emit a duplicate option - the
 * quality gate rejects those, which would silently shrink a section.
 */
export function wrongOptions(
  answer: string,
  candidates: readonly (string | number | null | undefined)[],
  rng: Rng,
  fallback?: (attempt: number) => string,
): string[] {
  const out: string[] = []
  const seen = new Set([answer.trim()])
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue
    const text = typeof candidate === 'number' ? num(candidate) : candidate.trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length === 3) return out
  }
  for (let attempt = 1; out.length < 3 && attempt < 60; attempt += 1) {
    const text = fallback
      ? fallback(attempt)
      : numericFallback(answer, attempt, rng)
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push(text)
  }
  if (out.length < 3) throw new Error(`Forge could not build three distinct distractors for “${answer}”`)
  return out
}

function numericFallback(answer: string, attempt: number, rng: Rng): string {
  const match = answer.match(/-?\d[\d,]*(?:\.\d+)?/)
  if (!match) return `${answer} ${'*'.repeat(attempt)}`
  const raw = Number(match[0].replace(/,/g, ''))
  if (!Number.isFinite(raw)) return `${answer} ${'*'.repeat(attempt)}`
  const dp = (match[0].split('.')[1] ?? '').length
  const step = raw === 0 ? attempt : Math.max(10 ** -dp, Math.abs(raw) * 0.05 * attempt)
  const scaled = step * (attempt % 3 === 0 ? 2 : 1)
  // A count or an amount is never negative, and an option that goes negative
  // reads as an obvious throwaway - so shifts stay on the positive side of zero
  // whenever the key itself is positive.
  const down = raw - scaled
  const shifted = raw > 0 && down <= 0 ? raw + scaled : raw + (rng.chance(0.5) ? scaled : -scaled)
  return answer.replace(match[0], num(shifted, dp))
}

/** Greatest common divisor, for ratio and fraction generators. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) { [x, y] = [y, x % y] }
  return x
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b)
}

/** Reduce a:b to its lowest terms. */
export function reduceRatio(a: number, b: number): [number, number] {
  const divisor = gcd(a, b) || 1
  return [a / divisor, b / divisor]
}

export function ordinal(n: number): string {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

/** Picks a generator, weighted, so a section's topic mix stays believable. */
export function weightedPick<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng.next() * total
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll < 0) return value
  }
  return entries[entries.length - 1][0]
}
