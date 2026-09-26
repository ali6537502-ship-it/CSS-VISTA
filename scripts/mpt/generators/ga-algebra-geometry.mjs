// Generator: MPT release bank, General Abilities — quantitative part 2
// (algebra, equations, sets, number properties, geometry, mensuration, data, probability).
//
//   node scripts/mpt/generators/ga-algebra-geometry.mjs
//
// Writes src/data/mpt/bank/abilities/ga-b-01.json … (≤100 items per file), IDs mpt-ga-b-####.
// Deterministic: a fixed-seed PRNG per pattern family. Every answer is computed here and every
// distractor is produced from a typical mistake, then checked to be distinct from the answer.
// Each hand-written wording (item template) is used exactly once; items sharing a mathematical
// skeleton share one pattern_family.
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { canonical, surfaceTemplate } from '../bank-lib.mjs'

const OUT_DIR = 'src/data/mpt/bank/abilities'
const PREFIX = 'mpt-ga-b-'
const FILE_PREFIX = 'ga-b-'
const SEED = 20260926
const TODAY = '2026-09-26'

// ---------------------------------------------------------------------------
// PRNG and maths helpers
// ---------------------------------------------------------------------------
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function makeRng(seedText) {
  const f = mulberry32(hashStr(seedText) ^ SEED)
  const r = {
    f,
    int: (a, b) => a + Math.floor(f() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(f() * arr.length)],
    shuffle: (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [c[i], c[j]] = [c[j], c[i]] } return c },
    sample: (arr, k) => r.shuffle(arr).slice(0, k),
  }
  return r
}
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b)
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true }
const primesBelow = (n) => { const out = []; for (let i = 2; i < n; i++) if (isPrime(i)) out.push(i); return out }
const divisors = (n) => { const out = []; for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i); return out }
const sum = (arr) => arr.reduce((s, v) => s + v, 0)
const isInt = (v) => Number.isInteger(v)
const near = (a, b) => Math.abs(a - b) < 1e-9

/** Reduced fraction as a display string; integers print plainly. */
function fr(n, d = 1) {
  if (d < 0) { n = -n; d = -d }
  const g = gcd(n, d) || 1
  n /= g; d /= g
  const s = d === 1 ? `${Math.abs(n)}` : `${Math.abs(n)}/${d}`
  return n < 0 ? `−${s}` : s
}
/** Plain number with a proper minus sign; decimals trimmed to at most 4 places. */
function num(v) {
  if (typeof v === 'string') return v
  let s = isInt(v) ? String(Math.abs(v)) : String(Number(Math.abs(v).toFixed(4)))
  if (isInt(v) && Math.abs(v) >= 10000) s = Math.abs(v).toLocaleString('en-US')
  return v < 0 ? `−${s}` : s
}
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' }
const sup = (n) => String(n).split('').map((c) => SUP[c] ?? c).join('')
/** Signed term helper: " + 5" / " − 5" for building expressions. */
const sg = (v, first = false) => (v < 0 ? (first ? '−' : ' − ') : (first ? '' : ' + ')) + Math.abs(v)
/** Coefficient display for a term: 1x → x, −1x → −x. */
function term(c, v, first = false) {
  if (c === 0) return ''
  const mag = Math.abs(c) === 1 ? v : `${Math.abs(c)}${v}`
  if (first) return (c < 0 ? '−' : '') + mag
  return (c < 0 ? ' − ' : ' + ') + mag
}
function poly(coeffs, v = 'x') { // coeffs highest degree first
  const deg = coeffs.length - 1
  let s = ''
  coeffs.forEach((c, i) => {
    const p = deg - i
    if (c === 0) return
    const base = p === 0 ? '' : p === 1 ? v : `${v}${sup(p)}`
    const first = s === ''
    if (p === 0) s += first ? num(c) : (c < 0 ? ' − ' : ' + ') + Math.abs(c)
    else s += term(c, base, first)
  })
  return s || '0'
}
const deg = (v) => `${num(v)}°`
/** Number in brackets when negative, for worked solutions: 5 → 5, −3 → (−3). */
const pn = (v) => (v < 0 ? `(${num(v)})` : num(v))
const NAMES = ['Ali', 'Sara', 'Bilal', 'Ayesha', 'Hamza', 'Fatima', 'Usman', 'Zainab', 'Hassan', 'Maryam', 'Ahmed', 'Hina',
  'Saad', 'Nida', 'Imran', 'Rabia', 'Kamran', 'Sana', 'Faisal', 'Amna', 'Tariq', 'Iqra', 'Junaid', 'Mehwish', 'Asad', 'Noor']

// ---------------------------------------------------------------------------
// Family registry
// ---------------------------------------------------------------------------
// family(id, subtopic, {
//   gen(r, x)  -> params (x = the item's extra object, merged into params),
//   key(p)     -> signature of the specific fact (becomes part of `concept`),
//   solve(p)   -> { ans, wrong: [typical-mistake values…], expl, fmt? } or null to reject,
//   fmt(v, p)  -> option text (default: num),
//   items: [[difficulty, (p) => stem, extra?], …]   — each wording used once.
// })
const FAMILIES = []
function family(id, subtopic, spec) { FAMILIES.push({ id, subtopic, ...spec }) }

// Polynomial and expression helpers ------------------------------------------------
const pmul = (A, B) => { const out = Array(A.length + B.length - 1).fill(0); A.forEach((a, i) => B.forEach((b, j) => { out[i + j] += a * b })); return out }
const peq = (A, B) => A.length === B.length && A.every((v, i) => v === B[i])
const lin = (c, d, v = 'x') => `(${poly([c, d], v)})`
function mono(c, vars) {
  const body = vars.filter(([, e]) => e !== 0).map(([v, e]) => (e === 1 ? v : v + sup(e))).join('')
  if (!body) return num(c)
  if (c === 1) return body
  if (c === -1) return `−${body}`
  return num(c) + body
}
/** Linear combination display: [[3,'a'],[-2,'b'],[5,'']] → "3a − 2b + 5". */
function lc(terms) {
  let s = ''
  for (const [c, v] of terms) {
    if (c === 0) continue
    const first = s === ''
    if (v === '') s += first ? num(c) : (c < 0 ? ' − ' : ' + ') + Math.abs(c)
    else s += term(c, v, first)
  }
  return s || '0'
}
/** True when two functions of n variables differ somewhere on a small grid. */
function fnDiffer(f, g, n = 1) {
  const pts = [2, 3, 5, -1, 7]
  const combos = n === 1 ? pts.map((a) => [a]) : n === 2 ? pts.flatMap((a) => pts.map((b) => [a, b])) : pts.flatMap((a) => pts.flatMap((b) => pts.map((c) => [a, b, c])))
  return combos.some((args) => Math.abs(f(...args) - g(...args)) > 1e-9)
}
/** Keep only candidate {t, f} options whose function genuinely differs from the answer. */
const wrongFns = (ansF, cands, n = 1) => cands.filter((c) => fnDiffer(ansF, c.f, n)).map((c) => c.t)
const evalPoly = (A, x) => A.reduce((s, c) => s * x + c, 0)

// ===========================================================================
// ga.algebra — 160
// ===========================================================================
family('ga.algebra.sum-product-to-sum-of-squares', 'ga.algebra', {
  gen: (r) => { const s = r.int(3, 14); return { s, pr: r.int(2, Math.floor((s * s) / 4)) } },
  key: (p) => `s${p.s}-p${p.pr}`,
  solve: ({ s, pr }) => ({
    ans: s * s - 2 * pr,
    wrong: [s * s + 2 * pr, s * s - pr, s * s - 4 * pr, s * s],
    expl: `a² + b² = (a + b)² − 2ab = ${s}² − 2 × ${pr} = ${s * s} − ${2 * pr} = ${s * s - 2 * pr}.`,
  }),
  items: [
    [2, (p) => `Find the value of a² + b² when a + b = ${p.s} and ab = ${p.pr}.`],
    [2, (p) => `Given that x + y = ${p.s} and xy = ${p.pr}, what is x² + y²?`],
    [2, (p) => `Two numbers add up to ${p.s} and their product is ${p.pr}. What is the sum of their squares?`],
    [2, (p) => `If m + n = ${p.s} and mn = ${p.pr}, then m² + n² is:`],
    [2, (p) => `p and q are real numbers such that p + q = ${p.s} and pq = ${p.pr}. Evaluate p² + q².`],
    [2, (p) => `Without finding a and b separately, work out a² + b² if a + b = ${p.s} and ab = ${p.pr}.`],
    [3, (p) => `The length and breadth of a rectangle add up to ${p.s} cm and its area is ${p.pr} cm². What is the square of the length of its diagonal, in cm²?`],
    [2, (p) => `The roots of a quadratic equation have a sum of ${p.s} and a product of ${p.pr}. What is the sum of the squares of the roots?`],
    [2, (p) => `For two numbers u and v, u + v = ${p.s} and uv = ${p.pr}. Find u² + v².`],
    [1, (p) => `If (a + b)² = ${p.s * p.s} and ab = ${p.pr}, what is a² + b²?`],
    [2, (p) => `Ali thinks of two numbers whose sum is ${p.s} and whose product is ${p.pr}. He squares each number and adds the results. What total does he get?`],
    [2, (p) => `The sum of two numbers is ${p.s} and the product is ${p.pr}. The sum of the squares of the numbers equals:`],
  ],
})

family('ga.algebra.reciprocal-sum-of-squares', 'ga.algebra', {
  gen: (r) => ({ k: r.int(3, 11) }),
  key: (p) => `${p.v}-${p.k}`,
  solve: ({ k, v }) => {
    if (v === 'plus') return { ans: k * k - 2, wrong: [k * k, k * k + 2, k * k - 1, 2 * k - 2], expl: `Squaring, x² + 2 + 1/x² = ${k}² = ${k * k}, so x² + 1/x² = ${k * k} − 2 = ${k * k - 2}.` }
    if (v === 'minus') return { ans: k * k + 2, wrong: [k * k, k * k - 2, k * k + 1, 2 * k + 2], expl: `Squaring, x² − 2 + 1/x² = ${k}² = ${k * k}, so x² + 1/x² = ${k * k} + 2 = ${k * k + 2}.` }
    const m = k * k - 2
    return { ans: k, wrong: [k * k, k - 1, k + 1, m - 2], expl: `(x + 1/x)² = x² + 1/x² + 2 = ${m} + 2 = ${k * k}; for positive x, x + 1/x = ${k}.` }
  },
  items: [
    [2, (p) => `If x + 1/x = ${p.k}, find the value of x² + 1/x².`, { v: 'plus' }],
    [2, (p) => `Given y + 1/y = ${p.k}, what does y² + 1/y² equal?`, { v: 'plus' }],
    [2, (p) => `A non-zero number added to its reciprocal gives ${p.k}. What is the square of the number plus the square of its reciprocal?`, { v: 'plus' }],
    [2, (p) => `If x − 1/x = ${p.k}, then x² + 1/x² is:`, { v: 'minus' }],
    [2, (p) => `When a number minus its reciprocal equals ${p.k}, the sum of the square of the number and the square of its reciprocal is:`, { v: 'minus' }],
    [3, (p) => `If x² + 1/x² = ${p.k * p.k - 2} and x is positive, what is x + 1/x?`, { v: 'inv' }],
    [2, (p) => `Evaluate a² + 1/a², given that a + 1/a = ${p.k}.`, { v: 'plus' }],
    [2, (p) => `For t ≠ 0, t − 1/t = ${p.k}. Find t² + 1/t².`, { v: 'minus' }],
    [3, (p) => `The square of a positive number plus the square of its reciprocal is ${p.k * p.k - 2}. The number plus its reciprocal is:`, { v: 'inv' }],
    [2, (p) => `If p + 1/p = ${p.k}, the value of p² + 1/p² is:`, { v: 'plus' }],
  ],
})

family('ga.algebra.difference-of-squares-evaluate', 'ga.algebra', {
  gen: (r, x) => {
    if (x.m === 'sq' || x.m === 'plot') { const S = r.pick([50, 100, 200]); const D = r.int(2, 12) * 2; return { a: (S + D) / 2, b: (S - D) / 2 } }
    if (x.m === 'near') return { N: r.pick([100, 1000, 50]), k: r.int(1, 9) }
    if (x.m === 'quot') { const a = r.int(12, 40); return { a, b: r.int(3, a - 2) } }
    const D = r.int(2, 9); return { S: D + r.int(2, 12) * 2, D }
  },
  key: (p) => `${p.m}-${[p.a, p.b, p.N, p.k, p.S, p.D].filter((v) => v !== undefined).join('-')}`,
  solve: (p) => {
    const { a, b, N, k, S, D } = p
    if (p.m === 'sq' || p.m === 'plot') return { ans: (a + b) * (a - b), wrong: [(a - b) ** 2, (a + b) * (a - b + 1), (a + b + 1) * (a - b)], expl: `a² − b² = (a + b)(a − b) = ${a + b} × ${a - b} = ${(a + b) * (a - b)}.` }
    if (p.m === 'near') return { ans: N * N - k * k, wrong: [N * N, N * N + k * k, N * N - 2 * k], expl: `(${N} + ${k})(${N} − ${k}) = ${N}² − ${k}² = ${N * N} − ${k * k} = ${N * N - k * k}.` }
    if (p.m === 'sumdiff') return { ans: S * D, wrong: [S * S - D * D, S + D, 2 * S * D], expl: `a² − b² = (a + b)(a − b) = ${S} × ${D} = ${S * D}.` }
    if (p.m === 'rev') return { ans: D, wrong: [S, S * D - S, 2 * D, D + 1], expl: `x² − y² = (x + y)(x − y), so x − y = ${S * D} ÷ ${S} = ${D}.` }
    return { ans: a + b, wrong: [a - b, 2 * a, 2 * b], expl: `(a² − b²) = (a + b)(a − b), so dividing by (a − b) leaves a + b = ${a} + ${b} = ${a + b}.` }
  },
  items: [
    [1, (p) => `Evaluate ${p.a}² − ${p.b}².`, { m: 'sq' }],
    [2, (p) => `Using a suitable identity, find the value of ${p.a}² − ${p.b}² without squaring each number.`, { m: 'sq' }],
    [2, (p) => `What is ${p.N + p.k} × ${p.N - p.k}?`, { m: 'near' }],
    [2, (p) => `The product (${p.N + p.k})(${p.N - p.k}) can be worked out mentally. Its value is:`, { m: 'near' }],
    [1, (p) => `If a + b = ${p.S} and a − b = ${p.D}, what is a² − b²?`, { m: 'sumdiff' }],
    [2, (p) => `Two numbers have a sum of ${p.S} and a difference of ${p.D}. What is the difference of their squares?`, { m: 'sumdiff' }],
    [2, (p) => `The difference between the squares of two positive numbers is ${p.S * p.D} and their sum is ${p.S}. What is the difference between the numbers?`, { m: 'rev' }],
    [2, (p) => `If x² − y² = ${p.S * p.D} and x + y = ${p.S}, then x − y equals:`, { m: 'rev' }],
    [1, (p) => `Simplify (${p.a}² − ${p.b}²) ÷ (${p.a} − ${p.b}).`, { m: 'quot' }],
    [2, (p) => `A square plot of side ${p.a} m has a square pond of side ${p.b} m dug inside it. How much of the plot, in m², is left as land?`, { m: 'plot' }],
  ],
})

