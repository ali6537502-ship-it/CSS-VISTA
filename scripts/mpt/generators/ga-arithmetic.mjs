// Generator for the MPT release bank, General Abilities — quantitative part 1
// (arithmetic): percentages, ratio, averages, profit/loss, speed/time,
// work/time, fractions/decimals/indices.
//
//   node scripts/mpt/generators/ga-arithmetic.mjs
//
// Writes src/data/mpt/bank/abilities/ga-a-01.json … (≤100 items per file),
// IDs mpt-ga-a-0001 … Every answer is computed here; distractors come from
// typical slips (wrong base, forgotten step, reversed ratio, adding instead of
// averaging …) and are checked to differ from the answer and from each other.
// Each hand-written scenario template is used exactly once; items that share a
// mathematical skeleton share a pattern_family. Output is deterministic
// (fixed-seed PRNG).
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = 'src/data/mpt/bank/abilities'
const ID_PREFIX = 'mpt-ga-a-'
const FILE_PREFIX = 'ga-a-'
const TODAY = '2026-09-26'
const SEED = 0x6a5a2026

// ---------------------------------------------------------------------------
// Deterministic PRNG and small helpers
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(SEED)
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
const lcm = (a, b) => (a / gcd(a, b)) * b
const isInt = (x) => Number.isInteger(Math.round(x * 1e9) / 1e9) && Math.abs(x - Math.round(x)) < 1e-9
const r9 = (x) => Math.round(x * 1e9) / 1e9
const near = (a, b) => Math.abs(a - b) < 1e-9
const decimals = (x) => { const s = String(r9(x)); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1 }
/** Random multiple of m in [lo, hi], or null. */
const multExact = (m, lo, hi) => {
  const a = Math.ceil(lo / m); const b = Math.floor(hi / m)
  return a > b ? null : m * ri(a, b)
}
/** Round-looking magnitude so that stems need no calculator work. */
const roundness = (hi) => (hi >= 50000 ? 1000 : hi >= 5000 ? 100 : hi >= 1000 ? 10 : hi >= 200 ? 5 : 1)
/** Random multiple of m in [lo, hi] (preferring round values), or null. */
const mult = (m, lo, hi) => multExact(lcm(m, roundness(hi)), lo, hi) ?? multExact(m, lo, hi)
const range = (tp, lo, hi) => (tp.r ? tp.r : [lo, hi])

// Exact fractions
class Fr {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('zero denominator')
    if (d < 0) { n = -n; d = -d }
    const g = gcd(n, d) || 1
    this.n = n / g; this.d = d / g
  }
  static of(x) { return x instanceof Fr ? x : new Fr(x, 1) }
  add(o) { o = Fr.of(o); return new Fr(this.n * o.d + o.n * this.d, this.d * o.d) }
  sub(o) { o = Fr.of(o); return new Fr(this.n * o.d - o.n * this.d, this.d * o.d) }
  mul(o) { o = Fr.of(o); return new Fr(this.n * o.n, this.d * o.d) }
  div(o) { o = Fr.of(o); return new Fr(this.n * o.d, this.d * o.n) }
  get val() { return this.n / this.d }
  eq(o) { o = Fr.of(o); return this.n === o.n && this.d === o.d }
  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}` }
  mixed() {
    if (this.d === 1 || Math.abs(this.n) < this.d) return this.toString()
    const w = Math.trunc(this.n / this.d); const r = Math.abs(this.n % this.d)
    return `${w} ${r}/${this.d}`
  }
}
const fr = (n, d = 1) => new Fr(n, d)

// Text normalisation identical to scripts/mpt/bank-lib.mjs (canonical, surfaceTemplate)
const canonical = (value) => String(value ?? '').toLocaleLowerCase('en').normalize('NFKD')
  .replace(/[ً-ٰٟ]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
const surfaceTemplate = (value) => canonical(value).replace(/\d+(?:\s\d+)*/g, '#')

// Number formatting
function fmtNum(x) {
  if (x instanceof Fr) return x.toString()
  if (typeof x !== 'number') return String(x)
  x = r9(x)
  if (Number.isInteger(x)) return Math.abs(x) >= 1000 ? x.toLocaleString('en-US') : String(x)
  const s = Math.abs(x).toFixed(9).replace(/0+$/, '').replace(/\.$/, '')
  const [ip, dp] = s.split('.')
  const ipf = Number(ip) >= 1000 ? Number(ip).toLocaleString('en-US') : ip
  return `${x < 0 ? '-' : ''}${ipf}${dp ? `.${dp}` : ''}`
}
const sign = (x) => (x < 0 ? `−${fmtNum(-x)}` : fmtNum(x))
const UNITS = {
  num: (x) => fmtNum(x),
  rs: (x) => `Rs ${fmtNum(x)}`,
  pct: (x) => `${fmtNum(x)}%`,
  deg: (x) => `${fmtNum(x)}°`,
  lakh: (x) => `Rs ${fmtNum(x)} lakh`,
  thousand: (x) => `Rs ${fmtNum(x)} thousand`,
  chg: (x) => (near(x, 0) ? 'No change' : x > 0 ? `${fmtNum(x)}% increase` : `${fmtNum(-x)}% decrease`),
  pl: (x) => (near(x, 0) ? 'No profit, no loss' : x > 0 ? `${fmtNum(x)}% profit` : `${fmtNum(-x)}% loss`),
}
const unitFmt = (u) => UNITS[u] ?? ((x) => `${fmtNum(x)} ${u}`)

const MALE = ['Ali', 'Bilal', 'Hamza', 'Usman', 'Omer', 'Faisal', 'Saad', 'Kamran', 'Tariq', 'Junaid', 'Imran', 'Waqas', 'Asad', 'Zeeshan', 'Naveed', 'Adeel', 'Haris', 'Salman']
const FEMALE = ['Sana', 'Ayesha', 'Fatima', 'Zainab', 'Hira', 'Mehwish', 'Noreen', 'Rabia', 'Amna', 'Sadia', 'Maria', 'Iqra', 'Saba', 'Nida', 'Kiran', 'Farah', 'Mahnoor', 'Areeba']
function names() {
  const m = shuffle(MALE); const f = shuffle(FEMALE); const all = shuffle([...m.slice(0, 3), ...f.slice(0, 3)])
  return { M1: m[3], M2: m[4], M3: m[5], F1: f[3], F2: f[4], F3: f[5], A: all[0], B: all[1], C: all[2] }
}
const ORD = (n) => { const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'; return `${n}${s}` }
const TIMES = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' }

// ---------------------------------------------------------------------------
// Families, modes and templates
const FAMILIES = []
function fam(family, subtopic, modes) { FAMILIES.push({ family, subtopic, modes }) }
/** A mode: one way of asking on the family's skeleton. gen(tp) returns
 *  { v, ans, wrong, exp } (numeric) or { v, opts: [{label,val}…], exp } (answer first). */
function mode(def) { return def }

// ---- Percentages ------------------------------------------------------------
const PCT_EASY = [5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80]

fam('ga.percentage.percent-of-quantity', 'ga.percentage', [
  mode({
    d: 1, u: 'num',
    gen(tp) {
      const p = pick(tp.p ?? PCT_EASY); const [lo, hi] = range(tp, 200, 5000)
      const N = mult(lcm(100 / gcd(p, 100), 10), lo, hi) ?? mult(100 / gcd(p, 100), lo, hi); if (!N) return null
      const ans = (p * N) / 100
      return { v: { p, N }, ans, wrong: [N - ans, ans * 10, ans / 10, ans + p, 2 * ans], exp: `${p}% of ${fmtNum(N)} = ${p}/100 × ${fmtNum(N)} = ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'A school has {N} students, and {p}% of them come by bus. How many students come by bus?', r: [300, 2000] },
      { t: 'Of the {N} candidates who sat a test, {p}% qualified. How many candidates qualified?', r: [200, 3000] },
      { t: 'A farmer harvested {N} kg of wheat and sold {p}% of it at the local mandi. How many kilograms did he sell?§kg', r: [500, 5000] },
      { t: '{M1} earns Rs {N} a month and saves {p}% of it. How much does he save each month?§rs', r: [20000, 90000] },
      { t: 'What is {p}% of {N}?', r: [60, 900] },
      { t: 'A tank holds {N} litres. How much water is in it when it is {p}% full?§litres', r: [200, 3000] },
      { t: 'A library has {N} books, of which {p}% are in Urdu. How many Urdu books does it have?', r: [500, 5000] },
      { t: 'In a village of {N} households, {p}% have solar panels on their roofs. How many households is that?', r: [200, 1500] },
      { t: 'A factory produced {N} bulbs in a day and {p}% of them were found defective. How many bulbs were defective?', r: [400, 4000] },
      { t: 'Out of {N} registered voters in a union council, {p}% cast their votes. How many votes were cast?', r: [1000, 5000] },
      { t: 'A rope {N} cm long is shortened by cutting off {p}% of its length. How long is the piece cut off?§cm', r: [100, 800] },
    ],
  }),
])

fam('ga.percentage.express-as-percent', 'ga.percentage', [
  mode({
    d: 1, u: 'pct',
    gen(tp) {
      const p = pick([4, 5, 8, 10, 12, 15, 16, 20, 24, 25, 30, 35, 36, 40, 45, 48, 55, 60, 64, 65, 70, 72, 75, 80, 84, 85, 90, 95])
      const [lo, hi] = range(tp, 20, 800); const b = mult(100 / gcd(p, 100), lo, hi); if (!b || b === 100) return null
      const a = (p * b) / 100
      return { v: { a, b }, ans: p, wrong: [100 - p, a, (b * 100) / a, p / 10, p + 5], exp: `${fmtNum(a)}/${fmtNum(b)} × 100 = ${p}%.` }
    },
    T: [
      { t: 'A student scored {a} marks out of {b}. What percentage of the marks did the student obtain?', r: [40, 1100] },
      { t: '{a} is what percent of {b}?' },
      { t: 'In a class of {b} students, {a} are left-handed. What percentage of the class is left-handed?', r: [20, 60] },
      { t: 'A shopkeeper had {b} eggs and {a} of them broke on the way to his shop. What percentage of the eggs broke?', r: [60, 600] },
      { t: 'Express Rs {a} as a percentage of Rs {b}.', r: [200, 5000] },
      { t: 'Out of {b} working days in a term, an employee was absent on {a} days. What was his percentage of absence?', r: [40, 300] },
      { t: 'A {b}-litre drum contains {a} litres of oil. What percentage of the drum is filled?', r: [20, 400] },
      { t: 'A salesman met {b} customers and made a sale to {a} of them. His success rate was:', r: [20, 200] },
      { t: 'On a plot of {b} square metres, a house covers {a} square metres. What percentage of the plot is built up?', r: [100, 1000] },
      { t: 'Of {b} applicants for a post, {a} were called for interview. What percent of the applicants were called?', r: [50, 800] },
      { t: 'A batsman faced {b} balls and hit {a} of them for boundaries. What percentage of the balls he faced went for boundaries?', r: [40, 250] },
      { t: 'A journey of {b} km includes {a} km on a motorway. What percentage of the journey is on the motorway?', r: [50, 800] },
    ],
  }),
])

