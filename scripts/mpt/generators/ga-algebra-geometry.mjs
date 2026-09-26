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
const pl = (n, w, wp = `${w}s`) => `${n} ${n === 1 ? w : wp}`
const art = (n) => (/^8/.test(String(n)) || ['11', '18'].includes(String(n)) ? 'an' : 'a')
const cf = (c) => (c === 1 ? '' : c === -1 ? '−' : num(c))
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

const W_TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times']

family('ga.equations.consecutive-integers', 'ga.equations', {
  gen: (r) => ({ n: r.int(5, 60), k: r.pick([3, 4, 5, 6, 7, 8, 9, 11, 12]), nm: r.pick(NAMES) }),
  key: (p) => `${p.s}-${p.n}${['mult'].includes(p.s) ? `-${p.k}` : ''}`,
  solve: (P) => {
    const { n, k } = P
    switch (P.s) {
      case 'three': return { ans: n + 2, wrong: [n, n + 1, n + 3], expl: `n + (n + 1) + (n + 2) = 3n + 3 = ${3 * n + 3}, so n = ${n} and the largest is ${n + 2}.` }
      case 'even2': { const m = 2 * Math.floor(n / 2); return { ans: m, wrong: [m + 1, m + 2, m - 2], expl: `n + (n + 2) = ${2 * m + 2}, so 2n = ${2 * m} and the smaller number is ${m}.` } }
      case 'odd4': { if (n % 2 === 0) return null; return { ans: n, wrong: [n + 2, n + 3, n - 2], expl: `n + (n + 2) + (n + 4) + (n + 6) = 4n + 12 = ${4 * n + 12}, so n = ${n}.` } }
      case 'mult': { const t = Math.floor(n / 4) + 1; return { ans: k * (t + 2), wrong: [k * (t + 1), k * t, k * (t + 3)], expl: `The middle multiple is ${3 * k * (t + 1)} ÷ 3 = ${k * (t + 1)}, so the three are ${k * t}, ${k * (t + 1)} and ${k * (t + 2)}.` } }
      case 'prod': { const m = Math.floor(n / 3) + 4; return { ans: 2 * m + 1, wrong: [m + 1, 2 * m - 1, 2 * m + 3], expl: `${m} × ${m + 1} = ${m * (m + 1)}, so the integers are ${m} and ${m + 1}; their sum is ${2 * m + 1}.` } }
      case 'five': return { ans: n - 2, wrong: [n, n - 1, n + 2], expl: `The middle integer is ${5 * n} ÷ 5 = ${n}, so the smallest is ${n} − 2 = ${n - 2}.` }
      case 'twice': { const kk = 2 * Math.floor(n / 2) + 8; return { ans: kk - 2, wrong: [kk - 6, kk - 4, kk], expl: `n + (n + 2) + (n + 4) = 2n + ${kk}, so n = ${kk - 6}; the largest is ${kk - 6} + 4 = ${kk - 2}.` } }
      case 'house': { const m = 2 * Math.floor(n / 2) + 1; return { ans: m + 2, wrong: [m, m + 1, m + 4], expl: `n + (n + 2) = ${2 * m + 2}, so n = ${m} and the larger number is ${m + 2}.` } }
      case 'pages': { const m = n * 3 + 10; return { ans: m + 1, wrong: [m, m + 2, m - 1], expl: `Facing pages are consecutive: n + (n + 1) = ${2 * m + 1}, so n = ${m} and the larger is ${m + 1}.` } }
      default: return { ans: n + 3, wrong: [n + 2, n + 4, n], expl: `2n = (n + 2) + ${n}, so n = ${n + 2} and the middle integer is ${n + 3}.` }
    }
  },
  items: [
    [1, (p) => `The sum of three consecutive integers is ${3 * p.n + 3}. What is the largest of them?`, { s: 'three' }],
    [1, (p) => `Two consecutive even numbers add up to ${4 * Math.floor(p.n / 2) + 2}. The smaller number is:`, { s: 'even2' }],
    [2, (p) => `The sum of four consecutive odd numbers is ${4 * p.n + 12}. What is the smallest of them?`, { s: 'odd4' }],
    [2, (p) => { const t = Math.floor(p.n / 4) + 1; return `Three consecutive multiples of ${p.k} add up to ${3 * p.k * (t + 1)}. What is the largest of them?` }, { s: 'mult' }],
    [2, (p) => { const m = Math.floor(p.n / 3) + 4; return `The product of two consecutive positive integers is ${m * (m + 1)}. What is their sum?` }, { s: 'prod' }],
    [2, (p) => `The sum of five consecutive integers is ${5 * p.n}. What is the smallest of them?`, { s: 'five' }],
    [3, (p) => `The sum of three consecutive even numbers is ${2 * Math.floor(p.n / 2) + 8} more than twice the smallest of them. What is the largest of the three?`, { s: 'twice' }],
    [1, (p) => `${p.nm}'s house number and the next-door number are consecutive odd numbers whose sum is ${2 * (2 * Math.floor(p.n / 2) + 1) + 2}. What is the larger number?`, { s: 'house' }],
    [1, (p) => `A book lies open at two facing pages whose numbers add up to ${2 * (p.n * 3 + 10) + 1}. What is the larger page number?`, { s: 'pages' }],
    [2, (p) => `Of three consecutive integers, twice the smallest exceeds the largest by ${p.n}. What is the middle integer?`, { s: 'exceed' }],
  ],
})

family('ga.equations.consecutive-squares', 'ga.equations', {
  gen: (r) => ({ n: r.int(3, 14), off: r.int(3, 15) }),
  key: (p) => `${p.s}-${p.n}`,
  fact: (p) => `${p.n}`,
  solve: (P) => {
    const { n } = P
    const T = n * n + (n + 1) ** 2
    const cm = (v) => `${v} cm`
    switch (P.s) {
      case 'less': return { ans: n + 1, wrong: [n, n + 2, n - 1], expl: `n² + (n + 1)² = ${T} gives 2n² + 2n − ${T - 1} = 0, i.e. n² + n − ${(T - 1) / 2} = 0 = (n − ${n})(n + ${n + 1}); so the numbers are ${n} and ${n + 1}.` }
      case 'small': return { ans: n, wrong: [n + 1, n - 1, n + 2], expl: `${n}² + ${n + 1}² = ${n * n} + ${(n + 1) ** 2} = ${T}, so the smaller integer is ${n}.` }
      case 'odd': { if (n % 2 === 0) return null; return { ans: n + 2, wrong: [n, n + 4, n + 1], expl: `${n}² + ${n + 2}² = ${n * n} + ${(n + 2) ** 2} = ${n * n + (n + 2) ** 2}, so the larger is ${n + 2}.` } }
      case 'evendiff': { const m = 2 * n; return { ans: m + 2, wrong: [m, m + 1, m + 4], expl: `(x + 2)² − x² = 4x + 4 = ${4 * m + 4}, so x = ${m} and the larger number is ${m + 2}.` } }
      case 'diffsum': return { ans: 2 * n + 1, wrong: [n, n + 1, 2 * n - 1], expl: `(n + 1)² − n² = 2n + 1 = n + (n + 1), so the sum equals the difference, ${2 * n + 1}.` }
      case 'oddprod': { if (n % 2 === 0) return null; return { ans: n, wrong: [n + 2, n - 2, n + 4], expl: `${n} × ${n + 2} = ${n * (n + 2)}, so the smaller number is ${n}.` } }
      case 'tiles': return { ans: n + 1, wrong: [n, n + 2, n - 1], fmt: cm, expl: `s² + (s + 1)² = ${T} gives s = ${n} (${n * n} + ${(n + 1) ** 2} = ${T}), so the larger tile has side ${n + 1} cm.` }
      default: return { ans: n + 1, wrong: [n, n + 2, n + 3], expl: `${n}² + ${n + 1}² = ${n * n} + ${(n + 1) ** 2} = ${T}, so the next integer is ${n + 1}.` }
    }
  },
  items: [
    [3, (p) => `Find two consecutive positive numbers such that the sum of their squares is ${p.off} less than ${p.n * p.n + (p.n + 1) ** 2 + p.off}. The larger number is:`, { s: 'less' }],
    [3, (p) => `The squares of two consecutive positive integers add up to ${p.n * p.n + (p.n + 1) ** 2}. What is the smaller integer?`, { s: 'small' }],
    [3, (p) => `Two consecutive odd positive integers have squares that total ${p.n * p.n + (p.n + 2) ** 2}. The larger integer is:`, { s: 'odd' }],
    [2, (p) => `The squares of two consecutive even numbers differ by ${8 * p.n + 4}. What is the larger number?`, { s: 'evendiff' }],
    [2, (p) => `The squares of two consecutive integers differ by ${2 * p.n + 1}. What do the two integers add up to?`, { s: 'diffsum' }],
    [2, (p) => `The product of two consecutive odd positive numbers is ${p.n * (p.n + 2)}. The smaller number is:`, { s: 'oddprod' }],
    [3, (p) => `Two square tiles have sides that differ by 1 cm, and their areas add up to ${p.n * p.n + (p.n + 1) ** 2} cm². What is the side of the larger tile?`, { s: 'tiles' }],
    [3, (p) => `A positive integer is squared and added to the square of the next integer, giving ${p.n * p.n + (p.n + 1) ** 2}. What is the next integer?`, { s: 'next' }],
  ],
})

family('ga.equations.quadratic-word-problem', 'ga.equations', {
  gen: (r) => ({ n: r.int(3, 12), A: r.int(2, 3), B: r.int(1, 6), k: r.int(2, 7), d: r.int(2, 6) }),
  key: (p) => `${p.s}-${p.n}${p.s === 'gen' ? `-${p.A}-${p.B}` : ''}${['exceed', 'five'].includes(p.s) ? `-${p.k}` : ''}${p.s === 'prod' ? `-${p.d}` : ''}`,
  solve: (P) => {
    const { n, A, B, k, d } = P
    const base = [n + 1, n - 1, n + 2].filter((v) => v > 0)
    switch (P.s) {
      case 'gen': { const C = A * n * n - B * n; if (C <= 0) return null; const other = B / A - n; if (other > 0 && isInt(other)) return null; return { ans: n, wrong: base, expl: `${A}n² − ${B}n = ${C}. Trying n = ${n}: ${A * n * n} − ${B * n} = ${C}. The other root, ${fr(B - A * n, A)}, is not a positive integer.` } }
      case 'sq20': return { ans: n, wrong: base, expl: `n² − n = ${n * n - n} gives (n − ${n})(n + ${n - 1}) = 0; the positive value is ${n}.` }
      case 'exceed': { const C = n * n - k * n; if (C <= 0) return null; return { ans: n, wrong: [...base, n - k], expl: `n² − ${k}n = ${C} gives (n − ${n})(n + ${n - k}) = 0; the positive value is ${n}.` } }
      case 'plus': return { ans: n, wrong: [n + 1, n - 1, n + 2], expl: `n² + n = ${n * n + n} gives (n − ${n})(n + ${n + 1}) = 0, so n = ${n}.` }
      case 'five': return { ans: n, wrong: [n + k, n - 1, n + 1], expl: `n² + ${k}n = ${n * n + k * n} gives (n − ${n})(n + ${n + k}) = 0, so n = ${n}.` }
      case 'prod': return { ans: n, wrong: [n + d, n - 1, n + 1], expl: `n(n + ${d}) = ${n * (n + d)} gives (n − ${n})(n + ${n + d}) = 0, so the smaller number is ${n}.` }
      case 'half': { if (n % 2 !== 0 || n < 4) return null; const C = (n * n) / 2 - n; return { ans: n, wrong: [n + 2, n - 2, C], expl: `n²/2 − n = ${C} gives n² − 2n − ${2 * C} = 0 = (n − ${n})(n + ${n - 2}); so n = ${n}.` } }
      default: return { ans: n, wrong: [n + 1, n - 1, n * n + 1], expl: `n + 1/n = ${fr(n * n + 1, n)} is satisfied by n = ${n} (the other solution, 1/${n}, is not an integer).` }
    }
  },
  items: [
    [3, (p) => `Find a positive integer such that ${['', 'the number', 'twice the number', 'three times the number', 'four times the number', 'five times the number', 'six times the number'][p.B]} subtracted from ${p.A === 2 ? 'two' : 'three'} times its square gives ${p.A * p.n * p.n - p.B * p.n}.`, { s: 'gen' }],
    [3, (p) => `A positive number is ${p.n * p.n - p.n} less than its square. The number is:`, { s: 'sq20' }],
    [3, (p) => `The square of a positive number exceeds ${p.k} times the number by ${p.n * p.n - p.k * p.n}. What is the number?`, { s: 'exceed' }],
    [3, (p) => `When a positive number is added to its square, the result is ${p.n * p.n + p.n}. What is the number?`, { s: 'plus' }],
    [3, (p) => `A positive integer squared, plus ${p.k} times the integer, equals ${p.n * p.n + p.k * p.n}. Find the integer.`, { s: 'five' }],
    [2, (p) => `The product of a positive number and the number that is ${p.d} more than it is ${p.n * (p.n + p.d)}. What is the smaller number?`, { s: 'prod' }],
    [3, (p) => `Half the square of a positive even number is ${(p.n * p.n) / 2 - p.n} more than the number. What is the number?`, { s: 'half' }],
    [3, (p) => `A positive integer added to its reciprocal gives ${fr(p.n * p.n + 1, p.n)}. What is the integer?`, { s: 'recip' }],
  ],
})

family('ga.equations.ages', 'ga.equations', {
  gen: (r) => ({ s0: r.int(4, 20), t: r.int(2, 15), k: r.int(2, 5), m: r.int(2, 3), A: r.int(20, 60), pp: r.int(2, 9), nm: r.pick(NAMES.filter((x, i) => i % 2 === 0)), nm2: r.pick(NAMES) }),
  key: (p) => keyOf(p, ['A', 'pp', 'm', 's0', 't', 'k']) + `-${p.s0}-${p.t}-${p.k}-${p.m}-${p.A}-${p.pp}`,
  solve: (P) => {
    const { s0, t, k, m, A, pp } = P
    switch (P.s) {
      case 'son': case 'mother': { if (k <= m) return null; const s = (t * (m - 1)) / (k - m); if (!isInt(s) || s < 3 || s > 20) return null; P.sv = s; if (P.s === 'son') return { ans: s, wrong: [k * s, s + t, t], expl: `${k}s + ${t} = ${m}(s + ${t}) gives ${k - m}s = ${t * (m - 1)}, so s = ${s}.` }; return { ans: k * s, wrong: [s, k * s + t, (k - 1) * s], expl: `If the child is c, then ${k}c + ${t} = ${m}(c + ${t}), so c = ${s} and the mother is ${k * s}.` } }
      case 'ago': { const g = s0 + t; const b = k * s0 + t; P.bv = b; return { ans: g, wrong: [s0, Math.round(b / k), g + t].filter((v) => v !== g), expl: `${t} years ago he was ${b - t}, so his sister was ${b - t} ÷ ${k} = ${s0}; she is now ${s0} + ${t} = ${g}.` } }
      case 'sumdiff': { const S = 2 * s0 + 2 * pp; return { ans: s0, wrong: [s0 + 2 * pp, S / 2, S - 2 * pp], expl: `Younger = (${S} − ${2 * pp}) ÷ 2 = ${s0}.` } }
      case 'older': { const D = (k - 1) * (s0 + t); return { ans: s0, wrong: [s0 + t, D / k, D / (k - 1), D - t].filter((v) => isInt(v) && v > 0 && v !== s0), expl: `d + ${D} + ${t} = ${k}(d + ${t}) gives ${cf(k - 1)}d = ${D + t - k * t}, so d = ${s0}.` } }
      case 'combined': { if (s0 <= t) return null; const f = k * (s0 - t) + t; const S = f + s0; return { ans: s0, wrong: [f, s0 - t, S / (k + 1)].filter((v) => isInt(v) && v !== s0), expl: `If the son is s, the man is ${S} − s; then ${S} − s − ${t} = ${k}(s − ${t}), so ${k + 1}s = ${S - t + k * t} and s = ${s0}.` } }
      case 'future': { const cur = A - t; return { ans: cur - pp, wrong: [A - pp, cur, cur + pp], expl: `He is ${A} − ${t} = ${cur} now, so ${pp} years ago he was ${cur - pp}.` } }
      case 'double': { if (k > 3) return null; const x = (t * (k + 1)) / (k - 1); return { ans: x, wrong: [2 * t, t * (k + 1), t * k, x + t, t].filter((v) => v !== x), expl: `x + ${t} = ${k}(x − ${t}) gives ${k - 1}x = ${t * (k + 1)}, so x = ${x}.` } }
      case 'when': { const g = s0; const y = t; const G = k * (g + y) - y; if (G > 90) return null; return { ans: y, wrong: [G - k * g, (G - g) / k, y * 2].filter((v) => isInt(v) && v > 0 && v !== y), expl: `${G} + y = ${k}(${g} + y) gives ${k - 1}y = ${G - k * g}, so y = ${y}.`, G } }
      case 'siblings': { const a = pp; const b = t % 5 + 1; const S = 3 * s0 + 2 * a + b; return { ans: s0 + a + b, wrong: [s0, s0 + a, S / 3].filter((v) => isInt(v)), expl: `Youngest y: y + (y + ${a}) + (y + ${a + b}) = ${S}, so 3y = ${3 * s0} and y = ${s0}; the eldest is ${s0 + a + b}.` } }
      case 'fraction': { const q = 3 + (pp % 3); const pr = q - 1 - (t % 2); if (pr < 1 || gcd(pr, q) !== 1) return null; const u = s0 % 7 + 3; return { ans: pr * u, wrong: [q * u, (q - pr) * u, pr * (q - pr) * u, (2 * q - pr) * u].filter((v) => v !== pr * u), expl: `If the brother is b, then b − ${pr}b/${q} = ${(q - pr) * u}, so b = ${q * u} and the younger is ${pr}/${q} × ${q * u} = ${pr * u}.` } }
      default: { const S = s0 + 10; const y = t % 8 + 2; if (y >= S - 1) return null; const F = k * (S - y) + y; if (F > 75) return null; return { ans: y, wrong: [k * S - F, F - S, (F - S) / (k - 1)].filter((v) => isInt(v) && v > 0 && v !== y), expl: `${F} − y = ${k}(${S} − y) gives ${k - 1}y = ${k * S - F}, so y = ${y}.`, F, S } }
    }
  },
  items: [
    [2, (p) => `A father is ${W_TIMES[p.k]} as old as his son. In ${p.t} years he will be ${W_TIMES[p.m]} as old as the son. How old is the son now?`, { s: 'son' }],
    [2, (p) => `${p.nm2}'s mother is ${W_TIMES[p.k]} as old as ${p.nm2}. After ${p.t} years she will be only ${W_TIMES[p.m]} as old. What is the mother's present age?`, { s: 'mother' }],
    [2, (p) => `${p.t} years ago, ${p.nm} was ${W_TIMES[p.k]} as old as his sister. If ${p.nm} is ${p.k * p.s0 + p.t} now, how old is his sister now?`, { s: 'ago' }],
    [1, (p) => `The ages of two brothers add up to ${2 * p.s0 + 2 * p.pp} years, and the elder is ${2 * p.pp} years older. How old is the younger brother?`, { s: 'sumdiff' }],
    [2, (p) => `A mother is ${(p.k - 1) * (p.s0 + p.t)} years older than her daughter. In ${p.t} years, the mother will be ${W_TIMES[p.k]} as old as the daughter. What is the daughter's present age?`, { s: 'older' }],
    [3, (p) => `The combined age of a man and his son is ${p.k * (p.s0 - p.t) + p.t + p.s0} years. ${p.t} years ago the man was ${W_TIMES[p.k]} as old as the son. How old is the son now?`, { s: 'combined' }],
    [1, (p) => `In ${p.t} years ${p.nm2} will be ${p.A}. How old was ${p.nm2} ${p.pp} years ago?`, { s: 'future' }],
    [2, (p) => `${p.t} years from now, a woman will be ${W_TIMES[p.k]} as old as she was ${p.t} years ago. What is her present age?`, { s: 'double' }],
    [2, (p) => `A grandfather is ${p.k * (p.s0 + p.t) - p.t} and his grandson is ${p.s0}. After how many years will the grandfather be ${W_TIMES[p.k]} as old as the grandson?`, { s: 'when' }],
    [3, (p) => `The ages of three siblings add up to ${3 * p.s0 + 2 * p.pp + (p.t % 5 + 1)} years. The middle child is ${p.pp} years older than the youngest and ${p.t % 5 + 1} years younger than the eldest. How old is the eldest?`, { s: 'siblings' }],
    [2, (p) => { const q = 3 + (p.pp % 3); const pr = q - 1 - (p.t % 2); const u = p.s0 % 7 + 3; return `${p.nm}'s age is ${pr}/${q} of his brother's age, and the brother is ${(q - pr) * u} years older. How old is ${p.nm}?` }, { s: 'fraction' }],
    [2, (p) => { const S = p.s0 + 10; const y = p.t % 8 + 2; const F = p.k * (S - y) + y; return `How many years ago was a father, now ${F}, exactly ${W_TIMES[p.k]} as old as his son, who is now ${S}?` }, { s: 'agoFind' }],
  ],
})
// Ratio-of-ages helper: present ages A = p·x, B = q·x (optionally shifted), ratio after/before t years.
function ratioAt(A, B, t) { const a = A + t; const b = B + t; if (a <= 0 || b <= 0) return null; const g = gcd(a, b); return [a / g, b / g] }
const rs = (x, y) => `${x} : ${y}`

family('ga.equations.ages-ratio', 'ga.equations', {
  gen: (r) => { let p = r.int(2, 9); let q = r.int(1, 8); if (p === q) q = p - 1; if (gcd(p, q) !== 1) q = 1; return { p, q, x: r.int(2, 8), t: r.int(2, 12), t2: r.int(2, 10), nm: r.pick(NAMES.filter((x, i) => i % 2 === 0)), nm2: r.pick(NAMES) } },
  key: (P) => `${P.s}-${P.p}-${P.q}-${P.x}-${P.t}${P.s === 'pastfuture' ? `-${P.t2}` : ''}`,
  solve: (P) => {
    const { p, q, x, t, t2 } = P
    const A = p * x; const B = q * x
    const ok = (R) => R && !(R[0] === p && R[1] === q) && R[0] <= 25 && R[1] <= 25
    switch (P.s) {
      case 'future': case 'mother': case 'father': {
        const hi = P.s === 'father' ? [Math.min(p, q), Math.max(p, q)] : P.s === 'mother' ? [Math.max(p, q), Math.min(p, q)] : [p, q]
        const a0 = hi[0] * x; const b0 = hi[1] * x; const R = ratioAt(a0, b0, t)
        if (!ok(R) || (R[0] === hi[0] && R[1] === hi[1])) return null
        P.R = R; P.hi = hi
        const ask = P.s === 'mother' ? a0 : b0; const other = P.s === 'mother' ? b0 : a0
        return { ans: ask, wrong: [other, ask + t, hi[P.s === 'mother' ? 0 : 1] * t].filter((v) => v !== ask), expl: `Let the ages be ${hi[0]}x and ${hi[1]}x. Then (${hi[0]}x + ${t}) : (${hi[1]}x + ${t}) = ${rs(R[0], R[1])} gives x = ${x}, so the ages are ${a0} and ${b0}.` }
      }
      case 'pastfuture': { const a1 = A + t; const b1 = B + t; const R = ratioAt(a1, b1, t2); if (!ok(R)) return null; P.R = R; return { ans: b1, wrong: [a1, B, b1 + t2], expl: `${t} years ago the ages were ${p}x and ${q}x; now they are ${p}x + ${t} and ${q}x + ${t}. The future ratio gives x = ${x}, so the present ages are ${a1} and ${b1}.` } }
      case 'pastsum': { const R = ratioAt(A, B, -t); if (!ok(R)) return null; P.R = R; return { ans: A + B, wrong: [(p + q) * t, A + B - 2 * t, (R[0] + R[1]) * t].filter((v) => v !== A + B), expl: `Present ages ${p}x and ${q}x; (${p}x − ${t}) : (${q}x − ${t}) = ${rs(R[0], R[1])} gives x = ${x}, so the ages are ${A} and ${B}, totalling ${A + B}.` } }
      case 'after': {
        const R = ratioAt(A, B, t); if (!ok(R)) return null
        const cands = [[p, q], [p + t, q + t], [R[1], R[0]], [R[0] + 1, R[1] + 1]].filter(([u, v]) => !near(u / v, R[0] / R[1]))
        return { ans: rs(R[0], R[1]), wrong: cands.map(([u, v]) => rs(u, v)), expl: `The ages are ${A} and ${B}; after ${t} years they are ${A + t} and ${B + t}, i.e. ${rs(R[0], R[1])}.` }
      }
      case 'ago': { const R = ratioAt(A, B, -t); if (!ok(R)) return null; P.R = R; return { ans: A, wrong: [B, A - t, R[0] * t].filter((v) => v !== A), expl: `Now ${p}x and ${q}x; (${p}x − ${t}) : (${q}x − ${t}) = ${rs(R[0], R[1])} gives x = ${x}, so the age is ${A}.` } }
      default: { if (p <= q) return null; const D = (p - q) * x; return { ans: B + t, wrong: [B, A + t, B - t].filter((v) => v > 0), expl: `${p}x − ${q}x = ${D} gives x = ${x}; the student is ${B} now and will be ${B + t} after ${t} years.`, D } }
    }
  },
  items: [
    [3, (P) => `The ages of ${P.nm} and ${P.nm2} are in the ratio ${rs(P.p, P.q)}. After ${P.t} years the ratio will be ${rs(...P.R)}. What is ${P.nm2}'s present age?`, { s: 'future' }],
    [3, (P) => `${P.t} years ago, the ratio of the ages of ${P.nm} and ${P.nm2} was ${rs(P.p, P.q)}. ${P.t2} years from now it will be ${rs(...P.R)}. What is ${P.nm2}'s present age?`, { s: 'pastfuture' }],
    [3, (P) => `The present ages of a mother and her daughter are in the ratio ${rs(...P.hi)}. In ${P.t} years the ratio will be ${rs(...P.R)}. What is the mother's present age?`, { s: 'mother' }],
    [3, (P) => `The ratio of the present ages of two cousins is ${rs(P.p, P.q)}. ${P.t} years ago the ratio was ${rs(...P.R)}. What is the sum of their present ages?`, { s: 'pastsum' }],
    [3, (P) => `The ages of two sisters are in the ratio ${rs(P.p, P.q)} and together they are ${(P.p + P.q) * P.x} years old. What will be the ratio of their ages after ${P.t} years?`, { s: 'after' }],
    [3, (P) => `The ratio of ${P.nm}'s age to his father's age is ${rs(...P.hi)}. After ${P.t} years it will be ${rs(...P.R)}. How old is the father now?`, { s: 'father' }],
    [3, (P) => `${P.t} years ago, the ratio of ${P.nm}'s age to ${P.nm2}'s age was ${rs(...P.R)}. Now it is ${rs(P.p, P.q)}. How old is ${P.nm} now?`, { s: 'ago' }],
    [2, (P) => `The ages of a teacher and a student are in the ratio ${rs(P.p, P.q)}, and the teacher is ${(P.p - P.q) * P.x} years older. How old will the student be after ${P.t} years?`, { s: 'diff' }],
  ],
})

// Two-digit number problems: every answer is confirmed unique by brute force over 10..99.
function uniqueTwoDigit(pred) { const hits = []; for (let v = 10; v <= 99; v++) if (pred(Math.floor(v / 10), v % 10, v)) hits.push(v); return hits.length === 1 ? hits[0] : null }
family('ga.equations.two-digit-number', 'ga.equations', {
  gen: (r) => ({ t: r.int(1, 9), u: r.int(1, 9) }),
  key: (p) => `${p.s}-${p.t}${p.u}`,
  solve: (P) => {
    const { t, u } = P
    const N = 10 * t + u; const Rv = 10 * u + t
    const mk = (pred, expl, extra = []) => {
      const ans = uniqueTwoDigit(pred); if (ans !== N) return null
      const cands = [Rv, N + 9, N - 9, N + 11, N - 11, ...extra].filter((v) => v >= 10 && v <= 99 && v !== N && !pred(Math.floor(v / 10), v % 10, v))
      return { ans: N, wrong: cands, expl }
    }
    switch (P.s) {
      case 'rev': if (u <= t) return null; return mk((a, b) => a + b === t + u && (10 * b + a) - (10 * a + b) === 9 * (u - t), `t + u = ${t + u} and reversing adds 9(u − t) = ${9 * (u - t)}, so u − t = ${u - t}; hence t = ${t}, u = ${u} and the number is ${N}.`)
      case 'ktimes': { if (u <= t || N % (t + u) !== 0) return null; const k = N / (t + u); P.k = k; return mk((a, b, v) => v === k * (a + b) && b - a === u - t, `${N} = ${k} × (${t} + ${u}) and ${u} − ${t} = ${u - t}; no other two-digit number fits both conditions.`) }
      case 'twice': { if (u === 0 || t % u !== 0 || t / u < 2) return null; P.m = t / u; return mk((a, b, v) => a === P.m * b && v - (10 * b + a) === 9 * (t - u), `With t = ${P.m}u, reversing reduces the number by 9(t − u) = ${9 * (t - u)}, so t − u = ${t - u}; this gives u = ${u}, t = ${t}: ${N}.`) }
      case 'dec': if (t <= u) return null; return mk((a, b, v) => v - (10 * b + a) === 9 * (t - u) && a + b === t + u, `t − u = ${9 * (t - u)} ÷ 9 = ${t - u} and t + u = ${t + u}, so t = ${t}, u = ${u}: ${N}.`)
      case 'units': { if (u % t !== 0 || u / t < 2) return null; P.m = u / t; return mk((a, b) => b === P.m * a && a + b === t + u, `u = ${P.m}t and t + u = ${t + u} give ${P.m + 1}t = ${t + u}, so t = ${t}, u = ${u}: ${N}.`) }
      case 'sum11': return { ans: t + u, wrong: [11, 2 * (t + u), t + u + 1].filter((v) => v !== t + u), expl: `(10t + u) + (10u + t) = 11(t + u) = ${11 * (t + u)}, so t + u = ${t + u}.` }
      case 'diff9': { const d = Math.abs(t - u); if (d === 0) return null; return { ans: d, wrong: [9, d + 1, d - 1].filter((v) => v > 0 && v !== d), expl: `(10t + u) − (10u + t) = 9(t − u) = ${9 * d}, so the digits differ by ${d}.` } }
      default: { if (t <= u || N % (t + u) !== 0) return null; const k = N / (t + u); P.k = k; return mk((a, b, v) => v === k * (a + b) && b > 0 && v - 9 * (t - u) === 10 * b + a, `${N} = ${k} × ${t + u}, and ${N} − ${9 * (t - u)} = ${Rv}, which is ${N} reversed.`) }
    }
  },
  items: [
    [3, (p) => `The digits of a two-digit number add up to ${p.t + p.u}. When the digits are reversed, the number increases by ${9 * (p.u - p.t)}. Find the number.`, { s: 'rev' }],
    [3, (p) => `A two-digit number is ${p.k} times the sum of its digits, and its units digit is ${p.u - p.t} more than its tens digit. What is the number?`, { s: 'ktimes' }],
    [3, (p) => `In a two-digit number the tens digit is ${W_TIMES[p.m]} the units digit. Reversing the digits makes the number smaller by ${9 * (p.t - p.u)}. What is the number?`, { s: 'twice' }],
    [3, (p) => `A two-digit number is ${9 * (p.t - p.u)} more than the number formed by reversing its digits, and the sum of its digits is ${p.t + p.u}. What is the number?`, { s: 'dec' }],
    [2, (p) => `The units digit of a two-digit number is ${W_TIMES[p.m]} its tens digit, and the digits add up to ${p.t + p.u}. What is the number?`, { s: 'units' }],
    [2, (p) => `A two-digit number and the number formed by reversing its digits add up to ${11 * (p.t + p.u)}. What is the sum of the digits?`, { s: 'sum11' }],
    [2, (p) => `The difference between a two-digit number and the number with its digits reversed is ${9 * Math.abs(p.t - p.u)}. By how much do the two digits differ?`, { s: 'diff9' }],
    [3, (p) => `A two-digit number is ${p.k} times the sum of its digits. If ${9 * (p.t - p.u)} is subtracted from the number, the digits are reversed. Find the number.`, { s: 'seven' }],
  ],
})