family('ga.algebra.expand-products', 'ga.algebra', {
  gen: (r, x) => {
    const pq = () => { let q = r.int(1, 9); if (r.f() < 0.4) q = -q; return { p: r.int(2, 6), q } }
    if (['sqfull', 'sqmid', 'sqconst', 'sqcoef'].includes(x.m)) return pq()
    if (x.m === 'sqfull2') return { p: r.int(2, 5), q: r.int(2, 7) }
    if (x.m === 'missing' || x.m === 'missing2') return { c: r.int(3, 12) }
    let b = r.int(1, 9); if (r.f() < 0.5) b = -b
    return { a: r.int(1, 9), b }
  },
  key: (p) => `${p.m}-${[p.p, p.q, p.a, p.b, p.c].filter((v) => v !== undefined).join('-')}`,
  solve: (P) => {
    const { p, q, a, b, c, m } = P
    if (m === 'sqfull' || m === 'sqconst' || m === 'sqcoef' || m === 'sqmid') {
      const A = pmul([p, q], [p, q])
      if (m === 'sqfull') {
        const cands = [[p * p, 0, q * q], [p * p, p * q, q * q], [p, 2 * p * q, q * q], [p * p, 2 * p * q, -q * q]]
          .filter((C) => !peq(C, A)).map((C) => poly(C))
        return { ans: poly(A), wrong: cands, expl: `(a + b)² = a² + 2ab + b², so (${poly([p, q])})² = ${poly(A)}.` }
      }
      if (m === 'sqmid') return { ans: 2 * p * q, wrong: [p * q, p * p * q, 2 * p + q, 4 * p * q], expl: `The middle term is 2 × ${p}x × ${pn(q)} = ${num(2 * p * q)}x, so the coefficient is ${num(2 * p * q)}.` }
      if (m === 'sqconst') return { ans: q * q, wrong: [2 * Math.abs(q), Math.abs(q), 2 * p * Math.abs(q)], expl: `The constant term is (${num(q)})² = ${q * q}.` }
      return { ans: p * p, wrong: [p, 2 * p, 2 * p * Math.abs(q)], expl: `The x² term is (${p}x)² = ${p * p}x², so the coefficient is ${p * p}.` }
    }
    if (m === 'sqfull2') {
      const ans = `${p * p}a² − ${2 * p * q}ab + ${q * q}b²`
      return { ans, wrong: [`${p * p}a² + ${q * q}b²`, `${p * p}a² − ${p * q}ab + ${q * q}b²`, `${p}a² − ${2 * p * q}ab + ${q}b²`], expl: `(x − y)² = x² − 2xy + y², so (${p}a − ${q}b)² = ${ans}.` }
    }
    if (m === 'missing') return { ans: 2 * c, wrong: [c, c * c, 4 * c], expl: `x² + kx + ${c * c} = (x + ${c})² requires k = 2 × ${c} = ${2 * c}.` }
    if (m === 'missing2') return { ans: c * c, wrong: [c, 2 * c, 4 * c * c], expl: `Half the coefficient of x is ${c}; adding ${c}² = ${c * c} gives (x + ${c})².` }
    if (m === 'prodfull' || m === 'prodmid') {
      const A = pmul([1, a], [1, b])
      if (m === 'prodmid') return { ans: a + b, wrong: [a * b, a - b, b - a, a + b + 1].filter((v) => v !== a + b), expl: `(y + a)(y + b) = y² + (a + b)y + ab; here a + b = ${a} + ${pn(b)} = ${num(a + b)}.` }
      const cands = [[1, 0, a * b], [1, a * b, a + b], [1, a - b, a * b], [1, a + b, -a * b]].filter((C) => !peq(C, A)).map((C) => poly(C))
      return { ans: poly(A), wrong: cands, expl: `(x + a)(x + b) = x² + (a + b)x + ab = ${poly(A)}.` }
    }
    // prodfull2: (2x + a)(x − |b|)
    const bb = Math.abs(b)
    const A = pmul([2, a], [1, -bb])
    const cands = [[2, 0, -a * bb], [2, a - bb, -a * bb], [2, a - 2 * bb, a * bb], [2, -a - 2 * bb, -a * bb]].filter((C) => !peq(C, A)).map((C) => poly(C))
    return { ans: poly(A), wrong: cands, expl: `2x × x = 2x², 2x × (−${bb}) + ${a} × x = ${num(a - 2 * bb)}x, and ${a} × (−${bb}) = −${a * bb}; so the product is ${poly(A)}.` }
  },
  items: [
    [1, (p) => `Expand (${poly([p.p, p.q])})².`, { m: 'sqfull' }],
    [1, (p) => `In the expansion of (${poly([p.p, p.q])})², the coefficient of x is:`, { m: 'sqmid' }],
    [1, (p) => `(${p.p}a − ${p.q}b)² is equal to:`, { m: 'sqfull2' }],
    [1, (p) => `(x + ${p.a})${lin(1, p.b)} simplifies to:`, { m: 'prodfull' }],
    [1, (p) => `When (y + ${p.a})${lin(1, p.b, 'y')} is multiplied out, what is the coefficient of y?`, { m: 'prodmid' }],
    [2, (p) => `For what positive value of k is x² + kx + ${p.c * p.c} a perfect square?`, { m: 'missing' }],
    [2, (p) => `What must be added to x² + ${2 * p.c}x to make it a perfect square?`, { m: 'missing2' }],
    [1, (p) => `What is the constant term when (${poly([p.p, p.q], 'm')})² is expanded?`, { m: 'sqconst' }],
    [1, (p) => `The coefficient of x² in (${poly([p.p, p.q])})² is:`, { m: 'sqcoef' }],
    [2, (p) => `What is the product of (2x + ${p.a}) and (x − ${Math.abs(p.b)})?`, { m: 'prodfull2' }],
  ],
})

family('ga.algebra.exponent-laws-evaluate', 'ga.algebra', {
  gen: (r, x) => {
    switch (x.s) {
      case 'halfsq': return { b: r.pick([4, 9, 16, 25]) }
      case 'quot0': { const b = r.pick([2, 3, 5]); const n = r.int(2, 4); return { b, n, m: n + r.int(1, b === 2 ? 3 : 2), c: r.int(2, 9) } }
      case 'powquot': { const b = r.pick([2, 3]); const m = r.int(2, 3); const n = r.int(2, 3); return { b, m, n, k: m * n - r.int(1, 2) } }
      case 'negfrac': { const b = r.pick([2, 3, 4, 5]); return { b, n: b === 2 ? r.int(3, 5) : r.int(2, 3) } }
      case 'negpos': { const b = r.int(2, 9); const m = r.int(2, 4); return { b, m, n: m + r.int(1, 2) } }
      case 'copies': return { n: r.int(3, 7) }
      case 'sym': { const a = r.int(4, 9); const b = r.int(2, 6); return { a, b, c: r.int(2, a + b - 2) } }
      case 'mixsym': { const a = r.int(2, 4); const b = r.int(2, 4); return { a, b, k: r.int(1, 2 * a - 1) } }
      case 'cube3': { const c = r.int(2, 5); return { c, B: c ** 3 } }
      case 'quarter': { const t = r.int(2, 3); return { t, B: t ** 4 } }
      case 'ten': { const m = r.int(2, 5); return { m, n: -(m + r.int(1, 3)) } }
      case 'nfactor': return { b: r.int(2, 5), k: r.int(2, 3) }
      case 'zero': return { b: r.int(3, 9) }
      default: { let p = r.int(2, 5); let q = r.int(2, 7); if (gcd(p, q) !== 1 || p === q) q = p + 1; return { p, q } } // fracneg
    }
  },
  key: (p) => `${p.s}-${Object.entries(p).filter(([k]) => k !== 's').map(([, v]) => v).join('-')}`,
  solve: (P) => {
    switch (P.s) {
      case 'halfsq': { const { b } = P; const s = Math.sqrt(b); const ans = s * b * b - 1; return { ans, wrong: [s * b * b, (b / 2) * b * b - 1, s * b * b - b], expl: `${b}^(1/2) = ${s}, ${b}² = ${b * b} and ${b}⁰ = 1, so ${s} × ${b * b} − 1 = ${ans}.` } }
      case 'quot0': { const { b, m, n, c } = P; const ans = b ** (m - n) + 1; return { ans, wrong: [b ** (m - n), b ** (m - n) + c, (m - n) * b + 1], expl: `${b}${sup(m)} ÷ ${b}${sup(n)} = ${b}${sup(m - n)} = ${b ** (m - n)}, and ${c}⁰ = 1, giving ${ans}.` } }
      case 'powquot': { const { b, m, n, k } = P; const e = m * n - k; return { ans: b ** e, wrong: [b ** (m + n - k), b ** (e + 1), b ** k].filter((v) => v !== b ** e && v > 0 && v < 100000), expl: `(${b}${sup(m)})${sup(n)} = ${b}${sup(m * n)}; ${b}${sup(m * n)} ÷ ${b}${sup(k)} = ${b}${sup(e)} = ${b ** e}.` } }
      case 'negfrac': { const { b, n } = P; return { ans: b ** n, wrong: [fr(1, b ** n), b * n, b ** (n - 1)], expl: `(1/${b})${sup(-n)} = ${b}${sup(n)} = ${b ** n}, since a negative index means the reciprocal.` } }
      case 'negpos': { const { b, m, n } = P; const e = n - m; return { ans: b ** e, wrong: [fr(1, b ** e), b ** (e + 1), b * e].filter((v) => v !== b ** e), expl: `${b}${sup(-m)} × ${b}${sup(n)} = ${b}${sup(-m + n)} = ${b ** e}.` } }
      case 'copies': { const { n } = P; const ans = `2${sup(n + 2)}`; const cand = [4 * n, n + 4, 2 * n, n + 1].filter((e) => e !== n + 2).map((e) => `2${sup(e)}`); return { ans, wrong: cand, expl: `2${sup(n)} + 2${sup(n)} + 2${sup(n)} + 2${sup(n)} = 4 × 2${sup(n)} = 2² × 2${sup(n)} = 2${sup(n + 2)}.` } }
      case 'sym': { const { a, b, c } = P; const e = a + b - c; const cand = [a + b + c, a * b - c, a + b, a * b].filter((v) => v !== e && v > 0).map((v) => `x${sup(v)}`); return { ans: `x${sup(e)}`, wrong: cand, expl: `Add indices when multiplying and subtract when dividing: ${a} + ${b} − ${c} = ${e}, so the result is x${sup(e)}.` } }
      case 'mixsym': {
        const { a, b, k } = P
        const ans = mono(1, [['a', 2 * a - k], ['b', 2 * b]])
        const cand = [mono(1, [['a', a + 2 - k], ['b', b + 2]]), mono(1, [['a', 2 * a - k], ['b', b]]), mono(1, [['a', 2 * a + k], ['b', 2 * b]]), mono(1, [['a', 2 * a], ['b', 2 * b]])].filter((t) => t !== ans)
        return { ans, wrong: cand, expl: `(a${sup(a)}b${sup(b)})² = a${sup(2 * a)}b${sup(2 * b)}; multiplying by a${sup(-k)} subtracts ${k} from the index of a, giving ${ans}.` }
      }
      case 'cube3': { const { c, B } = P; return { ans: fr(B * (1 + c) + 1, B), wrong: [fr(B * c + 1, B), fr(B * (1 + c) - 1, B), `${1 + c}`], expl: `${B}⁰ = 1, ${B}^(1/3) = ${c} and ${B}⁻¹ = 1/${B}; the total is ${1 + c} + 1/${B} = ${fr(B * (1 + c) + 1, B)}.` } }
      case 'quarter': { const { t, B } = P; return { ans: t, wrong: [t * t, fr(1, t), 2 * t], expl: `${B}^(1/2) ÷ ${B}^(1/4) = ${B}^(1/2 − 1/4) = ${B}^(1/4) = ${t}.` } }
      case 'ten': { const { m, n } = P; const e = m + n; const v = (x) => (x >= 0 ? 10 ** x : Number((10 ** x).toFixed(-x))); return { ans: v(e), wrong: [v(e - 1), v(-e), v(e + 1)], expl: `10${sup(m)} × 10${sup(n)} = 10${sup(e)} = ${num(v(e))}.` } }
      case 'nfactor': { const { b, k } = P; const ans = b ** k - 1; return { ans, wrong: [b ** k, k, b - 1, b ** (k - 1)].filter((v) => v !== ans), expl: `${b}ⁿ⁺${sup(k)} − ${b}ⁿ = ${b}ⁿ(${b}${sup(k)} − 1); dividing by ${b}ⁿ leaves ${b ** k} − 1 = ${ans}.` } }
      case 'zero': { const { b } = P; return { ans: 1, wrong: [0, b, 2], expl: `Any non-zero number to the power 0 is 1, and 0${sup(b)} = 0; so ${b}⁰ + 0${sup(b)} = 1.` } }
      default: { const { p, q } = P; return { ans: fr(q * q, p * p), wrong: [fr(p * p, q * q), fr(2 * q, p), fr(q * q, p)].filter((t) => t !== fr(q * q, p * p)), expl: `A negative index inverts the fraction: (${p}/${q})⁻² = (${q}/${p})² = ${fr(q * q, p * p)}.` } }
    }
  },
  items: [
    [2, (p) => `Compute ${p.b}^(1/2) × ${p.b}² − ${p.b}⁰.`, { s: 'halfsq' }],
    [1, (p) => `What is the value of ${p.b}${sup(p.m)} ÷ ${p.b}${sup(p.n)} + ${p.c}⁰?`, { s: 'quot0' }],
    [2, (p) => `Express (${p.b}${sup(p.m)})${sup(p.n)} ÷ ${p.b}${sup(p.k)} as a whole number.`, { s: 'powquot' }],
    [1, (p) => `Find the value of (1/${p.b})${sup(-p.n)}.`, { s: 'negfrac' }],
    [1, (p) => `${p.b}${sup(-p.m)} × ${p.b}${sup(p.n)} is equal to:`, { s: 'negpos' }],
    [2, (p) => `Written as a single power of 2, 2${sup(p.n)} + 2${sup(p.n)} + 2${sup(p.n)} + 2${sup(p.n)} is:`, { s: 'copies' }],
    [1, (p) => `x${sup(p.a)} × x${sup(p.b)} ÷ x${sup(p.c)} simplifies to:`, { s: 'sym' }],
    [2, (p) => `Simplify (a${sup(p.a)}b${sup(p.b)})² × a${sup(-p.k)}.`, { s: 'mixsym' }],
    [3, (p) => `Add together ${p.B}⁰, ${p.B}^(1/3) and ${p.B}⁻¹. The total is:`, { s: 'cube3' }],
    [2, (p) => `Work out ${p.B}^(1/2) ÷ ${p.B}^(1/4).`, { s: 'quarter' }],
    [1, (p) => `The value of 10${sup(p.m)} × 10${sup(p.n)} is:`, { s: 'ten' }],
    [3, (p) => `Simplify (${p.b}ⁿ⁺${sup(p.k)} − ${p.b}ⁿ) ÷ ${p.b}ⁿ.`, { s: 'nfactor' }],
    [1, (p) => `What does ${p.b}⁰ + 0${sup(p.b)} equal?`, { s: 'zero' }],
    [2, (p) => `Calculate (${p.p}/${p.q})⁻².`, { s: 'fracneg' }],
  ],
})