fam('ga.percentage.whole-from-part', 'ga.percentage', [
  mode({
    d: 1, u: 'num',
    gen(tp) {
      const p = pick([5, 8, 10, 12, 15, 20, 25, 30, 40, 60, 75, 80]); const [lo, hi] = range(tp, 100, 5000)
      const X = mult(lcm(100 / gcd(p, 100), 10), lo, hi); if (!X) return null
      const part = (p * X) / 100
      return { v: { p, part }, ans: X, wrong: [(part * 100) / (100 - p), (part * (100 + p)) / 100, (part * p) / 100, part * 10, X / 2], exp: `If ${p}% is ${fmtNum(part)}, then 100% = ${fmtNum(part)} × 100/${p} = ${fmtNum(X)}.` }
    },
    T: [
      { t: '{p}% of a number is {part}. What is the number?', r: [100, 2000] },
      { t: 'A student saves Rs {part}, which is {p}% of his monthly pocket money. How much pocket money does he get?§rs', r: [1000, 10000] },
      { t: 'In an election the winning candidate got {part} votes, which was {p}% of the votes polled. How many votes were polled?', r: [2000, 50000] },
      { t: 'The {part} students of a college who play hockey make up {p}% of its students. How many students does the college have?', r: [500, 5000] },
      { t: 'A car’s tank holds {part} litres of petrol when it is {p}% full. What is the full capacity of the tank?§litres', r: [30, 80] },
      { t: 'The rent of a house, Rs {part}, is {p}% of a family’s monthly income. What is the income?§rs', r: [30000, 150000] },
      { t: 'A batsman made {part} runs in boundaries, which was {p}% of his total score. What was his total score?§runs', r: [40, 300] },
      { t: '{part} is {p}% of what number?', r: [50, 900] },
      { t: 'At a seminar, {p} percent of the seats in the hall, that is {part} seats, were empty. How many seats does the hall have?', r: [200, 2000] },
      { t: 'A shop allowed a discount of Rs {part}, equal to {p}% of the marked price. What was the marked price?§rs', r: [1000, 20000] },
      { t: 'A road gang has finished {part} metres of a road, which is {p}% of the whole length. How long is the road?§m', r: [500, 5000] },
      { t: 'The tax deducted from a salary is Rs {part}, which is {p}% of the salary. What is the salary?§rs', r: [30000, 200000] },
    ],
  }),
])

fam('ga.percentage.remainder-to-original', 'ga.percentage', [
  mode({
    d: 2, u: 'num',
    gen(tp) {
      const p = pick(tp.p ?? [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 65, 70, 75, 80]); const [lo, hi] = range(tp, 200, 5000)
      const X = mult(lcm(100 / gcd(100 - p, 100), 10), lo, hi); if (!X) return null
      const R = (X * (100 - p)) / 100
      return { v: { p, R }, ans: X, wrong: [(R * (100 + p)) / 100, (R * 100) / p, (X * (100 + p)) / 100, R + p * 10], exp: `${fmtNum(R)} is ${100 - p}% of the original, so original = ${fmtNum(R)} × 100/${100 - p} = ${fmtNum(X)}.` }
    },
    T: [
      { t: 'A watch dealer sold {p}% of his stock and still has {R} watches. How many watches did he have at first?', r: [200, 2000] },
      { t: 'After spending {p}% of her savings on a laptop, {F1} has Rs {R} left. How much had she saved?§rs', r: [50000, 300000] },
      { t: '{p}% of the water in a tank was used, leaving {R} litres. What was the initial quantity of water?§litres', r: [500, 5000] },
      { t: 'A fruit seller found that {p}% of his mangoes were rotten. If {R} mangoes were good, how many mangoes did he have?', r: [200, 2000], p: [10, 15, 20, 25, 30] },
      { t: 'A town’s population fell by {p}% after floods and now stands at {R}. What was the population before the floods?', r: [10000, 90000], p: [10, 15, 20, 25, 30] },
      { t: 'When {p}% of the audience left the hall, {R} people remained. How many people were in the hall at first?', r: [200, 1500] },
      { t: 'After a deduction of {p}%, a salary is paid as Rs {R}. What is the salary before the deduction?§rs', r: [20000, 150000], p: [10, 15, 20, 25] },
      { t: 'Having covered {p}% of a journey, a traveller still has {R} km to go. How long is the whole journey?§km', r: [100, 1500] },
      { t: 'A farmer used {p}% of his fertiliser in the first sowing and has {R} kg left. How much fertiliser had he bought?§kg', r: [200, 2000] },
      { t: 'In a test, {p}% of the candidates failed and {R} passed. How many candidates took the test?', r: [200, 5000] },
      { t: 'A mobile phone battery has used {p}% of its charge and {R} mAh of charge remains. What is the full charge of the battery?§mAh', r: [1000, 6000], p: [20, 25, 40, 50, 60, 75] },
      { t: 'A cloth merchant cut {p}% off a roll of cloth and {R} metres were left. How long was the roll?§m', r: [40, 400] },
      { t: 'A bookseller sold {p}% of his copies of a guidebook in one week and had {R} copies left. How many copies did he start with?', r: [200, 2000] },
    ],
  }),
])

fam('ga.percentage.successive-change', 'ga.percentage', [
  mode({ // net percentage change of +a then −b
    d: 2, u: 'chg',
    gen() {
      const a = pick([10, 20, 25, 30, 40, 50]); const b = pick([10, 20, 25, 30, 40, 50])
      if ((a * b) % 100) return null
      const ans = a - b - (a * b) / 100
      return { v: { a, b }, ans, allowNeg: true, wrong: [a - b, a - b + (a * b) / 100, b - a - (a * b) / 100, -(a * b) / 100 * 2], exp: `Net change = ${a} − ${b} − (${a} × ${b})/100 = ${sign(ans)}%, so the result is ${UNITS.chg(ans).toLowerCase()}.` }
    },
    T: [
      'The price of sugar rose by {a}% and then fell by {b}%. What is the net change in its price?',
      'A shopkeeper first increases the price of a fan by {a}% and later reduces the new price by {b}%. The overall effect on the price is:',
      '{A}’s salary was raised by {a}% and then cut by {b}%. By what percent did the salary change overall?',
      'The length of a rectangle is increased by {a}% and its breadth is decreased by {b}%. What is the percentage change in its area?',
      'A number is increased by {a}% and the result is then decreased by {b}%. The net percentage change is:',
      'Petrol was made {a}% dearer in March and {b}% cheaper in April. Compared with February, the April price shows:',
    ],
  }),
  mode({ // two increases, final value
    d: 2, u: 'num',
    gen(tp) {
      const a = pick([5, 10, 20, 25, 50]); const b = pick([5, 10, 20, 25, 50]); const k = (100 + a) * (100 + b)
      const [lo, hi] = range(tp, 1000, 50000); const N = mult(10000 / gcd(k, 10000), lo, hi); if (!N) return null
      const ans = (N * k) / 10000
      return { v: { a, b, N }, ans, wrong: [(N * (100 + a + b)) / 100, (N * (100 + a)) / 100, (N * (100 + b)) / 100, ans + N / 10], exp: `${fmtNum(N)} × ${100 + a}/100 × ${100 + b}/100 = ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'A town of {N} people grows by {a}% in one year and by {b}% in the next. What is its population after two years?', r: [10000, 90000] },
      { t: 'The price of a bag, Rs {N}, is raised by {a}% and the new price is later raised by a further {b}%. What is the final price?§rs', r: [1000, 20000] },
      { t: 'A company with {N} employees increases its staff by {a}%, and then by another {b}% of the new strength. How many employees does it have now?', r: [200, 4000] },
    ],
  }),
  mode({ // two decreases, final value
    d: 2, u: 'num',
    gen(tp) {
      const a = pick([10, 20, 25, 40, 50]); const b = pick([10, 20, 25, 40, 50]); const k = (100 - a) * (100 - b)
      const [lo, hi] = range(tp, 1000, 50000); const N = mult(10000 / gcd(k, 10000), lo, hi); if (!N) return null
      const ans = (N * k) / 10000
      return { v: { a, b, N }, ans, wrong: [(N * (100 - a - b)) / 100, (N * (100 - a)) / 100, (N * (a + b)) / 100, ans + N / 10], exp: `${fmtNum(N)} × ${100 - a}/100 × ${100 - b}/100 = ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'A machine worth Rs {N} loses {a}% of its value in the first year and {b}% of its remaining value in the second. What is it worth after two years?§rs', r: [50000, 800000] },
      { t: 'A pond had {N} fish. {a}% of them were caught in the first week and {b}% of those left were caught in the second week. How many fish remain?', r: [400, 5000] },
      { t: 'A car bought for Rs {N} thousand depreciates by {a}% in its first year and by {b}% of the reduced value in its second year. What is its value after two years?§thousand', r: [800, 5000] },
    ],
  }),
  mode({ // original from final after +a then −b
    d: 3, u: 'num',
    gen(tp) {
      const a = pick([10, 20, 25, 50]); const b = pick([10, 20, 25, 40]); const k = (100 + a) * (100 - b)
      if (a === b) return null
      const [lo, hi] = range(tp, 1000, 50000); const N = mult(10000 / gcd(k, 10000), lo, hi); if (!N) return null
      const F = (N * k) / 10000
      return { v: { a, b, F }, ans: N, wrong: [(F * 100) / (100 + a - b), (F * (100 - a) * (100 + b)) / 10000, F + (F * (b - a)) / 100, F], exp: `Original × ${100 + a}/100 × ${100 - b}/100 = ${fmtNum(F)}, so the original = ${fmtNum(F)} × 10000/${k} = ${fmtNum(N)}.` }
    },
    T: [
      { t: 'After a {a}% rise followed by a {b}% fall, the price of a bicycle is Rs {F}. What was its original price?§rs', r: [5000, 50000] },
      { t: 'A number is increased by {a}% and then decreased by {b}% to give {F}. What is the number?', r: [100, 2000] },
      { t: 'A trader raised the price of a bag of rice by {a}% and then gave a {b}% cut, after which the bag sold for Rs {F}. What was the price before the rise?§rs', r: [1000, 10000] },
      { t: 'An employee’s pay was increased by {a}% and later reduced by {b}%, and it now stands at Rs {F}. What was the pay originally?§rs', r: [20000, 100000] },
    ],
  }),
])

fam('ga.percentage.percent-change', 'ga.percentage', [
  mode({
    d: 2, u: 'pct',
    gen(tp) {
      const p = pick(tp.p ?? [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80]); const [lo, hi] = range(tp, 50, 5000)
      const o = mult(100 / gcd(p, 100), lo, hi); if (!o) return null
      const n = (o * (100 + p)) / 100; const diff = n - o
      return { v: { o, n }, ans: p, wrong: [(diff * 100) / n, diff < 100 ? diff : null, 100 + p, p / 2, p + 10], exp: `Increase = ${fmtNum(diff)}; ${fmtNum(diff)}/${fmtNum(o)} × 100 = ${p}% (always divide by the original value).` }
    },
    T: [
      { t: 'The price of a litre of milk rose from Rs {o} to Rs {n}. What is the percentage increase?', r: [100, 250], p: [5, 8, 10, 12, 15, 20, 25] },
      { t: 'A school’s enrolment went up from {o} to {n}. By what percent did it increase?', r: [300, 2000] },
      { t: '{A}’s monthly salary increased from Rs {o} to Rs {n}. Find the percentage increase.', r: [20000, 90000], p: [5, 8, 10, 12, 15, 20, 25] },
      { t: 'A sapling grew from {o} cm to {n} cm in a month. By what percentage did its height increase?', r: [20, 120], p: [10, 20, 25, 30, 40, 50, 60] },
      { t: 'Wheat production in a district rose from {o} tonnes to {n} tonnes. The percentage increase is:', r: [2000, 9000] },
      { t: 'The fare on a bus route was raised from Rs {o} to Rs {n}. By what percent was the fare raised?', r: [40, 400] },
    ],
  }),
  mode({
    d: 2, u: 'pct',
    gen(tp) {
      const p = pick(tp.p ?? [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75]); const [lo, hi] = range(tp, 50, 5000)
      const o = mult(100 / gcd(p, 100), lo, hi); if (!o) return null
      const n = (o * (100 - p)) / 100; const diff = o - n
      return { v: { o, n }, ans: p, wrong: [(diff * 100) / n, 100 - p, diff < 100 ? diff : null, p + 5], exp: `Decrease = ${fmtNum(diff)}; ${fmtNum(diff)}/${fmtNum(o)} × 100 = ${p}% (the base is the original value).` }
    },
    T: [
      { t: 'The price of a mobile phone fell from Rs {o} to Rs {n}. What is the percentage decrease?', r: [20000, 90000] },
      { t: 'A family cut its weekly petrol use from {o} litres to {n} litres. By what percent did its petrol use fall?', r: [20, 80], p: [5, 10, 20, 25] },
      { t: 'The number of smokers in an office dropped from {o} to {n}. Find the percentage decrease.', r: [20, 200] },
      { t: 'A patient’s weight went down from {o} kg to {n} kg. What percentage of his weight did he lose?', r: [60, 140], p: [4, 5, 8, 10, 12, 15, 20] },
      { t: 'The electricity bill of a house dropped from Rs {o} to Rs {n} after solar panels were fitted. By what percent did the bill drop?', r: [5000, 40000], p: [10, 20, 25, 30, 40, 50, 60] },
      { t: 'Road accidents in a city fell from {o} in one year to {n} in the next. The percentage reduction is:', r: [200, 2000] },
    ],
  }),
])

