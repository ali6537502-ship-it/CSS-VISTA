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
    [2, (p) => `Add together ${p.B}⁰, ${p.B}^(1/3) and ${p.B}⁻¹. The total is:`, { s: 'cube3' }],
    [2, (p) => `Work out ${p.B}^(1/2) ÷ ${p.B}^(1/4).`, { s: 'quarter' }],
    [1, (p) => `The value of 10${sup(p.m)} × 10${sup(p.n)} is:`, { s: 'ten' }],
    [2, (p) => `Simplify (${p.b}ⁿ⁺${sup(p.k)} − ${p.b}ⁿ) ÷ ${p.b}ⁿ.`, { s: 'nfactor' }],
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
        const p = { ...extra, ...fam.gen(r, extra) }
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
          if (typeof w === 'number' && fam.positive !== false && w <= 0 && typeof sol.ans === 'number' && sol.ans > 0) continue
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
          report.fallback[fam.id] = (report.fallback[fam.id] ?? 0) + 1
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
    fallbackDistractors: report.fallback, failed: report.failed,
  }, null, 2))
  if (dupMasks.length || report.failed.length) process.exitCode = 1
}
main()
