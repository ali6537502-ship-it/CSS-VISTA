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
    if (!(outs.size === 1 && outs.has(ans))) { dupErrors.push(`letter code ${ex}→${codes} does not fix ${target} uniquely: ${[...outs].slice(0, 5)}`); return }
  }
  const m = Math.floor(ans.length / 2)
  const cand = [shiftW(1)(ans), oneLetter(ans, m, 1), shiftW(-1)(ans), rev(ans), oneLetter(ans, ans.length - 1, -1), oneLetter(ans, 0, 1), oneLetter(ans, 1, -1)]
  const wrong = [...new Set(cand)].filter((c) => c !== ans).slice(0, 3)
  add({ st: 'ga.coding', fam, concept: `code-${ex.join('-')}-${target}`, d, q: q(codes), ans, wrong, exp: `${why}, so ${target} is written as ${ans}.` })
}
function letterDecodeItem({ fam, d, rule, ex, word, others, q, why }) {
  const codes = ex.map(rule)
  const code = rule(word)
  const cons = ex.length ? consistentLetterRules(ex.map((w, i) => [w, codes[i]])) : [rule]
  if (!cons.every((r) => r(word) === code)) { dupErrors.push(`decode ${ex} ${word} ambiguous`); return }
  for (const o of others) if (cons.some((r) => r(o) === code)) { dupErrors.push(`decode distractor ${o} also fits`); return }
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
  R(3, compose(rev, oppW), 'WORD', 'GAME', 'The word is reversed and each letter is replaced by its opposite letter (A↔Z, B↔Y, …)', (c) => `WORD is coded as ${c[0]}. How would GAME be coded by the same method?`)
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
  N({ d: 1, rule: numCode((p) => p + 1), ex: ['CAT'], target: 'RAT', q: (c) => `CAT is coded as ${c[0]}. What will RAT be coded as?`, why: 'Each letter is written as one more than its position (C = 3 → 4, A = 1 → 2, T = 20 → 21)' })
  N({ d: 1, rule: pos, ex: ['BIRD'], target: 'WING', q: (c) => `In a code, BIRD is ${c[0]}. How is WING written?`, why: 'Each letter is replaced by its position in the alphabet' })
  N({ d: 2, rule: numCode((p) => 2 * p), ex: ['BAD'], target: 'FEED', q: (c) => `If BAD is written as ${c[0]}, what is the code for FEED?`, why: 'Each letter is written as twice its position (B = 2 → 4, A = 1 → 2, D = 4 → 8)' })
  N({ d: 3, rule: numCode((p) => p * p), ex: ['ACE'], target: 'BED', q: (c) => `In a number code ACE appears as ${c[0]}. How does BED appear?`, why: 'Each letter is written as the square of its position (A = 1 → 1, C = 3 → 9, E = 5 → 25)' })
  N({ d: 2, rule: numCode((p) => p, true), ex: ['CAT'], target: 'DOG', q: (c) => `If CAT is coded ${c[0]}, how is DOG coded?`, why: 'The letter positions are written in reverse order (T = 20, A = 1, C = 3)' })
  ND({ d: 3, rule: numCode((p) => 27 - p), ex: [], word: 'SOLD', others: ['COLD', 'FOLD', 'SOLE'], q: (c, code) => `If 26 stands for A, 25 for B and so on down to 1 for Z, which word is written ${code}?`, why: 'Each number is 27 minus the letter’s position (27 − 8 = 19 = S, 27 − 12 = 15 = O, 27 − 15 = 12 = L, 27 − 23 = 4 = D)' })
  N({ d: 2, rule: numCode((p) => p - 1), ex: ['DOG'], target: 'PIG', q: (c) => `DOG has been coded ${c[0]}. Code PIG in the same way.`, why: 'Each letter is written as one less than its position (D = 4 → 3, O = 15 → 14, G = 7 → 6)' })
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
  S({ d: 1, ex: ['BAT', 'CAT'], target: 'RAT', q: (v) => `BAT scores ${v[0]} and CAT scores ${v[1]} in a letter code. What does RAT score?`, why: 'Each value is the sum of the letter positions (B 2 + A 1 + T 20 = 23)' })
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
  DG(2, 'G7A2M9E4K8', ['GAME', 'MAKE'], 'KEG', (c) => `With GAME coded ${c[0]} and MAKE coded ${c[1]}, how is KEG coded?`)
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
  P(2, progW(1, 1), 'COLDER', 'WARM', 'The letters are moved forward by 1, 2, 3, 4, … in turn (C+1, O+2, L+3, D+4, …)', (c) => `If COLDER is written as ${c[0]}, how will WARM be written?`)
  P(2, progW(1, 1), 'BAD', 'FEED', 'The letters move forward by 1, 2, 3, … in turn (B+1, A+2, D+3)', (c) => `BAD is coded as ${c[0]}. What is FEED coded as?`)
  P(3, progW(-1, -1), 'MILK', 'HOPE', 'The letters move back by 1, 2, 3, 4 in turn (M−1, I−2, L−3, K−4)', (c) => `In a code MILK is written ${c[0]}. Write HOPE in the same code.`)
  P(2, altW(1, -1), 'HELP', 'KIND', 'The letters move alternately one place forward and one place back', (c) => `If HELP is coded as ${c[0]}, then KIND is coded as:`)
  P(2, altW(2, -2), 'BEST', 'GOLD', 'The letters move alternately two places forward and two places back', (c) => `A code changes BEST into ${c[0]}. What does it change GOLD into?`)
  P(1, progW(1, 1), null, 'FARM', 'F moves 1, A moves 2, R moves 3 and M moves 4 places forward', () => 'Each letter of a word is moved forward by its position in the word (the 1st letter by 1, the 2nd by 2, and so on). What does FARM become?')
  P(3, progW(2, 2), 'ACE', 'BIG', 'The letters move forward by 2, 4, 6 in turn (A+2, C+4, E+6)', (c) => `ACE turns into ${c[0]} under a code. What does BIG turn into?`)
  P(2, altW(1, 2), 'LAMP', 'DESK', 'The letters move forward by 1 and 2 alternately (L+1, A+2, M+1, P+2)', (c) => `LAMP is written ${c[0]} in a certain code. How is DESK written?`)
  P(3, progW(4, -1), 'FIRE', 'COAL', 'The letters move forward by 4, 3, 2, 1 in turn', (c) => `Under a coding rule FIRE is written ${c[0]}. Under the same rule COAL is written:`)
  P(2, progW(1, 1), 'SUN', 'SKY', 'The letters move forward by 1, 2, 3 in turn', (c) => `If SUN is ${c[0]} in a code, what is SKY?`)
  P(2, altW(-1, 1), 'RING', 'BELL', 'The letters move alternately one place back and one place forward', (c) => `RING is written as ${c[0]}. Following the same pattern, BELL is written as:`)
  P(3, progW(3, -1), 'PARK', 'BOAT', 'The letters move forward by 3, 2, 1 and 0 places in turn', (c) => `A code writes PARK as ${c[0]}. How does it write BOAT?`)
}


