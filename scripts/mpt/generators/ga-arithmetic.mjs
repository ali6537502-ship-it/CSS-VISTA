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