family('ga.equations.simultaneous-linear', 'ga.equations', {
  positive: false,
  gen: (r) => ({ x0: r.int(1, 9), y0: r.int(1, 9), a: r.int(2, 5), b: r.int(1, 4), c: r.int(1, 4), k: r.int(2, 4), m: r.pick([2, 3, 4, 6]), n: r.pick([2, 3, 4, 6]), m1: r.int(1, 4), m2: r.int(-3, -1) }),
  key: (p) => `${p.s}-${p.x0}-${p.y0}-${p.a}-${p.b}-${p.c}-${p.k}-${p.m}-${p.n}-${p.m1}-${p.m2}`,
  fact: (p) => `${p.s}-${p.x0}-${p.y0}`,
  solve: (P) => {
    const { x0, y0, a, b, c, k, m, n, m1, m2 } = P
    switch (P.s) {
      case 'sd': if (x0 <= y0) return null; return { ans: x0, wrong: [y0, x0 + y0, x0 - y0], expl: `Adding the equations: 2x = ${2 * x0}, so x = ${x0}.` }
      case 'fy': if (x0 <= y0) return null; return { ans: y0, wrong: [x0, x0 + y0, y0 + 1], expl: `Adding: 3x = ${3 * x0}, so x = ${x0}; then y = ${2 * x0 + y0} − ${2 * x0} = ${y0}.` }
      case 'sum': return { ans: x0 + y0, wrong: [x0, y0, x0 * y0], expl: `Subtracting: ${a - 1}x = ${(a - 1) * x0}, so x = ${x0}; then ${b}y = ${b * y0}, y = ${y0}, and x + y = ${x0 + y0}.` }
      case 'xy': { const R1 = a * x0 - b * y0; const R2 = c * x0 + y0; P.R1 = R1; P.R2 = R2; return { ans: x0 * y0, wrong: [x0 + y0, x0 * (y0 + 1), (x0 + 1) * y0], expl: `From the second, y = ${R2} − ${c === 1 ? '' : c}x; substituting gives x = ${x0} and y = ${y0}, so xy = ${x0 * y0}.` } }
      case 'amb': if (x0 <= y0) return null; return { ans: x0 - y0, wrong: [x0 + y0, x0, y0], expl: `Doubling the second and adding to the first gives 5a = ${5 * x0}, so a = ${x0}, b = ${y0} and a − b = ${x0 - y0}.` }
      case 'twice': return { ans: k * x0, wrong: [x0, (k + 1) * x0, k + x0], expl: `x + ${k}x = ${(k + 1) * x0}, so x = ${x0} and y = ${k * x0}.` }
      case 'pq': { const R1 = a * x0 + b * y0; const R2 = a * x0 - b * y0; if (R2 <= 0) return null; return { ans: x0, wrong: [y0, (R1 + R2) / 2, x0 + y0].filter((v) => v !== x0), expl: `Adding: ${2 * a}p = ${R1 + R2}, so p = ${x0}.` } }
      case 'fr': { if (m === n) return null; const v = (x0 * m * n) / (m + n); const kk = x0; const xx = (kk * m * n) / (m + n); if (!isInt(xx)) return null; return { ans: xx, wrong: [kk * m * n, kk * (m + n), 2 * xx].filter((w) => w !== xx), expl: `With x = y: x/${m} + x/${n} = ${m + n}x/${m * n} = ${kk}, so x = ${kk * m * n}/${m + n} = ${xx}.`, v } }
      case 'lines': { if (m1 === m2) return null; const c1 = y0 - m1 * x0; const c2 = y0 - m2 * x0; if (c1 === 0 || c2 === 0) return null; P.c1 = c1; P.c2 = c2; return { ans: x0 + y0, wrong: [x0, y0, x0 * y0].filter((v) => v !== x0 + y0), expl: `Setting ${poly([m1, c1])} = ${poly([m2, c2])} gives x = ${x0}; then y = ${y0}, so a + b = ${x0 + y0}.` } }
      case 'add': { const R1 = x0 + k * y0; const R2 = k * x0 + y0; return { ans: x0 + y0, wrong: [R1 + R2, (R1 + R2) / 2, Math.abs(x0 - y0)].filter((v) => isInt(v) && v !== x0 + y0), expl: `Adding the equations: ${k + 1}(x + y) = ${R1 + R2}, so x + y = ${x0 + y0}.` } }
      case 'subtract': { const A = a + 2; if (x0 <= y0 || A === b) return null; const R1 = A * x0 + b * y0; const R2 = b * x0 + A * y0; return { ans: x0 - y0, wrong: [x0 + y0, R1 - R2, x0].filter((v) => v !== x0 - y0), expl: `Subtracting: ${A - b}(x − y) = ${R1 - R2}, so x − y = ${x0 - y0}.` } }
      default: {
        const X = [1, 2, 3, 4, 6][x0 % 5]; const Y = [1, 2, 3][y0 % 3]; const aa = X * a; const bb = Y * b; const cc = X * c
        const R1 = aa / X + bb / Y; const R2 = cc / X - bb / Y; if (R2 <= 0) return null
        P.X = X; P.aa = aa; P.bb = bb; P.cc = cc; P.R1 = R1; P.R2 = R2
        return { ans: X, wrong: [Y, fr(1, X), X + Y, (aa + cc)].filter((v) => v !== X && v !== `${X}`), expl: `Adding the equations: ${aa + cc}/x = ${R1 + R2}, so x = ${X}.` }
      }
    }
  },
  items: [
    [1, (p) => `Solve x + y = ${p.x0 + p.y0} and x − y = ${p.x0 - p.y0}. What is x?`, { s: 'sd' }],
    [2, (p) => `If 2x + y = ${2 * p.x0 + p.y0} and x − y = ${p.x0 - p.y0}, find y.`, { s: 'fy' }],
    [2, (p) => `If ${p.a}x + ${p.b === 1 ? '' : p.b}y = ${p.a * p.x0 + p.b * p.y0} and x + ${p.b === 1 ? '' : p.b}y = ${p.x0 + p.b * p.y0}, what is x + y?`, { s: 'sum' }],
    [2, (p) => `The equations ${p.a}x − ${p.b === 1 ? '' : p.b}y = ${num(p.a * p.x0 - p.b * p.y0)} and ${p.c === 1 ? '' : p.c}x + y = ${p.c * p.x0 + p.y0} have one common solution. What is the value of xy?`, { s: 'xy' }],
    [2, (p) => `For a + 2b = ${p.x0 + 2 * p.y0} and 2a − b = ${2 * p.x0 - p.y0}, the value of a − b is:`, { s: 'amb' }],
    [1, (p) => `If y = ${p.k}x and x + y = ${(p.k + 1) * p.x0}, find y.`, { s: 'twice' }],
    [2, (p) => `Given ${p.a}p + ${p.b === 1 ? '' : p.b}q = ${p.a * p.x0 + p.b * p.y0} and ${p.a}p − ${p.b === 1 ? '' : p.b}q = ${p.a * p.x0 - p.b * p.y0}, find p.`, { s: 'pq' }],
    [2, (p) => `If x/${p.m} + y/${p.n} = ${p.x0} and x = y, what is x?`, { s: 'fr' }],
    [3, (p) => `The lines y = ${poly([p.m1, p.c1])} and y = ${poly([p.m2, p.c2])} meet at the point (a, b). What is a + b?`, { s: 'lines' }],
    [2, (p) => `If x + ${p.k}y = ${p.x0 + p.k * p.y0} and ${p.k}x + y = ${p.k * p.x0 + p.y0}, what is the value of x + y?`, { s: 'add' }],
    [2, (p) => `If ${p.a + 2}x + ${p.b === 1 ? '' : p.b}y = ${(p.a + 2) * p.x0 + p.b * p.y0} and ${p.b === 1 ? '' : p.b}x + ${p.a + 2}y = ${p.b * p.x0 + (p.a + 2) * p.y0}, find x − y.`, { s: 'subtract' }],
    [3, (p) => `If ${p.aa}/x + ${p.bb}/y = ${p.R1} and ${p.cc}/x − ${p.bb}/y = ${p.R2}, find x.`, { s: 'recip' }],
  ],
})
const rs0 = (v) => `Rs ${num(v)}`
family('ga.equations.two-item-prices', 'ga.equations', {
  gen: (r) => ({ pA: 5 * r.int(4, 16), pB: 5 * r.int(1, 12), a: r.int(2, 5), b: r.int(1, 4), c: r.int(1, 4), d: r.int(2, 6), k: r.int(2, 4) }),
  key: (p) => `${p.s}-${p.pA}-${p.pB}-${p.a}-${p.b}-${p.c}-${p.d}-${p.k}`,
  fact: (p) => `${p.s}-${p.pA}-${p.pB}`,
  solve: (P) => {
    const { pA, pB, a, b, c, d, k } = P
    const money = { fmt: rs0 }
    switch (P.s) {
      case 'pens': if (pA <= pB || a === b) return null; return { ...money, ans: pA, wrong: [pB, pA + pB, pA - pB], expl: `Adding: ${a + b}(pen + pencil) = ${(a + b) * (pA + pB)}, so pen + pencil = ${pA + pB}; subtracting: ${Math.abs(a - b)}(pen − pencil) = ${Math.abs(a - b) * (pA - pB)}, so pen − pencil = ${pA - pB}. A pen costs Rs ${pA}.` }
      case 'fruit': { const A = pA * 4; const B = pB * 4; if (a * d - b * c === 0 || A === B) return null; P.T1 = a * A + b * B; P.T2 = c * A + d * B; return { ...money, ans: B, wrong: [A, (P.T1 - P.T2) / (a - c || 1), B + (A - B) / 2].filter((v) => isInt(v) && v > 0 && v !== B), expl: `Solving ${a}x + ${b}y = ${P.T1} and ${c}x + ${d}y = ${P.T2} gives x = ${A} (apples) and y = ${B} (bananas).` } }
      case 'chairs': { const ch = pA * 20; const T = (a + b * k) * ch; P.T = T; return { ...money, ans: k * ch, wrong: [ch, T / (a + b), T / b].filter((v) => isInt(v) && v !== k * ch), expl: `Each table = ${k} chairs, so the cost equals ${a} + ${b * k} = ${a + b * k} chairs; one chair costs ${T} ÷ ${a + b * k} = ${ch}, and a table ${k * ch}.` } }
      case 'fraction': {
        const num0 = a + c; const den0 = num0 + d + b; if (gcd(num0, den0) !== 1) return null
        const f1 = [num0 + 1, den0]; const f2 = [num0, den0 - 1]
        if (gcd(...f1) === 1 && gcd(...f2) === 1) return null
        P.f1 = fr(...f1); P.f2 = fr(...f2)
        // Confirm uniqueness by brute force over small fractions
        const hits = []
        for (let x = 1; x < 60; x++) for (let y = x + 1; y < 80; y++) if (fr(x + 1, y) === P.f1 && fr(x, y - 1) === P.f2) hits.push(`${x}/${y}`)
        if (hits.length !== 1) return null
        const ans = `${num0}/${den0}`
        const cands = [`${num0 + 1}/${den0}`, `${num0}/${den0 - 1}`, `${den0 - num0}/${den0}`, `${num0 - 1}/${den0 + 1}`].filter((t) => t !== ans)
        return { ans, wrong: cands, expl: `With the fraction x/y: (x + 1)/y = ${P.f1} and x/(y − 1) = ${P.f2}; solving gives x = ${num0} and y = ${den0}.` }
      }
      case 'sumdiff': { const S = pA + pB; const D = pA - pB; if (D <= 0) return null; return { ans: pB, wrong: [pA, S / 2, S - D].filter((v) => isInt(v) && v !== pB), expl: `Smaller = (${S} − ${D}) ÷ 2 = ${pB}.` } }
      case 'burger': { const dr = pB * 2; const k2 = pA * 2; const T = a * (dr + k2) + b * dr; P.T = T; P.k2 = k2; return { ...money, ans: dr, wrong: [dr + k2, T / (a + b), (T - k2) / (a + b)].filter((v) => isInt(v) && v !== dr), expl: `If a drink is d, then ${a}(d + ${k2}) + ${b}d = ${T}, so ${a + b}d = ${T - a * k2} and d = ${dr}.` } }
      case 'taxi': { const F = pA * 5; const rate = pB + 10; const d1 = c + 4; const d2 = d1 + d; P.C1 = F + rate * d1; P.C2 = F + rate * d2; P.d1 = d1; P.d2 = d2; return { ...money, ans: F, wrong: [rate, P.C1 - rate, F + rate].filter((v) => v !== F), expl: `The extra ${d} km cost Rs ${P.C2 - P.C1}, so the rate is Rs ${rate} per km; the fixed charge is ${P.C1} − ${d1} × ${rate} = Rs ${F}.` } }
      default: { if (a * d - b * c === 0 || pA === pB) return null; P.T1 = a * pA + b * pB; P.T2 = c * pA + d * pB; return { ...money, ans: pA + pB, wrong: [pA, pB, pA + pB + 5].filter((v) => v !== pA + pB), expl: `Solving ${a}s + ${b}p = ${P.T1} and ${c}s + ${d}p = ${P.T2} gives s = ${pA} and p = ${pB}, so together Rs ${pA + pB}.` } }
    }
  },
  items: [
    [2, (p) => `${pl(p.a, 'pen')} and ${pl(p.b, 'pencil')} cost Rs ${p.a * p.pA + p.b * p.pB}, while ${pl(p.b, 'pen')} and ${pl(p.a, 'pencil')} cost Rs ${p.b * p.pA + p.a * p.pB}. What is the cost of one pen?`, { s: 'pens' }],
    [2, (p) => `${p.a} kg of apples and ${p.b} kg of bananas cost Rs ${num(p.T1)}; ${p.c} kg of apples and ${p.d} kg of bananas cost Rs ${num(p.T2)}. What is the price of 1 kg of bananas?`, { s: 'fruit' }],
    [2, (p) => `${p.a} chairs and ${p.b} table${p.b > 1 ? 's' : ''} cost Rs ${num(p.T)}. One table costs as much as ${p.k} chairs. What is the cost of one table?`, { s: 'chairs' }],
    [3, (p) => `A fraction becomes ${p.f1} when 1 is added to its numerator, and becomes ${p.f2} when 1 is subtracted from its denominator. What is the fraction?`, { s: 'fraction' }],
    [1, (p) => `The sum of two numbers is ${p.pA + p.pB} and their difference is ${p.pA - p.pB}. What is the smaller number?`, { s: 'sumdiff' }],
    [2, (p) => `${p.a} burgers and ${p.b} drink${p.b > 1 ? 's' : ''} cost Rs ${num(p.T)}, and one burger costs Rs ${p.k2} more than one drink. What does one drink cost?`, { s: 'burger' }],
    [2, (p) => `A taxi charges a fixed amount plus a set rate per kilometre. ${art(p.d1).replace(/^a/, 'A')} ${p.d1} km ride costs Rs ${p.C1} and ${art(p.d2)} ${p.d2} km ride costs Rs ${p.C2}. What is the fixed charge?`, { s: 'taxi' }],
    [3, (p) => `${pl(p.a, 'samosa')} and ${pl(p.b, 'pakora')} cost Rs ${p.T1}, while ${pl(p.c, 'samosa')} and ${pl(p.d, 'pakora')} cost Rs ${p.T2}. What is the total cost of one samosa and one pakora?`, { s: 'samosa' }],
  ],
})

const countInts = (lo, hi, pred) => { const out = []; for (let v = lo; v <= hi; v++) if (pred(v)) out.push(v); return out }
family('ga.equations.inequalities', 'ga.equations', {
  positive: false,
  gen: (r) => ({ a: r.int(2, 6), b: r.int(1, 12), c: r.int(5, 30), d: r.int(1, 9), e: r.int(8, 25), lo: r.int(-12, -1), hi: r.int(3, 15), k: r.int(2, 5), nm: r.pick(NAMES) }),
  key: (p) => `${p.s}-${p.a}-${p.b}-${p.c}-${p.d}-${p.e}-${p.lo}-${p.hi}-${p.k}`,
  solve: (P) => {
    const { a, b, c, d, e, lo, hi, k } = P
    const near3 = (n) => [n + 1, n - 1, n + 2].filter((v) => v >= 0 && v !== n)
    switch (P.s) {
      case 'set': { const S = countInts(-50, 50, (n) => lo < k * n && k * n <= hi); if (S.length < 3 || S.length > 5) return null; const show = (arr) => arr.map(num).join(', '); const mn = S[0]; const mx = S[S.length - 1]; const cands = [[mn - 1, ...S], S.slice(0, -1), S.slice(1), [...S, mx + 1]].filter((X) => show(X) !== show(S)); return { ans: show(S), wrong: cands.map(show), expl: `Divide by ${k}: ${fr(lo, k)} < n ≤ ${fr(hi, k)}, so n can be ${show(S)}.` } }
      case 'smallest': { const n = Math.floor((b + c) / a) + 1; return { ans: n, wrong: [n - 1, n + 1, b + c].filter((v) => v !== n), expl: `${a}x > ${b + c}, so x > ${fr(b + c, a)}; the smallest integer is ${n}.` } }
      case 'count': { const S = countInts(-60, 60, (x) => lo <= 2 * x + d && 2 * x + d < hi); if (S.length < 3) return null; const n = S.length; return { ans: n, wrong: near3(n), expl: `Subtract ${d} and halve: ${fr(lo - d, 2)} ≤ x < ${fr(hi - d, 2)}, so x runs from ${num(S[0])} to ${num(S[n - 1])}: ${n} integers.` } }
      case 'largest': { const S = countInts(-60, 60, (n) => c - a * n > -d); const n = S[S.length - 1]; return { ans: n, wrong: [n + 1, n + 2, n - 1], expl: `${c} + ${d} > ${a}n, so n < ${fr(c + d, a)}; the largest integer is ${n}.` } }
      case 'posvals': { const S = countInts(1, 60, (x) => a * x + b < c + 10); if (S.length < 2) return null; const n = S.length; return { ans: n, wrong: [n + 1, n - 1, c + 10 - b].filter((v) => v > 0 && v !== n), expl: `${a}x < ${c + 10 - b}, so x < ${fr(c + 10 - b, a)}; x can be 1 to ${n}: ${n} values.` } }
      case 'triple': { const S = countInts(0, 60, (x) => 3 * x - b < c); const n = S[S.length - 1]; return { ans: n, wrong: [n + 1, n - 1, c + b].filter((v) => v !== n), expl: `3x − ${b} < ${c} gives 3x < ${c + b}, x < ${fr(c + b, 3)}; the greatest whole number is ${n}.` } }
      case 'taxi': { const F = 10 * (b + 5); const rate = 5 * (a + 2); const M = F + rate * (c % 12 + 4) + 5 * (d % 4); const n = Math.floor((M - F) / rate); P.F = F; P.rate = rate; P.M = M; return { ans: n, wrong: [n + 1, Math.floor(M / rate), n - 1].filter((v) => v !== n), expl: `${F} + ${rate}k ≤ ${M} gives k ≤ ${fr(M - F, rate)}, so at most ${n} km.` } }
      case 'notes': { const v = [100, 500, 1000][d % 3]; const B = v * (a + 1) + 10 * (e + 3); const n = Math.ceil(B / v); P.v = v; P.B = B; return { ans: n, wrong: [n - 1, n + 1, n - 2].filter((x) => x > 0), expl: `${B} ÷ ${v} = ${num(B / v)}, so ${n - 1} notes are not enough and ${n} are needed.` } }
      case 'both': { const S = countInts(-60, 60, (x) => a * x - b > d && x + d <= e); if (S.length < 2) return null; const n = S.length; return { ans: n, wrong: near3(n), expl: `x > ${fr(b + d, a)} and x ≤ ${e - d}; the integers ${S[0]} to ${S[n - 1]} give ${n} values.` } }
      case 'sumvals': { const S = countInts(lo + 1, hi - 1, () => true); const s = sum(S); return { ans: s, wrong: [s + hi, s + lo, S.length].filter((v) => v !== s), expl: `x can be ${num(S[0])}, …, ${num(S[S.length - 1])}; the sum is ${num(s)}.` } }
      case 'avg': { const A = 50 + 5 * (k + a); const s1 = A - 10 + b; const s2 = A - 4 - d; const s3 = A - 2 - (e % 7); const need = 4 * A - s1 - s2 - s3; if (need > 100 || need <= A) return null; P.A = A; P.sc = [s1, s2, s3]; return { ans: need, wrong: [A, 3 * A - s1 - s2 - s3, need - 1, need + 1].filter((v) => v > 0 && v !== need), expl: `She needs a total of 4 × ${A} = ${4 * A}; she has ${s1 + s2 + s3}, so she needs ${need}.` } }
      default: { const A = a; const C = A + k; const S = countInts(-60, 200, (n) => A * n + b < C * n - d && A * n + b <= e + 20); if (S.length < 2 || S.length > 15) return null; const n = S.length; P.C = C; return { ans: n, wrong: near3(n), expl: `${A}n + ${b} < ${C}n − ${d} gives n > ${fr(b + d, C - A)}; ${A}n + ${b} ≤ ${e + 20} gives n ≤ ${fr(e + 20 - b, A)}; so n = ${S[0]}, …, ${S[n - 1]}: ${n} integers.` } }
    }
  },
  items: [
    [2, (p) => `What integer values can n have, given ${num(p.lo)} < ${p.k}n ≤ ${p.hi}?`, { s: 'set' }],
    [1, (p) => `What is the smallest integer x that satisfies ${p.a}x − ${p.b} > ${p.c}?`, { s: 'smallest' }],
    [2, (p) => `How many integers x satisfy ${num(p.lo)} ≤ 2x + ${p.d} < ${p.hi}?`, { s: 'count' }],
    [2, (p) => `Find the largest integer n for which ${p.c} − ${p.a}n > −${p.d}.`, { s: 'largest' }],
    [2, (p) => `If x is a positive integer and ${p.a}x + ${p.b} < ${p.c + 10}, how many values can x take?`, { s: 'posvals' }],
    [2, (p) => `A number is tripled and then decreased by ${p.b}; the result is less than ${p.c}. What is the greatest whole number it could be?`, { s: 'triple' }],
    [2, (p) => `A rickshaw fare is Rs ${p.F} plus Rs ${p.rate} per kilometre. ${p.nm} has Rs ${p.M}. What is the greatest whole number of kilometres ${p.nm} can afford?`, { s: 'taxi' }],
    [1, (p) => `What is the least number of Rs ${p.v} notes needed to pay a bill of Rs ${num(p.B)}?`, { s: 'notes' }],
    [3, (p) => `How many integers x satisfy both ${p.a}x − ${p.b} > ${p.d} and x + ${p.d} ≤ ${p.e}?`, { s: 'both' }],
    [2, (p) => `If ${num(p.lo)} < x < ${p.hi} and x is an integer, what is the sum of all possible values of x?`, { s: 'sumvals' }],
    [2, (p) => `A student needs an average of at least ${p.A} marks in four tests. Her first three scores are ${p.sc[0]}, ${p.sc[1]} and ${p.sc[2]}. What is the lowest score she needs in the fourth test?`, { s: 'avg' }],
    [3, (p) => `How many integers n satisfy ${p.a}n + ${p.b} < ${p.C}n − ${p.d} and ${p.a}n + ${p.b} ≤ ${p.e + 20}?`, { s: 'mixed' }],
  ],
})
family('ga.equations.two-type-count-value', 'ga.equations', {
  gen: (r) => ({ N: r.int(12, 60), f: 0.2 + 0.6 * r.f(), nm: r.pick(NAMES), a: r.int(3, 4), b: r.int(1, 2), k: r.int(4, 25), p: r.int(1, 5), q: r.int(1, 4) }),
  key: (p) => `${p.s}-${p.N}-${p.n2}${p.s === 'test' ? `-${p.a}-${p.b}` : ''}${p.s === 'ratio' ? `-${p.p}-${p.q}-${p.k}` : ''}${p.s === 'equal' ? `-${p.k}` : ''}`,
  solve: (P) => {
    const { N, f, a, b, k, p, q } = P
    const V = { c510: [5, 10], n50: [50, 100], c25: [2, 5], n2050: [20, 50], tickets: [150, 300], hens: [2, 4], raffle: [50, 100], park: [2, 4], stamps: [8, 20] }[P.s]
    if (V) {
      const n2 = Math.max(1, Math.min(N - 1, Math.round(f * N))); if (n2 === N - n2) return null
      const [v1, v2] = V; const T = v1 * (N - n2) + v2 * n2; P.n2 = n2; P.T = T; P.v1 = v1; P.v2 = v2
      const askLow = ['n50', 'n2050', 'tickets', 'park'].includes(P.s)
      const ans = askLow ? N - n2 : n2; const other = askLow ? n2 : N - n2
      return { ans, wrong: [other, T / (askLow ? v1 : v2), ans + 2, ans - 2].filter((v) => isInt(v) && v > 0 && v !== ans), expl: `If all ${N} were worth ${v1}, the total would be ${v1 * N}; the extra ${T - v1 * N} comes from ${v2 - v1} more on each higher-value item, so there are ${n2} of those and ${N - n2} of the others.` }
    }
    if (P.s === 'test') { const c = Math.max(1, Math.min(N - 1, Math.round(0.5 * N + f * 0.45 * N))); const S = a * c - b * (N - c); if (S <= 0) return null; P.n2 = c; P.S = S; return { ans: c, wrong: [N - c, Math.round(S / a), c + 2].filter((v) => v > 0 && v !== c), expl: `If c are correct, ${a}c − ${b}(${N} − c) = ${S}, so ${a + b}c = ${S + b * N} and c = ${c}.` } }
    if (P.s === 'equal') { P.n2 = 0; return { ans: 3 * k, wrong: [k, 2 * k, 4 * k], expl: `One note of each kind is worth 10 + 20 + 50 = Rs 80; ${80 * k} ÷ 80 = ${k} of each, so ${3 * k} notes in all.` } }
    // ratio of Rs 1 and Rs 2 coins
    if (gcd(p, q) !== 1 || p === q) return null
    const x = k; const T = p * x + 2 * q * x; P.n2 = 0; P.T = T
    return { ans: p * x, wrong: [q * x, (p + q) * x, Math.round((T * p) / (p + q))].filter((v) => v !== p * x), expl: `Take ${p}x one-rupee and ${q}x two-rupee coins: ${p}x + ${2 * q}x = ${p + 2 * q}x = ${T}, so x = ${x} and there are ${p * x} one-rupee coins.` }
  },
  items: [
    [2, (p) => `${p.nm} has ${p.N} coins of Rs 5 and Rs 10 worth Rs ${num(p.T)} in total. How many Rs 10 coins are there?`, { s: 'c510' }],
    [2, (p) => `A cashier has ${p.N} notes of Rs 50 and Rs 100 totalling Rs ${num(p.T)}. How many of them are Rs 50 notes?`, { s: 'n50' }],
    [2, (p) => `A piggy bank holds only Rs 2 and Rs 5 coins: ${p.N} coins with a total value of Rs ${num(p.T)}. How many Rs 5 coins are there?`, { s: 'c25' }],
    [2, (p) => `Rs ${num(p.T)} is paid using ${p.N} notes, some of Rs 20 and the rest of Rs 50. How many Rs 20 notes are used?`, { s: 'n2050' }],
    [2, (p) => `Tickets for a show cost Rs 300 for adults and Rs 150 for children. ${p.N} tickets were sold for Rs ${num(p.T)}. How many children's tickets were sold?`, { s: 'tickets' }],
    [2, (p) => `A farm has hens and goats. Together they have ${p.N} heads and ${p.T} legs. How many goats are there?`, { s: 'hens' }],
    [2, (p) => `In a test of ${p.N} questions, ${p.a} marks are given for each correct answer and ${p.b} mark${p.b > 1 ? 's are' : ' is'} deducted for each wrong answer. A student attempts every question and scores ${p.S}. How many answers are correct?`, { s: 'test' }],
    [2, (p) => `A school raised Rs ${num(p.T)} by selling ${p.N} raffle tickets priced at Rs 50 and Rs 100. How many Rs 100 tickets were sold?`, { s: 'raffle' }],
    [2, (p) => `A car park holds only cars and motorbikes: ${p.N} vehicles with ${p.T} wheels in total. How many motorbikes are there?`, { s: 'park' }],
    [2, (p) => `${p.nm} bought ${p.N} stamps, some at Rs 8 and the rest at Rs 20, paying Rs ${p.T} altogether. How many Rs 20 stamps were bought?`, { s: 'stamps' }],
    [2, (p) => `A wallet contains an equal number of Rs 10, Rs 20 and Rs 50 notes, worth Rs ${num(80 * p.k)} in all. How many notes are there altogether?`, { s: 'equal' }],
    [2, (p) => `A bag has Rs 1 and Rs 2 coins in the ratio ${p.p} : ${p.q}, worth Rs ${p.T} in total. How many Rs 1 coins are in the bag?`, { s: 'ratio' }],
  ],
})

const PY = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [12, 16, 20], [20, 21, 29], [9, 40, 41], [15, 20, 25]]
family('ga.equations.rectangle-dimensions', 'ga.equations', {
  gen: (r) => ({ b: r.int(3, 20), d: r.int(2, 8), k: r.int(2, 3), tri: r.pick(PY), a: r.int(3, 12), bb: r.int(1, 6) }),
  key: (p) => `${p.s}-${p.b}-${p.d}${['twice', 'breadth'].includes(p.s) ? `-${p.k}` : ''}${p.s === 'diag' ? `-${p.tri.join('')}` : ''}${p.s === 'equal' ? `-${p.a}-${p.bb}` : ''}`,
  fmt: (v, p) => (typeof v === 'string' ? v : `${num(v)} ${p.u}`),
  solve: (P) => {
    const { b, d, k, tri, a, bb } = P
    switch (P.s) {
      case 'area': { P.u = 'cm²'; const l = b + d; const Pm = 2 * (l + b); P.Pm = Pm; return { ans: l * b, wrong: [l * l, b * b, (Pm / 4) ** 2].filter((v) => isInt(v) && v !== l * b), expl: `l + b = ${Pm / 2} and l − b = ${d}, so l = ${l} and b = ${b}; area = ${l} × ${b} = ${l * b} cm².` } }
      case 'quad': P.u = 'cm'; return { ans: b, wrong: [b + d, b + 1, b - 1], expl: `w(w + ${d}) = ${b * (b + d)}; w = ${b} works (${b} × ${b + d} = ${b * (b + d)}), so the width is ${b} cm.` }
      case 'twice': { P.u = 'm'; const Pm = 2 * (k + 1) * b; return { ans: k * b, wrong: [b, Pm / 4, 2 * k * b].filter((v) => isInt(v) && v !== k * b), expl: `2(${k}b + b) = ${Pm}, so b = ${b} m and the length is ${k * b} m.` } }
      case 'breadth': { P.u = 'cm'; const Pm = 2 * (k + 1) * b; return { ans: b, wrong: [k * b, Pm / (k + 1), Pm / 4, Pm / k, 2 * b].filter((v) => isInt(v) && v !== b), expl: `2(${k}b + b) = ${2 * (k + 1)}b = ${Pm}, so b = ${b} cm.` } }
      case 'diag': { P.u = 'cm²'; const [x, y, z] = tri; return { ans: x * y, wrong: [2 * x * y, x * y + z, ((x + y) ** 2) / 4].filter((v) => isInt(v)), expl: `l + b = ${x + y} and l² + b² = ${z * z}; since (l + b)² = l² + b² + 2lb, 2lb = ${(x + y) ** 2} − ${z * z} = ${2 * x * y}, so the area is ${x * y} cm².` } }
      case 'squares': { P.u = 'cm'; const Pm = 8 * b + 4 * d; return { ans: b, wrong: [b + d, Pm / 8, (Pm - d) / 8].filter((v) => isInt(v) && v !== b), expl: `4s + 4(s + ${d}) = ${Pm} gives 8s = ${Pm - 4 * d}, so s = ${b} cm.` } }
      case 'wire': { P.u = 'cm'; const l = b + d; const Pm = 2 * (l + b); return { ans: l, wrong: [b, (Pm / 2 + d), Pm / 4].filter((v) => isInt(v) && v !== l), expl: `l + b = ${Pm / 2} and l − b = ${d}, so l = (${Pm / 2} + ${d}) ÷ 2 = ${l} cm.` } }
      default: { P.u = 'cm'; if (a <= bb) return null; const s = (a * bb) / (a - bb); if (!isInt(s) || s <= bb) return null; return { ans: s, wrong: [a + bb, a * bb, s + 1].filter((v) => v !== s), expl: `(s + ${a})(s − ${bb}) = s² gives ${a - bb}s − ${a * bb} = 0, so s = ${a * bb}/${a - bb} = ${s} cm.` } }
    }
  },
  items: [
    [3, (p) => `The length of a rectangle exceeds its breadth by ${p.d} cm and its perimeter is ${p.Pm} cm. What is its area?`, { s: 'area' }],
    [3, (p) => `A rectangle's length is ${p.d} cm more than its width, and its area is ${p.b * (p.b + p.d)} cm². What is its width?`, { s: 'quad' }],
    [2, (p) => `The length of a rectangular field is ${W_TIMES[p.k]} its breadth. If the perimeter is ${2 * (p.k + 1) * p.b} m, find the length.`, { s: 'twice' }],
    [2, (p) => `A rectangle has a perimeter of ${2 * (p.k + 1) * p.b} cm and its length is ${p.k} times its breadth. What is its breadth?`, { s: 'breadth' }],
    [3, (p) => `A rectangle has a perimeter of ${2 * (p.tri[0] + p.tri[1])} cm and a diagonal of ${p.tri[2]} cm. What is its area?`, { s: 'diag' }],
    [2, (p) => `The side of one square is ${p.d} cm longer than the side of another, and their perimeters add up to ${8 * p.b + 4 * p.d} cm. What is the side of the smaller square?`, { s: 'squares' }],
    [2, (p) => `A wire ${2 * (2 * p.b + p.d)} cm long is bent into a rectangle whose length is ${p.d} cm more than its breadth. What is the length?`, { s: 'wire' }],
    [3, (p) => `One side of a square is increased by ${p.a} cm and the adjacent side is decreased by ${p.bb} cm. The rectangle formed has the same area as the square. What is the side of the square?`, { s: 'equal' }],
  ],
})

family('ga.equations.quadratic-roots', 'ga.equations', {
  positive: false,
  gen: (r) => { const a = r.int(1, 9); let b = r.int(1, 9); if (b === a) b = a === 9 ? 7 : a + 1; return { a, b, A: r.int(2, 5), B: r.int(1, 13), C: r.int(1, 12), k: r.int(3, 9) } },
  key: (p) => `${p.s}-${p.a}-${p.b}${['sum', 'prod'].includes(p.s) ? `-${p.A}-${p.B}-${p.C}` : ''}${p.s === 'shift' ? `-${p.k}` : ''}`,
  fact: (p) => (['pos', 'other', 'p', 'gap'].includes(p.s) ? `pos-${Math.min(p.a, p.b)}-${Math.max(p.a, p.b)}` : `${p.s}-${p.a}-${p.b}-${p.A}-${p.B}-${p.C}-${p.k}`),
  solve: (P) => {
    const { a, b, A, B, C, k } = P
    const pr = (u, v) => { const [x, y] = u <= v ? [u, v] : [v, u]; return `${num(x)} and ${num(y)}` }
    switch (P.s) {
      case 'pos': { const rr = makeRng(`qr-${a}-${b}`); const w = pairCands(-a, -b, rr).map(([u, v]) => pr(-u, -v)).filter((t) => !t.includes('−')); return { ans: pr(a, b), wrong: w, expl: `x² − ${a + b}x + ${a * b} = (x − ${a})(x − ${b}) = 0, so x = ${Math.min(a, b)} or x = ${Math.max(a, b)}.` } }
      case 'mixed': { const rr = makeRng(`qm-${a}-${b}`); const w = pairCands(-a, b, rr).map(([u, v]) => pr(-u, -v)); return { ans: pr(a, -b), wrong: w, expl: `${poly([1, b - a, -a * b])} = (x − ${a})(x + ${b}) = 0, so x = ${a} or x = −${b}.` } }
      case 'posroot': return { ans: a, wrong: [b, a + b, a * b], expl: `${poly([1, b - a, -a * b])} = (x − ${a})(x + ${b}), so the roots are ${a} and −${b}; the positive root is ${a}.` }
      case 'sum': { if (B * B - 4 * A * C <= 0) return null; return { ans: fr(B, A), wrong: [fr(C, A), `${B}`, fr(A, B)].filter((t) => t !== fr(B, A)), expl: `For ax² + bx + c = 0 the sum of the roots is −b/a = ${B}/${A} = ${fr(B, A)}.` } }
      case 'prod': return { ans: fr(-C, A), wrong: [fr(-B, A), `−${C}`, fr(-A, C)].filter((t) => canonical(t) !== canonical(fr(-C, A))), expl: `For ax² + bx + c = 0 the product of the roots is c/a = −${C}/${A}${fr(-C, A) === `−${C}/${A}` ? '' : ` = ${fr(-C, A)}`}.` }
      case 'shift': { if (a >= k) return null; return { ans: a + k, wrong: [k - a, k, a + k * k], expl: `x − ${a} = ±${k}, so x = ${a + k} or x = ${num(a - k)}; the positive value is ${a + k}.` } }
      case 'equal': return { ans: a * a, wrong: [2 * a, 4 * a * a, a], expl: `Equal roots need b² = 4ac: ${4 * a * a} = 4k, so k = ${a * a}.` }
      case 'other': return { ans: b, wrong: [a + b, a * b, 2 * a + b].filter((v) => v !== b), expl: `The roots add up to ${a + b}, so the other root is ${a + b} − ${a} = ${b}.` }
      case 'p': return { ans: a + b, wrong: [a * b, Math.abs(a - b), 2 * (a + b)].filter((v) => v !== a + b), expl: `For x² − px + q = 0 the roots add up to p, so p = ${a} + ${b} = ${a + b}.` }
      default: return { ans: Math.abs(a - b), wrong: [a + b, a * b, Math.min(a, b)].filter((v) => v !== Math.abs(a - b)), expl: `x² − ${a + b}x + ${a * b} = (x − ${a})(x − ${b}), so the roots are ${a} and ${b}, which differ by ${Math.abs(a - b)}.` }
    }
  },
  items: [
    [1, (p) => `Solve x² − ${p.a + p.b}x + ${p.a * p.b} = 0.`, { s: 'pos' }],
    [2, (p) => `The roots of ${poly([1, p.b - p.a, -p.a * p.b])} = 0 are:`, { s: 'mixed' }],
    [2, (p) => `What is the positive root of ${poly([1, p.b - p.a, -p.a * p.b])} = 0?`, { s: 'posroot' }],
    [2, (p) => `What is the sum of the roots of ${p.A}x² − ${p.B}x + ${p.C} = 0?`, { s: 'sum' }],
    [2, (p) => `The product of the roots of ${p.A}x² + ${p.B}x − ${p.C} = 0 is:`, { s: 'prod' }],
    [2, (p) => `If (x − ${p.a})² = ${p.k * p.k} and x is positive, what is x?`, { s: 'shift' }],
    [2, (p) => `For what value of k does x² − ${2 * p.a}x + k = 0 have equal roots?`, { s: 'equal' }],
    [2, (p) => `One root of x² − ${p.a + p.b}x + ${p.a * p.b} = 0 is ${p.a}. What is the other root?`, { s: 'other' }],
    [2, (p) => `If the roots of x² − px + ${p.a * p.b} = 0 are ${p.a} and ${p.b}, what is p?`, { s: 'p' }],
    [2, (p) => `What is the difference between the roots of x² − ${p.a + p.b}x + ${p.a * p.b} = 0?`, { s: 'gap' }],
  ],
})

// ===========================================================================
// ga.sets — 60
// ===========================================================================
function venn(r, { U0 = [40, 300], neither = true } = {}) {
  for (;;) {
    const U = r.int(U0[0] / 10, U0[1] / 10) * 10
    const A = r.int(Math.round(U * 0.25), Math.round(U * 0.7))
    const B = r.int(Math.round(U * 0.2), Math.round(U * 0.65))
    const AB = r.int(Math.max(1, Math.round(Math.min(A, B) * 0.1)), Math.round(Math.min(A, B) * 0.7))
    const N = U - (A + B - AB)
    if (AB >= Math.min(A, B) || N < 0) continue
    if (neither && N < 2) continue
    if (!neither) return { U: A + B - AB, A, B, AB, N: 0 }
    return { U, A, B, AB, N }
  }
}
family('ga.sets.two-set-neither', 'ga.sets', {
  gen: (r) => venn(r),
  key: (p) => `${p.U}-${p.A}-${p.B}-${p.AB}`,
  solve: ({ U, A, B, AB, N }) => ({ ans: N, wrong: [A + B - AB, U - A - B + 2 * AB, AB, U - A - B], expl: `At least one: ${A} + ${B} − ${AB} = ${A + B - AB}; neither: ${U} − ${A + B - AB} = ${N}.` }),
  items: [
    [2, (p) => `In a group of ${p.U} people, ${p.A} like tennis, ${p.B} like cricket and ${p.AB} like both. How many like neither?`],
    [2, (p) => `Of the ${p.U} students in a class, ${p.A} study French, ${p.B} study Arabic and ${p.AB} study both languages. How many study neither language?`],
    [2, (p) => `A survey of ${p.U} households found that ${p.A} own a car, ${p.B} own a motorcycle and ${p.AB} own both. How many households own neither?`],
    [2, (p) => `In an office of ${p.U} employees, ${p.A} drink tea, ${p.B} drink coffee and ${p.AB} drink both. How many employees drink neither tea nor coffee?`],
    [2, (p) => `${p.U} candidates appeared in an examination. ${p.A} passed in English, ${p.B} passed in Mathematics and ${p.AB} passed in both. How many failed in both subjects?`],
    [2, (p) => `At a wedding with ${p.U} guests, ${p.A} ate biryani, ${p.B} ate korma and ${p.AB} ate both dishes. How many guests ate neither dish?`],
    [2, (p) => `A library has ${p.U} members. ${p.A} borrow novels, ${p.B} borrow magazines and ${p.AB} borrow both. How many members borrow neither?`],
    [2, (p) => `Out of ${p.U} villagers, ${p.A} keep goats, ${p.B} keep cows and ${p.AB} keep both. How many villagers keep neither goats nor cows?`],
    [2, (p) => `In a batch of ${p.U} trainees, ${p.A} can drive, ${p.B} can swim and ${p.AB} can do both. How many trainees can do neither?`],
    [2, (p) => `Among ${p.U} shoppers at a market, ${p.A} bought fruit, ${p.B} bought vegetables and ${p.AB} bought both. How many shoppers bought neither?`],
  ],
})

family('ga.sets.two-set-both', 'ga.sets', {
  gen: (r, x) => venn(r, { neither: !x.all }),
  key: (p) => `${p.U}-${p.A}-${p.B}-${p.N}`,
  solve: ({ U, A, B, AB, N }) => (N === 0
    ? { ans: AB, wrong: [U - A, U - B, A + B, Math.max(A, B) - AB].filter((v) => v > 0 && v !== AB), expl: `Everyone is in at least one group, so both = ${A} + ${B} − ${U} = ${AB}.` }
    : { ans: AB, wrong: [A + B - U, U - N - A, U - N - B, A + B - U + 2 * N, N].filter((v) => v > 0), expl: `n(A ∪ B) = ${U} − ${N} = ${U - N}; both = ${A} + ${B} − ${U - N} = ${AB}.` }),
  items: [
    [2, (p) => `In a class of ${p.U} students, ${p.A} play hockey and ${p.B} play football. Every student plays at least one of the two games. How many play both?`, { all: true }],
    [2, (p) => `Of ${p.U} people surveyed, ${p.A} read an Urdu newspaper, ${p.B} read an English newspaper and ${p.N} read neither. How many read both?`],
    [2, (p) => `${p.U} tourists visited a city: ${p.A} went to the fort, ${p.B} went to the museum and ${p.N} went to neither. How many visited both places?`],
    [2, (p) => `Each of the ${p.U} members of a club plays chess or carrom or both. If ${p.A} play chess and ${p.B} play carrom, how many play both games?`, { all: true }],
    [2, (p) => `In a hostel of ${p.U} students, ${p.A} take milk, ${p.B} take tea and ${p.N} take neither. How many take both milk and tea?`],
    [2, (p) => `A company has ${p.U} staff. ${p.A} speak Punjabi, ${p.B} speak Pashto and ${p.N} speak neither language. How many speak both?`],
    [1, (p) => `If n(A) = ${p.A}, n(B) = ${p.B} and n(A ∪ B) = ${p.U}, what is n(A ∩ B)?`, { all: true }],
    [2, (p) => `On a school sports day ${p.U} students took part, and each entered at least one race. ${p.A} ran the 100 m and ${p.B} ran the relay. How many ran in both races?`, { all: true }],
    [2, (p) => `A sample of ${p.U} phones was tested: ${p.A} had a screen fault, ${p.B} had a battery fault and ${p.N} had no fault. How many had both faults?`],
    [2, (p) => `Out of ${p.U} farmers, ${p.A} grow wheat, ${p.B} grow rice and ${p.N} grow neither crop. How many grow both?`],
  ],
})