fam('ga.percentage.spend-then-remainder', 'ga.percentage', [
  mode({ // a% and b% of whole, then c% of the remainder
    d: 3, u: 'rs',
    gen(tp) {
      const a = pick([5, 10, 15, 20, 25, 30]); const b = pick([10, 15, 20, 25, 30, 40]); if (a + b > 70 || a === b) return null
      const c = pick([10, 20, 25, 40, 50, 60]); const k = (100 - a - b) * (100 - c)
      const [lo, hi] = range(tp, 4000, 200000); const S = mult(lcm(10000 / gcd(k, 10000), 100), lo, hi); if (!S) return null
      const L = (S * k) / 10000
      return { v: { a, b, c, L }, ans: S, wrong: [100 - a - b - c > 0 ? (L * 100) / (100 - a - b - c) : null, (L * 100) / (100 - a - b), (L * 100) / (100 - c), S / 2], exp: `After ${a}% and ${b}%, ${100 - a - b}% is left; after ${c}% of that, ${100 - c}% of ${100 - a - b}% = ${k / 100}% remains. ${k / 100}% of the total = ${fmtNum(L)}, so the total = ${fmtNum(S)}.` }
    },
    T: [
      { t: 'A student uses {a}% of his scholarship for food and {b}% for fees. He then spends {c}% of what is left on hostel dues and keeps the remaining Rs {L}. How much is the scholarship?', r: [10000, 80000] },
      { t: '{M1} gives {a}% of his income to his mother and {b}% to his wife. Of the rest, he spends {c}% on bills and saves Rs {L}. What is his income?', r: [40000, 200000] },
      { t: 'A man spent {a}% of his bonus on a phone and {b}% on clothes, then donated {c}% of what remained. He still had Rs {L}. How much was the bonus?', r: [20000, 150000] },
      { t: 'From a monthly budget, {a}% goes on rent and {b}% on groceries; {c}% of the balance goes on transport, leaving Rs {L}. Find the monthly budget.', r: [40000, 200000] },
      { t: 'A trust gave {a}% of its fund to a hospital and {b}% to a school. It then used {c}% of the balance for a water project and kept Rs {L} in reserve. How large was the fund?', r: [100000, 900000] },
      { t: '{F1} spent {a}% of her prize money on books and {b}% on a trip. She put {c}% of the rest in a savings account and had Rs {L} left in cash. What was the prize money?', r: [10000, 100000] },
    ],
  }),
  mode({ // a% of whole, then b% of the remainder
    d: 2, u: 'num',
    gen(tp) {
      const a = pick([10, 20, 25, 30, 40, 50, 60]); const b = pick([10, 20, 25, 40, 50]); const k = (100 - a) * (100 - b)
      const [lo, hi] = range(tp, 400, 100000); const S = mult(lcm(10000 / gcd(k, 10000), 10), lo, hi); if (!S) return null
      const L = (S * k) / 10000
      return { v: { a, b, L }, ans: S, wrong: [100 - a - b > 0 ? (L * 100) / (100 - a - b) : null, (L * 100) / (100 - a), (L * 100) / (100 - b), L * 2], exp: `What is left = ${100 - a}% × ${100 - b}% = ${k / 100}% of the whole = ${fmtNum(L)}, so the whole = ${fmtNum(S)}.` }
    },
    T: [
      { t: 'A man spends {a}% of his salary on household expenses and {b}% of the remainder on his children’s education. If he saves Rs {L}, what is his salary?§rs', r: [30000, 200000] },
      { t: 'A shopkeeper sold {a}% of his eggs in the morning and {b}% of the remaining eggs in the evening. He was left with {L} eggs. How many eggs did he have at the start?', r: [400, 3000] },
      { t: '{a}% of a tank’s water is drawn off in the morning and {b}% of what remains is drawn off at night, leaving {L} litres. How much water was in the tank?§litres', r: [1000, 10000] },
      { t: 'A farmer sold {a}% of his crop to a flour mill and {b}% of the rest to a trader, keeping {L} maunds for his family. How big was the crop?§maunds', r: [100, 2000] },
      { t: 'Out of the money in his wallet, {M1} spent {a}% at a bookshop and then {b}% of the balance on lunch. If Rs {L} is left, how much was in the wallet at first?§rs', r: [1000, 20000] },
    ],
  }),
])

const MORE_LESS = [[25, 20], [60, 37.5], [100, 50], [150, 60], [300, 75], [400, 80]]
const LESS_MORE = [[20, 25], [50, 100], [60, 150], [75, 300], [80, 400], [37.5, 60]]
fam('ga.percentage.relative-comparison', 'ga.percentage', [
  mode({
    d: 2, u: 'pct',
    gen(tp) {
      const [p, q] = pick(tp.pairs ?? MORE_LESS)
      return { v: { p }, ans: q, wrong: [p, p < 100 ? (100 * p) / (100 - p) : null, p / 2, 100 - q], exp: `Take the smaller as 100; the larger is ${100 + p}. The difference ${p} as a percentage of ${100 + p} is ${fmtNum(q)}%.` }
    },
    T: [
      { t: '{A}’s salary is {p}% more than {B}’s. By what percent is {B}’s salary less than {A}’s?', pairs: [[25, 20], [60, 37.5], [100, 50]] },
      { t: 'A kilogram of beef costs {p}% more than a kilogram of chicken. By what percent is chicken cheaper than beef?', pairs: [[25, 20], [60, 37.5], [100, 50], [150, 60]] },
      'Town X has {p}% more residents than town Y. By what percentage is the population of Y smaller than that of X?',
      'A new model of a car is {p}% more expensive than the old model. By what percent must the new price be reduced to bring it down to the old price?',
    ],
  }),
  mode({
    d: 2, u: 'pct',
    gen(tp) {
      const [p, q] = pick(tp.pairs ?? LESS_MORE)
      return { v: { p }, ans: q, wrong: [p, (100 * p) / (100 + p), 2 * p, 100 - p], exp: `Take the larger as 100; the smaller is ${fmtNum(100 - p)}. The gap ${fmtNum(p)} as a percentage of ${fmtNum(100 - p)} is ${fmtNum(q)}%.` }
    },
    T: [
      { t: '{A} weighs {p}% less than {B}. By what percent is {B}’s weight more than {A}’s?', pairs: [[20, 25], [37.5, 60]] },
      'A tablet costs {p}% less than a laptop. By what percentage is the laptop dearer than the tablet?',
      { t: 'The price of a commodity falls by {p}%. By what percent can a family increase its consumption without changing its spending on it?', d: 3 },
      { pairs: [[20, 25], [50, 100], [60, 150], [37.5, 60]], t: 'After an injury a worker’s daily output is {p}% below his usual output. By what percent must it rise to return to the usual level?', d: 3 },
    ],
  }),
])

fam('ga.percentage.simple-interest', 'ga.percentage', [
  mode({ // interest
    d: 1, u: 'rs',
    gen() {
      const P = mult(500, 5000, 100000); const r = pick([4, 5, 6, 8, 10, 12, 15]); const t = pick([2, 3, 4, 5])
      const I = (P * r * t) / 100; if (!isInt(I)) return null
      return { v: { P, r, t }, ans: I, wrong: [(P * r) / 100, P + I, I * 2, (P * r * t) / 1000], exp: `SI = P × R × T/100 = ${fmtNum(P)} × ${r} × ${t}/100 = Rs ${fmtNum(I)}.` }
    },
    T: [
      'What is the simple interest on Rs {P} at {r}% per annum for {t} years?',
      '{F1} deposits Rs {P} in a savings scheme that pays {r}% simple interest a year. How much interest does she earn in {t} years?',
      'A loan of Rs {P} is taken at {r}% a year simple interest. How much interest is due after {t} years?',
    ],
  }),
  mode({ // amount
    d: 2, u: 'rs',
    gen() {
      const P = mult(1000, 5000, 100000); const r = pick([5, 6, 8, 10, 12]); const t = pick([2, 3, 4, 5])
      const I = (P * r * t) / 100
      return { v: { P, r, t }, ans: P + I, wrong: [I, P + (P * r) / 100, P + 2 * I, P - I], exp: `SI = ${fmtNum(P)} × ${r} × ${t}/100 = ${fmtNum(I)}; amount = ${fmtNum(P)} + ${fmtNum(I)} = Rs ${fmtNum(P + I)}.` }
    },
    T: ['Find the amount (principal plus simple interest) when Rs {P} is lent for {t} years at {r}% per annum.'],
  }),
  mode({ // rate
    d: 2, u: 'pct',
    gen() {
      const P = mult(1000, 5000, 100000); const r = pick([4, 5, 6, 8, 10, 12, 15]); const t = pick([2, 3, 4, 5])
      const I = (P * r * t) / 100
      return { v: { P, I, t, Amt: P + I }, ans: r, wrong: [r * t, r + 2, r * 2, r - 1], exp: `R = 100 × SI/(P × T) = 100 × ${fmtNum(I)}/(${fmtNum(P)} × ${t}) = ${r}%.` }
    },
    T: [
      'At what rate of simple interest will Rs {P} earn Rs {I} in {t} years?',
      'A sum of Rs {P} amounts to Rs {Amt} in {t} years at simple interest. What is the annual rate?',
    ],
  }),
  mode({ // principal from two amounts
    d: 2, u: 'rs',
    gen() {
      const P = mult(10, 400, 5000); const Iy = ri(12, 90); const t1 = ri(2, 4); const t2 = t1 + ri(1, 3)
      const A1 = P + t1 * Iy; const A2 = P + t2 * Iy
      return { v: { A1, A2, t1, t2 }, ans: P, wrong: [A1 - Iy, A1 - (A2 - A1), P + Iy, 2 * A1 - A2 - Iy], exp: `Interest for ${t2 - t1} year(s) = ${fmtNum(A2)} − ${fmtNum(A1)} = ${fmtNum(A2 - A1)}, i.e. ${Iy} a year; sum = ${fmtNum(A1)} − ${t1} × ${Iy} = Rs ${fmtNum(P)}.` }
    },
    T: [
      'A sum lent at simple interest amounts to Rs {A1} in {t1} years and to Rs {A2} in {t2} years. What is the sum?',
      'Money invested at simple interest grows to Rs {A1} after {t1} years and to Rs {A2} after {t2} years. How much money was invested?',
    ],
  }),
])

