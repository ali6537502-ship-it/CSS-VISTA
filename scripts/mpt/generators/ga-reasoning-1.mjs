// Generator: MPT release bank, General Abilities — reasoning part 1
// (number/letter series, coding–decoding, clocks and calendars, mental ability, verbal reasoning).
//
//   node scripts/mpt/generators/ga-reasoning-1.mjs
//
// Writes src/data/mpt/bank/abilities/ga-c-01.json … (≤100 items per file), IDs mpt-ga-c-####.
//
// Deterministic. Every computable answer is computed here, and verified independently:
//  * series: every option is substituted into the gap and tested against a library of simple
//    rules (constant/second/third differences, ratios, recurrences, Fibonacci-type, interleaved,
//    alternating operations, prime-based…). The answer must satisfy at least one rule and no
//    distractor may satisfy any rule;
//  * letter codes: the rule is re-inferred from the worked example(s) by brute force over ~900
//    candidate rules (shifts, reversal, rotations, opposite letters, progressive/alternating
//    shifts); every rule consistent with the example must give the same answer;
//  * clocks and calendars: computed arithmetically and, for real dates, against the calendar;
//  * counts, orderings and subset sums: brute force.
// Verbal items are hand-written data with a single defensible answer (source_type "authored").
// Every item has its own wording (template); no masked wording repeats anywhere in the file set.
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { canonical, surfaceTemplate } from '../bank-lib.mjs'
import { loadServedArchive, stemHash } from '../served-archive.mjs'

const OUT_DIR = 'src/data/mpt/bank/abilities'
const PREFIX = 'mpt-ga-c-'
const FILE_PREFIX = 'ga-c-'
const TODAY = '2026-09-26'