// ---------------------------------------------------------------------------
// CLOCKS AND CALENDARS (ga.clock-calendar)
// ---------------------------------------------------------------------------
const CC = 'ga.clock-calendar'
const handAngle = (h, m) => { const a = Math.abs(30 * (h % 12) - 5.5 * m) % 360; return Math.min(a, 360 - a) }
const deg = (x) => `${fmt(x)}°`
const hm = (t) => { t = ((t % 720) + 720) % 720; let h = Math.floor(t / 60); const m = t % 60; if (h === 0) h = 12; return `${h}:${String(m).padStart(2, '0')}` }
const toMin = (h, m) => (h % 12) * 60 + m
/** Count times in [0, T) minutes after 12:00 at which the minute hand leads the hour hand by `sep` (mod 360). */
function handEvents(T, seps) { let n = 0; for (const sep of seps) for (let k = 0; k < 1000; k++) { const t = (360 * k + sep) / 5.5; if (t >= T) break; n++ } return n }

// ga.clock.hand-angle
{
  const F = 'ga.clock.hand-angle'
  const A = (d, h, m, q, extra = []) => {
    const a = handAngle(h, m)
    const cand = [...extra, Math.abs(30 * h - 6 * m) % 360, a + 5, a - 5, a + 15, a + 10, 360 - a].map((x) => Math.min(x, 360 - x) === x ? x : x).filter((x) => x > 0 && x <= 360 && !near(x, a))
    const wrong = [...new Set(cand.map((x) => fmt(x)))].slice(0, 3).map((x) => `${x}°`)
    add({ st: CC, fam: F, concept: `clock-angle-${h}-${m}`, d, q, ans: deg(a), wrong, exp: `The hour hand is at ${fmt(30 * (h % 12) + 0.5 * m)}° from 12 and the minute hand at ${6 * m}°; the smaller angle between them is ${deg(a)}.` })
  }
  A(2, 3, 40, 'What is the angle between the hour and minute hands of a clock at 3:40?')
  A(1, 9, 0, 'At exactly 9 o’clock, what angle do the hands of a clock make?', [270, 60])
  A(2, 4, 20, 'Find the smaller angle between the hands of a clock at 4:20.')
  A(2, 7, 30, 'How many degrees apart are the hands of a clock at half past seven?')
  A(2, 2, 15, 'A wall clock shows 2:15. What is the angle between its hands?')
  A(2, 12, 30, 'What is the angle between the two hands of a clock at 12:30?')
  A(2, 10, 10, 'How many degrees separate the hands of a watch at ten past ten (the smaller angle)?')
  A(1, 1, 20, 'At 1:20, what is the angle between the hands of a clock?')
  {
    const a = 3.5 * 30
    add({ st: CC, fam: F, concept: 'hour-hand-turn-2-00-to-5-30', d: 2, q: 'Through how many degrees does the hour hand turn between 2:00 and 5:30?', ans: deg(a), wrong: [deg(90), deg(120), deg(a + 15)], exp: `The hour hand turns 30° per hour; in 3½ hours it turns 3.5 × 30° = ${deg(a)}.` })
  }
  {
    const a = 25 * 6
    add({ st: CC, fam: F, concept: 'minute-hand-turn-25-minutes', d: 1, q: 'How many degrees does the minute hand of a clock turn in 25 minutes?', ans: deg(a), wrong: [deg(125), deg(135), deg(165)], exp: `The minute hand turns 360° in 60 minutes, i.e. 6° per minute, so 25 × 6° = ${deg(a)}.` })
  }
  {
    const a = 20 * 0.5
    add({ st: CC, fam: F, concept: 'hour-hand-turn-20-minutes', d: 1, q: 'Through what angle does the hour hand move in 20 minutes?', ans: deg(a), wrong: [deg(20), deg(5), deg(120)], exp: `The hour hand moves 30° in 60 minutes, i.e. ½° per minute, so 20 minutes give ${deg(a)}.` })
  }
  {
    const a = 360 - handAngle(8, 0)
    add({ st: CC, fam: F, concept: 'reflex-angle-8-00', d: 2, q: 'When a clock shows 8:00, what is the reflex angle between its hands?', ans: deg(a), wrong: [deg(120), deg(210), deg(270)], exp: `At 8:00 the smaller angle is 8 × 30° − 0 = 240°, i.e. 120° the other way; the reflex angle is 360° − 120° = ${deg(a)}.` })
  }
  {
    // coincidence between 3 and 4: t = 60h/11 minutes past h
    const h = 3, num = 60 * h, den = 11, whole = Math.floor(num / den), rem = num % den
    assert(near(handAngle(h, num / den), 0), 'coincide')
    const f = (w, r) => `${w} ${r}/11 minutes past 3`
    add({ st: CC, fam: F, concept: 'hands-coincide-between-3-and-4', d: 3, q: 'At what time between 3 and 4 o’clock are the two hands of a clock exactly together?', ans: f(whole, rem), wrong: ['15 minutes past 3', f(whole + 1, 4), f(whole, rem + 3)], exp: `The minute hand gains 5.5° per minute on the hour hand and must make up 90°, which takes 90 ÷ 5.5 = 180/11 = ${whole} ${rem}/11 minutes.` })
  }
  {
    const n = handEvents(720, [0])
    add({ st: CC, fam: F, concept: 'hands-coincide-count-12-hours', d: 2, q: 'How many times do the hour and minute hands of a clock coincide in 12 hours?', ans: n, wrong: [12, 10, 24], exp: `The minute hand overtakes the hour hand once every 720/11 minutes, so in 720 minutes they meet ${n} times (the meeting at 12:00 is counted once).` })
  }
  {
    const n = handEvents(1440, [90, 270])
    add({ st: CC, fam: F, concept: 'hands-right-angle-count-day', d: 3, q: 'How many times in a day (24 hours) are the hands of a clock at right angles?', ans: n, wrong: [48, 24, 22], exp: `In 12 hours the hands are at right angles 22 times (twice in each of the 11 overtaking cycles), so in 24 hours ${n} times.` })
  }
  {
    const n = handEvents(1440, [180])
    add({ st: CC, fam: F, concept: 'hands-opposite-count-day', d: 3, q: 'In 24 hours, how many times do the hands of a clock point in exactly opposite directions?', ans: n, wrong: [24, 11, 44], exp: `The hands are opposite once in each overtaking cycle: 11 times in 12 hours, so ${n} times in 24 hours.` })
  }
}