const PASS_MAX = [200, 300, 400, 500, 600, 800, 1000, 1100, 1200]
fam('ga.percentage.pass-marks', 'ga.percentage', [
  mode({ // fails by f
    d: 2, u: 'num',
    gen() {
      const M = pick(PASS_MAX); const p = pick([33, 35, 36, 40, 45, 50]); const P = (p * M) / 100; if (!isInt(P)) return null
      const f = ri(5, 40); const s = P - f; if (s <= 0) return null
      return { v: { p, s, f }, ans: M, wrong: [(s * 100) / p, ((s - f) * 100) / p, s + f, M + 100], exp: `Pass mark = ${s} + ${f} = ${P}, which is ${p}% of the maximum; maximum = ${P} × 100/${p} = ${M}.` }
    },
    T: [
      'A candidate needs {p}% of the marks to pass. He gets {s} marks and fails by {f} marks. What are the maximum marks?',
      'In an examination the pass mark is {p}%. {F1} scored {s} and missed passing by {f} marks. The paper was out of:',
      'To qualify in a test one needs {p}% of the total marks. A candidate who scored {s} marks fell short by {f}. Find the total marks.',
    ],
  }),
  mode({ // passes with f to spare
    d: 2, u: 'num',
    gen() {
      const M = pick(PASS_MAX); const p = pick([33, 35, 36, 40, 45, 50]); const P = (p * M) / 100; if (!isInt(P)) return null
      const f = ri(5, 40); const s = P + f
      return { v: { p, s, f }, ans: M, wrong: [(s * 100) / p, ((s + f) * 100) / p, s - f, M - 100], exp: `Pass mark = ${s} − ${f} = ${P}, which is ${p}% of the maximum; maximum = ${P} × 100/${p} = ${M}.` }
    },
    T: [
      '{M1} got {s} marks in a test and passed with {f} marks to spare. If the pass mark is {p}%, what is the maximum mark?',
      'A student scored {s} marks, which was {f} more than the {p}% needed to pass. What were the maximum marks?',
    ],
  }),
  mode({ // two candidates, maximum marks
    d: 3, u: 'num',
    gen() {
      const M = pick([200, 300, 400, 500, 600, 800, 1000]); const p1 = pick([20, 25, 30, 35]); const p2 = pick([40, 45, 50, 55, 60])
      const s1 = (p1 * M) / 100; const s2 = (p2 * M) / 100; if (!isInt(s1) || !isInt(s2)) return null
      const P = ri(s1 + 5, s2 - 5); const f1 = P - s1; const f2 = s2 - P; if (f1 < 5 || f2 < 5) return null
      return { v: { p1, p2, f1, f2 }, ans: M, P, wrong: [((f2 - f1) * 100) / (p2 - p1) > 0 ? ((f2 - f1) * 100) / (p2 - p1) : null, ((f1 + f2) * 100) / (p1 + p2), ((f1 + f2) * 100) / p2, M * 2], exp: `(${p2} − ${p1})% of the maximum = ${f1} + ${f2} = ${f1 + f2}, so ${p2 - p1}% = ${f1 + f2} and the maximum = ${M}.` }
    },
    T: [
      'A candidate who scores {p1}% fails by {f1} marks, while another who scores {p2}% gets {f2} marks more than the minimum required. What are the maximum marks?',
      'If {p1}% of the maximum marks is {f1} less than the pass mark and {p2}% is {f2} more than it, the maximum marks are:',
    ],
  }),
  mode({ // two candidates, pass mark
    d: 3, u: 'num',
    gen() {
      const M = pick([200, 300, 400, 500, 600, 800, 1000]); const p1 = pick([20, 25, 30, 35]); const p2 = pick([40, 45, 50, 55, 60])
      const s1 = (p1 * M) / 100; const s2 = (p2 * M) / 100; if (!isInt(s1) || !isInt(s2)) return null
      const P = ri(s1 + 5, s2 - 5); const f1 = P - s1; const f2 = s2 - P; if (f1 < 5 || f2 < 5) return null
      return { v: { p1, p2, f1, f2 }, ans: P, wrong: [s1, s2, (s1 + s2) / 2 === P ? M / 2 : (s1 + s2) / 2, P + f1], exp: `${p2 - p1}% of the maximum = ${f1 + f2}, so the maximum is ${M}; pass mark = ${p1}% of ${M} + ${f1} = ${s1} + ${f1} = ${P}.` }
    },
    T: [
      '{F1} got {p1}% and failed by {f1} marks; {F2} got {p2}% and was {f2} marks above the pass mark. What is the pass mark?',
      'Scoring {p1}% leaves a candidate {f1} marks below the pass mark, and scoring {p2}% puts him {f2} marks above it. How many marks are needed to pass?',
    ],
  }),
])

fam('ga.percentage.convert-forms', 'ga.percentage', [
  mode({
    d: 1, u: 'pct',
    gen() {
      const x = pick([0.001, 0.004, 0.02, 0.05, 0.07, 0.35, 0.45, 0.8, 1.25, 1.5, 2.4, 0.625, 0.075])
      const ans = r9(x * 100)
      return { v: { x }, ans, wrong: [x, r9(x * 10), r9(x * 1000), r9(x * 100) + 1], exp: `To change a decimal to a percentage multiply by 100: ${fmtNum(x)} × 100 = ${fmtNum(ans)}%.` }
    },
    T: ['Express {x} as a percentage.'],
  }),
  mode({
    d: 1, u: 'pct',
    gen() {
      const [n, d] = pick([[3, 8], [5, 8], [7, 8], [1, 8], [3, 16], [7, 20], [9, 25], [11, 40], [7, 4], [13, 20], [3, 40], [9, 16]])
      const ans = r9((n / d) * 100); if (decimals(ans) > 2) return null
      return { v: { f: `${n}/${d}` }, ans, wrong: [r9((n / d) * 10), r9((d / n) * 100), n + d, r9(ans + 10)], exp: `${n}/${d} × 100 = ${fmtNum(ans)}%.` }
    },
    T: ['Write the fraction {f} as a percentage.'],
  }),
  mode({
    d: 1, u: 'num',
    gen() {
      const p = pick([0.5, 2.5, 7.5, 12.5, 0.25, 4, 45, 115, 150, 0.8, 6.25])
      return { v: { p }, ans: r9(p / 100), wrong: [r9(p / 10), r9(p / 1000), p, r9(p / 100) * 2], exp: `A percentage is divided by 100: ${fmtNum(p)}% = ${fmtNum(p)}/100 = ${fmtNum(r9(p / 100))}.` }
    },
    T: ['{p}% written as a decimal is:', 'Express {p} percent as a decimal fraction.'],
  }),
  mode({
    d: 1,
    gen() {
      const p = pick([15, 35, 45, 12.5, 37.5, 62.5, 8, 24, 64, 85, 2.5, 175])
      const f = fr(Math.round(p * 10), 1000)
      const alt = [fr(Math.round(p * 10), 100), fr(100, Math.round(p * 10)).mul(fr(1, 10)), f.add(fr(1, f.d)), fr(f.n, f.d + 1)]
      return { v: { p }, opts: [{ label: f.toString(), val: f.val }, ...alt.map((x) => ({ label: x.toString(), val: x.val }))], exp: `${fmtNum(p)}% = ${fmtNum(p)}/100 = ${f.toString()} in lowest terms.` }
    },
    T: ['Which fraction in its lowest terms is equal to {p}%?'],
  }),
])