family('ga.algebra.exponential-equation', 'ga.algebra', {
  gen: (r, x) => {
    switch (x.s) {
      case 'frac': { const c = r.pick([2, 3, 5]); const mx = c === 2 ? 5 : c === 3 ? 4 : 3; const m = r.int(2, mx); let n = r.int(1, mx); if (n === m || n % m === 0) n = m === 2 ? 3 : 2; return { c, m, n } }
      case 'simple': { const b = r.pick([2, 3, 5, 7]); return { b, n: r.int(3, b === 2 ? 7 : b === 3 ? 5 : 3) } }
      case 'shift': { const b = r.pick([2, 3]); return { b, n: r.int(3, b === 2 ? 6 : 4), c: r.int(1, 3) } }
      case 'kx': { const b = r.pick([2, 3, 5]); const k = r.int(2, 3); return { b, k, n: k * r.int(1, b === 2 ? 3 : 2) } }
      case 'recip': { const b = r.pick([2, 3, 4, 5]); return { b, n: r.int(2, 4) } }
      case 'pair': return { m: r.int(2, 5), n: r.int(2, 4) }
      case 'cross': return { b: r.pick([2, 3]), p: r.int(1, 4), q: r.int(1, 4) }
      case 'eight': return { p: 2 * r.int(1, 5) }
      case 'decimal': return { n: r.int(2, 5) }
      case 'prev': { const b = r.pick([2, 3, 4, 5, 6]); return { b, n: r.int(3, b <= 3 ? 6 : 4) } }
      case 'zero': return { b: r.int(3, 13) }
      default: { const b = r.pick([2, 3]); const n = r.pick([3, 5]); return { b, n, c: r.int(2, 5) } } // two-stage
    }
  },
  key: (p) => `${p.s}-${Object.entries(p).filter(([k]) => k !== 's').map(([, v]) => v).join('-')}`,
  solve: (P) => {
    switch (P.s) {
      case 'frac': { const { c, m, n } = P; return { ans: fr(n, m), wrong: [fr(m, n), fr(1, m), fr(n, m + 1), `${n}`], expl: `${c ** m} = ${c}${sup(m)} and ${c ** n} = ${c}${sup(n)}, so ${m}k = ${n} and k = ${fr(n, m)}.` } }
      case 'simple': { const { b, n } = P; const B = b ** n; return { ans: n, wrong: [B / b, n + 1, n - 1].filter((v) => v !== n), expl: `${B} = ${b}${sup(n)}, so x = ${n}.` } }
      case 'shift': { const { b, n, c } = P; return { ans: n + c, wrong: [n, n - c, n + c + 1], expl: `${b ** n} = ${b}${sup(n)}, so x − ${c} = ${n} and x = ${n + c}.` } }
      case 'kx': { const { b, k, n } = P; return { ans: n / k, wrong: [n, n * k, n - k].filter((v) => v > 0), expl: `${b ** n} = ${b}${sup(n)}, so ${k}x = ${n} and x = ${n / k}.` } }
      case 'recip': { const { b, n } = P; return { ans: -n, wrong: [fr(-1, n), -b, fr(1, b ** n), n + 1], expl: `1/${b ** n} = ${b}${sup(-n)}, so y = −${n}.` } }
      case 'pair': { const { m, n } = P; return { ans: m + n, wrong: [m * n, Math.abs(m - n), m + n + 2], expl: `2${sup(m)} = ${2 ** m} gives x = ${m}; 3${sup(n)} = ${3 ** n} gives y = ${n}; so x + y = ${m + n}.` } }
      case 'cross': { const { p, q } = P; return { ans: p + 2 * q, wrong: [p + q, 2 * p + q, Math.abs(p - 2 * q) || 2 * p + 2 * q], expl: `Write the right side with the same base: x + ${p} = 2(x − ${q}), so x = ${p} + ${2 * q} = ${p + 2 * q}.` } }
      case 'eight': { const { p } = P; return { ans: p / 2, wrong: [p, fr(p, 3), fr(p, 4)].filter((t) => t !== p / 2 && t !== `${p / 2}`), expl: `8ˣ = 2³ˣ, so 3x = x + ${p}, giving 2x = ${p} and x = ${p / 2}.` } }
      case 'decimal': { const { n } = P; return { ans: -n, wrong: [fr(-1, n), -(n - 1), -(n + 1)], expl: `${num(10 ** -n === 0 ? 0 : Number((10 ** -n).toFixed(n)))} = 10${sup(-n)}, so x = −${n}.` } }
      case 'prev': { const { b, n } = P; const B = b ** n; return { ans: B / b, wrong: [B - 1, n - 1, B - b], expl: `${b}ⁿ⁻¹ = ${b}ⁿ ÷ ${b} = ${B} ÷ ${b} = ${B / b}.` } }
      case 'zero': { const { b } = P; return { ans: 0, wrong: [1, b, fr(1, b)], expl: `${b}⁰ = 1, and no other index gives 1, so a = 0.` } }
      default: { const { b, n, c } = P; const x = (n + 1) / 2; return { ans: c ** x, wrong: [x, c ** (x + 1), c * x], expl: `${b ** n} = ${b}${sup(n)}, so 2x − 1 = ${n} and x = ${x}; then ${c}ˣ = ${c}${sup(x)} = ${c ** x}.` } }
    }
  },
  items: [
    [2, (p) => `What is k, given that ${p.c ** p.m}ᵏ = ${p.c ** p.n}?`, { s: 'frac' }],
    [1, (p) => `If ${p.b}ˣ = ${p.b ** p.n}, find x.`, { s: 'simple' }],
    [2, (p) => `Solve ${p.b}^(x − ${p.c}) = ${p.b ** p.n}.`, { s: 'shift' }],
    [2, (p) => `If ${p.b}^(${p.k}x) = ${p.b ** p.n}, then x is:`, { s: 'kx' }],
    [2, (p) => `For what value of y does ${p.b}ʸ = 1/${p.b ** p.n}?`, { s: 'recip' }],
    [2, (p) => `If 2ˣ = ${2 ** p.m} and 3ʸ = ${3 ** p.n}, what is x + y?`, { s: 'pair' }],
    [3, (p) => `Find x if ${p.b}^(x + ${p.p}) = ${p.b * p.b}^(x − ${p.q}).`, { s: 'cross' }],
    [2, (p) => `The equation 8ˣ = 2^(x + ${p.p}) is satisfied when x equals:`, { s: 'eight' }],
    [2, (p) => `If 10ˣ = ${num(Number((10 ** -p.n).toFixed(p.n)))}, x equals:`, { s: 'decimal' }],
    [2, (p) => `Given that ${p.b}ⁿ = ${p.b ** p.n}, what is ${p.b}ⁿ⁻¹?`, { s: 'prev' }],
    [1, (p) => `If ${p.b}ᵃ = 1, what is the value of a?`, { s: 'zero' }],
    [3, (p) => `If ${p.b}^(2x − 1) = ${p.b ** p.n}, what is the value of ${p.c}ˣ?`, { s: 'two' }],
  ],
})

// Pair-distractor helper for monic factorisations: pairs with the right product or the right sum.
function pairCands(a, b, r) {
  const P = a * b; const S = a + b; const out = []
  for (let u = -20; u <= 20; u++) for (let v = u; v <= 20; v++) {
    if (u === 0 || v === 0) continue
    if (u !== v && (u * v === P || u + v === S) && !(Math.min(a, b) === u && Math.max(a, b) === v)) out.push([u, v])
  }
  return r.shuffle(out)
}
const pairText = (u, v, x = 'x') => `${lin(1, u, x)}${lin(1, v, x)}`

family('ga.algebra.power-of-monomial', 'ga.algebra', {
  gen: (r, x) => ({ c: r.int(2, 5), c2: r.int(2, 6), m: r.int(2, 4), m2: r.int(1, 3), n: r.int(2, 3), k: r.int(2, 6), a: r.int(2, 5), b: r.int(2, 5) }),
  key: (p) => ({ pow: [p.c, p.m, p.n], neg: [p.c], ab: [p.c, p.m, p.n], mul: [p.c, p.m, p.c2, p.m2], div: [p.k, p.c, p.m, p.m2, p.n], nest: [p.m, p.n], sq: [p.c, p.m, p.n], cube: [p.c, p.m], divneg: [p.k, p.c, p.m, p.m2], xy: [p.a, p.b] })[p.s].join('-') + `-${p.s}`,
  solve: (P) => {
    const { c, c2, m, m2, n, k, a, b } = P
    switch (P.s) {
      case 'pow': return { ans: mono(c ** n, [['x', m * n]]), wrong: [mono(c * n, [['x', m * n]]), mono(c ** n, [['x', m + n]]), mono(c, [['x', m * n]])], expl: `Raise the coefficient and multiply the indices: ${c}${sup(n)} = ${c ** n} and ${m} × ${n} = ${m * n}, giving ${mono(c ** n, [['x', m * n]])}.` }
      case 'neg': return { ans: mono(-(c ** 3), [['y', 3]]), wrong: [mono(-3 * c, [['y', 3]]), mono(-c, [['y', 3]]), mono(-(c ** 3), [['y', 1]])], expl: `(−${c})³ = −${c ** 3} (an odd power keeps the minus sign) and y³ stays, so the result is −${c ** 3}y³.` }
      case 'ab': { const ans = mono(c ** n, [['a', m * n], ['b', n]]); return { ans, wrong: [mono(c * n, [['a', m * n], ['b', n]]), mono(c ** n, [['a', m + n], ['b', n]]), mono(c ** n, [['a', m * n], ['b', 1]])], expl: `Each factor is raised to the power ${n}: ${c}${sup(n)} = ${c ** n}, (a${sup(m)})${sup(n)} = a${sup(m * n)}, b${sup(n)}; so ${ans}.` } }
      case 'mul': { if (m2 === m && c === c2) return null; const ans = mono(c * c2, [['x', m + m2]]); return { ans, wrong: [mono(c + c2, [['x', m + m2]]), mono(c * c2, [['x', m * m2]]), mono(c + c2, [['x', m * m2]])], expl: `Multiply the coefficients (${c} × ${c2} = ${c * c2}) and add the indices (${m} + ${m2} = ${m + m2}).` } }
      case 'div': { const M = m + 2; const ans = mono(k, [['x', M - m2], ['y', n]]); return { ans, wrong: [mono(k, [['x', M + m2], ['y', n + 2]]), mono(k * c - c, [['x', M - m2], ['y', n]]), mono(k, [['x', M - m2], ['y', n + 1]])], expl: `${k * c} ÷ ${c} = ${k}; x${sup(M)} ÷ x${sup(m2)} = x${sup(M - m2)}; y${sup(n + 1)} ÷ y = y${sup(n)}. Result: ${ans}.` } }
      case 'nest': { const e = m * n + 1; return { ans: `x${sup(e)}`, wrong: [m + n + 1, m * n, m + n, m * n + 2].filter((v) => v !== e).map((v) => `x${sup(v)}`), expl: `(x${sup(m)})${sup(n)} = x${sup(m * n)}; multiplying by x adds 1 to the index: x${sup(e)}.` } }
      case 'sq': { const ans = mono(c * c, [['p', 2 * m], ['q', 2 * n]]); return { ans, wrong: [mono(2 * c, [['p', 2 * m], ['q', 2 * n]]), mono(c * c, [['p', m + 2], ['q', n + 2]]), mono(c, [['p', 2 * m], ['q', 2 * n]])], expl: `Squaring doubles every index and squares the coefficient: ${c}² = ${c * c}, giving ${ans}.` } }
      case 'cube': { const ans = mono(c ** 3, [['x', 3 * m]]); return { ans, wrong: [mono(3 * c, [['x', 3 * m]]), mono(c ** 3, [['x', m + 3]]), mono(3 * c, [['x', m + 3]])], expl: `(${c}x${sup(m)})³ = ${c}³ × x${sup(3 * m)} = ${ans}.` } }
      case 'divneg': { const B = m2 + m + 1; const e = B - m2; const t = (co, ex) => (ex === 1 ? `${co}/m` : `${co}/m${sup(ex)}`); const ans = t(k, e); return { ans, wrong: [mono(k, [['m', e]]), t(k, B + m2), t(k * c - c, e)], expl: `${k * c} ÷ ${c} = ${k} and m${sup(m2)} ÷ m${sup(B)} = m${sup(-e)} = 1/m${sup(e)}, so the result is ${ans}.` } }
      default: { if (a === b) return null; const ans = mono(1, [['x', 2 * a - 2], ['y', 2 * b - 2]]); return { ans, wrong: [mono(1, [['x', 2 * a], ['y', 2 * b]]), mono(1, [['x', a - 1], ['y', b - 1]]), mono(1, [['x', 2 * a - 1], ['y', 2 * b - 1]])], expl: `The numerator is x${sup(2 * a)}y${sup(2 * b)} and the denominator x²y²; subtracting indices gives ${ans}.` } }
    }
  },
  items: [
    [1, (p) => `Simplify (${p.c}x${sup(p.m)})${sup(p.n)}.`, { s: 'pow' }],
    [1, (p) => `(−${p.c}y)³ equals:`, { s: 'neg' }],
    [1, (p) => `What is (${p.c}a${sup(p.m)}b)${sup(p.n)} in its simplest form?`, { s: 'ab' }],
    [1, (p) => `The expression ${mono(p.c, [['x', p.m]])} × ${mono(p.c2, [['x', p.m2]])} simplifies to:`, { s: 'mul' }],
    [2, (p) => `Divide ${mono(p.k * p.c, [['x', p.m + 2], ['y', p.n + 1]])} by ${mono(p.c, [['x', p.m2], ['y', 1]])}.`, { s: 'div' }],
    [1, (p) => `Write (x${sup(p.m)})${sup(p.n)} × x as a single power of x.`, { s: 'nest' }],
    [1, (p) => `What is the square of ${mono(p.c, [['p', p.m], ['q', p.n]])}?`, { s: 'sq' }],
    [1, (p) => `If ${mono(p.c, [['x', p.m]])} is cubed, the result is:`, { s: 'cube' }],
    [2, (p) => `Simplify ${mono(p.k * p.c, [['m', p.m2]])} ÷ ${mono(p.c, [['m', p.m2 + p.m + 1]])}.`, { s: 'divneg' }],
    [2, (p) => `(x${sup(p.a)}y${sup(p.b)})² ÷ (xy)² equals:`, { s: 'xy' }],
  ],
})