// ga.clock.hand-direction (clock laid flat, compass directions)
{
  const F = 'ga.clock.hand-direction'
  const DIRS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']
  const dirOf = (a) => { const x = ((a % 360) + 360) % 360; assert(x % 45 === 0, 'compass multiple of 45'); return DIRS[x / 45] }
  const idx = (name) => DIRS.indexOf(name) * 45
  // ref: at reference time a hand at clock-angle refAng points to refDir. Ask: hand at clock-angle ask.
  const HD = (d, refAng, refDir, askAng, q, why) => {
    const off = idx(refDir) - refAng
    const ans = dirOf(askAng + off)
    const k = DIRS.indexOf(ans)
    const wrong = [DIRS[(k + 4) % 8], DIRS[(k + 2) % 8], DIRS[(k + 6) % 8]]
    add({ st: CC, fam: F, concept: `clock-direction-${refAng}-${refDir}-${askAng}`, d, q, ans, wrong, exp: `${why} The hand then points ${ans}.` })
  }
  HD(1, 0, 'North', 90, 'A clock lies face up on a table so that at 3:00 its minute hand points North. In which direction does its hour hand point at 3:00?', 'The minute hand at 3:00 is on 12, so 12 faces North and 3 faces East.')
  HD(2, 0, 'East', 45, 'A clock is placed so that at 12 noon its minute hand points East. In which direction will the hour hand point at 1:30 pm?', '12 faces East; at 1:30 the hour hand is halfway between 1 and 2, i.e. 45° clockwise from 12.')
  HD(2, 270, 'South', 180, 'A clock is set so that at 9:00 am its hour hand points South. In which direction will its minute hand point at 3:30 pm?', 'At 9:00 the hour hand is on 9, so 9 faces South and 12 faces East; at half past, the minute hand is on 6, opposite 12.')
  HD(2, 90, 'West', 270, 'A clock is kept so that at 3:00 the hour hand points West. In which direction does the minute hand point at 4:45?', '3 faces West, so 12 faces North… more precisely each number turns with the dial: 12 faces South and 9 faces East, where the minute hand is at 4:45.')
  HD(3, 180, 'North-West', 270, 'A clock is placed so that at 6:00 the hour hand points North-West. In which direction will the minute hand point at 7:45?', 'At 6:00 the hour hand is on 6, so 6 faces North-West and 12 faces South-East; at 7:45 the minute hand is on 9, 90° anticlockwise from 12.')
  HD(2, 0, 'South-East', 90, 'At noon the minute hand of a clock laid on the floor points South-East. In which direction does its hour hand point at 3:00 pm?', '12 faces South-East and 3 lies 90° clockwise from it.')
  HD(1, 0, 'North', 225, 'If the minute hand of a flat clock points North at 5:00, in which direction does the hour hand point at 7:30?', '12 faces North; at 7:30 the hour hand is halfway between 7 and 8, i.e. 225° clockwise from 12.')
  HD(3, 0, 'West', 135, 'A clock lies on a table with the 12 facing West. In which direction does the hour hand point at 4:30?', 'At 4:30 the hour hand is halfway between 4 and 5, 135° clockwise from 12.')
}