fam('ga.percentage.increase-decrease-by', 'ga.percentage', [
  mode({
    d: 1, u: 'num',
    gen(tp) {
      const p = pick([5, 10, 12, 15, 20, 25, 30, 40]); const [lo, hi] = range(tp, 100, 2000); const up = tp.dir !== 'down'
      const N = mult(lcm(100 / gcd(p, 100), 10), lo, hi); if (!N) return null
      const ch = (N * p) / 100; const ans = up ? N + ch : N - ch
      return { v: { p, N }, ans, wrong: [ch, up ? N - ch : N + ch, N + p, up ? N + 2 * ch : N - 2 * ch], exp: `${p}% of ${fmtNum(N)} = ${fmtNum(ch)}; ${fmtNum(N)} ${up ? '+' : '−'} ${fmtNum(ch)} = ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'Increase {N} by {p}%.', r: [100, 900] },
      { t: 'A worker earning Rs {N} a month gets a {p}% raise. What is his new monthly salary?§rs', r: [20000, 80000] },
      { t: 'Decrease {N} by {p}%.', r: [100, 900], dir: 'down' },
      { t: 'The yearly rent of a shop, Rs {N}, is reduced by {p}% in a slow season. What is the reduced rent?§rs', r: [100000, 600000], dir: 'down' },
    ],
  }),
])

fam('ga.percentage.concentration', 'ga.percentage', [
  mode({ // dilute by adding water
    d: 3,
    gen(tp) {
      const c1 = pick([10, 12, 15, 20, 25, 30, 40]); const c2 = pick([4, 5, 6, 8, 10, 12, 15, 20, 25]); if (c2 >= c1) return null
      const V = mult(10, ...(tp.r ?? [10, 200])); if (!V) return null
      const sol = (V * c1) / 100; const V2 = (sol * 100) / c2; if (!isInt(sol) || !isInt(V2)) return null
      const W = V2 - V
      return { v: { V, c1, c2 }, ans: W, wrong: [V2, (V * (c1 - c2)) / 100, (V * (c1 - c2)) / c2 / 2, W / 2], exp: `Salt/solute = ${c1}% of ${V} = ${fmtNum(sol)}, which must be ${c2}% of the new total ${fmtNum(V2)}; water to add = ${fmtNum(V2)} − ${V} = ${fmtNum(W)}.` }
    },
    T: [
      'A {V}-litre solution contains {c1}% salt. How much water must be added to bring the salt content down to {c2}%?§litres',
      { t: 'A {V} ml bottle of syrup is {c1}% sugar. How much water should be added to make it {c2}% sugar?§ml', r: [100, 1000] },
      'A farmer has {V} litres of pesticide mixture that is {c1}% chemical. How much water should he add so that the mixture is only {c2}% chemical?§litres',
    ],
  }),
  mode({ // strengthen by adding the pure component
    d: 3,
    gen(tp) {
      const c1 = pick([10, 20, 25, 30, 40, 50]); const c2 = pick([25, 40, 50, 60, 75, 80]); if (c2 <= c1) return null
      const V = mult(5, 10, 200); const x = (V * (c2 - c1)) / (100 - c2); if (!isInt(x) || x <= 0) return null
      return { v: { V, c1, c2 }, ans: x, wrong: [(V * (c2 - c1)) / 100, (V * (c2 - c1)) / c2, 2 * x, x + V / 10], exp: `Let x be added: (${c1}% of ${V} + x) = ${c2}% of (${V} + x) ⇒ ${fmtNum((V * c1) / 100)} + x = ${fmtNum((V * c2) / 100)} + ${c2 / 100}x ⇒ x = ${fmtNum(x)}.` }
    },
    T: [
      'A {V}-litre mixture of alcohol and water is {c1}% alcohol. How many litres of pure alcohol must be added to make it {c2}% alcohol?§litres',
      '{V} kg of an alloy contains {c1}% copper. How much pure copper must be melted in to raise the copper content to {c2}%?§kg',
    ],
  }),
  mode({ // evaporation
    d: 2,
    gen() {
      const c1 = pick([2, 3, 4, 5, 6, 8]); const c2 = pick([5, 6, 8, 10, 12, 15]); if (c2 <= c1) return null
      const V = mult(10, 20, 300); const V2 = (V * c1) / c2; if (!isInt(V2)) return null
      return { v: { V, c1, c2 }, ans: V - V2, wrong: [V2, (V * (c2 - c1)) / 100, (V * c1) / 100, (V - V2) / 2], exp: `Salt = ${c1}% of ${V} = ${fmtNum((V * c1) / 100)}; this is ${c2}% of the final ${fmtNum(V2)} litres, so ${fmtNum(V - V2)} litres must evaporate.` }
    },
    T: ['{V} litres of sea water contain {c1}% salt. How much water must evaporate for the salt content to become {c2}%?§litres'],
  }),
  mode({ // dry matter conserved
    d: 3,
    gen() {
      const c1 = pick([60, 70, 75, 80, 90]); const c2 = pick([10, 20, 25, 40, 50]); const V = mult(10, 20, 500)
      const W = (V * (100 - c1)) / (100 - c2); if (!isInt(W)) return null
      return { v: { V, c1, c2 }, ans: W, wrong: [V - (V * (c1 - c2)) / 100, (V * (100 - c1)) / 100, (V * c2) / c1, W * 2], exp: `Dry matter = ${100 - c1}% of ${V} = ${fmtNum((V * (100 - c1)) / 100)} kg, which is ${100 - c2}% of the dried weight: ${fmtNum((V * (100 - c1)) / 100)} × 100/${100 - c2} = ${fmtNum(W)} kg.` }
    },
    T: [
      'Fresh grapes contain {c1}% water by weight, and raisins made from them contain {c2}% water. How many kilograms of raisins can be made from {V} kg of fresh grapes?§kg',
      'Freshly cut wood is {c1}% water by weight; after drying in the sun it is {c2}% water. What does a log weighing {V} kg when cut weigh after drying?§kg',
    ],
  }),
  mode({ // mixing two solutions
    d: 2, u: 'pct',
    gen() {
      const V1 = pick([2, 3, 4, 5, 6, 10, 15, 20]); const V2 = pick([2, 3, 4, 5, 6, 10, 15, 20]); const c1 = pick([10, 20, 30, 40, 50]); const c2 = pick([5, 15, 25, 60, 70])
      const c = (V1 * c1 + V2 * c2) / (V1 + V2); if (!isInt(c) || V1 === V2) return null
      return { v: { V1, V2, c1, c2 }, ans: c, wrong: [(c1 + c2) / 2, c1 + c2, (V1 * c2 + V2 * c1) / (V1 + V2)], exp: `Sugar = ${fmtNum((V1 * c1) / 100)} + ${fmtNum((V2 * c2) / 100)} = ${fmtNum((V1 * c1 + V2 * c2) / 100)} litres in ${V1 + V2} litres, i.e. ${fmtNum(c)}%.` }
    },
    T: ['{V1} litres of a {c1}% sugar solution are mixed with {V2} litres of a {c2}% sugar solution. What is the percentage of sugar in the mixture?'],
  }),
])

// ---- Ratio and proportion ----------------------------------------------------
const coprimePair = (max = 9) => { for (;;) { const a = ri(1, max); const b = ri(1, max); if (a !== b && gcd(a, b) === 1) return [a, b] } }

fam('ga.ratio.divide-in-ratio', 'ga.ratio', [
  mode({ // two parts, larger term first; ask first (or second) share
    d: 1,
    gen(tp) {
      let [a, b] = coprimePair(9); if (a < b) [a, b] = [b, a]
      const [lo, hi] = range(tp, 100, 5000); const T = mult(a + b, lo, hi); if (!T) return null
      const k = T / (a + b); const first = a * k; const second = b * k; const ans = tp.ask === 'b' ? second : first
      return { v: { a, b, T }, ans, wrong: [ans === first ? second : first, T / 2, T / (a + b), T - k], exp: `Total parts = ${a} + ${b} = ${a + b}; one part = ${fmtNum(T)}/${a + b} = ${fmtNum(k)}; required share = ${tp.ask === 'b' ? b : a} × ${fmtNum(k)} = ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'Rs {T} is divided between {A} and {B} in the ratio {a}:{b}. What is {A}’s share?§rs', r: [1000, 50000] },
      { t: 'A college has {T} students, and the ratio of boys to girls is {a}:{b}. How many boys are there?', r: [300, 3000] },
      { t: 'A rope {T} cm long is cut into two pieces whose lengths are in the ratio {a}:{b}. How long is the longer piece?§cm', r: [60, 600] },
      { t: 'Cement and sand are mixed in the ratio {a}:{b} to make {T} kg of mortar. How much cement is used?§kg', r: [50, 1000] },
      { t: 'In a town of {T} voters, the ratio of men to women voters is {a}:{b}. How many voters are men?', r: [2000, 20000] },
      { t: 'A father leaves {T} kanals of land to his two sons in the ratio {a}:{b}. How much land does the son with the larger portion get?§kanals', r: [20, 200] },
      { t: 'A plot of {T} square feet is split between two heirs in the ratio {a}:{b}. What is the area of the larger part?§square feet', r: [900, 9000] },
      { t: 'A sum of Rs {T} is shared by {F1} and {F2} in the ratio {a}:{b}. How much does {F2} get?§rs', r: [1000, 50000], ask: 'b' },
      { t: 'The ratio of boys to girls in a school of {T} students is {a}:{b}. How many girls are there?', r: [300, 3000], ask: 'b' },
    ],
  }),
  mode({ // three parts
    d: 1,
    gen(tp) {
      const a = ri(1, 7); const b = ri(1, 7); const c = ri(1, 7); if (new Set([a, b, c]).size < 3 || gcd(gcd(a, b), c) !== 1) return null
      const [lo, hi] = range(tp, 100, 5000); const T = mult(a + b + c, lo, hi); if (!T) return null
      const k = T / (a + b + c); const sh = { a: a * k, b: b * k, c: c * k }; const ans = sh[tp.ask]
      return { v: { a, b, c, T }, ans, wrong: [...Object.values(sh).filter((x) => x !== ans), T / 3, k], exp: `Sum of terms = ${a + b + c}; one part = ${fmtNum(T)}/${a + b + c} = ${fmtNum(k)}; required share = ${fmtNum(ans / k)} × ${fmtNum(k)} = ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'Rs {T} is to be divided among {A}, {B} and {C} in the ratio {a}:{b}:{c}. What is {C}’s share?§rs', r: [1000, 60000], ask: 'c' },
      { t: 'A bag of {T} marbles holds red, blue and green marbles in the ratio {a}:{b}:{c}. How many blue marbles are there?', r: [60, 600], ask: 'b' },
      { t: 'The profit of Rs {T} from a shop is shared by three partners in the ratio {a}:{b}:{c}. How much does the first partner receive?§rs', r: [10000, 90000], ask: 'a' },
    ],
  }),
  mode({ // triangle angles
    d: 1, u: 'deg',
    gen() {
      const a = ri(1, 8); const b = ri(1, 8); const c = ri(1, 8); if (new Set([a, b, c]).size < 3 || 180 % (a + b + c)) return null
      const k = 180 / (a + b + c); const mx = Math.max(a, b, c) * k
      return { v: { a, b, c }, ans: mx, wrong: [Math.min(a, b, c) * k, 60, [a, b, c].sort((x, y) => x - y)[1] * k, 90], exp: `Angles add up to 180°; one part = 180/${a + b + c} = ${k}°; largest angle = ${Math.max(a, b, c)} × ${k} = ${mx}°.` }
    },
    T: ['The angles of a triangle are in the ratio {a}:{b}:{c}. What is the largest angle?'],
  }),
])

fam('ga.ratio.one-part-known', 'ga.ratio', [
  mode({ // other quantity
    d: 1,
    gen(tp) {
      const [a, b] = coprimePair(tp.max ?? 9); const [lo, hi] = range(tp, 1, 100); const k = ri(lo, hi); const x = a * k
      return { v: { a, b, x }, ans: b * k, wrong: [(a * x) / b, x + (b - a), (a + b) * k, x * b], exp: `${a} parts = ${fmtNum(x)}, so 1 part = ${fmtNum(k)} and ${b} parts = ${fmtNum(b * k)}.` }
    },
    T: [
      { t: 'The ratio of teachers to students in a school is {a}:{b}. If there are {x} teachers, how many students are there?', r: [2, 12], max: 1 },
      { t: 'Flour and sugar are used in the ratio {a}:{b} in a recipe. How much sugar goes with {x} g of flour?§g', r: [20, 100] },
      { t: 'The ratio of {A}’s income to {B}’s income is {a}:{b}. If {A} earns Rs {x}, how much does {B} earn?§rs', r: [2000, 9000] },
      { t: 'On a map, {a} cm represents {b} km. What actual distance is shown by {x} cm?§km', r: [2, 9] },
      { t: 'Red and white roses in a garden are in the ratio {a}:{b}. If there are {x} red roses, the number of white roses is:', r: [5, 40] },
    ],
  }),
  mode({ // total from difference
    d: 2,
    gen(tp) {
      let [a, b] = coprimePair(9); if (a < b) [a, b] = [b, a]; const [lo, hi] = range(tp, 2, 60); const k = ri(lo, hi); const dd = (a - b) * k
      return { v: { a, b, dd }, ans: (a + b) * k, wrong: [dd * (a + b), a * k, dd * a, (a + b) * k + dd], exp: `Difference = ${a - b} parts = ${fmtNum(dd)}, so 1 part = ${k}; total = ${a + b} parts = ${fmtNum((a + b) * k)}.` }
    },
    T: [
      { t: 'Boys and girls in a class are in the ratio {a}:{b}, and there are {dd} more boys than girls. How many students are in the class?', r: [2, 8] },
      'Two numbers are in the ratio {a}:{b} and their difference is {dd}. What is their sum?',
      { t: 'Two brothers’ savings are in the ratio {a}:{b}, and the elder has saved Rs {dd} more than the younger. What are their combined savings?§rs', r: [500, 5000] },
    ],
  }),
  mode({ // difference from total
    d: 2,
    gen(tp) {
      let [a, b] = coprimePair(9); if (a < b) [a, b] = [b, a]; const [lo, hi] = range(tp, 100, 3000); const T = mult(a + b, lo, hi); if (!T) return null
      const k = T / (a + b)
      return { v: { a, b, T }, ans: (a - b) * k, wrong: [a * k, b * k, T / (a - b), k], exp: `One part = ${fmtNum(T)}/${a + b} = ${fmtNum(k)}; difference = (${a} − ${b}) × ${fmtNum(k)} = ${fmtNum((a - b) * k)}.` }
    },
    T: [
      { t: 'In a group of {T} people, the ratio of adults to children is {a}:{b}. How many more adults than children are there?', r: [40, 400] },
      { t: 'Rs {T} is divided between two sisters in the ratio {a}:{b}. By how much does the larger share exceed the smaller?§rs', r: [1000, 30000] },
      { t: 'A school of {T} students has boys and girls in the ratio {a}:{b}. What is the difference between the number of boys and the number of girls?', r: [300, 2000] },
    ],
  }),
])

fam('ga.ratio.linked-shares', 'ga.ratio', [
  mode({ // A = B + k, C = m·B
    d: 2,
    gen(tp) {
      const m = pick([2, 3]); const t = ri(tp.lo ?? 10, tp.hi ?? 200); const k = ri(2, Math.max(3, Math.floor(t / 2))); const T = (m + 2) * t + k
      const sh = { A: t + k, B: t, C: m * t }; const ans = sh[tp.ask]
      return { v: { T, k, mw: TIMES[m] }, ans, wrong: [...Object.values(sh).filter((x) => x !== ans), Math.round(T / 3)], exp: `Let the middle share be x: (x + ${k}) + x + ${m}x = ${fmtNum(T)} ⇒ ${m + 2}x = ${fmtNum(T - k)} ⇒ x = ${fmtNum(t)}; the required share is ${fmtNum(ans)}.` }
    },
    T: [
      { t: '{A}, {B} and {C} share Rs {T}. {B} receives Rs {k} less than {A}, and {C} gets {mw} as much as {B}. How much does {C} get?§rs', ask: 'C' },
      { t: 'Three brothers divide Rs {T}. The eldest gets Rs {k} more than the second, and the youngest gets {mw} as much as the second. What is the eldest brother’s share?§rs', ask: 'A', lo: 500, hi: 5000 },
      { t: 'A prize of Rs {T} is split among three winners. The second winner gets Rs {k} less than the first, and the third gets {mw} the amount of the second. What does the second winner get?§rs', ask: 'B', lo: 1000, hi: 9000 },
      { t: '{T} books are given to three schools. School P gets {k} books more than school Q, and school R gets {mw} as many as Q. How many books does R get?', ask: 'C' },
    ],
  }),
  mode({ // A = p·B, B = q·C
    d: 2,
    gen(tp) {
      const p = pick([2, 3, 4]); const q = pick([2, 3]); const t = ri(tp.lo ?? 10, tp.hi ?? 300); const T = (p * q + q + 1) * t
      const sh = { A: p * q * t, B: q * t, C: t }; const ans = sh[tp.ask]
      return { v: { T, pw: TIMES[p], qw: TIMES[q] }, ans, wrong: [...Object.values(sh).filter((x) => x !== ans), Math.round(T / 3)], exp: `Shares are in the ratio ${p * q}:${q}:1 (total ${p * q + q + 1} parts); one part = ${fmtNum(t)}, so the required share is ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'Rs {T} is divided among {A}, {B} and {C} so that {A} gets {pw} as much as {B} and {B} gets {qw} as much as {C}. What is {A}’s share?§rs', ask: 'A', lo: 100, hi: 3000 },
      { t: 'Three tanks hold {T} litres in all. The first holds {pw} as much as the second, which holds {qw} as much as the third. How much does the third tank hold?§litres', ask: 'C' },
      { t: 'A man divides Rs {T} among his wife, son and daughter. The wife gets {pw} the son’s share and the son gets {qw} the daughter’s share. What is the son’s share?§rs', ask: 'B', lo: 1000, hi: 9000 },
      { t: 'In a basket of {T} fruits, apples are {pw} as many as oranges, and oranges are {qw} as many as bananas. How many bananas are there?', ask: 'C', lo: 3, hi: 20 },
    ],
  }),
  mode({ // A = B + k, B = C + j
    d: 2,
    gen(tp) {
      const t = ri(tp.lo ?? 20, tp.hi ?? 500); const j = ri(2, 60); const k = ri(2, 60); const T = 3 * t + 2 * j + k
      const sh = { A: t + j + k, B: t + j, C: t }; const ans = sh[tp.ask]
      return { v: { T, j, k }, ans, wrong: [...Object.values(sh).filter((x) => x !== ans), Math.round(T / 3)], exp: `Let the smallest be x: x + (x + ${j}) + (x + ${j} + ${k}) = ${fmtNum(T)} ⇒ 3x = ${fmtNum(3 * t)} ⇒ x = ${fmtNum(t)}; the required value is ${fmtNum(ans)}.` }
    },
    T: [
      { t: '{A}, {B} and {C} together have Rs {T}. {A} has Rs {k} more than {B}, and {B} has Rs {j} more than {C}. How much does {C} have?§rs', ask: 'C' },
      { t: 'Three stretches of a road total {T} km. The first is {k} km longer than the second, and the second is {j} km longer than the third. How long is the first stretch?§km', ask: 'A', lo: 5, hi: 60 },
    ],
  }),
  mode({ // A:B and B:C given, divide total
    d: 3,
    gen(tp) {
      const [a, b] = coprimePair(6); const [c, d] = coprimePair(6); if (b === c) return null
      let x = a * c; let y = b * c; let z = b * d; const g = gcd(gcd(x, y), z); x /= g; y /= g; z /= g
      const k = ri(10, 400); const T = (x + y + z) * k; const sh = { A: x * k, B: y * k, C: z * k }; const ans = sh[tp.ask]
      return { v: { a, b, c, d, T }, ans, wrong: [...Object.values(sh).filter((w) => w !== ans), (T * (tp.ask === 'C' ? d : a)) / (a + b + c + d)], exp: `A:B:C = ${a * c}:${b * c}:${b * d} = ${x}:${y}:${z}; one part = ${fmtNum(T)}/${x + y + z} = ${fmtNum(k)}, so the share is ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'Rs {T} is divided among {A}, {B} and {C} such that {A}:{B} = {a}:{b} and {B}:{C} = {c}:{d}. What is {C}’s share?§rs', ask: 'C' },
      { t: 'A fund of Rs {T} is shared by three villages. The shares of the first and second are in the ratio {a}:{b}, and those of the second and third in the ratio {c}:{d}. What does the first village get?§rs', ask: 'A' },
    ],
  }),
])

fam('ga.ratio.mixture-change', 'ga.ratio', [
  mode({ // how much of component 2 to add
    d: 2,
    gen(tp) {
      const [a, b] = coprimePair(9); const [c, d] = coprimePair(9); const addFirst = tp.add === 1
      if (addFirst ? c * b <= a * d : c * b >= a * d) return null
      const k = ri(1, 12); const M = (a + b) * k
      let added
      if (addFirst) { const n1 = (b * k * c) / d; if (!isInt(n1)) return null; added = n1 - a * k } else { const n2 = (a * k * d) / c; if (!isInt(n2)) return null; added = n2 - b * k }
      if (added <= 0 || added > 5 * M) return null
      const scale = tp.scale ?? 1
      return { v: { M: M * scale, a, b, c, d }, ans: added * scale, wrong: [(addFirst ? (b * k * c) / d : (a * k * d) / c) * scale, M * scale * (Math.abs(c - a) + 1) / (a + b), Math.abs(d - b) * k * scale, (added + k) * scale], exp: `First component = ${fmtNum(a * k * scale)}, second = ${fmtNum(b * k * scale)}. Keeping the unchanged part fixed at ${addFirst ? d : c} parts of the new ratio ${c}:${d}, the other must become ${fmtNum((addFirst ? (b * k * c) / d : (a * k * d) / c) * scale)}, so add ${fmtNum(added * scale)}.` }
    },
    T: [
      'A {M}-litre mixture contains milk and water in the ratio {a}:{b}. How much water must be added to make the ratio {c}:{d}?§litres',
      { t: 'A solution of {M} litres has alcohol and water in the ratio {a}:{b}. How many litres of alcohol must be added so that the ratio becomes {c}:{d}?§litres', add: 1 },
      'An alloy of {M} kg contains copper and zinc in the ratio {a}:{b}. How much zinc should be melted in to change the ratio to {c}:{d}?§kg',
      { t: 'A jug holds {M} ml of a drink made of mango pulp and water in the ratio {a}:{b}. How much mango pulp must be added to make the ratio {c}:{d}?§ml', add: 1, scale: 50 },
      'In {M} kg of cattle feed, maize and bran are in the ratio {a}:{b}. How much bran must be added to make the ratio {c}:{d}?§kg',
    ],
  }),
  mode({ // original amount from ratio before/after adding x of component 2
    d: 3,
    gen(tp) {
      const [a, b] = coprimePair(12); const [c, d] = coprimePair(9); if (c * b >= a * d) return null
      const den = a * d - b * c; const k = ri(1, 10); const x = (c * k) === 0 ? 0 : (k * den) / c; if (!isInt(x) || x <= 0 || x > 200) return null
      const first = a * k; const total = (a + b) * k; const ans = tp.ask === 'total' ? total : first
      return { v: { a, b, c, d, x }, ans, wrong: [tp.ask === 'total' ? first : total, b * k, first + x, (x * a) / (a + b) > 0 && isInt((x * c) / (d - c > 0 ? d - c : 1)) ? (x * c) / Math.max(1, d - c) : k * c], exp: `Let the quantities be ${a}k and ${b}k: ${a}k/(${b}k + ${x}) = ${c}/${d} ⇒ ${a * d}k = ${b * c}k + ${c * x} ⇒ k = ${k}; so the ${tp.ask === 'total' ? 'total was' : 'first quantity is'} ${fmtNum(ans)}.` }
    },
    T: [
      'A mixture contains alcohol and water in the ratio {a}:{b}. When {x} litres of water are added, the ratio becomes {c}:{d}. How much alcohol does the mixture contain?§litres',
      { t: 'Milk and water in a can are in the ratio {a}:{b}. Adding {x} litres of water changes the ratio to {c}:{d}. What was the total quantity of liquid in the can at first?§litres', ask: 'total' },
      'A bag of mixed pulses has lentils and chickpeas in the ratio {a}:{b}. After {x} kg of chickpeas are added, the ratio is {c}:{d}. How many kilograms of lentils are in the bag?§kg',
      'The ratio of boys to girls in a class is {a}:{b}. When {x} more girls join, the ratio becomes {c}:{d}. How many boys are in the class?',
      'A club has men and women members in the ratio {a}:{b}. After {x} women join, the ratio changes to {c}:{d}. How many men are members?',
      'Wheat and rice stocks in a godown are in the ratio {a}:{b}. After {x} tonnes of rice arrive, the ratio is {c}:{d}. How many tonnes of wheat are in the godown?§tonnes',
    ],
  }),
])

fam('ga.ratio.same-number-both-terms', 'ga.ratio', [
  mode({
    d: 2,
    gen(tp) {
      const sub = tp.op === 'sub'; const [lo, hi] = range(tp, 2, 60)
      const a = ri(lo, hi); const b = ri(lo, hi); if (a >= b) return null
      const x = ri(1, sub ? a - 1 : 40); const p = sub ? a - x : a + x; const q = sub ? b - x : b + x
      const g = gcd(p, q); const c = p / g; const d = q / g; if (g < 2 || d > 15 || c * b === a * d) return null
      return { v: { a, b, c, d }, ans: x, wrong: [Math.abs(c - a), Math.abs(d - b), b - a, 2 * x], exp: `(${a} ${sub ? '−' : '+'} x)/(${b} ${sub ? '−' : '+'} x) = ${c}/${d} ⇒ ${d}(${a} ${sub ? '−' : '+'} x) = ${c}(${b} ${sub ? '−' : '+'} x) ⇒ x = ${x}.` }
    },
    T: [
      'What number must be added to each term of the ratio {a}:{b} to make it {c}:{d}?',
      'Which number, when added to both {a} and {b}, gives two numbers in the ratio {c}:{d}?',
      'A club has {a} boys and {b} girls. If the same number of boys and girls join, the ratio of boys to girls becomes {c}:{d}. How many of each join?',
      { t: 'What number must be subtracted from each of {a} and {b} so that the remainders are in the ratio {c}:{d}?', op: 'sub' },
      { t: 'What should be added to both the numerator and the denominator of {a}/{b} to make it equal to {c}/{d}?' },
      { t: 'Two tanks contain {a} and {b} litres of water. If the same amount is poured into each, their contents will be in the ratio {c}:{d}. How much must be poured into each?§litres', r: [10, 200] },
      { t: 'Two shelves hold {a} and {b} books. After the same number of books is taken off each shelf, the ratio becomes {c}:{d}. How many books were taken off each shelf?', op: 'sub' },
      { t: 'A number subtracted from both the numerator and the denominator of {a}/{b} turns it into {c}/{d}. Find the number.', op: 'sub' },
      'Two classes have {a} and {b} students. If an equal number of new students join each class, the ratio of their strengths becomes {c}:{d}. How many join each class?',
    ],
  }),
])

const ratioLabel = (arr) => { const g = arr.reduce((x, y) => gcd(x, y)); return arr.map((x) => x / g).join(':') }
fam('ga.ratio.compound-chain', 'ga.ratio', [
  mode({ // A:C
    d: 2,
    gen() {
      const [a, b] = coprimePair(9); const [c, d] = coprimePair(9); if (b === c) return null
      const ans = ratioLabel([a * c, b * d])
      const opts = [ans, ratioLabel([a, d]), ratioLabel([a * d, b * c]), ratioLabel([b * d, a * c]), ratioLabel([a + c, b + d])].map((l) => ({ label: l, val: l }))
      return { v: { a, b, c, d }, opts, exp: `A/C = (A/B) × (B/C) = ${a}/${b} × ${c}/${d} = ${a * c}/${b * d}, i.e. ${ans}.` }
    },
    T: [
      'If A:B = {a}:{b} and B:C = {c}:{d}, then A:C is:',
      'The ratio of {A}’s salary to {B}’s is {a}:{b}, and of {B}’s to {C}’s is {c}:{d}. What is the ratio of {A}’s salary to {C}’s?',
      'In a zoo, lions and tigers are in the ratio {a}:{b}, and tigers and leopards in the ratio {c}:{d}. What is the ratio of lions to leopards?',
      'The speeds of a car and a bus are in the ratio {a}:{b}, and the speeds of the bus and a truck are in the ratio {c}:{d}. Find the ratio of the car’s speed to the truck’s.',
    ],
  }),
  mode({ // A:B:C
    d: 2,
    gen() {
      const [a, b] = coprimePair(7); const [c, d] = coprimePair(7); if (b === c) return null
      const ans = ratioLabel([a * c, b * c, b * d])
      const opts = [ans, ratioLabel([a, b * c, d]), ratioLabel([a * c, b * d, b * c]), ratioLabel([a * d, b * d, b * c]), ratioLabel([a, b + c, d])].map((l) => ({ label: l, val: l }))
      return { v: { a, b, c, d }, opts, exp: `Make the B terms equal: A:B = ${a * c}:${b * c} and B:C = ${b * c}:${b * d}, so A:B:C = ${ans}.` }
    },
    T: [
      'If P:Q = {a}:{b} and Q:R = {c}:{d}, then P:Q:R is:',
      'Three partners invest so that the contributions of the first and second are in the ratio {a}:{b}, and of the second and third in the ratio {c}:{d}. In what ratio do the three contribute?',
      'The marks of {A} and {B} are in the ratio {a}:{b}, while those of {B} and {C} are in the ratio {c}:{d}. The ratio of the marks of {A}, {B} and {C} is:',
      'On a farm, the areas under wheat and rice are in the ratio {a}:{b}, and the areas under rice and maize in the ratio {c}:{d}. What is the ratio of the three areas?',
    ],
  }),
  mode({ // given first, find third
    d: 2,
    gen(tp) {
      const [a, b] = coprimePair(9); const [c, d] = coprimePair(9); if (b === c) return null
      const g = gcd(a * c, b * d); const P = (a * c) / g; const Q = (b * d) / g; const k = ri(tp.lo ?? 2, tp.hi ?? 40); const xa = P * k
      return { v: { a, b, c, d, xa }, ans: Q * k, wrong: [(xa * d) / a, (xa * b) / a, (xa * c) / d, (xa * a) / d], exp: `A:C = ${a}×${c} : ${b}×${d} = ${P}:${Q}; with A = ${fmtNum(xa)}, C = ${fmtNum(xa)} × ${Q}/${P} = ${fmtNum(Q * k)}.` }
    },
    T: [
      'The ratio of apples to oranges in a crate is {a}:{b}, and of oranges to pears {c}:{d}. If there are {xa} apples, how many pears are there?',
      { t: 'The salaries of an officer and a clerk are in the ratio {a}:{b}; those of the clerk and a driver are in the ratio {c}:{d}. If the officer earns Rs {xa}, what does the driver earn?§rs', lo: 500, hi: 3000 },
      'If x:y = {a}:{b}, y:z = {c}:{d} and x = {xa}, what is z?',
      { t: 'The population of a first village to a second is {a}:{b}, and of the second to a third is {c}:{d}. If the first village has {xa} people, how many live in the third?', lo: 50, hi: 400 },
    ],
  }),
])

fam('ga.ratio.proportionals', 'ga.ratio', [
  mode({ // fourth proportional
    d: 1,
    gen() {
      const a = ri(2, 15); const b = ri(2, 30); const c = ri(2, 30); const x = (b * c) / a; if (!isInt(x) || a === b || b === c) return null
      return { v: { a, b, c }, ans: x, wrong: [(a * c) / b, (a * b) / c, b + c - a, (a * x) / c + 1], exp: `${a}:${b} = ${c}:x ⇒ ${a}x = ${b} × ${c} ⇒ x = ${x}.` }
    },
    T: ['Find the fourth proportional to {a}, {b} and {c}.', 'If {a}:{b} = {c}:x, what is x?', '{a} is to {b} as {c} is to what number?'],
  }),
  mode({ // third proportional
    d: 1,
    gen() {
      const a = ri(2, 20); const b = ri(3, 30); const x = (b * b) / a; if (!isInt(x) || a >= b || x > 400) return null
      return { v: { a, b }, ans: x, wrong: [a * b, 2 * b - a, (a * a) / b, b + (b - a) * 2], exp: `${a}:${b} = ${b}:x ⇒ x = ${b}²/${a} = ${x}.` }
    },
    T: ['What is the third proportional to {a} and {b}?', 'Find the number x such that {a}, {b} and x are in continued proportion.'],
  }),
  mode({ // mean proportional
    d: 2,
    gen() {
      const m = ri(1, 6); const s = ri(1, 6); const t = ri(2, 9); if (s >= t) return null
      const a = m * s * s; const b = m * t * t; const x = m * s * t
      return { v: { a, b }, ans: x, wrong: [(a + b) / 2, a * b, b - a, x + m], exp: `Mean proportional = √(${a} × ${b}) = √${a * b} = ${x}.` }
    },
    T: ['What is the mean proportional between {a} and {b}?', 'Find the positive number x such that {a}:x = x:{b}.', 'If {a}, x and {b} are in continued proportion, the positive value of x is:'],
  }),
])

fam('ga.ratio.unitary-direct', 'ga.ratio', [
  mode({ // cost of q2 from q1
    d: 1,
    gen(tp) {
      const q1 = ri(tp.q ? tp.q[0] : 2, tp.q ? tp.q[1] : 12); let q2 = ri(tp.q ? tp.q[0] : 2, tp.q ? tp.q[1] * 2 : 25); if (q1 === q2) return null
      const u = ri(...(tp.u ?? [5, 120])); const c1 = q1 * u
      return { v: { q1, q2, c1 }, ans: q2 * u, wrong: [(q1 * c1) / q2, c1 + (q2 - q1), c1 * q2, u * (q2 + 1)], exp: `One unit = ${fmtNum(c1)}/${q1} = ${fmtNum(u)}; for ${q2}: ${q2} × ${fmtNum(u)} = ${fmtNum(q2 * u)}.` }
    },
    T: [
      'If {q1} pens cost Rs {c1}, what is the cost of {q2} pens?§rs',
      { t: 'A car uses {q1} litres of petrol to travel {c1} km. How far can it go on {q2} litres?§km', u: [10, 18] },
      { t: 'A printer prints {c1} pages in {q1} minutes. How many pages does it print in {q2} minutes?§pages', u: [10, 40] },
      { t: 'A tailor needs {c1} metres of cloth for {q1} suits. How much cloth is needed for {q2} suits?§m', u: [3, 5] },
      { t: 'A labourer earns Rs {c1} for {q1} days of work. What will he earn for {q2} days?§rs', u: [800, 1500] },
      { t: 'A mason lays {c1} bricks in {q1} hours. How many bricks will he lay in {q2} hours?§bricks', u: [50, 120], q: [2, 8] },
    ],
  }),
  mode({ // quantity for given amount
    d: 1,
    gen(tp) {
      const q1 = ri(2, 10); const q2 = ri(2, 30); if (q1 === q2) return null
      const u = ri(...(tp.u ?? [20, 300])); const c1 = q1 * u; const c2 = q2 * u
      return { v: { q1, c1, c2 }, ans: q2, wrong: [(c2 * c1) / (q1 * 1000) > 1 ? null : null, (c2 * c1) / q1 / u / q1, q2 + q1, Math.round(c2 / c1)], exp: `Rate = ${fmtNum(c1)}/${q1} = ${fmtNum(u)} per unit; ${fmtNum(c2)}/${fmtNum(u)} = ${q2}.` }
    },
    T: [
      { t: '{q1} kg of rice cost Rs {c1}. How much rice can be bought for Rs {c2}?§kg', u: [200, 400] },
      { t: 'A machine fills {c1} bottles in {q1} minutes. How long will it take to fill {c2} bottles?§minutes', u: [20, 60] },
      { t: 'A worker paints {c1} square metres of wall in {q1} hours. How many hours will he take to paint {c2} square metres?§hours', u: [6, 15] },
    ],
  }),
  mode({ // two variables
    d: 2,
    gen(tp) {
      const m1 = ri(2, 12); const m2 = ri(2, 20); const dd = ri(2, 10); if (m1 === m2) return null
      const u = ri(...(tp.u ?? [2, 12])); const s1 = m1 * u
      return { v: { m1, m2, s1, dd }, ans: u * m2 * dd, wrong: [u * m2, s1 * dd, s1 * m2 * dd, u * (m2 + dd)], exp: `Per head per day = ${fmtNum(s1)}/${m1} = ${fmtNum(u)}; ${m2} × ${dd} × ${fmtNum(u)} = ${fmtNum(u * m2 * dd)}.` }
    },
    T: [
      'If {m1} tailors stitch {s1} shirts in a day, how many shirts will {m2} tailors stitch in {dd} days?',
      { t: '{m1} cows eat {s1} kg of fodder in a day. How much fodder will {m2} cows eat in {dd} days?§kg', u: [8, 15] },
      { t: 'Feeding {m1} guests at a wedding costs Rs {s1} a day. At the same rate, what does it cost to feed {m2} guests for {dd} days?§rs', u: [500, 1200] },
    ],
  }),
])

fam('ga.ratio.inverse-proportion', 'ga.ratio', [
  mode({ // product constant
    d: 2,
    gen(tp) {
      const [lo, hi] = tp.n ?? [10, 200]; const n1 = ri(lo, hi); const d1 = ri(...(tp.dr ?? [5, 60])); const n2 = ri(lo, hi); const ans = (n1 * d1) / n2
      if (n1 === n2 || !isInt(ans)) return null
      return { v: { n1, d1, n2 }, ans, wrong: [(n2 * d1) / n1, d1 + n1 - n2, d1 + n2 - n1, Math.round((d1 * n1) / (n1 + n2))], exp: `The product stays constant: ${n1} × ${d1} = ${n2} × x ⇒ x = ${fmtNum(ans)}.` }
    },
    T: [
      'A hostel has food for {n1} students for {d1} days. How long will the food last for {n2} students?§days',
      'A stock of fodder lasts {n1} cattle for {d1} days. For how many days will it feed {n2} cattle?§days',
      { t: 'Travelling at {n1} km/h, a bus covers a route in {d1} hours. How long will it take at {n2} km/h?§hours', n: [30, 90], dr: [2, 12] },
      { t: 'A relief camp has rations for {n1} people for {d1} days. How many people can be fed for {n2} days with the same rations?', n: [5, 60], dr: [50, 800] },
      'A sum of money is enough to pay {n1} workers for {d1} days. For how many days would it pay {n2} workers?§days',
    ],
  }),
  mode({ // people join or leave after t days
    d: 3,
    gen(tp) {
      const n = mult(10, 50, 1000); const D = ri(20, 90); const t = ri(3, D - 5); const k = mult(10, 10, n / 2); if (!k) return null
      const m = tp.leave ? n - k : n + k; const ans = (n * (D - t)) / m; if (!isInt(ans)) return null
      return { v: { n1: n, D, t, k }, ans, wrong: [(n * D) / m, D - t, (n * (D - t)) / (tp.leave ? n + k : n - k), ans + t], exp: `Food left = ${n} × ${D - t} man-days; shared by ${m} people it lasts ${n * (D - t)}/${m} = ${fmtNum(ans)} days.` }
    },
    T: [
      'A camp had food for {n1} men for {D} days. After {t} days, {k} more men arrived. How long will the remaining food last?§days',
      { t: 'Provisions in a fort last {n1} soldiers for {D} days. After {t} days, {k} soldiers are transferred elsewhere. For how many more days will the food now last?§days', leave: true },
      'A school stores rice to feed {n1} boarders for {D} days. After {t} days, {k} new boarders are admitted. For how many more days will the rice last?§days',
    ],
  }),
  mode({ // cows: fewer by k lasts e days more
    d: 3,
    gen() {
      const e = pick([5, 10, 15, 20, 25, 30]); const k = pick([4, 5, 6, 8, 10, 12, 15, 20]); const D = mult(5, 20, 200); const N = (k * (D + e)) / e
      if (!isInt(N) || N <= k || N > 500) return null
      return { v: { D, k, e }, ans: N, wrong: [(k * D) / e, N - k, (k * (D - e)) / e, N + k], exp: `N × ${D} = (N − ${k})(${D} + ${e}) ⇒ ${e}N = ${k} × ${D + e} ⇒ N = ${N}.` }
    },
    T: [
      'The fodder on a farm lasts its cows {D} days. If there were {k} fewer cows, it would last {e} days longer. How many cows are on the farm?',
      'A store of food can feed a group of workers for {D} days. If {k} workers left, it would last {e} days more. How many workers are there?',
      'A stock of grain feeds some horses for {D} days. With {k} fewer horses the same grain would last {e} days more. How many horses are there?',
    ],
  }),
])

fam('ga.ratio.value-in-ratio', 'ga.ratio', [
  mode({
    d: 2,
    gen(tp) {
      const den = tp.den; const n = den.length; const parts = Array.from({ length: n }, () => ri(1, 6))
      if (new Set(parts).size < n || parts.reduce((x, y) => gcd(x, y)) !== 1) return null
      const perK = parts.reduce((s, p, i) => s + p * den[i], 0); const k = ri(2, tp.kmax ?? 30); const V = perK * k
      const counts = parts.map((p) => p * k); const ans = tp.ask === 'all' ? counts.reduce((x, y) => x + y) : counts[tp.ask]
      const v = { V }; parts.forEach((p, i) => { v['abc'[i]] = p })
      return { v, ans, wrong: [...counts.filter((c) => c !== ans), Math.round(V / den.reduce((x, y) => x + y)), k, tp.ask === 'all' ? null : counts.reduce((x, y) => x + y)], exp: `Value of one set (${parts.join(':')}) = ${parts.map((p, i) => `${p}×${fmtNum(den[i])}`).join(' + ')} = Rs ${fmtNum(perK)}; ${fmtNum(V)}/${fmtNum(perK)} = ${k} sets, so the answer is ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'A bag contains Rs 1, Rs 2 and Rs 5 coins in the ratio {a}:{b}:{c}. If the coins are worth Rs {V} in all, how many Rs 5 coins are there?', den: [1, 2, 5], ask: 2 },
      { t: 'A cash box has Rs 10, Rs 20 and Rs 50 notes in the ratio {a}:{b}:{c}, worth Rs {V} altogether. How many Rs 20 notes are in it?', den: [10, 20, 50], ask: 1 },
      { t: 'Tickets for a show cost Rs 100 for children and Rs 300 for adults. Children and adults in the audience were in the ratio {a}:{b}, and ticket sales came to Rs {V}. How many adults attended?', den: [100, 300], ask: 1 },
      { t: 'A piggy bank holds Rs 2 and Rs 5 coins in the ratio {a}:{b}, worth Rs {V}. How many coins are there altogether?', den: [2, 5], ask: 'all' },
      { t: 'A stationer sold pens at Rs 20 each and pencils at Rs 10 each in the ratio {a}:{b} by number, collecting Rs {V}. How many pencils were sold?', den: [20, 10], ask: 1 },
      { t: 'Postage stamps of Rs 5 and Rs 8 are bought in the ratio {a}:{b} for a total of Rs {V}. How many Rs 8 stamps are bought?', den: [5, 8], ask: 1 },
      { t: 'Mangoes at Rs 40 each and apples at Rs 25 each are bought in the ratio {a}:{b} for Rs {V}. How many mangoes are bought?', den: [40, 25], ask: 0 },
      { t: 'Labourers paid Rs 800 a day and supervisors paid Rs 1,500 a day are hired in the ratio {a}:{b}. The daily wage bill is Rs {V}. How many supervisors are hired?', den: [800, 1500], ask: 1, kmax: 8 },
      { t: 'A charity box contains Rs 1, Rs 5 and Rs 10 coins in the ratio {a}:{b}:{c}, worth Rs {V}. How many Rs 10 coins does it contain?', den: [1, 5, 10], ask: 2 },
      { t: 'Bus fares of Rs 30 for students and Rs 60 for other passengers were collected, with students and others in the ratio {a}:{b}. The fares amounted to Rs {V}. How many students travelled?', den: [30, 60], ask: 0 },
    ],
  }),
])