family('ga.algebra.fractional-index', 'ga.algebra', {
  gen: (r, x) => {
    switch (x.s) {
      case 'solve': { const [p, q] = r.pick([[2, 3], [3, 2], [3, 4], [4, 3], [2, 5]]); const t = r.int(2, p === 2 && q === 3 ? 9 : q >= 4 || p >= 4 ? 3 : 5); return { p, q, t } }
      case 'eval': case 'equal': case 'neg': { const [p, q] = r.pick([[2, 3], [3, 4], [3, 2], [2, 5], [3, 5], [4, 3]]); return { p, q, t: r.int(2, q >= 4 ? 3 : 5) } }
      case 'sum3': return { a: r.int(2, 9), b: r.int(2, 5), c: r.int(2, 3) }
      case 'diff': return { B: r.pick([64, 729]) }
      case 'nested': return { t: r.int(2, 6) }
      case 'cube': return { t: r.int(3, 12) }
      case 'rev': return { t: r.int(2, 6) }
      default: return { t: r.int(2, 9), dec: r.pick([2, 3]) }
    }
  },
  key: (p) => `${p.s}-${Object.entries(p).filter(([k]) => k !== 's').map(([, v]) => v).join('-')}`,
  solve: (P) => {
    const ints = (arr, ans) => arr.filter((v) => typeof v !== 'number' || (isInt(v) && v > 0 && v !== ans))
    switch (P.s) {
      case 'solve': { const { p, q, t } = P; const N = t ** p; const x = t ** q; if (x > 1500) return null; return { ans: x, wrong: ints([t, N, (N * q) / p, t ** (q - 1)], x), expl: `Raise both sides to the power ${q}/${p}: x = ${N}^(${q}/${p}) = ${t}${sup(q)} = ${x}.` } }
      case 'eval': case 'equal': { const { p, q, t } = P; const B = t ** q; if (B > 1000) return null; const ans = t ** p; return { ans, wrong: ints([(B * p) / q, t, t ** (p + 1), B], ans), expl: `${B} = ${t}${sup(q)}, so ${B}^(${p}/${q}) = ${t}${sup(p)} = ${ans}.` } }
      case 'neg': { const { p, q, t } = P; const B = t ** q; if (B > 1000) return null; return { ans: fr(1, t ** p), wrong: [t ** p, fr(1, t), fr(1, t ** (p + 1))], expl: `${B} = ${t}${sup(q)}, so ${B}^(−${p}/${q}) = 1/${t}${sup(p)} = ${fr(1, t ** p)}.` } }
      case 'sum3': { const { a, b, c } = P; const A = a * a; const B = b ** 3; const C = c ** 4; const ans = a + b + c; return { ans, wrong: ints([A / 2 + B / 3 + C / 4, a * b * c, ans + 1, ans - 1], ans), expl: `${A}^(1/2) = ${a}, ${B}^(1/3) = ${b} and ${C}^(1/4) = ${c}; the sum is ${ans}.` } }
      case 'diff': { const { B } = P; const s = Math.round(Math.sqrt(B)); const c = Math.round(Math.cbrt(B)); return { ans: s - c, wrong: [Math.round(B ** (1 / 6)), s + c, s], expl: `${B}^(1/2) = ${s} and ${B}^(1/3) = ${c}, so the difference is ${s - c}.` } }
      case 'nested': { const { t } = P; const B = t ** 4; return { ans: t, wrong: ints([t * t, B / 4, 2 * t], t), expl: `√${B} = ${t * t} and √${t * t} = ${t}.` } }
      case 'cube': { const { t } = P; const B = t ** 3; return { ans: t, wrong: ints([B / 3, t + 1, t - 1, t * t], t), expl: `${t} × ${t} × ${t} = ${B}, so the cube root of ${B} is ${t}.` } }
      case 'rev': { const { t } = P; const N = t ** 3; return { ans: t * t, wrong: ints([N, t, (2 * N) / 3, 2 * t * t], t * t), expl: `Raise both sides to the power 2/3: x = ${N}^(2/3) = ${t}² = ${t * t}.` } }
      default: { const { t } = P; return { ans: t / 10, wrong: [t / 100, t, t / 1000], expl: `${num((t * t) / 100)} = ${num(t / 10)} × ${num(t / 10)}, so its square root is ${num(t / 10)}.` } }
    }
  },
  items: [
    [2, (p) => `If x^(${p.p}/${p.q}) = ${p.t ** p.p}, find the value of x.`, { s: 'solve' }],
    [2, (p) => `Find ${p.t ** p.q}^(${p.p}/${p.q}).`, { s: 'eval' }],
    [2, (p) => `Which of these equals ${p.t ** p.q}^(${p.p}/${p.q})?`, { s: 'equal' }],
    [2, (p) => `What number is ${p.t ** p.q}^(−${p.p}/${p.q})?`, { s: 'neg' }],
    [2, (p) => `Find the sum ${p.a * p.a}^(1/2) + ${p.b ** 3}^(1/3) + ${p.c ** 4}^(1/4).`, { s: 'sum3' }],
    [2, (p) => `If a = ${p.B}, what is a^(1/2) − a^(1/3)?`, { s: 'diff' }],
    [1, (p) => `What is the square root of the square root of ${p.t ** 4}?`, { s: 'nested' }],
    [1, (p) => `The cube root of ${p.t ** 3} is:`, { s: 'cube' }],
    [2, (p) => `If ${p.t ** 3} = x^(3/2), then x is:`, { s: 'rev' }],
    [1, (p) => `The square root of ${num((p.t * p.t) / 100)} is:`, { s: 'dec' }],
  ],
})

family('ga.algebra.substitution', 'ga.algebra', {
  positive: false,
  gen: (r, x) => {
    const nz = (a, b) => { let v = 0; while (v === 0) v = r.int(a, b); return v }
    switch (x.s) {
      case 'quad': return { a: r.int(2, 5), b: nz(-6, 6), c: r.int(1, 9), v: r.pick([-3, -2, -1, 2, 3]) }
      case 'sqdiff': return { A: r.int(2, 9), B: r.int(-4, -1) }
      case 'prod': { const x0 = r.int(4, 12); return { x0, y0: r.int(2, x0 - 1) } }
      case 'pqr': return { p: r.int(2, 4), q: r.int(2, 5), rr: r.int(-3, -1) }
      case 'cubic': return { m: r.int(2, 6) }
      case 'motion': return { u: r.int(2, 20), acc: r.int(2, 6), t: r.int(2, 10) }
      case 'interest': return { P: 500 * r.int(2, 10), k: r.int(2, 10), t: r.int(2, 5) }
      case 'frac': { const k = r.pick([2, 3]); return { k, i: r.int(1, 4), j: r.int(1, 5) } }
      case 'ratio': return { k: r.int(2, 4), v: r.int(2, 5) }
      case 'group': return { sm: r.int(4, 15), m: r.int(2, 6), c: r.int(1, 9) }
      case 'scale': return { a: r.int(2, 5), v: r.int(2, 9), c: r.int(1, 9) }
      case 'root': { const rt = r.int(2, 6); const c = rt * r.int(1, 5); return { rt, c } }
      case 'perim': return { l: r.int(8, 20) + 0.5, b: r.int(3, 7) + 0.5 }
      default: { const a = r.int(1, 5); let b = r.int(2, 7); if (gcd(a, b) !== 1 || a === b) b = a + 1; return { a, b, c: r.int(1, 4), d: r.int(1, 4) } }
    }
  },
  key: (p) => `${p.s}-${Object.entries(p).filter(([k]) => k !== 's').map(([, v]) => v).join('-')}`,
  solve: (P) => {
    switch (P.s) {
      case 'quad': { const { a, b, c, v } = P; const ans = a * v * v + b * v + c; return { ans, wrong: [-a * v * v + b * v + c, 2 * a * v + b * v + c, a * v * v - b * v + c], expl: `${a}(${num(v)})² ${b < 0 ? '−' : '+'} ${Math.abs(b)}(${num(v)}) + ${c} = ${a * v * v} ${b * v < 0 ? '−' : '+'} ${Math.abs(b * v)} + ${c} = ${num(ans)}.` } }
      case 'sqdiff': { const { A, B } = P; const ans = (A - B) ** 2; return { ans, wrong: [(A + B) ** 2, A * A + B * B, A * A - 2 * A * B - B * B], expl: `a² − 2ab + b² = (a − b)² = (${A} − (${num(B)}))² = ${A - B}² = ${ans}.` } }
      case 'prod': { const { x0, y0 } = P; return { ans: x0 * x0, wrong: [x0 * x0 - y0 * y0, x0 * x0 + 2 * y0 * y0, x0 * x0 - 2 * y0 * y0], expl: `(x + y)(x − y) + y² = x² − y² + y² = x² = ${x0}² = ${x0 * x0}.` } }
      case 'pqr': { const { p, q, rr } = P; const ans = p * p * q - q * rr * rr + p * rr; return { ans, wrong: [p * p * q + q * rr * rr + p * rr, p * p * q - q * rr * rr - p * rr, 2 * p * q - q * rr * rr + p * rr], expl: `p²q = ${p * p * q}, qr² = ${q * rr * rr}, pr = ${num(p * rr)}; so ${p * p * q} − ${q * rr * rr} ${p * rr < 0 ? '−' : '+'} ${Math.abs(p * rr)} = ${num(ans)}.` } }
      case 'cubic': { const { m } = P; const ans = m ** 3 - 3 * m; return { ans, wrong: [m ** 3 - 3, m ** 3 + 3 * m, m ** 3 - 3 * m * m], expl: `${m}³ − 3 × ${m} = ${m ** 3} − ${3 * m} = ${ans}.` } }
      case 'motion': { const { u, acc, t } = P; const ans = u + acc * t; return { ans, wrong: [(u + acc) * t, u * acc * t, u + acc + t], expl: `v = ${u} + ${acc} × ${t} = ${u} + ${acc * t} = ${ans}.` } }
      case 'interest': { const { P: Pr, k, t } = P; const I = (Pr * k * t) / 100; return { ans: Pr + I, wrong: [I, Pr * t + I, Pr + I / t], expl: `rt = ${num(k / 100)} × ${t} = ${num((k * t) / 100)}; A = ${Pr} × ${num(1 + (k * t) / 100)} = ${Pr + I}.` } }
      case 'frac': { const { k, i, j } = P; const a = k * k * i; const b = k * j; const ans = i + j; return { ans, wrong: [a / k + b / k, (2 * a) / k + b / k, (a + b) / (k * k), i * j + 1].filter((v) => isInt(v)), expl: `x² = 1/${k * k}, so ${a}x² = ${i} and ${b}x = ${j}; the total is ${ans}.` } }
      case 'ratio': { const { k, v } = P; const x0 = k * v; const ans = x0 * x0 - x0 * v + v * v; return { ans, wrong: [x0 * x0 + x0 * v + v * v, (x0 - v) ** 2, x0 * x0 - v * v], expl: `x = ${k} × ${v} = ${x0}; x² − xy + y² = ${x0 * x0} − ${x0 * v} + ${v * v} = ${ans}.` } }
      case 'group': { const { sm: s, m, c } = P; const ans = m * s - c; return { ans, wrong: [m * s + c, m * s, m * (s - c)], expl: `${m}a + ${m}b − ${c} = ${m}(a + b) − ${c} = ${m} × ${s} − ${c} = ${ans}.` } }
      case 'scale': { const { a, v, c } = P; const ans = 3 * v + c; return { ans, wrong: [3 * v, 3 * v - c, v + c], expl: `${3 * a}x − 3y = 3(${a}x − y) = 3 × ${v} = ${3 * v}; adding ${c} gives ${ans}.` } }
      case 'root': { const { rt, c } = P; const k = (rt * rt + c) / rt; if (!isInt(k)) return null; return { ans: k, wrong: [(rt * rt - c) / rt, rt + c, rt * rt + c].filter((v) => isInt(v) && v !== 0), expl: `Substitute x = ${rt}: ${rt * rt} − ${rt}k + ${c} = 0, so ${rt}k = ${rt * rt + c} and k = ${k}.` } }
      case 'perim': { const { l, b } = P; const ans = 2 * (l + b); return { ans, wrong: [l + b, 2 * l + b, l + 2 * b], expl: `P = 2(${num(l)} + ${num(b)}) = 2 × ${num(l + b)} = ${num(ans)} cm.` } }
      default: {
        const { a, b, c, d } = P; const nu = c * a + d * b; const de = c * a - d * b
        if (de === 0) return null
        const alt = c * b - d * a
        return { ans: fr(nu, de), wrong: [fr(de, nu), alt !== 0 ? fr(c * b + d * a, alt) : null, fr(nu + de, de), fr(c + d, c - d || 1)].filter((t) => t && t !== fr(nu, de)), expl: `Take x = ${a} and y = ${b} (only the ratio matters): (${c * a} + ${d * b}) ÷ (${c * a} − ${d * b}) = ${nu} ÷ ${pn(de)} = ${fr(nu, de)}.` }
      }
    }
  },
  fmt: (v, p) => (p.s === 'perim' ? `${num(v)} cm` : typeof v === 'string' ? v : num(v)),
  items: [
    [1, (p) => `Find the value of ${poly([p.a, p.b, p.c])} when x = ${num(p.v)}.`, { s: 'quad' }],
    [1, (p) => `If a = ${p.A} and b = ${num(p.B)}, what is a² − 2ab + b²?`, { s: 'sqdiff' }],
    [2, (p) => `Evaluate (x + y)(x − y) + y² for x = ${p.x0} and y = ${p.y0}.`, { s: 'prod' }],
    [2, (p) => `When p = ${p.p}, q = ${p.q} and r = ${num(p.rr)}, the value of p²q − qr² + pr is:`, { s: 'pqr' }],
    [1, (p) => `If m = ${p.m}, find m³ − 3m.`, { s: 'cubic' }],
    [1, (p) => `The formula v = u + at gives the final speed of a body. Find v when u = ${p.u}, a = ${p.acc} and t = ${p.t}.`, { s: 'motion' }],
    [3, (p) => `Using A = P(1 + rt), find A when P = ${p.P}, r = ${num(p.k / 100)} and t = ${p.t}.`, { s: 'interest' }],
    [1, (p) => `If x = 1/${p.k}, what is ${p.k * p.k * p.i}x² + ${p.k * p.j}x?`, { s: 'frac' }],
    [2, (p) => `If x = ${p.k}y and y = ${p.v}, what is x² − xy + y²?`, { s: 'ratio' }],
    [1, (p) => `Given a + b = ${p.sm}, find the value of ${p.m}a + ${p.m}b − ${p.c}.`, { s: 'group' }],
    [2, (p) => `If ${p.a}x − y = ${p.v}, what is the value of ${3 * p.a}x − 3y + ${p.c}?`, { s: 'scale' }],
    [2, (p) => `If x = ${p.rt} is a root of x² − kx + ${p.c} = 0, find k.`, { s: 'root' }],
    [1, (p) => `The perimeter of a rectangle is given by P = 2(l + b). Find P when l = ${num(p.l)} cm and b = ${num(p.b)} cm.`, { s: 'perim' }],
    [3, (p) => `If x/y = ${p.a}/${p.b}, find the value of (${p.c === 1 ? '' : p.c}x + ${p.d === 1 ? '' : p.d}y)/(${p.c === 1 ? '' : p.c}x − ${p.d === 1 ? '' : p.d}y).`, { s: 'xy' }],
  ],
})