// ga.clock.mirror-image
{
  const F = 'ga.clock.mirror-image'
  const mir = (t) => (720 - t) % 720
  const M = (d, h, m, q, from) => {
    const t = toMin(h, m), a = mir(t)
    const wrong = [hm(a + 60), hm(a - 60), hm(t + 360)].filter((x) => x !== hm(a) && x !== hm(t))
    while (wrong.length < 3) wrong.push(hm(a + 30 * wrong.length + 30))
    add({ st: CC, fam: F, concept: `clock-mirror-${h}-${m}`, d, q, ans: hm(a), wrong: [...new Set(wrong)].slice(0, 3), exp: `A clock and its mirror image add up to 12:00 (11:60), so ${from ?? hm(t)} corresponds to 12:00 − ${hm(t)} = ${hm(a)}.` })
  }
  M(1, 3, 40, 'A clock seen in a mirror shows 3:40. What is the actual time?')
  M(1, 2, 25, 'What will the mirror image of a clock show when the actual time is 2:25?')
  M(2, 10, 10, 'The reflection of a clock in a mirror reads 10:10. What is the real time?')
  M(1, 4, 15, 'In a mirror, a clock appears to show quarter past four. What time is it actually?')
  M(2, 11, 5, 'The actual time is 11:05. How will the clock appear in a mirror?')
  M(2, 12, 30, 'A clock’s mirror image shows 12:30. What time does the clock really show?')
  M(2, 7, 52, 'If the mirror image of a clock reads 7:52, what is the correct time?')
  {
    const opts = [[6, 0], [3, 0], [9, 0], [4, 30]]
    const ok = opts.filter(([h, m]) => mir(toMin(h, m)) === toMin(h, m))
    assert(ok.length === 1, 'one self-mirror')
    add({ st: CC, fam: F, concept: 'clock-mirror-same-as-actual', d: 2, q: 'At which of these times does a clock look exactly the same as its mirror image?', ans: hm(toMin(...ok[0])), wrong: opts.filter((o) => o !== ok[0]).map((o) => hm(toMin(...o))), exp: 'The mirror time is 12:00 minus the actual time; only 6:00 gives 12:00 − 6:00 = 6:00 again (3:00 appears as 9:00, 4:30 as 7:30).' })
  }
  {
    const t = toMin(1, 15), a = mir(t), diff = (a - t + 720) % 720
    const f = (x) => `${Math.floor(x / 60)} h ${x % 60} min`
    add({ st: CC, fam: F, concept: 'clock-mirror-gap-1-15', d: 3, q: 'The actual time is 1:15. By how much is the time shown in a mirror ahead of the actual time?', ans: f(diff), wrong: [f(diff - 60), f(diff + 30), f(diff - 30)], exp: `The mirror shows 12:00 − 1:15 = ${hm(a)}; from 1:15 to ${hm(a)} is ${f(diff)}.` })
  }
  {
    const t = toMin(5, 20) + 25, a = mir(t)
    add({ st: CC, fam: F, concept: 'clock-mirror-after-25-minutes-5-20', d: 3, q: 'A clock shows 5:20. What will its mirror image show 25 minutes later?', ans: hm(a), wrong: [hm(mir(toMin(5, 20)) + 25), hm(a + 60), hm(t)], exp: `After 25 minutes the time is ${hm(t)}; its mirror image is 12:00 − ${hm(t)} = ${hm(a)}.` })
  }
}