fam('ga.ratio.income-expenditure', 'ga.ratio', [
  mode({
    d: 3, u: 'rs',
    gen(tp) {
      const a = ri(2, 9); const b = ri(2, 9); const c = ri(2, 9); const d = ri(2, 9)
      if (a === b || c === d || gcd(a, b) !== 1 || gcd(c, d) !== 1 || (a - b) * (c - d) <= 0 || a * d === b * c) return null
      const k0 = pick([500, 1000, 2000, 2500, 5000]); const kk = ri(1, 6) * k0; const m = (kk * (a - b)) / (c - d); if (!isInt(m)) return null
      const S = a * kk - c * m; if (S <= 0 || S < a * kk * 0.08) return null
      const vals = { i1: a * kk, i2: b * kk, e1: c * m, e2: d * m }; const ans = vals[tp.ask]
      return { v: { a, b, c, d, S }, ans, wrong: [...Object.values(vals).filter((x) => x !== ans), ans + S], exp: `Incomes ${a}x, ${b}x; expenses ${c}y, ${d}y. ${a}x − ${c}y = ${b}x − ${d}y = ${fmtNum(S)} gives x = ${fmtNum(kk)}, y = ${fmtNum(m)}, so the required amount is Rs ${fmtNum(ans)}.` }
    },
    T: [
      { t: 'The incomes of {A} and {B} are in the ratio {a}:{b} and their expenses in the ratio {c}:{d}. If each saves Rs {S} a month, what is {A}’s income?', ask: 'i1' },
      { t: 'Two brothers earn in the ratio {a}:{b} and spend in the ratio {c}:{d}. Each saves Rs {S}. What is the first brother’s income?', ask: 'i1' },
      { t: 'The monthly incomes of two families are in the ratio {a}:{b}, and their expenditures in the ratio {c}:{d}. Each family saves Rs {S}. What is the second family’s expenditure?', ask: 'e2' },
      { t: 'The salaries of two clerks are in the ratio {a}:{b}. Their spending is in the ratio {c}:{d}, and each saves Rs {S}. How much does the first clerk spend?', ask: 'e1' },
      { t: 'Two shops earn revenues in the ratio {a}:{b} and have costs in the ratio {c}:{d}. Each makes a profit of Rs {S}. What is the revenue of the second shop?', ask: 'i2' },
      { t: 'The monthly pay of a husband and wife is in the ratio {a}:{b}, and their spending in the ratio {c}:{d}. If each of them saves Rs {S}, what is the wife’s pay?', ask: 'i2' },
    ],
  }),
])