family('ga.sets.two-set-only-one', 'ga.sets', {
  gen: (r) => venn(r),
  key: (p) => `${p.m}-${p.U}-${p.A}-${p.B}-${p.AB}`,
  solve: (P) => {
    const { A, B, AB, N, U } = P
    switch (P.m) {
      case 'onlyA': return { ans: A - AB, wrong: [A, AB, B - AB, A + B - AB], expl: `Only the first: ${A} − ${AB} = ${A - AB}.` }
      case 'onlyB': return { ans: B - AB, wrong: [B, AB, A - AB, A + B - AB], expl: `Only the second: ${B} − ${AB} = ${B - AB}.` }
      case 'exact': return { ans: A + B - 2 * AB, wrong: [A + B - AB, A + B, A - AB, AB], expl: `Exactly one: (${A} − ${AB}) + (${B} − ${AB}) = ${A + B - 2 * AB}.` }
      case 'union': return { ans: A + B - AB, wrong: [A + B, A + B - 2 * AB, A + B + AB], expl: `At least one: ${A} + ${B} − ${AB} = ${A + B - AB}.` }
      case 'fromOnly': return { ans: A, wrong: [A - AB, A - 2 * AB, A + B - AB, B], expl: `Everyone who speaks English: only English + both = ${A - AB} + ${AB} = ${A}.` }
      case 'gymB': return { ans: B - AB, wrong: [B, AB, U - N - A, B - N].filter((v) => v !== B - AB), expl: `Both = ${A} + ${B} − (${U} − ${N}) = ${AB}; only the weights = ${B} − ${AB} = ${B - AB}.` }
      default: return { ans: A + B - 2 * AB, wrong: [U - N, A + B - AB, AB, A + B - U], expl: `Both = ${A} + ${B} − (${U} − ${N}) = ${AB}; exactly one = ${U - N} − ${AB} = ${A + B - 2 * AB}.` }
    }
  },
  items: [
    [1, (p) => `In a group of ${p.U} people, ${p.A} like tea and ${p.B} like coffee, while ${p.AB} like both. How many like only tea?`, { m: 'onlyA' }],
    [2, (p) => `${p.A} students take Physics and ${p.B} take Chemistry; ${p.AB} of them take both. How many take exactly one of the two subjects?`, { m: 'exact' }],
    [1, (p) => `In a town, ${p.A} families own a television, ${p.B} own a computer and ${p.AB} own both. How many families own a computer but not a television?`, { m: 'onlyB' }],
    [1, (p) => `n(A) = ${p.A}, n(B) = ${p.B} and n(A ∩ B) = ${p.AB}. What is n(A − B)?`, { m: 'onlyA' }],
    [3, (p) => `Of the ${p.U} members of a gym, ${p.A} use the treadmill and ${p.B} use the weights, with ${p.N} using neither. How many use only the weights?`, { m: 'gymB' }],
    [1, (p) => `A college has ${p.A} students in the debating society and ${p.B} in the drama club; ${p.AB} are in both. How many students belong to at least one of the two?`, { m: 'union' }],
    [2, (p) => `In a survey, ${p.A} people liked mangoes, ${p.B} liked oranges and ${p.AB} liked both. How many liked just one of the two fruits?`, { m: 'exact' }],
    [1, (p) => `On a bus of ${p.U} passengers, ${p.A} carried a bag, ${p.B} carried an umbrella and ${p.AB} carried both. How many carried an umbrella only?`, { m: 'onlyB' }],
    [1, (p) => `In a group, ${p.A - p.AB} people speak only English, ${p.B - p.AB} speak only Urdu and ${p.AB} speak both. How many speak English?`, { m: 'fromOnly' }],
    [3, (p) => `Among ${p.U} students, ${p.A} have a laptop and ${p.B} have a tablet, while ${p.N} have neither. How many have exactly one of the two devices?`, { m: 'exactN' }],
  ],
})

const LET = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
family('ga.sets.subsets-count', 'ga.sets', {
  gen: (r) => ({ n: r.int(2, 7), k: r.int(2, 5) }),
  key: (p) => `${p.m}-${p.n}${p.m === 'times' ? `-${p.k}` : ''}`,
  fact: (p) => (['all', 'power'].includes(p.m) ? `all-${p.n}` : ['proper', 'nonempty'].includes(p.m) ? `m1-${p.n}` : `${p.m}-${p.n}-${p.k}`),
  solve: (P) => {
    const { n, k } = P
    const T = 2 ** n
    switch (P.m) {
      case 'all': case 'power': return { ans: T, wrong: [2 * n, n * n, T - 1], expl: `A set with n elements has 2ⁿ subsets: 2${sup(n)} = ${T}.` }
      case 'proper': case 'nonempty': return { ans: T - 1, wrong: [T, T - 2, 2 * n], expl: P.m === 'proper' ? `There are 2${sup(n)} = ${T} subsets; leaving out the set itself gives ${T - 1} proper subsets.` : `There are 2${sup(n)} = ${T} subsets; leaving out the empty set gives ${T - 1}.` }
      case 'rev': return { ans: n, wrong: [T / 2, n + 1, n - 1, 2 * n].filter((v) => v !== n), expl: `2ⁿ = ${T} gives n = ${n}.` }
      case 'contain': return { ans: T / 2, wrong: [T, n, T - 1], expl: `Fix the element in; each of the other ${n - 1} elements is in or out: 2${sup(n - 1)} = ${T / 2}.` }
      case 'pairs': return { ans: (n * (n - 1)) / 2, wrong: [n * n, n * (n - 1), T].filter((v) => v !== (n * (n - 1)) / 2), expl: `Two-element subsets: n(n − 1)/2 = ${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2}.` }
      default: return { ans: 2 ** k, wrong: [k, 2 * k, k * k].filter((v) => v !== 2 ** k), expl: `Each extra element doubles the number of subsets, so ${k} more elements multiply it by 2${sup(k)} = ${2 ** k}.` }
    }
  },
  items: [
    [1, (p) => `How many subsets does a set with ${p.n} elements have?`, { m: 'all' }],
    [1, (p) => `The number of proper subsets of {${LET.slice(0, p.n).join(', ')}} is:`, { m: 'proper' }],
    [2, (p) => `A set has ${2 ** p.n} subsets. How many elements does it have?`, { m: 'rev' }],
    [2, (p) => `How many subsets of {${Array.from({ length: p.n }, (_, i) => i + 1).join(', ')}} contain the element 1?`, { m: 'contain' }],
    [1, (p) => `How many members does the power set of a ${p.n}-element set have?`, { m: 'power' }],
    [2, (p) => `How many non-empty subsets does {${LET.slice(0, p.n).map((c) => c.toUpperCase()).join(', ')}} have?`, { m: 'nonempty' }],
    [2, (p) => `How many two-element subsets can be formed from a set of ${p.n} elements?`, { m: 'pairs' }],
    [2, (p) => `Set P has ${p.k} more elements than set Q. The number of subsets of P is how many times the number of subsets of Q?`, { m: 'times' }],
  ],
})

const setStr = (arr) => `{${[...arr].sort((a, b) => a - b).join(', ')}}`
const WORDS = ['PAKISTAN', 'ISLAMABAD', 'KARACHI', 'BALOCHISTAN', 'PESHAWAR', 'QUETTA', 'MULTAN', 'SIALKOT', 'HYDERABAD', 'LAHORE']
family('ga.sets.set-operations', 'ga.sets', {
  gen: (r) => {
    const pool = Array.from({ length: 12 }, (_, i) => i + 1)
    const A = r.sample(pool, r.int(4, 6)).sort((a, b) => a - b)
    const shared = r.sample(A, r.int(1, 3))
    const B = [...new Set([...shared, ...r.sample(pool.filter((v) => !A.includes(v)), r.int(2, 3))])].sort((a, b) => a - b)
    return { A, B, N: r.int(12, 30), k1: r.pick([2, 3, 4, 5]), k2: r.pick([3, 4, 6]), a: r.int(3, 15), b: r.int(4, 20), w: r.pick(WORDS) }
  },
  key: (p) => `${p.m}-${['primeodd', 'multiples'].includes(p.m) ? `${p.N}-${p.k1}-${p.k2}` : ['disjoint', 'subsetU'].includes(p.m) ? `${p.a}-${p.b}` : p.m === 'word' ? p.w : `${p.A.join('.')}-${p.B.join('.')}`}`,
  solve: (P) => {
    const { A, B, N, k1, k2, a, b, w } = P
    const I = A.filter((v) => B.includes(v)); const Un = [...new Set([...A, ...B])]; const AmB = A.filter((v) => !B.includes(v)); const BmA = B.filter((v) => !A.includes(v))
    const sets = (ans, ...cands) => { if (!ans.length || cands.some((c) => !c.length)) return null; return { ans: setStr(ans), wrong: cands.map(setStr).filter((t) => t !== setStr(ans)) } }
    switch (P.m) {
      case 'inter': { const o = sets(I, Un, AmB, BmA); return o && { ...o, expl: `A ∩ B contains the elements common to both: ${setStr(I)}.` } }
      case 'union': { const o = sets(Un, I, [...A, ...BmA.slice(1)], [...B, ...AmB.slice(1)]); return o && { ...o, expl: `A ∪ B contains every element of A or B: ${setStr(Un)}.` } }
      case 'diff': { const o = sets(AmB, BmA, I, A); return o && { ...o, expl: `P − Q keeps the elements of P that are not in Q: ${setStr(AmB)}.` } }
      case 'count': return { ans: Un.length, wrong: [A.length + B.length, I.length, A.length + B.length - 2 * I.length].filter((v) => v !== Un.length), expl: `A ∪ B = ${setStr(Un)}, which has ${Un.length} elements (${A.length} + ${B.length} − ${I.length}).` }
      case 'comp': { const U10 = Array.from({ length: 10 }, (_, i) => i + 1); const A10 = A.filter((v) => v <= 10); if (A10.length < 3) return null; const C = U10.filter((v) => !A10.includes(v)); P.A10 = A10; const o = sets(C, A10, C.slice(1), [...C, 11].filter((v) => v <= 10 || true).slice(0, C.length).concat(C.length < 10 ? [] : [])); if (!o) return null; const alt = [...C.slice(0, -1), A10[0]]; o.wrong = [setStr(A10), setStr(C.slice(1)), setStr(alt)].filter((t) => t !== setStr(C)); return { ...o, expl: `A′ contains the elements of U not in A: ${setStr(C)}.` } }
      case 'primeodd': { const pr = primesBelow(N); const od = []; for (let v = 1; v < N; v += 2) od.push(v); const In = pr.filter((v) => od.includes(v)); const o = sets(In, pr, od.filter((v) => !pr.includes(v)), [1, ...In]); return o && { ...o, expl: `The odd primes below ${N} are ${setStr(In)} (2 is prime but even).` } }
      case 'multiples': { if (k1 === k2) return null; const L = lcm(k1, k2); const c = Math.floor(N / L); if (c < 1) return null; return { ans: c, wrong: [Math.floor(N / k1) + Math.floor(N / k2), Math.floor(N / (k1 * k2)), c + 1, Math.floor(N / k1)].filter((v) => v !== c && v > 0), expl: `A ∩ B holds the common multiples, i.e. multiples of ${L} up to ${N}: there are ${c}.` } }
      case 'subset': { const S = A.slice(0, 3); const outside = Un.length < 12 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((v) => !A.includes(v)) : []; if (outside.length < 3) return null; return { ans: setStr(S.slice(0, 2)), wrong: [setStr([S[0], outside[0]]), setStr([outside[1], S[2]]), setStr([S[1], outside[2]])], expl: `Every element of ${setStr(S.slice(0, 2))} belongs to the given set; each other option contains an element that does not.` } }
      case 'sym': { const Sd = [...AmB, ...BmA]; const o = sets(Sd, Un, I, AmB); return o && { ...o, expl: `(A ∪ B) − (A ∩ B) = ${setStr(Un)} − ${setStr(I)} = ${setStr(Sd)}.` } }
      case 'disjoint': return { ans: a + b, wrong: [a * b, Math.abs(a - b), a + b - 1].filter((v) => v !== a + b && v > 0), expl: `Disjoint sets share no element, so n(A ∪ B) = ${a} + ${b} = ${a + b}.` }
      case 'word': { const d = new Set(w.split('')).size; return { ans: d, wrong: [w.length, d + 1, d - 1].filter((v) => v !== d), expl: `A set lists each distinct letter once: ${[...new Set(w.split(''))].join(', ')} — ${d} elements.` } }
      default: { const lo = Math.min(a, b); const hi = Math.max(a, b); if (lo === hi) return null; P.lo = lo; P.hi = hi; return { ans: hi, wrong: [lo + hi, lo, hi - lo], expl: `Since A ⊆ B, every element of A is already in B, so n(A ∪ B) = n(B) = ${hi}.` } }
    }
  },
  items: [
    [1, (p) => `If A = ${setStr(p.A)} and B = ${setStr(p.B)}, then A ∩ B is:`, { m: 'inter' }],
    [1, (p) => `A = ${setStr(p.A)} and B = ${setStr(p.B)}. What is A ∪ B?`, { m: 'union' }],
    [1, (p) => `If P = ${setStr(p.A)} and Q = ${setStr(p.B)}, find P − Q.`, { m: 'diff' }],
    [1, (p) => `How many elements are there in A ∪ B when A = ${setStr(p.A)} and B = ${setStr(p.B)}?`, { m: 'count' }],
    [2, (p) => `Let U = {1, 2, 3, …, 10} and A = ${setStr(p.A10)}. What is A′, the complement of A?`, { m: 'comp' }],
    [2, (p) => `If A = {x : x is a prime number less than ${p.N}} and B = {x : x is an odd number less than ${p.N}}, then A ∩ B is:`, { m: 'primeodd' }],
    [2, (p) => `Let A be the set of multiples of ${p.k1} up to ${p.N} and B the set of multiples of ${p.k2} up to ${p.N}. How many elements does A ∩ B have?`, { m: 'multiples' }],
    [1, (p) => `Which of the following is a subset of ${setStr(p.A)}?`, { m: 'subset' }],
    [2, (p) => `If A = ${setStr(p.A)} and B = ${setStr(p.B)}, what is (A ∪ B) − (A ∩ B)?`, { m: 'sym' }],
    [1, (p) => `If n(A) = ${p.a}, n(B) = ${p.b} and A and B are disjoint, what is n(A ∪ B)?`, { m: 'disjoint' }],
    [1, (p) => `A is the set of letters of the word ${p.w}. How many elements does A have?`, { m: 'word' }],
    [2, (p) => `If A ⊆ B, n(A) = ${p.lo} and n(B) = ${p.hi}, what is n(A ∪ B)?`, { m: 'subsetU' }],
  ],
})

family('ga.sets.percentage-two-set', 'ga.sets', {
  gen: (r) => {
    for (;;) {
      const pa = 5 * r.int(6, 16); const pb = 5 * r.int(5, 15); const pab = 5 * r.int(1, 8); const pn = 100 - (pa + pb - pab)
      if (pab >= Math.min(pa, pb) || pn < 5) continue
      return { pa, pb, pab, pn, U: 20 * r.int(5, 40), k: r.int(2, 12) }
    }
  },
  key: (p) => `${p.m}-${p.pa}-${p.pb}-${p.pab}${['count', 'total', 'testboth'].includes(p.m) ? `-${p.U}-${p.k}` : ''}`,
  fmt: (v, p) => (p.pct ? `${num(v)}%` : num(v)),
  solve: (P) => {
    const { pa, pb, pab, pn, U, k } = P
    const pct = { pct: true }
    switch (P.m) {
      case 'passBoth': Object.assign(P, pct); return { ans: pn, wrong: [100 - pa - pb, pab, pa + pb - pab, 100 - pab].filter((v) => v > 0), expl: `Failed in at least one: ${pa} + ${pb} − ${pab} = ${pa + pb - pab}%; passed in both: 100 − ${pa + pb - pab} = ${pn}%.` }
      case 'both': Object.assign(P, pct); return { ans: pab, wrong: [pa + pb - 100, pn, 100 - pn, pa + pb - pab].filter((v) => v > 0 && v !== pab), expl: `At least one: 100 − ${pn} = ${100 - pn}%; both = ${pa} + ${pb} − ${100 - pn} = ${pab}%.` }
      case 'count': { const c = (U * pn) / 100; if (!isInt(c)) return null; return { ans: c, wrong: [(U * pab) / 100, (U * (100 - pn)) / 100, (U * (100 - pa - pb + 2 * pab)) / 100].filter((v) => isInt(v) && v > 0 && v !== c), expl: `Neither = 100 − (${pa} + ${pb} − ${pab}) = ${pn}% of ${U} = ${c}.` } }
      case 'total': { const nb = k * pab; P.nb = nb; const T = (nb * 100) / pab; return { ans: T, wrong: [(nb * 100) / (100 - pn), nb * pab, (nb * 100) / pa].filter((v) => isInt(v) && v !== T), expl: `Both = ${pa} + ${pb} − (100 − ${pn}) = ${pab}%; ${nb} people are ${pab}%, so the total is ${nb} × 100 ÷ ${pab} = ${T}.` } }
      case 'onlyB': Object.assign(P, pct); return { ans: pb - pab, wrong: [pb, pab, pa - pab].filter((v) => v !== pb - pab), expl: `Married but not graduates: ${pb} − ${pab} = ${pb - pab}%.` }
      case 'union': Object.assign(P, pct); return { ans: pa + pb - pab, wrong: [pa + pb, pa + pb - 2 * pab, pn].filter((v) => v !== pa + pb - pab && v <= 100), expl: `At least one: ${pa} + ${pb} − ${pab} = ${pa + pb - pab}%.` }
      case 'testboth': { const c = (U * pab) / 100; if (!isInt(c)) return null; return { ans: c, wrong: [(U * pn) / 100, (U * (pa + pb - 100)) / 100, (U * (100 - pn)) / 100].filter((v) => isInt(v) && v > 0 && v !== c), expl: `Passed at least one part: 100 − ${pn} = ${100 - pn}%; both = ${pa} + ${pb} − ${100 - pn} = ${pab}% of ${U} = ${c}.` } }
      case 'every': { Object.assign(P, pct); const q = pa + pb - 100; if (q <= 0) return null; return { ans: q, wrong: [100 - pa, 100 - pb, (pa + pb) / 2].filter((v) => isInt(v) && v !== q), expl: `Everyone speaks at least one, so both = ${pa} + ${pb} − 100 = ${q}%.` } }
      case 'exact': Object.assign(P, pct); return { ans: pa + pb - 2 * pab, wrong: [pa + pb - pab, pa + pb, 100 - pab].filter((v) => v !== pa + pb - 2 * pab && v <= 100), expl: `Exactly one: (${pa} − ${pab}) + (${pb} − ${pab}) = ${pa + pb - 2 * pab}%.` }
      default: Object.assign(P, pct); return { ans: pa - pab, wrong: [pa, pab, 100 - pn - pb, pa - pn].filter((v) => v > 0 && v !== pa - pab), expl: `Both = ${pa} + ${pb} − (100 − ${pn}) = ${pab}%; only P = ${pa} − ${pab} = ${pa - pab}%.` }
    }
  },
  items: [
    [3, (p) => `In an examination, ${p.pa}% of candidates failed in English, ${p.pb}% failed in Mathematics and ${p.pab}% failed in both. What percentage passed in both subjects?`, { m: 'passBoth' }],
    [3, (p) => `In a town, ${p.pa}% of people read newspaper X, ${p.pb}% read newspaper Y and ${p.pn}% read neither. What percentage read both?`, { m: 'both' }],
    [3, (p) => `${p.pa}% of the ${p.U} students of a college play cricket and ${p.pb}% play hockey; ${p.pab}% play both. How many students play neither game?`, { m: 'count' }],
    [3, (p) => `In a survey, ${p.pa}% of those asked liked tea, ${p.pb}% liked coffee and ${p.pn}% liked neither. If ${p.nb} people liked both, how many people were surveyed?`, { m: 'total' }],
    [2, (p) => `Of the employees of a firm, ${p.pa}% are graduates, ${p.pb}% are married and ${p.pab}% are both. What percentage are married but not graduates?`, { m: 'onlyB' }],
    [2, (p) => `In a village, ${p.pa}% of families have a buffalo, ${p.pb}% have a cow and ${p.pab}% have both. What percentage of families have at least one of these animals?`, { m: 'union' }],
    [3, (p) => `A test was taken by ${p.U} students. ${p.pa}% passed Part A, ${p.pb}% passed Part B and ${p.pn}% failed both parts. How many students passed both parts?`, { m: 'testboth' }],
    [2, (p) => `${p.pa}% of a group can speak English and ${p.pb}% can speak Arabic. Every member speaks at least one of the two. What percentage speak both?`, { m: 'every' }],
    [2, (p) => `In a class, ${p.pa}% of students like science, ${p.pb}% like art and ${p.pab}% like both. What percentage like exactly one of the two?`, { m: 'exact' }],
    [3, (p) => `Among the voters of a constituency, ${p.pa}% support scheme P and ${p.pb}% support scheme Q, while ${p.pn}% support neither. What percentage support only scheme P?`, { m: 'onlyP' }],
  ],
})

// ===========================================================================
// ga.number-properties — 120
// ===========================================================================
const primesBetween = (a, b) => primesBelow(b).filter((p) => p > a)
const nextPrime = (n) => { let v = n + 1; while (!isPrime(v)) v++; return v }
const prevPrime = (n) => { let v = n - 1; while (!isPrime(v)) v--; return v }
const primeFactors = (n) => { const out = []; let m = n; for (let p = 2; p * p <= m; p++) while (m % p === 0) { out.push(p); m /= p } if (m > 1) out.push(m); return out }
const hcfAll = (...xs) => xs.reduce((g, v) => gcd(g, v))
const lcmAll = (...xs) => xs.reduce((l, v) => lcm(l, v))
const COMPOSITE_LOOKALIKES = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 111, 117, 119, 121, 133, 143, 161, 169]

family('ga.number-properties.sum-of-primes', 'ga.number-properties', {
  gen: (r) => ({ N: r.int(12, 40), a: r.int(10, 40), k: r.int(4, 9), n: r.pick([30, 42, 60, 66, 70, 78, 84, 90, 102, 105, 110, 126, 130, 132, 140, 154, 165, 170, 182, 195, 210]) }),
  key: (p) => `${p.m}-${({ below: p.N, between: p.a, first: p.k, factors: p.n, odd: p.N, twodigit: p.N + 30, around: p.N, fixed: 0 })[p.m]}`,
  solve: (P) => {
    const { N, a, k, n } = P
    switch (P.m) {
      case 'below': { const ps = primesBelow(N); const s = sum(ps); return { ans: s, wrong: [s + 1, s - 2, s - ps[ps.length - 1]], expl: `Primes below ${N}: ${ps.join(', ')}; their sum is ${s}.` } }
      case 'between': { const b = a + 12; const ps = primesBetween(a, b); if (ps.length < 2) return null; P.b = b; const s = sum(ps); return { ans: s, wrong: [s - ps[0], s + nextPrime(b - 1), s - ps[ps.length - 1], s + 1].filter((v) => v !== s), expl: `The primes between ${a} and ${b} are ${ps.join(', ')}; their sum is ${s}.` } }
      case 'first': { const ps = primesBelow(100).slice(0, k + 1); const s = sum(ps.slice(0, k)); return { ans: s, wrong: [1 + sum(ps.slice(0, k - 1)), s - 2 + ps[k], s + ps[k]], expl: `The first ${k} primes are ${ps.slice(0, k).join(', ')}; their sum is ${s}.` } }
      case 'factors': { const f = primeFactors(n); const d = [...new Set(f)]; const s = sum(d); return { ans: s, wrong: [sum(f), Math.max(...d), s + 1].filter((v) => v !== s), expl: `${n} = ${f.join(' × ')}; the distinct prime factors ${d.join(', ')} add up to ${s}.` } }
      case 'odd': { const ps = primesBelow(N).slice(1); const s = sum(ps); return { ans: s, wrong: [s + 2, s + 1, s - ps[ps.length - 1]], expl: `Odd primes below ${N}: ${ps.join(', ')} (2 is excluded); the sum is ${s}.` } }
      case 'twodigit': { const M = N + 30; const ps = primesBelow(M).filter((p) => p >= 10); const s = sum(ps); return { ans: s, wrong: [s - 11, s + 7, s + nextPrime(M - 1)].filter((v) => v !== s), expl: `The two-digit primes below ${M} are ${ps.join(', ')}; their sum is ${s}.` } }
      case 'around': { if (isPrime(N)) return null; const lp = prevPrime(N); const sp = nextPrime(N); return { ans: lp + sp, wrong: [2 * N, lp + sp + 2, lp + sp - 2], expl: `The largest prime below ${N} is ${lp} and the smallest above it is ${sp}; ${lp} + ${sp} = ${lp + sp}.` } }
      default: return { ans: 77, wrong: [70, 99, 91], expl: `The smallest two-digit prime is 11 and the largest single-digit prime is 7; 11 × 7 = 77.` }
    }
  },
  items: [
    [2, (p) => `What is the sum of the prime numbers less than ${p.N}?`, { m: 'below' }],
    [2, (p) => `Find the sum of all prime numbers between ${p.a} and ${p.b}.`, { m: 'between' }],
    [2, (p) => `The sum of the first ${p.k} prime numbers is:`, { m: 'first' }],
    [2, (p) => `What is the sum of the distinct prime factors of ${p.n}?`, { m: 'factors' }],
    [2, (p) => `Add together all the odd prime numbers below ${p.N}. The total is:`, { m: 'odd' }],
    [2, (p) => `What do the two-digit prime numbers less than ${p.N + 30} add up to?`, { m: 'twodigit' }],
    [2, (p) => `The largest prime below ${p.N} is added to the smallest prime above ${p.N}. What is the result?`, { m: 'around' }],
    [1, () => `What is the product of the smallest two-digit prime and the largest single-digit prime?`, { m: 'fixed' }],
  ],
})

family('ga.number-properties.primes', 'ga.number-properties', {
  gen: (r) => ({ a: r.int(10, 80), N: r.int(15, 60), d: r.pick([1, 3, 7, 9]), pick: r.int(0, 1000) }),
  key: (p) => `${p.m}-${({ between: p.a, below: p.N, list: p.pick, which: p.pick, not: p.pick, units: p.d, next: p.N + 40, gap: p.a })[p.m]}`,
  solve: (P) => {
    const { a, N, d, pick } = P
    const rr = makeRng(`primes-${P.m}-${pick}`)
    switch (P.m) {
      case 'between': { const b = a + 20; P.b = b; const c = primesBetween(a, b).length; return { ans: c, wrong: [c + 1, c - 1, c + 2].filter((v) => v > 0), expl: `The primes between ${a} and ${b} are ${primesBetween(a, b).join(', ')}: ${c} of them.` } }
      case 'below': { const ps = primesBelow(N); return { ans: ps.length, wrong: [ps.length + 1, ps.length - 1, ps.length + 2], expl: `Primes below ${N}: ${ps.join(', ')} — ${ps.length} in all.` } }
      case 'list': { const pr = rr.sample(primesBetween(10, 100), rr.int(2, 3)); const co = rr.sample(COMPOSITE_LOOKALIKES.filter((v) => v < 100), 6 - pr.length); const L = rr.shuffle([...pr, ...co]); P.L = L; return { ans: pr.length, wrong: [pr.length + 1, pr.length + 2, pr.length - 1, 6].filter((v) => v > 0 && v !== pr.length), expl: `Only ${pr.sort((x, y) => x - y).join(' and ')} are prime; the others (${co.sort((x, y) => x - y).map((v) => `${v} = ${primeFactors(v).join(' × ')}`).join(', ')}) are composite.` } }
      case 'which': { const pr = rr.pick(primesBetween(40, 140)); const co = rr.sample(COMPOSITE_LOOKALIKES.filter((v) => v > 40), 3); return { ans: pr, wrong: co, expl: `${pr} has no divisor other than 1 and itself; ${co.map((v) => `${v} = ${primeFactors(v).join(' × ')}`).join(', ')}.` } }
      case 'not': { const co = rr.pick(COMPOSITE_LOOKALIKES.filter((v) => v > 50)); const pr = rr.sample(primesBetween(50, 150), 3); return { ans: co, wrong: pr, expl: `${co} = ${primeFactors(co).join(' × ')}, so it is not prime; the other three are prime.` } }
      case 'units': { const ps = primesBetween(9, 100).filter((p) => p % 10 === d); return { ans: ps.length, wrong: [ps.length + 1, ps.length - 1, 9], expl: `Two-digit primes ending in ${d}: ${ps.join(', ')} — ${ps.length} of them.` } }
      case 'next': { const M = N + 40; if (isPrime(M)) return null; const np = nextPrime(M); return { ans: np, wrong: [M + 1 === np ? M + 3 : M + 1, np + 2, prevPrime(M)].filter((v) => v !== np), expl: `Checking ${M + 1}, ${M + 2}, …, the first prime is ${np}.` } }
      default: { const b = a + 25; P.b = b; const ps = primesBetween(a, b); if (ps.length < 2) return null; const g = ps[ps.length - 1] - ps[0]; return { ans: g, wrong: [b - a, g + 2, g - 2].filter((v) => v > 0 && v !== g), expl: `Between ${a} and ${b} the smallest prime is ${ps[0]} and the largest is ${ps[ps.length - 1]}; the difference is ${g}.` } }
    }
  },
  items: [
    [1, (p) => `How many prime numbers are there between ${p.a} and ${p.b}?`, { m: 'between' }],
    [1, (p) => `How many prime numbers are less than ${p.N}?`, { m: 'below' }],
    [1, (p) => `How many of the numbers ${p.L.slice(0, 5).join(', ')} and ${p.L[5]} are prime?`, { m: 'list' }],
    [1, () => `Which of the following is a prime number?`, { m: 'which' }],
    [1, () => `Which one of these numbers is NOT prime?`, { m: 'not' }],
    [2, (p) => `How many two-digit prime numbers have ${p.d} as their units digit?`, { m: 'units' }],
    [1, (p) => `What is the smallest prime number greater than ${p.N + 40}?`, { m: 'next' }],
    [2, (p) => `What is the difference between the largest and the smallest prime numbers lying between ${p.a} and ${p.b}?`, { m: 'gap' }],
  ],
})

family('ga.number-properties.hcf', 'ga.number-properties', {
  gen: (r) => { const g = r.int(2, 18); let x = r.int(2, 9); let y = r.int(2, 11); if (gcd(x, y) !== 1 || x === y) y = x + 1; const z = r.int(2, 13); return { g, x, y, z, e1: r.int(1, 3), e2: r.int(2, 5), pick: r.int(0, 999) } },
  key: (p) => `${p.m}-${p.g}-${p.x}-${p.y}${['three', 'largest', 'poly'].includes(p.m) ? `-${p.z}` : ''}${p.m === 'poly' ? `-${p.e1}-${p.e2}` : ''}${p.m === 'coprime' ? `-${p.pick}` : ''}`,
  solve: (P) => {
    const { g, x, y, z, e1, e2, pick } = P
    const A = g * x; const B = g * y
    const std = (ans, L) => [...new Set([L, ans * 2, ans / 2, gcd(A, B) === ans ? Math.min(A, B) : ans + 1].filter((v) => isInt(v) && v > 0 && v !== ans))]
    switch (P.m) {
      case 'two': case 'div': case 'gcd': case 'largediv': { const h = gcd(A, B); if (h !== g) return null; return { ans: h, wrong: std(h, lcm(A, B)), expl: `${A} = ${g} × ${x} and ${B} = ${g} × ${y}, with ${x} and ${y} sharing no factor, so the HCF is ${g}.` } }
      case 'three': { const C = g * z; const h = hcfAll(A, B, C); if (h !== g) return null; P.C = C; return { ans: h, wrong: [gcd(A, B) !== h ? gcd(A, B) : h * 2, h / 2, lcmAll(x, y, z) * g, h + 1].filter((v) => isInt(v) && v > 0 && v !== h && v < 10000), expl: `${A} = ${g}×${x}, ${B} = ${g}×${y}, ${C} = ${g}×${z}; the HCF is ${g}.` } }
      case 'largest': { const C = g * z; const h = hcfAll(A, B, C); if (h !== g) return null; P.C = C; return { ans: h, wrong: [2 * h, h / 2, gcd(A, B) !== h ? gcd(A, B) : h + 2, h - 1].filter((v) => isInt(v) && v > 0 && v !== h), expl: `The largest common factor is the HCF: ${A}, ${B} and ${C} are ${g} × ${x}, ${g} × ${y} and ${g} × ${z}, so it is ${g}.` } }
      case 'const': return { ans: 2, wrong: [1, 4, 8], expl: `Two consecutive even numbers are 2k and 2k + 2; both are divisible by 2, and k and k + 1 share no factor, so the HCF is 2.` }
      case 'lowest': { if (g < 2) return null; const d0 = primeFactors(g)[0]; const partial = d0 < g ? `${A / d0}/${B / d0}` : null; return { ans: `${x}/${y}`, wrong: [partial, `${y}/${x}`, `${x + 1}/${y + 1}`, `${x}/${B}`].filter((t) => t && t !== `${x}/${y}`), expl: `The HCF of ${A} and ${B} is ${g}; dividing both by ${g} gives ${x}/${y}.` } }
      case 'coprime': {
        const rr = makeRng(`cop-${pick}`)
        const good = rr.pick([[8, 15], [9, 14], [14, 25], [16, 21], [12, 35], [15, 28], [20, 27], [18, 25], [21, 32], [22, 45], [26, 33], [35, 48]])
        const bad = rr.sample([[12, 18], [14, 21], [15, 25], [16, 24], [18, 27], [21, 35], [22, 33], [24, 36], [26, 39], [28, 42], [33, 55], [34, 51]], 3)
        return { ans: `${good[0]} and ${good[1]}`, wrong: bad.map(([u, v]) => `${u} and ${v}`), expl: `${good[0]} = ${primeFactors(good[0]).join(' × ')} and ${good[1]} = ${primeFactors(good[1]).join(' × ')} share no prime factor; each other pair has a common factor (${bad.map(([u, v]) => gcd(u, v)).join(', ')} respectively).` }
      }
      default: { const a = g; const b = g * x; if (x < 2) return null; const lo = Math.min(e1, e2); const ans = mono(gcd(a, b), [['x', lo]]); return { ans, wrong: [mono(lcm(a, b), [['x', Math.max(e1, e2)]]), mono(gcd(a, b), [['x', Math.max(e1, e2)]]), mono(1, [['x', lo]]), mono(a * b, [['x', e1 + e2]])].filter((t) => t !== ans), expl: `HCF of ${a} and ${b} is ${gcd(a, b)}; the lower power of x is x${lo === 1 ? '' : sup(lo)}; so the HCF is ${ans}.`, poly: [a, b] } }
    }
  },
  items: [
    [1, (p) => `What is the HCF of ${p.g * p.x} and ${p.g * p.y}?`, { m: 'two' }],
    [1, (p) => `Find the highest common factor of ${p.g * p.x}, ${p.g * p.y} and ${p.C}.`, { m: 'three' }],
    [1, (p) => `The greatest number that divides both ${p.g * p.x} and ${p.g * p.y} exactly is:`, { m: 'div' }],
    [1, () => `The HCF of any two consecutive even numbers is:`, { m: 'const' }],
    [1, (p) => `The greatest common divisor of ${p.g * p.x} and ${p.g * p.y} is:`, { m: 'gcd' }],
    [1, (p) => `Express ${p.g * p.x}/${p.g * p.y} in its lowest terms.`, { m: 'lowest' }],
    [1, (p) => `What is the largest number that is a factor of each of ${p.g * p.x}, ${p.g * p.y} and ${p.C}?`, { m: 'largest' }],
    [1, () => `Which of the following pairs of numbers has an HCF of 1?`, { m: 'coprime' }],
    [2, (p) => `Find the HCF of ${mono(p.g, [['x', p.e1]])} and ${mono(p.g * p.x, [['x', p.e2]])}.`, { m: 'poly' }],
    [1, (p) => `By what largest number can both ${p.g * p.x} and ${p.g * p.y} be divided without leaving a remainder?`, { m: 'largediv' }],
  ],
})