// ga.clock.gain-loss
{
  const F = 'ga.clock.gain-loss'
  const ampm = (t) => { t = ((t % 1440) + 1440) % 1440; const pm = t >= 720; return `${hm(t % 720)} ${pm ? 'pm' : 'am'}` }
  {
    const shown = 17 * 60 - 8 * 3
    add({ st: CC, fam: F, concept: 'clock-loses-3-per-hour-9am-5pm', d: 2, q: 'A clock loses 3 minutes every hour. It was set right at 9 am. What time will it show at 5 pm the same day?', ans: ampm(shown), wrong: [ampm(17 * 60 + 24), ampm(17 * 60 - 21), ampm(17 * 60 - 27)], exp: `From 9 am to 5 pm is 8 hours, so the clock loses 8 × 3 = 24 minutes and shows ${ampm(shown)}.` })
  }
  {
    const g = (10 * 72) / 60
    add({ st: CC, fam: F, concept: 'watch-gains-10-seconds-hour-3-days', d: 2, q: 'A watch gains 10 seconds every hour. How much will it gain in 3 days?', ans: `${g} minutes`, wrong: ['6 minutes', '30 minutes', '10 minutes'], exp: `3 days = 72 hours; 72 × 10 s = 720 s = ${g} minutes.` })
  }
  {
    const shown = 12 * 60 + 6 * 4
    add({ st: CC, fam: F, concept: 'clock-gains-4-per-hour-6am-noon', d: 1, q: 'A clock gains 4 minutes every hour. If it is set correctly at 6 am, what time will it show at noon?', ans: ampm(shown), wrong: [ampm(12 * 60 - 24), ampm(12 * 60 + 20), ampm(12 * 60 + 28)], exp: `In 6 hours it gains 6 × 4 = 24 minutes, so at noon it shows ${ampm(shown)}.` })
  }
  {
    const v = 15 * 2
    add({ st: CC, fam: F, concept: 'clock-loses-2-per-day-1-to-16-march', d: 2, q: 'A clock that loses 2 minutes a day is set right on the morning of 1 March. How many minutes slow will it be on the morning of 16 March?', ans: `${v} minutes`, wrong: ['32 minutes', '28 minutes', '16 minutes'], exp: `From 1 March to 16 March is 15 days, so it loses 15 × 2 = ${v} minutes.` })
  }
  {
    const hrs = 30 / 5, set = 15 * 60 - hrs * 60
    add({ st: CC, fam: F, concept: 'clock-gains-5-shows-3-30-when-3-00', d: 3, q: 'A clock gains 5 minutes every hour. It shows 3:30 pm when the correct time is 3:00 pm. At what time was it last set right?', ans: ampm(set), wrong: [ampm(set + 60), ampm(set - 60), ampm(set + 180)], exp: `It has gained 30 minutes at 5 minutes per hour, which takes 6 hours; 3:00 pm − 6 hours = ${ampm(set)}.` })
  }
  {
    const v = 7 * 5
    add({ st: CC, fam: F, concept: 'watch-5-slow-per-day-week', d: 1, q: 'A watch runs 5 minutes slow every day. By how much will it be behind after a week?', ans: `${v} minutes`, wrong: ['30 minutes', '40 minutes', '12 minutes'], exp: `7 days × 5 minutes = ${v} minutes.` })
  }
  {
    const v = 8 * (2 + 1)
    add({ st: CC, fam: F, concept: 'two-clocks-gain-2-lose-1-noon-8pm', d: 1, q: 'Two clocks are set right at noon. One gains 2 minutes per hour and the other loses 1 minute per hour. How far apart will they be at 8 pm?', ans: `${v} minutes`, wrong: ['8 minutes', '16 minutes', '32 minutes'], exp: `They drift apart by 2 + 1 = 3 minutes each hour; in 8 hours that is ${v} minutes.` })
  }
  {
    // runs 63 clock-minutes per real hour; shows 7:00 + 6 h 18 min → real 6 h later
    const realH = (6 * 60 + 18) / 63
    assert(realH === 6, 'gain calc')
    add({ st: CC, fam: F, concept: 'clock-gains-3-set-7am-shows-1-18', d: 3, q: 'A clock gains 3 minutes every hour. It was set right at 7:00 am. What is the correct time when it shows 1:18 pm?', ans: ampm(13 * 60), wrong: [ampm(13 * 60 + 18), ampm(12 * 60 + 42), ampm(12 * 60 + 60 - 6)], exp: 'The clock runs 63 minutes for every real hour. It shows 6 h 18 min = 378 minutes after 7:00, and 378 ÷ 63 = 6 real hours, so the correct time is 1:00 pm.' })
  }
}