// ==== END FAMILIES ====

// ---------------------------------------------------------------------------
// Engine
function normT(x) {
  const o = typeof x === 'string' ? { t: x } : { ...x }
  const i = o.t.indexOf('§')
  if (i >= 0) { o.u = o.t.slice(i + 1).trim(); o.t = o.t.slice(0, i).trimEnd() }
  return o
}

function render(t, v) {
  return t.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in v) || v[k] === undefined || v[k] === null) throw new Error(`missing placeholder ${k} in: ${t}`)
    return fmtNum(v[k])
  })
}

function cleanLike(w, ans) {
  const da = decimals(ans); const dw = decimals(w)
  if (da === 0) return dw === 0 || (Math.abs(ans) < 100 && dw === 1 && isInt(w * 2))
  return dw <= Math.max(da, 1) && dw <= 3
}

function numericOptions(r, fmt) {
  const out = [{ label: fmt(r.ans), val: r.ans }]
  const seenC = new Set([canonical(out[0].label)])
  const add = (w) => {
    if (out.length >= 4 || w === null || w === undefined || !Number.isFinite(w)) return
    w = r9(w)
    if (!r.allowNeg && w <= 0) return
    if (out.some((o) => near(o.val, w))) return
    if (!cleanLike(w, r.ans)) return
    const label = fmt(w); const c = canonical(label)
    if (seenC.has(c)) return
    seenC.add(c); out.push({ label, val: w })
  }
  r.wrong.forEach(add)
  if (out.length < 4) {
    const a = Math.abs(r.ans)
    let step = r.step ?? (a >= 10 ? Math.pow(10, Math.floor(Math.log10(a)) - 1) * (a >= 50 ? 5 : 2) : isInt(a) ? 1 : 0.5)
    if (step <= 0) step = 1
    const cands = [1, -1, 2, -2, 3, -3, 4, 5, -4, 6].map((k) => r.ans + k * step)
    shuffle(cands).forEach(add)
  }
  return out.length === 4 ? out : null
}