family('ga.algebra.complete-square', 'ga.algebra', {
  positive: false,
  gen: (r) => { const h = r.int(1, 6); return { h, c: r.int(1, 30), k: r.int(1, 30) } },
  key: (p) => `${p.m}-${p.h}-${['sq', 'half'].includes(p.m) ? 0 : p.m === 'eq' ? p.k : p.c}`,
  solve: (P) => {
    const { h, c, k, m } = P
    const H = h * h
    switch (m) {
      case 'a': return { ans: h, wrong: [2 * h, H, h + 2].filter((v) => v !== h), expl: `x² + ${2 * h}x = (x + ${h})² − ${H}, so a is half the coefficient of x: a = ${h}.` }
      case 'b': return { ans: c - H, wrong: [c + H, c - 2 * h, c - h], expl: `x² + ${2 * h}x + ${c} = (x + ${h})² − ${H} + ${c}, so q = ${num(c - H)}.` }
      case 'min': return { ans: c - H, wrong: [c, c + H, c - 2 * h], expl: `x² − ${2 * h}x + ${c} = (x − ${h})² + ${num(c - H)}; the square is never negative, so the least value is ${num(c - H)}.` }
      case 'xmin': return { ans: h, wrong: [2 * h, H, c - H], expl: `x² − ${2 * h}x + ${c} = (x − ${h})² + ${num(c - H)}, which is smallest when x − ${h} = 0, i.e. x = ${h}.` }
      case 'k': return { ans: c - H, wrong: [c + H, c - 2 * h, H - c, c - h], expl: `(x − ${h})² = x² − ${2 * h}x + ${H}; to reach ${c} we need k = ${c} − ${H} = ${num(c - H)}.` }
      case 'sq': return { ans: lin(1, h), wrong: [lin(1, 2 * h), lin(1, H), lin(2, h), lin(1, H + 1)], expl: `(x + ${h})² = x² + ${2 * h}x + ${H}.` }
      case 'max': return { ans: c + H, wrong: [c, c - H, c + 2 * h], expl: `${c} + ${2 * h}x − x² = ${c + H} − (x − ${h})²; the greatest value, at x = ${h}, is ${c + H}.` }
      case 'half': return { ans: H, wrong: [2 * h, h, 4 * H], expl: `(x + ${h})² = x² + ${2 * h}x + ${H}, so x² + ${2 * h}x = (x + ${h})² − ${H}; m = ${H}.` }
      case 'vertex': return { ans: c - H, wrong: [c, c + H, h], expl: `y = (x − ${h})² + ${num(c - H)}, so the lowest point is (${h}, ${num(c - H)}) and q = ${num(c - H)}.` }
      default: return { ans: k + H, wrong: [k, k - H, k + 2 * h], expl: `Adding ${H} to both sides: x² + ${2 * h}x + ${H} = ${k} + ${H}, i.e. (x + ${h})² = ${k + H}.` }
    }
  },
  items: [
    [2, (p) => `When y = x² + ${2 * p.h}x − ${p.c} is written as (x + a)² + b, a is:`, { m: 'a' }],
    [2, (p) => `Writing x² + ${2 * p.h}x + ${p.c} in the form (x + p)² + q, the value of q is:`, { m: 'b' }],
    [3, (p) => `What is the least value of x² − ${2 * p.h}x + ${p.c}?`, { m: 'min' }],
    [3, (p) => `For what value of x is x² − ${2 * p.h}x + ${p.c} smallest?`, { m: 'xmin' }],
    [2, (p) => `If x² − ${2 * p.h}x + ${p.c} = (x − ${p.h})² + k, find k.`, { m: 'k' }],
    [1, (p) => `x² + ${2 * p.h}x + ${p.h * p.h} is the square of:`, { m: 'sq' }],
    [3, (p) => `What is the greatest value of ${p.c} + ${2 * p.h}x − x²?`, { m: 'max' }],
    [2, (p) => `The expression x² + ${2 * p.h}x can be rewritten as (x + ${p.h})² − m. What is m?`, { m: 'half' }],
    [3, (p) => `The graph of y = x² − ${2 * p.h}x + ${p.c} has its lowest point at (p, q). What is q?`, { m: 'vertex' }],
    [2, (p) => `By completing the square, x² + ${2 * p.h}x = ${p.k} can be written as (x + ${p.h})² = m. Find m.`, { m: 'eq' }],
  ],
})

family('ga.algebra.factorise-quadratic', 'ga.algebra', {
  gen: (r, x) => {
    const pos = () => { const a = r.int(1, 9); let b = r.int(1, 9); if (b === a) b = a === 9 ? 8 : a + 1; return [a, b] }
    const [a, b] = pos()
    return { a, b, k: r.int(2, 5), mm: r.pick([2, 3, 5]) }
  },
  key: (p) => `${p.m}-${p.a}-${p.b}${['common'].includes(p.m) ? `-${p.k}` : ''}${['nonmonic', 'nmmixed'].includes(p.m) ? `-${p.mm}` : ''}`,
  solve: (P, r) => {
    const { a, b, k, mm, m } = P
    const expl2 = (target, fac) => `${fac} expands to ${target}.`
    if (m === 'mono' || m === 'resolve' || m === 'mixed' || m === 'written') {
      // mono/resolve: (x + a)(x + b) or (x − a)(x − b); mixed: (x + max)(x − min); written: (x − max)(x + min)
      let u, v
      if (m === 'mono') [u, v] = [a, b]
      else if (m === 'resolve') [u, v] = [-a, -b]
      else if (m === 'mixed') [u, v] = [Math.max(a, b), -Math.min(a, b)]
      else [u, v] = [-Math.max(a, b), Math.min(a, b)]
      const A = pmul([1, u], [1, v])
      const rr = makeRng(`fq-${m}-${u}-${v}`)
      const ord = (x1, x2) => (Math.abs(x1) <= Math.abs(x2) ? [x1, x2] : [x2, x1])
      const ans = pairText(...ord(u, v))
      const wrong = pairCands(u, v, rr).map(([s1, s2]) => pairText(...ord(s1, s2)))
      return { ans, wrong, expl: `We need two numbers with product ${num(u * v)} and sum ${num(u + v)}: ${num(u)} and ${num(v)}. So ${poly(A)} = ${ans}.`, poly: poly(A) }
    }
    if (m === 'factor') {
      const A = pmul([1, -a], [1, -b])
      const cands = [a + b, a * b, a + 1, b + 1, Math.abs(a - b)].filter((c) => c > 0 && evalPoly(A, c) !== 0)
      return { ans: lin(1, -a), wrong: [...new Set(cands)].map((c) => lin(1, -c)), expl: `${poly(A)} = (x − ${a})(x − ${b}); substituting x = ${a} gives 0, so (x − ${a}) is a factor.` }
    }
    if (m === 'common') {
      const A = pmul([1, a], [1, b]).map((c) => c * k)
      const rr = makeRng(`fqc-${a}-${b}-${k}`)
      const other = pairCands(a, b, rr).find(([s1, s2]) => s1 > 0 && s2 > 0)
      const ans = `${k}${pairText(Math.min(a, b), Math.max(a, b))}`
      const w = [`(${k}x + ${Math.min(a, b)})(x + ${Math.max(a, b)})`, `${pairText(Math.min(a, b), Math.max(a, b))}`]
      if (other) w.push(`${k}${pairText(other[0], other[1])}`)
      return { ans, wrong: w, expl: `Take out ${k}: ${poly(A)} = ${k}(${poly([1, a + b, a * b])}) = ${ans}.` }
    }
    if (m === 'nonmonic' || m === 'nmmixed') {
      if (gcd(a, mm) !== 1 || gcd(b, mm) !== 1) return null
      const sgn = m === 'nonmonic' ? 1 : -1
      const target = pmul([mm, a], [1, sgn * b])
      const f = (c1, d1, c2, d2) => ({ t: `${lin(c1, d1)}${lin(c2, d2)}`, A: pmul([c1, d1], [c2, d2]) })
      const cands = sgn === 1
        ? [f(mm, b, 1, a), f(mm, a * b, 1, 1), f(mm, 1, 1, a * b), f(1, a, mm, b * mm)]
        : [f(mm, -b, 1, a), f(mm, b, 1, -a), f(mm, a * b, 1, -1), f(mm, -1, 1, a * b)]
      return { ans: `${lin(mm, a)}${lin(1, sgn * b)}`, wrong: cands.filter((c) => !peq(c.A, target)).map((c) => c.t), expl: `Check by expanding: ${lin(mm, a)}${lin(1, sgn * b)} = ${poly(target)}.`, poly: poly(target) }
    }
    if (m === 'other') {
      const [big, small] = [Math.max(a, b), Math.min(a, b)]
      const A = pmul([1, big], [1, -small])
      const cands = [-(big - small), -(big + small), -(big * small), big - small + big].filter((c) => c !== -small && evalPoly(A, -c) !== 0)
      return { ans: lin(1, -small), wrong: cands.map((c) => lin(1, c)), expl: `${poly(A)} = (x + ${big})(x − ${small}), since ${big} × (−${small}) = −${big * small} and ${big} − ${small} = ${big - small}.` }
    }
    if (m === 'findk') return { ans: a + b, wrong: [b, a * b, Math.abs(a - b), a * b + a], expl: `If (x + ${a}) is a factor, the other factor is (x + ${b}) because ${a} × ${b} = ${a * b}; so k = ${a} + ${b} = ${a + b}.` }
    if (m === 'quot') { const A = pmul([1, a], [1, b]); return { ans: lin(1, b), wrong: [lin(1, a), lin(1, a * b), lin(1, a + b)], expl: `${poly(A)} = (x + ${a})(x + ${b}), so dividing by (x + ${a}) leaves x + ${b}.` } }
    // twovar
    const rr = makeRng(`fq2-${a}-${b}`)
    const tv = (u, v) => `(a + ${u === 1 ? '' : u}b)(a + ${v === 1 ? '' : v}b)`
    const lo = Math.min(a, b); const hi = Math.max(a, b)
    const wrong = pairCands(a, b, rr).filter(([s1, s2]) => s1 > 0 && s2 > 0).map(([s1, s2]) => tv(s1, s2))
    return { ans: tv(lo, hi), wrong, expl: `We need numbers with product ${a * b} and sum ${a + b}: ${lo} and ${hi}. So the expression is ${tv(lo, hi)}.` }
  },
  items: [
    [1, (p) => `Factorise x² + ${p.a + p.b}x + ${p.a * p.b}.`, { m: 'mono' }],
    [1, (p) => `Which of the following is a factor of x² − ${p.a + p.b}x + ${p.a * p.b}?`, { m: 'factor' }],
    [2, (p) => `Factorise ${poly([1, Math.max(p.a, p.b) - Math.min(p.a, p.b), -p.a * p.b])}.`.replace('Factorise', 'Find the factors of'), { m: 'mixed' }],
    [3, (p) => `Factorise ${poly([p.k, p.k * (p.a + p.b), p.k * p.a * p.b])} completely.`, { m: 'common' }],
    [2, (p) => `The factors of ${poly(pmul([p.mm, p.a], [1, p.b]))} are:`, { m: 'nonmonic' }],
    [2, (p) => `One factor of ${poly(pmul([1, Math.max(p.a, p.b)], [1, -Math.min(p.a, p.b)]))} is (x + ${Math.max(p.a, p.b)}). The other factor is:`, { m: 'other' }],
    [1, (p) => `Resolve into factors: ${poly(pmul([1, -p.a], [1, -p.b]))}.`, { m: 'resolve' }],
    [2, (p) => `How can ${poly(pmul([1, -Math.max(p.a, p.b)], [1, Math.min(p.a, p.b)]))} be written as a product of two factors?`, { m: 'written' }],
    [2, (p) => `If (x + ${p.a}) is a factor of x² + kx + ${p.a * p.b}, find k.`, { m: 'findk' }],
    [2, (p) => `When ${poly(pmul([1, p.a], [1, p.b]))} is divided by x + ${p.a}, the quotient is:`, { m: 'quot' }],
    [2, (p) => `Factorise a² + ${p.a + p.b}ab + ${p.a * p.b}b².`, { m: 'twovar' }],
    [3, (p) => `Factorise ${poly(pmul([p.mm, p.a], [1, -p.b]))} into two linear factors.`, { m: 'nmmixed' }],
  ],
})