// ga.calendar.day-counting
{
  const F = 'ga.calendar.day-counting'
  const W = (i) => WEEK[((i % 7) + 7) % 7]
  const DC = (d, concept, q, ansIdx, why) => {
    const wrong = [W(ansIdx + 1), W(ansIdx - 1), W(ansIdx + 3)]
    add({ st: CC, fam: F, concept, d, q, ans: W(ansIdx), wrong, exp: `${why} The answer is ${W(ansIdx)}.` })
  }
  DC(1, 'weekday-tuesday-plus-45', 'If today is Tuesday, what day of the week will it be 45 days from today?', 2 + 45, '45 = 6 weeks + 3 days, so count 3 days on from Tuesday.')
  DC(2, 'weekday-sunday-minus-100', 'If today is Sunday, what day of the week was it 100 days ago?', 0 - 100, '100 = 14 weeks + 2 days, so go back 2 days from Sunday.')
  DC(2, 'weekday-day-after-tomorrow-sunday', 'If the day after tomorrow is a Sunday, what was the day before yesterday?', 0 - 2 - 2, 'Today is Friday (two days before Sunday), and two days before Friday is Wednesday.')
  DC(2, 'weekday-three-days-ago-saturday', 'If three days ago it was Saturday, what day will it be four days after tomorrow?', 6 + 3 + 1 + 4, 'Today is Tuesday; tomorrow is Wednesday, and four days after Wednesday is Sunday.')
  DC(1, 'weekday-5th-monday-28th', 'If the 5th of a month is a Monday, what day of the week is the 28th of that month?', 1 + 23, 'The 28th is 23 days later: 3 weeks and 2 days after Monday.')
  DC(2, 'weekday-thursday-plus-62', 'An examination is to be held 62 days after a Thursday. On which day of the week will it fall?', 4 + 62, '62 = 8 weeks + 6 days; six days after Thursday is Wednesday.')
  DC(3, 'weekday-friday-plus-1000', 'Today is Friday. What day of the week will it be 1000 days from today?', 5 + 1000, '1000 = 142 weeks + 6 days; six days after Friday is Thursday.')
  DC(2, 'weekday-yesterday-wednesday-30-after-tomorrow', 'If yesterday was Wednesday, what day will it be 30 days after tomorrow?', 3 + 1 + 1 + 30, 'Today is Thursday and tomorrow Friday; 30 days = 4 weeks + 2 days, and two days after Friday is Sunday.')
  DC(1, 'weekday-31-day-month-begins-wednesday-ends', 'The first day of a 31-day month is a Wednesday. On which day does the month end?', 3 + 30, 'The 31st is 30 days after the 1st: 4 weeks and 2 days after Wednesday.')
  DC(1, 'weekday-18th-saturday-1st', 'If the 18th of a month falls on a Saturday, what day was the 1st of that month?', 6 - 17, 'The 1st is 17 days earlier: 2 weeks and 3 days before Saturday.')
  DC(3, 'weekday-meeting-every-9-days-fifth', 'A meeting is held every 9 days. If one is held on a Monday, on what day will the fifth meeting after it fall?', 1 + 45, 'The fifth meeting after it is 5 × 9 = 45 days later: 6 weeks and 3 days after Monday.')
  {
    const hours = 3 * 36, start = 1 * 24 + 8, t = start + hours, day = Math.floor(t / 24)
    DC(3, 'weekday-dose-every-36-hours-fourth', 'A patient takes a tablet every 36 hours, the first at 8 am on Monday. On which day is the fourth tablet taken?', day, 'The fourth tablet comes 3 × 36 = 108 hours = 4 days 12 hours after 8 am Monday, i.e. at 8 pm on Friday.')
  }
  DC(2, 'weekday-counting-today-20th-day-saturday', 'Counting today as the first day, the 20th day will be a Saturday. What day is today?', 6 - 19, 'The 20th day is 19 days after today; 19 = 2 weeks + 5 days, and five days before Saturday is Monday.')
  {
    // 3rd is Friday → first Monday is the 6th → third Monday is the 20th
    const firstMon = 3 + ((1 - 5 + 7) % 7), third = firstMon + 14
    add({ st: CC, fam: F, concept: 'date-third-monday-when-3rd-friday', d: 2, q: 'If the 3rd of a month is a Friday, on what date does the third Monday of that month fall?', ans: ord(third), wrong: [ord(third - 7), ord(third + 1), ord(third - 1)], exp: `The first Monday is the ${ord(firstMon)}, so the third Monday is ${firstMon} + 14 = the ${ord(third)}.` })
  }
}