family('ga.number-properties.lcm', 'ga.number-properties', {
  gen: (r) => ({ a: r.int(3, 18), b: r.int(4, 24), c: r.int(5, 16), pick: r.int(0, 999) }),
  key: (p) => `${p.m}-${p.a}-${p.b}${['three', 'exact', 'four'].includes(p.m) ? `-${p.c}` : ''}`,
  solve: (P) => {
    const { a, b, c } = P
    const L2 = lcm(a, b); const H2 = gcd(a, b)
    switch (P.m) {
      case 'two': { if (L2 === a * b || a === b || L2 === Math.max(a, b)) return null; return { ans: L2, wrong: [a * b, H2, L2 * 2, L2 / 2].filter((v) => isInt(v) && v !== L2), expl: `LCM = ${a} × ${b} ÷ HCF(${H2}) = ${L2}.` } }
      case 'three': case 'exact': { const L = lcmAll(a, b, c); if (L > 800 || new Set([a, b, c]).size < 3 || L === a * b * c) return null; return { ans: L, wrong: [a * b * c, L * 2, L / 2, lcm(a, b)].filter((v) => isInt(v) && v !== L && v < 100000), expl: `The LCM of ${a}, ${b} and ${c} is ${L}; it is the smallest number all three divide.` } }
      case 'poly': { if (a === b) return null; const ans = mono(L2, [['x', 2]]); return { ans, wrong: [mono(a * b, [['x', 3]]), mono(H2, [['x', 1]]), mono(L2, [['x', 3]]), mono(a * b, [['x', 2]])].filter((t) => t !== ans), expl: `LCM of ${a} and ${b} is ${L2}; the higher power of x is x²; so the LCM is ${ans}.` } }
      case 'square': { const f = primeFactors(L2); const cnt = {}; f.forEach((p) => { cnt[p] = (cnt[p] ?? 0) + 1 }); let S = 1; for (const [p, e] of Object.entries(cnt)) S *= Number(p) ** (e % 2 ? e + 1 : e); if (S === L2 || S > 10000) return null; return { ans: S, wrong: [L2, L2 * L2 > 100000 ? L2 * 2 : L2 * L2, L2 * 2 === S ? L2 * 4 : L2 * 2].filter((v) => v !== S), expl: `LCM(${a}, ${b}) = ${L2} = ${f.join(' × ')}; making every prime power even gives ${S}.` } }
      case 'four': { const L = lcmAll(a, b, c); if (L > 300 || L < 20) return null; const v = Math.ceil(1000 / L) * L; return { ans: v, wrong: [v - L, v + L, 1000 + L, L * 10].filter((w) => w !== v && w >= 1000 && w <= 9999), expl: `LCM(${a}, ${b}, ${c}) = ${L}; the first multiple of ${L} from 1000 upwards is ${v}.` } }
      case 'coprime': { if (H2 !== 1) return null; return { ans: a * b, wrong: [a + b, 1, Math.max(a, b)], expl: `Co-prime numbers share no factor except 1, so their LCM is their product: ${a} × ${b} = ${a * b}.` } }
      case 'fraction': { const n1 = a % 9 + 1; const n2 = b % 9 + 2; const d1 = c; const d2 = c + (a % 5) + 1; if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1 || n1 === n2) return null; P.f = [n1, d1, n2, d2]; const ans = fr(lcm(n1, n2), gcd(d1, d2)); return { ans, wrong: [fr(lcm(n1, n2), lcm(d1, d2)), fr(gcd(n1, n2), lcm(d1, d2)), fr(n1 * n2, d1 * d2)].filter((t) => t !== ans), expl: `LCM of fractions = LCM of numerators ÷ HCF of denominators = ${lcm(n1, n2)}/${gcd(d1, d2)}${ans === `${lcm(n1, n2)}/${gcd(d1, d2)}` ? '' : ` = ${ans}`}.` } }
      case 'largest3': { if (L2 > 300 || L2 < 12) return null; const v = Math.floor(999 / L2) * L2; return { ans: v, wrong: [v - L2, Math.floor(999 / (a * b)) * a * b, v - 2 * L2, 999 - (999 % Math.max(a, b))].filter((w) => w !== v && w >= 100 && w <= 999), expl: `LCM(${a}, ${b}) = ${L2}; the largest multiple of ${L2} below 1000 is ${v}.` } }
      default: { if (H2 === 1 || L2 === Math.max(a, b)) return null; return { ans: L2 / H2, wrong: [L2, H2, (a * b) / H2 / 2].filter((v) => isInt(v) && v !== L2 / H2), expl: `LCM = ${L2} and HCF = ${H2}; ${L2} ÷ ${H2} = ${L2 / H2}.` } }
    }
  },
  items: [
    [1, (p) => `What is the LCM of ${p.a} and ${p.b}?`, { m: 'two' }],
    [1, (p) => `Find the lowest common multiple of ${p.a}, ${p.b} and ${p.c}.`, { m: 'three' }],
    [1, (p) => `The smallest number that is exactly divisible by ${p.a}, ${p.b} and ${p.c} is:`, { m: 'exact' }],
    [2, (p) => `What is the least common multiple of ${p.a}x and ${p.b}x²?`, { m: 'poly' }],
    [3, (p) => `What is the smallest perfect square that is divisible by both ${p.a} and ${p.b}?`, { m: 'square' }],
    [3, (p) => `What is the smallest four-digit number that is divisible by ${p.a}, ${p.b} and ${p.c}?`, { m: 'four' }],
    [1, (p) => `The numbers ${p.a} and ${p.b} are co-prime. Their LCM is:`, { m: 'coprime' }],
    [2, (p) => `Find the LCM of the fractions ${p.f[0]}/${p.f[1]} and ${p.f[2]}/${p.f[3]}.`, { m: 'fraction' }],
    [2, (p) => `The largest three-digit number that is a multiple of both ${p.a} and ${p.b} is:`, { m: 'largest3' }],
    [2, (p) => `The LCM of ${p.a} and ${p.b} is how many times their HCF?`, { m: 'ratio' }],
  ],
})
const fmtTime = (h, m) => { const H = ((h + 11) % 12) + 1; return `${H}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}` }
family('ga.number-properties.lcm-word-problem', 'ga.number-properties', {
  gen: (r) => ({ a: r.int(3, 20), b: r.int(4, 24), c: r.int(5, 18), r0: r.int(1, 5), k: r.int(1, 3), M: r.int(100, 600), nm: r.pick(NAMES), nm2: r.pick(NAMES) }),
  key: (p) => `${p.m}-${p.a}-${p.b}-${p.c}-${p.r0}-${p.k}`,
  fact: (p) => `${p.m}-${p.a}-${p.b}-${p.c}`,
  solve: (P) => {
    const { a, b, c, r0, k, M } = P
    const L3 = lcmAll(a, b, c); const L2 = lcm(a, b)
    const three = () => new Set([a, b, c]).size === 3 && L3 <= 400 && L3 !== a * b * c && L3 !== Math.max(a, b, c)
    const two = () => a !== b && L2 !== a * b && L2 !== Math.max(a, b) && L2 <= 240
    switch (P.m) {
      case 'bells': if (!three()) return null; return { ans: L3, wrong: [a * b * c, a + b + c, L3 / 2, L3 * 2].filter((v) => isInt(v) && v !== L3 && v < 100000), expl: `They ring together again after LCM(${a}, ${b}, ${c}) = ${L3} minutes.` }
      case 'lights': if (!two()) return null; return { ans: L2, wrong: [a * b, gcd(a, b), a + b, L2 * 2].filter((v) => v !== L2), expl: `The lights next change together after LCM(${a}, ${b}) = ${L2} seconds.` }
      case 'rem': { if (!three() || r0 >= Math.min(a, b, c)) return null; return { ans: L3 + r0, wrong: [L3, L3 - r0, a * b * c + r0].filter((v) => v !== L3 + r0 && v < 100000), expl: `LCM(${a}, ${b}, ${c}) = ${L3}; adding the remainder ${r0} gives ${L3 + r0}.` } }
      case 'bus': { if (!two() || L2 > 150) return null; const t = 7 * 60 + L2; return { ans: fmtTime(Math.floor(t / 60), t % 60), wrong: [7 * 60 + a * b, 7 * 60 + a + b, 7 * 60 + L2 * 2].filter((v) => v !== t && v < 24 * 60).map((v) => fmtTime(Math.floor(v / 60), v % 60)), expl: `They leave together every LCM(${a}, ${b}) = ${L2} minutes, so next at ${fmtTime(Math.floor(t / 60), t % 60)}.` } }
      case 'track': { const A2 = a * 5 + 20; const B2 = b * 5 + 20; if (A2 === B2) return null; const L = lcm(A2, B2); if (L === A2 * B2 || L > 1500 || L === Math.max(A2, B2)) return null; P.A2 = A2; P.B2 = B2; return { ans: L, wrong: [A2 * B2, A2 + B2, L / 2, L * 2].filter((v) => isInt(v) && v !== L), expl: `They meet at the start after LCM(${A2}, ${B2}) = ${L} seconds.` } }
      case 'sweets': if (!three()) return null; return { ans: L3, wrong: [a * b * c, a + b + c, L3 * 2, L3 / 2].filter((v) => isInt(v) && v !== L3 && v < 100000), expl: `The number must be a multiple of ${a}, ${b} and ${c}; the least is LCM = ${L3}.` }
      case 'tiles': if (!two()) return null; return { ans: L2, wrong: [a * b, a + b, gcd(a, b), 2 * L2].filter((v) => v !== L2), expl: `The side must be a multiple of both ${a} and ${b}; the smallest is LCM = ${L2} cm.`, fmt: (v) => `${v} cm` }
      case 'short': { if (!three() || k >= Math.min(a, b, c)) return null; return { ans: L3 - k, wrong: [L3 + k, L3, L3 - 2 * k].filter((v) => v !== L3 - k && v > 0), expl: `Each remainder is ${k} short of the divisor, so the number + ${k} is a common multiple: LCM(${a}, ${b}, ${c}) − ${k} = ${L3 - k}.` } }
      case 'flash': { if (!three() || L3 > 300 || L3 < 20 || 3600 % L3 === 0) return null; const n = Math.floor(3600 / L3); return { ans: n, wrong: [n + 1, n - 1, Math.floor(3600 / (a + b + c))].filter((v) => v !== n && v > 0), expl: `They flash together every ${L3} seconds; 3600 ÷ ${L3} = ${num(3600 / L3)}, so ${n} times in an hour.` } }
      default: { if (!three() || L3 > 200) return null; const v = (Math.floor(M / L3) + 1) * L3; P.M2 = v - L3 + Math.max(1, Math.floor(L3 / 3)); return { ans: v, wrong: [v - L3, v + L3, L3].filter((w) => w !== v && w > 0), expl: `The number must be a multiple of LCM(${a}, ${b}, ${c}) = ${L3}; the first such multiple above ${P.M2} is ${v}.` } }
    }
  },
  items: [
    [2, (p) => `Three bells ring at intervals of ${p.a}, ${p.b} and ${p.c} minutes. If they ring together at 8:00 a.m., after how many minutes will they next ring together?`, { m: 'bells' }],
    [2, (p) => `Two traffic signals change every ${p.a} and ${p.b} seconds. If they change together now, after how many seconds will they next change together?`, { m: 'lights' }],
    [2, (p) => `Find the least number which, when divided by ${p.a}, ${p.b} and ${p.c}, leaves a remainder of ${p.r0} in each case.`, { m: 'rem' }],
    [2, (p) => `Buses leave a terminal every ${p.a} minutes on route A and every ${p.b} minutes on route B. If both leave at 7:00 a.m., when do they next leave together?`, { m: 'bus' }],
    [2, (p) => `${p.nm} and ${p.nm2} run round a circular track, taking ${p.A2} and ${p.B2} seconds per lap. Starting together, after how many seconds will they first be at the starting point together again?`, { m: 'track' }],
    [2, (p) => `What is the least number of sweets that can be shared equally among ${p.a}, ${p.b} or ${p.c} children with none left over?`, { m: 'sweets' }],
    [2, (p) => `Tiles measuring ${p.a} cm by ${p.b} cm are laid side by side, all the same way round, to form a square. What is the smallest possible side of the square?`, { m: 'tiles' }],
    [3, (p) => `A number leaves remainders of ${p.a - p.k}, ${p.b - p.k} and ${p.c - p.k} when divided by ${p.a}, ${p.b} and ${p.c} respectively. What is the smallest such number?`, { m: 'short' }],
    [3, (p) => `Three lighthouses flash every ${p.a}, ${p.b} and ${p.c} seconds. After flashing together once, how many more times will they flash together in the next hour?`, { m: 'flash' }],
    [3, (p) => `A gardener can plant his saplings in rows of ${p.a}, ${p.b} or ${p.c} with none left over. If he has more than ${p.M2} saplings, what is the least number he can have?`, { m: 'garden' }],
  ],
})

family('ga.number-properties.hcf-word-problem', 'ga.number-properties', {
  gen: (r) => { const g = r.int(3, 25); let x = r.int(2, 9); let y = r.int(3, 12); if (gcd(x, y) !== 1 || x === y) y = x + 1; let z = r.int(2, 11); if (gcd(gcd(x, y), z) !== 1) z = 1; return { g, x, y, z, r1: r.int(1, 6), r2: r.int(1, 6) } },
  key: (p) => `${p.m}-${p.g}-${p.x}-${p.y}-${p.z}-${p.r1}-${p.r2}`,
  fact: (p) => `${p.m}-${p.g}-${p.x}-${p.y}`,
  solve: (P) => {
    const { g, x, y, z, r1, r2 } = P
    const A = g * x; const B = g * y; const C = g * z
    const std = [lcm(A, B), g * 2, g / 2, A - B > 0 ? A - B : B - A].filter((v) => isInt(v) && v > 0 && v !== g)
    switch (P.m) {
      case 'rope': return { ans: g, wrong: std, fmt: (v) => `${v} m`, expl: `The piece length must divide both ${A} and ${B}; the greatest is HCF = ${g} m.` }
      case 'tile': return { ans: g, wrong: std, fmt: (v) => `${v} cm`, expl: `The tile side must divide ${A} and ${B}; the largest is HCF(${A}, ${B}) = ${g} cm.` }
      case 'rem': { if (r1 >= g || r2 >= g || r1 === r2) return null; P.A1 = A + r1; P.B1 = B + r2; if (gcd(P.A1, P.B1) === g) return null; return { ans: g, wrong: [gcd(P.A1, P.B1), g + r1, std[0]].filter((v) => v !== g), expl: `Subtract the remainders: ${A + r1} − ${r1} = ${A} and ${B + r2} − ${r2} = ${B}; HCF(${A}, ${B}) = ${g}.` } }
      case 'boxes': return { ans: g, wrong: [x + y, std[0], g * 2, x * y].filter((v) => v !== g), expl: `Each box gets the same number of pens and of pencils, so the number of boxes divides both ${A} and ${B}; the largest is HCF = ${g}.` }
      case 'count': { const n = x * y; return { ans: n, wrong: [g, (A * B) / (g), x + y, n * 2].filter((v) => v !== n), expl: `Largest tile side = HCF(${A}, ${B}) = ${g}; tiles needed = (${A} ÷ ${g}) × (${B} ÷ ${g}) = ${x} × ${y} = ${n}.` } }
      case 'same': { if (r1 >= g || z === x || z === y) return null; P.T = [A + r1, B + r1, C + r1]; if (hcfAll(...P.T) === g) return null; return { ans: g, wrong: [hcfAll(...P.T), g + r1, g * 2].filter((v) => v !== g), expl: `Subtract ${r1} from each: ${A}, ${B}, ${C}; their HCF is ${g}.` } }
      case 'tanks': { if (z === x || z === y) return null; return { ans: g, wrong: [lcmAll(A, B, C) > 5000 ? g * 3 : lcmAll(A, B, C), g * 2, gcd(A, B) !== g ? gcd(A, B) : g + 1].filter((v) => v !== g), fmt: (v) => `${v} litres`, expl: `The bucket must divide ${A}, ${B} and ${C} exactly; the largest is HCF = ${g} litres.` } }
      default: { const n = x + y; return { ans: n, wrong: [g, x * y, A + B].filter((v) => v !== n), expl: `The largest group size is HCF(${A}, ${B}) = ${g}; that gives ${A} ÷ ${g} + ${B} ÷ ${g} = ${x} + ${y} = ${n} groups.` } }
    }
  },
  items: [
    [2, (p) => `Two ropes of lengths ${p.g * p.x} m and ${p.g * p.y} m are to be cut into pieces of equal length with nothing left over. What is the greatest possible length of each piece?`, { m: 'rope' }],
    [2, (p) => `A hall ${p.g * p.x} cm long and ${p.g * p.y} cm wide is to be paved with identical square tiles, without cutting any. What is the largest possible side of a tile?`, { m: 'tile' }],
    [3, (p) => `What is the greatest number that divides ${p.A1} and ${p.B1} leaving remainders ${p.r1} and ${p.r2} respectively?`, { m: 'rem' }],
    [2, (p) => `${p.g * p.x} pens and ${p.g * p.y} pencils are to be packed into identical gift boxes with nothing left over. What is the largest number of boxes that can be made?`, { m: 'boxes' }],
    [3, (p) => `A floor ${p.g * p.x} dm by ${p.g * p.y} dm is covered with the largest possible identical square tiles. How many tiles are needed?`, { m: 'count' }],
    [3, (p) => `Find the greatest number that divides ${p.T[0]}, ${p.T[1]} and ${p.T[2]} leaving the same remainder ${p.r1} each time.`, { m: 'same' }],
    [2, (p) => `Three tanks hold ${p.g * p.x}, ${p.g * p.y} and ${p.g * p.z} litres of water. What is the capacity of the largest bucket that can empty each tank in a whole number of fillings?`, { m: 'tanks' }],
    [3, (p) => `${p.g * p.x} boys and ${p.g * p.y} girls are to be split into groups of equal size, each group containing only boys or only girls. What is the least number of groups possible?`, { m: 'groups' }],
  ],
})

family('ga.number-properties.hcf-lcm-product', 'ga.number-properties', {
  gen: (r) => { const h = r.int(2, 15); let p = r.int(2, 9); let q = r.int(3, 11); if (gcd(p, q) !== 1 || p === q) q = p + 1; return { h, p, q } },
  key: (p) => `${p.m}-${p.h}-${p.p}-${p.q}`,
  solve: (P) => {
    const { h, p, q } = P
    const x = h * p; const y = h * q; const L = h * p * q; const Pr = x * y
    switch (P.m) {
      case 'other': case 'other2': return { ans: y, wrong: [L / h, (h * L) / (x * 2), L - x, x].filter((v) => isInt(v) && v !== y && v > 0), expl: `HCF × LCM = product of the numbers: ${h} × ${L} = ${x} × other, so the other is ${h * L} ÷ ${x} = ${y}.` }
      case 'lcm': return { ans: L, wrong: [Pr * h, Pr - h, h * p + h * q].filter((v) => v !== L), expl: `LCM = product ÷ HCF = ${Pr} ÷ ${h} = ${L}.` }
      case 'prod': return { ans: Pr, wrong: [L, L + h, L / h].filter((v) => isInt(v) && v !== Pr), expl: `For two numbers, product = HCF × LCM = ${h} × ${L} = ${Pr}.` }
      case 'coprime': { const P2 = p * q; return { ans: P2, wrong: [1, p + q, Math.max(p, q)], expl: `Co-prime numbers have HCF 1, so LCM = product ÷ 1 = ${P2}.` } }
      case 'ratiolcm': return { ans: L, wrong: [h * (p + q), x * y, h * p].filter((v) => v !== L), expl: `The numbers are ${h} × ${p} = ${x} and ${h} × ${q} = ${y}; with ${p} and ${q} co-prime, the LCM is ${h} × ${p} × ${q} = ${L}.` }
      case 'ratiosmall': { const s = h * Math.min(p, q); return { ans: s, wrong: [h * Math.max(p, q), L, h, h * (p + q)].filter((v) => isInt(v) && v !== s), expl: `Numbers ${p}k and ${q}k have LCM ${p * q}k = ${L}, so k = ${h}; the smaller is ${s}.` } }
      default: return { ans: h, wrong: [L / h, Pr / (L * 2), h * 2].filter((v) => isInt(v) && v !== h && v > 0), expl: `HCF = product ÷ LCM = ${Pr} ÷ ${L} = ${h}.` }
    }
  },
  items: [
    [2, (p) => `The HCF of two numbers is ${p.h} and their LCM is ${p.h * p.p * p.q}. If one of the numbers is ${p.h * p.p}, the other is:`, { m: 'other' }],
    [2, (p) => `The product of two numbers is ${p.h * p.p * p.h * p.q} and their HCF is ${p.h}. What is their LCM?`, { m: 'lcm' }],
    [1, (p) => `Two numbers have an LCM of ${p.h * p.p * p.q} and an HCF of ${p.h}. What is their product?`, { m: 'prod' }],
    [2, (p) => `The LCM of two numbers is ${p.h * p.p * p.q}, their HCF is ${p.h}, and one of them is ${p.h * p.p}. Find the other number.`, { m: 'other2' }],
    [1, (p) => `Two co-prime numbers have a product of ${p.p * p.q}. What is their LCM?`, { m: 'coprime' }],
    [2, (p) => `The ratio of two numbers is ${p.p} : ${p.q} and their HCF is ${p.h}. What is their LCM?`, { m: 'ratiolcm' }],
    [2, (p) => `Two numbers are in the ratio ${p.p} : ${p.q} and their LCM is ${p.h * p.p * p.q}. What is the smaller number?`, { m: 'ratiosmall' }],
    [2, (p) => `The product of two numbers is ${p.h * p.p * p.h * p.q} and their LCM is ${p.h * p.p * p.q}. What is their HCF?`, { m: 'hcf' }],
  ],
})
const digitsFit = (tpl, pred) => { const out = []; for (let d = 0; d <= 9; d++) { const s = tpl.replace('*', String(d)); if (s[0] !== '0' && pred(Number(s))) out.push(d) } return out }
family('ga.number-properties.divisibility', 'ga.number-properties', {
  gen: (r) => ({ n: r.int(100000, 999999), pick: r.int(0, 99999) }),
  key: (p) => `${p.m}-${p.n}`,
  solve: (P) => {
    const rr = makeRng(`div-${P.m}-${P.n}`)
    const ds = String(P.n)
    const others = (fit, ans) => { const c = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !fit.includes(d) && d !== ans); return [ans + 1, ans - 1, ans + 3, ...rr.shuffle(c)].filter((d) => d >= 0 && d <= 9 && !fit.includes(d)) }
    switch (P.m) {
      case 'nine3': { const t = `${ds[0]}*${ds[1]}`; const fit = digitsFit(t, (v) => v % 9 === 0); if (fit.length !== 1) return null; P.t = t; const s3 = digitsFit(t, (v) => v % 3 === 0).filter((d) => d !== fit[0]); return { ans: fit[0], wrong: [...s3, ...others(fit, fit[0])], expl: `For divisibility by 9 the digit sum must be a multiple of 9: ${ds[0]} + * + ${ds[1]}, so * = ${fit[0]}.` } }
      case 'three': { const t = `${ds[0]}*${ds[1]}${ds[2]}`; const fit = digitsFit(t, (v) => v % 3 === 0); if (fit[0] === 0 || fit.length < 2) return null; P.t = t; return { ans: fit[0], wrong: [...fit.slice(1), ...others(fit, fit[0])], expl: `The digit sum ${Number(ds[0]) + Number(ds[1]) + Number(ds[2])} + * must be a multiple of 3; the smallest * that works is ${fit[0]}.` } }
      case 'eleven': { const t = `${ds[0]}*${ds[1]}`; const fit = digitsFit(t, (v) => v % 11 === 0); if (fit.length !== 1) return null; P.t = t; return { ans: fit[0], wrong: others(fit, fit[0]), expl: `For 11, (first digit + last digit) − middle digit must be 0 or a multiple of 11: ${ds[0]} + ${ds[1]} − * gives * = ${fit[0]}.` } }
      case 'which4': { const base = Math.floor(P.n / 100) * 100; const ends = rr.shuffle([...Array(50)].map((_, i) => 2 * i)); const good = ends.find((e) => e % 4 === 0); const bad = ends.filter((e) => e % 4 !== 0).slice(0, 3); return { ans: base + good, wrong: bad.map((e) => base + e), expl: `A number is divisible by 4 when its last two digits are: ${String(good).padStart(2, '0')} is a multiple of 4, while ${bad.map((e) => String(e).padStart(2, '0')).join(', ')} are not.` } }
      case 'which6': { const base = Math.floor(P.n / 1000) * 1000; const c = []; for (let v = base; v < base + 200; v++) c.push(v); const good = rr.pick(c.filter((v) => v % 6 === 0)); const odd3 = rr.pick(c.filter((v) => v % 3 === 0 && v % 2 === 1)); const even = rr.sample(c.filter((v) => v % 2 === 0 && v % 3 !== 0), 2); return { ans: good, wrong: [odd3, ...even], expl: `Divisible by 6 means divisible by both 2 and 3: ${good} is even and its digit sum is a multiple of 3; ${odd3} is odd, and ${even.join(' and ')} fail the test for 3.` } }
      case 'largest4': { const c = Number(ds[5]) % 2 === 0 ? ds[5] : String((Number(ds[5]) + 1) % 10); const t = `${ds[0]}${ds[1]}*${c}`; const fit = digitsFit(t, (v) => v % 4 === 0); if (fit.length < 2) return null; P.t = t; const mx = Math.max(...fit); return { ans: mx, wrong: [9, ...fit.filter((d) => d !== mx).reverse(), ...others(fit, mx)].filter((d) => d !== mx && (d === 9 ? !fit.includes(9) : true)), expl: `The last two digits *${c} must form a multiple of 4; the possibilities are ${fit.map((d) => `${d}${c}`).join(', ')}, so the largest * is ${mx}.` } }
      case 'nine6': { const t = `${ds.slice(0, 3)}*${ds.slice(4)}`; const fit = digitsFit(t, (v) => v % 9 === 0); if (fit.length !== 1) return null; P.t = t; const s3 = digitsFit(t, (v) => v % 3 === 0).filter((d) => d !== fit[0]); return { ans: fit[0], wrong: [...s3, ...others(fit, fit[0])], expl: `The digit sum must be a multiple of 9; the known digits add to ${sum(t.replace('*', '').split('').map(Number))}, so * = ${fit[0]}.` } }
      case 'three5': { const base = Math.floor(P.n / 1000) * 10; const c = []; for (let v = base; v < base + 300; v += 5) c.push(v); const good = rr.pick(c.filter((v) => v % 15 === 0)); const five = rr.sample(c.filter((v) => v % 3 !== 0), 2); const three = rr.pick([...Array(40)].map((_, i) => base + 3 * i).filter((v) => v % 5 !== 0)); return { ans: good, wrong: [...five, three], expl: `${good} ends in ${good % 10} (so divisible by 5) and its digit sum is a multiple of 3; each other option fails one of the two tests.` } }
      case 'twelve': { const t = `${ds[0]}${ds[1]}*${[0, 2, 4, 6, 8][Number(ds[2]) % 5]}`; const fit = digitsFit(t, (v) => v % 12 === 0); if (!fit.length || fit[0] === 0) return null; P.t = t; const mn = fit[0]; const by4 = digitsFit(t, (v) => v % 4 === 0).filter((d) => d !== mn && !fit.includes(d)); const by3 = digitsFit(t, (v) => v % 3 === 0).filter((d) => d !== mn && !fit.includes(d)); return { ans: mn, wrong: [...fit.slice(1), by3[0], by4[0], ...others(fit, mn)].filter((d) => d !== undefined), expl: `Divisible by 12 means divisible by 3 and by 4. Trying * = 0, 1, 2, …, the first digit passing both tests is ${mn} (${t.replace('*', mn)} = 12 × ${Number(t.replace('*', mn)) / 12}).` } }
      default: { const ps = [7, 11, 13, 17, 19]; const p = rr.pick(ps); const k = rr.int(11, 70); const N = p * k; if (ps.some((q) => q !== p && N % q === 0)) return null; P.N = N; return { ans: p, wrong: ps.filter((q) => q !== p), expl: `${N} = ${p} × ${k}; it is not a multiple of any of the other options.` } }
    }
  },
  items: [
    [2, (p) => `What digit must replace * in ${p.t} so that the number is divisible by 9?`, { m: 'nine3' }],
    [2, (p) => `What is the smallest digit that can replace * in ${p.t} to make the number divisible by 3?`, { m: 'three' }],
    [2, (p) => `The number ${p.t} is divisible by 11. What is the missing digit *?`, { m: 'eleven' }],
    [1, () => `Which of the following numbers is divisible by 4?`, { m: 'which4' }],
    [2, () => `Which of these numbers is divisible by 6?`, { m: 'which6' }],
    [2, (p) => `What is the largest digit that can replace * in ${p.t} so that the number is divisible by 4?`, { m: 'largest4' }],
    [2, (p) => `If the six-digit number ${p.t} is divisible by 9, what digit does * stand for?`, { m: 'nine6' }],
    [1, () => `Which of these numbers is divisible by both 3 and 5?`, { m: 'three5' }],
    [2, (p) => `The number ${p.t} is divisible by 12. What is the smallest possible value of *?`, { m: 'twelve' }],
    [2, (p) => `By which of the following is ${p.N} exactly divisible?`, { m: 'divisor' }],
  ],
})

family('ga.number-properties.remainders', 'ga.number-properties', {
  gen: (r) => ({ d: r.int(3, 13), q: r.int(12, 90), rr: r.int(1, 12), a: r.int(20, 99), b: r.int(20, 99), c: r.int(20, 99), k: r.int(2, 5), n: r.int(10, 60), base: r.pick([2, 3, 7, 8, 9]) }),
  key: (p) => `${p.m}-${p.d}-${p.q}-${p.rr}${['prod', 'sum'].includes(p.m) ? `-${p.a}-${p.b}-${p.c}` : ''}${['mod7', 'units'].includes(p.m) ? `-${p.n}-${p.base}` : ''}${p.m === 'nested' ? `-${p.k}` : ''}`,
  solve: (P) => {
    const { d, q, rr, a, b, c, k, n, base } = P
    if (rr >= d && !['mod7', 'units'].includes(P.m)) return null
    const N = d * q + rr
    const mods = (ans, m) => [...new Set([(ans + 1) % m, (ans + m - 1) % m, (ans + 2) % m, m - ans])].filter((v) => v !== ans)
    switch (P.m) {
      case 'basic': return { ans: rr, wrong: [q, d - rr, rr + 1, (rr + 2) % d], expl: `${N} = ${d} × ${q} + ${rr}, so the remainder is ${rr}.` }
      case 'nested': { const M = d * k; const R = rr + d * ((q % k)); if (R >= M) return null; P.M = M; P.R = R; return { ans: rr, wrong: [R, R % k, M - R, (rr + 1) % d].filter((v) => v !== rr), expl: `The number is ${M}t + ${R}; since ${M} is a multiple of ${d}, the remainder on dividing by ${d} is ${R} mod ${d} = ${rr}.` } }
      case 'double': { const ans = (2 * rr) % d; if (2 * rr < d) return null; return { ans, wrong: [2 * rr, rr, (ans + 1) % d].filter((v) => v !== ans), expl: `If n = ${d}q + ${rr}, then 2n = ${d}(2q) + ${2 * rr}, and ${2 * rr} leaves remainder ${ans} on division by ${d}.` } }
      case 'prod': { const ans = (a * b) % d; return { ans, wrong: [((a % d) + (b % d)) % d, (a % d) * (b % d), ...mods(ans, d)].filter((v) => v !== ans), expl: `${a} leaves ${a % d} and ${b} leaves ${b % d}; ${a % d} × ${b % d} = ${(a % d) * (b % d)}, which leaves ${ans} on division by ${d}.` } }
      case 'sum': { const ans = (a + b + c) % d; return { ans, wrong: [(a % d) + (b % d) + (c % d), ...mods(ans, d)].filter((v) => v !== ans), expl: `${a} + ${b} + ${c} = ${a + b + c} = ${d} × ${Math.floor((a + b + c) / d)} + ${ans}.` } }
      case 'dividend': return { ans: N, wrong: [d * q, d * rr + q, (d + rr) * q], expl: `Number = divisor × quotient + remainder = ${d} × ${q} + ${rr} = ${N}.` }
      case 'mod7': { const cyc = [1, 2, 4]; const ans = cyc[n % 3]; return { ans, wrong: [1, 2, 4, 3, 6].filter((v) => v !== ans), expl: `Powers of 2 leave remainders 2, 4, 1, 2, 4, 1, … on division by 7 (cycle of 3). ${n} = 3 × ${Math.floor(n / 3)} + ${n % 3}, so the remainder is ${ans}.` } }
      case 'units': { const cyc = []; let v = base % 10; for (let i = 0; i < 4; i++) { cyc.push(v); v = (v * base) % 10 } const ans = cyc[(n - 1) % 4]; return { ans, wrong: [...new Set([...cyc, base % 10, (base * n) % 10, 1])].filter((w) => w !== ans), expl: `The units digits of powers of ${base} repeat in the cycle ${cyc.join(', ')}. The exponent ${n} is in position ${(n - 1) % 4 + 1} of that cycle (${n} ÷ 4 leaves ${n % 4}), so the units digit is ${ans}.` } }
      case 'subtract': return { ans: rr, wrong: [d - rr, rr + 1, q].filter((v) => v !== rr), expl: `${N} ÷ ${d} leaves remainder ${rr}; subtracting ${rr} gives ${N - rr} = ${d} × ${q}.` }
      default: return { ans: d - rr, wrong: [rr, d - rr + 1, d].filter((v) => v !== d - rr), expl: `${N} ÷ ${d} leaves remainder ${rr}; adding ${d} − ${rr} = ${d - rr} gives ${N + d - rr} = ${d} × ${q + 1}.` }
    }
  },
  items: [
    [1, (p) => `What is the remainder when ${p.d * p.q + p.rr} is divided by ${p.d}?`, { m: 'basic' }],
    [2, (p) => `A number leaves a remainder of ${p.R} when divided by ${p.M}. What remainder does it leave when divided by ${p.d}?`, { m: 'nested' }],
    [2, (p) => `When a number is divided by ${p.d}, the remainder is ${p.rr}. What is the remainder when twice the number is divided by ${p.d}?`, { m: 'double' }],
    [2, (p) => `Without multiplying out, find the remainder when ${p.a} × ${p.b} is divided by ${p.d}.`, { m: 'prod' }],
    [1, (p) => `The remainder on dividing ${p.a} + ${p.b} + ${p.c} by ${p.d} is:`, { m: 'sum' }],
    [1, (p) => `On dividing a number by ${p.d}, the quotient is ${p.q} and the remainder is ${p.rr}. What is the number?`, { m: 'dividend' }],
    [3, (p) => `When 2${sup(p.n)} is divided by 7, what remainder is left?`, { m: 'mod7' }],
    [2, (p) => `What is the units digit of ${p.base}${sup(p.n)}?`, { m: 'units' }],
    [1, (p) => `What is the least number that must be subtracted from ${p.d * p.q + p.rr} to make it exactly divisible by ${p.d}?`, { m: 'subtract' }],
    [2, (p) => `What is the least number that must be added to ${p.d * p.q + p.rr} to make it exactly divisible by ${p.d}?`, { m: 'add' }],
  ],
})
/** Round an integer-scaled value m / 10^k to j decimals (half up); returns a display string. */
function roundStr(m, k, j) { const f = 10 ** (k - j); const q = Math.floor(m / f + 0.5); return (q / 10 ** j).toFixed(Math.max(j, 0)) }
function truncStr(m, k, j) { const f = 10 ** (k - j); const q = Math.floor(m / f); return (q / 10 ** j).toFixed(Math.max(j, 0)) }
const sigRound = (N, s) => { const e = String(N).length - s; const f = 10 ** e; return Math.floor(N / f + 0.5) * f }
const numVal = (t) => Number(String(t).replace(/[^0-9.]/g, ''))
family('ga.number-properties.rounding', 'ga.number-properties', {
  post: (sol) => ({ ...sol, wrong: sol.wrong.filter((w) => numVal(w) !== numVal(sol.ans)) }),
  fmt: (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : v),
  gen: (r) => ({ m: r.int(10000, 99999), N: r.int(10000, 999999) }),
  key: (p) => `${p.s}-${p.m}-${p.N}`,
  solve: (P) => {
    const { m, N } = P
    switch (P.s) {
      case 'dp2': { const x = (m / 1000).toFixed(3); P.x = x; const ans = roundStr(m, 3, 2); return { ans, wrong: [truncStr(m, 3, 2) === ans ? roundStr(m + 10, 3, 2) : truncStr(m, 3, 2), roundStr(m, 3, 1), roundStr(m, 3, 0) + '.00', x].filter((t) => t !== ans), expl: `Look at the third decimal place of ${x}: it is ${x.slice(-1)}, so the second decimal ${Number(x.slice(-1)) >= 5 ? 'goes up' : 'stays'}; the answer is ${ans}.` } }
      case 'hund': { const ans = Math.floor(N / 100 + 0.5) * 100; return { ans, wrong: [Math.floor(N / 100) * 100 === ans ? ans + 100 : Math.floor(N / 100) * 100, Math.floor(N / 10 + 0.5) * 10, Math.floor(N / 1000 + 0.5) * 1000].filter((v) => v !== ans), expl: `The tens digit of ${N.toLocaleString('en-US')} is ${Math.floor(N / 10) % 10}, so to the nearest hundred it is ${ans.toLocaleString('en-US')}.` } }
      case 'dp1': { const x = (m / 100).toFixed(2); P.x = x; const ans = roundStr(m, 2, 1); return { ans, wrong: [truncStr(m, 2, 1) === ans ? roundStr(m + 10, 2, 1) : truncStr(m, 2, 1), roundStr(m, 2, 0), x, roundStr(m + 100, 2, 1)], expl: `The second decimal of ${x} is ${x.slice(-1)}, so ${x} ≈ ${ans} to one decimal place.` } }
      case 'sig2': { const ans = sigRound(N, 2); return { ans, wrong: [sigRound(N, 3), sigRound(N, 1), Math.floor(N / 10 ** (String(N).length - 2)) * 10 ** (String(N).length - 2) === ans ? ans + 10 ** (String(N).length - 2) : Math.floor(N / 10 ** (String(N).length - 2)) * 10 ** (String(N).length - 2), Number(String(ans).slice(0, 2))].filter((v) => v !== ans), expl: `Keep the first two significant figures of ${N.toLocaleString('en-US')} and round using the third: ${ans.toLocaleString('en-US')}.` } }
      case 'thou': { const ans = Math.floor(N / 1000 + 0.5) * 1000; return { ans, wrong: [Math.floor(N / 1000) * 1000 === ans ? ans + 1000 : Math.floor(N / 1000) * 1000, Math.floor(N / 100 + 0.5) * 100, Math.floor(N / 10000 + 0.5) * 10000].filter((v) => v !== ans), expl: `The hundreds digit of ${N.toLocaleString('en-US')} is ${Math.floor(N / 100) % 10}, so to the nearest thousand it is ${ans.toLocaleString('en-US')}.` } }
      case 'whole': { const x = (m / 1000).toFixed(3); P.x = x; const ans = roundStr(m, 3, 0); return { ans, wrong: [truncStr(m, 3, 0) === ans ? String(Number(ans) + 1) : truncStr(m, 3, 0), roundStr(m, 3, 1), String(Number(ans) + 10)].filter((t) => t !== ans), expl: `The first decimal of ${x} is ${x.split('.')[1][0]}, so it rounds to ${ans}.` } }
      case 'sig3': { const x = (m / 10000).toFixed(4); P.x = x; const ans = roundStr(m, 4, 2); return { ans, wrong: [roundStr(m, 4, 3), truncStr(m, 4, 2) === ans ? roundStr(m + 100, 4, 2) : truncStr(m, 4, 2), roundStr(m, 4, 1)].filter((t) => t !== ans), expl: `${x} has significant figures ${x.replace('.', '').split('').join(', ')}; keeping three and rounding with the fourth gives ${ans}.` } }
      default: { const x = (m / 1000).toFixed(3); P.x = x; const ans = roundStr(m, 3, 1); return { ans: `${ans} m`, wrong: [`${truncStr(m, 3, 1) === ans ? roundStr(m + 100, 3, 1) : truncStr(m, 3, 1)} m`, `${roundStr(m, 3, 2)} m`, `${roundStr(m, 3, 0)} m`].filter((t) => t !== `${ans} m`), expl: `Ten centimetres is 0.1 m, so round ${x} m to one decimal place: ${ans} m.` } }
    }
  },
  items: [
    [1, (p) => `Round ${p.x} to two decimal places.`, { s: 'dp2' }],
    [1, (p) => `What is ${p.N.toLocaleString('en-US')} rounded to the nearest hundred?`, { s: 'hund' }],
    [1, (p) => `${p.x} correct to one decimal place is:`, { s: 'dp1' }],
    [2, (p) => `Write ${p.N.toLocaleString('en-US')} correct to 2 significant figures.`, { s: 'sig2' }],
    [1, (p) => `Rounded to the nearest thousand, ${p.N.toLocaleString('en-US')} becomes:`, { s: 'thou' }],
    [1, (p) => `What is ${p.x} correct to the nearest whole number?`, { s: 'whole' }],
    [2, (p) => `${p.x} rounded to three significant figures is:`, { s: 'sig3' }],
    [1, (p) => `A length is measured as ${p.x} m. What is it to the nearest ten centimetres?`, { s: 'tencm' }],
  ],
})