family('ga.algebra.factorise-special', 'ga.algebra', {
  gen: (r) => { const a = r.int(2, 5); let b = r.int(1, 9); if (gcd(a, b) !== 1) b = 1; return { a, b, k: r.int(2, 5), p: r.int(1, 6), q: r.int(1, 5), c: r.int(1, 3) } },
  key: (p) => `${p.m}-${({ dsq: [p.a, p.b], xsq: [p.b], common: [p.k, p.a, p.b], kdsq: [p.k, p.b], cube: [p.b], group: [p.p], perfect: [p.b], shift: [p.p, p.q], fourth: [p.c], one: [p.a] })[p.m].join('-')}`,
  solve: (P) => {
    const { a, b, k, p, q, c, m } = P
    const L = (A, B) => `(${poly([A, B])})`
    switch (m) {
      case 'dsq': { const f = (x) => a * a * x * x - b * b; return { ans: `${L(a, b)}${L(a, -b)}`, wrong: wrongFns(f, [{ t: `${L(a, -b)}²`, f: (x) => (a * x - b) ** 2 }, { t: `${L(a * a, b)}${L(1, -b)}`, f: (x) => (a * a * x + b) * (x - b) }, { t: `${a}${L(1, b)}${L(1, -b)}`, f: (x) => a * (x + b) * (x - b) }]), expl: `${a * a}x² − ${b * b} = (${a}x)² − ${b}², a difference of squares: (${a}x + ${b})(${a}x − ${b}).` } }
      case 'xsq': { const bb = b + 1; const f = (x) => x * x - bb * bb; return { ans: `${L(1, bb)}${L(1, -bb)}`, wrong: wrongFns(f, [{ t: `${L(1, -bb)}²`, f: (x) => (x - bb) ** 2 }, { t: `${L(1, -bb * bb)}${L(1, 1)}`, f: (x) => (x - bb * bb) * (x + 1) }, { t: `${L(1, bb)}${L(1, -bb * bb)}`, f: (x) => (x + bb) * (x - bb * bb) }]), expl: `x² − ${bb * bb} = x² − ${bb}² = (x + ${bb})(x − ${bb}).` } }
      case 'common': { if (a === b) return null; const f = (x) => k * a * x * x + k * b * x; return { ans: `${k}x${L(a, b)}`, wrong: wrongFns(f, [{ t: `${k}x${L(a, k * b)}`, f: (x) => k * x * (a * x + k * b) }, { t: `${k}${L(a, b)}`, f: (x) => k * (a * x + b) }, { t: `${k * a}x${L(1, b)}`, f: (x) => k * a * x * (x + b) }, { t: `x${L(k * a, b)}`, f: (x) => x * (k * a * x + b) }]), expl: `Both terms contain ${k}x: ${k * a}x² + ${k * b}x = ${k}x(${a}x + ${b}).` } }
      case 'kdsq': { const bb = b + 1; const f = (x) => k * x * x - k * bb * bb; return { ans: `${k}${L(1, bb)}${L(1, -bb)}`, wrong: wrongFns(f, [{ t: `${k}${L(1, -bb)}²`, f: (x) => k * (x - bb) ** 2 }, { t: `${L(k, bb)}${L(1, -bb)}`, f: (x) => (k * x + bb) * (x - bb) }, { t: `${k}${L(1, bb * bb)}${L(1, -1)}`, f: (x) => k * (x + bb * bb) * (x - 1) }]), expl: `Take out ${k}: ${k}(x² − ${bb * bb}) = ${k}(x + ${bb})(x − ${bb}).` } }
      case 'cube': { const bb = b + 1; const f = (x) => x ** 3 - bb * bb * x; return { ans: `x${L(1, bb)}${L(1, -bb)}`, wrong: wrongFns(f, [{ t: `x${L(1, -bb)}²`, f: (x) => x * (x - bb) ** 2 }, { t: `x²${L(1, -bb)}`, f: (x) => x * x * (x - bb) }, { t: `${L(1, bb)}${L(1, -bb)}`, f: (x) => (x + bb) * (x - bb) }]), expl: `x³ − ${bb * bb}x = x(x² − ${bb * bb}) = x(x + ${bb})(x − ${bb}).` } }
      case 'group': { const f = (A, B, X) => A * X + p * A + B * X + p * B; return { ans: `(a + b)(x + ${p})`, wrong: wrongFns(f, [{ t: `(a + ${p})(x + b)`, f: (A, B, X) => (A + p) * (X + B) }, { t: `(a + x)(b + ${p})`, f: (A, B, X) => (A + X) * (B + p) }, { t: `ab(x + ${p})`, f: (A, B, X) => A * B * (X + p) }], 3), expl: `Group the terms: a(x + ${p}) + b(x + ${p}) = (a + b)(x + ${p}).` } }
      case 'perfect': { const bb = b + 1; const f = (x) => (x - bb) ** 2; return { ans: `${L(1, -bb)}²`, wrong: wrongFns(f, [{ t: `${L(1, bb)}${L(1, -bb)}`, f: (x) => x * x - bb * bb }, { t: `${L(1, -bb * bb)}${L(1, -1)}`, f: (x) => (x - bb * bb) * (x - 1) }, { t: `${L(1, -2 * bb)}${L(1, bb)}`, f: (x) => (x - 2 * bb) * (x + bb) }]), expl: `x² − ${2 * bb}x + ${bb * bb} = x² − 2(${bb})x + ${bb}² = (x − ${bb})².` } }
      case 'shift': { const f = (x) => (x + p) ** 2 - q * q; if (p === q) return null; return { ans: `${L(1, p + q)}${L(1, p - q)}`, wrong: wrongFns(f, [{ t: `${L(1, p + q)}²`, f: (x) => (x + p + q) ** 2 }, { t: `${L(1, q)}${L(1, -q)}`, f: (x) => (x + q) * (x - q) }, { t: `${L(1, p * p + q)}${L(1, p - q)}`, f: (x) => (x + p * p + q) * (x + p - q) }]), expl: `Difference of squares with A = x + ${p} and B = ${q}: (A + B)(A − B) = (x + ${p + q})(x ${p - q < 0 ? '−' : '+'} ${Math.abs(p - q)}).` } }
      case 'fourth': { const c2 = c * c; const cs = c === 1 ? '' : c; const f = (x) => x ** 4 - c ** 4; return { ans: `(x² + ${c2})(x + ${c})(x − ${c})`, wrong: wrongFns(f, [{ t: `(x + ${c})²(x − ${c})²`, f: (x) => (x * x - c2) ** 2 }, { t: `(x − ${c})⁴`, f: (x) => (x - c) ** 4 }, { t: `(x² + ${c2})²`, f: (x) => (x * x + c2) ** 2 }, { t: `(x² + ${c2})(x − ${c})²`, f: (x) => (x * x + c2) * (x - c) ** 2 }]), expl: `x⁴ − ${c ** 4} = (x² + ${c2})(x² − ${c2}), and x² − ${c2} = (x + ${c})(x − ${c}).${cs ? '' : ''}` } }
      default: { const f = (y) => 1 - a * a * y * y; return { ans: `(1 + ${a}y)(1 − ${a}y)`, wrong: wrongFns(f, [{ t: `(1 − ${a}y)²`, f: (y) => (1 - a * y) ** 2 }, { t: `(1 − ${a * a}y)(1 + y)`, f: (y) => (1 - a * a * y) * (1 + y) }, { t: `(${a} − y)(${a} + y)`, f: (y) => (a - y) * (a + y) }]), expl: `1 − ${a * a}y² = 1² − (${a}y)² = (1 + ${a}y)(1 − ${a}y).` } }
    }
  },
  items: [
    [1, (p) => `Factorise ${p.a * p.a}x² − ${p.b * p.b}.`, { m: 'dsq' }],
    [1, (p) => `The factors of x² − ${(p.b + 1) ** 2} are:`, { m: 'xsq' }],
    [1, (p) => `Take out the common factor: ${p.k * p.a}x² + ${p.k * p.b}x.`, { m: 'common' }],
    [3, (p) => `Write ${p.k}x² − ${p.k * (p.b + 1) ** 2} as a product of three factors.`, { m: 'kdsq' }],
    [3, (p) => `x³ − ${(p.b + 1) ** 2}x factorises completely as:`, { m: 'cube' }],
    [1, (p) => `Factorise by grouping: ax + ${p.p}a + bx + ${p.p}b.`, { m: 'group' }],
    [2, (p) => `x² − ${2 * (p.b + 1)}x + ${(p.b + 1) ** 2} is equal to:`, { m: 'perfect' }],
    [2, (p) => `Factorise (x + ${p.p})² − ${p.q * p.q}.`, { m: 'shift' }],
    [3, (p) => `The complete factorisation of x⁴ − ${p.c ** 4} is:`, { m: 'fourth' }],
    [2, (p) => `Split 1 − ${p.a * p.a}y² into two factors.`, { m: 'one' }],
  ],
})

const addA = (A, B, s = 1) => A.map((v, i) => v + s * B[i])
const fracX = (N, D) => { const g = gcd(N, D); N /= g; D /= g; return `${N === 1 ? '' : N}x${D === 1 ? '' : `/${D}`}` }

family('ga.algebra.simplify-expression', 'ga.algebra', {
  positive: false,
  gen: (r) => {
    const nz = (a, b) => { let v = 0; while (v === 0) v = r.int(a, b); return v }
    return { a: r.int(2, 5), b: r.int(2, 5), c: r.int(1, 9), d: r.int(2, 5), e: r.int(1, 9), f: r.int(1, 9), m: r.int(2, 5), n: r.int(3, 7),
      E: [0, 1, 2].map(() => [nz(-4, 4), nz(-4, 4), nz(-4, 4)]) }
  },
  key: (p) => `${p.s}-${({ dist: [p.a, p.b, p.c, p.d, p.e], like: [p.a, p.b, p.c, p.d], add: [p.a, p.b, p.c, p.d, p.e, p.f], sub: [p.a, p.b, p.c, p.d, p.e, p.f], brk: [p.c, p.e], pq: [p.a, p.c, p.b, p.d], frac: [p.m, p.n], sum3: p.E.flat(), dist2: [p.a, p.b, p.c, p.d, p.e], prod: [p.c, p.e] })[p.s].join('-')}`,
  solve: (P) => {
    const { a, b, c, d, e, f, m, n, E } = P
    const opt = (ans, cands, show) => ({ ans: show(ans), wrong: cands.filter((C) => !peq(C, ans)).map(show) })
    switch (P.s) {
      case 'dist': { if (a * b === d) return null; const ans = [a * b - d, -a * c + d * e]; return { ...opt(ans, [[a * b - d, -a * c - d * e], [a * b + d, -a * c + d * e], [a * b - d, -a * c - e], [a * b - d, a * c + d * e]], (A) => poly(A)), expl: `${a}(${b}x − ${c}) = ${a * b}x − ${a * c} and −${d}(x − ${e}) = −${d}x + ${d * e}; together ${poly(ans)}.` } }
      case 'like': { if (a + 3 === c) return null; const show = (A) => lc([[A[0], 'x'], [A[1], 'y']]); const ans = [a + 3 - c, b + d]; return { ans: show(ans), wrong: [show([a + 3 + c, b + d]), show([a + 3 - c, b - d]), lc([[a + 3 - c + b + d, 'xy']])].filter((t) => t !== show(ans)), expl: `x-terms: ${a + 3} − ${c} = ${a + 3 - c}; y-terms: ${b} + ${d} = ${b + d}. Result: ${show(ans)}.` } }
      case 'add': { const A = [a, b, -c]; const B = [d, -e, f]; const ans = addA(A, B); return { ...opt(ans, [[a + d, b + e, f - c], [a + d, b - e, -c - f], [a - d, b + e, -c - f], addA(A, B, -1)], (X) => poly(X)), expl: `Add like terms: x²: ${a} + ${d} = ${a + d}; x: ${b} − ${e} = ${num(b - e)}; constants: −${c} + ${f} = ${num(f - c)}.` } }
      case 'sub': { const A = [a + d, b, -c]; const B = [d, -e, f]; const ans = addA(A, B, -1); return { ...opt(ans, [addA(B, A, -1), addA(A, B), [A[0] - B[0], A[1] + B[1], A[2] + B[2]], [A[0] - B[0], A[1] - B[1], A[2] + B[2]]], (X) => poly(X)), expl: `(${poly(A)}) − (${poly(B)}): change every sign of the second expression and add, giving ${poly(ans)}.` } }
      case 'brk': { const ans = [2, e - c]; return { ...opt(ans, [[2, c + e], [2, -c - e], [0, e - c], [1, e - c]], (X) => poly(X)), expl: `x − (${c} − x) + ${e} = x − ${c} + x + ${e} = ${poly(ans)}.` } }
      case 'pq': { const cc = c + 1; if (a === 2 * cc) return null; const ans = [a - 2 * cc, b + 2 * d]; return { ...opt(ans, [[a - 2 * cc, b - 2 * d], [a - cc, b + d], [a - 2 * cc, b + d]], (X) => poly(X)), expl: `2Q = ${2 * cc}x − ${2 * d}; P − 2Q = ${a}x + ${b} − ${2 * cc}x + ${2 * d} = ${poly(ans)}.` } }
      case 'frac': { if (m === n) return null; const N = m + n; const D = m * n; const val = N / D; const cands = [[2, m + n], [1, m + n], [1, m * n], [N, 2 * D]].filter(([x, y]) => !near(x / y, val)); return { ans: fracX(N, D), wrong: cands.map(([x, y]) => fracX(x, y)), expl: `LCD ${D}: x/${m} + x/${n} = ${n}x/${D} + ${m}x/${D} = ${fracX(N, D)}.` } }
      case 'sum3': { const show = (X) => lc([[X[0], 'a'], [X[1], 'b'], [X[2], 'c']]); const S = E.reduce((s, X) => addA(s, X), [0, 0, 0]); if (S.includes(0)) return null; return { ...opt(S, [addA(addA(E[0], E[1]), E[2], -1), addA(addA(E[0], E[1], -1), E[2]), addA(E[0], E[1])], show), expl: `Add the coefficients of a, b and c separately: ${show(S)}.` } }
      case 'dist2': { const cc = c + 1; const x = a + cc - e; if (x === 0) return null; const ans = [x, a * b - cc * d]; return { ...opt(ans, [[x, a * b + cc * d], [a + cc + e, a * b - cc * d], [x, b - d]], (X) => poly(X)), expl: `${a}x + ${a * b} + ${cc}x − ${cc * d} − ${e}x = ${poly(ans)}.` } }
      default: { const A = c; const B = e; const ans = poly([A + B, A * B]); return { ans, wrong: [poly([A + B, 0]), poly([A * B, A + B]), poly([2, A + B, A * B]), poly([A * B, 0])].filter((t) => t !== ans), expl: `(x + ${A})(x + ${B}) = x² + ${A + B}x + ${A * B}; subtracting x² leaves ${ans}.` } }
    }
  },
  items: [
    [1, (p) => `Simplify ${p.a}(${p.b}x − ${p.c}) − ${p.d}(x − ${p.e}).`, { s: 'dist' }],
    [1, (p) => `Collect like terms: ${p.a + 3}x + ${p.b}y − ${p.c}x + ${p.d}y.`, { s: 'like' }],
    [1, (p) => `Add ${poly([p.a, p.b, -p.c])} and ${poly([p.d, -p.e, p.f])}.`, { s: 'add' }],
    [2, (p) => `Subtract ${poly([p.d, -p.e, p.f])} from ${poly([p.a + p.d, p.b, -p.c])}.`, { s: 'sub' }],
    [1, (p) => `Remove the brackets and simplify: x − (${p.c} − x) + ${p.e}.`, { s: 'brk' }],
    [2, (p) => `If P = ${p.a}x + ${p.b} and Q = ${p.c + 1}x − ${p.d}, then P − 2Q equals:`, { s: 'pq' }],
    [2, (p) => `Simplify x/${p.m} + x/${p.n} into a single fraction.`, { s: 'frac' }],
    [1, (p) => `What is the sum of ${p.E.map((X) => lc([[X[0], 'a'], [X[1], 'b'], [X[2], 'c']])).slice(0, 2).join(', ')} and ${lc([[p.E[2][0], 'a'], [p.E[2][1], 'b'], [p.E[2][2], 'c']])}?`, { s: 'sum3' }],
    [1, (p) => `Open the brackets and collect terms: ${p.a}(x + ${p.b}) + ${p.c + 1}(x − ${p.d}) − ${p.e}x.`, { s: 'dist2' }],
    [2, (p) => `Expand and simplify (x + ${p.c})(x + ${p.e}) − x².`, { s: 'prod' }],
  ],
})

family('ga.algebra.polynomial-remainder', 'ga.algebra', {
  positive: false,
  gen: (r) => ({ a: r.int(1, 9), b: r.int(1, 12), c: r.int(1, 4), d: r.int(1, 5), k: r.int(-6, 6) }),
  key: (p) => `${p.s}-${p.a}-${p.b}-${p.c}${['fsum', 'gdiff'].includes(p.s) ? `-${p.d}` : ''}${['kfac', 'krem'].includes(p.s) ? `-${p.k}` : ''}`,
  solve: (P) => {
    const { a, b, c, d, k } = P
    switch (P.s) {
      case 'cubic': { const f = (x) => x ** 3 - a * x + b; return { ans: f(c), wrong: [f(-c), c ** 3 + a * c + b, b + c], expl: `By the remainder theorem the remainder is p(${c}) = ${c ** 3} − ${a * c} + ${b} = ${num(f(c))}.` } }
      case 'quadneg': { const f = (x) => 2 * x * x + a * x - b; return { ans: f(-c), wrong: [f(c), -b, 2 * c - a * c - b], expl: `The remainder is p(−${c}) = 2(${c * c}) − ${a * c} − ${b} = ${num(f(-c))}.` } }
      case 'eval': { const f = (x) => x * x - a * x + b; return { ans: f(c + 1), wrong: [(c + 1) ** 2 + a * (c + 1) + b, (c + 1) ** 2 - a * (c + 1) - b, 2 * (c + 1) - a * (c + 1) + b], expl: `p(${c + 1}) = ${(c + 1) ** 2} − ${a * (c + 1)} + ${b} = ${num(f(c + 1))}.` } }
      case 'kfac': { const B = c * c + k * c; if (k === 0 || B <= 0) return null; return { ans: k, wrong: [(B + c * c) / c, B - c * c, B / c, k + c].filter((v) => isInt(v) && v !== k), expl: `x = ${c} must make the expression zero: ${c * c} + ${c}k − ${B} = 0, so k = ${num(k)}.` } }
      case 'one': { const ans = 1 + a - b; return { ans, wrong: [-1 + a - b, a - b, 1 + a + b], expl: `The remainder is p(1) = 1 + ${a} − ${b} = ${num(ans)}.` } }
      case 'krem': { if (k === 0) return null; const R = c * c + k * c + b; return { ans: k, wrong: [(R - b + c * c) / c, R - b - c * c, (R + b - c * c) / c].filter((v) => isInt(v) && v !== k), expl: `The remainder is p(${c}) = ${c * c} + ${c}k + ${b} = ${R}, so ${c}k = ${num(R - b - c * c)} and k = ${num(k)}.` } }
      case 'fsum': { const A = a + 1; const f = (x) => A * x - b; return { ans: f(c) + f(d), wrong: [A * (c + d) - b, A * (c + d) + 2 * b, A * c + d - 2 * b], expl: `f(${c}) = ${num(f(c))} and f(${d}) = ${num(f(d))}; their sum is ${num(f(c) + f(d))}.` } }
      default: { const hi = c + d; const lo = d; return { ans: hi * hi - lo * lo, wrong: [(hi - lo) ** 2, hi * hi - lo * lo + 2 * a, hi * hi + lo * lo], expl: `g(${hi}) − g(${lo}) = (${hi * hi} + ${a}) − (${lo * lo} + ${a}) = ${hi * hi - lo * lo}; the constant cancels.` } }
    }
  },
  items: [
    [2, (p) => `Find the remainder when x³ − ${p.a}x + ${p.b} is divided by x − ${p.c}.`, { s: 'cubic' }],
    [2, (p) => `What is the remainder when 2x² + ${p.a}x − ${p.b} is divided by (x + ${p.c})?`, { s: 'quadneg' }],
    [1, (p) => `If p(x) = x² − ${p.a}x + ${p.b}, find p(${p.c + 1}).`, { s: 'eval' }],
    [3, (p) => `For what value of k is (x − ${p.c}) a factor of x² + kx − ${p.c * p.c + p.k * p.c}?`, { s: 'kfac' }],
    [2, (p) => `The polynomial x³ + ${p.a}x² − ${p.b} leaves what remainder on division by x − 1?`, { s: 'one' }],
    [3, (p) => `When x² + kx + ${p.b} is divided by (x − ${p.c}), the remainder is ${p.c * p.c + p.k * p.c + p.b}. Find k.`, { s: 'krem' }],
    [1, (p) => `If f(x) = ${p.a + 1}x − ${p.b}, what is f(${p.c}) + f(${p.d})?`, { s: 'fsum' }],
    [2, (p) => `Given g(x) = x² + ${p.a}, find g(${p.c + p.d}) − g(${p.d}).`, { s: 'gdiff' }],
  ],
})