// ga.calendar.leap-year
{
  const F = 'ga.calendar.leap-year'
  const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  {
    const opts = [2000, 1900, 2100, 1800], ok = opts.filter(leap)
    assert(ok.length === 1, 'one leap')
    add({ st: CC, fam: F, concept: 'leap-year-century-2000', d: 1, q: 'Which of the following years was or will be a leap year?', ans: ok[0], wrong: opts.filter((y) => !leap(y)), exp: 'A century year is a leap year only if it is divisible by 400; 2000 is, but 1800, 1900 and 2100 are not.' })
  }
  {
    const opts = [1900, 1996, 2004, 2024], bad = opts.filter((y) => !leap(y))
    assert(bad.length === 1, 'one non-leap')
    add({ st: CC, fam: F, concept: 'not-leap-year-1900', d: 2, q: 'Which one of these years was NOT a leap year?', ans: bad[0], wrong: opts.filter(leap), exp: '1900 is divisible by 100 but not by 400, so it was an ordinary year; the others are divisible by 4 and are not century years.' })
  }
  {
    let n = 0; for (let y = 2001; y <= 2100; y++) if (leap(y)) n++
    add({ st: CC, fam: F, concept: 'leap-years-2001-2100-count', d: 2, q: 'How many leap years are there from 2001 to 2100, both years included?', ans: n, wrong: [25, 23, 26], exp: `The multiples of 4 from 2004 to 2100 number 25, but 2100 is not a leap year (not divisible by 400), leaving ${n}.` })
  }
  {
    const n = (leap(2023) ? 366 : 365) + (leap(2024) ? 366 : 365)
    add({ st: CC, fam: F, concept: 'days-in-2023-and-2024', d: 1, q: 'How many days are there in the years 2023 and 2024 taken together?', ans: n, wrong: [730, 732, 729], exp: `2023 has 365 days and 2024, a leap year, has 366: ${n} in all.` })
  }
  {
    let n = 0; for (let y = 2009; y <= 2020; y++) if (leap(y)) n++
    add({ st: CC, fam: F, concept: 'feb-29-occurrences-2009-2020', d: 2, q: 'A child was born on 29 February 2008. In how many of the years from 2009 to 2020 did the date 29 February occur?', ans: n, wrong: [2, 4, 12], exp: `29 February occurs only in leap years; between 2009 and 2020 these are 2012, 2016 and 2020, so ${n}.` })
  }
  add({ st: CC, fam: F, concept: 'ordinary-year-52-weeks-plus-days', d: 1, q: 'An ordinary (non-leap) year consists of 52 weeks and how many extra days?', ans: 365 - 52 * 7, wrong: [2, 0, 3], exp: '52 weeks make 364 days, and an ordinary year has 365 days, so there is 1 extra day.' })
  {
    // leap year beginning on Thursday: 2004
    assert(leap(2004) && dow(2004, 1, 1) === 4, '2004 starts Thursday')
    const cnt = Array(7).fill(0); for (let t = Date.UTC(2004, 0, 1); t < Date.UTC(2005, 0, 1); t += 864e5) cnt[new Date(t).getUTCDay()]++
    const five3 = cnt.map((c, i) => (c === 53 ? WEEK[i] : null)).filter(Boolean)
    assert(five3.join() === 'Thursday,Friday', 'thursday friday')
    add({ st: CC, fam: F, concept: 'leap-year-starting-thursday-53-days', d: 3, q: 'A leap year begins on a Thursday. Which days of the week occur 53 times in that year?', ans: 'Thursday and Friday', wrong: ['Wednesday and Thursday', 'Friday and Saturday', 'Thursday and Saturday'], exp: 'A leap year has 52 weeks and 2 days; the two extra days are the first two days of the year, Thursday and Friday.' })
  }
  {
    const seen = new Set(); for (let y = 1600; y <= 4000; y += 100) seen.add(WEEK[dow(y, 12, 31)])
    const never = WEEK.filter((w) => !seen.has(w))
    assert(never.includes('Tuesday') && ['Friday', 'Sunday', 'Monday'].every((w) => seen.has(w)), 'century end days')
    add({ st: CC, fam: F, concept: 'last-day-of-century-never-tuesday', d: 3, q: 'The last day of a century (such as 31 December 2000) can never fall on which of these days?', ans: 'Tuesday', wrong: ['Friday', 'Sunday', 'Monday'], exp: `Over the 400-year Gregorian cycle, 31 December of a century year falls only on ${[...seen].join(', ')}; it is never a Tuesday, Thursday or Saturday.` })
  }
  {
    const y = 2024, opts = ['July', 'October', 'March', 'May']
    const same = opts.filter((m) => dow(y, MONTHS.indexOf(m) + 1, 1) === dow(y, 1, 1))
    assert(same.length === 1 && same[0] === 'July', 'july same as january in leap year')
    for (const yy of [2000, 2004, 2008, 2012, 2016, 2020]) assert(dow(yy, 7, 1) === dow(yy, 1, 1), 'leap july general')
    add({ st: CC, fam: F, concept: 'leap-year-month-starts-same-as-january', d: 3, q: 'In a leap year, which of these months always begins on the same day of the week as January?', ans: 'July', wrong: opts.filter((m) => m !== 'July'), exp: 'From 1 January to 1 July in a leap year there are 31+29+31+30+31+30 = 182 days = exactly 26 weeks, so both months start on the same day.' })
  }
  {
    let y = 2022; while (!(leap(y) === leap(2021) && dow(y, 1, 1) === dow(2021, 1, 1))) y++
    add({ st: CC, fam: F, concept: 'calendar-2021-reused-2027', d: 2, q: 'The calendar of 2021 can be used again, without change, in which year?', ans: y, wrong: [2026, 2028, 2032], exp: `A calendar repeats when a year starts on the same weekday and has the same length; 2021 began on a Friday and so does ${y}, both ordinary years.` })
  }
}