family('ga.number-properties.estimation', 'ga.number-properties', {
  fmt: (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : v),
  gen: (r) => ({ A: r.int(2, 9), B: r.int(2, 9), da: r.int(-4, 4), db: r.int(-2, 2), k: r.int(1, 3) }),
  key: (p) => `${p.s}-${p.A}-${p.B}-${p.da}-${p.db}-${p.k}`,
  solve: (P) => {
    const { A, B, da, db, k } = P
    switch (P.s) {
      case 'mul': { const a = A * 100 + da; const b = B * 10 + db; P.a = a; P.b = b; const ans = A * B * 1000; return { ans, wrong: [ans * 10, ans / 10, (A + B) * 1000], expl: `${a} ≈ ${A * 100} and ${b} ≈ ${B * 10}; ${A * 100} × ${B * 10} = ${ans.toLocaleString('en-US')}.` } }
      case 'div': { const q = A * 100; const b = B * 10; const a = q * b + da * 7; P.a = a; P.b = `${b - 1}.${7 + (k % 3)}`; return { ans: q, wrong: [q * 10, q / 10, q * 2].filter((v) => isInt(v)), expl: `${a.toLocaleString('en-US')} ≈ ${(q * b).toLocaleString('en-US')} and ${P.b} ≈ ${b}; ${(q * b).toLocaleString('en-US')} ÷ ${b} = ${q}.` } }
      case 'shop': { const n = A * 10 + (da % 2); const pr = B * 100 - (5 - k); P.n = n; P.pr = pr; const ans = A * 10 * B * 100; return { ans, wrong: [ans * 10, ans / 10, (A * 10 + B * 100) * 10], expl: `${n} ≈ ${A * 10} and Rs ${pr} ≈ Rs ${B * 100}; ${A * 10} × ${B * 100} = Rs ${ans.toLocaleString('en-US')}.`, fmt: (v) => `Rs ${v.toLocaleString('en-US')}` } }
      case 'sqrt': { const s = A * 3 + B; const N = s * s + da * 2 + (da === 0 ? 3 : 0); if (Math.abs(N - s * s) > s) return null; P.N = N; return { ans: s, wrong: [s + 1 === Math.round(Math.sqrt(N)) ? s + 2 : s + 1, s - 1, Math.round(N / 2)].filter((v) => v !== s), expl: `${s}² = ${s * s}, which is closest to ${N}; so √${N} ≈ ${s}.` } }
      case 'hundreds': { const xs = [A * 100 + 30 + da, B * 100 + 60 - db, (A + B) * 100 - 20 + k]; P.xs = xs; const rd = xs.map((v) => Math.floor(v / 100 + 0.5) * 100); const ans = sum(rd); return { ans, wrong: [sum(xs.map((v) => Math.floor(v / 100) * 100)), sum(xs), ans + 100].filter((v) => v !== ans), expl: `Rounded: ${rd.join(' + ')} = ${ans.toLocaleString('en-US')}.` } }
      default: { const pct = 25; const N = A * 400 + da; P.N = N; P.pc = `${pct - 1}.${8 - (k % 3)}`; const ans = A * 100; return { ans, wrong: [A * 1000, A * 10, A * 250], expl: `${P.pc}% ≈ 25% = one-quarter, and ${N} ≈ ${A * 400}; a quarter of ${A * 400} is ${ans}.` } }
    }
  },
  items: [
    [1, (p) => `Which is the best estimate of ${p.a} × ${p.b}?`, { s: 'mul' }],
    [1, (p) => `Estimate the value of ${p.a.toLocaleString('en-US')} ÷ ${p.b} by rounding each number sensibly.`, { s: 'div' }],
    [1, (p) => `A shopkeeper sells ${p.n} items at Rs ${p.pr} each. Roughly how much money does he receive?`, { s: 'shop' }],
    [1, (p) => `Which whole number is closest to √${p.N}?`, { s: 'sqrt' }],
    [1, (p) => `If ${p.xs[0]}, ${p.xs[1]} and ${p.xs[2]} are each rounded to the nearest hundred and then added, what total is obtained?`, { s: 'hundreds' }],
    [1, (p) => `Approximately what is ${p.pc}% of ${p.N.toLocaleString('en-US')}?`, { s: 'pct' }],
  ],
})

const PLACE = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions']
family('ga.number-properties.place-value', 'ga.number-properties', {
  fmt: (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : v),
  gen: (r) => ({ N: r.int(1000000, 9999999), pick: r.int(0, 9999) }),
  key: (p) => `${p.s}-${p.N}`,
  solve: (P) => {
    const ds = String(P.N); const L = ds.length
    const rr = makeRng(`pv-${P.s}-${P.N}`)
    switch (P.s) {
      case 'pv': { const i = rr.int(0, L - 3); const d = ds[i]; if (d === '0' || ds.indexOf(d) !== i || ds.lastIndexOf(d) !== i) return null; const pos = L - 1 - i; P.d = d; const ans = Number(d) * 10 ** pos; return { ans, wrong: [Number(d), Number(d) * 10 ** (pos - 1), Number(d) * 10 ** (pos + 1)], expl: `${d} is in the ${PLACE[pos]} place of ${P.N.toLocaleString('en-US')}, so its place value is ${ans.toLocaleString('en-US')}.` } }
      case 'diff': { const i = rr.int(1, L - 3); const d = ds[i]; if (d === '0' || d === '1' || ds.indexOf(d) !== i || ds.lastIndexOf(d) !== i) return null; const pos = L - 1 - i; P.d = d; const pvv = Number(d) * 10 ** pos; const ans = pvv - Number(d); return { ans, wrong: [pvv, pvv + Number(d), Number(d) * 10 ** (pos - 1) - Number(d)], expl: `Place value ${pvv.toLocaleString('en-US')} − face value ${d} = ${ans.toLocaleString('en-US')}.` } }
      case 'twice': { const d = String(rr.int(2, 9)); const pos1 = rr.int(3, 5); const pos2 = rr.int(0, 2); const arr = ds.split('').map((c) => (c === d ? String((Number(c) + 1) % 10 || 1) : c)); if (arr.includes(d)) return null; arr[L - 1 - pos1] = d; arr[L - 1 - pos2] = d; if (arr[0] === '0') return null; const N2 = Number(arr.join('')); if (arr.filter((c) => c === d).length !== 2) return null; P.N2 = N2; P.d = d; const ans = Number(d) * (10 ** pos1 + 10 ** pos2); return { ans, wrong: [Number(d) * 2, Number(d) * 10 ** pos1, Number(d) * 10 ** pos1 * 10 ** pos2 > 1e9 ? Number(d) * (10 ** pos1 - 10 ** pos2) : Number(d) * (10 ** pos1 - 10 ** pos2)], expl: `The ${d}s stand for ${(Number(d) * 10 ** pos1).toLocaleString('en-US')} and ${Number(d) * 10 ** pos2}; together ${ans.toLocaleString('en-US')}.` } }
      case 'hundredths': { const x = `${ds.slice(0, 2)}.${ds.slice(2, 5)}`; P.x = x; const h = x.split('.')[1][1]; const t = x.split('.')[1][0]; const th = x.split('.')[1][2]; if (new Set([h, t, th, ds[1]]).size < 4) return null; return { ans: h, wrong: [t, th, ds[1]], expl: `In ${x} the digits after the point are tenths (${t}), hundredths (${h}) and thousandths (${th}).` } }
      case 'decval': { const x = `${ds.slice(0, 1)}.${ds.slice(1, 5)}`; const j = rr.int(1, 3); const d = x.split('.')[1][j]; if (d === '0' || x.split('.')[1].indexOf(d) !== j || ds[0] === d) return null; P.x = x; P.d = d; const v = (e) => `${(Number(d) / 10 ** e).toFixed(e)}`; return { ans: v(j + 1), wrong: [v(j), v(j + 2), d], expl: `${d} is in decimal place ${j + 1} of ${x}, so it stands for ${v(j + 1)}.` } }
      case 'swap': { const a = Number(ds[L - 2]); const b = Number(ds[L - 4]); if (a === b) return null; const ans = Math.abs(a - b) * (1000 - 10); return { ans, wrong: [Math.abs(a - b) * 1000, Math.abs(a - b) * 10, Math.abs(a - b) * 900], expl: `Swapping moves ${Math.abs(a - b)} between the thousands and the tens: ${Math.abs(a - b)} × 1000 − ${Math.abs(a - b)} × 10 = ${ans.toLocaleString('en-US')}.` } }
      case 'smallest': { const dig = [...new Set(ds.split(''))].slice(0, 5); if (dig.length < 5) return null; const withZero = dig.includes('0') ? dig : [...dig.slice(0, 4), '0']; const s = [...withZero].sort(); const firstNZ = s.find((c) => c !== '0'); const rest = s.filter((c, i) => i !== s.indexOf(firstNZ)); const ans = Number(firstNZ + rest.join('')); P.dig = withZero; return { ans, wrong: [Number(s.join('')) || Number(s.slice(1).join('')), Number(s.slice().reverse().join('')), Number(firstNZ + rest.slice().reverse().join(''))].filter((v) => v !== ans && v >= 1000), expl: `Put the smallest non-zero digit first, then the rest in increasing order: ${ans}.` } }
      default: { const dig = [...new Set(ds.split('').filter((c) => c !== '0'))].slice(0, 3); if (dig.length < 3) return null; P.dig = dig; const s = [...dig].sort(); const big = Number([...s].reverse().join('')); const small = Number(s.join('')); const ans = big - small; return { ans, wrong: [big + small, big - Number(s[0] + s[2] + s[1]), ans + 99].filter((v) => v !== ans), expl: `Largest ${big} − smallest ${small} = ${ans}.` } }
    }
  },
  items: [
    [1, (p) => `What is the place value of ${p.d} in ${p.N.toLocaleString('en-US')}?`, { s: 'pv' }],
    [2, (p) => `In the number ${p.N.toLocaleString('en-US')}, what is the difference between the place value and the face value of ${p.d}?`, { s: 'diff' }],
    [2, (p) => `What is the sum of the place values of the two ${p.d}s in ${p.N2.toLocaleString('en-US')}?`, { s: 'twice' }],
    [1, (p) => `Which digit is in the hundredths place of ${p.x}?`, { s: 'hundredths' }],
    [1, (p) => `What value does the digit ${p.d} represent in ${p.x}?`, { s: 'decval' }],
    [2, (p) => `If the tens digit and the thousands digit of ${p.N.toLocaleString('en-US')} are interchanged, by how much does the number change?`, { s: 'swap' }],
    [1, (p) => `What is the smallest five-digit number that can be formed using each of the digits ${p.dig.slice(0, 4).join(', ')} and ${p.dig[4]} exactly once?`, { s: 'smallest' }],
    [2, (p) => `What is the difference between the largest and the smallest three-digit numbers that can be formed using each of the digits ${p.dig[0]}, ${p.dig[1]} and ${p.dig[2]} once?`, { s: 'range3' }],
  ],
})

family('ga.number-properties.count-multiples', 'ga.number-properties', {
  gen: (r) => ({ k: r.int(3, 13), a: r.int(20, 150), N: 10 * r.int(5, 40), b2: r.pick([2, 3, 4, 5, 6]), c2: r.pick([3, 5, 7, 9]) }),
  key: (p) => `${p.s}-${p.k}-${p.a}-${p.N}-${p.b2}-${p.c2}`,
  fact: (p) => `${p.s}-${p.k}-${p.a}-${p.N}`,
  solve: (P) => {
    const { k, a, N, b2, c2 } = P
    const cnt = (lo, hi, f) => { let c = 0; for (let v = lo; v <= hi; v++) if (f(v)) c++; return c }
    switch (P.s) {
      case 'between': { const b = a + 5 * k + 7; P.b = b; if (a % k === 0 || b % k === 0) return null; const c = cnt(a + 1, b - 1, (v) => v % k === 0); return { ans: c, wrong: [c + 1, c - 1, Math.round((b - a) / k) === c ? c + 2 : Math.round((b - a) / k)].filter((v) => v !== c && v > 0), expl: `The multiples of ${k} between ${a} and ${b} run from ${Math.ceil(a / k) * k} to ${Math.floor(b / k) * k}: ${c} numbers.` } }
      case 'upto': { const c = Math.floor(N / k); return { ans: c, wrong: [c + 1, c - 1, Math.floor(N / (k + 1))].filter((v) => v !== c), expl: `${N} ÷ ${k} = ${num(N / k)}, so there are ${c} multiples of ${k} from 1 to ${N}.` } }
      case 'neither': { if (b2 === c2 || gcd(b2, c2) !== 1) return null; const c = cnt(1, N, (v) => v % b2 !== 0 && v % c2 !== 0); return { ans: c, wrong: [N - Math.floor(N / b2) - Math.floor(N / c2), N - Math.floor(N / (b2 * c2)), c + Math.floor(N / (b2 * c2)) + 1].filter((v) => v !== c && v > 0), expl: `Divisible by ${b2}: ${Math.floor(N / b2)}; by ${c2}: ${Math.floor(N / c2)}; by both: ${Math.floor(N / (b2 * c2))}. At least one: ${Math.floor(N / b2) + Math.floor(N / c2) - Math.floor(N / (b2 * c2))}; neither: ${N} − that = ${c}.` } }
      case 'even': { const b = a + 2 * k + 11; P.b = b; const c = cnt(a + 1, b - 1, (v) => v % 2 === 0); return { ans: c, wrong: [c + 1, c - 1, b - a - 1].filter((v) => v !== c), expl: `The even numbers strictly between ${a} and ${b} run from ${a % 2 ? a + 1 : a + 2} to ${b % 2 ? b - 1 : b - 2}: ${c} of them.` } }
      case 'threedigit': { const c = Math.floor(999 / k) - Math.floor(99 / k); return { ans: c, wrong: [Math.floor(999 / k), Math.floor(900 / k) === c ? c + 1 : Math.floor(900 / k), c - 1].filter((v) => v !== c), expl: `Multiples of ${k} up to 999: ${Math.floor(999 / k)}; up to 99: ${Math.floor(99 / k)}; three-digit ones: ${c}.` } }
      default: { if (b2 === c2 || lcm(b2, c2) === b2 * c2) return null; const L = lcm(b2, c2); const c = Math.floor(N / L); return { ans: c, wrong: [Math.floor(N / (b2 * c2)), Math.floor(N / b2) + Math.floor(N / c2), c + 1].filter((v) => v !== c), expl: `Divisible by both ${b2} and ${c2} means divisible by their LCM, ${L}: ${N} ÷ ${L} gives ${c}.` } }
    }
  },
  items: [
    [2, (p) => `How many multiples of ${p.k} are there between ${p.a} and ${p.b}?`, { s: 'between' }],
    [1, (p) => `How many numbers from 1 to ${p.N} are divisible by ${p.k}?`, { s: 'upto' }],
    [3, (p) => `How many whole numbers from 1 to ${p.N} are divisible by neither ${p.b2} nor ${p.c2}?`, { s: 'neither' }],
    [1, (p) => `How many even numbers lie between ${p.a} and ${p.b}?`, { s: 'even' }],
    [2, (p) => `How many three-digit numbers are divisible by ${p.k}?`, { s: 'threedigit' }],
    [2, (p) => `How many numbers between 1 and ${p.N} are divisible by both ${p.b2} and ${p.c2}?`, { s: 'both' }],
  ],
})

family('ga.number-properties.parity', 'ga.number-properties', {
  gen: (r) => ({ pick: r.int(0, 9999), k: r.int(5, 30) }),
  key: (p) => `${p.s}-${p.s === 'oddsum' ? p.k : p.pick}`,
  solve: (P) => {
    const rr = makeRng(`par-${P.s}-${P.pick}`)
    switch (P.s) {
      case 'oddeven': {
        const pool = [['n + 1', (n) => n + 1], ['3n + 5', (n) => 3 * n + 5], ['n² + n', (n) => n * n + n], ['5n − 1', (n) => 5 * n - 1], ['n + 2', (n) => n + 2], ['2n + 1', (n) => 2 * n + 1], ['n²', (n) => n * n], ['3n + 2', (n) => 3 * n + 2], ['n² + 2', (n) => n * n + 2], ['4n − 3', (n) => 4 * n - 3]]
        const isEven = (f) => [1, 3, 5, 7, -1].every((n) => f(n) % 2 === 0); const isOdd = (f) => [1, 3, 5, 7, -1].every((n) => Math.abs(f(n) % 2) === 1)
        const good = rr.pick(pool.filter(([, f]) => isEven(f))); const bad = rr.sample(pool.filter(([, f]) => isOdd(f)), 3)
        return { ans: good[0], wrong: bad.map(([t]) => t), expl: `For odd n, ${good[0]} is always even (try n = 1: ${good[1](1)}; n = 3: ${good[1](3)}), while ${bad.map(([t]) => t).join(', ')} are always odd.` }
      }
      case 'mixed': {
        const pool = [['m + n', (m, n) => m + n], ['mn + n', (m, n) => m * n + n], ['n² + m', (m, n) => n * n + m], ['3n + m', (m, n) => 3 * n + m], ['mn', (m, n) => m * n], ['m + 2n', (m, n) => m + 2 * n], ['m² + n² + 1', (m, n) => m * m + n * n + 1], ['n(n + 1)', (m, n) => n * (n + 1)], ['m + n + 1', (m, n) => m + n + 1]]
        const test = (f, par) => [[2, 1], [4, 3], [6, 5], [0, 7], [8, -1]].every(([m, n]) => Math.abs(f(m, n) % 2) === par)
        const good = rr.pick(pool.filter(([, f]) => test(f, 1))); const bad = rr.sample(pool.filter(([, f]) => test(f, 0)), 3)
        return { ans: good[0], wrong: bad.map(([t]) => t), expl: `With m even and n odd, ${good[0]} is always odd, whereas ${bad.map(([t]) => t).join(', ')} are always even.` }
      }
      case 'oddsum': { const k = P.k; return { ans: k * k, wrong: [k * (k + 1), 2 * k * k, k * k + k - 1].filter((v) => v !== k * k), expl: `1 + 3 + 5 + … (${k} terms) = ${k}² = ${k * k}.` } }
      default: return { ans: 'always even', wrong: ['always odd', 'always a multiple of 4', 'sometimes odd'], expl: `A product with at least one even factor is divisible by 2, so it is always even (it need not be a multiple of 4, e.g. 1 × 3 × 2 = 6).` }
    }
  },
  items: [
    [1, () => `If n is an odd integer, which of the following is always even?`, { s: 'oddeven' }],
    [1, () => `If m is an even integer and n is an odd integer, which of these must be odd?`, { s: 'mixed' }],
    [1, (p) => `What is the sum of the first ${p.k} odd natural numbers?`, { s: 'oddsum' }],
    [1, () => `The product of two odd numbers and one even number is:`, { s: 'product' }],
  ],
})

family('ga.number-properties.factors', 'ga.number-properties', {
  gen: (r) => ({ N: r.pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 72, 75, 80, 84, 90, 96, 100, 108, 120, 126, 144, 150, 180, 200]), pick: r.int(0, 999) }),
  key: (p) => `${p.s}-${p.s === 'three' ? p.pick : p.N}`,
  fact: (p) => `${p.s === 'three' ? p.pick : p.N}`,
  solve: (P) => {
    const { N } = P
    const D = divisors(N)
    switch (P.s) {
      case 'count': return { ans: D.length, wrong: [D.length - 2, D.length + 1, D.length / 2].filter((v) => isInt(v) && v !== D.length), expl: `${N} = ${primeFactors(N).join(' × ')}; its factors are ${D.join(', ')} — ${D.length} in all.` }
      case 'sum': { const s = sum(D); return { ans: s, wrong: [s - N, s - 1, s - N - 1].filter((v) => v !== s), expl: `The factors of ${N} are ${D.join(', ')}; their sum is ${s}.` } }
      case 'odd': { const o = D.filter((v) => v % 2 === 1); if (o.length < 2) return null; return { ans: o.length, wrong: [D.length - o.length, o.length + 1, o.length - 1].filter((v) => v > 0 && v !== o.length), expl: `The odd factors of ${N} are ${o.join(', ')}: ${o.length} of them.` } }
      case 'three': { const rr = makeRng(`fac3-${P.pick}`); const p = rr.pick([2, 3, 5, 7, 11, 13]); const good = p * p; const bad = rr.sample([6, 8, 10, 12, 14, 15, 16, 18, 21, 27, 32, 35, 45].filter((v) => v !== good), 3); return { ans: good, wrong: bad, expl: `A number has exactly three factors only if it is the square of a prime: ${good} = ${p}², with factors 1, ${p} and ${good}.` } }
      case 'largest': { const sp = primeFactors(N)[0]; const ans = N / sp; return { ans, wrong: [N / 2 === ans ? N / 3 : N / 2, N - 1, sp].filter((v) => isInt(v) && v !== ans), expl: `The largest proper factor is ${N} ÷ (its smallest prime factor ${sp}) = ${ans}.` } }
      default: { const d = [...new Set(primeFactors(N))]; return { ans: d.length, wrong: [primeFactors(N).length, D.length, d.length + 1].filter((v) => v !== d.length), expl: `${N} = ${primeFactors(N).join(' × ')}, so its distinct prime factors are ${d.join(' and ')}: ${d.length}.` } }
    }
  },
  items: [
    [2, (p) => `How many factors does ${p.N} have?`, { s: 'count' }],
    [2, (p) => `What is the sum of all the factors of ${p.N}?`, { s: 'sum' }],
    [2, (p) => `How many of the factors of ${p.N} are odd numbers?`, { s: 'odd' }],
    [2, () => `Which of these numbers has exactly three factors?`, { s: 'three' }],
    [1, (p) => `What is the largest factor of ${p.N} that is smaller than ${p.N} itself?`, { s: 'largest' }],
    [1, (p) => `How many different prime numbers divide ${p.N} exactly?`, { s: 'distinct' }],
  ],
})

// ===========================================================================
// ga.geometry — 120
// ===========================================================================
const PNAME = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon', 12: 'dodecagon' }
const NAMED = [5, 6, 8, 9, 10, 12]
const REG = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]
const degFmt = (v) => (typeof v === 'number' ? deg(v) : v)
const cap = (t) => t[0].toUpperCase() + t.slice(1)
const namesNear = (n) => NAMED.filter((m) => m !== n).sort((x, y) => Math.abs(x - n) - Math.abs(y - n)).map((m) => cap(PNAME[m]))

family('ga.geometry.polygon-exterior-angle', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ n: r.pick(REG), n2: r.pick(REG), nn: r.pick(NAMED), a: r.int(50, 85), b: r.int(55, 90), c: r.int(60, 95), d: r.int(40, 80), q: r.pick([[1, 2, 3, 4], [2, 3, 4, 6], [1, 2, 2, 3], [3, 4, 5, 6], [1, 3, 5, 6]]) }),
  key: (p) => `${p.m}-${({ name: p.nn, extnamed: p.nn, sides: p.n, fromint: p.n, sum: p.n + 3, exceed: p.n, fromsum: p.n, intfrom: p.n, fifth: [p.a, p.b, p.c, p.d].join('.'), quad: p.q.join(''), intsum: p.n, diff: [p.n, p.n2].join('.') })[p.m]}`,
  solve: (P) => {
    const { n, n2, nn, a, b, c, d, q } = P
    const e = 360 / n; const E = 360 / nn
    switch (P.m) {
      case 'name': return { ans: cap(PNAME[nn]), wrong: namesNear(nn), expl: `Number of sides = 360 ÷ ${E} = ${nn}, so it is a regular ${PNAME[nn]}.` }
      case 'extnamed': return { ans: E, wrong: [180 - E, 360 / (nn - 2), 180 / nn].filter((v) => isInt(v) && v !== E), expl: `Exterior angles of any polygon add up to 360°, so each is 360° ÷ ${nn} = ${E}°.` }
      case 'sides': if (n < 5) return null; return { ans: n, wrong: [n + 2, n - 2, 180 / e === n ? n + 1 : 180 / e].filter((v) => isInt(v) && v > 2 && v !== n), fmt: num, expl: `Number of sides = 360 ÷ ${e} = ${n}.` }
      case 'fromint': return { ans: e, wrong: [180 - e > 0 && 180 - e !== e ? 360 - (180 - e) : e + 10, e / 2, 2 * e].filter((v) => isInt(v) && v !== e), expl: `Interior + exterior = 180°, so each exterior angle is 180° − ${180 - e}° = ${e}°.` }
      case 'sum': return { ans: 360, wrong: [(n + 3 - 2) * 180, 180, (n + 3) * 180].filter((v) => v !== 360), expl: `The exterior angles of any convex polygon, one at each vertex, always add up to 360°.` }
      case 'exceed': { if (n < 5) return null; const i = 180 - e; return { ans: i - e, wrong: [i, e, i + e - 90].filter((v) => v > 0 && v !== i - e), expl: `Exterior = 360 ÷ ${n} = ${num(e)}°, interior = 180 − ${num(e)} = ${num(i)}°; difference = ${num(i - e)}°.` } }
      case 'fromsum': { const S = (n - 2) * 180; P.S = S; return { ans: e, wrong: [180 - e, 360 / (n - 2), 2 * e, e / 2].filter((v) => isInt(v) && v !== e), expl: `(n − 2) × 180 = ${S} gives n = ${n}; each exterior angle = 360 ÷ ${n} = ${e}°.` } }
      case 'intfrom': return { ans: 180 - e, wrong: [360 - e, e * 2, 90 + e].filter((v) => v !== 180 - e && v < 360), expl: `Each interior angle = 180° − ${e}° = ${180 - e}°.` }
      case 'fifth': { const s = a + b + c + d - 100; const x = 360 - s; if (x <= 20 || x >= 150) return null; P.ex = [a, b, c, d - 100 + 60].map((v) => v); P.ex[3] = d - 40; const s2 = sum(P.ex); const x2 = 360 - s2; if (x2 <= 20 || x2 >= 150) return null; return { ans: x2, wrong: [540 - s2, 180 - x2, 360 - s2 + 20].filter((v) => v > 0 && v !== x2), expl: `Exterior angles add up to 360°: 360 − (${P.ex.join(' + ')}) = ${x2}°.` } }
      case 'quad': { const t = sum(q); if (360 % t) return null; const k = 360 / t; const ans = k * Math.max(...q); return { ans, wrong: [(180 * Math.max(...q)) / t, k * Math.min(...q), (720 * Math.max(...q)) / t].filter((v) => isInt(v) && v !== ans && v < 360), expl: `x(${q.join(' + ')}) = 360°, so x = ${k}°; the largest is ${Math.max(...q)} × ${k} = ${ans}°.` } }
      case 'intsum': { const S = (n - 2) * 180; return { ans: S, wrong: [n * 180, (n - 1) * 180, 360].filter((v) => v !== S), expl: `n = 360 ÷ ${e} = ${n}; sum of interior angles = (${n} − 2) × 180° = ${S}°.` } }
      default: { if (n === n2) return null; const df = Math.abs(360 / n - 360 / n2); if (!isInt(df) || df === 0) return null; P.lo = Math.min(n, n2); P.hi = Math.max(n, n2); return { ans: df, wrong: [Math.abs(180 - 360 / n - (180 - 360 / n2)) + 10, 360 / P.lo, (P.hi - P.lo) * 10].filter((v) => isInt(v) && v !== df), expl: `Exterior angles: 360 ÷ ${P.lo} = ${360 / P.lo}° and 360 ÷ ${P.hi} = ${360 / P.hi}°; the difference is ${df}°.` } }
    }
  },
  items: [
    [1, (p) => `Name the regular polygon with an exterior angle of ${360 / p.nn}°.`, { m: 'name' }],
    [1, (p) => `Each exterior angle of a regular ${PNAME[p.nn]} measures:`, { m: 'extnamed' }],
    [1, (p) => `How many sides does a regular polygon have if each exterior angle is ${360 / p.n}°?`, { m: 'sides' }],
    [1, (p) => `Each interior angle of a regular polygon is ${180 - 360 / p.n}°. What is the size of each exterior angle?`, { m: 'fromint' }],
    [1, (p) => `What is the sum of the exterior angles of a convex polygon with ${p.n + 3} sides?`, { m: 'sum' }],
    [2, (p) => `In a regular polygon with ${p.n} sides, by how many degrees does each interior angle exceed each exterior angle?`, { m: 'exceed' }],
    [2, (p) => `The interior angles of a regular polygon add up to ${p.S}°. What is each exterior angle?`, { m: 'fromsum' }],
    [1, (p) => `A regular polygon has exterior angles of ${360 / p.n}° each. What is the size of each interior angle?`, { m: 'intfrom' }],
    [2, (p) => `Four exterior angles of a pentagon are ${p.ex[0]}°, ${p.ex[1]}°, ${p.ex[2]}° and ${p.ex[3]}°. What is the fifth exterior angle?`, { m: 'fifth' }],
    [2, (p) => `The exterior angles of a quadrilateral are in the ratio ${p.q.join(' : ')}. What is the largest exterior angle?`, { m: 'quad' }],
    [2, (p) => `Each exterior angle of a regular polygon is ${360 / p.n}°. What is the sum of its interior angles?`, { m: 'intsum' }],
    [2, (p) => `What is the difference between the exterior angle of ${art(p.lo)} regular ${p.lo}-sided polygon and that of ${art(p.hi)} regular ${p.hi}-sided polygon?`, { m: 'diff' }],
  ],
})

family('ga.geometry.polygon-interior-angles', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ nn: r.pick([4, 5, 6, 7, 8, 9, 10, 12]), n: r.int(11, 20), a: r.int(80, 130), b: r.int(85, 135), c: r.int(90, 140), d: r.int(95, 125), k: r.int(2, 8), q: r.pick([[2, 3, 3, 4], [1, 2, 3, 4], [3, 4, 5, 6], [2, 3, 5, 5], [4, 5, 6, 9], [1, 1, 2, 2]]), reg: r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20]) }),
  key: (p) => `${p.m}-${({ sumnamed: p.nn, eachnamed: p.nn, sidesfromsum: p.n, fifth: [p.a, p.b, p.c, p.d].join('.'), fourth: [p.a, p.b, p.c].join('.'), ratio: p.q.join(''), hex: p.a, step: p.k, exceed: [p.nn, p.reg].join('.'), sumn: p.n + 1, abcd: [p.b, p.d].join('.'), regsum: p.reg })[p.m]}`,
  solve: (P) => {
    const { nn, n, a, b, c, d, k, q, reg } = P
    const S = (x) => (x - 2) * 180
    switch (P.m) {
      case 'sumnamed': return { ans: S(nn), wrong: [nn * 180, S(nn) - 180, S(nn) + 180, 360].filter((v) => v !== S(nn)), expl: `Sum of interior angles = (n − 2) × 180° = (${nn} − 2) × 180° = ${S(nn)}°.` }
      case 'eachnamed': { const e = S(nn) / nn; if (!isInt(e)) return null; return { ans: e, wrong: [360 / nn, ((nn - 1) * 180) / nn, e - 10, e + 10].filter((v) => isInt(v) && v !== e && v > 0), expl: `Each angle = (${nn} − 2) × 180° ÷ ${nn} = ${num(e)}°.` } }
      case 'sidesfromsum': return { ans: n, wrong: [n - 2, n + 2, n + 1, n - 1].filter((v) => v !== n), fmt: num, expl: `(n − 2) × 180 = ${S(n)} gives n − 2 = ${n - 2}, so n = ${n}.` }
      case 'fifth': { const x = 540 - (a + b + c + d); if (x <= 30 || x >= 180) return null; return { ans: x, wrong: [360 - (a + b + c + d) + 180 - 180 > 0 ? 720 - (a + b + c + d) : x + 20, x + 180, 180 - x].filter((v) => v > 0 && v !== x && v < 360), expl: `A pentagon's angles add up to 540°: 540 − (${a} + ${b} + ${c} + ${d}) = ${x}°.` } }
      case 'fourth': { const x = 360 - (a - 20 + b - 20 + c - 30); if (x <= 30 || x >= 180) return null; P.t = [a - 20, b - 20, c - 30]; return { ans: x, wrong: [180 - x > 0 ? 540 - sum(P.t) : x + 10, 180 - x, x + 30].filter((v) => v > 0 && v !== x && v < 360), expl: `A quadrilateral's angles add up to 360°: 360 − (${P.t.join(' + ')}) = ${x}°.` } }
      case 'ratio': { const t = sum(q); if (360 % t) return null; const u = 360 / t; const ans = u * Math.max(...q); return { ans, wrong: [(180 * Math.max(...q)) / t, u * Math.min(...q), (540 * Math.max(...q)) / t].filter((v) => isInt(v) && v !== ans), expl: `${t} parts = 360°, so one part = ${u}°; the largest angle is ${Math.max(...q)} × ${u} = ${ans}°.` } }
      case 'hex': { const x = 720 - 5 * a; if (x <= 20 || x >= 300) return null; return { ans: x, wrong: [720 - 6 * a > 0 ? 720 - 6 * a : x + 30, 540 - 5 * a > 0 ? 540 - 5 * a : x + 60, a].filter((v) => v > 0 && v !== x), expl: `A hexagon's angles total 720°: 720 − 5 × ${a} = ${x}°.` } }
      case 'step': { const kk = k * 5; const x = (540 - 10 * kk) / 5; return { ans: x, wrong: [540 / 5, x + kk, (360 - 10 * kk) / 5].filter((v) => isInt(v) && v > 0 && v !== x), fmt: num, expl: `5x + ${10 * kk} = 540, so 5x = ${540 - 10 * kk} and x = ${x}.`, kk } }
      case 'exceed': { if (nn === reg) return null; const lo = Math.min(nn, reg); const hi = Math.max(nn, reg); P.lo = lo; P.hi = hi; const ans = (hi - lo) * 180; return { ans, wrong: [(hi - lo) * 90, (hi - lo) * 360, ans + 180], expl: `Each extra side adds 180°: (${hi} − ${lo}) × 180° = ${ans}°.` } }
      case 'sumn': { const m = n + 1; return { ans: S(m), wrong: [m * 180, S(m) - 180, (m - 2) * 90].filter((v) => v !== S(m)), expl: `(${m} − 2) × 180° = ${S(m)}°.` } }
      case 'abcd': { const x = (360 - b - d) / 2; if (!isInt(x) || x <= 20) return null; return { ans: x, wrong: [360 - b - d, 180 - x, (180 - b - d / 2 > 0 ? 180 - b : x + 10)].filter((v) => v > 0 && v !== x), expl: `∠A + ∠C = 360 − ${b} − ${d} = ${360 - b - d}°, and ∠A = ∠C, so ∠A = ${x}°.` } }
      default: { const i = 180 - 360 / reg; const Ssum = reg * i; return { ans: Ssum, wrong: [reg * 180, 360, (reg - 1) * i].filter((v) => v !== Ssum), expl: `Exterior angle = 180 − ${i} = ${360 / reg}°, so n = 360 ÷ ${360 / reg} = ${reg}; total = ${reg} × ${i}° = ${Ssum}°.` } }
    }
  },
  items: [
    [1, (p) => `What is the sum of the interior angles of a ${PNAME[p.nn]}?`, { m: 'sumnamed' }],
    [1, (p) => `Each interior angle of a regular ${PNAME[p.nn]} is:`, { m: 'eachnamed' }],
    [2, (p) => `The interior angles of a polygon add up to ${(p.n - 2) * 180}°. How many sides does the polygon have?`, { m: 'sidesfromsum' }],
    [2, (p) => `Four angles of a pentagon are ${p.a}°, ${p.b}°, ${p.c}° and ${p.d}°. What is the fifth angle?`, { m: 'fifth' }],
    [1, (p) => `Three angles of a quadrilateral are ${p.t[0]}°, ${p.t[1]}° and ${p.t[2]}°. Find the fourth angle.`, { m: 'fourth' }],
    [2, (p) => `The angles of a quadrilateral are in the ratio ${p.q.join(' : ')}. What is the largest angle?`, { m: 'ratio' }],
    [2, (p) => `Five of the angles of a hexagon are ${p.a}° each. What is the sixth angle?`, { m: 'hex' }],
    [2, (p) => { const kk = p.k * 5; return `The angles of a pentagon are x°, (x + ${kk})°, (x + ${2 * kk})°, (x + ${3 * kk})° and (x + ${4 * kk})°. What is x?` }, { m: 'step' }],
    [2, (p) => `By how many degrees does the sum of the interior angles of ${art(p.hi)} ${p.hi}-sided polygon exceed that of ${art(p.lo)} ${p.lo}-sided polygon?`, { m: 'exceed' }],
    [1, (p) => `What is the sum of the interior angles of a polygon with ${p.n + 1} sides?`, { m: 'sumn' }],
    [2, (p) => `In quadrilateral ABCD, ∠A = ∠C, ∠B = ${p.b}° and ∠D = ${p.d}°. What is ∠A?`, { m: 'abcd' }],
    [2, (p) => `Each interior angle of a regular polygon is ${180 - 360 / p.reg}°. What is the total of all its interior angles?`, { m: 'regsum' }],
  ],
})