// ---------------------------------------------------------------------------
// Basic helpers
// ---------------------------------------------------------------------------
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260926)
const shuffle = (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [c[i], c[j]] = [c[j], c[i]] } return c }
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
const sum = (a) => a.reduce((s, v) => s + v, 0)
const isPrime = (n) => { if (!Number.isInteger(n) || n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true }
const PRIMES = (() => { const p = []; for (let i = 2; p.length < 300; i++) if (isPrime(i)) p.push(i); return p })()
const assert = (cond, msg) => { if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`) }
const A2N = (c) => c.charCodeAt(0) - 64
const N2A = (n) => String.fromCharCode(65 + ((((n - 1) % 26) + 26) % 26))
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Number for display: integers plainly (true minus sign), otherwise decimal or fraction. */
function fmt(x, frac = false) {
  if (Number.isInteger(x)) return x < 0 ? `−${-x}` : String(x)
  if (Math.abs(x) < 1e-12) return '0'
  if (frac) {
    for (let den = 2; den <= 5000; den++) {
      const n = x * den
      if (Math.abs(n - Math.round(n)) < 1e-7) { const r = Math.round(n); return `${r < 0 ? '−' : ''}${Math.abs(r)}/${den}` }
    }
  }
  const s = String(Math.round(x * 1e6) / 1e6)
  return s.startsWith('-') ? `−${s.slice(1)}` : s
}
const list = (a) => a.join(', ')

// ---------------------------------------------------------------------------
// Item store
// ---------------------------------------------------------------------------
const SUBJECT = 'Reasoning'
const SECTION = 'General Abilities'
const items = []
const frameSeen = new Map()
const dupErrors = []
/** Wording skeleton: digits and upper-case letter groups masked (so letter/number swaps collide). */
const strictMask = (s) => canonical(String(s).replace(/\b[A-Z]+\b/g, ' qletq ').replace(/\d+/g, ' qnumq ')).replace(/\s+/g, ' ')

function add({ st, fam, concept, d, q, ans, wrong, exp, src = 'generated-verified', grade = 'A', frame }) {
  assert([1, 2, 3].includes(d), `difficulty ${concept}`)
  assert(Array.isArray(wrong) && wrong.length === 3, `3 distractors needed: ${concept} (${wrong})`)
  const opts = [String(ans), ...wrong.map(String)]
  assert(new Set(opts.map(canonical)).size === 4, `options not distinct for ${concept}: ${opts.join(' | ')}`)
  assert(opts.every((o) => o.trim().length > 0), `empty option ${concept}`)
  q = q.replace(/\?\s*[?.]$/, '?')
  const key = frame ?? strictMask(q)
  if (frameSeen.has(key)) { dupErrors.push(`wording skeleton reused: "${q}" (also ${frameSeen.get(key)})`); return }
  frameSeen.set(key, concept)
  items.push({ st, fam, concept: concept.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), d, q, ans: String(ans), wrong: wrong.map(String), exp, src, grade })
}

// ---------------------------------------------------------------------------
// Series verification engine
// ---------------------------------------------------------------------------
const diffs = (t) => t.slice(1).map((x, i) => x - t[i])
const ratios = (t) => t.slice(1).map((x, i) => x / t[i])
const allEq = (a) => a.every((x) => near(x, a[0]))
const arithFit = (t) => t.length < 2 || allEq(diffs(t))
const geomFit = (t) => t.every((x) => x !== 0) && (t.length < 2 || allEq(ratios(t)))
const poly2Fit = (t) => t.length < 3 || allEq(diffs(diffs(t)))
const poly3Fit = (t) => t.length < 4 || allEq(diffs(diffs(diffs(t))))
const PRIME_FS = [(p) => p, (p) => p * p, (p) => p + 1, (p) => p - 1, (p) => 2 * p]
function primeWindow(t, f) {
  for (let s = 0; s + t.length <= PRIMES.length; s++) {
    if (f(PRIMES[s]) > t[0] + 1e-9 && f(PRIMES[s]) > t[0]) break
    if (t.every((x, i) => near(x, f(PRIMES[s + i])))) return true
  }
  return false
}
const SUB = [{ dof: 2, fit: arithFit }, { dof: 2, fit: geomFit }, { dof: 3, fit: poly2Fit }]
function subDof(t) { let best = Infinity; for (const r of SUB) if (t.length > r.dof && r.fit(t)) best = Math.min(best, r.dof); return best }
function altOpsFit(t) {
  const st = t.slice(1).map((x, i) => [t[i], x])
  const ev = st.filter((_, i) => i % 2 === 0), od = st.filter((_, i) => i % 2 === 1)
  if (ev.length < 2 || od.length < 2) return false
  const ok = (s) => allEq(s.map(([a, b]) => b - a)) || (s.every(([a]) => a !== 0) && allEq(s.map(([a, b]) => b / a)))
  return ok(ev) && ok(od)
}
const RULES = [
  { n: 'constant difference', dof: () => 2, fit: arithFit },
  { n: 'constant ratio', dof: () => 2, fit: geomFit },
  { n: 'second difference', dof: () => 3, fit: poly2Fit },
  { n: 'third difference', dof: () => 4, fit: poly3Fit },
  { n: 'differences in ratio', dof: () => 3, fit: (t) => { const d = diffs(t); return d.every((x) => x !== 0) && allEq(ratios(d)) } },
  { n: 'x→ax+b', dof: () => 3, fit: (t) => { if (near(t[1], t[0])) return t.every((x) => near(x, t[0])); const a = (t[2] - t[1]) / (t[1] - t[0]); const b = t[1] - a * t[0]; return t.slice(1).every((x, i) => near(x, a * t[i] + b)) } },
  { n: 'sum of previous two', dof: () => 2, fit: (t) => t.slice(2).every((x, i) => near(x, t[i] + t[i + 1])) },
  { n: 'sum of previous three', dof: () => 3, fit: (t) => t.slice(3).every((x, i) => near(x, t[i] + t[i + 1] + t[i + 2])) },
  { n: 'ratios in AP', dof: () => 3, fit: (t) => t.every((x) => x !== 0) && arithFit(ratios(t)) },
  { n: 'divisors in AP', dof: () => 3, fit: (t) => t.every((x) => x !== 0) && arithFit(ratios(t).map((r) => 1 / r)) },
  { n: 'prime differences', dof: () => 2, fit: (t) => primeWindow(diffs(t), (p) => p) },
  { n: 'alternating operations', dof: () => 4, fit: altOpsFit },
  { n: 'interleaved', dof: (t) => subDof(t.filter((_, i) => i % 2 === 0)) + subDof(t.filter((_, i) => i % 2 === 1)), fit: () => true },
  { n: 'prime-based', dof: () => 1, fit: (t) => PRIME_FS.some((f) => primeWindow(t, f) || primeWindow([...t].reverse(), f)) },
]
/** Does the complete sequence follow at least one simple rule (with more terms than the rule's free parameters)? */
function validFill(t) { return RULES.some((r) => { const k = r.dof(t); return k < t.length && r.fit(t) }) }
function fittingRules(t) { return RULES.filter((r) => { const k = r.dof(t); return k < t.length && r.fit(t) }).map((r) => r.n) }

function lagrange(pts, x) {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    let term = pts[i][1]
    for (let j = 0; j < pts.length; j++) if (j !== i) term *= (x - pts[j][0]) / (pts[i][0] - pts[j][0])
    s += term
  }
  return s
}
/** Can the sequence be made rule-following by changing only term g? */
function fitsWithGap(t, g) {
  const known = t.map((v, i) => [i, v]).filter(([i]) => i !== g)
  for (const deg of [1, 2, 3]) {
    if (known.length >= deg + 2) { const base = known.slice(0, deg + 1); if (known.every(([i, v]) => near(lagrange(base, i), v))) return true }
  }
  for (let j = 0; j + 1 < t.length; j++) {
    if (j === g || j + 1 === g || t[j] === 0) continue
    const r = t[j + 1] / t[j]
    if (known.length >= 3 && known.every(([i, v]) => near(t[j] * r ** (i - j), v))) return true
    break
  }
  const pairs = t.slice(1).map((x, i) => [i, t[i], x]).filter(([i]) => i !== g && i + 1 !== g)
  if (pairs.length >= 3) {
    const [p, q] = [pairs[0], pairs.find((z) => !near(z[1], pairs[0][1]))]
    if (q) {
      const a = (q[2] - p[2]) / (q[1] - p[1]); const b = p[2] - a * p[1]
      if (pairs.every(([, x, y]) => near(y, a * x + b))) {
        if (g === 0 || g === t.length - 1) return true
        const v = a * t[g - 1] + b
        if (near(t[g + 1], a * v + b)) return true
      }
    }
  }
  const par = [0, 1].map((p) => t.map((v, i) => [i, v]).filter(([i]) => i % 2 === p))
  const lin = (pts) => { const k = pts.filter(([i]) => i !== g); if (k.length < 3) return false; const base = k.slice(0, 2); return k.every(([i, v]) => near(lagrange(base, i), v)) }
  if (par.every(lin)) return true
  for (const f of PRIME_FS) {
    for (let s = 0; s + t.length <= PRIMES.length; s++) {
      if (known.every(([i, v]) => near(v, f(PRIMES[s + i])))) return true
      if (f(PRIMES[s]) > t[0] * 2 + 50) break
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// SERIES (ga.series)
// ---------------------------------------------------------------------------
const AP = (a, d, n) => Array.from({ length: n }, (_, i) => a + d * i)
const GP = (a, r, n) => Array.from({ length: n }, (_, i) => a * r ** i)
const REC = (a0, f, n) => { const s = [a0]; while (s.length < n) s.push(f(s[s.length - 1], s.length)); return s }
const FN = (f, n, start = 1) => Array.from({ length: n }, (_, i) => f(i + start))
const INTER = (a, b) => { const s = []; for (let i = 0; i < Math.max(a.length, b.length); i++) { if (i < a.length) s.push(a[i]); if (i < b.length) s.push(b[i]) } return s }
const LET = (s) => [...s.replace(/[^A-Z]/g, '')].map(A2N)
const dtext = (s) => list(diffs(s).map((x) => fmt(x)))

function seriesItem({ fam, d, seq, hide = seq.length - 1, q, exp, letters = false, frac = false, alts = [], concept }) {
  const show = (v) => (letters ? N2A(v) : fmt(v, frac))
  const shown = seq.map((v, i) => (i === hide ? '?' : show(v)))
  const ans = seq[hide]
  assert(validFill(seq), `series answer does not follow any rule: ${concept} ${seq}`)
  const shownVals = seq.filter((_, i) => i !== hide)
  const cand = [...alts]
  if (hide >= 2) { const r = seq[hide - 1] + (seq[hide - 1] - seq[hide - 2]); if (Math.abs(r - ans) <= Math.max(3, Math.abs(ans) / 2)) cand.push(r) }
  const step = letters || !Number.isInteger(ans) ? 1 : Math.abs(ans) >= 300 ? 25 : Math.abs(ans) >= 100 ? 5 : Math.abs(ans) >= 30 ? 2 : 1
  for (const k of [1, 2, 3, 4, 5, 6]) cand.push(ans + k * step, ans - k * step)
  if (!letters) cand.push(ans + 10, ans - 10, ans * 2)
  const wrong = []
  for (const c of cand) {
    if (wrong.length === 3) break
    if (!Number.isFinite(c) || near(c, ans) || wrong.some((w) => near(w, c)) || shownVals.some((v) => near(v, c))) continue
    if (letters && (c < 1 || c > 26 || !Number.isInteger(c))) continue
    if (!letters && Number.isInteger(ans) && !Number.isInteger(c)) continue
    if (!letters && ans > 0 && c <= 0 && shownVals.every((v) => v > 0)) continue
    const filled = seq.map((v, i) => (i === hide ? c : v))
    if (validFill(filled)) continue
    wrong.push(c)
  }
  assert(wrong.length === 3, `not enough distractors for ${concept}`)
  const a = show(ans)
  add({ st: 'ga.series', fam, concept: concept ?? `series-${shown.join('-').replace('?', 'x')}`, d, q: q.replace('{S}', list(shown)), ans: a, wrong: wrong.map(show), exp: typeof exp === 'function' ? exp(seq, a) : exp })
}

// ga.series.constant-difference
{
  const F = 'ga.series.constant-difference'
  const apExp = (s, a) => { const d = s[1] - s[0]; return `Each term is ${fmt(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than the one before it, so the missing term is ${a}.` }
  seriesItem({ fam: F, d: 1, seq: AP(7, 6, 6), q: 'What number comes next in the series {S}', exp: apExp })
  seriesItem({ fam: F, d: 1, seq: AP(94, -7, 6), q: 'Find the next term: {S}', exp: apExp })
  seriesItem({ fam: F, d: 2, seq: AP(20, -6, 7), hide: 4, q: 'Which number should replace the question mark in {S}?', exp: apExp })
  seriesItem({ fam: F, d: 2, seq: AP(2.5, 1.25, 5), q: 'Look at the sequence {S}. Which number continues it?', exp: apExp })
  seriesItem({ fam: F, d: 1, seq: AP(113, -11, 6), hide: 2, q: 'One term is missing from the sequence {S}. What is it?', exp: apExp })
  seriesItem({ fam: F, d: 1, seq: AP(-17, 5, 6), q: 'Continue the pattern: {S}', exp: apExp })
  seriesItem({ fam: F, d: 1, seq: AP(1000, -125, 6), hide: 4, q: 'Complete the series {S}.', exp: apExp })
  // nth-term and counting questions on arithmetic series (computed directly, rule confirmed by validFill)
  {
    const s = AP(3, 4, 4); assert(validFill([...s, 19]), 'ap20')
    const n = 20, v = 3 + (n - 1) * 4
    add({ st: 'ga.series', fam: F, concept: 'ap-3-7-11-15-20th-term', d: 2, q: `The series ${list(s)}, … continues in the same way. What is its 20th term?`, ans: v, wrong: [v + 4, v - 4, 3 + n * 4 + 4], exp: `The common difference is 4, so the 20th term is 3 + 19 × 4 = ${v}.` })
  }
  {
    const target = 81, n = (target - 5) / 4 + 1
    assert(Number.isInteger(n), 'which term')
    add({ st: 'ga.series', fam: F, concept: 'ap-5-9-13-term-equal-81', d: 2, q: 'In the sequence 5, 9, 13, 17, …, which term is equal to 81?', ans: ord(n), wrong: [ord(n - 1), ord(n + 1), ord(n - 2)], exp: `81 = 5 + (n − 1) × 4 gives n − 1 = 19, so 81 is the ${ord(n)} term.` })
  }
  {
    const n = (99 - 12) / 3 + 1
    add({ st: 'ga.series', fam: F, concept: 'ap-count-terms-12-to-99-step-3', d: 2, q: 'How many terms are there in the series 12, 15, 18, …, 99?', ans: n, wrong: [n - 1, n + 1, 29 + 3], exp: `Number of terms = (99 − 12) ÷ 3 + 1 = 29 + 1 = ${n}.` })
  }
  {
    const s = sum(AP(1, 2, 10))
    add({ st: 'ga.series', fam: F, concept: 'ap-sum-first-10-odd-numbers', d: 2, q: 'What is the sum of the first ten terms of the series 1, 3, 5, 7, …?', ans: s, wrong: [s - 19, s + 21, 90 + 1], exp: `The sum of the first n odd numbers is n², so the first ten add up to 10² = ${s}.` })
  }
  {
    const dd = (39 - 23) / 4, a15 = 23 + (15 - 5) * dd
    add({ st: 'ga.series', fam: F, concept: 'ap-5th-23-9th-39-find-15th', d: 3, q: 'The 5th term of an arithmetic series is 23 and its 9th term is 39. What is its 15th term?', ans: a15, wrong: [a15 - dd, a15 + dd, 23 + 15 * dd], exp: `Four steps raise the value by 16, so the common difference is 4; the 15th term is 23 + 10 × 4 = ${a15}.` })
  }
}

// ga.series.difference-pattern (second differences, differences in ratio, squared differences)
{
  const F = 'ga.series.difference-pattern'
  const d2Exp = (s, a) => { const dd = diffs(s); const k = dd[1] - dd[0]; return `The differences are ${dtext(s)}; they ${k > 0 ? 'increase' : 'decrease'} by ${Math.abs(k)} each time, so the missing term is ${a}.` }
  const dgExp = (s, a) => { const dd = diffs(s); return `The differences are ${dtext(s)}; each difference is ${fmt(dd[1] / dd[0])} times the previous one, so the missing term is ${a}.` }
  seriesItem({ fam: F, d: 2, seq: FN((n) => 3 * n * n + n + 3, 6), q: 'What is the next term in the series {S}?', exp: d2Exp })
  seriesItem({ fam: F, d: 2, seq: REC(5, (x, i) => x + 3 * (i), 6), q: 'Study the series {S} and find the number that comes next.', exp: d2Exp })
  seriesItem({ fam: F, d: 2, seq: REC(100, (x, i) => x - 4 * i, 6), q: 'Which number continues the decreasing series {S}?', exp: d2Exp })
  seriesItem({ fam: F, d: 1, seq: REC(1, (x, i) => x + 2 * i, 6), q: 'Find the missing number: {S}', exp: d2Exp })
  seriesItem({ fam: F, d: 2, seq: REC(6, (x, i) => x + 5 * i, 6), q: 'The numbers {S} follow a rule. What should the question mark be?', exp: d2Exp })
  seriesItem({ fam: F, d: 1, seq: REC(3, (x, i) => x + 2 * i - 1, 6), q: 'Which term comes after the last one shown in {S}?', exp: d2Exp })
  seriesItem({ fam: F, d: 1, seq: REC(10, (x, i) => x + 2 * i, 6), q: 'Choose the number that best continues {S}.', exp: d2Exp })
  seriesItem({ fam: F, d: 2, seq: REC(90, (x, i) => x - (10 - i), 6), q: 'In the sequence {S}, what number will appear next?', exp: d2Exp })
  seriesItem({ fam: F, d: 2, seq: REC(8, (x, i) => x + 2 * i, 6), hide: 3, q: 'Fill in the gap in the series {S}.', exp: d2Exp })
  seriesItem({ fam: F, d: 3, seq: REC(1, (x, i) => x + i * i, 6), q: 'Work out the next number: {S}', exp: (s, a) => `The differences are ${dtext(s)}, the squares 1, 4, 9, 16, 25, so the next term is 31 + 25 = ${a}.` })
  seriesItem({ fam: F, d: 2, seq: REC(7, (x, i) => x + 2 ** i, 6), q: 'What should come next in {S}?', exp: dgExp })
  seriesItem({ fam: F, d: 2, seq: REC(3, (x, i) => x + 2 ** (i - 1), 6), q: 'Give the next term of {S}.', exp: dgExp })
  seriesItem({ fam: F, d: 3, seq: REC(4, (x, i) => x + 3 ** (i - 1), 6), q: 'Find the term that follows {S}.', exp: dgExp })
  seriesItem({ fam: F, d: 2, seq: REC(50, (x, i) => x - (2 * i - 1), 6), q: 'Name the number that comes next in {S}.', exp: d2Exp })
  seriesItem({ fam: F, d: 3, seq: REC(2, (x, i) => x + i * i, 6), q: 'Which number should follow in the pattern {S}?', exp: (s, a) => `The differences are ${dtext(s)} (1², 2², 3², 4², 5²), so the next term is 32 + 25 = ${a}.` })
  seriesItem({ fam: F, d: 3, seq: REC(7, (x, i) => x + 3 * i + 2, 6), hide: 0, q: 'The first term of the series {S} has been left out. What is it?', exp: (s, a) => `The differences are ${dtext(s)}, rising by 3; the first difference must be 5, so the first term is 12 − 5 = ${a}.` })
  seriesItem({ fam: F, d: 2, seq: REC(13, (x, i) => x + 3 * i, 6), q: 'Supply the next number in {S}.', exp: d2Exp })
  seriesItem({ fam: F, d: 1, seq: REC(5, (x, i) => x + 2 * i - 1, 6), q: 'What is the next number: {S}?', exp: d2Exp })
}

// ga.series.constant-ratio
{
  const F = 'ga.series.constant-ratio'
  const gpExp = (s, a) => { const r = s[1] / s[0]; return r >= 1 || r <= -1 ? `Each term is the previous term multiplied by ${fmt(r)}, so the missing term is ${a}.` : `Each term is the previous term divided by ${fmt(1 / r)}, so the missing term is ${a}.` }
  seriesItem({ fam: F, d: 1, seq: GP(3, 2, 6), q: 'Which number comes next: {S}?', exp: gpExp })
  seriesItem({ fam: F, d: 1, seq: GP(729, 1 / 3, 5), q: 'Find the next term of the series {S}.', exp: gpExp })
  seriesItem({ fam: F, d: 2, seq: GP(2, -3, 5), q: 'The signs alternate in the series {S}. What is the next term?', exp: gpExp })
  seriesItem({ fam: F, d: 1, seq: GP(5, 2, 6), hide: 4, q: 'What is the missing term in {S}?', exp: gpExp })
  seriesItem({ fam: F, d: 2, seq: GP(3, 1 / 3, 5), frac: true, alts: [1 / 18, 1 / 12, 1 / 81], q: 'In the series {S}, what number should come next?', exp: gpExp })
  seriesItem({ fam: F, d: 2, seq: GP(4000, 1 / 5, 5), q: 'Continue the series {S}.', exp: gpExp })
  seriesItem({ fam: F, d: 2, seq: GP(0.5, 3, 5), alts: [27, 22.5, 39], q: 'Which number completes the sequence {S}?', exp: gpExp })
  seriesItem({ fam: F, d: 1, seq: GP(1, 4, 5), q: 'Look at the series {S}. What comes next?', exp: gpExp })
  seriesItem({ fam: F, d: 1, seq: GP(1024, 1 / 2, 5), hide: 2, q: 'Identify the missing number in {S}.', exp: gpExp })
  seriesItem({ fam: F, d: 2, seq: GP(7, 3, 5), hide: 3, q: 'Replace the question mark in {S} with the correct number.', exp: gpExp })
  {
    const n = Math.round(Math.log(1458 / 2) / Math.log(3)) + 1
    assert(2 * 3 ** (n - 1) === 1458, 'gp term')
    add({ st: 'ga.series', fam: F, concept: 'gp-2-6-18-term-equal-1458', d: 3, q: 'In the series 2, 6, 18, 54, …, which term is 1458?', ans: ord(n), wrong: [ord(n - 1), ord(n + 1), ord(n + 2)], exp: `1458 ÷ 2 = 729 = 3⁶, so 1458 = 2 × 3⁶, which is the ${ord(n)} term.` })
  }
  {
    const s = sum(GP(1, 2, 7))
    add({ st: 'ga.series', fam: F, concept: 'gp-sum-1-to-64-doubling', d: 3, q: 'What is the value of 1 + 2 + 4 + 8 + 16 + 32 + 64?', ans: s, wrong: [s + 1, s - 1, 128 + 1], exp: `A doubling sum 1 + 2 + … + 2ⁿ equals 2ⁿ⁺¹ − 1, so the total is 128 − 1 = ${s}.` })
  }
}

// ga.series.interleaved
{
  const F = 'ga.series.interleaved'
  const ilExp = (desc) => (s, a) => `Two series alternate: ${desc}. The missing term is ${a}.`
  seriesItem({ fam: F, d: 1, seq: INTER(AP(21, 1, 4), AP(20, 1, 3)), q: 'The series {S} is made of two patterns. What comes next?', exp: ilExp('21, 22, 23, … in the odd places and 20, 21, 22 in the even places') })
  seriesItem({ fam: F, d: 1, seq: INTER(AP(2, 2, 4), AP(20, -3, 3)), q: 'Two sequences are mixed in {S}. Find the next number.', exp: ilExp('2, 4, 6, 8 (adding 2) and 20, 17, 14 (subtracting 3)') })
  seriesItem({ fam: F, d: 2, seq: INTER(AP(5, 5, 4), AP(3, 3, 3)), q: 'Find the next term of {S}, where alternate terms follow separate rules.', exp: ilExp('multiples of 5 (5, 10, 15, 20) and multiples of 3 (3, 6, 9)') })
  seriesItem({ fam: F, d: 1, seq: INTER(AP(100, -10, 4), AP(1, 1, 3)), q: 'Every second number in {S} follows its own rule. What is the next number?', exp: ilExp('100, 90, 80, 70 and 1, 2, 3') })
  seriesItem({ fam: F, d: 2, seq: INTER(GP(3, 2, 4), GP(8, 2, 3)), q: 'What number should follow in {S}?', exp: ilExp('3, 6, 12, 24 and 8, 16, 32, each doubling') })
  seriesItem({ fam: F, d: 2, seq: INTER(AP(1, 1, 5), FN((n) => n * n, 4)), q: 'In {S}, the odd and even positions follow different rules. What comes next?', exp: ilExp('the counting numbers 1, 2, 3, 4, 5 and their squares 1, 4, 9, 16') })
  seriesItem({ fam: F, d: 2, seq: INTER(GP(64, 1 / 2, 4), AP(5, 5, 3)), q: 'Work out the missing term: {S}', exp: ilExp('64, 32, 16, 8 (halving) and 5, 10, 15 (adding 5)') })
  seriesItem({ fam: F, d: 2, seq: INTER(GP(2, 2, 4), GP(3, 3, 3)), q: 'What is the next number in the mixed series {S}?', exp: ilExp('powers of 2 (2, 4, 8, 16) and powers of 3 (3, 9, 27)') })
  seriesItem({ fam: F, d: 2, seq: INTER(AP(30, -5, 4), GP(2, 2, 3)), q: 'Determine the next entry in {S}.', exp: ilExp('30, 25, 20, 15 and 2, 4, 8') })
  seriesItem({ fam: F, d: 2, seq: INTER(AP(1, 2, 4), AP(10, -1, 4)), q: 'Look carefully at {S}. Which number is missing at the end?', exp: ilExp('1, 3, 5, 7 and 10, 9, 8, 7') })
  seriesItem({ fam: F, d: 2, seq: INTER(AP(4, 4, 4), AP(7, 4, 3)), hide: 2, q: 'Find the number that fits the gap in {S}.', exp: ilExp('4, 8, 12, 16 and 7, 11, 15, both adding 4') })
  seriesItem({ fam: F, d: 3, seq: INTER(AP(11, 11, 4), AP(13, 4, 3)), q: 'Which number continues {S} correctly?', exp: ilExp('multiples of 11 (11, 22, 33, 44) and 13, 17, 21 (adding 4)') })
  seriesItem({ fam: F, d: 3, seq: INTER(GP(9, 2, 4), AP(2, 3, 3)), q: 'Study {S}. What is the next term?', exp: ilExp('9, 18, 36, 72 (doubling) and 2, 5, 8 (adding 3)') })
  seriesItem({ fam: F, d: 3, seq: INTER(GP(1, 3, 4), GP(2, 3, 4)), q: 'Give the term that follows in {S}.', exp: ilExp('1, 3, 9, 27 and 2, 6, 18, 54, each multiplied by 3') })
}

// ga.series.squares-cubes
{
  const F = 'ga.series.squares-cubes'
  const pw = (desc) => (s, a) => `The terms are ${desc}, so the missing term is ${a}.`
  seriesItem({ fam: F, d: 1, seq: FN((n) => n * n, 6), q: 'What is the next number in {S}?', exp: pw('the squares 1², 2², 3², …') })
  seriesItem({ fam: F, d: 1, seq: FN((n) => n * n + 1, 6), q: 'Which number follows {S}?', exp: pw('one more than the squares (n² + 1)') })
  seriesItem({ fam: F, d: 1, seq: FN((n) => n * n - 1, 6), q: 'Find the next term in {S}.', exp: pw('one less than the squares (n² − 1)') })
  seriesItem({ fam: F, d: 1, seq: FN((n) => n ** 3, 5), q: 'Complete the series of cubes {S}.', exp: pw('the cubes 1³, 2³, 3³, …') })
  seriesItem({ fam: F, d: 2, seq: FN((n) => n ** 3 + 1, 5), q: 'The series {S} is based on cubes. What comes next?', exp: pw('one more than the cubes (n³ + 1)') })
  seriesItem({ fam: F, d: 3, seq: FN((n) => n ** 3 - n, 6), q: 'Find the next number of the sequence {S}.', exp: pw('n³ − n for n = 1, 2, 3, … (for example 5³ − 5 = 120)') })
  seriesItem({ fam: F, d: 1, seq: FN((n) => n * n, 5, 11), q: 'Which number comes after the last term of {S}?', exp: pw('the squares of 11, 12, 13, 14, 15') })
  seriesItem({ fam: F, d: 2, seq: FN((n) => (2 * n) ** 2, 5), q: 'What is the next term in the series {S}?', exp: pw('the squares of the even numbers 2, 4, 6, 8, 10') })
  seriesItem({ fam: F, d: 2, seq: FN((n) => (2 * n - 1) ** 2, 5), q: 'Choose the number that follows {S}.', exp: pw('the squares of the odd numbers 1, 3, 5, 7, 9') })
  seriesItem({ fam: F, d: 2, seq: FN((n) => 3 * n * n, 5), q: 'Find the missing term at the end of {S}.', exp: pw('three times the squares (3n²)') })
  seriesItem({ fam: F, d: 3, seq: FN((n) => (2 * n - 1) ** 3, 5), q: 'Identify the next term: {S}', exp: pw('the cubes of the odd numbers 1, 3, 5, 7, 9') })
  seriesItem({ fam: F, d: 2, seq: FN((n) => n * (n + 1), 7), q: 'Which number comes next in {S}?', exp: pw('products of consecutive numbers, n(n + 1): 1×2, 2×3, 3×4, …') })
  seriesItem({ fam: F, d: 1, seq: FN((n) => n ** 3, 5), hide: 2, q: 'What number is missing from {S}?', exp: pw('the cubes 1, 8, 27, 64, 125') })
  seriesItem({ fam: F, d: 3, seq: FN((n) => (n * (n + 1) * (2 * n + 1)) / 6, 6), q: 'What comes next in the series {S}?', exp: (s, a) => `Each term adds the next square: 1, 1 + 4, 5 + 9, 14 + 16, 30 + 25, so the next term is 55 + 36 = ${a}.` })
  seriesItem({ fam: F, d: 2, seq: FN((n) => n * n + 1, 6, 3), q: 'Find the term that comes next: {S}', exp: pw('n² + 1 for n = 3, 4, 5, 6, 7, 8') })
  seriesItem({ fam: F, d: 2, seq: FN((n) => (11 - n) ** 3, 5), q: 'The series {S} is decreasing. Which number follows?', exp: pw('the cubes of 10, 9, 8, 7, 6') })
}

// ga.series.primes
{
  const F = 'ga.series.primes'
  const win = (s, n) => PRIMES.slice(s, s + n)
  const pe = (desc) => (s, a) => `The terms are ${desc}, so the missing term is ${a}.`
  seriesItem({ fam: F, d: 1, seq: win(0, 6), q: 'Which number continues the series {S}?', exp: pe('consecutive prime numbers') })
  seriesItem({ fam: F, d: 1, seq: [13, 17, 19, 23, 29], q: 'What is the next number: {S}?', exp: pe('consecutive primes after 11') })
  seriesItem({ fam: F, d: 2, seq: [53, 59, 61, 67], q: 'Find the term after the last one in {S}.', exp: pe('consecutive primes (there is no prime between 61 and 67)') })
  seriesItem({ fam: F, d: 2, seq: win(1, 5).map((p) => p * p), q: 'What comes next in {S}?', exp: pe('squares of consecutive primes: 2², 3², 5², 7², 11²') })
  seriesItem({ fam: F, d: 3, seq: win(1, 6).map((p) => p + 1), q: 'The numbers {S} are each one more than a special number. What comes next?', exp: pe('one more than consecutive primes 2, 3, 5, 7, 11, 13') })
  seriesItem({ fam: F, d: 2, seq: [29, 23, 19, 17, 13], q: 'Which number should follow in the descending series {S}?', exp: pe('primes in decreasing order') })
  seriesItem({ fam: F, d: 1, seq: [5, 7, 11, 13, 17, 19], q: 'Which is the next term: {S}?', exp: pe('consecutive primes from 5 onwards') })
  seriesItem({ fam: F, d: 1, seq: [19, 23, 29, 31, 37], hide: 2, q: 'Find the missing prime in {S}.', exp: pe('consecutive primes') })
}

// ga.series.mixed-operation (x → ax + b, alternating operations, multiplying by consecutive numbers)
{
  const F = 'ga.series.mixed-operation'
  const lin = (a, b) => (s, ans) => `Each term is ${a === 1 ? '' : `${a} times `}the previous term ${b >= 0 ? `plus ${b}` : `minus ${-b}`}, so the missing term is ${ans}.`
  const alt = (desc) => (s, a) => `The operations alternate: ${desc}. The missing term is ${a}.`
  seriesItem({ fam: F, d: 2, seq: REC(2, (x) => 2 * x + 1, 6), q: 'Which number comes next in the pattern {S}?', exp: lin(2, 1) })
  seriesItem({ fam: F, d: 3, seq: REC(3, (x) => 3 * x - 1, 5), q: 'Work out the next number in {S}.', exp: lin(3, -1) })
  seriesItem({ fam: F, d: 1, seq: REC(1, (x) => 2 * x + 1, 6), q: 'What is the next term: {S}', exp: lin(2, 1) })
  seriesItem({ fam: F, d: 2, seq: REC(4, (x) => 2 * x - 2, 6), q: 'The series {S} follows one rule. What comes next?', exp: lin(2, -2) })
  seriesItem({ fam: F, d: 2, seq: REC(2, (x, i) => (i % 2 ? 2 * x : x + 3), 7), q: 'Find the next number of the series {S}.', exp: alt('×2, +3, ×2, +3, …') })
  seriesItem({ fam: F, d: 2, seq: REC(5, (x, i) => (i % 2 ? 2 * x : x - 3), 7), q: 'Supply the missing term: {S}', exp: alt('×2, −3, ×2, −3, …') })
  seriesItem({ fam: F, d: 3, seq: REC(100, (x, i) => (i % 2 ? x / 2 : x + 2), 6), q: 'Which number comes next in {S}?', exp: alt('÷2, +2, ÷2, +2, …') })
  seriesItem({ fam: F, d: 2, seq: REC(3, (x, i) => (i % 2 ? x + 1 : 2 * x), 7), q: 'What number should replace the question mark: {S}', exp: alt('+1, ×2, +1, ×2, …') })
  seriesItem({ fam: F, d: 2, seq: REC(1, (x, i) => x * (i + 1), 6), q: 'Find the next term of {S}.', exp: (s, a) => `The terms are multiplied by 2, 3, 4, 5 in turn; the next multiplier is 6, so the term is 120 × 6 = ${a}.` })
  seriesItem({ fam: F, d: 1, seq: REC(2, (x) => 2 * x - 1, 6), q: 'Name the term that follows {S}.', exp: lin(2, -1) })
  seriesItem({ fam: F, d: 3, seq: REC(1, (x) => 3 * x - 1, 6), q: 'Write down the term that completes {S}', exp: lin(3, -1) })
  seriesItem({ fam: F, d: 2, seq: REC(6, (x) => 2 * x + 1, 5), q: 'Which term comes next in {S}?', exp: lin(2, 1) })
  seriesItem({ fam: F, d: 2, seq: REC(7, (x) => 2 * x - 2, 6), q: 'Predict the next number: {S}', exp: lin(2, -2) })
  seriesItem({ fam: F, d: 3, seq: REC(720, (x, i) => x / (i + 1), 6), q: 'What is the last term of {S}?', exp: (s, a) => `The terms are divided by 2, 3, 4, 5 in turn; dividing 6 by 6 gives ${a}.` })
  seriesItem({ fam: F, d: 1, seq: REC(8, (x, i) => (i % 2 ? x + 4 : x - 3), 7), q: 'What number comes after the last term of {S}?', exp: alt('+4, −3, +4, −3, …') })
  seriesItem({ fam: F, d: 3, seq: REC(1, (x, i) => (i % 2 ? 4 * x : x - 2), 7), q: 'Find the number that continues {S}.', exp: alt('×4, −2, ×4, −2, …') })
}

// ga.series.fibonacci-type
{
  const F = 'ga.series.fibonacci-type'
  const fe = (s, a) => `Each term is the sum of the two terms before it, so the missing term is ${a}.`
  seriesItem({ fam: F, d: 1, seq: [1, 1, 2, 3, 5, 8, 13], q: 'Which number comes next: {S}?', exp: fe })
  seriesItem({ fam: F, d: 1, seq: [2, 3, 5, 8, 13, 21], q: 'Each new term of {S} is built from earlier ones. Which number is next?', exp: fe })
  seriesItem({ fam: F, d: 2, seq: [4, 7, 11, 18, 29, 47], q: 'Find the term after the last in the sequence {S}', exp: fe })
  seriesItem({ fam: F, d: 2, seq: [3, 3, 6, 9, 15, 24], q: 'Continue the sequence {S}.', exp: fe })
  seriesItem({ fam: F, d: 2, seq: [5, 8, 13, 21, 34], hide: 3, q: 'Which number is missing in {S}?', exp: fe })
  seriesItem({ fam: F, d: 2, seq: [1, 3, 4, 7, 11, 18, 29], q: 'Give the next number in the series {S}.', exp: fe })
  seriesItem({ fam: F, d: 2, seq: [2, 2, 4, 6, 10, 16, 26], q: 'What should come after the last term of {S}?', exp: fe })
  seriesItem({ fam: F, d: 3, seq: [1, 1, 2, 4, 7, 13, 24], q: 'Determine the next term of {S}.', exp: (s, a) => `Each term is the sum of the three terms before it (4 + 7 + 13 = 24), so the missing term is ${a}.` })
}

// ga.series.wrong-term — exactly one listed term breaks the rule
function wrongTermItem({ d, seq, wrong, pick, q, exp, property }) {
  const fam = 'ga.series.wrong-term'
  const wi = seq.indexOf(wrong)
  assert(wi >= 0, 'wrong term present')
  const idx = [wi, ...pick.map((v) => seq.indexOf(v))]
  assert(idx.every((i) => i >= 0), `pick terms present ${seq}`)
  if (property) {
    assert(seq.filter((v) => !property(v)).length === 1 && !property(wrong), `property singles out ${wrong}`)
  } else {
    assert(fitsWithGap(seq, wi), `correcting ${wrong} should repair ${seq}`)
  }
  for (const i of idx.slice(1)) assert(!fitsWithGap(seq, i), `term ${seq[i]} must not be repairable in ${seq}`)
  // parity sanity: no other option is the only odd/even term of the list
  for (const i of idx.slice(1)) {
    const par = seq[i] % 2
    assert(seq.filter((v) => v % 2 === par).length > 1, `option ${seq[i]} is the only ${par ? 'odd' : 'even'} term`)
  }
  add({ st: 'ga.series', fam, concept: `wrong-term-${seq.join('-')}`, d, q: q.replace('{S}', list(seq.map((v) => fmt(v)))), ans: fmt(wrong), wrong: pick.map((v) => fmt(v)), exp })
}
wrongTermItem({ d: 1, seq: [3, 7, 11, 16, 19, 23], wrong: 16, pick: [7, 19, 23], q: 'Which number in the series {S} is wrong?', exp: 'The terms rise by 4 each time (3, 7, 11, 15, 19, 23); 16 should be 15.' })
wrongTermItem({ d: 2, seq: [2, 6, 18, 54, 160, 486], wrong: 160, pick: [18, 54, 486], q: 'One term of {S} does not fit. Which one?', exp: 'Each term is three times the previous one; after 54 the term should be 162, not 160.' })
wrongTermItem({ d: 1, seq: [1, 4, 9, 16, 24, 36], wrong: 24, pick: [9, 16, 36], q: 'Find the odd number out in the series {S}.', exp: 'The terms are the squares 1, 4, 9, 16, 25, 36; 24 should be 25.' })
wrongTermItem({ d: 2, seq: [5, 7, 11, 17, 26, 35], wrong: 26, pick: [11, 17, 35], q: 'Which term spoils the pattern of {S}?', exp: 'The differences should be 2, 4, 6, 8, 10, giving 5, 7, 11, 17, 25, 35; 26 should be 25.' })
wrongTermItem({ d: 2, seq: [1, 8, 27, 63, 125, 216], wrong: 63, pick: [27, 125, 216], q: 'Spot the incorrect number in {S}.', exp: 'The series is made of the cubes 1³ to 6³; 63 should be 4³ = 64.' })
wrongTermItem({ d: 1, seq: [4, 9, 16, 25, 35, 49], wrong: 35, pick: [16, 25, 49], q: 'Point out the number that does not belong to the series {S}.', exp: 'The terms are the squares of 2 to 7; 35 should be 36.' })
wrongTermItem({ d: 1, seq: [14, 21, 35, 42, 50, 63], wrong: 50, property: (v) => v % 7 === 0, pick: [21, 42, 63], q: 'All but one of the numbers {S} share a property. Which is the exception?', exp: 'Every other number is a multiple of 7; 50 is not.' })
wrongTermItem({ d: 2, seq: [11, 13, 17, 19, 21, 23, 29], wrong: 21, property: isPrime, pick: [13, 19, 23], q: 'Which number should not appear in {S}?', exp: 'The series lists consecutive primes; 21 = 3 × 7 is not prime.' })
wrongTermItem({ d: 2, seq: [2, 5, 10, 17, 26, 38, 50], wrong: 38, pick: [10, 26, 50], q: 'In the series {S}, one number is wrong. Identify it.', exp: 'The terms are n² + 1 (2, 5, 10, 17, 26, 37, 50); 38 should be 37.' })
wrongTermItem({ d: 2, seq: [7, 14, 28, 56, 110, 224], wrong: 110, pick: [28, 56, 224], q: 'Which of these terms breaks the rule of {S}?', exp: 'Each term doubles the previous one; after 56 comes 112, not 110.' })
wrongTermItem({ d: 2, seq: [6, 12, 20, 30, 44, 56], wrong: 44, pick: [12, 20, 56], q: 'Locate the misfit in the sequence {S}.', exp: 'The terms are 2×3, 3×4, 4×5, 5×6, 6×7, 7×8; 44 should be 42.' })
wrongTermItem({ d: 1, seq: [64, 32, 16, 9, 4, 2], wrong: 9, pick: [32, 16, 4], q: 'Which number is out of place in {S}?', exp: 'Each term is half of the previous one: 64, 32, 16, 8, 4, 2; 9 should be 8.' })
wrongTermItem({ d: 3, seq: [3, 5, 9, 17, 34, 65], wrong: 34, pick: [9, 17, 65], q: 'The series {S} contains one error. Which term is it?', exp: 'Each term is twice the previous one minus 1: 3, 5, 9, 17, 33, 65; 34 should be 33.' })
wrongTermItem({ d: 3, seq: [1, 10, 2, 20, 3, 31, 4, 40], wrong: 31, pick: [10, 20, 40], q: 'Two patterns are interwoven in {S}, but one term is wrong. Which?', exp: 'The odd places run 1, 2, 3, 4 and the even places 10, 20, 30, 40; 31 should be 30.' })

// ga.series.two-missing-terms
function twoMissing({ d, seq, q, exp, alts = [] }) {
  const n = seq.length
  const [A, B] = [seq[0], seq[n - 1]]
  assert(validFill(seq), `two-missing answer ${seq}`)
  const show = seq.map((v, i) => (i === 0 ? 'a' : i === n - 1 ? 'b' : fmt(v)))
  const label = (a, b) => `a = ${fmt(a)}, b = ${fmt(b)}`
  const cand = [...alts]
  for (const k of [1, 2, 3, 4]) cand.push([A + k, B], [A, B - k], [A - k, B + k], [A + k, B + k], [A, B + k], [A - k, B])
  const wrong = []
  for (const [a, b] of cand) {
    if (wrong.length === 3) break
    if ((near(a, A) && near(b, B)) || wrong.some(([x, y]) => near(x, a) && near(y, b))) continue
    const f = [a, ...seq.slice(1, -1), b]
    if (validFill(f)) continue
    wrong.push([a, b])
  }
  assert(wrong.length === 3, 'two-missing distractors')
  add({ st: 'ga.series', fam: 'ga.series.two-missing-terms', concept: `two-missing-${seq.join('-')}`, d, q: q.replace('{S}', list(show)), ans: label(A, B), wrong: wrong.map(([a, b]) => label(a, b)), exp })
}
twoMissing({ d: 1, seq: FN((n) => n * n, 6), q: 'In the series {S}, what are the values of a and b?', exp: 'The terms are the squares 1², 2², …, 6², so a = 1 and b = 36.' })
twoMissing({ d: 1, seq: AP(3, 4, 6), q: 'Find a and b in {S}.', exp: 'The terms increase by 4, so a = 7 − 4 = 3 and b = 19 + 4 = 23.' })
twoMissing({ d: 1, seq: GP(3, 2, 6), alts: [[4, 96], [3, 72]], q: 'The first and last terms of {S} are missing. What are a and b?', exp: 'Each term doubles the previous one, so a = 6 ÷ 2 = 3 and b = 48 × 2 = 96.' })
twoMissing({ d: 3, seq: REC(21, (x, i) => x - (2 * i - 1), 6), q: 'Determine a and b in the sequence {S}.', exp: 'The differences are −1, −3, −5, −7, −9, so a = 20 + 1 = 21 and b = 5 − 9 = −4.' })
twoMissing({ d: 2, seq: REC(1, (x, i) => x + 2 * i + 2, 6), q: 'What values of a and b complete {S}?', exp: 'The differences are 4, 6, 8, 10, 12, so a = 5 − 4 = 1 and b = 29 + 12 = 41.' })
twoMissing({ d: 3, seq: INTER(AP(10, 3, 4), AP(2, 2, 3)), q: 'Alternate terms of {S} follow two rules. Find a and b.', exp: 'The odd places are a, 13, 16, b (adding 3) and the even places 2, 4, 6; so a = 10 and b = 19.' })
twoMissing({ d: 1, seq: GP(1, 3, 6), q: 'Work out the missing end terms a and b of {S}.', exp: 'Each term is three times the one before, so a = 3 ÷ 3 = 1 and b = 81 × 3 = 243.' })
twoMissing({ d: 2, seq: REC(18, (x, i) => x - (2 * i - 1), 7), q: 'Which pair gives the terms a and b in {S}?', exp: 'The differences are −1, −3, −5, −7, −9, −11, so a = 17 + 1 = 18 and b = −7 − 11 = −18.' })

// ga.series.letter-skip
{
  const F = 'ga.series.letter-skip'
  const le = (desc) => (s, a) => `${desc}, so the missing letter is ${a}.`
  const pos = (s) => list(s.map((v) => `${N2A(v)}(${v})`))
  seriesItem({ fam: F, d: 1, letters: true, seq: LET('BEHKN'), q: 'Which letter comes next in the series {S}?', exp: le('Each letter is three places after the previous one (B, E, H, K, N)') })
  seriesItem({ fam: F, d: 2, letters: true, seq: LET('ACFJOU'), q: 'Find the next letter: {S}', exp: (s, a) => `The gaps between the letters grow by one: +2, +3, +4, +5, +6 (${pos(s)}), so the missing letter is ${a}.` })
  seriesItem({ fam: F, d: 2, letters: true, seq: LET('ZXUQL'), q: 'What letter should follow in {S}?', exp: (s, a) => `The letters move back 2, 3, 4, 5 places (${pos(s)}), so the missing letter is ${a}.` })
  seriesItem({ fam: F, d: 2, letters: true, seq: LET('AZBYCX'), q: 'Complete the letter series {S}.', exp: le('Two series alternate: A, B, C forward and Z, Y, X backward') })
  seriesItem({ fam: F, d: 1, letters: true, seq: LET('CFILOR'), hide: 4, q: 'Which letter is missing from {S}?', exp: le('The letters advance three places at a time: C, F, I, L, O, R') })
  seriesItem({ fam: F, d: 2, letters: true, seq: LET('DGKPV'), q: 'Choose the letter that continues {S}.', exp: (s, a) => `The gaps are +3, +4, +5, +6 (${pos(s)}), so the missing letter is ${a}.` })
  seriesItem({ fam: F, d: 1, letters: true, seq: LET('YWUSQ'), q: 'Identify the next letter in {S}.', exp: le('Each letter is two places before the previous one') })
  seriesItem({ fam: F, d: 2, letters: true, seq: LET('MNLOKP'), q: 'Two letter patterns are mixed in {S}. What comes next?', exp: le('M, L, K go backward and N, O, P go forward in alternate places') })
  seriesItem({ fam: F, d: 3, letters: true, seq: LET('ADIPY'), q: 'Using alphabet positions, find the next letter of {S}.', exp: (s, a) => `The positions are ${list(s.slice(0, 4))}, the squares 1, 4, 9, 16; the next square is 25, the letter ${a}.` })
  seriesItem({ fam: F, d: 3, letters: true, seq: LET('CEGKMQ'), q: 'Look at the positions of the letters in {S}. Which letter follows?', exp: (s, a) => `The positions 3, 5, 7, 11, 13 are consecutive primes; the next prime is 17, the letter ${a}.` })
  seriesItem({ fam: F, d: 3, letters: true, seq: LET('ZYWTPK'), q: 'What is the next letter in the backward series {S}?', exp: (s, a) => `The letters move back 1, 2, 3, 4, 5 places (${pos(s)}), so the missing letter is ${a}.` })
  seriesItem({ fam: F, d: 1, letters: true, seq: LET('BFJNR'), q: 'Supply the next letter: {S}', exp: le('Each letter is four places after the previous one') })
}

// ga.series.letter-group — each position of the groups follows its own rule
function tokens(g) { return g.match(/[A-Z]|\d+/g).map((t) => (/\d/.test(t) ? { t: 'N', v: Number(t) } : { t: 'L', v: A2N(t) })) }
function groupValid(groups) {
  const tk = groups.map(tokens)
  if (!tk.every((t) => t.length === tk[0].length && t.every((x, i) => x.t === tk[0][i].t))) return false
  return tk[0].every((_, p) => validFill(tk.map((t) => t[p].v)))
}
function groupItem({ d, groups, q, exp, alts = [] }) {
  const ans = groups[groups.length - 1]
  assert(groupValid(groups), `letter group answer ${groups}`)
  const cand = [...alts]
  const base = tokens(ans)
  for (const k of [1, -1, 2, -2]) {
    for (let p = 0; p < base.length; p++) {
      cand.push(base.map((x, i) => (i === p ? (x.t === 'L' ? N2A(x.v + k) : String(x.v + k)) : x.t === 'L' ? N2A(x.v) : String(x.v))).join(''))
    }
  }
  const wrong = []
  for (const c of cand) {
    if (wrong.length === 3) break
    if (c === ans || wrong.includes(c) || groups.includes(c)) continue
    if (groupValid([...groups.slice(0, -1), c])) continue
    wrong.push(c)
  }
  assert(wrong.length === 3, 'group distractors')
  add({ st: 'ga.series', fam: 'ga.series.letter-group', concept: `letter-group-${groups.join('-')}`, d, q: q.replace('{S}', list([...groups.slice(0, -1), '?'])), ans, wrong, exp })
}
groupItem({ d: 1, groups: ['ACE', 'BDF', 'CEG', 'DFH', 'EGI'], q: 'Which group of letters comes next: {S}', exp: 'Each letter moves one place forward from group to group, so DFH becomes EGI.' })
groupItem({ d: 1, groups: ['AZ', 'BY', 'CX', 'DW', 'EV'], alts: ['EW', 'FV'], q: 'Find the next pair in {S}.', exp: 'The first letters go forward (A, B, C, D, E) and the second letters go backward (Z, Y, X, W, V).' })
groupItem({ d: 2, groups: ['ABD', 'DEG', 'GHJ', 'JKM', 'MNP'], q: 'What comes next in the letter series {S}?', exp: 'Each group starts where the previous one ended (…D, D…) and follows the pattern +1, +2 inside the group: M, N, P.' })
groupItem({ d: 2, groups: ['BDF', 'HJL', 'NPR', 'TVX'], q: 'Complete the series {S}.', exp: 'The letters B, D, F, H, J, L, N, P, R run on in steps of two, so the next group is T, V, X.' })
groupItem({ d: 1, groups: ['AB', 'DE', 'GH', 'JK', 'MN'], q: 'Choose the pair of letters that follows {S}.', exp: 'Each pair is two consecutive letters, and one letter is skipped between pairs (C, F, I, L), so the next pair is MN.' })
groupItem({ d: 1, groups: ['ZYX', 'WVU', 'TSR', 'QPO'], q: 'Which letter group continues the backward series {S}?', exp: 'The alphabet is written backwards in blocks of three: ZYX, WVU, TSR, QPO.' })
groupItem({ d: 2, groups: ['AC', 'FH', 'KM', 'PR', 'UW'], q: 'Identify the next term: {S}', exp: 'Both letters move five places forward each time (A→F→K→P→U, C→H→M→R→W).' })
groupItem({ d: 1, groups: ['B2', 'D4', 'F6', 'H8', 'J10'], q: 'What is the next term of the series {S}?', exp: 'The letters skip one each time and each number is the position of its letter in the alphabet: J is the 10th letter.' })
groupItem({ d: 2, groups: ['C9', 'E25', 'G49', 'I81'], alts: ['I64', 'H81'], q: 'In {S}, each number depends on its letter. What comes next?', exp: 'Each number is the square of its letter’s position: C = 3 → 9, E = 5 → 25, G = 7 → 49, so I = 9 → 81.' })
groupItem({ d: 3, groups: ['KM5', 'IP8', 'GS11', 'EV14', 'CY17'], q: 'Find the term that comes next in {S}.', exp: 'The first letters go back two (K, I, G, E, C), the second letters go forward three (M, P, S, V, Y) and the numbers rise by 3 (5, 8, 11, 14, 17).' })
groupItem({ d: 3, groups: ['AYB', 'CWD', 'EUF', 'GSH'], q: 'Which group should replace the question mark in {S}?', exp: 'The first and last letters run forward in pairs (A B, C D, E F, G H) while the middle letters go back two at a time (Y, W, U, S).' })
groupItem({ d: 2, groups: ['XA', 'VC', 'TE', 'RG', 'PI'], q: 'What pair of letters comes next: {S}', exp: 'The first letters go back two places (X, V, T, R, P) and the second go forward two places (A, C, E, G, I).' })

// ---------------------------------------------------------------------------
// CODING (ga.coding)
// ---------------------------------------------------------------------------
const rev = (w) => [...w].reverse().join('')
const mapW = (f) => (w) => [...w].map((c, i) => N2A(f(A2N(c), i))).join('')
const shiftW = (k) => mapW((p) => p + k)
const oppW = mapW((p) => 27 - p)
const progW = (s, step) => mapW((p, i) => p + s + step * i)
const altW = (a, b) => mapW((p, i) => p + (i % 2 ? b : a))
const compose = (...fs) => (w) => fs.reduce((x, f) => f(x), w)
const REARR = {
  id: (w) => w,
  rev,
  halves: (w) => (w.length % 2 ? null : w.slice(w.length / 2) + w.slice(0, w.length / 2)),
  pairs: (w) => (w.length % 2 ? null : w.replace(/(.)(.)/g, '$2$1')),
  revHalves: (w) => (w.length % 2 ? null : rev(w.slice(0, w.length / 2)) + rev(w.slice(w.length / 2))),
  ends: (w) => (w.length < 3 ? null : w.at(-1) + w.slice(1, -1) + w[0]),
  rotL: (w) => w.slice(1) + w[0],
  rotR: (w) => w.at(-1) + w.slice(0, -1),
}
const LETTER_RULES = (() => {
  const out = []
  const fixed = [...Array(26)].map((_, k) => shiftW(k)).concat([oppW, compose(oppW, shiftW(1)), compose(oppW, shiftW(-1))])
  for (const r of Object.values(REARR)) for (const m of fixed) out.push((w) => { const x = r(w); return x == null ? null : m(x) })
  const dep = []
  for (let s = -6; s <= 6; s++) for (const st of [-2, -1, 1, 2]) dep.push(progW(s, st))
  for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (a !== b) dep.push(altW(a, b))
  for (const m of dep) { out.push(m); out.push((w) => m(rev(w))); out.push((w) => rev(m(w))) }
  return out
})()
function consistentLetterRules(examples) { return LETTER_RULES.filter((r) => examples.every(([w, c]) => r(w) === c)) }
const oneLetter = (w, i, k) => [...w].map((c, j) => (j === i ? N2A(A2N(c) + k) : c)).join('')
function letterCodeItem({ fam, d, rule, ex, target, q, why }) {
  const codes = ex.map(rule)
  const ans = rule(target)
  if (ex.length) {
    const cons = consistentLetterRules(ex.map((w, i) => [w, codes[i]]))
    const outs = new Set(cons.map((r) => r(target)))
    assert(outs.size === 1 && outs.has(ans), `letter code ${ex}→${codes} does not fix ${target} uniquely: ${[...outs].slice(0, 5)}`)
  }
  const m = Math.floor(ans.length / 2)
  const cand = [shiftW(1)(ans), oneLetter(ans, m, 1), shiftW(-1)(ans), rev(ans), oneLetter(ans, ans.length - 1, -1), oneLetter(ans, 0, 1), target]
  const wrong = [...new Set(cand)].filter((c) => c !== ans).slice(0, 3)
  add({ st: 'ga.coding', fam, concept: `code-${ex.join('-')}-${target}`, d, q: q(codes), ans, wrong, exp: `${why}, so ${target} is written as ${ans}.` })
}
function letterDecodeItem({ fam, d, rule, ex, word, others, q, why }) {
  const codes = ex.map(rule)
  const code = rule(word)
  const cons = ex.length ? consistentLetterRules(ex.map((w, i) => [w, codes[i]])) : [rule]
  assert(cons.every((r) => r(word) === code), `decode ${word}`)
  for (const o of others) assert(!cons.some((r) => r(o) === code), `decode distractor ${o} also fits`)
  add({ st: 'ga.coding', fam, concept: `decode-${ex.join('-')}-${word}`, d, q: q(codes, code), ans: word, wrong: others, exp: `${why}; reversing the rule on ${code} gives ${word}.` })
}
const shiftWhy = (k, w, c) => `Each letter moves ${Math.abs(k)} place${Math.abs(k) > 1 ? 's' : ''} ${k > 0 ? 'forward' : 'back'} in the alphabet (${w} → ${c})`

// ga.coding.letter-shift
{
  const F = 'ga.coding.letter-shift'
  const L = (d, k, ex, target, q) => letterCodeItem({ fam: F, d, rule: shiftW(k), ex: [ex], target, q, why: shiftWhy(k, ex, shiftW(k)(ex)) })
  L(1, 1, 'MANGO', 'APPLE', (c) => `In a certain code, MANGO is written as ${c[0]}. How is APPLE written in that code?`)
  L(1, 2, 'TABLE', 'CHAIR', (c) => `If TABLE is coded as ${c[0]}, what is the code for CHAIR?`)
  L(1, -1, 'LIGHT', 'SOUND', (c) => `A secret language writes LIGHT as ${c[0]}. In the same language, how would SOUND be written?`)
  L(2, 3, 'FAST', 'SLOW', (c) => `When FAST is coded as ${c[0]}, which of the following is the code for SLOW?`)
  L(2, -2, 'CLOUD', 'STORM', (c) => `CLOUD becomes ${c[0]} in a certain code. What does STORM become?`)
  L(2, 4, 'BOOK', 'PAGE', (c) => `In a coding system BOOK is ${c[0]}. Using the same system, write PAGE.`)
  L(2, -3, 'WATER', 'RIVER', (c) => `If the code for WATER is ${c[0]}, find the code for RIVER.`)
  L(3, 5, 'CAT', 'DOG', (c) => `CAT is written as ${c[0]} in a code language. Following the same rule, DOG is written as:`)
  L(3, 2, 'ZEBRA', 'YACHT', (c) => `In a code where ZEBRA is written ${c[0]}, how is YACHT written? (After Z the alphabet starts again at A.)`)
  L(1, 3, 'PENCIL', 'INK', (c) => `PENCIL is coded as ${c[0]}. What is the code for INK?`)
  L(2, -1, 'EARTH', 'MOON', (c) => `Suppose EARTH is written as ${c[0]}. How, then, is MOON written?`)
  L(3, 6, 'GOLD', 'IRON', (c) => `A code turns GOLD into ${c[0]}. Into what does it turn IRON?`)
  letterCodeItem({ fam: F, d: 1, rule: shiftW(1), ex: [], target: 'HOUSE', q: () => 'If each letter of HOUSE is replaced by the letter that follows it in the alphabet, what is obtained?', why: 'Each letter is replaced by the next letter (H → I, O → P, U → V, S → T, E → F)' })
  letterCodeItem({ fam: F, d: 1, rule: shiftW(-2), ex: [], target: 'FIELD', q: () => 'Replace every letter of FIELD by the letter two places before it in the alphabet. What do you get?', why: 'Each letter moves two places back (F → D, I → G, E → C, L → J, D → B)' })
}

// ga.coding.rearrangement
{
  const F = 'ga.coding.rearrangement'
  const R = (d, rule, ex, target, why, q) => letterCodeItem({ fam: F, d, rule, ex: [ex], target, q, why })
  R(1, rev, 'LAMP', 'DESK', 'The letters are written in reverse order', (c) => `If LAMP is written as ${c[0]}, how is DESK written?`)
  R(1, rev, 'FRIEND', 'CANDLE', 'The word is written backwards', (c) => `In a code, FRIEND is written as ${c[0]}. How will CANDLE be written?`)
  R(3, compose(rev, shiftW(1)), 'FORM', 'WIND', 'The word is reversed and then each letter moves one place forward (FORM → MROF → NSPG)', (c) => `FORM is coded as ${c[0]}. Using the same method, what is the code for WIND?`)
  R(2, REARR.halves, 'GARDEN', 'BRIGHT', 'The two halves of the word change places (GAR|DEN → DEN|GAR)', (c) => `The code for GARDEN is ${c[0]}. What is the code for BRIGHT?`)
  R(2, REARR.pairs, 'PLANET', 'CASTLE', 'Each pair of neighbouring letters is swapped (PL→LP, AN→NA, ET→TE)', (c) => `If PLANET is written as ${c[0]} in a code, then CASTLE is written as:`)
  R(2, REARR.revHalves, 'SILVER', 'GOLDEN', 'Each half of the word is reversed separately (SIL → LIS, VER → REV)', (c) => `SILVER is coded as ${c[0]}. What would GOLDEN be coded as?`)
  letterCodeItem({ fam: F, d: 1, rule: rev, ex: [], target: 'GRASS', why: 'The rule stated is to write the word backwards', q: () => `A word is coded by writing it backwards: PLANT becomes ${rev('PLANT')}. What does GRASS become?` })
  R(1, REARR.ends, 'TIGER', 'HORSE', 'The first and last letters change places', (c) => `If TIGER is coded ${c[0]}, what is the code for HORSE?`)
  R(3, compose(rev, shiftW(-1)), 'CODE', 'BEAR', 'The word is reversed and each letter moves one place back (CODE → EDOC → DCNB)', (c) => `In a certain language CODE is written as ${c[0]}. How is BEAR written in that language?`)
  R(2, REARR.rotL, 'STAMP', 'FRAME', 'The first letter is moved to the end', (c) => `STAMP is written as ${c[0]}. By the same rule, how is FRAME written?`)
  R(2, REARR.rotR, 'CLEAR', 'WHITE', 'The last letter is moved to the front', (c) => `By a certain rule, CLEAR is changed to ${c[0]}. What does WHITE change to?`)
  R(3, compose(rev, oppW), 'WORD', 'GAME', 'The word is reversed and each letter is replaced by its opposite letter (A↔Z, B↔Y, …)', (c) => `If WORD is written as ${c[0]}, how is GAME written?`)
}

// ga.coding.number-substitution
const NUM_RULES = (() => {
  const fs = []
  for (let k = -3; k <= 3; k++) fs.push((p) => p + k)
  for (let k = -2; k <= 2; k++) fs.push((p) => 27 - p + k)
  fs.push((p) => 2 * p, (p) => 3 * p, (p) => p * p, (p) => 2 * p - 1, (p) => 2 * p + 1)
  const out = []
  for (const f of fs) { out.push((w) => [...w].map((c) => f(A2N(c))).join('-')); out.push((w) => [...rev(w)].map((c) => f(A2N(c))).join('-')) }
  return out
})()
const numCode = (f, r = false) => (w) => [...(r ? rev(w) : w)].map((c) => f(A2N(c))).join('-')
{
  const F = 'ga.coding.number-substitution'
  const N = ({ d, rule, ex, target, q, why }) => {
    const codes = ex.map(rule), ans = rule(target)
    if (ex.length) { const cons = NUM_RULES.filter((r) => ex.every((w, i) => r(w) === codes[i])); const outs = new Set(cons.map((r) => r(target))); assert(outs.size === 1 && outs.has(ans), `number code ${ex} ${target}`) }
    const parts = ans.split('-').map(Number)
    const cand = [parts.map((x) => x + 1).join('-'), [...parts].reverse().join('-'), parts.map((x, i) => (i === 1 ? x + 1 : x)).join('-'), parts.map((x) => x - 1).join('-'), parts.map((x, i) => (i === parts.length - 1 ? x + 2 : x)).join('-')]
    const wrong = [...new Set(cand)].filter((c) => c !== ans).slice(0, 3)
    add({ st: 'ga.coding', fam: F, concept: `numcode-${ex.join('-')}-${target}`, d, q: q(codes), ans, wrong, exp: `${why}, so ${target} is ${ans}.` })
  }
  const ND = ({ d, rule, ex, word, others, q, why }) => {
    const codes = ex.map(rule), code = rule(word)
    const cons = ex.length ? NUM_RULES.filter((r) => ex.every((w, i) => r(w) === codes[i])) : [rule]
    assert(cons.length && cons.every((r) => r(word) === code), `numdecode ${word}`)
    for (const o of others) assert(!cons.some((r) => r(o) === code), `numdecode distractor ${o}`)
    add({ st: 'ga.coding', fam: F, concept: `numdecode-${ex.join('-')}-${word}`, d, q: q(codes, code), ans: word, wrong: others, exp: `${why}; ${code} therefore spells ${word}.` })
  }
  const pos = numCode((p) => p)
  N({ d: 1, rule: pos, ex: ['CAB'], target: 'FACE', q: (c) => `If CAB is written as ${c[0]}, how is FACE written?`, why: 'Each letter is replaced by its position in the alphabet (C = 3, A = 1, B = 2)' })
  N({ d: 1, rule: pos, ex: [], target: 'HEAD', q: () => 'If A = 1, B = 2, C = 3 and so on, how is HEAD written in numbers?', why: 'H, E, A, D are the 8th, 5th, 1st and 4th letters' })
  ND({ d: 1, rule: pos, ex: ['CAT'], word: 'DOG', others: ['DIG', 'FOG', 'DOT'], q: (c, code) => `If ${c[0]} stands for CAT, which word does ${code} stand for?`, why: 'Each number is the position of a letter in the alphabet' })
  N({ d: 2, rule: numCode((p) => 27 - p), ex: [], target: 'BOX', q: () => 'If A = 26, B = 25, C = 24, …, Z = 1, what is the code for BOX?', why: 'Each letter gets 27 minus its usual position (B = 25, O = 12, X = 3)' })
  N({ d: 1, rule: numCode((p) => p + 1), ex: ['CAT'], target: 'RAT', q: (c) => `If CAT is written as ${c[0]}, how is RAT written?`, why: 'Each letter is written as one more than its position (C = 3 → 4, A = 1 → 2, T = 20 → 21)' })
  N({ d: 1, rule: pos, ex: ['BIRD'], target: 'WING', q: (c) => `In a code, BIRD is ${c[0]}. How is WING written?`, why: 'Each letter is replaced by its position in the alphabet' })
  N({ d: 2, rule: numCode((p) => 2 * p), ex: ['BAD'], target: 'FEED', q: (c) => `If BAD is written as ${c[0]}, what is the code for FEED?`, why: 'Each letter is written as twice its position (B = 2 → 4, A = 1 → 2, D = 4 → 8)' })
  N({ d: 3, rule: numCode((p) => p * p), ex: ['ACE'], target: 'BED', q: (c) => `If ACE is written as ${c[0]}, how is BED written?`, why: 'Each letter is written as the square of its position (A = 1 → 1, C = 3 → 9, E = 5 → 25)' })
  N({ d: 2, rule: numCode((p) => p, true), ex: ['CAT'], target: 'DOG', q: (c) => `If CAT is coded ${c[0]}, how is DOG coded?`, why: 'The letter positions are written in reverse order (T = 20, A = 1, C = 3)' })
  ND({ d: 3, rule: numCode((p) => 27 - p), ex: [], word: 'SOLD', others: ['COLD', 'FOLD', 'SOLE'], q: (c, code) => `If 26 stands for A, 25 for B and so on down to 1 for Z, which word is written ${code}?`, why: 'Each number is 27 minus the letter’s position (27 − 8 = 19 = S, 27 − 12 = 15 = O, 27 − 15 = 12 = L, 27 − 23 = 4 = D)' })
  N({ d: 2, rule: numCode((p) => p - 1), ex: ['DOG'], target: 'PIG', q: (c) => `If DOG is written as ${c[0]}, how is PIG written?`, why: 'Each letter is written as one less than its position (D = 4 → 3, O = 15 → 14, G = 7 → 6)' })
  N({ d: 2, rule: numCode((p) => p + 3), ex: ['ARM'], target: 'LEG', q: (c) => `ARM is coded as ${c[0]}. What is the code for LEG?`, why: 'Each letter is written as its position plus 3 (A = 1 → 4, R = 18 → 21, M = 13 → 16)' })
  ND({ d: 1, rule: pos, ex: [], word: 'MAP', others: ['MOP', 'NAP', 'MAT'], q: (c, code) => `If each letter is replaced by its position in the alphabet, which word gives ${code}?`, why: '13 = M, 1 = A, 16 = P' })
  ND({ d: 1, rule: pos, ex: ['SUN'], word: 'STAR', others: ['STIR', 'SCAR', 'SOAR'], q: (c, code) => `In a code language, ${c[0]} means SUN. What does ${code} mean?`, why: 'The numbers are alphabet positions (S = 19, U = 21, N = 14)' })
}

// ga.coding.position-sum
const SUM_RULES = [
  (w) => sum([...w].map(A2N)), (w) => sum([...w].map((c) => 27 - A2N(c))), (w) => sum([...w].map(A2N)) + w.length,
  (w) => sum([...w].map(A2N)) * w.length, (w) => 2 * sum([...w].map(A2N)), (w) => sum([...w].map(A2N)) - w.length,
  (w) => sum([...w].map((c) => 27 - A2N(c))) + w.length, (w) => sum([...w].map((c) => A2N(c) ** 2)), (w) => [...w].reduce((s, c) => s * A2N(c), 1),
]
const sumF = SUM_RULES[0]
{
  const F = 'ga.coding.position-sum'
  const S = ({ d, rule = sumF, ex, target, q, why }) => {
    const v = ex.map(rule), ans = rule(target)
    if (ex.length) { const outs = new Set(SUM_RULES.filter((r) => ex.every((w, i) => r(w) === v[i])).map((r) => r(target))); assert(outs.size === 1 && outs.has(ans), `sum code ${ex} ${target}`) }
    const wrong = [ans + 1, ans - 2, ans + target.length, ans - target.length, ans + 3].filter((x, i, a) => x !== ans && a.indexOf(x) === i).slice(0, 3)
    add({ st: 'ga.coding', fam: F, concept: `sumcode-${ex.join('-')}-${target}`, d, q: q(v), ans, wrong, exp: `${why}. For ${target}: ${[...target].map((c) => (rule === sumF ? A2N(c) : 27 - A2N(c))).join(' + ')}${rule === SUM_RULES[4] ? ', doubled,' : ''} gives ${ans}.` })
  }
  S({ d: 2, ex: ['CAT', 'BAG'], target: 'DOG', q: (v) => `If CAT = ${v[0]} and BAG = ${v[1]}, what is DOG?`, why: 'Each word is the sum of its letters’ positions (C 3 + A 1 + T 20 = 24)' })
  S({ d: 1, ex: [], target: 'MPT', q: () => 'If the value of a word is the sum of the positions of its letters in the alphabet, what is the value of MPT?', why: 'Add the letter positions' })
  S({ d: 2, ex: ['HEN', 'COW'], target: 'BULL', q: (v) => `In a code HEN is ${v[0]} and COW is ${v[1]}. What number is BULL?`, why: 'Each word is coded as the sum of its letter positions (H 8 + E 5 + N 14 = 27)' })
  S({ d: 3, rule: SUM_RULES[1], ex: ['ACE', 'BED'], target: 'FIG', q: (v) => `If ACE = ${v[0]} and BED = ${v[1]}, then FIG = ?`, why: 'Letters are counted from the end of the alphabet (A = 26, B = 25, …) and added: ACE = 26 + 24 + 22 = 72' })
  S({ d: 2, ex: ['ROSE'], target: 'LILY', q: (v) => `If ROSE is written as ${v[0]}, how is LILY written?`, why: 'The code is the total of the letter positions (R 18 + O 15 + S 19 + E 5 = 57)' })
  S({ d: 2, ex: ['PEN', 'INK'], target: 'BOOK', q: (v) => `Given PEN = ${v[0]} and INK = ${v[1]}, find the code number of BOOK.`, why: 'The number is the sum of the letter positions (P 16 + E 5 + N 14 = 35)' })
  S({ d: 3, rule: SUM_RULES[4], ex: ['AB', 'CD'], target: 'EF', q: (v) => `If AB = ${v[0]} and CD = ${v[1]}, what does EF equal?`, why: 'The letter positions are added and the total doubled (A 1 + B 2 = 3, × 2 = 6)' })
  S({ d: 2, ex: ['FACE'], target: 'CAFE', q: (v) => `If FACE = ${v[0]} in a letter-value code, what is CAFE?`, why: 'The value is the sum of the letter positions, and CAFE uses exactly the same letters as FACE' })
  S({ d: 2, ex: ['TEA', 'MILK'], target: 'COFFEE', q: (v) => `If TEA is coded ${v[0]} and MILK ${v[1]}, what is the code for COFFEE?`, why: 'Each code is the sum of the letter positions (T 20 + E 5 + A 1 = 26)' })
  S({ d: 1, ex: ['BAT', 'CAT'], target: 'RAT', q: (v) => `If BAT = ${v[0]} and CAT = ${v[1]}, what is RAT?`, why: 'Each value is the sum of the letter positions (B 2 + A 1 + T 20 = 23)' })
  {
    const words = ['BIG', 'TOP', 'HUT', 'LAMP'], vals = words.map(sumF), best = Math.max(...vals)
    assert(vals.filter((v) => v === best).length === 1, 'unique greatest')
    const a = words[vals.indexOf(best)]
    add({ st: 'ga.coding', fam: F, concept: 'letter-sum-greatest-big-top-hut-lamp', d: 2, q: 'Taking A = 1, B = 2, …, Z = 26 and adding the values of the letters, which of these words has the greatest total?', ans: a, wrong: words.filter((w) => w !== a), exp: `The totals are ${words.map((w, i) => `${w} ${vals[i]}`).join(', ')}, so ${a} is greatest.` })
  }
  {
    const words = ['WIND', 'CLOUD', 'RAIN', 'MIST'], vals = words.map(sumF)
    assert(vals.filter((v) => v === 50).length === 1, 'unique 50')
    const a = words[vals.indexOf(50)]
    add({ st: 'ga.coding', fam: F, concept: 'letter-sum-equal-50-wind', d: 2, q: 'With A = 1, B = 2 and so on, which word has letter values adding up to exactly 50?', ans: a, wrong: words.filter((w) => w !== a), exp: `The totals are ${words.map((w, i) => `${w} ${vals[i]}`).join(', ')}; only ${a} makes 50.` })
  }
}

// ga.coding.decode (shift / reversal / progressive rules applied backwards)
{
  const F = 'ga.coding.decode'
  const D = (d, rule, ex, word, others, why, q) => letterDecodeItem({ fam: F, d, rule, ex: [ex], word, others, q, why })
  D(1, shiftW(1), 'CAT', 'DOG', ['DIG', 'FOG', 'DOT'], 'Each letter is moved one place forward', (c, code) => `In a certain code, CAT is written as ${c[0]}. Which word is written as ${code}?`)
  D(1, shiftW(-1), 'BOOK', 'NOTE', ['VOTE', 'NOSE', 'TONE'], 'Each letter is moved one place back', (c, code) => `If BOOK is coded as ${c[0]}, what word does the code ${code} stand for?`)
  D(2, rev, 'FLOWER', 'GARDEN', ['DANGER', 'GANDER', 'RANGED'], 'The word is written backwards', (c, code) => `FLOWER is coded as ${c[0]}. Which word is coded as ${code}?`)
  D(2, shiftW(2), 'RAIN', 'SNOW', ['SHOW', 'STOW', 'SLOW'], 'Each letter is moved two places forward', (c, code) => `If RAIN is written ${c[0]}, which word is written ${code}?`)
  D(3, compose(rev, shiftW(1)), 'LION', 'TIGER', ['TOWER', 'TAKER', 'TIMER'], 'The word is reversed and each letter moved one place forward', (c, code) => `If LION is coded as ${c[0]}, what does ${code} decode to?`)
  D(3, progW(1, 1), 'BEAT', 'SHOE', ['SHOP', 'SHIP', 'SHOT'], 'The letters are moved forward by 1, 2, 3, 4 in turn', (c, code) => `If BEAT is coded as ${c[0]}, which word has the code ${code}?`)
  D(3, altW(1, -1), 'SAND', 'LAMP', ['LIMP', 'LUMP', 'RAMP'], 'The letters are moved alternately one place forward and one place back', (c, code) => `In a code, SAND becomes ${c[0]}. Which word becomes ${code}?`)
  D(2, shiftW(3), 'HOT', 'COLD', ['CORD', 'COLT', 'BOLD'], 'Each letter is moved three places forward', (c, code) => `In a code language HOT is written ${c[0]}. What does ${code} mean in that language?`)
  D(2, shiftW(-2), 'FISH', 'WORM', ['WARM', 'WORN', 'FORM'], 'Each letter is moved two places back', (c, code) => `FISH is written as ${c[0]} in a code. Decode ${code}.`)
  D(2, rev, 'KNIFE', 'SPOON', ['SNOOP', 'SPOOK', 'SWOON'], 'The word is written backwards', (c, code) => `KNIFE appears as ${c[0]} in a code. The code ${code} stands for which word?`)
  D(2, shiftW(4), 'COW', 'GOAT', ['MOAT', 'BOAT', 'GOAD'], 'Each letter is moved four places forward', (c, code) => `If COW is written as ${c[0]}, which word is written as ${code}?`)
  D(3, compose(rev, shiftW(-1)), 'MILK', 'SALT', ['SILT', 'SEAT', 'SLAT'], 'The word is reversed and each letter moved one place back', (c, code) => `If MILK is written as ${c[0]}, the word written as ${code} is:`)
}

// ga.coding.opposite-letter
{
  const F = 'ga.coding.opposite-letter'
  const why = 'Each letter is replaced by its opposite letter, the pair adding up to 27 (A↔Z, B↔Y, C↔X, …)'
  const O = (d, rule, ex, target, q, w = why) => letterCodeItem({ fam: F, d, rule, ex: ex ? [ex] : [], target, q, why: w })
  O(2, oppW, 'GIRL', 'BOY', (c) => `GIRL is coded as ${c[0]} in a certain language. How is BOY coded in that language?`)
  O(1, oppW, null, 'LOVE', () => 'In a code, each letter is replaced by the letter in the same position from the other end of the alphabet (A by Z, B by Y and so on). How is LOVE written?')
  O(2, oppW, 'WORK', 'PLAY', (c) => `When WORK is coded as ${c[0]}, PLAY is coded as:`)
  O(2, oppW, 'FLIGHT', 'POLE', (c) => `If FLIGHT is written as ${c[0]}, how would POLE be written?`)
  O(2, oppW, 'SKY', 'SEA', (c) => `The code for SKY is ${c[0]}. The code for SEA will be:`)
  O(3, compose(rev, oppW), 'TEAM', 'GAME', (c) => `If TEAM is coded as ${c[0]}, how is GAME coded?`, 'The word is reversed and each letter replaced by its opposite (A↔Z, B↔Y, …)')
  O(3, oppW, 'MILK', 'BUTTER', (c) => `If MILK is written as ${c[0]}, what will BUTTER be written as?`)
  letterDecodeItem({ fam: F, d: 2, rule: oppW, ex: ['TRAIN'], word: 'BUS', others: ['BUN', 'BUD', 'BUY'], why, q: (c, code) => `In a code, TRAIN = ${c[0]}. Which word is written as ${code}?` })
  letterDecodeItem({ fam: F, d: 2, rule: oppW, ex: [], word: 'SOUND', others: ['ROUND', 'MOUND', 'SOUTH'], why, q: (c, code) => `In a code where A is written as Z, B as Y, C as X and so on, which word is written as ${code}?` })
  {
    const pairs = [['G', 'T'], ['H', 'R'], ['E', 'U'], ['J', 'P']]
    const ok = pairs.filter(([a, b]) => A2N(a) + A2N(b) === 27)
    assert(ok.length === 1, 'one opposite pair')
    const fmtP = ([a, b]) => `${a} and ${b}`
    add({ st: 'ga.coding', fam: F, concept: 'opposite-letter-pair-g-t', d: 2, q: 'Two letters are called opposite if their positions in the alphabet add up to 27 (A and Z, B and Y, …). Which of these is an opposite pair?', ans: fmtP(ok[0]), wrong: pairs.filter((p) => p !== ok[0]).map(fmtP), exp: `G is the 7th letter and T the 20th, and 7 + 20 = 27; each other pair adds up to 26.` })
  }
}

// ga.coding.digit-substitution (letters stand for digits, inferred from examples)
{
  const F = 'ga.coding.digit-substitution'
  const DG = (d, mapStr, ex, target, q) => {
    const map = {}
    for (const [, l, g] of mapStr.matchAll(/([A-Z])(\d)/g)) { assert(!(l in map), 'dup letter'); map[l] = g }
    assert(new Set(Object.values(map)).size === Object.keys(map).length, `digit map injective ${mapStr}`)
    const enc = (w) => [...w].map((c) => { assert(c in map, `letter ${c} unmapped`); return map[c] }).join('')
    for (const c of target) assert(ex.some((w) => w.includes(c)), `letter ${c} of ${target} not shown in examples`)
    const codes = ex.map(enc), ans = enc(target)
    const sw = (s, i) => s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2)
    const cand = [sw(ans, 0), sw(ans, ans.length - 2), rev(ans), sw(ans, 1), ans.slice(0, -1) + ((Number(ans.at(-1)) + 1) % 10)]
    const wrong = [...new Set(cand)].filter((c) => c !== ans && !codes.includes(c)).slice(0, 3)
    const shown = [...new Set(target)].map((c) => `${c} = ${map[c]}`).join(', ')
    add({ st: 'ga.coding', fam: F, concept: `digitcode-${ex.join('-')}-${target}`, d, q: q(codes), ans, wrong, exp: `Matching letters with digits in the examples gives ${shown}; so ${target} is ${ans}.` })
  }
  DG(1, 'P5E3N7T4', ['PEN', 'NET'], 'TEN', (c) => `If PEN is written as ${c[0]} and NET as ${c[1]}, how is TEN written?`)
  DG(2, 'M4I9L2D6E1', ['MILD', 'LIME'], 'DIME', (c) => `In a code, MILD is ${c[0]} and LIME is ${c[1]}. What is the code for DIME?`)
  DG(1, 'S1T2O3P4', ['STOP'], 'POST', (c) => `If STOP is coded as ${c[0]}, how is POST coded?`)
  DG(2, 'C3O7D1E9V5', ['CODE', 'DOVE'], 'COVE', (c) => `CODE is written ${c[0]} and DOVE is written ${c[1]}. How is COVE written?`)
  DG(2, 'L8A2T6E4M3', ['LATE', 'MEAL'], 'METAL', (c) => `Given that LATE = ${c[0]} and MEAL = ${c[1]}, what is METAL?`)
  DG(2, 'R7A1T5E8', ['RATE', 'TEAR'], 'TREAT', (c) => `If RATE is ${c[0]} and TEAR is ${c[1]} in a code, find the code for TREAT.`)
  DG(2, 'S9A2N6D3E5T8', ['SAND', 'DENT'], 'STAND', (c) => `SAND is coded ${c[0]} and DENT is coded ${c[1]}. Which number stands for STAND?`)
  DG(2, 'G7A2M9E4K8', ['GAME', 'MAKE'], 'KEG', (c) => `If GAME = ${c[0]} and MAKE = ${c[1]}, then KEG = ?`)
  DG(2, 'H1A5I3R8C6', ['HAIR', 'CHAIR'], 'RICH', (c) => `The words HAIR and CHAIR are coded ${c[0]} and ${c[1]}. What is the code for RICH?`)
  DG(3, 'P4L9A0N1T2E7', ['PLANT', 'LATE'], 'PLATE', (c) => `In a certain code PLANT is written as ${c[0]} and LATE as ${c[1]}. How is PLATE written in that code?`)
  DG(3, 'F3I6R1E8D5', ['FIRE', 'RIDE'], 'FRIED', (c) => `Using the code in which FIRE is ${c[0]} and RIDE is ${c[1]}, write FRIED.`)
  DG(1, 'B2O7R4N9E1', ['BORN', 'ROBE'], 'BONE', (c) => `BORN has the code ${c[0]} and ROBE has the code ${c[1]}. What is the code of BONE?`)
}

// ga.coding.sentence-code (word codes found by comparing coded sentences)
{
  const F = 'ga.coding.sentence-code'
  const POOL = ['ko', 'pi', 'ta', 'mu', 're', 'sa', 'ne', 'lo', 'zi', 'fa', 'du', 've', 'ri', 'ga', 'bo', 'se', 'nu', 'ja', 'po', 'wi']
  function solve(sents, codeOf) {
    const words = [...new Set(sents.flat())]
    const cs = sents.map((s) => new Set(s.map((w) => codeOf[w])))
    const cand = {}
    for (const w of words) {
      let c = null
      sents.forEach((s, i) => { if (s.includes(w)) c = c ? new Set([...c].filter((x) => cs[i].has(x))) : new Set(cs[i]) })
      sents.forEach((s, i) => { if (!s.includes(w)) for (const x of cs[i]) c.delete(x) })
      cand[w] = c
    }
    let changed = true
    while (changed) {
      changed = false
      for (const w of words) if (cand[w].size === 1) { const [x] = cand[w]; for (const v of words) if (v !== w && cand[v].delete(x)) changed = true }
    }
    return cand
  }
  const SC = (d, sentences, target, mode, qf) => {
    const sents = sentences.map((s) => s.split(' '))
    const words = [...new Set(sents.flat())]
    const pool = shuffle(POOL)
    const codeOf = Object.fromEntries(words.map((w, i) => [w, pool[i]]))
    const cand = solve(sents, codeOf)
    assert(cand[target].size === 1 && cand[target].has(codeOf[target]), `sentence code ${target} determined`)
    const coded = sents.map((s) => shuffle(s.map((w) => codeOf[w])).join(' '))
    const shownPairs = sentences.map((s, i) => `‘${s}’ is written as ‘${coded[i]}’`)
    const inWith = sents.filter((s) => s.includes(target)).flat().filter((w) => w !== target)
    const pickWords = [...new Set([...inWith, ...words])].filter((w) => w !== target).slice(0, 3)
    const containing = sentences.filter((s) => s.split(' ').includes(target)).map((s) => `‘${s}’`).join(' and ')
    const exp = `${target === target ? `‘${target}’` : ''} appears in ${containing}; the only code common to those sentences and absent from the others is ‘${codeOf[target]}’.`
    if (mode === 'code') add({ st: 'ga.coding', fam: F, concept: `sentence-code-${sentences[0]}-${target}`, d, q: qf(shownPairs), ans: `‘${codeOf[target]}’`, wrong: pickWords.map((w) => `‘${codeOf[w]}’`), exp })
    else add({ st: 'ga.coding', fam: F, concept: `sentence-code-${sentences[0]}-${target}`, d, q: qf(shownPairs, codeOf[target]), ans: `‘${target}’`, wrong: pickWords.map((w) => `‘${w}’`), exp })
  }
  SC(1, ['rain is heavy', 'heavy wind blows', 'wind is cold'], 'heavy', 'code', (p) => `In a certain code, ${p[0]}, ${p[1]} and ${p[2]}. What is the code for ‘heavy’?`)
  SC(2, ['good students work hard', 'students read books', 'hard work pays'], 'students', 'code', (p) => `If ${p[0]}, ${p[1]} and ${p[2]}, which code stands for ‘students’?`)
  SC(2, ['open the door', 'close the window', 'door is closed'], 'door', 'code', (p) => `In a code language ${p[0]}, ${p[1]} and ${p[2]}. Find the code for ‘door’.`)
  SC(2, ['pakistan is beautiful', 'beautiful valleys attract tourists', 'tourists love pakistan'], 'tourists', 'word', (p, c) => `Suppose ${p[0]}, ${p[1]} and ${p[2]}. Which word is written as ‘${c}’?`)
  SC(1, ['he plays cricket', 'cricket is popular', 'he is tall'], 'is', 'code', (p) => `A code is such that ${p[0]}, ${p[1]} and ${p[2]}. What is the code for ‘is’?`)
  SC(2, ['sweet mango juice', 'mango is yellow', 'juice is fresh'], 'juice', 'word', (p, c) => `Given that ${p[0]}, ${p[1]} and ${p[2]}, what does ‘${c}’ mean?`)
  SC(2, ['read the newspaper daily', 'newspaper gives news', 'daily news matters'], 'news', 'code', (p) => `In a secret language ${p[0]}, ${p[1]} and ${p[2]}. How is ‘news’ written?`)
  SC(2, ['bright sun shines', 'sun rises early', 'early birds sing'], 'early', 'word', (p, c) => `If ${p[0]}, ${p[1]} and ${p[2]}, then ‘${c}’ stands for:`)
  SC(1, ['green trees give shade', 'trees need water', 'water is life'], 'water', 'code', (p) => `Consider a code in which ${p[0]}, ${p[1]} and ${p[2]}. Which code means ‘water’?`)
  SC(2, ['cats drink milk', 'milk is white', 'white clouds float'], 'white', 'word', (p, c) => `In a code, ${p[0]}, ${p[1]} and ${p[2]}. Which word has the code ‘${c}’?`)
  SC(3, ['tall boys play football', 'boys like cricket', 'football is fun', 'cricket is played'], 'is', 'code', (p) => `In a code, ${p[0]}, ${p[1]}, ${p[2]} and ${p[3]}. What is the code for ‘is’ here?`)
  SC(2, ['she writes letters', 'letters bring news', 'she reads news'], 'she', 'code', (p) => `If ${p[0]}, ${p[1]} and ${p[2]}, what is the code for ‘she’?`)
}

// ga.coding.progressive-shift (shift changes with position)
{
  const F = 'ga.coding.progressive-shift'
  const P = (d, rule, ex, target, why, q) => letterCodeItem({ fam: F, d, rule, ex: ex ? [ex] : [], target, q, why })
  P(2, progW(1, 1), 'COLD', 'WARM', 'The letters are moved forward by 1, 2, 3, 4 in turn (C+1, O+2, L+3, D+4)', (c) => `If COLD is written as ${c[0]}, how will WARM be written?`)
  P(2, progW(1, 1), 'BAD', 'FEED', 'The letters move forward by 1, 2, 3, … in turn (B+1, A+2, D+3)', (c) => `BAD is coded as ${c[0]}. What is FEED coded as?`)
  P(3, progW(-1, -1), 'MILK', 'HOPE', 'The letters move back by 1, 2, 3, 4 in turn (M−1, I−2, L−3, K−4)', (c) => `In a code MILK is written ${c[0]}. Write HOPE in the same code.`)
  P(2, altW(1, -1), 'HELP', 'KIND', 'The letters move alternately one place forward and one place back', (c) => `If HELP is coded as ${c[0]}, then KIND is coded as:`)
  P(2, altW(2, -2), 'BEST', 'GOLD', 'The letters move alternately two places forward and two places back', (c) => `A code changes BEST into ${c[0]}. What does it change GOLD into?`)
  P(1, progW(1, 1), null, 'FARM', 'F moves 1, A moves 2, R moves 3 and M moves 4 places forward', () => 'Each letter of a word is moved forward by its position in the word (the 1st letter by 1, the 2nd by 2, and so on). What does FARM become?')
  P(3, progW(2, 2), 'ACE', 'BIG', 'The letters move forward by 2, 4, 6 in turn (A+2, C+4, E+6)', (c) => `If ACE is coded ${c[0]}, what is the code for BIG?`)
  P(2, altW(1, 2), 'LAMP', 'DESK', 'The letters move forward by 1 and 2 alternately (L+1, A+2, M+1, P+2)', (c) => `LAMP is written ${c[0]} in a certain code. How is DESK written?`)
  P(3, progW(4, -1), 'FIRE', 'COAL', 'The letters move forward by 4, 3, 2, 1 in turn', (c) => `Under a coding rule FIRE is written ${c[0]}. Under the same rule COAL is written:`)
  P(2, progW(1, 1), 'SUN', 'SKY', 'The letters move forward by 1, 2, 3 in turn', (c) => `If SUN is ${c[0]} in a code, what is SKY?`)
  P(2, altW(-1, 1), 'RING', 'BELL', 'The letters move alternately one place back and one place forward', (c) => `RING is written as ${c[0]}. Following the same pattern, BELL is written as:`)
  P(3, progW(3, -1), 'PARK', 'BOAT', 'The letters move forward by 3, 2, 1 and 0 places in turn', (c) => `A code writes PARK as ${c[0]}. How does it write BOAT?`)
}

// @@CONTINUE@@
if (dupErrors.length) { console.error(dupErrors.join('\n')); process.exit(1) }
console.log("items", items.length)
if (process.env.DUMP) for (const it of items.filter((x) => x.st === process.env.DUMP)) console.log(`[${it.d}] ${it.q}\n   ✔ ${it.ans} | ✘ ${it.wrong.join(" | ")}\n   ${it.exp}`)