function listOptions(r) {
  const out = []
  const seenC = new Set(); const seenV = []
  for (const o of r.opts) {
    if (out.length >= 4) break
    const c = canonical(o.label)
    if (!c || seenC.has(c)) continue
    if (o.val !== undefined && seenV.some((v) => (typeof v === 'number' && typeof o.val === 'number' ? near(v, o.val) : v === o.val))) continue
    seenC.add(c); if (o.val !== undefined) seenV.push(o.val); out.push(o)
  }
  return out.length === 4 ? out : null
}

function build() {
  const items = []
  const templatesSeen = new Map()
  for (const F of FAMILIES) {
    for (const M of F.modes) {
      for (const raw of M.T) {
        const tp = normT(raw)
        const tKey = surfaceTemplate(tp.t.replace(/\{\w+\}/g, '9'))
        if (templatesSeen.has(tKey)) throw new Error(`template reused: ${tp.t}`)
        templatesSeen.set(tKey, F.family)
        let made = null
        for (let attempt = 0; attempt < 3000 && !made; attempt += 1) {
          const nm = names()
          const r = M.gen(tp, nm)
          if (!r) continue
          const u = tp.u ?? r.u ?? M.u ?? 'num'
          const opts = r.opts ? listOptions(r) : numericOptions(r, unitFmt(u))
          if (!opts) continue
          const v = { ...nm, ...r.v }
          const q = render(tp.t, v)
          if (q.length > 420) continue
          const exp = typeof r.exp === 'function' ? r.exp(v) : r.exp
          const order = shuffle([0, 1, 2, 3])
          made = {
            family: F.family, subtopic: F.subtopic, difficulty: tp.d ?? r.d ?? M.d, q,
            o: order.map((i) => opts[i].label), a: order.indexOf(0), explanation: exp, template: tp.t,
          }
        }
        if (!made) throw new Error(`could not generate: ${tp.t}`)
        items.push(made)
      }
    }
  }
  return items
}

const SUBTOPIC_ORDER = ['ga.percentage', 'ga.ratio', 'ga.average', 'ga.profit-loss', 'ga.speed-time', 'ga.work-time', 'ga.fractions']
const TARGETS = { 'ga.percentage': 130, 'ga.ratio': 130, 'ga.average': 110, 'ga.profit-loss': 110, 'ga.speed-time': 120, 'ga.work-time': 70, 'ga.fractions': 130 }

function main() {
  const raw = build()
  raw.sort((x, y) => SUBTOPIC_ORDER.indexOf(x.subtopic) - SUBTOPIC_ORDER.indexOf(y.subtopic))
  const rows = raw.map((it, i) => {
    const serial = String(i + 1).padStart(4, '0')
    return {
      id: `${ID_PREFIX}${serial}`,
      section: 'General Abilities',
      subject: 'Quantitative Ability',
      subtopic: it.subtopic,
      pattern_family: it.family,
      concept: `${it.family.replace(/\./g, '-')}-${serial}`,
      difficulty: it.difficulty,
      source_type: 'generated-verified',
      past_paper_year: null,
      verified: true,
      q: it.q,
      o: it.o,
      a: it.a,
      explanation: it.explanation,
      source_url: null,
      time_sensitive: false,
      event_date: null,
      last_verified: TODAY,
      quality_grade: 'A',
      mpt_relevance: 'core',
    }
  })

  // Self-checks
  const problems = []
  const masked = new Set(rows.map((r) => surfaceTemplate(r.q)))
  if (masked.size !== rows.length) problems.push(`masked templates ${masked.size} != items ${rows.length}`)
  for (const r of rows) {
    if (new Set(r.o.map(canonical)).size !== 4) problems.push(`${r.id}: options not distinct`)
    if (r.explanation.length < 12) problems.push(`${r.id}: short explanation`)
  }
  const byFam = {}; const bySub = {}
  for (const r of rows) {
    byFam[r.pattern_family] = (byFam[r.pattern_family] ?? 0) + 1
    const s = (bySub[r.subtopic] ??= { n: 0, 1: 0, 2: 0, 3: 0 }); s.n += 1; s[r.difficulty] += 1
  }
  const pos = [0, 0, 0, 0]; rows.forEach((r) => { pos[r.a] += 1 })
  const maxFam = Object.entries(byFam).sort((a, b) => b[1] - a[1])[0]

  if (process.argv.includes('--dump')) {
    const want = process.argv[process.argv.indexOf('--dump') + 1]
    for (const r of rows) {
      if (want && !r.pattern_family.startsWith(want)) continue
      console.log(`${r.id} [${r.pattern_family} d${r.difficulty}] ${r.q}\n   ${r.o.map((o, i) => (i === r.a ? `*${o}*` : o)).join(' | ')}\n   ${r.explanation}`)
    }
    return
  }
  if (process.argv.includes('--dry')) {
    console.log(JSON.stringify({ items: rows.length, masked: masked.size, families: Object.keys(byFam).length, maxFam, bySub, pos }, null, 1))
    if (problems.length) console.log(problems)
    return
  }
  if (problems.length) { console.error(problems.join('\n')); process.exit(1) }

  mkdirSync(OUT_DIR, { recursive: true })
  for (const name of readdirSync(OUT_DIR)) if (name.startsWith(FILE_PREFIX) && name.endsWith('.json')) unlinkSync(join(OUT_DIR, name))
  for (let i = 0; i * 100 < rows.length; i += 1) {
    const file = join(OUT_DIR, `${FILE_PREFIX}${String(i + 1).padStart(2, '0')}.json`)
    writeFileSync(file, `${JSON.stringify(rows.slice(i * 100, i * 100 + 100), null, 2)}\n`)
  }
  console.log(JSON.stringify({
    items: rows.length, maskedTemplates: masked.size, families: Object.keys(byFam).length,
    maxFamily: { family: maxFam[0], count: maxFam[1], share: `${((maxFam[1] / rows.length) * 100).toFixed(1)}%` },
    bySubtopic: Object.fromEntries(SUBTOPIC_ORDER.map((s) => [s, { ...bySub[s], target: TARGETS[s] }])), answerPositions: pos,
  }, null, 1))
}

main()