family('ga.geometry.regular-polygon-sides', 'ga.geometry', {
  gen: (r) => ({ n: r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]), k: r.int(1, 8), nn: r.pick(NAMED) }),
  key: (p) => `${p.m}-${({ fromint: p.n, nameint: p.nn, exceed: p.n, vertices: p.n, ratio: p.k, frac: p.k, right: p.k, times: p.k })[p.m]}`,
  fact: (p) => (['ratio', 'frac'].includes(p.m) ? `ratio-${p.k}` : `${p.m}-${p.n}-${p.k}-${p.nn}`),
  solve: (P) => {
    const { n, k, nn } = P
    const i = 180 - 360 / n
    switch (P.m) {
      case 'fromint': return { ans: n, wrong: [n + 2, n - 2, Math.round(360 / i)].filter((v) => v > 2 && v !== n), expl: `Exterior angle = 180 − ${num(i)} = ${360 / n}°; sides = 360 ÷ ${360 / n} = ${n}.` }
      case 'nameint': return { ans: cap(PNAME[nn]), wrong: namesNear(nn), expl: `Exterior angle = 180 − ${180 - 360 / nn} = ${360 / nn}°; 360 ÷ ${360 / nn} = ${nn} sides, a ${PNAME[nn]}.` }
      case 'exceed': { if (n < 5) return null; const e = 360 / n; const dd = i - e; if (dd <= 0) return null; P.dd = dd; return { ans: n, wrong: [n + 2, Math.round(360 / dd) === n ? n - 2 : Math.round(360 / dd), n + 4].filter((v) => v > 2 && v !== n), expl: `i + e = 180 and i − e = ${num(dd)}, so e = ${num(e)}°; sides = 360 ÷ ${num(e)} = ${n}.` } }
      case 'vertices': return { ans: n, wrong: [n - 2, n + 1, n * 2].filter((v) => v !== n), expl: `Exterior angle = 180 − ${num(i)} = ${360 / n}°; a polygon has as many vertices as sides: 360 ÷ ${360 / n} = ${n}.` }
      case 'ratio': case 'frac': { if (k > 5) return null; const N = 2 * (k + 1); return { ans: N, wrong: [k + 1, 2 * k, 2 * k + 4].filter((v) => v !== N && v > 2), expl: `Interior = ${k} × exterior and interior + exterior = 180°, so exterior = 180 ÷ ${k + 1} = ${180 / (k + 1)}°; sides = 360 ÷ ${180 / (k + 1)} = ${N}.` } }
      case 'right': { const kk = [1, 2, 3, 5, 6][k % 5]; P.kk = kk; return { ans: 4 * kk, wrong: [kk, 2 * kk, 4 * kk + 2].filter((v) => v !== 4 * kk && v > 2), expl: `Exterior angle = 90° ÷ ${kk} = ${num(90 / kk)}°; sides = 360 ÷ ${num(90 / kk)} = ${4 * kk}.` } }
      default: return { ans: 2 * k + 2, wrong: [2 * k, k + 2, 2 * k + 4], expl: `(n − 2) × 180 = ${k} × 360 gives n − 2 = ${2 * k}, so n = ${2 * k + 2}.` }
    }
  },
  items: [
    [2, (p) => `Each interior angle of a regular polygon is ${num(180 - 360 / p.n)}°. How many sides does it have?`, { m: 'fromint' }],
    [2, (p) => `A regular polygon has interior angles of ${180 - 360 / p.nn}° each. Which polygon is it?`, { m: 'nameint' }],
    [3, (p) => `The interior angle of a regular polygon is ${num(p.dd)}° more than its exterior angle. How many sides does it have?`, { m: 'exceed' }],
    [2, (p) => `If each angle of a regular polygon is ${num(180 - 360 / p.n)}°, how many vertices does it have?`, { m: 'vertices' }],
    [3, (p) => `In a regular polygon the ratio of an interior angle to an exterior angle is ${p.k} : 1. How many sides does the polygon have?`, { m: 'ratio' }],
    [3, (p) => `Each exterior angle of a regular polygon is ${p.k === 1 ? 'equal to' : `one-${['', '', 'half', 'third', 'quarter', 'fifth'][p.k]} of`} its interior angle. How many sides does it have?`, { m: 'frac' }],
    [2, (p) => `Each exterior angle of a regular polygon is ${p.kk === 1 ? 'a right angle' : `one-${['', '', 'half', 'third', '', 'fifth', 'sixth'][p.kk]} of a right angle`}. How many sides does it have?`, { m: 'right' }],
    [2, (p) => `The sum of the interior angles of a polygon is ${p.k} times the sum of its exterior angles. How many sides does it have?`, { m: 'times' }],
  ],
})

family('ga.geometry.triangle-angle-sum', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ a: r.int(25, 80), b: r.int(20, 75), k: r.int(2, 5), m2: r.int(2, 6), q: r.pick([[1, 2, 3], [2, 3, 4], [1, 3, 5], [2, 3, 5], [3, 4, 5], [1, 4, 7], [4, 5, 9], [2, 7, 9], [1, 2, 6]]), d: r.int(5, 40), pick: r.int(0, 999) }),
  key: (p) => `${p.m}-${p.a}-${p.b}-${p.k}-${p.m2}-${p.q.join('')}-${p.d}-${p.pick}`,
  solve: (P) => {
    const { a, b, k, m2, q, d, pick } = P
    switch (P.m) {
      case 'third': { const c = 180 - a - b; if (c <= 10) return null; return { ans: c, wrong: [360 - a - b, 90 - (a + b) / 2 > 0 && isInt(90 - (a + b) / 2) ? 90 - (a + b) / 2 : c + 10, a + b].filter((v) => v !== c), expl: `Angles of a triangle add up to 180°: 180 − ${a} − ${b} = ${c}°.` } }
      case 'ratio': { const t = sum(q); if (180 % t) return null; const u = 180 / t; return { ans: u * q[2], wrong: [u * q[1], (360 / t) * q[2], u * q[0]].filter((v) => isInt(v) && v !== u * q[2]), expl: `${t} parts = 180°, so one part = ${u}°; the largest angle is ${q[2]} × ${u} = ${u * q[2]}°.` } }
      case 'right': return { ans: 90 - a, wrong: [180 - a, 90 + a, 180 - 2 * a].filter((v) => v > 0 && v !== 90 - a), expl: `The acute angles of a right-angled triangle add up to 90°: 90 − ${a} = ${90 - a}°.` }
      case 'xs': { if (k === m2) return null; const t = 1 + k + m2; if (180 % t) return null; const x = 180 / t; return { ans: x, wrong: [x * k, 180 / (k + m2), 360 / t].filter((v) => isInt(v) && v !== x), fmt: num, expl: `x + ${k}x + ${m2}x = ${t}x = 180, so x = ${x}.` } }
      case 'diff': { const c = b + 40; const A = (180 - c + d) / 2; if (!isInt(A) || A - d <= 5) return null; P.c = c; return { ans: A, wrong: [A - d, 180 - c, (180 - c) / 2].filter((v) => isInt(v) && v !== A), expl: `∠A + ∠B = 180 − ${c} = ${180 - c}° and ∠A − ∠B = ${d}°, so ∠A = (${180 - c} + ${d}) ÷ 2 = ${A}°.` } }
      case 'lin': { const p1 = a % 20 + 1; const q1 = b % 15 + 1; const r1 = d; const x = (180 - p1 + q1 - r1) / 4; if (!isInt(x) || 2 * x - q1 <= 0) return null; P.pq = [p1, q1, r1]; return { ans: x, wrong: [(180 - p1 - q1 - r1) / 4, 180 / 4, x + q1].filter((v) => isInt(v) && v > 0 && v !== x), fmt: num, expl: `(x + ${p1}) + (2x − ${q1}) + (x + ${r1}) = 4x + ${p1 - q1 + r1} = 180, so x = ${x}.` } }
      case 'largest': { const c = b + 30; const s = (180 - c) / (k + 1); if (!isInt(s) || k * s <= c) return null; P.c = c; return { ans: k * s, wrong: [s, c, 180 - c].filter((v) => v !== k * s), expl: `smallest + ${k} × smallest = 180 − ${c} = ${180 - c}°, so the smallest is ${s}° and the largest ${k * s}°.` } }
      case 'which': { const rr = makeRng(`tri-${pick}`); const x = rr.int(30, 80); const y = rr.int(20, 90); const z = 180 - x - y; if (z <= 5) return null; const good = [x, y, z]; const bad = [[x, y, z + 10], [x + 5, y + 10, z], [x, y - 15, z]]; const t = (A) => A.map((v) => `${v}°`).join(', '); return { ans: t(good), wrong: bad.map(t), expl: `Only ${t(good)} add up to 180° (${x} + ${y} + ${z}); the other sets total ${bad.map((A) => sum(A)).join('°, ')}°.` } }
      case 'rratio': { const [p1, p2] = [q[0], q[1]]; const t = p1 + p2; if (90 % t) return null; const s = (90 / t) * p1; return { ans: s, wrong: [(90 / t) * p2, (180 / t) * p1, 90 - s + 10].filter((v) => isInt(v) && v !== s), expl: `The acute angles total 90°: ${t} parts = 90°, one part = ${90 / t}°, so the smaller is ${s}°.` } }
      case 'sumdiff': { const s = a + 70; const dd = d; if ((s + dd) % 2 || s >= 170 || dd >= s) return null; const x = (s + dd) / 2; const y = (s - dd) / 2; const z = 180 - s; const L = Math.max(x, y, z); return { ans: L, wrong: [x === L ? z : x, s, y].filter((v) => v !== L), expl: `The two angles are (${s} + ${dd}) ÷ 2 = ${x}° and ${y}°; the third is 180 − ${s} = ${z}°. The largest is ${L}°.` } }
      case 'twoeq': { if (a >= 90) return null; return { ans: 180 - 2 * a, wrong: [180 - a, 90 - a, 2 * a].filter((v) => v > 0 && v !== 180 - 2 * a), expl: `180 − 2 × ${a} = ${180 - 2 * a}°.` } }
      default: { const x = 180 / (k + 1); return { ans: x, wrong: [180 / k, 90 / k, 180 - x].filter((v) => isInt(v) && v !== x), expl: `If the angle is x, the other two total ${k}x, so x + ${k}x = 180 and x = ${num(x)}°.` } }
    }
  },
  items: [
    [1, (p) => `Two angles of a triangle are ${p.a}° and ${p.b}°. What is the third angle?`, { m: 'third' }],
    [2, (p) => `The angles of a triangle are in the ratio ${p.q.join(' : ')}. What is the largest angle?`, { m: 'ratio' }],
    [1, (p) => `In a right-angled triangle one of the acute angles is ${p.a}°. What is the other acute angle?`, { m: 'right' }],
    [2, (p) => `The angles of a triangle are x°, ${p.k}x° and ${p.m2}x°. What is the value of x?`, { m: 'xs' }],
    [2, (p) => `In triangle ABC, ∠A is ${p.d}° more than ∠B and ∠C = ${p.c}°. Find ∠A.`, { m: 'diff' }],
    [2, (p) => `The angles of a triangle are (x + ${p.pq[0]})°, (2x − ${p.pq[1]})° and (x + ${p.pq[2]})°. What is the value of x?`, { m: 'lin' }],
    [2, (p) => `In a triangle, the largest angle is ${W_TIMES[p.k]} the smallest, and the third angle is ${p.c}°. What is the largest angle?`, { m: 'largest' }],
    [1, () => `Which of the following sets of angles could be the angles of a triangle?`, { m: 'which' }],
    [2, (p) => `The two acute angles of a right-angled triangle are in the ratio ${p.q[0]} : ${p.q[1]}. What is the smaller of them?`, { m: 'rratio' }],
    [3, (p) => `Two angles of a triangle add up to ${p.a + 70}° and differ by ${p.d}°. What is the largest angle of the triangle?`, { m: 'sumdiff' }],
    [1, (p) => `Two angles of a triangle are each ${p.a}°. What is the third angle?`, { m: 'twoeq' }],
    [2, (p) => `One angle of a triangle is ${['', '', 'half', 'one-third', 'one-quarter', 'one-fifth'][p.k]} of the sum of the other two angles. What is that angle?`, { m: 'half' }],
  ],
})
family('ga.geometry.isosceles-triangle', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ a: r.int(20, 85), v: r.int(20, 140), o: r.int(95, 160), k: r.pick([1, 2, 4, 7]), d: r.int(3, 60), e: r.int(95, 140), pick: r.int(0, 999) }),
  key: (p) => `${p.m}-${({ base: p.a, vertex: p.v, obtuse: p.o, could: p.a * 1000 + p.pick, ktimes: p.k, more: p.d, pqr: p.a, right: 0, ext: p.e, gap: p.v })[p.m]}`,
  solve: (P) => {
    const { a, v, o, k, d, e, pick } = P
    switch (P.m) {
      case 'base': return { ans: 180 - 2 * a, wrong: [180 - a, (180 - a) / 2, 90 - a].filter((x) => isInt(x) && x > 0 && x !== 180 - 2 * a), expl: `180 − 2 × ${a} = ${180 - 2 * a}°.` }
      case 'vertex': { if (v % 2) return null; const b = (180 - v) / 2; return { ans: b, wrong: [180 - v, 180 - 2 * v > 0 ? 180 - 2 * v : v / 2, (180 - v) / 3].filter((x) => isInt(x) && x > 0 && x !== b), expl: `The base angles are equal: (180 − ${v}) ÷ 2 = ${b}°.` } }
      case 'obtuse': { if (o % 2) return null; const b = (180 - o) / 2; return { ans: `${b}° each`, wrong: [`${o}° and ${180 - 2 * o < 0 ? b + 10 : 180 - 2 * o}°`, `${180 - o}° each`, `${b + 5}° each`].filter((t) => t !== `${b}° each`), expl: `An obtuse angle can only be the vertex angle (two obtuse angles would exceed 180°), so the other two are (180 − ${o}) ÷ 2 = ${b}° each.` } }
      case 'could': {
        if (a === 60 || a % 2) return null
        const valid = new Set([a, 180 - 2 * a, (180 - a) / 2])
        const rr = makeRng(`iso-${a}-${pick}`); const ans = rr.pick([180 - 2 * a, (180 - a) / 2])
        const bad = [90 - a, 180 - a, a + 10, a / 2, 2 * a].filter((x) => x > 0 && x < 180 && !valid.has(x))
        return { ans, wrong: bad, expl: `If ${a}° is a base angle, the angles are ${a}°, ${a}°, ${180 - 2 * a}°; if it is the vertex angle, the others are ${(180 - a) / 2}° each. So ${ans}° is possible; the other options fit neither case.` }
      }
      case 'ktimes': { const x = 180 / (2 * k + 1); if (!isInt(x)) return null; return { ans: x, wrong: [k * x, 180 / (k + 2), 90 / k, 180 / (k + 1), 2 * x].filter((y) => isInt(y) && y !== x), expl: `If the vertex angle is v, each base angle is ${k}v, so v + ${2 * k}v = 180 and v = ${x}°.` } }
      case 'more': { const b = (180 - d) / 3; if (!isInt(b)) return null; return { ans: b + d, wrong: [b, (180 + d) / 2, (180 - d) / 2].filter((y) => isInt(y) && y !== b + d), expl: `Base angles b, vertex b + ${d}: 3b + ${d} = 180, so b = ${b}° and the vertex angle is ${b + d}°.` } }
      case 'pqr': return { ans: 180 - 2 * a, wrong: [a, (180 - a) / 2, 180 - a].filter((y) => isInt(y) && y !== 180 - 2 * a), expl: `PQ = PR makes ∠Q = ∠R = ${a}°, so ∠P = 180 − ${2 * a} = ${180 - 2 * a}°.` }
      case 'right': return { ans: 45, wrong: [60, 90, 30], expl: `The right angle is the vertex angle; the other two are equal and share 90°, so each is 45°.` }
      case 'ext': { const bA = 180 - e; const A = 180 - 2 * bA; return { ans: A, wrong: [bA, e - 90, 180 - A / 2 > 0 && isInt(180 - A / 2) ? 180 - A / 2 : A + 10].filter((y) => y > 0 && y !== A), expl: `∠C = 180 − ${e} = ${bA}°; ∠B = ∠C, so ∠A = 180 − 2 × ${bA} = ${A}°.` } }
      default: { if (v % 2) return null; const b = (180 - v) / 2; const g = Math.abs(b - v); if (g === 0) return null; return { ans: g, wrong: [b, 180 - v, v - 2 * b > 0 ? g + 10 : Math.abs(v - (180 - v))].filter((y) => y !== g && y > 0), expl: `Each base angle is (180 − ${v}) ÷ 2 = ${b}°; the difference from ${v}° is ${g}°.` } }
    }
  },
  items: [
    [1, (p) => `The two equal angles of an isosceles triangle are ${p.a}° each. What is the third angle?`, { m: 'base' }],
    [1, (p) => `The vertex angle of an isosceles triangle is ${p.v}°. What is each base angle?`, { m: 'vertex' }],
    [2, (p) => `One angle of an isosceles triangle is ${p.o}°. What are the other two angles?`, { m: 'obtuse' }],
    [2, (p) => `One angle of an isosceles triangle is ${p.a}°. Which of the following could be another of its angles?`, { m: 'could' }],
    [2, (p) => `In an isosceles triangle each base angle is ${p.k === 1 ? 'equal to' : `${p.k} times`} the vertex angle. What is the vertex angle?`, { m: 'ktimes' }],
    [2, (p) => `The vertex angle of an isosceles triangle is ${p.d}° more than each base angle. Find the vertex angle.`, { m: 'more' }],
    [1, (p) => `In triangle PQR, PQ = PR and ∠Q = ${p.a}°. What is ∠P?`, { m: 'pqr' }],
    [1, () => `In an isosceles right-angled triangle, each of the two equal angles measures:`, { m: 'right' }],
    [3, (p) => `In triangle ABC, AB = AC. Side BC is extended beyond C, and the exterior angle formed at C is ${p.e}°. What is ∠A?`, { m: 'ext' }],
    [2, (p) => `An isosceles triangle has a vertex angle of ${p.v}°. What is the difference between a base angle and the vertex angle?`, { m: 'gap' }],
  ],
})

family('ga.geometry.triangle-exterior-angle', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ e: r.int(70, 160), a: r.int(20, 65), q: r.pick([[1, 3], [2, 3], [1, 2], [3, 5], [1, 4], [2, 7], [4, 5]]), q3: r.pick([[2, 3, 4], [3, 4, 5], [4, 5, 6], [5, 6, 7], [2, 3, 3], [3, 3, 4]]), d: r.int(4, 40), k: r.pick([2, 3, 4, 5, 8, 9]), t: r.pick([[40, 60, 80], [35, 65, 80], [30, 70, 80], [45, 55, 80], [50, 60, 70], [25, 70, 85], [20, 75, 85]]) }),
  key: (p) => `${p.m}-${p.e}-${p.a}-${p.q.join('')}-${p.q3.join('')}-${p.d}-${p.k}-${p.t.join('')}`,
  fact: (p) => `${p.m}`,
  solve: (P) => {
    const { e, a, q, q3, d, k, t } = P
    switch (P.m) {
      case 'other': { if (e - a <= 10) return null; return { ans: e - a, wrong: [180 - e, 180 - a - e > 0 ? 180 - a - e : e + a - 90, e + a].filter((v) => v > 0 && v !== e - a && v < 180), expl: `An exterior angle equals the sum of the two interior opposite angles: ${e} − ${a} = ${e - a}°.` } }
      case 'ratio': { const s = q[0] + q[1]; if (e % s) return null; const u = e / s; const t2 = (x, y) => `${x}° and ${y}°`; return { ans: t2(u * q[0], u * q[1]), wrong: [t2(((180 - e) / s) * q[0], ((180 - e) / s) * q[1]), t2(u * q[0] + 5, u * q[1] + 15), t2(u * q[0] - 5, u * q[1] - 15)].filter((x) => !/\.\d/.test(x) && !x.includes('−') && x !== t2(u * q[0], u * q[1])), expl: `The two interior opposite angles add up to ${e}°; ${s} parts = ${e}°, so they are ${u * q[0]}° and ${u * q[1]}°.` } }
      case 'adj': return { ans: 180 - e, wrong: [360 - e, e - 90 > 0 ? e - 90 : e + 10, e / 2].filter((v) => isInt(v) && v !== 180 - e), expl: `An exterior angle and its adjacent interior angle form a straight line: 180 − ${e} = ${180 - e}°.` }
      case 'abc': { if (e - a <= 10) return null; return { ans: e - a, wrong: [180 - e, 180 - (e - a), e + a - 90].filter((v) => v > 0 && v !== e - a && v < 180), expl: `∠ACD = ∠A + ∠B, so ∠B = ${e} − ${a} = ${e - a}°.` } }
      case 'equal': { if (e % 2) return null; return { ans: e / 2, wrong: [180 - e, (180 - e) / 2, e].filter((v) => isInt(v) && v > 0 && v !== e / 2), expl: `∠A + ∠B = ∠ACD = ${e}°; with ∠A = ∠B, each is ${e / 2}°.` } }
      case 'ext3': { const s = sum(q3); if (360 % s) return null; const u = 360 / s; const exts = q3.map((x) => x * u); const ints = exts.map((x) => 180 - x); if (ints.some((x) => x <= 0)) return null; const ans = Math.min(...ints); return { ans, wrong: [Math.min(...exts), 180 - Math.min(...exts), (180 / s) * q3[0]].filter((v) => isInt(v) && v !== ans), expl: `Exterior angles total 360°: they are ${exts.join('°, ')}°. The smallest interior angle is 180 − ${Math.max(...exts)} = ${ans}°.` } }
      case 'differ': { if ((e + d) % 2 || d >= e) return null; return { ans: (e + d) / 2, wrong: [(e - d) / 2, (180 - e + d) / 2, e - d].filter((v) => isInt(v) && v > 0 && v !== (e + d) / 2), expl: `The two angles add up to ${e}° and differ by ${d}°, so the larger is (${e} + ${d}) ÷ 2 = ${(e + d) / 2}°.` } }
      case 'largest': { const mn = Math.min(...t); return { ans: 180 - mn, wrong: [180 - Math.max(...t), Math.max(...t), 360 - mn].filter((v) => v !== 180 - mn), expl: `The largest exterior angle is next to the smallest interior angle: 180 − ${mn} = ${180 - mn}°.` } }
      case 'pqr': { if ((e - d) % 2) return null; const x = (e - d) / 2; if (x <= 5) return null; return { ans: x, wrong: [(e + d) / 2, (180 - e - d) / 2, e - d].filter((v) => isInt(v) && v > 0 && v !== x), fmt: num, expl: `The exterior angle at R equals ∠P + ∠Q: x + (x + ${d}) = ${e}, so 2x = ${e - d} and x = ${x}.` } }
      default: { const x = 180 / (k + 1); return { ans: x, wrong: [180 - x, 180 / k, 90 / (k + 1)].filter((v) => isInt(v) && v !== x), expl: `interior + ${k} × interior = 180°, so the interior angle is 180 ÷ ${k + 1} = ${x}°.` } }
    }
  },
  items: [
    [1, (p) => `An exterior angle of a triangle is ${p.e}° and one of the interior opposite angles is ${p.a}°. What is the other interior opposite angle?`, { m: 'other' }],
    [2, (p) => `An exterior angle of a triangle is ${p.e}° and the interior opposite angles are in the ratio ${p.q.join(' : ')}. The interior opposite angles measure:`, { m: 'ratio' }],
    [1, (p) => `An exterior angle of a triangle is ${p.e}°. What is the interior angle adjacent to it?`, { m: 'adj' }],
    [1, (p) => `In triangle ABC, side BC is extended to D. If ∠ACD = ${p.e}° and ∠A = ${p.a}°, find ∠B.`, { m: 'abc' }],
    [2, (p) => `In triangle ABC, BC is produced to D so that ∠ACD = ${p.e}°. If ∠A = ∠B, find ∠A.`, { m: 'equal' }],
    [3, (p) => `The exterior angles of a triangle are in the ratio ${p.q3.join(' : ')}. What is the smallest interior angle?`, { m: 'ext3' }],
    [2, (p) => `An exterior angle of a triangle is ${p.e}°, and the two interior opposite angles differ by ${p.d}°. What is the larger of them?`, { m: 'differ' }],
    [2, (p) => `The interior angles of a triangle are ${p.t[0]}°, ${p.t[1]}° and ${p.t[2]}°. What is its largest exterior angle?`, { m: 'largest' }],
    [2, (p) => `In triangle PQR, ∠P = x°, ∠Q = (x + ${p.d})° and the exterior angle at R is ${p.e}°. Find x.`, { m: 'pqr' }],
    [2, (p) => `An exterior angle of a triangle is ${p.k} times the interior angle next to it. What is that interior angle?`, { m: 'ktimes' }],
  ],
})

family('ga.geometry.complementary-supplementary', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ a: r.int(12, 88), b: r.int(20, 170), k: r.pick([2, 3, 4, 5, 8, 9]), d: 2 * r.int(5, 60), q: r.pick([[1, 2], [2, 3], [1, 5], [4, 5], [7, 8], [2, 7], [1, 8], [3, 7]]), ks: r.pick([3, 4, 6, 10]) }),
  key: (p) => `${p.m}-${p.a}-${p.b}-${p.k}-${p.d}-${p.q.join('')}-${p.ks}`,
  fact: (p) => `${p.m}`,
  solve: (P) => {
    const { a, b, k, d, q, ks } = P
    switch (P.m) {
      case 'comp': return { ans: 90 - a, wrong: [180 - a, 90 + a, 360 - a].filter((v) => v !== 90 - a), expl: `Complementary angles add up to 90°: 90 − ${a} = ${90 - a}°.` }
      case 'supp': return { ans: 180 - b, wrong: [90 - b > 0 ? 90 - b : 270 - b, 360 - b, 180 + b].filter((v) => v !== 180 - b), expl: `Supplementary angles add up to 180°: 180 − ${b} = ${180 - b}°.` }
      case 'self': return { ans: 45, wrong: [30, 90, 60], expl: `If x = 90 − x, then 2x = 90 and x = 45°.` }
      case 'kcomp': { const x = (90 * k) / (k + 1); if (!isInt(x)) return null; return { ans: x, wrong: [90 / (k + 1), (180 * k) / (k + 1), 90 - x + 5].filter((v) => isInt(v) && v !== x), expl: `x = ${k}(90 − x) gives ${k + 1}x = ${90 * k}, so x = ${x}°.` } }
      case 'moresupp': { if (d >= 180) return null; return { ans: (180 + d) / 2, wrong: [(180 - d) / 2, (90 + d) / 2, 180 - d].filter((v) => isInt(v) && v !== (180 + d) / 2), expl: `x − (180 − x) = ${d}, so 2x = ${180 + d} and x = ${(180 + d) / 2}°.` } }
      case 'suppcomp': { const x = (90 * ks - 180) / (ks - 1); if (!isInt(x)) return null; return { ans: x, wrong: [90 - x, 180 - x, 180 / ks].filter((v) => isInt(v) && v !== x), expl: `180 − x = ${ks}(90 − x) gives ${ks - 1}x = ${90 * ks - 180}, so x = ${x}°.` } }
      case 'cratio': { const s = q[0] + q[1]; if (90 % s) return null; const u = 90 / s; return { ans: u * q[1], wrong: [u * q[0], (180 / s) * q[1], 90 - u].filter((v) => v !== u * q[1]), expl: `${s} parts = 90°, so one part = ${u}° and the larger angle is ${q[1]} × ${u} = ${u * q[1]}°.` } }
      case 'sdiff': { if (d >= 180) return null; return { ans: (180 - d) / 2, wrong: [(180 + d) / 2, (90 - d / 2) > 0 ? 90 - d / 2 : d, 180 - d, d].filter((v) => isInt(v) && v > 0 && v !== (180 - d) / 2), expl: `x + (x + ${d}) = 180, so x = (180 − ${d}) ÷ 2 = ${(180 - d) / 2}°.` } }
      case 'gap': return { ans: 90, wrong: [180 - 2 * a, 2 * a, 180].filter((v) => v > 0 && v !== 90), expl: `(180 − ${a}) − (90 − ${a}) = 90°; the difference is always 90°.` }
      default: { const x = 180 / (k + 1); if (!isInt(x)) return null; return { ans: x, wrong: [180 - x, 90 / (k + 1), 180 / k].filter((v) => isInt(v) && v !== x), expl: `x + ${k}x = 180, so x = ${x}°.` } }
    }
  },
  items: [
    [1, (p) => `What is the complement of an angle of ${p.a}°?`, { m: 'comp' }],
    [1, (p) => `What is the supplement of an angle of ${p.b}°?`, { m: 'supp' }],
    [1, () => `What is the measure of an angle that is equal to its own complement?`, { m: 'self' }],
    [2, (p) => `An angle is ${W_TIMES[p.k] ?? `${p.k} times`} its complement. Find the angle.`, { m: 'kcomp' }],
    [2, (p) => `An angle is ${p.d}° more than its supplement. What is the angle?`, { m: 'moresupp' }],
    [3, (p) => `The supplement of an angle is ${p.ks} times its complement. What is the angle?`, { m: 'suppcomp' }],
    [2, (p) => `Two complementary angles are in the ratio ${p.q.join(' : ')}. What is the larger angle?`, { m: 'cratio' }],
    [2, (p) => `Two supplementary angles differ by ${p.d}°. What is the smaller angle?`, { m: 'sdiff' }],
    [1, (p) => `By how much does the supplement of ${p.a}° exceed its complement?`, { m: 'gap' }],
    [2, (p) => `Find the angle whose supplement is ${p.k} times the angle itself.`, { m: 'ksupp' }],
  ],
})
family('ga.geometry.parallel-lines', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ a: r.int(35, 145), p1: r.int(2, 5), q1: r.int(5, 30), r1: r.int(1, 4), s1: r.int(5, 30), x: r.int(15, 40), q: r.pick([[1, 2], [2, 3], [1, 5], [4, 5], [2, 7], [1, 3], [3, 7], [7, 11]]) }),
  key: (p) => `${p.m}-${p.a}-${p.p1}-${p.q1}-${p.r1}-${p.s1}-${p.x}-${p.q.join('')}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { a, p1, q1, r1, s1, x, q } = P
    switch (P.m) {
      case 'corr': if (a === 90) return null; return { ans: a, wrong: [180 - a, Math.abs(90 - a), 360 - a], expl: `Corresponding angles on parallel lines are equal, so the other angle is also ${a}°.` }
      case 'coint': if (a === 90) return null; return { ans: 180 - a, wrong: [a, Math.abs(90 - a), 360 - a], expl: `Co-interior (allied) angles add up to 180°: 180 − ${a} = ${180 - a}°.` }
      case 'alt': if (a === 90) return null; return { ans: a, wrong: [180 - a, 360 - a, Math.abs(90 - a)], expl: `Alternate interior angles formed by a transversal across parallel lines are equal: ${a}°.` }
      case 'cox': { if (p1 === r1) return null; const A1 = p1 * x + q1; const A2 = 180 - A1; const s = r1 * x - A2; if (s <= 0 || A2 <= 0) return null; P.s = s; return { ans: x, wrong: [(180 - q1 + s) / (p1 + r1) + 5, (q1 + s) / Math.abs(p1 - r1), x + 10].filter((v) => isInt(v) && v > 0 && v !== x), fmt: num, expl: `Co-interior angles add up to 180°: ${p1 + r1}x ${sg(q1 - s)} = 180, so x = ${x}.` } }
      case 'altx': { if (p1 <= r1) return null; const A = r1 * x + s1; const q2 = p1 * x - A; if (q2 <= 0) return null; P.q2 = q2; return { ans: x, wrong: [(s1 + q2) / (p1 + r1), x + 5, (180 - s1 + q2) / (p1 + r1)].filter((v) => isInt(v) && v > 0 && v !== x), fmt: num, expl: `Alternate angles are equal: ${p1}x − ${q2} = ${r1 === 1 ? '' : r1}x + ${s1}, so ${p1 - r1}x = ${s1 + q2} and x = ${x}.` } }
      case 'corrsize': { if (p1 <= r1) return null; const A = r1 * x + s1; const q2 = p1 * x - A; if (q2 <= 0 || A >= 180) return null; P.q2 = q2; return { ans: A, wrong: [x, 180 - A, A + 10].filter((v) => v !== A), expl: `Corresponding angles are equal: ${p1}x − ${q2} = ${r1 === 1 ? '' : r1}x + ${s1} gives x = ${x}, so each angle is ${A}°.` } }
      case 'obtuse': { const acute = Math.min(a, 180 - a); if (acute === 90 || acute < 30) return null; P.ac = acute; return { ans: 4 * (180 - acute), wrong: [2 * (180 - acute), 4 * acute, 360].filter((v) => v !== 4 * (180 - acute)), expl: `The eight angles are four of ${acute}° and four of ${180 - acute}°; the obtuse ones total 4 × ${180 - acute} = ${4 * (180 - acute)}°.` } }
      default: { const s = q[0] + q[1]; if (180 % s) return null; const u = 180 / s; return { ans: u * q[0], wrong: [u * q[1], (90 / s) * q[0], 180 - u].filter((v) => isInt(v) && v !== u * q[0]), expl: `Co-interior angles total 180°: ${s} parts = 180°, so the smaller is ${q[0]} × ${u} = ${u * q[0]}°.` } }
    }
  },
  items: [
    [1, (p) => `Two parallel lines are cut by a transversal. One of a pair of corresponding angles is ${p.a}°. What is the other?`, { m: 'corr' }],
    [1, (p) => `A transversal crosses two parallel lines. If one of a pair of co-interior angles is ${p.a}°, what is the other?`, { m: 'coint' }],
    [1, (p) => `When a transversal cuts two parallel lines, one of a pair of alternate interior angles is ${p.a}°. The other angle of the pair is:`, { m: 'alt' }],
    [2, (p) => `A transversal cuts two parallel lines, making co-interior angles of (${p.p1}x + ${p.q1})° and (${p.r1 === 1 ? '' : p.r1}x − ${p.s})°. What is x?`, { m: 'cox' }],
    [2, (p) => `Two alternate angles formed by a transversal across parallel lines are (${p.p1}x − ${p.q2})° and (${p.r1 === 1 ? '' : p.r1}x + ${p.s1})°. Find x.`, { m: 'altx' }],
    [3, (p) => `Corresponding angles formed by a transversal across two parallel lines are (${p.p1}x − ${p.q2})° and (${p.r1 === 1 ? '' : p.r1}x + ${p.s1})°. What is the size of each angle?`, { m: 'corrsize' }],
    [3, (p) => `A transversal meets two parallel lines, and one of the eight angles formed is ${p.ac}°. What is the sum of all the obtuse angles formed?`, { m: 'obtuse' }],
    [2, (p) => `Two co-interior angles between a pair of parallel lines are in the ratio ${p.q.join(' : ')}. What is the smaller angle?`, { m: 'ratio' }],
  ],
})

family('ga.geometry.pythagoras', 'ga.geometry', {
  gen: (r) => { const t = r.pick(PY); const s = r.pick([1, 1, 2, 3]); const [a, b, c] = t.map((v) => v * s); return { a, b, c, pick: r.int(0, 9999), h2: r.int(2, 10) } },
  key: (p) => `${p.m}-${p.a}-${p.b}-${p.c}`,
  fact: (p) => `${p.m}`,
  solve: (P) => {
    const { a, b, c, pick, h2 } = P
    const U = (u) => ({ fmt: (v) => `${num(v)} ${u}` })
    const std = (ans, x, y) => [x + y, Math.abs(y - x) || ans + 1, ans + 1, ans - 1].filter((v) => v > 0 && v !== ans)
    switch (P.m) {
      case 'hyp': return { ...U('cm'), ans: c, wrong: std(c, a, b), expl: `c² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}, so c = ${c} cm.` }
      case 'leg': return { ...U('cm'), ans: b, wrong: [c - a, c + a > 60 ? b + 1 : c + a, b + 2, b - 1].filter((v) => v > 0 && v !== b), expl: `${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}, so the third side is ${b} cm.` }
      case 'ladder': return { ...U('m'), ans: b, wrong: [c - a, c + a, b + 1].filter((v) => v !== b), expl: `height² = ${c}² − ${a}² = ${c * c - a * a}, so the height is ${b} m.` }
      case 'diag': return { ...U('cm'), ans: c, wrong: std(c, a, b), expl: `diagonal² = ${a}² + ${b}² = ${c * c}, so the diagonal is ${c} cm.` }
      case 'walk': return { ...U('km'), ans: c, wrong: std(c, a, b), expl: `The paths are at right angles: √(${a}² + ${b}²) = √${c * c} = ${c} km.` }
      case 'which': { const rr = makeRng(`py-${pick}`); const t = rr.pick(PY); const f = (x) => x.join(', '); const bad = [[t[0], t[1], t[2] + 1], [t[0] + 1, t[1], t[2]], [t[0], t[1] + 2, t[2] + 1]]; return { ans: f(t), wrong: bad.map(f), expl: `${t[0]}² + ${t[1]}² = ${t[0] ** 2 + t[1] ** 2} = ${t[2]}², so ${f(t)} is a right-angled triangle; the other sets fail this test.` } }
      case 'square': { const s = a; return { ...U('cm'), ans: s, wrong: [2 * s, s * s, s + 2].filter((v) => v !== s), expl: `A square of side s has diagonal s√2, so s = ${s} cm.` } }
      case 'kite': return { ...U('m'), ans: b, wrong: [c - a, a, b + 2].filter((v) => v !== b), expl: `The string is the hypotenuse: height² = ${c}² − ${a}² = ${b * b}, so the kite is ${b} m high.` }
      case 'rhombus': return { ...U('cm'), ans: c, wrong: [a + b, 2 * c, c + 1].filter((v) => v !== c), expl: `The diagonals of a rhombus bisect each other at right angles, giving half-diagonals ${a} and ${b}; side = √(${a * a} + ${b * b}) = ${c} cm.` }
      case 'isosceles': return { ...U('cm'), ans: b, wrong: [c - a, Math.round(Math.sqrt(c * c - 4 * a * a)) || b + 2, b + 1].filter((v) => v > 0 && v !== b), expl: `The height bisects the base: height² = ${c}² − ${a}² = ${b * b}, so the height is ${b} cm.` }
      case 'area': return { fmt: (v) => `${num(v)} cm²`, ans: (a * b) / 2, wrong: [a * b, (c * c) / 2, a * b + c].filter((v) => isInt(v) && v !== (a * b) / 2), expl: `a + b = ${a + b} and a² + b² = ${c * c}; 2ab = ${(a + b) ** 2} − ${c * c} = ${2 * a * b}, so the area ab/2 = ${(a * b) / 2} cm².` }
      case 'poles': { const hi = h2 + a; P.h1 = hi; return { ...U('m'), ans: c, wrong: [Math.round(Math.sqrt(b * b + hi * hi)) === c ? c + 2 : Math.round(Math.sqrt(b * b + hi * hi)), b + a, c + 1].filter((v) => v !== c), expl: `The height difference is ${hi} − ${h2} = ${a} m and the gap ${b} m: distance = √(${a * a} + ${b * b}) = ${c} m.` } }
      case 'ship': return { ...U('km'), ans: c, wrong: std(c, a, b), expl: `Distance = √(${a}² + ${b}²) = √${c * c} = ${c} km.` }
      default: { const d1 = b - a; const d2 = c - a; if (d1 <= 0) return null; P.d1 = d1; P.d2 = d2; return { ans: c, wrong: [a, b, c + d1].filter((v) => v !== c), expl: `x² + (x + ${d1})² = (x + ${d2})² is satisfied by x = ${a}: ${a * a} + ${b * b} = ${c * c}. The hypotenuse is ${c}.` } }
    }
  },
  items: [
    [1, (p) => `The two shorter sides of a right-angled triangle are ${p.a} cm and ${p.b} cm. What is the length of the hypotenuse?`, { m: 'hyp' }],
    [1, (p) => `The hypotenuse of a right-angled triangle is ${p.c} cm and one of the other sides is ${p.a} cm. Find the third side.`, { m: 'leg' }],
    [2, (p) => `A ladder ${p.c} m long rests against a vertical wall with its foot ${p.a} m from the wall. How high up the wall does it reach?`, { m: 'ladder' }],
    [2, (p) => `What is the length of the diagonal of a rectangle measuring ${p.a} cm by ${p.b} cm?`, { m: 'diag' }],
    [2, (p) => `A man walks ${p.a} km due north and then ${p.b} km due east. How far is he from his starting point?`, { m: 'walk' }],
    [1, () => `Which of the following sets of lengths can form a right-angled triangle?`, { m: 'which' }],
    [1, (p) => `The diagonal of a square is ${p.a}√2 cm. What is the length of its side?`, { m: 'square' }],
    [2, (p) => `A kite string ${p.c} m long is pulled tight and tied to the ground. The kite is directly above a point ${p.a} m from where the string is tied. How high is the kite?`, { m: 'kite' }],
    [3, (p) => `The diagonals of a rhombus are ${2 * p.a} cm and ${2 * p.b} cm long. What is the length of each side?`, { m: 'rhombus' }],
    [2, (p) => `An isosceles triangle has two equal sides of ${p.c} cm and a base of ${2 * p.a} cm. What is its height?`, { m: 'isosceles' }],
    [3, (p) => `A right-angled triangle has a hypotenuse of ${p.c} cm and a perimeter of ${p.a + p.b + p.c} cm. What is its area?`, { m: 'area' }],
    [3, (p) => `Two vertical poles ${p.h1} m and ${p.h2} m high stand ${p.b} m apart on level ground. What is the distance between their tops?`, { m: 'poles' }],
    [2, (p) => `A ship sails ${p.a} km west from a port and then ${p.b} km south. How far is it from the port in a straight line?`, { m: 'ship' }],
    [3, (p) => `The sides of a right-angled triangle are x, x + ${p.d1} and x + ${p.d2}, the last being the hypotenuse. What is the length of the hypotenuse?`, { m: 'alg' }],
  ],
})

family('ga.geometry.circle-angles', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ a: r.int(20, 80), c: r.int(30, 150), p1: r.int(2, 4), q1: r.int(5, 30), r1: r.int(1, 3), x: r.int(15, 30) }),
  key: (p) => `${p.m}-${p.a}-${p.c}-${p.p1}-${p.q1}-${p.r1}-${p.x}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { a, c, p1, q1, r1, x } = P
    switch (P.m) {
      case 'semi': return { ans: 90, wrong: [180, 60, 45], expl: `An angle inscribed in a semicircle (standing on a diameter) is always a right angle.` }
      case 'centre': return { ans: a, wrong: [2 * a, 180 - 2 * a, 90 - a].filter((v) => v > 0 && v !== a), expl: `The angle at the circumference is half the angle at the centre: ${2 * a} ÷ 2 = ${a}°.` }
      case 'double': return { ans: 2 * a, wrong: [a / 2, 180 - a, 90 + a].filter((v) => isInt(v) && v !== 2 * a), expl: `The angle at the centre is twice the angle at the circumference: 2 × ${a} = ${2 * a}°.` }
      case 'tangent': return { ans: 90 - a, wrong: [180 - a, a, 90 + a].filter((v) => v !== 90 - a), expl: `The radius OT is perpendicular to the tangent, so ∠OTP = 90° and ∠TOP = 180 − 90 − ${a} = ${90 - a}°.` }
      case 'cyclic': return { ans: 180 - c, wrong: [c, 360 - c, Math.abs(90 - c) || c + 10].filter((v) => v !== 180 - c), expl: `Opposite angles of a cyclic quadrilateral add up to 180°: 180 − ${c} = ${180 - c}°.` }
      case 'diam': return { ans: 90 - a, wrong: [180 - a, a, 180 - 2 * a].filter((v) => v > 0 && v !== 90 - a), expl: `∠ACB = 90° (angle in a semicircle), so ∠CBA = 180 − 90 − ${a} = ${90 - a}°.` }
      case 'radii': { if (c % 2) return null; return { ans: (180 - c) / 2, wrong: [180 - c, c / 2, 90 - c / 4].filter((v) => isInt(v) && v !== (180 - c) / 2), expl: `The two radii are equal, so the triangle is isosceles: (180 − ${c}) ÷ 2 = ${(180 - c) / 2}° each.` } }
      default: { const A1 = p1 * x + q1; const A2 = 180 - A1; const s = A2 - r1 * x; if (A2 <= 0 || s <= 0) return null; P.s = s; return { ans: x, wrong: [(180 - q1 - s) / (p1 + r1) + 3, (360 - q1 - s) / (p1 + r1), x + 5].filter((v) => isInt(v) && v !== x), fmt: num, expl: `Opposite angles of a cyclic quadrilateral are supplementary: ${p1 + r1}x + ${q1 + s} = 180, so x = ${x}.` } }
    }
  },
  items: [
    [1, () => `What is the size of an angle in a semicircle?`, { m: 'semi' }],
    [2, (p) => `An arc subtends an angle of ${2 * p.a}° at the centre of a circle. What angle does it subtend at a point on the remaining part of the circle?`, { m: 'centre' }],
    [2, (p) => `A chord subtends an angle of ${p.a}° at a point on the major arc of a circle. What angle does it subtend at the centre?`, { m: 'double' }],
    [2, (p) => `From an external point P, a tangent PT touches a circle with centre O at T. If ∠TPO = ${p.a}°, what is ∠TOP?`, { m: 'tangent' }],
    [1, (p) => `One angle of a cyclic quadrilateral is ${p.c}°. What is the angle opposite to it?`, { m: 'cyclic' }],
    [2, (p) => `AB is a diameter of a circle and C is another point on the circle. If ∠CAB = ${p.a}°, find ∠CBA.`, { m: 'diam' }],
    [2, (p) => `Two radii of a circle make an angle of ${p.c}° at the centre. What is each of the other two angles of the triangle formed by the radii and the chord joining their ends?`, { m: 'radii' }],
    [2, (p) => `Opposite angles of a cyclic quadrilateral are (${p.p1}x + ${p.q1})° and (${p.r1 === 1 ? '' : p.r1}x + ${p.s})°. Find x.`, { m: 'cyclicx' }],
  ],
})