family('ga.algebra.sum-product-to-cubes', 'ga.algebra', {
  gen: (r, x) => { const s = r.int(3, 9); return { s, pr: r.int(1, Math.floor((s * s) / 4)), k: r.int(2, 6), d: r.int(1, 6), a: r.int(1, 9) } },
  key: (p) => `${p.m}-${({ sum: [p.s, p.pr], words: [p.s, p.pr], alt: [p.s, p.pr], diff: [p.d, p.pr], rplus: [p.k], rminus: [p.k], coef: [p.k], ten: [p.a] })[p.m].join('-')}`,
  solve: (P) => {
    const { s, pr, k, d, a } = P
    switch (P.m) {
      case 'sum': case 'words': case 'alt': { const ans = s ** 3 - 3 * pr * s; return { ans, wrong: [s ** 3 - 3 * pr, s ** 3 - pr * s, s ** 3 + 3 * pr * s], expl: `a³ + b³ = (a + b)³ − 3ab(a + b) = ${s ** 3} − 3 × ${pr} × ${s} = ${ans}.` } }
      case 'diff': { const ans = d ** 3 + 3 * pr * d; return { ans, wrong: [d ** 3 - 3 * pr * d, d ** 3 + 3 * pr, d ** 3], expl: `x³ − y³ = (x − y)³ + 3xy(x − y) = ${d ** 3} + 3 × ${pr} × ${d} = ${ans}.` } }
      case 'rplus': { const ans = k ** 3 - 3 * k; return { ans, wrong: [k ** 3, k ** 3 + 3 * k, k ** 3 - 3], expl: `x³ + 1/x³ = (x + 1/x)³ − 3(x + 1/x) = ${k ** 3} − ${3 * k} = ${ans}.` } }
      case 'rminus': { const ans = k ** 3 + 3 * k; return { ans, wrong: [k ** 3, k ** 3 - 3 * k, k ** 3 + 3], expl: `x³ − 1/x³ = (x − 1/x)³ + 3(x − 1/x) = ${k ** 3} + ${3 * k} = ${ans}.` } }
      case 'coef': return { ans: 3 * k * k, wrong: [k * k, 3 * k, k ** 3], expl: `(a + ${k})³ = a³ + 3a²(${k}) + 3a(${k})² + ${k}³, so the coefficient of a is 3 × ${k * k} = ${3 * k * k}.` }
      default: { const b = 10 - a; if (a >= b) return null; return { ans: 1000, wrong: [100, a ** 3 + b ** 3, 3 * a * b * 10], expl: `This is a³ + b³ + 3ab(a + b) = (a + b)³ with a + b = ${a} + ${b} = 10, so the value is 10³ = 1000.` } }
    }
  },
  items: [
    [3, (p) => `If a + b = ${p.s} and ab = ${p.pr}, find a³ + b³.`, { m: 'sum' }],
    [3, (p) => `If x − y = ${p.d} and xy = ${p.pr}, then x³ − y³ is:`, { m: 'diff' }],
    [3, (p) => `If x + 1/x = ${p.k}, what is x³ + 1/x³?`, { m: 'rplus' }],
    [3, (p) => `Two numbers have a sum of ${p.s} and a product of ${p.pr}. What is the sum of their cubes?`, { m: 'words' }],
    [3, (p) => `Without solving for m and n, evaluate m³ + n³ given m + n = ${p.s} and mn = ${p.pr}.`, { m: 'alt' }],
    [3, (p) => `Given that y − 1/y = ${p.k}, find y³ − 1/y³.`, { m: 'rminus' }],
    [2, (p) => `In the expansion of (a + ${p.k})³, the coefficient of a is:`, { m: 'coef' }],
    [2, (p) => `Using an identity, find ${p.a}³ + ${10 - p.a}³ + 3 × ${p.a} × ${10 - p.a} × (${p.a} + ${10 - p.a}).`, { m: 'ten' }],
  ],
})

// ===========================================================================
// ga.equations — 140
// ===========================================================================
const okInt = (arr, ans) => arr.filter((v) => typeof v === 'number' && isInt(v) && v !== ans)
const keyOf = (p, skip = []) => `${p.s}-${Object.entries(p).filter(([k, v]) => k !== 's' && k !== 'nm' && k !== 'nm2' && !skip.includes(k) && typeof v !== 'object').map(([, v]) => v).join('-')}`

family('ga.equations.linear-one-variable', 'ga.equations', {
  positive: false,
  gen: (r, x) => {
    switch (x.s) {
      case 'both': { const a = r.int(3, 9); const c = r.int(1, a - 1); const x0 = r.int(1, 12); const b = r.int(-9, 9); return { a, c, x0, b, d: (a - c) * x0 + b } }
      case 'halves': { const [m, n] = r.pick([[2, 4], [2, 3], [3, 4], [3, 6], [4, 6], [2, 5], [4, 5]]); return { m, n, k: r.int(1, 6) } }
      case 'bracket': { const b = r.int(2, 5); const a = b + r.int(1, 3); return { a, b, c: r.int(1, 9) } }
      case 'cross': { const n = r.int(2, 5); const m = n + r.int(1, 3); return { m, n, p: r.int(1, 6), q: r.int(1, 6) } }
      case 'swap': { const a = r.int(1, 5); const c = a + r.int(2, 5); const x0 = r.int(1, 6); const b = r.int(1, 15); return { a, c, x0, b, d: b + (c - a) * x0 } }
      case 'expand': { const a = r.int(2, 4); const b = r.int(2, 4); const d = r.int(1, a * b - 1); return { a, b, c: r.int(1, 6), d, e: r.int(1, 6), x0: r.int(1, 8) } }
      case 'decimal': { const a = r.int(2, 9); const x0 = r.int(2, 12); const b = r.int(1, 19); return { a, x0, b, c: a * x0 + b } }
      case 'findk': { const a = r.int(3, 9); const c = r.int(1, a - 1); return { a, c, x0: r.int(1, 9), d: r.int(1, 30) } }
      case 'frac': { const b = r.pick([2, 3, 4, 5]); const a = r.int(2, 7); const x0 = b * r.int(1, 6); return { a, b, x0 } }
      case 'lcd': { for (;;) { const a = r.int(1, 3); const b = r.int(1, 5); const m = r.pick([2, 3, 5]); const n = r.pick([2, 3, 4]); const c = r.int(1, 6); const x0 = r.int(1, 20); if (m !== n && (a * x0 - b) % m === 0 && (x0 + c) % n === 0 && a * x0 - b > 0) return { a, b, m, n, c, x0, R: (a * x0 - b) / m + (x0 + c) / n } } }
      case 'other': { const a = r.int(2, 5); const x0 = r.int(1, 8); const b = r.int(1, 9); return { a, x0, b, R: a * x0 + b } }
      default: { const a = r.int(1, 4); const x0 = r.int(1, 7); const q = r.int(1, 9); const c = r.int(1, 9); return { a, x0, q, c, p: (a + 1) * x0 - q + c } } // minus-bracket
    }
  },
  key: (p) => keyOf(p),
  solve: (P) => {
    switch (P.s) {
      case 'both': { const { a, c, x0, b, d } = P; if (d === b) return null; return { ans: x0, wrong: okInt([(d + b) / (a - c), (d - b) / (a + c), -x0, x0 + 1], x0), expl: `${a}x − ${c}x = ${num(d)} − ${pn(b)}, so ${a - c}x = ${num(d - b)} and x = ${x0}.` } }
      case 'halves': { const { m, n, k } = P; const x0 = (k * m * n) / (n - m); if (!isInt(x0)) return null; return { ans: x0, wrong: okInt([k * (n - m), k * m * n, (k * m * n) / (n + m), 2 * x0], x0), expl: `x/${m} − x/${n} = ${n - m}x/${m * n} = ${k}, so x = ${k} × ${m * n}/${n - m} = ${x0}.` } }
      case 'bracket': { const { a, b, c } = P; const x0 = (b * c) / (a - b); if (!isInt(x0)) return null; return { ans: x0, wrong: okInt([(b * c) / (a + b), c, b * c, x0 + 1], x0), expl: `${a}x = ${b}x + ${b * c}, so ${a - b}x = ${b * c} and x = ${x0}.` } }
      case 'cross': { const { m, n, p, q } = P; const x0 = (n * p + m * q) / (m - n); if (!isInt(x0)) return null; return { ans: x0, wrong: okInt([(n * p - m * q) / (m - n), p + q, (n * p + m * q) / (m + n), x0 + 2], x0), expl: `Cross-multiplying: ${n}(x + ${p}) = ${m}(x − ${q}), so ${n}x + ${n * p} = ${m}x − ${m * q} and x = ${n * p + m * q}/${m - n} = ${x0}.` } }
      case 'swap': { const { a, c, x0, b, d } = P; return { ans: x0, wrong: okInt([(d + b) / (c - a), (d - b) / (c + a), (b + d) / (c + a), x0 + 1], x0), expl: `Move the y-terms together: ${c}y − ${a}y = ${d} − ${b}, so ${c - a}y = ${d - b} and y = ${x0}.` } }
      case 'expand': { const { a, b, c, d, e, x0 } = P; const R = a * (b * x0 - c) - d * (x0 - e); const cf = a * b - d; const wrongX = (R + a * c + d * e) / cf; return { ans: x0, wrong: okInt([wrongX, (R + a * c - d * e) / cf, (R - a * c + d * e) / cf, x0 + 1], x0), expl: `${a * b}x − ${a * c} − ${d}x + ${d * e} = ${R}, so ${cf}x = ${R + a * c - d * e} and x = ${x0}.`, R } }
      case 'decimal': { const { a, x0, b, c } = P; return { ans: x0, wrong: [(c + b) / a, x0 / 10, c - b].filter((v) => v !== x0), expl: `${num(a / 10)}x = ${num(c / 10)} − ${num(b / 10)} = ${num((c - b) / 10)}, so x = ${num((c - b) / 10)} ÷ ${num(a / 10)} = ${x0}.` } }
      case 'findk': { const { a, c, x0, d } = P; const k = d - (a - c) * x0; if (k === 0) return null; return { ans: k, wrong: okInt([d + (a - c) * x0, (a - c) * x0, d - a * x0, d].filter((v) => v !== 0), k), expl: `Put x = ${x0}: ${a * x0} + k = ${c * x0} + ${d}, so k = ${c * x0 + d} − ${a * x0} = ${num(k)}.` } }
      case 'frac': { const { a, b, x0 } = P; const c = (a * x0) / b; if (!isInt(c)) return null; return { ans: x0, wrong: okInt([(a * c) / b, c * b, c * a, c], x0), expl: `Multiply both sides by ${b}: ${a}x = ${c * b}, so x = ${x0}.` } }
      case 'lcd': { const { a, b, m, n, c, x0, R } = P; return { ans: x0, wrong: okInt([(R + n * b - m * c) / (n * a + m), x0 + 2, x0 - 2, 2 * x0].filter((v) => v > 0), x0), expl: `Multiply by ${m * n}: ${n}(${a === 1 ? '' : a}x − ${b}) + ${m}(x + ${c}) = ${R * m * n}; this gives ${n * a + m}x = ${R * m * n + n * b - m * c}, so x = ${x0}.` } }
      case 'other': { const { a, x0, b, R } = P; const ans = 2 * a * x0 - 1; return { ans, wrong: okInt([x0, 2 * R - 1, 2 * a * x0 + 1], ans), expl: `${a}x + ${b} = ${R} gives x = ${x0}; then ${2 * a}x − 1 = ${2 * a * x0} − 1 = ${ans}.` } }
      default: { const { a, x0, q, c, p } = P; if (p <= 0) return null; return { ans: x0, wrong: okInt([(p - q - c) / (a + 1), (p + q - c) / (a - 1 || 1), (p + q + c) / (a + 1)], x0), expl: `${p} − x + ${q} = ${a === 1 ? '' : a}x + ${c}, so ${p + q - c} = ${a + 1}x and x = ${x0}.` } }
    }
  },
  items: [
    [1, (p) => `Solve ${p.a}x ${sg(p.b).trim()} = ${p.c === 1 ? '' : p.c}x ${sg(p.d).trim()}.`.replace('x + 0', 'x'), { s: 'both' }],
    [1, (p) => `If x/${p.m} − x/${p.n} = ${p.k}, then x is:`, { s: 'halves' }],
    [1, (p) => `Find x if ${p.a}x = ${p.b}(x + ${p.c}).`, { s: 'bracket' }],
    [2, (p) => `Solve (x + ${p.p})/${p.m} = (x − ${p.q})/${p.n}.`, { s: 'cross' }],
    [1, (p) => `What value of y makes ${p.b} + ${p.c}y = ${p.d} + ${p.a === 1 ? '' : p.a}y true?`, { s: 'swap' }],
    [2, (p) => `The solution of ${p.a}(${p.b}x − ${p.c}) − ${p.d}(x − ${p.e}) = ${p.a * (p.b * p.x0 - p.c) - p.d * (p.x0 - p.e)} is:`, { s: 'expand' }],
    [1, (p) => `If ${num(p.a / 10)}x + ${num(p.b / 10)} = ${num(p.c / 10)}, the value of x is:`, { s: 'decimal' }],
    [2, (p) => `For what value of k does ${p.a}x + k = ${p.c === 1 ? '' : p.c}x + ${p.d} have the solution x = ${p.x0}?`, { s: 'findk' }],
    [1, (p) => `Find the number x for which ${p.a}x/${p.b} = ${(p.a * p.x0) / p.b}.`, { s: 'frac' }],
    [3, (p) => `Solve for x: (${p.a === 1 ? '' : p.a}x − ${p.b})/${p.m} + (x + ${p.c})/${p.n} = ${p.R}.`, { s: 'lcd' }],
    [2, (p) => `Given that ${p.a}x + ${p.b} = ${p.R}, what is the value of ${2 * p.a}x − 1?`, { s: 'other' }],
    [2, (p) => `Which value of x satisfies ${p.p} − (x − ${p.q}) = ${p.a === 1 ? '' : p.a}x + ${p.c}?`, { s: 'minus' }],
  ],
})