// ga.calendar.date-to-weekday (checked against the real calendar)
{
  const F = 'ga.calendar.date-to-weekday'
  const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const DW = (d, concept, given, asked, q, why) => {
    const [gy, gm, gd] = given, [ay, am, ad] = asked
    const ansI = dow(ay, am, ad)
    const wrong = [WEEK[(ansI + 6) % 7], WEEK[(ansI + 1) % 7], WEEK[dow(gy, gm, gd)] === WEEK[ansI] ? WEEK[(ansI + 2) % 7] : WEEK[dow(gy, gm, gd)]]
    add({ st: CC, fam: F, concept, d, q: q(WEEK[dow(gy, gm, gd)]), ans: WEEK[ansI], wrong: [...new Set(wrong)].length === 3 ? wrong : [WEEK[(ansI + 6) % 7], WEEK[(ansI + 1) % 7], WEEK[(ansI + 2) % 7]], exp: `${why} so the day is ${WEEK[ansI]}.` })
  }
  DW(3, 'weekday-14-aug-1948-from-1947', [1947, 8, 14], [1948, 8, 14], (g) => `14 August 1947 was a ${g}. What day of the week was 14 August 1948?`, 'The year between includes 29 February 1948, so it has 366 days = 52 weeks + 2 days;')
  DW(1, 'weekday-1-jan-2026-from-2025', [2025, 1, 1], [2026, 1, 1], (g) => `1 January 2025 was a ${g}. On what day did 1 January 2026 fall?`, '2025 is an ordinary year of 365 days = 52 weeks + 1 day;')
  DW(1, 'weekday-1-april-from-1-march', [2021, 3, 1], [2021, 4, 1], (g) => `If 1 March of a year is a ${g}, what day is 1 April of the same year?`, 'March has 31 days = 4 weeks + 3 days;')
  DW(2, 'weekday-23-march-2025-from-2024', [2024, 3, 23], [2025, 3, 23], (g) => `23 March 2024 was a ${g}. What day of the week was 23 March 2025?`, 'No 29 February lies between these dates, so 365 days = 52 weeks + 1 day pass;')
  DW(2, 'weekday-1-march-ordinary-year-jan-monday', [2018, 1, 1], [2018, 3, 1], (g) => `In an ordinary (non-leap) year, 1 January is a ${g}. What day is 1 March?`, 'January and February together have 31 + 28 = 59 days = 8 weeks + 3 days;')
  DW(2, 'weekday-1-march-leap-year-jan-saturday', [2000, 1, 1], [2000, 3, 1], (g) => `In a leap year whose 1 January is a ${g}, what day is 1 March?`, 'January and February have 31 + 29 = 60 days = 8 weeks + 4 days;')
  DW(2, 'weekday-1-jan-2001-from-2000', [2000, 1, 1], [2001, 1, 1], (g) => `If 1 January 2000 was a ${g}, what day was 1 January 2001?`, '2000 was a leap year (divisible by 400) of 366 days = 52 weeks + 2 days;')
  DW(3, 'weekday-25-dec-from-14-aug-same-year', [2022, 8, 14], [2022, 12, 25], (g) => `In a certain year 14 August falls on a ${g}. On what day does 25 December fall in the same year?`, 'From 14 August to 25 December is 17 + 30 + 31 + 30 + 25 = 133 days = exactly 19 weeks;')
  DW(3, 'weekday-14-aug-from-23-march-same-year', [2021, 3, 23], [2021, 8, 14], (g) => `If 23 March falls on a ${g} in some year, what day of the week is 14 August in that year?`, 'From 23 March to 14 August is 8 + 30 + 31 + 30 + 31 + 14 = 144 days = 20 weeks + 4 days;')
  DW(3, 'weekday-5-june-2023-from-2024', [2024, 6, 5], [2023, 6, 5], (g) => `5 June 2024 was a ${g}. What day of the week was 5 June 2023?`, 'Going back a year crosses 29 February 2024, i.e. 366 days = 52 weeks + 2 days back;')
  DW(1, 'weekday-15-feb-from-15-jan', [2019, 1, 15], [2019, 2, 15], (g) => `If 15 January is a ${g}, what day of the week is 15 February of that year?`, 'January has 31 days = 4 weeks + 3 days;')
  {
    // first Monday on the 3rd → Fridays on 7, 14, 21, 28
    const fridays = []; for (let dd = 1; dd <= 31; dd++) if ((dd - 3 + 7 * 10 + 1) % 7 === 5) fridays.push(dd)
    add({ st: CC, fam: F, concept: 'fourth-friday-when-first-monday-3rd', d: 2, q: 'The first Monday of a month falls on the 3rd. On what date is the fourth Friday of that month?', ans: ord(fridays[3]), wrong: [ord(fridays[3] - 7), ord(fridays[3] + 1), ord(fridays[3] + 3)], exp: `If the 3rd is a Monday, the Fridays are the ${fridays.map(ord).slice(0, 4).join(', ')}; the fourth is the ${ord(fridays[3])}.` })
  }
  {
    const sundays = []; for (let dd = 1; dd <= 30; dd++) if (((dd - 10) % 7 + 7) % 7 === 4) sundays.push(dd)
    add({ st: CC, fam: F, concept: 'sundays-in-30-day-month-10th-wednesday', d: 2, q: 'The 10th of a 30-day month is a Wednesday. How many Sundays does the month have?', ans: sundays.length, wrong: [5, 3, 6], exp: `If the 10th is a Wednesday, the Sundays are the ${sundays.map(ord).join(', ')}, so there are ${sundays.length}.` })
  }
  {
    const cnt = Array(7).fill(0); for (let dd = 0; dd < 31; dd++) cnt[(5 + dd) % 7]++
    const five = cnt.map((c, i) => (c === 5 ? WEEK[i] : null)).filter(Boolean)
    const a = `${five[0]}, ${five[1]} and ${five[2]}`
    assert(five.length === 3, 'three five-times days')
    add({ st: CC, fam: F, concept: 'five-times-days-31-day-month-starting-friday', d: 2, q: 'A 31-day month begins on a Friday. Which days of the week occur five times in it?', ans: 'Friday, Saturday and Sunday', wrong: ['Thursday, Friday and Saturday', 'Friday, Sunday and Monday', 'Saturday, Sunday and Monday'], exp: `31 days = 4 weeks + 3 days, and the 3 extra days are the first three: ${a}.` })
    assert(a === 'Sunday, Friday and Saturday' || five.sort().join() === ['Friday', 'Saturday', 'Sunday'].sort().join(), 'fri sat sun')
  }
}

// @@CONTINUE@@
if (dupErrors.length) { console.error(dupErrors.join('\n')); process.exit(1) }
console.log("items", items.length)
if (process.env.DUMP) for (const it of items.filter((x) => x.st === process.env.DUMP)) console.log(`[${it.d}] ${it.q}\n   ✔ ${it.ans} | ✘ ${it.wrong.join(" | ")}\n   ${it.exp}`)