family('ga.geometry.polygon-diagonals', 'ga.geometry', {
  gen: (r) => ({ nn: r.pick([5, 6, 7, 8, 9, 10, 12]), n: r.int(7, 20), n2: r.int(4, 15), reg: r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20]) }),
  key: (p) => `${p.m}-${p.nn}-${p.n}-${p.n2}-${p.reg}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { nn, n, n2, reg } = P
    const D = (x) => (x * (x - 3)) / 2
    switch (P.m) {
      case 'named': return { ans: D(nn), wrong: [nn * (nn - 3), nn - 3, (nn * (nn - 1)) / 2].filter((v) => v !== D(nn)), expl: `Diagonals = n(n − 3)/2 = ${nn} × ${nn - 3} ÷ 2 = ${D(nn)}.` }
      case 'rev': return { ans: n, wrong: [n + 1, n - 1, n + 3], expl: `n(n − 3)/2 = ${D(n)} gives n(n − 3) = ${2 * D(n)} = ${n} × ${n - 3}, so n = ${n}.` }
      case 'vertex': return { ans: n - 3, wrong: [n - 2, n - 1, D(n)], expl: `From one vertex you cannot draw a diagonal to itself or its two neighbours: ${n} − 3 = ${n - 3}.` }
      case 'tri': return { ans: nn - 2, wrong: [nn - 3, nn, nn - 1], expl: `The diagonals from one vertex split an n-gon into n − 2 triangles: ${nn} − 2 = ${nn - 2}.` }
      case 'more': { if (n === n2) return null; const hi = Math.max(n, n2); const lo = Math.min(n, n2); P.hi = hi; P.lo = lo; const ans = D(hi) - D(lo); return { ans, wrong: [hi - lo, (hi - lo) * 3, D(hi)].filter((v) => v !== ans), expl: `${hi}-gon: ${D(hi)} diagonals; ${lo}-gon: ${D(lo)}; difference ${ans}.` } }
      default: return { ans: D(reg), wrong: [reg - 3, reg * (reg - 3), D(reg) + reg].filter((v) => v !== D(reg)), expl: `Exterior angle = 180 − ${180 - 360 / reg} = ${360 / reg}°, so n = ${reg}; diagonals = ${reg} × ${reg - 3} ÷ 2 = ${D(reg)}.` }
    }
  },
  items: [
    [1, (p) => `How many diagonals does a ${PNAME[p.nn]} have?`, { m: 'named' }],
    [2, (p) => `A polygon has ${p.n * (p.n - 3) / 2} diagonals. How many sides does it have?`, { m: 'rev' }],
    [1, (p) => `How many diagonals can be drawn from one vertex of ${art(p.n)} ${p.n}-sided polygon?`, { m: 'vertex' }],
    [1, (p) => `The diagonals drawn from one vertex divide a ${PNAME[p.nn]} into how many triangles?`, { m: 'tri' }],
    [2, (p) => `How many more diagonals does ${art(p.hi)} ${p.hi}-sided polygon have than ${art(p.lo)} ${p.lo}-sided polygon?`, { m: 'more' }],
    [3, (p) => `A regular polygon has interior angles of ${180 - 360 / p.reg}° each. How many diagonals does it have?`, { m: 'regdiag' }],
  ],
})

family('ga.geometry.angles-at-a-point', 'ga.geometry', {
  fmt: degFmt,
  gen: (r) => ({ q: r.pick([[1, 2, 3], [2, 3, 4], [1, 3, 5], [3, 4, 5], [1, 4, 7], [2, 5, 11], [4, 5, 9]]), q4: r.pick([[1, 2, 3, 4], [2, 3, 3, 4], [1, 2, 4, 5], [3, 4, 5, 6], [2, 3, 5, 8]]), a: r.int(35, 145), b: r.int(40, 120), c: r.int(50, 110), k: r.pick([2, 3, 4, 5, 8, 9]), p1: r.int(1, 12), s1: r.int(5, 30), x: r.int(10, 30), st: 5 * r.int(1, 6) }),
  key: (p) => `${p.m}-${p.q.join('')}-${p.q4.join('')}-${p.a}-${p.b}-${p.c}-${p.k}-${p.p1}-${p.s1}-${p.x}-${p.st}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { q, q4, a, b, c, k, p1, s1, x, st } = P
    switch (P.m) {
      case 'line': { const t = sum(q); if (180 % t) return null; return { ans: 180 / t, wrong: [360 / t, (180 / t) * q[2], 90 / t].filter((v) => isInt(v) && v !== 180 / t), fmt: num, expl: `Angles on a straight line add up to 180°: ${t}x = 180, so x = ${180 / t}.` } }
      case 'point': { const aa = a; const bb = b; const cc = c; const xx = 360 - aa - bb - cc; if (xx <= 10 || xx >= 180) return null; return { ans: xx, wrong: [180 - xx, xx + 10, xx - 10, 540 - aa - bb - cc].filter((v) => v > 0 && v !== xx && v < 360), expl: `Angles at a point add up to 360°: 360 − (${aa} + ${bb} + ${cc}) = ${xx}°.` } }
      case 'adjsum': { if (a === 90) return null; return { ans: 2 * (180 - a), wrong: [2 * a, 180 - a, 360 - a].filter((v) => v !== 2 * (180 - a)), expl: `Each angle adjacent to ${a}° is 180 − ${a} = ${180 - a}°; the two together make ${2 * (180 - a)}°.` } }
      case 'kadj': { const s = 180 / (k + 1); if (!isInt(s)) return null; return { ans: s, wrong: [k * s, 90 / (k + 1), 360 / (k + 1)].filter((v) => isInt(v) && v !== s), expl: `Adjacent angles at an intersection add up to 180°: s + ${k}s = 180, so s = ${s}°.` } }
      case 'pratio': { const t = sum(q4); if (360 % t) return null; const u = 360 / t; const ans = u * Math.max(...q4); return { ans, wrong: [(180 / t) * Math.max(...q4), u * Math.min(...q4), u].filter((v) => isInt(v) && v !== ans), expl: `${t} parts = 360°, so one part = ${u}° and the largest angle is ${Math.max(...q4)} × ${u} = ${ans}°.` } }
      case 'linex': { const cc = c; const xx = (180 - cc - p1 + s1) / 3; if (!isInt(xx) || 2 * xx - s1 <= 0) return null; return { ans: xx, wrong: [(180 - cc) / 3, (180 - cc - p1 - s1) / 3, xx + 10].filter((v) => isInt(v) && v > 0 && v !== xx), fmt: num, expl: `(x + ${p1}) + (2x − ${s1}) + ${cc} = 180, so 3x = ${180 - cc - p1 + s1} and x = ${xx}.` } }
      case 'reflex': return { ans: 360 - a, wrong: [180 - a, 180 + a, 360 + a].filter((v) => v > 0 && v !== 360 - a), expl: `The reflex angle is 360° − ${a}° = ${360 - a}°.` }
      case 'vert': { const pp = 3; const rr = 1; const A = rr * x + s1; const qq = pp * x - A; if (qq <= 0) return null; P.qq = qq; return { ans: x, wrong: [(s1 + qq) / 4, (180 - s1 + qq) / 4, x + 5].filter((v) => isInt(v) && v > 0 && v !== x), fmt: num, expl: `Vertically opposite angles are equal: 3x − ${qq} = x + ${s1}, so 2x = ${s1 + qq} and x = ${x}.` } }
      case 'step4': { const xx = (360 - 6 * st) / 4; if (!isInt(xx)) return null; return { ans: xx + 3 * st, wrong: [xx, 90, xx + 2 * st, xx + st].filter((v) => v !== xx + 3 * st), expl: `4x + ${6 * st} = 360, so x = ${xx}°; the largest is x + ${3 * st} = ${xx + 3 * st}°.` } }
      default: { const S = 360 - a; const x4 = 360 - S; const sm = Math.min(x4, 180 - x4); if (x4 === 90) return null; P.S = S; return { ans: sm, wrong: [Math.max(x4, 180 - x4), S - 180, 360 - S + 10].filter((v) => v > 0 && v !== sm), expl: `The fourth angle is 360 − ${S} = ${x4}°. Its neighbours are 180 − ${x4} = ${180 - x4}°, so the smallest angle is ${sm}°.` } }
    }
  },
  items: [
    [1, (p) => `Three angles on a straight line are ${p.q[0] === 1 ? '' : p.q[0]}x°, ${p.q[1]}x° and ${p.q[2]}x°. Find x.`, { m: 'line' }],
    [1, (p) => `Four angles meet at a point: ${p.a}°, ${p.b}°, ${p.c}° and x°. Find x.`, { m: 'point' }],
    [2, (p) => `Two straight lines intersect, and one of the four angles formed is ${p.a}°. What is the sum of the two angles next to it?`, { m: 'adjsum' }],
    [2, (p) => `When two straight lines intersect, one angle is ${p.k} times an angle adjacent to it. What is the smaller angle?`, { m: 'kadj' }],
    [2, (p) => `Four angles at a point are in the ratio ${p.q4.join(' : ')}. What is the largest angle?`, { m: 'pratio' }],
    [2, (p) => `Three angles on a straight line are (x + ${p.p1})°, (2x − ${p.s1})° and ${p.c}°. Find x.`, { m: 'linex' }],
    [1, (p) => `What is the reflex angle that goes with an angle of ${p.a}°?`, { m: 'reflex' }],
    [2, (p) => `Two vertically opposite angles are (3x − ${p.qq})° and (x + ${p.s1})°. What is x?`, { m: 'vert' }],
    [2, (p) => `Four angles around a point are x°, (x + ${p.st})°, (x + ${2 * p.st})° and (x + ${3 * p.st})°. What is the largest of them?`, { m: 'step4' }],
    [3, (p) => `Two straight lines intersect, and three of the four angles formed add up to ${p.S}°. What is the smallest of the four angles?`, { m: 'three' }],
  ],
})

// ===========================================================================
// ga.mensuration — 90   (π = 22/7 with radii that give clean answers, or π = 3.14)
// ===========================================================================
const PI7 = 22 / 7
const r2 = (v) => Math.round(v * 1e6) / 1e6
const clean = (v) => Number.isFinite(v) && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9 // integer or .5
const unitF = (u) => (v) => (typeof v === 'number' ? `${num(r2(v))} ${u}` : v)
const PIN = '(Take π = 22/7.)'

family('ga.mensuration.circle', 'ga.mensuration', {
  gen: (r) => ({ k: r.int(1, 6), n: r.int(2, 9) * 50, c: r.int(2, 9) * 10, pick: r.int(0, 999), r314: r.pick([5, 10, 20, 30]), half: r.f() < 0.4 }),
  key: (p) => `${p.m}-${p.k}-${p.n}-${p.c}-${p.r314}-${p.half}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { k, n, c, r314, half } = P
    const rad = half ? 3.5 * (2 * k - 1) : 7 * k
    P.r = rad
    const C = 2 * PI7 * rad; const A = PI7 * rad * rad
    const cm = unitF('cm'); const cm2 = unitF('cm²')
    const ok = (v) => clean(v)
    switch (P.m) {
      case 'circ': if (!ok(C) || !ok(A)) return null; return { fmt: cm, ans: r2(C), wrong: [r2(A), r2(C / 2), r2(2 * C)].filter(ok), expl: `C = 2πr = 2 × 22/7 × ${num(rad)} = ${num(r2(C))} cm.` }
      case 'area': if (!ok(A)) return null; return { fmt: cm2, ans: r2(A), wrong: [r2(C), r2(4 * A), r2(A / 2)].filter(ok), expl: `A = πr² = 22/7 × ${num(rad)} × ${num(rad)} = ${num(r2(A))} cm².` }
      case 'rad': if (half || !ok(C)) return null; P.C = r2(C); return { fmt: cm, ans: rad, wrong: [2 * rad, rad / 2, rad + 7].filter(ok), expl: `r = C ÷ 2π = ${num(r2(C))} × 7 ÷ 44 = ${num(rad)} cm.` }
      case 'area2circ': if (half) return null; P.A = r2(A); return { fmt: cm, ans: r2(C), wrong: [rad, r2(C / 2), 2 * rad].filter(ok), expl: `πr² = ${num(r2(A))} gives r² = ${rad * rad}, r = ${rad} cm; C = 2πr = ${num(r2(C))} cm.` }
      case 'wheel': { if (!ok(C)) return null; const dist = (C * n) / 100; if (!ok(dist)) return null; P.n2 = n; return { fmt: unitF('m'), ans: r2(dist), wrong: [r2((C / 2) * n / 100), r2((A * n) / 100), r2(dist * 10)].filter(ok), expl: `One revolution = 2πr = ${num(r2(C))} cm; ${n} revolutions = ${num(r2(C * n))} cm = ${num(r2(dist))} m.` } }
      case 'revs': { if (half) return null; const d = 2 * rad; const D = (PI7 * d * n) / 100; if (!ok(D) || !isInt(D)) return null; P.d = d; P.D = D; return { fmt: num, ans: n, wrong: [n * 2, n / 2, Math.round((D * 100) / (PI7 * rad * rad)) || n + 50].filter((v) => isInt(v) && v !== n), expl: `Circumference = πd = 22/7 × ${d} = ${num(r2(PI7 * d))} cm; ${D} m = ${D * 100} cm; ${D * 100} ÷ ${num(r2(PI7 * d))} = ${n} revolutions.` } }
      case 'pi314': { const a = 3.14 * r314 * r314; return { fmt: cm2, ans: r2(a), wrong: [r2(2 * 3.14 * r314), r2(3.14 * 2 * r314 * 2 * r314), r2(a / 2)], expl: `A = 3.14 × ${r314} × ${r314} = ${num(r2(a))} cm².` } }
      case 'fence': { if (half) return null; const d = 2 * rad; const cost = C * c; P.d = d; return { fmt: (v) => `Rs ${num(r2(v))}`, ans: r2(cost), wrong: [r2(A * c), r2((C / 2) * c), r2(d * c)], expl: `Circumference = πd = 22/7 × ${d} = ${num(r2(C))} m; cost = ${num(r2(C))} × ${c} = Rs ${num(r2(cost))}.` } }
      case 'diam': { if (half) return null; const d = 2 * rad; P.d = d; return { fmt: cm2, ans: r2(A), wrong: [r2(PI7 * d * d), r2(C), r2(A / 2)].filter(ok), expl: `r = ${d} ÷ 2 = ${rad} cm; A = 22/7 × ${rad}² = ${num(r2(A))} cm².` } }
      case 'exceed': { if (half) return null; const d = 2 * rad; const X = (15 * d) / 7; P.X = X; return { fmt: cm, ans: rad, wrong: [d, rad / 2, rad + 7].filter(ok), expl: `πd − d = (22/7 − 1)d = 15d/7 = ${X}, so d = ${d} cm and r = ${rad} cm.` } }
      case 'diamC': { if (half) return null; P.C = r2(C); return { fmt: cm, ans: 2 * rad, wrong: [rad, 4 * rad, 2 * rad + 7], expl: `d = C ÷ π = ${num(r2(C))} × 7 ÷ 22 = ${2 * rad} cm.` } }
      default: { if (half) return null; const s = 11 * k; const rr = 7 * k; P.s = s; return { fmt: cm, ans: rr, wrong: [2 * rr, s, (4 * s) / 2].filter((v) => v !== rr), expl: `Perimeter of the square = 4 × ${s} = ${4 * s} cm = 2πr, so r = ${4 * s} × 7 ÷ 44 = ${rr} cm.` } }
    }
  },
  items: [
    [1, (p) => `Find the circumference of a circle of radius ${num(p.r)} cm. ${PIN}`, { m: 'circ' }],
    [1, (p) => `What is the area of a circle whose radius is ${num(p.r)} cm? ${PIN}`, { m: 'area' }],
    [2, (p) => `The circumference of a circle is ${num(p.C)} cm. What is its radius? ${PIN}`, { m: 'rad' }],
    [3, (p) => `The area of a circle is ${num(p.A)} cm². What is its circumference? ${PIN}`, { m: 'area2circ' }],
    [2, (p) => `A wheel of radius ${num(p.r)} cm makes ${p.n2} revolutions. How far does it travel, in metres? ${PIN}`, { m: 'wheel' }],
    [3, (p) => `How many revolutions will a wheel of diameter ${p.d} cm make in covering ${num(p.D)} m? ${PIN}`, { m: 'revs' }],
    [1, (p) => `Using π = 3.14, find the area of a circle of radius ${p.r314} cm.`, { m: 'pi314' }],
    [2, (p) => `A circular field has a diameter of ${p.d} m. What is the cost of fencing it at Rs ${p.c} per metre? ${PIN}`, { m: 'fence' }],
    [2, (p) => `The diameter of a circular plate is ${p.d} cm. What is its area? ${PIN}`, { m: 'diam' }],
    [3, (p) => `The circumference of a circle exceeds its diameter by ${p.X} cm. What is its radius? ${PIN}`, { m: 'exceed' }],
    [1, (p) => `What is the diameter of a circle whose circumference is ${num(p.C)} cm? ${PIN}`, { m: 'diamC' }],
    [3, (p) => `A wire bent into a square of side ${p.s} cm is reshaped into a circle. What is the radius of the circle? ${PIN}`, { m: 'wire' }],
  ],
})

family('ga.mensuration.semicircle-sector', 'ga.mensuration', {
  gen: (r) => ({ k: r.int(1, 6), L: r.int(5, 15) * 10, w: r.int(1, 4) * 14, h: r.int(3, 10) * 10, th: r.pick([30, 45, 60, 90, 120]) }),
  key: (p) => `${p.m}-${p.k}-${p.L}-${p.w}-${p.h}-${p.th}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { k, L, w, h, th } = P
    const m = unitF('m'); const cm = unitF('cm'); const cm2 = unitF('cm²')
    switch (P.m) {
      case 'lake': { const r0 = [7, 14, 21, 70, 140, 700][k - 1]; P.r = r0; const ans = PI7 * r0 + 2 * r0; return { fmt: m, ans: r2(ans), wrong: [r2(PI7 * r0), r2(2 * PI7 * r0), r2(PI7 * r0 + r0)].filter(clean), expl: `Perimeter = πr + 2r = ${num(r2(PI7 * r0))} + ${2 * r0} = ${num(r2(ans))} m.` } }
      case 'area': { const r0 = 7 * k; P.r = r0; const A = (PI7 * r0 * r0) / 2; return { fmt: cm2, ans: r2(A), wrong: [r2(2 * A), r2(PI7 * r0), r2(A / 2)].filter(clean), expl: `Area = ½πr² = ½ × 22/7 × ${r0}² = ${num(r2(A))} cm².` } }
      case 'quadA': { const r0 = 14 * k; P.r = r0; const A = (PI7 * r0 * r0) / 4; return { fmt: cm2, ans: r2(A), wrong: [r2(2 * A), r2(4 * A), r2((PI7 * r0) / 2)].filter(clean), expl: `A quadrant is a quarter circle: ¼ × 22/7 × ${r0}² = ${num(r2(A))} cm².` } }
      case 'quadP': { const r0 = 14 * k; P.r = r0; const Pm = (PI7 * r0) / 2 + 2 * r0; return { fmt: cm, ans: r2(Pm), wrong: [r2((PI7 * r0) / 2), r2((PI7 * r0) / 2 + r0), r2(PI7 * r0 + 2 * r0)].filter(clean), expl: `Arc = ¼ × 2πr = ${num(r2((PI7 * r0) / 2))} cm; add two radii: ${num(r2(Pm))} cm.` } }
      case 'track': { const r0 = 7 * k * 2; P.r = r0; const lap = 2 * L + 2 * PI7 * r0; return { fmt: m, ans: r2(lap), wrong: [r2(2 * L + PI7 * r0), r2(L + 2 * PI7 * r0), r2(2 * L + 4 * PI7 * r0)].filter(clean), expl: `Two straights: 2 × ${L} = ${2 * L} m; two semicircles make a full circle: 2π × ${r0} = ${num(r2(2 * PI7 * r0))} m; lap = ${num(r2(lap))} m.` } }
      case 'window': { const rr = w / 2; const A = w * h + (PI7 * rr * rr) / 2; return { fmt: cm2, ans: r2(A), wrong: [r2(w * h + PI7 * rr * rr), r2(w * h), r2(w * h + (PI7 * w * w) / 2)].filter(clean), expl: `Rectangle ${w} × ${h} = ${w * h} cm²; semicircle ½ × 22/7 × ${rr}² = ${num(r2((PI7 * rr * rr) / 2))} cm²; total ${num(r2(A))} cm².` } }
      case 'plate': { const r0 = 7 * k; const Pm = 36 * k; P.Pm = Pm; return { fmt: cm, ans: r0, wrong: [2 * r0, r2(Pm / PI7) !== r0 && clean(Pm / PI7) ? r2(Pm / PI7) : r0 + 7, Pm / 4].filter((v) => clean(v) && v !== r0), expl: `Perimeter = πr + 2r = r(22/7 + 2) = 36r/7 = ${Pm}, so r = ${r0} cm.` } }
      default: { const r0 = 7 * k; P.r = r0; const A = (th / 360) * PI7 * r0 * r0; if (!clean(A)) return null; return { fmt: cm2, ans: r2(A), wrong: [r2((th / 180) * PI7 * r0 * r0), r2((th / 360) * 2 * PI7 * r0), r2(PI7 * r0 * r0)].filter((v) => clean(v) && v !== r2(A)), expl: `Sector area = (${th}/360) × πr² = ${fr(th, 360)} × 22/7 × ${r0}² = ${num(r2(A))} cm².` } }
    }
  },
  items: [
    [2, (p) => `Find the perimeter of a semicircular lake of radius ${p.r} m. ${PIN}`, { m: 'lake' }],
    [2, (p) => `What is the area of a semicircle of radius ${p.r} cm? ${PIN}`, { m: 'area' }],
    [2, (p) => `A quadrant (quarter of a circle) has a radius of ${p.r} cm. What is its area? ${PIN}`, { m: 'quadA' }],
    [2, (p) => `What is the perimeter of a quadrant of radius ${p.r} cm? ${PIN}`, { m: 'quadP' }],
    [2, (p) => `A running track has two straight sides of ${p.L} m and two semicircular ends of radius ${p.r} m. What is the length of one lap? ${PIN}`, { m: 'track' }],
    [3, (p) => `A window is a rectangle ${p.w} cm wide and ${p.h} cm high, topped by a semicircle on its width. What is the total area of the window? ${PIN}`, { m: 'window' }],
    [3, (p) => `The perimeter of a semicircular plate is ${p.Pm} cm. What is its radius? ${PIN}`, { m: 'plate' }],
    [2, (p) => `A sector of a circle of radius ${p.r} cm has an angle of ${p.th}° at the centre. What is its area? ${PIN}`, { m: 'sector' }],
  ],
})

family('ga.mensuration.rectangle-square', 'ga.mensuration', {
  gen: (r) => ({ l: r.int(6, 40), b: r.int(3, 25), s: r.int(4, 30), t: r.pick([20, 25, 40, 50]), c: r.int(2, 9) * 50, g: r.int(2, 5), tri: r.pick(PY) }),
  key: (p) => `${p.m}-${p.l}-${p.b}-${p.s}-${p.t}-${p.c}-${p.g}-${p.tri.join('')}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { l, b, s, t, c, g, tri } = P
    const cm = unitF('cm'); const cm2 = unitF('cm²'); const m2 = unitF('m²'); const m = unitF('m')
    switch (P.m) {
      case 'perim': if (l === b) return null; return { fmt: cm, ans: 2 * (l + b), wrong: [l + b, l * b, 2 * l + b], expl: `Perimeter = 2(l + b) = 2(${l} + ${b}) = ${2 * (l + b)} cm.` }
      case 'sqarea': return { fmt: cm2, ans: s * s, wrong: [4 * s, 2 * s, s * s * 2], expl: `Area = side² = ${s}² = ${s * s} cm².` }
      case 'sqP2A': return { fmt: cm2, ans: s * s, wrong: [4 * s, 16 * s * s, 4 * s * s], expl: `Side = ${4 * s} ÷ 4 = ${s} cm; area = ${s}² = ${s * s} cm².` }
      case 'A2P': { if (l === b) return null; return { fmt: m, ans: 2 * (l + b), wrong: [l + b, l * b, 2 * l + b], expl: `Breadth = ${l * b} ÷ ${l} = ${b} m; perimeter = 2(${l} + ${b}) = ${2 * (l + b)} m.` } }
      case 'equi': return { fmt: cm, ans: s, wrong: [3 * s, (3 * s) / 2, s + 3].filter((v) => isInt(v) && v !== s), expl: `An equilateral triangle has three equal sides: ${3 * s} ÷ 3 = ${s} cm.` }
      case 'tiles': { const L = l % 9 + 2; const B = b % 6 + 2; const n = (L * 100 / t) * (B * 100 / t); if (!isInt(n)) return null; P.L = L; P.B = B; return { fmt: num, ans: n, wrong: [n / 10, n * 2, (L * 100 / t) + (B * 100 / t), n / 4].filter((v) => isInt(v) && v !== n && v > 0), expl: `Floor = ${L * 100} cm × ${B * 100} cm; tiles along each side: ${L * 100 / t} and ${B * 100 / t}; total ${n}.` } }
      case 'carpet': return { fmt: (v) => `Rs ${num(v)}`, ans: l * b * c, wrong: [2 * (l + b) * c, (l + b) * c, l * b * c / 2].filter((v) => isInt(v)), expl: `Area = ${l} × ${b} = ${l * b} m²; cost = ${l * b} × ${c} = Rs ${num(l * b * c)}.` }
      case 'samePerim': { if ((l + b) % 2 || l === b) return null; const side = (l + b) / 2; return { fmt: cm2, ans: side * side, wrong: [l * b, 4 * side, (l + b) ** 2].filter((v) => v !== side * side), expl: `Perimeter = 2(${l} + ${b}) = ${2 * (l + b)} cm, so the square's side is ${side} cm and its area ${side * side} cm².` } }
      case 'sqA2P': return { fmt: cm, ans: 4 * s, wrong: [2 * s, s * s / 4 === Math.floor(s * s / 4) ? s * s / 4 : 8 * s, s].filter((v) => v !== 4 * s), expl: `Side = √${s * s} = ${s} cm; perimeter = 4 × ${s} = ${4 * s} cm.` }
      case 'gate': { if (l === b) return null; return { fmt: m, ans: 2 * (l + b) - g, wrong: [2 * (l + b), 2 * (l + b) + g, l + b - g], expl: `Perimeter = 2(${l} + ${b}) = ${2 * (l + b)} m; less the ${g} m gate: ${2 * (l + b) - g} m.` } }
      case 'diag': { const [x, y, z] = tri; return { fmt: cm2, ans: x * y, wrong: [x * z, (x * y) / 2, 2 * (x + y)].filter((v) => isInt(v) && v !== x * y), expl: `Breadth = √(${z}² − ${x}²) = ${y} cm; area = ${x} × ${y} = ${x * y} cm².` } }
      default: { const bcm = b * 10; if (bcm % 100 === 0) return null; P.bcm = bcm; const ans = (l * bcm) / 100; return { fmt: m2, ans, wrong: [l * bcm, (l * bcm) / 10, (l * bcm) / 1000].filter((v) => v !== ans), expl: `${bcm} cm = ${num(bcm / 100)} m; area = ${l} × ${num(bcm / 100)} = ${num(ans)} m².` } }
    }
  },
  items: [
    [1, (p) => `A rectangle is ${p.l} cm long and ${p.b} cm wide. What is its perimeter?`, { m: 'perim' }],
    [1, (p) => `Find the area of a square whose side is ${p.s} cm.`, { m: 'sqarea' }],
    [2, (p) => `The perimeter of a square is ${4 * p.s} cm. What is its area?`, { m: 'sqP2A' }],
    [2, (p) => `The area of a rectangle is ${p.l * p.b} m² and its length is ${p.l} m. What is its perimeter?`, { m: 'A2P' }],
    [1, (p) => `The perimeter of an equilateral triangle is ${3 * p.s} cm. What is the length of one side?`, { m: 'equi' }],
    [3, (p) => `How many square tiles of side ${p.t} cm are needed to cover a floor ${p.L} m by ${p.B} m?`, { m: 'tiles' }],
    [2, (p) => `What is the cost of carpeting a room ${p.l} m long and ${p.b} m wide at Rs ${p.c} per square metre?`, { m: 'carpet' }],
    [3, (p) => `A square has the same perimeter as a rectangle measuring ${p.l} cm by ${p.b} cm. What is the area of the square?`, { m: 'samePerim' }],
    [2, (p) => `The area of a square is ${p.s * p.s} cm². What is its perimeter?`, { m: 'sqA2P' }],
    [2, (p) => `A rectangular garden ${p.l} m by ${p.b} m is to be fenced all round, except for a gate ${p.g} m wide. How much fencing is needed?`, { m: 'gate' }],
    [3, (p) => `The length of a rectangle is ${p.tri[0]} cm and its diagonal is ${p.tri[2]} cm. What is its area?`, { m: 'diag' }],
    [2, (p) => `What is the area, in square metres, of a strip ${p.l} m long and ${p.bcm} cm wide?`, { m: 'units' }],
  ],
})