family('ga.equations.number-word-problem', 'ga.equations', {
  gen: (r, x) => ({ n: r.int(3, 30), a: r.int(2, 5), b: r.int(2, 20), c: r.int(2, 4), k: r.int(2, 5), nm: r.pick(NAMES), mn: r.pick([[3, 5], [2, 3], [3, 4], [4, 5], [2, 5], [4, 6]]), pq: r.pick([[3, 4], [2, 3], [2, 5], [3, 5], [1, 4], [1, 3]]) }),
  key: (p) => `${p.s}-${p.n}-${['treble', 'sub', 'think', 'div', 'twice'].includes(p.s) ? `${p.a}-${p.b}` : ''}${['half', 'split', 'excess', 'rest'].includes(p.s) ? p.k : ''}${p.s === 'fifth' ? p.mn.join('') : ''}${p.s === 'less' ? p.pq.join('') : ''}${p.s === 'div' ? p.c : ''}`,
  solve: (P) => {
    const { n, a, b, c, k } = P
    switch (P.s) {
      case 'treble': { const R = 3 * (a * n + b); return { ans: n, wrong: okInt([R / 3 - b, (R - b) / (3 * a), (R / 3 + b) / a, n + 1].filter((v) => v > 0), n), expl: `3(${a}n + ${b}) = ${R}, so ${a}n + ${b} = ${R / 3}, ${a}n = ${R / 3 - b} and n = ${n}.`, R } }
      case 'fifth': { const [m, q] = P.mn; const x0 = n * m * q; const d = x0 / m - x0 / q; return { ans: x0, wrong: okInt([d * (q - m), d * m * q, (d * m * q) / (q + m)], x0), expl: `x/${m} − x/${q} = ${q - m}x/${m * q} = ${d}, so x = ${d} × ${m * q}/${q - m} = ${x0}.`, d } }
      case 'sub': { const cc = a + 2; const d = cc * n - b - a * n; if (d <= 0) return null; return { ans: n, wrong: okInt([(d - b) / 2, (b + d) / (cc + a), b + d, n + 2].filter((v) => v > 0), n), expl: `${cc}n − ${b} = ${a}n + ${d}, so ${cc - a}n = ${b + d} and n = ${n}.`, d } }
      case 'think': { const mul = a + 2; const add = mul * n - b - n; if (add <= 0) return null; return { ans: n, wrong: okInt([(add - b) / (mul - 1), (add + b) / (mul + 1), (add + b) / mul, n + 1].filter((v) => v > 0), n), expl: `${mul}n − ${b} = n + ${add}, so ${mul - 1}n = ${add + b} and n = ${n}.`, add } }
      case 'half': { const x0 = n * k; const S = x0 + x0 / k; return { ans: x0, wrong: okInt([S / 2, S - S / k, S / (k + 1)].filter((v) => v > 0), x0), expl: `x + x/${k} = ${(k + 1)}x/${k} = ${S}, so x = ${S} × ${k}/${k + 1} = ${x0}.`, S } }
      case 'less': { const [p, q] = P.pq; const x0 = n * q; const d = x0 - (p * x0) / q; return { ans: x0, wrong: okInt([(d * q) / (q + p), d * p, (d * q) / p, d * q * p].filter((v) => v > 0), x0), expl: `x − ${p}x/${q} = ${q - p}x/${q} = ${d}, so x = ${d} × ${q}/${q - p} = ${x0}.`, d } }
      case 'plus': { const R = a * (n + b); return { ans: n, wrong: okInt([R / a + b, R - a * b + 0 * n, (R - b) / a].filter((v) => v > 0), n), expl: `${a}(n + ${b}) = ${R}, so n + ${b} = ${R / a} and n = ${n}.`, R } }
      case 'twice': { const R = 2 * n + b; return { ans: n, wrong: okInt([(R + b) / 2, R - b, R / 2].filter((v) => isInt(v)), n), expl: `2n + ${b} = ${R}, so 2n = ${R - b} and n = ${n}.`, R } }
      case 'split': { const S = n * (k + 1); return { ans: k * n, wrong: okInt([n, S / k, S - S / k, S / 2].filter((v) => isInt(v) && v > 0), k * n), expl: `If the smaller part is x, the larger is ${k}x and ${k + 1}x = ${S}, so x = ${n} and the larger part is ${k * n}.`, S } }
      case 'div': { const R = a * n - b; if (R <= 0 || R % c !== 0) return null; const Q = R / c; return { ans: n, wrong: okInt([(Q + b) / a, (Q * c - b) / a, Q * c + b, n + 2].filter((v) => v > 0), n), expl: `(${a}n − ${b}) ÷ ${c} = ${Q}, so ${a}n − ${b} = ${R}, ${a}n = ${R + b} and n = ${n}.`, Q } }
      case 'rest': { const S = n * (k + 1); return { ans: n, wrong: okInt([S / k, S / (k - 1), S - k, n + k].filter((v) => isInt(v) && v > 0), n), expl: `${S} − n = ${k}n, so ${k + 1}n = ${S} and n = ${n}.`, S } }
      default: { const lo = k; const hi = k + 1; const L = hi * n; return { ans: L, wrong: okInt([lo * n, L + n, hi * lo * n], L), expl: `Let the smaller be s, so the larger is s + ${n}: ${hi}s = ${lo}(s + ${n}) gives s = ${lo * n}, and the larger is ${lo * n} + ${n} = ${L}.` } }
    }
  },
  items: [
    [2, (p) => `A number is doubled and ${p.b} is added. If the result is trebled, it becomes ${3 * (2 * p.n + p.b)}. What is the number?`, { s: 'treble', a: 2 }],
    [2, (p) => `One-${['', '', 'half', 'third', 'quarter', 'fifth', 'sixth'][p.mn[0]]} of a number exceeds one-${['', '', 'half', 'third', 'quarter', 'fifth', 'sixth'][p.mn[1]]} of it by ${p.n * p.mn[1] - p.n * p.mn[0]}. The number is:`, { s: 'fifth' }],
    [2, (p) => `When ${p.b} is subtracted from ${['', '', '', '', 'four', 'five', 'six', 'seven'][p.a + 2]} times a number, the result is ${(p.a + 2) * p.n - p.b - p.a * p.n} more than ${['', '', 'twice', 'three times', 'four times', 'five times'][p.a]} the number. Find the number.`, { s: 'sub' }],
    [2, (p) => `${p.nm} thinks of a number, multiplies it by ${p.a + 2} and subtracts ${p.b}. The answer is the same as adding ${(p.a + 2) * p.n - p.b - p.n} to the original number. What was the number?`, { s: 'think' }],
    [2, (p) => `The sum of a number and its ${['', '', 'half', 'third', 'quarter', 'fifth'][p.k]} is ${p.n * p.k + p.n}. What is the number?`, { s: 'half' }],
    [2, (p) => `${['', 'One', 'Two', 'Three', 'Four'][p.pq[0]]}-${['', '', 'halves', 'thirds', 'quarters', 'fifths'][p.pq[1]].replace(/s$/, p.pq[0] === 1 ? '' : 's')} of a number is ${p.n * p.pq[1] - p.n * p.pq[0]} less than the number itself. What is the number?`, { s: 'less' }],
    [2, (p) => `If ${p.b} is added to a number and the sum is multiplied by ${p.a}, the answer is ${p.a * (p.n + p.b)}. Find the number.`, { s: 'plus' }],
    [1, (p) => `Twice a number increased by ${p.b} equals ${2 * p.n + p.b}. Find the number.`, { s: 'twice' }],
    [1, (p) => `Divide ${p.n * (p.k + 1)} into two parts so that one part is ${['', '', 'twice', 'three times', 'four times', 'five times'][p.k]} the other. The larger part is:`, { s: 'split' }],
    [3, (p) => `A number is multiplied by ${p.a} and then ${p.b} is subtracted. The result is divided by ${p.c}, giving ${(p.a * p.n - p.b) / p.c}. What is the number?`, { s: 'div' }],
    [3, (p) => `Two numbers differ by ${p.n}. ${['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][p.k + 1]} times the smaller equals ${['', '', 'two', 'three', 'four', 'five', 'six'][p.k]} times the larger. What is the larger number?`, { s: 'excess' }],
    [1, (p) => `If a number is subtracted from ${p.n * (p.k + 1)}, the result is ${['', '', 'twice', 'three times', 'four times', 'five times'][p.k]} the number. What is the number?`, { s: 'rest' }],
  ],
})

// ===========================================================================
// ENGINE — builds, verifies and writes the items
// ===========================================================================
const BAD_TEXT = /NaN|undefined|Infinity|null|\+ −|− −|\+ \+|\(\+|\b1x\b|\[object/
function defaultFmt(v, p) { return num(v) + (p.unit ? ` ${p.unit}` : '') }
function isBadValue(v) { return v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v)) }

function buildItems() {
  const out = []
  const report = { fallback: {}, failed: [] }
  const posR = makeRng('answer-positions')
  let posQueue = []
  const conceptSeen = new Set()
  const stemSeen = new Set()
  for (const fam of FAMILIES) {
    const r = makeRng(fam.id)
    const usedKeys = new Set()
    const short = fam.id.replace(/^ga\./, '').replace(/\./g, '-')
    fam.items.forEach(([difficulty, stemFn, extra0], idx) => {
      let made = null
      for (let attempt = 0; attempt < 4000 && !made; attempt++) {
        const allowFallback = attempt > 3000
        const extra = typeof extra0 === 'function' ? extra0(r) : { ...(extra0 ?? {}) }
        const p = { ...fam.gen(r, extra), ...extra }
        if (p.reject) continue
        const key = String(fam.key(p)).replace(/--/g, '-m').replace(/^-/, 'm')
        if (usedKeys.has(key)) continue
        const sol = fam.solve(p)
        if (!sol || isBadValue(sol.ans)) continue
        const fmt = sol.fmt ?? fam.fmt ?? defaultFmt
        const ansText = fmt(sol.ans, p)
        const seen = new Set([canonical(ansText)])
        const wrong = []
        for (const w of sol.wrong ?? []) {
          if (isBadValue(w)) continue
          if (typeof w === 'number' && typeof sol.ans === 'number' && near(w, sol.ans)) continue
          if (typeof w === 'number' && fam.positive !== false && w < 0 && typeof sol.ans === 'number' && sol.ans > 0) continue
          const t = fmt(w, p)
          if (BAD_TEXT.test(t) || seen.has(canonical(t))) continue
          seen.add(canonical(t)); wrong.push(t)
          if (wrong.length === 3) break
        }
        if (wrong.length < 3) {
          if (!allowFallback || typeof sol.ans !== 'number') continue
          for (const w of [sol.ans + 1, sol.ans + 2, sol.ans - 1, sol.ans * 2, sol.ans + 10]) {
            const t = fmt(w, p)
            if (wrong.length < 3 && !seen.has(canonical(t)) && w > 0) { seen.add(canonical(t)); wrong.push(t) }
          }
          if (wrong.length < 3) continue
          report.fallback[fam.id] = (report.fallback[fam.id] ?? 0) + 1; report.fallbackItems = [...(report.fallbackItems ?? []), `${fam.id}#${idx}`]
        }
        const stem = stemFn(p)
        if (BAD_TEXT.test(stem) || BAD_TEXT.test(ansText) || BAD_TEXT.test(sol.expl)) continue
        if (stemSeen.has(canonical(stem))) continue
        const concept = `${short}-${key}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        if (conceptSeen.has(canonical(concept))) continue
        usedKeys.add(key); conceptSeen.add(canonical(concept)); stemSeen.add(canonical(stem))
        if (!posQueue.length) posQueue = posR.shuffle([0, 1, 2, 3])
        const a = posQueue.pop()
        const opts = r.shuffle(wrong)
        opts.splice(a, 0, ansText)
        made = {
          section: 'General Abilities', subject: 'Quantitative Ability', subtopic: fam.subtopic, pattern_family: fam.id,
          concept, difficulty, source_type: 'generated-verified', past_paper_year: null, verified: true,
          q: stem, o: opts, a, explanation: sol.expl, source_url: null, time_sensitive: false, event_date: null,
          last_verified: TODAY, quality_grade: 'A', mpt_relevance: 'core',
        }
      }
      if (made) out.push(made)
      else report.failed.push(`${fam.id}#${idx}`)
    })
  }
  return { items: out, report }
}

function main() {
  const { items, report } = buildItems()
  items.forEach((it, i) => { it.id = `${PREFIX}${String(i + 1).padStart(4, '0')}` })
  const ordered = items.map(({ id, ...rest }) => ({ id, ...rest }))
  mkdirSync(OUT_DIR, { recursive: true })
  for (const f of readdirSync(OUT_DIR)) if (f.startsWith(FILE_PREFIX) && f.endsWith('.json')) unlinkSync(join(OUT_DIR, f))
  for (let i = 0; i * 100 < ordered.length; i++) {
    const file = join(OUT_DIR, `${FILE_PREFIX}${String(i + 1).padStart(2, '0')}.json`)
    writeFileSync(file, `${JSON.stringify(ordered.slice(i * 100, i * 100 + 100), null, 2)}\n`)
  }
  // Self-checks ------------------------------------------------------------
  const nameRe = new RegExp(`\\b(?:${NAMES.join('|')})\\b`, 'g')
  const masks = new Map()
  const dupMasks = []
  for (const it of ordered) {
    const m = surfaceTemplate(it.q.replace(nameRe, 'NAME'))
    if (masks.has(m)) dupMasks.push(`${it.id} ~ ${masks.get(m)}`)
    masks.set(m, it.id)
  }
  const bySub = {}; const byFam = {}; const diff = { 1: 0, 2: 0, 3: 0 }; const pos = [0, 0, 0, 0]
  for (const it of ordered) {
    const s = (bySub[it.subtopic] ??= { n: 0, 1: 0, 2: 0, 3: 0 }); s.n++; s[it.difficulty]++
    byFam[it.pattern_family] = (byFam[it.pattern_family] ?? 0) + 1
    diff[it.difficulty]++; pos[it.a]++
  }
  const maxFam = Object.entries(byFam).sort((x, y) => y[1] - x[1])[0]
  console.log(JSON.stringify({
    items: ordered.length, files: Math.ceil(ordered.length / 100), families: Object.keys(byFam).length,
    maxFamily: maxFam && { family: maxFam[0], n: maxFam[1], share: `${((100 * maxFam[1]) / ordered.length).toFixed(1)}%` },
    distinctMaskedTemplates: masks.size, duplicateMasks: dupMasks, difficulty: diff, answerPositions: pos, bySubtopic: bySub,
    fallbackDistractors: report.fallback, fallbackItems: report.fallbackItems ?? [], failed: report.failed,
  }, null, 2))
  if (dupMasks.length || report.failed.length) process.exitCode = 1
}
main()