const HERON = [[13, 14, 15, 84], [5, 5, 6, 12], [5, 5, 8, 12], [10, 13, 13, 60], [7, 15, 20, 42], [9, 10, 17, 36], [13, 20, 21, 126], [10, 17, 21, 84], [17, 25, 28, 210], [8, 15, 17, 60]]
family('ga.mensuration.triangle-area', 'ga.mensuration', {
  gen: (r) => ({ b: r.int(4, 30), h: r.int(3, 24), tri: r.pick(PY), her: r.pick(HERON), k: r.int(2, 4), c: r.int(2, 9) * 20 }),
  key: (p) => `${p.m}-${p.b}-${p.h}-${p.tri.join('')}-${p.her.join('')}-${p.k}-${p.c}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { b, h, tri, her, k, c } = P
    const cm2 = unitF('cm²'); const cm = unitF('cm')
    switch (P.m) {
      case 'bh': if ((b * h) % 2) return null; return { fmt: cm2, ans: (b * h) / 2, wrong: [b * h, b + h, (b * h) / 4].filter(isInt), expl: `Area = ½ × base × height = ½ × ${b} × ${h} = ${(b * h) / 2} cm².` }
      case 'legs': { const [x, y] = tri; return { fmt: cm2, ans: (x * y) / 2, wrong: [x * y, (x * tri[2]) / 2, x + y].filter((v) => isInt(v) && v !== (x * y) / 2), expl: `The legs are base and height: ½ × ${x} × ${y} = ${(x * y) / 2} cm².` } }
      case 'height': { if ((b * h) % 2) return null; P.A = (b * h) / 2; return { fmt: cm, ans: h, wrong: [h / 2, (b * h) / 2 / b * 4, b].filter((v) => isInt(v) && v !== h), expl: `h = 2A ÷ b = 2 × ${(b * h) / 2} ÷ ${b} = ${h} cm.` } }
      case 'hyp': { const [x, y, z] = tri; return { fmt: cm2, ans: (x * y) / 2, wrong: [(x * z) / 2, x * y, (y * z) / 2].filter((v) => isInt(v) && v !== (x * y) / 2), expl: `Other leg = √(${z}² − ${x}²) = ${y} cm; area = ½ × ${x} × ${y} = ${(x * y) / 2} cm².` } }
      case 'heron': { const [a, bb, cc, A] = her; const sp = (a + bb + cc) / 2; return { fmt: cm2, ans: A, wrong: [sp * 2 === a + bb + cc ? a * bb / 2 : A * 2, A * 2, sp * 3].filter((v) => isInt(v) && v !== A), expl: `s = (${a} + ${bb} + ${cc}) ÷ 2 = ${sp}; area = √(s(s − a)(s − b)(s − c)) = √(${sp} × ${sp - a} × ${sp - bb} × ${sp - cc}) = ${A} cm².` } }
      case 'iso': { const [x, y, z] = tri; return { fmt: cm2, ans: x * y, wrong: [2 * x * y, x * z, (x * y) / 2].filter((v) => isInt(v) && v !== x * y), expl: `Half the base is ${x} cm, so the height is √(${z}² − ${x}²) = ${y} cm; area = ½ × ${2 * x} × ${y} = ${x * y} cm².` } }
      case 'ratio': { const A = (k * h * h) / 2; if (!isInt(A)) return null; P.A = A; return { fmt: cm, ans: h, wrong: [k * h, h * 2, A / h].filter((v) => isInt(v) && v !== h), expl: `½ × ${k}h × h = ${A}, so h² = ${h * h} and h = ${h} cm.` } }
      default: { if ((b * h) % 2) return null; const A = (b * h) / 2; return { fmt: (v) => `Rs ${num(v)}`, ans: A * c, wrong: [b * h * c, (b + h) * c, A * c / 2].filter(isInt), expl: `Area = ½ × ${b} × ${h} = ${A} m²; cost = ${A} × ${c} = Rs ${num(A * c)}.` } }
    }
  },
  items: [
    [1, (p) => `Find the area of a triangle with a base of ${p.b} cm and a height of ${p.h} cm.`, { m: 'bh' }],
    [1, (p) => `The two shorter sides of a right-angled triangle are ${p.tri[0]} cm and ${p.tri[1]} cm. What is its area?`, { m: 'legs' }],
    [2, (p) => `The area of a triangle is ${p.A} cm² and its base is ${p.b} cm. What is its height?`, { m: 'height' }],
    [3, (p) => `A right-angled triangle has a hypotenuse of ${p.tri[2]} cm and one shorter side of ${p.tri[0]} cm. What is its area?`, { m: 'hyp' }],
    [3, (p) => `Find the area of a triangle whose sides are ${p.her[0]} cm, ${p.her[1]} cm and ${p.her[2]} cm.`, { m: 'heron' }],
    [3, (p) => `An isosceles triangle has two equal sides of ${p.tri[2]} cm and a base of ${2 * p.tri[0]} cm. What is its area?`, { m: 'iso' }],
    [3, (p) => `The base of a triangle is ${p.k} times its height, and its area is ${p.A} cm². What is its height?`, { m: 'ratio' }],
    [2, (p) => `A triangular plot has a base of ${p.b} m and a height of ${p.h} m. What does it cost to level it at Rs ${p.c} per square metre?`, { m: 'cost' }],
  ],
})
family('ga.mensuration.cylinder', 'ga.mensuration', {
  gen: (r) => ({ k: r.int(1, 4), half: r.f() < 0.4, h: r.int(2, 20), n: r.int(2, 10) * 50, r314: r.pick([5, 10, 20]) }),
  key: (p) => `${p.m}-${p.k}-${p.half}-${p.h}-${p.n}-${p.r314}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { k, half, h, n, r314 } = P
    const rad = half ? 3.5 * (2 * k - 1) : 7 * k
    P.r = rad
    const V = PI7 * rad * rad * h; const CSA = 2 * PI7 * rad * h; const TSA = 2 * PI7 * rad * (rad + h)
    const cm3 = unitF('cm³'); const cm2 = unitF('cm²'); const cm = unitF('cm')
    switch (P.m) {
      case 'vol': if (!clean(V)) return null; return { fmt: cm3, ans: r2(V), wrong: [r2(CSA), r2(V / 2), r2(PI7 * 2 * rad * 2 * rad * h)].filter(clean), expl: `V = πr²h = 22/7 × ${num(rad)}² × ${h} = ${num(r2(V))} cm³.` }
      case 'tsa': { const hh = h + 0.5; P.hh = hh; const T = 2 * PI7 * rad * (rad + hh); if (!clean(T)) return null; return { fmt: cm2, ans: r2(T), wrong: [r2(2 * PI7 * rad * hh), r2(PI7 * rad * (rad + hh)), r2(2 * PI7 * rad * (rad + hh) + PI7 * rad * rad)].filter(clean), expl: `TSA = 2πr(r + h) = 2 × 22/7 × ${num(rad)} × ${num(rad + hh)} = ${num(r2(T))} cm².` } }
      case 'csa': if (!clean(CSA)) return null; return { fmt: cm2, ans: r2(CSA), wrong: [r2(TSA), r2(CSA / 2), r2(V)].filter(clean), expl: `CSA = 2πrh = 2 × 22/7 × ${num(rad)} × ${h} = ${num(r2(CSA))} cm².` }
      case 'litres': { if (half) return null; const rm = rad / 7 * 0.7; const Vm = PI7 * rm * rm * h; const Lt = Vm * 1000; if (!isInt(Math.round(Lt * 1000) / 1000)) return null; P.rm = rm; return { fmt: (v) => `${num(r2(v))} litres`, ans: r2(Lt), wrong: [r2(Vm), r2(Lt * 10), r2(Lt / 2)], expl: `V = 22/7 × ${num(rm)}² × ${h} = ${num(r2(Vm))} m³, and 1 m³ = 1000 litres, so ${num(r2(Lt))} litres.` } }
      case 'height': { if (!clean(V)) return null; P.V = r2(V); return { fmt: cm, ans: h, wrong: [h * 2, r2(V / (PI7 * rad)) === h ? h + 2 : r2(V / (PI7 * rad)), h + 1].filter((v) => clean(v) && v !== h && v < 1000), expl: `h = V ÷ πr² = ${num(r2(V))} ÷ (22/7 × ${num(rad)}²) = ${h} cm.` } }
      case 'radius': { if (!clean(CSA)) return null; P.C = r2(CSA); return { fmt: cm, ans: rad, wrong: [2 * rad, rad + 7, rad / 2].filter((v) => clean(v) && v !== rad), expl: `r = CSA ÷ 2πh = ${num(r2(CSA))} ÷ (2 × 22/7 × ${h}) = ${num(rad)} cm.` } }
      case 'tin': { if (half) return null; P.d = 2 * rad; if (!clean(TSA)) return null; return { fmt: cm2, ans: r2(TSA), wrong: [r2(CSA), r2(2 * PI7 * 2 * rad * (2 * rad + h)), r2(CSA + PI7 * rad * rad)].filter(clean), expl: `r = ${rad} cm; closed can = 2πr(r + h) = 2 × 22/7 × ${rad} × ${rad + h} = ${num(r2(TSA))} cm².` } }
      case 'roller': { if (half) return null; const d = 2 * rad; const Lr = h * 10; const area = (PI7 * d * Lr * n) / 10000; if (!clean(area)) return null; P.d = d; P.Lr = Lr; P.n2 = n; return { fmt: unitF('m²'), ans: r2(area), wrong: [r2(area * 2), r2((PI7 * rad * rad * Lr * n) / 1000000), r2(area / 10)].filter((v) => clean(v) && v > 0), expl: `One revolution covers the curved surface: πdL = 22/7 × ${d} × ${Lr} = ${num(r2(PI7 * d * Lr))} cm²; × ${n} = ${num(r2(PI7 * d * Lr * n))} cm² = ${num(r2(area))} m².` } }
      case 'equal': { if (half) return null; const d = 2 * rad; P.d = d; const Vd = PI7 * rad * rad * d; return { fmt: cm3, ans: r2(Vd), wrong: [r2(PI7 * d * d * d), r2(2 * PI7 * rad * d), r2(Vd / 2)].filter(clean), expl: `r = ${rad} cm and h = ${d} cm: V = 22/7 × ${rad}² × ${d} = ${num(r2(Vd))} cm³.` } }
      default: { const v = 3.14 * r314 * r314 * h; return { fmt: cm3, ans: r2(v), wrong: [r2(2 * 3.14 * r314 * h), r2(3.14 * r314 * h), r2(v * 2)], expl: `V = 3.14 × ${r314}² × ${h} = ${num(r2(v))} cm³.` } }
    }
  },
  items: [
    [2, (p) => `Find the volume of a cylinder of radius ${num(p.r)} cm and height ${p.h} cm. ${PIN}`, { m: 'vol' }],
    [2, (p) => `What is the total surface area of a closed cylinder with radius ${num(p.r)} cm and height ${num(p.hh)} cm? ${PIN}`, { m: 'tsa' }],
    [2, (p) => `What is the curved surface area of a cylinder of radius ${num(p.r)} cm and height ${p.h} cm? ${PIN}`, { m: 'csa' }],
    [3, (p) => `A cylindrical tank of radius ${num(p.rm)} m and height ${p.h} m is full of water. How many litres does it hold? ${PIN}`, { m: 'litres' }],
    [2, (p) => `The volume of a cylinder is ${num(p.V)} cm³ and its radius is ${num(p.r)} cm. What is its height? ${PIN}`, { m: 'height' }],
    [2, (p) => `The curved surface area of a cylinder is ${num(p.C)} cm² and its height is ${p.h} cm. What is its radius? ${PIN}`, { m: 'radius' }],
    [3, (p) => `How much tin sheet is needed to make a closed cylindrical can of diameter ${p.d} cm and height ${p.h} cm? ${PIN}`, { m: 'tin' }],
    [3, (p) => `A garden roller of diameter ${p.d} cm and length ${p.Lr} cm makes ${p.n2} revolutions. What area does it level, in square metres? ${PIN}`, { m: 'roller' }],
    [2, (p) => `A cylinder has a diameter and a height of ${p.d} cm each. What is its volume? ${PIN}`, { m: 'equal' }],
    [2, (p) => `Using π = 3.14, find the volume of a cylinder of radius ${p.r314} cm and height ${p.h} cm.`, { m: 'pi314' }],
  ],
})

const QUAD = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 10, 11, 15], [8, 9, 12, 17], [4, 13, 16, 21]]
family('ga.mensuration.cuboid-cube', 'ga.mensuration', {
  gen: (r) => ({ l: r.int(4, 20), b: r.int(3, 15), h: r.int(2, 12), a: r.int(2, 15), s: r.pick([2, 3, 4, 5]), q: r.pick(QUAD), sc: r.pick([1, 2, 3]) }),
  key: (p) => `${p.m}-${p.l}-${p.b}-${p.h}-${p.a}-${p.s}-${p.q.join('')}-${p.sc}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { l, b, h, a, s, q, sc } = P
    const cm3 = unitF('cm³'); const cm2 = unitF('cm²')
    switch (P.m) {
      case 'vol': return { fmt: cm3, ans: l * b * h, wrong: [2 * (l * b + b * h + h * l), l + b + h, l * b * h / 2].filter(isInt), expl: `V = l × b × h = ${l} × ${b} × ${h} = ${l * b * h} cm³.` }
      case 'cube': return { fmt: cm3, ans: a ** 3, wrong: [6 * a * a, 3 * a, a * a], expl: `V = a³ = ${a}³ = ${a ** 3} cm³.` }
      case 'cubeSA': return { fmt: cm2, ans: 6 * a * a, wrong: [4 * a * a, a ** 3, 6 * a], expl: `Six square faces: 6 × ${a}² = ${6 * a * a} cm².` }
      case 'cuboidSA': { const T = 2 * (l * b + b * h + h * l); return { fmt: cm2, ans: T, wrong: [l * b + b * h + h * l, l * b * h, 2 * h * (l + b)].filter((v) => v !== T), expl: `TSA = 2(lb + bh + hl) = 2(${l * b} + ${b * h} + ${h * l}) = ${T} cm².` } }
      case 'V2SA': return { fmt: cm2, ans: 6 * a * a, wrong: [a * a, 4 * a * a, 6 * a], expl: `Edge = ∛${a ** 3} = ${a} cm; surface area = 6 × ${a}² = ${6 * a * a} cm².` }
      case 'cut': { const S = s * (a % 4 + 2); P.S = S; const n = (S / s) ** 3; return { fmt: num, ans: n, wrong: [(S / s) ** 2, (S / s), S * S * S / s].filter((v) => isInt(v) && v !== n), expl: `${S} ÷ ${s} = ${S / s} small cubes fit along each edge, so ${S / s}³ = ${n} cubes.` } }
      case 'bricks': { const L = l % 5 + 4; const H = h % 3 + 2; const T = [20, 25, 30][b % 3]; const n = (L * 100 * H * 100 * T) / (25 * 12.5 * 7.5); if (!isInt(n)) return null; P.L = L; P.H = H; P.T = T; return { fmt: num, ans: n, wrong: [n / 10, n * 2, (L * H * T) / (25 * 12.5 * 7.5) * 1000].filter((v) => isInt(v) && v !== n && v > 0), expl: `Wall volume = ${L * 100} × ${H * 100} × ${T} cm³ = ${num(L * 100 * H * 100 * T)} cm³; each brick is 25 × 12.5 × 7.5 = ${num(25 * 12.5 * 7.5)} cm³; ${num(L * 100 * H * 100 * T)} ÷ ${num(25 * 12.5 * 7.5)} = ${num(n)}.` } }
      case 'tank': { const L = l % 6 + 1; const B = b % 4 + 1; const H = h % 3 + 1; P.L = L; P.B = B; P.H = H; const Lt = L * B * H * 1000; return { fmt: (v) => `${num(v)} litres`, ans: Lt, wrong: [L * B * H, L * B * H * 100, L * B * H * 10000], expl: `Volume = ${L} × ${B} × ${H} = ${L * B * H} m³ = ${num(Lt)} litres (1 m³ = 1000 litres).` } }
      case 'rod': { const [x, y, z, d] = q.map((v) => v * sc); P.box = [x, y, z]; return { fmt: unitF('cm'), ans: d, wrong: [x + y + z, Math.max(x, y, z), Math.round(Math.sqrt(y * y + z * z)) === d ? d + 1 : Math.round(Math.sqrt(y * y + z * z))].filter((v) => v !== d), expl: `Longest rod = space diagonal = √(${x}² + ${y}² + ${z}²) = √${d * d} = ${d} cm.` } }
      default: { const W = 2 * h * (l + b); return { fmt: unitF('m²'), ans: W, wrong: [2 * (l * b + b * h + h * l), h * (l + b), l * b * h].filter((v) => v !== W), expl: `Area of four walls = 2h(l + b) = 2 × ${h} × (${l} + ${b}) = ${W} m².` } }
    }
  },
  items: [
    [1, (p) => `Find the volume of a cuboid measuring ${p.l} cm × ${p.b} cm × ${p.h} cm.`, { m: 'vol' }],
    [1, (p) => `What is the volume of a cube with an edge of ${p.a} cm?`, { m: 'cube' }],
    [1, (p) => `What is the total surface area of a cube of side ${p.a} cm?`, { m: 'cubeSA' }],
    [2, (p) => `Find the total surface area of a closed box measuring ${p.l} cm by ${p.b} cm by ${p.h} cm.`, { m: 'cuboidSA' }],
    [3, (p) => `The volume of a cube is ${p.a ** 3} cm³. What is its total surface area?`, { m: 'V2SA' }],
    [2, (p) => `How many cubes of edge ${p.s} cm can be cut from a solid cube of edge ${p.S} cm?`, { m: 'cut' }],
    [3, (p) => `How many bricks measuring 25 cm × 12.5 cm × 7.5 cm are needed to build a wall ${p.L} m long, ${p.H} m high and ${p.T} cm thick? (Ignore mortar.)`, { m: 'bricks' }],
    [2, (p) => `A water tank measures ${p.L} m × ${p.B} m × ${p.H} m. How many litres does it hold when full?`, { m: 'tank' }],
    [3, (p) => `What is the length of the longest rod that can be placed inside a box measuring ${p.box[0]} cm × ${p.box[1]} cm × ${p.box[2]} cm?`, { m: 'rod' }],
    [2, (p) => `A room is ${p.l} m long, ${p.b} m wide and ${p.h} m high. What is the total area of its four walls?`, { m: 'walls' }],
  ],
})

family('ga.mensuration.cone-sphere', 'ga.mensuration', {
  gen: (r) => ({ k: r.int(1, 4), h: 3 * r.int(1, 8), l: r.int(10, 30), R: r.int(2, 5), rr: r.int(1, 2), tri: r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [7, 24, 25], [9, 12, 15], [21, 20, 29], [14, 48, 50]]) }),
  key: (p) => `${p.m}-${p.k}-${p.h}-${p.l}-${p.R}-${p.rr}-${p.tri.join('')}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { k, h, l, R, rr, tri } = P
    const cm3 = unitF('cm³'); const cm2 = unitF('cm²')
    switch (P.m) {
      case 'conevol': { const rad = 7 * k; P.r = rad; const V = (PI7 * rad * rad * h) / 3; return { fmt: cm3, ans: r2(V), wrong: [r2(V * 3), r2(PI7 * rad * h / 3 * 2), r2(V / 2)].filter(clean), expl: `V = ⅓πr²h = ⅓ × 22/7 × ${rad}² × ${h} = ${num(r2(V))} cm³.` } }
      case 'conecsa': { const rad = 7 * k; P.r = rad; const C = PI7 * rad * l; return { fmt: cm2, ans: r2(C), wrong: [r2(2 * C), r2(C + PI7 * rad * rad), r2(PI7 * rad * rad)].filter(clean), expl: `CSA = πrl = 22/7 × ${rad} × ${l} = ${num(r2(C))} cm².` } }
      case 'sphvol': { const rad = [21, 10.5][k % 2]; P.r = rad; const V = (4 / 3) * PI7 * rad ** 3; return { fmt: cm3, ans: r2(V), wrong: [r2(4 * PI7 * rad * rad), r2(V / 2), r2(V * 3 / 4)].filter(clean), expl: `V = 4/3 πr³ = 4/3 × 22/7 × ${num(rad)}³ = ${num(r2(V))} cm³.` } }
      case 'sphsa': { const rad = [3.5, 7, 14, 21][k - 1]; P.r = rad; const S = 4 * PI7 * rad * rad; return { fmt: cm2, ans: r2(S), wrong: [r2(PI7 * rad * rad), r2(2 * PI7 * rad * rad), r2(3 * PI7 * rad * rad)].filter(clean), expl: `Surface area = 4πr² = 4 × 22/7 × ${num(rad)}² = ${num(r2(S))} cm².` } }
      case 'slant': { const [x, y, z] = tri; if (x % 7) return null; P.r = x; P.hh = y; const C = PI7 * x * z; return { fmt: cm2, ans: r2(C), wrong: [r2(PI7 * x * y), r2(PI7 * x * (x + z)), r2(2 * PI7 * x * z)].filter(clean), expl: `Slant height l = √(${x}² + ${y}²) = ${z} cm; CSA = πrl = 22/7 × ${x} × ${z} = ${num(r2(C))} cm².` } }
      case 'hemi': { const rad = 21; P.r = rad; const V = (2 / 3) * PI7 * rad ** 3; return { fmt: cm3, ans: r2(V), wrong: [r2(2 * V), r2(2 * PI7 * rad * rad), r2(V / 2)].filter(clean), expl: `Hemisphere volume = ⅔πr³ = ⅔ × 22/7 × 21³ = ${num(r2(V))} cm³.` } }
      case 'ratio': return { ans: '1 : 3', wrong: ['3 : 1', '1 : 2', '2 : 3'], expl: `Cone volume = ⅓πr²h and cylinder volume = πr²h, so cone : cylinder = 1 : 3.` }
      default: { if (R <= rr) return null; const n = (R / rr) ** 3; P.Rb = R * 3; P.rb = rr * 3; return { fmt: num, ans: n, wrong: [(R / rr) ** 2, R / rr, n * 3].filter((v) => isInt(v) && v !== n), expl: `Volumes scale as the cube of the radius: (${R * 3} ÷ ${rr * 3})³ = ${R / rr}³ = ${n}.` } }
    }
  },
  items: [
    [2, (p) => `Find the volume of a cone of radius ${p.r} cm and height ${p.h} cm. ${PIN}`, { m: 'conevol' }],
    [2, (p) => `What is the curved surface area of a cone with base radius ${p.r} cm and slant height ${p.l} cm? ${PIN}`, { m: 'conecsa' }],
    [2, (p) => `Find the volume of a sphere of radius ${num(p.r)} cm. ${PIN}`, { m: 'sphvol' }],
    [2, (p) => `What is the surface area of a sphere of radius ${num(p.r)} cm? ${PIN}`, { m: 'sphsa' }],
    [3, (p) => `A cone has a base radius of ${p.r} cm and a height of ${p.hh} cm. What is its curved surface area? ${PIN}`, { m: 'slant' }],
    [2, (p) => `What is the volume of a hemisphere of radius ${p.r} cm? ${PIN}`, { m: 'hemi' }],
    [1, () => `A cone and a cylinder have the same base radius and the same height. What is the ratio of the volume of the cone to that of the cylinder?`, { m: 'ratio' }],
    [2, (p) => `A solid metal sphere of radius ${p.Rb} cm is melted and recast into small spheres of radius ${p.rb} cm. How many small spheres are made?`, { m: 'melt' }],
  ],
})
family('ga.mensuration.path-border', 'ga.mensuration', {
  gen: (r) => ({ l: r.int(10, 60), b: r.int(6, 40), w: r.int(1, 4), s: r.int(8, 40), k: r.int(1, 3) }),
  key: (p) => `${p.m}-${p.l}-${p.b}-${p.w}-${p.s}-${p.k}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { l, b, w, s, k } = P
    const m2 = unitF('m²'); const cm2 = unitF('cm²')
    switch (P.m) {
      case 'outside': { const A = (l + 2 * w) * (b + 2 * w) - l * b; return { fmt: m2, ans: A, wrong: [(l + w) * (b + w) - l * b, 2 * w * (l + b), A + 4 * w * w].filter((v) => v !== A), expl: `Outer rectangle ${l + 2 * w} × ${b + 2 * w} = ${(l + 2 * w) * (b + 2 * w)} m²; minus the park ${l * b} m² leaves ${A} m².` } }
      case 'inside': { if (b <= 2 * w + 2) return null; const A = l * b - (l - 2 * w) * (b - 2 * w); return { fmt: m2, ans: A, wrong: [l * b - (l - w) * (b - w), 2 * w * (l + b), A + 4 * w * w].filter((v) => v !== A), expl: `Inner rectangle ${l - 2 * w} × ${b - 2 * w} = ${(l - 2 * w) * (b - 2 * w)} m²; path = ${l * b} − ${(l - 2 * w) * (b - 2 * w)} = ${A} m².` } }
      case 'cross': { const A = w * (l + b) - w * w; return { fmt: m2, ans: A, wrong: [w * (l + b), w * (l + b) + w * w, 2 * w * (l + b)].filter((v) => v !== A), expl: `Roads: ${w} × ${l} + ${w} × ${b} = ${w * (l + b)} m², but the central square ${w} × ${w} is counted twice: ${A} m².` } }
      case 'square': { const A = (s + 2 * w) ** 2 - s * s; return { fmt: m2, ans: A, wrong: [4 * w * s, (s + w) ** 2 - s * s, (s + 2 * w) ** 2].filter((v) => v !== A), expl: `(${s} + ${2 * w})² − ${s}² = ${(s + 2 * w) ** 2} − ${s * s} = ${A} m².` } }
      case 'picture': { const A = (l + 2 * w) * (b + 2 * w) - l * b; return { fmt: cm2, ans: A, wrong: [2 * w * (l + b), (l + 2 * w) * (b + 2 * w), (l + w) * (b + w) - l * b].filter((v) => v !== A), expl: `Mounted size ${l + 2 * w} × ${b + 2 * w} = ${(l + 2 * w) * (b + 2 * w)} cm²; border = that − ${l * b} = ${A} cm².` } }
      case 'pond': { const rr = 7 * k; const ww = 7 * (w % 2 + 1) / (w % 2 ? 2 : 1); const A = PI7 * ((rr + ww) ** 2 - rr * rr); if (!clean(A)) return null; P.rr = rr; P.ww = ww; return { fmt: m2, ans: r2(A), wrong: [r2(PI7 * ww * ww), r2(PI7 * (rr + ww) ** 2), r2(2 * PI7 * rr * ww)].filter((v) => clean(v) && v !== r2(A)), expl: `Path = π(R² − r²) = 22/7 × (${num(rr + ww)}² − ${rr}²) = ${num(r2(A))} m².` } }
      case 'frame': { if (b <= 2 * w + 2) return null; const A = (l - 2 * w) * (b - 2 * w); return { fmt: cm2, ans: A, wrong: [(l - w) * (b - w), l * b - A, l * b].filter((v) => v !== A), expl: `The glass measures (${l} − ${2 * w}) × (${b} − ${2 * w}) = ${l - 2 * w} × ${b - 2 * w} = ${A} cm².` } }
      default: { const A = 4 * w * s + 4 * w * w; P.A = A; return { fmt: unitF('m'), ans: s, wrong: [A / (4 * w), s + 2 * w, s - w].filter((v) => isInt(v) && v !== s && v > 0), expl: `(s + ${2 * w})² − s² = ${4 * w}s + ${4 * w * w} = ${A}, so ${4 * w}s = ${A - 4 * w * w} and s = ${s} m.` } }
    }
  },
  items: [
    [3, (p) => `A rectangular park ${p.l} m by ${p.b} m has a path ${p.w} m wide running round it on the outside. What is the area of the path?`, { m: 'outside' }],
    [3, (p) => `A path ${p.w} m wide runs along the inside edges of a rectangular field ${p.l} m by ${p.b} m. What is the area of the path?`, { m: 'inside' }],
    [3, (p) => `Two roads, each ${p.w} m wide, cross through the middle of a ${p.l} m by ${p.b} m field, parallel to its sides. What is the total area of the roads?`, { m: 'cross' }],
    [3, (p) => `A square lawn of side ${p.s} m has a path ${p.w} m wide around it on the outside. What is the area of the path?`, { m: 'square' }],
    [2, (p) => `A picture ${p.l} cm by ${p.b} cm is mounted with a border ${p.w} cm wide all round. What is the area of the border?`, { m: 'picture' }],
    [3, (p) => `A circular pond of radius ${p.rr} m has a path ${num(p.ww)} m wide around it. What is the area of the path? ${PIN}`, { m: 'pond' }],
    [2, (p) => `A picture frame measures ${p.l} cm by ${p.b} cm on the outside and the frame is ${p.w} cm wide. What is the area of the glass it holds?`, { m: 'frame' }],
    [3, (p) => `A path ${p.w} m wide around the outside of a square garden has an area of ${p.A} m². What is the side of the garden?`, { m: 'garden' }],
  ],
})

family('ga.mensuration.parallelogram-trapezium', 'ga.mensuration', {
  gen: (r) => ({ a: r.int(5, 30), b: r.int(4, 25), h: r.int(3, 20), d1: 2 * r.int(3, 15), d2: 2 * r.int(2, 12), q: r.pick([[2, 3], [3, 5], [1, 2], [3, 4], [2, 5]]), c: r.int(2, 9) * 10 }),
  key: (p) => `${p.m}-${p.a}-${p.b}-${p.h}-${p.d1}-${p.d2}-${p.q.join('')}-${p.c}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { a, b, h, d1, d2, q, c } = P
    const cm2 = unitF('cm²'); const cm = unitF('cm')
    const T = ((a + b) * h) / 2
    switch (P.m) {
      case 'para': return { fmt: cm2, ans: a * h, wrong: [(a * h) / 2, 2 * (a + h), a + h].filter(isInt), expl: `Area of a parallelogram = base × height = ${a} × ${h} = ${a * h} cm².` }
      case 'trap': if (!isInt(T) || a === b) return null; return { fmt: cm2, ans: T, wrong: [(a + b) * h, a * b * h / 2, ((a + b) / 2) + h].filter((v) => isInt(v) && v !== T), expl: `Area = ½(a + b)h = ½ × (${a} + ${b}) × ${h} = ${T} cm².` }
      case 'trapH': if (!isInt(T) || a === b) return null; P.T = T; return { fmt: cm, ans: h, wrong: [2 * h, T / (a + b) === h ? h + 2 : T / (a + b), h + 1].filter((v) => isInt(v) && v !== h), expl: `h = 2A ÷ (a + b) = ${2 * T} ÷ ${a + b} = ${h} cm.` }
      case 'rhombus': return { fmt: cm2, ans: (d1 * d2) / 2, wrong: [d1 * d2, d1 + d2, (d1 * d2) / 4].filter(isInt), expl: `Area of a rhombus = ½ × d₁ × d₂ = ½ × ${d1} × ${d2} = ${(d1 * d2) / 2} cm².` }
      case 'paraH': P.A = a * h; return { fmt: cm, ans: h, wrong: [2 * h, a, h + 2].filter((v) => v !== h), expl: `Height = area ÷ base = ${a * h} ÷ ${a} = ${h} cm.` }
      case 'rhombusD': { if (d1 === d2) return null; P.A = (d1 * d2) / 2; return { fmt: cm, ans: d2, wrong: [d2 / 2, P.A / d1, 2 * d2].filter((v) => isInt(v) && v !== d2), expl: `½ × ${d1} × d = ${P.A}, so d = ${2 * P.A} ÷ ${d1} = ${d2} cm.` } }
      case 'ratio': { const u = h % 5 + 2; const A1 = q[0] * u; const B1 = q[1] * u; const A = ((A1 + B1) * h) / 2; if (!isInt(A)) return null; P.A = A; return { fmt: cm, ans: B1, wrong: [A1, B1 * 2, (2 * A) / h].filter((v) => isInt(v) && v !== B1), expl: `½(${q[0]}k + ${q[1]}k) × ${h} = ${A} gives ${q[0] + q[1]}k = ${(2 * A) / h}, so k = ${u} and the longer side is ${B1} cm.` } }
      default: { if (!isInt(T) || a === b) return null; return { fmt: (v) => `Rs ${num(v)}`, ans: T * c, wrong: [(a + b) * h * c, T * c / 2, (a + b + h) * c].filter(isInt), expl: `Area = ½(${a} + ${b}) × ${h} = ${T} m²; cost = ${T} × ${c} = Rs ${num(T * c)}.` } }
    }
  },
  items: [
    [1, (p) => `Find the area of a parallelogram with a base of ${p.a} cm and a height of ${p.h} cm.`, { m: 'para' }],
    [2, (p) => `A trapezium has parallel sides of ${p.a} cm and ${p.b} cm, which are ${p.h} cm apart. What is its area?`, { m: 'trap' }],
    [2, (p) => `The area of a trapezium is ${p.T} cm² and its parallel sides are ${p.a} cm and ${p.b} cm. What is the distance between them?`, { m: 'trapH' }],
    [1, (p) => `The diagonals of a rhombus are ${p.d1} cm and ${p.d2} cm. What is its area?`, { m: 'rhombus' }],
    [1, (p) => `A parallelogram has an area of ${p.A} cm² and a base of ${p.a} cm. What is its height?`, { m: 'paraH' }],
    [2, (p) => `The area of a rhombus is ${p.A} cm² and one of its diagonals is ${p.d1} cm. How long is the other diagonal?`, { m: 'rhombusD' }],
    [3, (p) => `The parallel sides of a trapezium are in the ratio ${p.q.join(' : ')}. Its height is ${p.h} cm and its area is ${p.A} cm². What is the longer parallel side?`, { m: 'ratio' }],
    [2, (p) => `A field is a trapezium with parallel sides of ${p.a} m and ${p.b} m, ${p.h} m apart. What does it cost to plough it at Rs ${p.c} per square metre?`, { m: 'cost' }],
  ],
})

family('ga.mensuration.scale-change', 'ga.mensuration', {
  gen: (r) => ({ k: r.int(2, 5), p: 10 * r.int(1, 5), q: 10 * r.int(1, 4), r1: r.int(2, 7), pr: r.pick([[1, 2], [2, 3], [1, 3], [3, 4], [2, 5]]) }),
  key: (p) => `${p.m}-${p.k}-${p.p}-${p.q}-${p.r1}-${p.pr.join('')}`,
  fact: (p) => p.m,
  solve: (P) => {
    const { k, p, q, r1, pr } = P
    const wordsK = ['', '', 'doubled', 'tripled', 'made four times as long', 'made five times as long']
    switch (P.m) {
      case 'square': P.w = wordsK[k]; return { fmt: (v) => `${v} times`, ans: k * k, wrong: [k, 2 * k, k ** 3].filter((v) => v !== k * k), expl: `Area depends on side², so multiplying the side by ${k} multiplies the area by ${k}² = ${k * k}.` }
      case 'sphere': P.w = wordsK[k]; return { fmt: (v) => `${v} times`, ans: k ** 3, wrong: [k, k * k, 3 * k].filter((v) => v !== k ** 3), expl: `Volume depends on r³, so it is multiplied by ${k}³ = ${k ** 3}.` }
      case 'rect': { if (p === q) return null; const ch = ((100 + p) * (100 - q)) / 100 - 100; return { fmt: (v) => (v >= 0 ? `${num(v)}% increase` : `${num(-v)}% decrease`), ans: ch, wrong: [p - q, ch === 0 ? 5 : -ch, (p - q) + (p * q) / 100].filter((v) => v !== ch), expl: `New area = ${num(1 + p / 100)} × ${num(1 - q / 100)} = ${num(((100 + p) * (100 - q)) / 10000)} of the old, a ${ch >= 0 ? 'rise' : 'fall'} of ${num(Math.abs(ch))}%.` } }
      case 'cube': { const inc = ((100 + p) ** 2) / 100 - 100; return { fmt: (v) => `${num(v)}%`, ans: inc, wrong: [2 * p, p, ((100 + p) ** 3) / 10000 - 100].filter((v) => v !== inc), expl: `Surface area ∝ edge²: ${num(1 + p / 100)}² = ${num(((100 + p) ** 2) / 10000)}, an increase of ${num(inc)}%.` } }
      case 'circle': { const r2v = r1 * k; P.ra = r1; P.rb = r2v; return { fmt: (v) => `${v} times`, ans: k * k, wrong: [k, 2 * k, r2v - r1].filter((v) => v !== k * k), expl: `Area ∝ r²: (${r2v} ÷ ${r1})² = ${k}² = ${k * k}.` } }
      default: { const [x, y] = pr; return { ans: `${x ** 3} : ${y ** 3}`, wrong: [`${x} : ${y}`, `${x * x} : ${y * y}`, `${3 * x} : ${3 * y}`].filter((t) => t !== `${x ** 3} : ${y ** 3}`), expl: `Volumes of cubes are in the ratio of the cubes of their edges: ${x}³ : ${y}³ = ${x ** 3} : ${y ** 3}.` } }
    }
  },
  items: [
    [2, (p) => `If the side of a square is ${p.w}, its area becomes how many times as large?`, { m: 'square' }],
    [2, (p) => `If the radius of a sphere is ${p.w}, its volume becomes how many times as large?`, { m: 'sphere' }],
    [3, (p) => `The length of a rectangle is increased by ${p.p}% and its breadth is decreased by ${p.q}%. What is the effect on its area?`, { m: 'rect' }],
    [3, (p) => `If each edge of a cube is increased by ${p.p}%, by what percentage does its surface area increase?`, { m: 'cube' }],
    [2, (p) => `The radius of a circle is increased from ${p.ra} cm to ${p.rb} cm. How many times as large does its area become?`, { m: 'circle' }],
    [2, (p) => `The edges of two cubes are in the ratio ${p.pr.join(' : ')}. What is the ratio of their volumes?`, { m: 'cubes' }],
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
    const usedFacts = new Set()
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
        const factKey = fam.fact ? String(fam.fact(p)) : null
        if (factKey !== null && usedFacts.has(factKey)) continue
        const sol0 = fam.solve(p)
        const sol = sol0 && fam.post ? fam.post(sol0, p) : sol0
        const dbg = process.env.GA_DEBUG === `${fam.id}#${idx}` && attempt < 5
        if (dbg) console.error('DEBUG', key, JSON.stringify(sol))
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
        usedKeys.add(key); if (factKey !== null) usedFacts.add(factKey); conceptSeen.add(canonical(concept)); stemSeen.add(canonical(stem))
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
