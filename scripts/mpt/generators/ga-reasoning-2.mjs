// Generator: MPT release bank, General Abilities — reasoning part 2
// (direction sense, blood relations, ordering and ranking, seating, deduction, analytical puzzles).
//
//   node scripts/mpt/generators/ga-reasoning-2.mjs
//
// Writes src/data/mpt/bank/abilities/ga-d-01.json … (≤100 items per file), IDs mpt-ga-d-####.
//
// Deterministic (seeded PRNG). Every answer is computed, never typed:
//  * directions: exact coordinates (and, for "X is east of Y" chains without distances,
//    a symbolic sign analysis — the item is rejected unless both axis signs are forced);
//  * blood relations: an explicit family model (parent units, spouses, genders) built from the
//    statements under the usual exam conventions (full siblings; a child's two parents are
//    spouses); the relation is read off the model and items whose asked gender is unknown
//    are rejected;
//  * ordering / seating / analytical puzzles: exhaustive enumeration of every arrangement that
//    satisfies the clues; the asked quantity must be identical in all of them, no single clue may
//    give it away, and every distractor is a value the asked quantity never takes;
//  * syllogisms: Venn-region enumeration (every term non-empty) classifies each conclusion as
//    definitely true / definitely false / uncertain; comparative chains enumerate all value
//    assignments with ties; if-then chains use truth tables.
// Masked wording (digits, number words and names neutralised) never repeats within the file set.
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { canonical } from '../bank-lib.mjs'
import { loadServedArchive, stemHash } from '../served-archive.mjs'

const OUT_DIR = 'src/data/mpt/bank/abilities'
const PREFIX = 'mpt-ga-d-'
const FILE_PREFIX = 'ga-d-'
const TODAY = '2026-09-26'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const R = mulberry32(0x6a2d2026)
const rnd = () => R()
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const chance = (p) => rnd() < p
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const sample = (arr, k) => shuffle(arr).slice(0, k)
function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()]
  const out = []
  arr.forEach((x, i) => { for (const p of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...p]) })
  return out
}
const PERM_CACHE = new Map()
function perms(n) { // permutations of indices 0..n-1, cached
  if (!PERM_CACHE.has(n)) PERM_CACHE.set(n, permutations([...Array(n).keys()]))
  return PERM_CACHE.get(n)
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
const ORDW = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const listAnd = (xs) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
const kebab = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
function hash36(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) }

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------
const MALE = ['Ali', 'Bilal', 'Omar', 'Hamza', 'Usman', 'Farhan', 'Kamran', 'Saad', 'Imran', 'Tariq', 'Adil', 'Badar',
  'Dawood', 'Junaid', 'Faisal', 'Nabeel', 'Rizwan', 'Shahid', 'Waqar', 'Zubair', 'Asad', 'Haris', 'Salman', 'Yasir',
  'Noman', 'Irfan', 'Sohail', 'Talha', 'Danish', 'Rehan', 'Ahmed', 'Ghulam', 'Moiz', 'Peter', 'Tom', 'John', 'Mike', 'Owais', 'Laeeq', 'Qasim', 'Emad']
const FEMALE = ['Sara', 'Hina', 'Zara', 'Ayesha', 'Fatima', 'Mehak', 'Salma', 'Nida', 'Sana', 'Amna', 'Rabia', 'Maryam',
  'Iqra', 'Khadija', 'Anam', 'Saima', 'Bushra', 'Farah', 'Laiba', 'Mahnoor', 'Hira', 'Aliya', 'Nadia', 'Rida', 'Sadia',
  'Uzma', 'Kiran', 'Samina', 'Areeba', 'Zainab', 'Tahira', 'Gul', 'Emma', 'Lucy', 'Julia', 'Parveen', 'Qurat', 'Esha', 'Vaneeza', 'Wajiha', 'Yusra', 'Javeria', 'Omaima']
const NAME_WORDS = new Set([...MALE, ...FEMALE].map((n) => n.toLowerCase()))
const LETTER_POOLS = [['A', 'B', 'C', 'D', 'E', 'F', 'G'], ['P', 'Q', 'R', 'S', 'T', 'U', 'V'], ['J', 'K', 'L', 'M', 'N', 'O', 'P'], ['S', 'T', 'U', 'V', 'W', 'X', 'Y'], ['K', 'L', 'M', 'N', 'P', 'Q', 'R']]
function distinctInitials(pool, k, used = new Set()) {
  const out = []
  for (const n of shuffle(pool)) {
    if (out.length === k) break
    if (used.has(n[0])) continue
    used.add(n[0]); out.push(n)
  }
  return out.length === k ? out : null
}
function mixedNames(k) {
  const used = new Set()
  const nf = ri(Math.max(0, k - 4), Math.min(k, 4))
  const f = distinctInitials(FEMALE, nf, used)
  const m = distinctInitials(MALE, k - nf, used)
  if (!f || !m) return mixedNames(k)
  return shuffle([...f, ...m])
}
const letters = (k) => shuffle(pick(LETTER_POOLS).slice(0, k))
const personNames = (k) => chance(0.35) ? letters(k) : mixedNames(k)
const isFemale = (n) => FEMALE.includes(n)

// ---------------------------------------------------------------------------
// Item construction and uniqueness
// ---------------------------------------------------------------------------
const NUM_WORDS = new Set([...NUMW, ...ORDW.filter(Boolean), 'twice', 'thrice', 'half', 'double', 'once', 'last',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'])
function signature(q) {
  return canonical(q).split(' ').map((t) => {
    if (/^\d+(?:st|nd|rd|th)?$/.test(t)) return '#'
    if (NUM_WORDS.has(t)) return '#'
    if (t.length === 1 || NAME_WORDS.has(t)) return 'N'
    return t
  }).join(' ')
}
const SIGS = new Set()
const CONCEPTS = new Set()
const STEMS = new Set()
const SERVED = loadServedArchive()
// Concepts and stems already used by other contributors' files in the same section.
for (const f of readdirSync(OUT_DIR)) {
  if (!f.endsWith('.json') || f.startsWith(FILE_PREFIX)) continue
  for (const row of JSON.parse(readFileSync(join(OUT_DIR, f), 'utf8'))) {
    if (row.concept) CONCEPTS.add(canonical(row.concept))
    if (row.q) { STEMS.add(canonical(row.q)); SIGS.add(signature(row.q)) }
  }
}

function numericSort(opts) {
  const v = (s) => parseFloat(String(s).replace(/[^0-9.\-]/g, ''))
  return [...opts].sort((a, b) => v(a) - v(b))
}

// spec: { concept, q, answer, distractors, explanation, order?: 'shuffle'|'numeric'|'keep', grade? }
function finalise(spec, plan, difficulty) {
  if (!spec) return null
  const { q, answer, explanation } = spec
  const distractors = [...new Set(spec.distractors.filter((x) => x != null && x !== "").map(String))].filter((d) => canonical(d) !== canonical(answer)).slice(0, 3)
  if (distractors.length < 3) return null
  if (q.length > 420 || q.length < 20) return null
  const opts = [String(answer), ...distractors]
  if (new Set(opts.map(canonical)).size !== 4) return null
  if (opts.some((o) => o.length > 220 || !o.trim())) return null
  const sig = signature(q)
  if (SIGS.has(sig) || STEMS.has(canonical(q)) || SERVED.stems.has(stemHash(q))) return null
  let concept = kebab(spec.concept)
  if (concept.length < 3) return null
  if (CONCEPTS.has(canonical(concept))) concept = `${concept}-${hash36(sig)}`
  if (CONCEPTS.has(canonical(concept))) return null
  let o
  if (spec.order === 'numeric') o = numericSort(opts)
  else if (spec.order === 'keep') o = opts
  else o = shuffle(opts)
  const a = o.indexOf(String(answer))
  SIGS.add(sig); STEMS.add(canonical(q)); CONCEPTS.add(canonical(concept))
  const def = SUBJECT_OF[plan.subtopic]
  return {
    id: '', section: 'General Abilities', subject: def, subtopic: plan.subtopic, pattern_family: plan.family,
    concept, difficulty, source_type: 'generated-verified', past_paper_year: null, verified: true,
    q, o, a, explanation, source_url: null, time_sensitive: false, event_date: null,
    last_verified: TODAY, quality_grade: spec.grade ?? 'A', mpt_relevance: 'core',
  }
}
const SUBJECT_OF = new Proxy({}, { get: () => 'Reasoning' })

// Generic unique-answer puzzle builder over an explicit list of models.
// clues: [{ text, test(model) }]; ask(model) -> string key. Returns chosen clues or null.
function buildPuzzle({ models, pool, ask, minClues, maxClues, fixed = [] }) {
  const order = shuffle(pool)
  let chosen = [...fixed]
  let live = models.filter((m) => chosen.every((c) => c.test(m)))
  const answers = (ms) => new Set(ms.map(ask))
  for (const c of order) {
    if (answers(live).size === 1) break
    const next = live.filter((m) => c.test(m))
    if (next.length === live.length || next.length === 0) continue
    chosen.push(c); live = next
  }
  if (answers(live).size !== 1) return null
  // prune redundant clues (never the fixed ones)
  for (const c of shuffle(chosen.filter((x) => !fixed.includes(x)))) {
    const rest = chosen.filter((x) => x !== c)
    const ms = models.filter((m) => rest.every((x) => x.test(m)))
    if (answers(ms).size === 1) chosen = rest
  }
  const free = chosen.filter((x) => !fixed.includes(x))
  if (chosen.length < minClues || chosen.length > maxClues) return null
  // no single clue may give the answer away on its own
  for (const c of free) {
    if (answers(models.filter((m) => c.test(m))).size === 1) return null
  }
  const final = models.filter((m) => chosen.every((c) => c.test(m)))
  return { clues: chosen, models: final, answer: ask(final[0]), allAnswers: [...new Set(models.map(ask))] }
}
// keep the clue order but put them in a random order for presentation
const presentOrder = (clues) => shuffle(clues)

// ---------------------------------------------------------------------------
// Direction sense
// ---------------------------------------------------------------------------
const H4 = ['north', 'east', 'south', 'west']
const VEC4 = [[0, 1], [1, 0], [0, -1], [-1, 0]]
const C8 = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']
function dirName(dx, dy) {
  if (!dx && !dy) return null
  const ns = dy > 0 ? 'North' : dy < 0 ? 'South' : ''
  const ew = dx > 0 ? 'East' : dx < 0 ? 'West' : ''
  return ns && ew ? `${ns}-${ew}` : ns || ew
}
const oppDir = (name) => C8[(C8.indexOf(name) + 4) % 8]
const isqrt = (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n ? r : null }
function dirDistractors(ans, prefer = []) {
  const diag = ans.includes('-')
  const out = []
  for (const p of prefer) if (p && p !== ans && !out.includes(p)) out.push(p)
  for (const c of shuffle(C8)) if (c !== ans && !out.includes(c) && c.includes('-') === diag) out.push(c)
  for (const c of shuffle(C8)) if (c !== ans && !out.includes(c)) out.push(c)
  return out.slice(0, 3)
}
function numDistractors(ans, cands, unit = '') {
  const out = []
  for (const c of cands) if (Number.isFinite(c) && c > 0 && c !== ans && !out.includes(c)) out.push(c)
  let k = 1
  while (out.length < 3) { for (const c of [ans + k, ans - k]) if (c > 0 && c !== ans && !out.includes(c) && out.length < 3) out.push(c); k++ }
  return shuffle(out.slice(0, 5)).slice(0, 3).map((x) => `${x}${unit}`)
}
function mover() {
  const f = chance(0.45)
  const name = pick(f ? FEMALE : MALE)
  const his = f ? 'her' : 'his'
  return pick([
    { intro: `${name} walks`, v: 'walks', ref: name, start: 'the starting point', unit: 'm' },
    { intro: `Starting from ${his} house, ${name} walks`, v: 'walks', ref: name, start: `${his} house`, unit: 'm' },
    { intro: 'A delivery rider leaves the restaurant and rides', v: 'rides', ref: 'the rider', start: 'the restaurant', unit: 'km' },
    { intro: `From the school gate, ${name} cycles`, v: 'cycles', ref: name, start: 'the school gate', unit: 'km' },
    { intro: 'A security guard starts at the main gate and walks', v: 'walks', ref: 'the guard', start: 'the main gate', unit: 'm' },
    { intro: `${name} leaves ${his} office and drives`, v: 'drives', ref: name, start: `${his} office`, unit: 'km' },
    { intro: 'A taxi leaves the railway station and travels', v: 'travels', ref: 'the taxi', start: 'the station', unit: 'km' },
    { intro: `During a treasure hunt, ${name} walks`, v: 'walks', ref: name, start: 'the starting point', unit: 'm' },
    { intro: 'An ant crawls', v: 'crawls', ref: 'the ant', start: 'its starting point', unit: 'cm' },
    { intro: 'A boat leaves the harbour and sails', v: 'sails', ref: 'the boat', start: 'the harbour', unit: 'km' },
    { intro: 'A robot on a factory floor moves', v: 'moves', ref: 'the robot', start: 'its starting position', unit: 'm' },
    { intro: `After the match, ${name} jogs`, v: 'jogs', ref: name, start: 'the stadium gate', unit: 'm' },
    { intro: `${name} sets off from the bus stop and walks`, v: 'walks', ref: name, start: 'the bus stop', unit: 'm' },
  ])
}
const LENS = { m: [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 20, 24, 25, 30, 40], km: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15], cm: [3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 20] }
function makeWalk(n, unit, allowStraight = false) {
  let h = ri(0, 3), x = 0, y = 0
  const legs = []
  for (let i = 0; i < n; i++) {
    let turn = null
    if (i > 0) {
      const r = rnd()
      turn = allowStraight && r < 0.12 ? 'straight' : r < 0.56 ? 'right' : 'left'
      h = (h + (turn === 'right' ? 1 : turn === 'left' ? 3 : 0)) % 4
    }
    const len = pick(LENS[unit])
    x += VEC4[h][0] * len; y += VEC4[h][1] * len
    legs.push({ h, len, turn })
  }
  return { legs, x, y, facing: h }
}
function renderWalk(w, m, mode) {
  const u = (L) => `${L} ${m.unit}`
  let prevRel = false
  const parts = w.legs.map((leg, i) => {
    const d = H4[leg.h]
    const wasRel = prevRel
    prevRel = false
    if (i === 0) return pick([`${u(leg.len)} towards the ${d}`, `${u(leg.len)} ${d}`, `${u(leg.len)} due ${d}`])
    const absolute = mode === 'abs' || (mode === 'mix' && chance(0.5))
    if (absolute) return pick([`then ${u(leg.len)} ${d}`, `${u(leg.len)} to the ${d}`, `then ${u(leg.len)} towards the ${d}`])
    if (leg.turn === 'straight') return `continues straight for another ${u(leg.len)}`
    const again = wasRel && w.legs[i - 1].turn === leg.turn ? ' again' : ''
    prevRel = true
    return pick([`turns ${leg.turn}${again} and ${m.v} ${u(leg.len)}`, `takes a ${leg.turn} turn and covers ${u(leg.len)}`,
      `turns ${leg.turn}${again} and goes ${u(leg.len)}`, `then turns ${leg.turn}${again} and ${m.v} ${u(leg.len)}`])
  })
  const last = parts.pop()
  return `${m.intro} ${parts.join(', ')} and ${last.replace(/^then /, 'finally ')}`
}
const legSummary = (w) => w.legs.map((l) => `${l.len} ${H4[l.h]}`).join(', ')

function genNetDisplacement(d) {
  const m = mover()
  const n = d === 1 ? 3 : d === 2 ? 4 : 5
  for (let t = 0; t < 400; t++) {
    const w = makeWalk(n, m.unit, d === 3)
    const dist = isqrt(w.x * w.x + w.y * w.y)
    if (!dist) continue
    if (d === 1 && w.x !== 0 && w.y !== 0 && chance(0.6)) continue
    if (d >= 2 && (w.x === 0 || w.y === 0) && chance(0.5)) continue
    const total = w.legs.reduce((s, l) => s + l.len, 0)
    const mode = d === 1 ? 'abs' : d === 2 ? pick(['rel', 'mix']) : 'rel'
    const q = `${renderWalk(w, m, mode)}. ${pick([
      `How far is ${m.ref} from ${m.start} now?`, `What is the shortest distance between ${m.ref} and ${m.start}?`,
      `At what straight-line distance from ${m.start} does ${m.ref} stop?`, `How far is ${m.ref} now from ${m.start}?`])}`
    const east = w.x, north = w.y
    return {
      concept: `directions-net-distance-${legSummary(w)}-${m.unit}`,
      q: cap(q), answer: `${dist} ${m.unit}`, order: 'numeric',
      distractors: numDistractors(dist, [total, Math.abs(east) + Math.abs(north), Math.abs(east) || null, Math.abs(north) || null, dist + w.legs[0].len], ` ${m.unit}`),
      explanation: east && north
        ? `Net movement is ${Math.abs(east)} ${m.unit} ${east > 0 ? 'east' : 'west'} and ${Math.abs(north)} ${m.unit} ${north > 0 ? 'north' : 'south'}, so the distance is √(${east * east} + ${north * north}) = ${dist} ${m.unit}.`
        : `The ${east ? 'north–south' : 'east–west'} movements cancel out, leaving a net ${dist} ${m.unit} ${east > 0 ? 'east' : east < 0 ? 'west' : north > 0 ? 'north' : 'south'} of ${m.start}.`,
    }
  }
  return null
}

function genDirectionFromStart(d) {
  const m = mover()
  const n = d === 1 ? 3 : d === 2 ? 4 : 4
  for (let t = 0; t < 400; t++) {
    const w = makeWalk(n, m.unit, d >= 2)
    if (!w.x && !w.y) continue
    const ans = dirName(w.x, w.y)
    if (d === 1 && ans.includes('-') && chance(0.3)) continue
    const mode = d === 1 ? pick(['abs', 'mix']) : 'rel'
    const walk = renderWalk(w, m, mode)
    const facing = cap(H4[w.facing])
    if (d === 3) {
      const dist = isqrt(w.x * w.x + w.y * w.y)
      if (!dist || !w.x || !w.y) continue
      const total = w.legs.reduce((s, l) => s + l.len, 0)
      const opt = (k, dn) => `${k} ${m.unit} ${dn}`
      const alt = [opt(dist, oppDir(ans)), opt(Math.abs(w.x) + Math.abs(w.y), ans), opt(total, ans), opt(dist, dirName(-w.x, w.y)), opt(dist, dirName(w.x, -w.y))]
      return {
        concept: `directions-distance-and-direction-${legSummary(w)}-${m.unit}`,
        q: `${walk}. ${pick([`How far and in which direction is ${m.ref} from ${m.start}?`, `Where is ${m.ref} now with respect to ${m.start}?`])}`,
        answer: opt(dist, ans), distractors: shuffle(alt).filter((x) => x !== opt(dist, ans)).slice(0, 3),
        explanation: `Net displacement is ${Math.abs(w.x)} ${m.unit} ${w.x > 0 ? 'east' : 'west'} and ${Math.abs(w.y)} ${m.unit} ${w.y > 0 ? 'north' : 'south'}: √(${w.x * w.x} + ${w.y * w.y}) = ${dist} ${m.unit} towards the ${ans.toLowerCase()}.`,
      }
    }
    const reverse = chance(0.3)
    const q = reverse
      ? `${walk}. In which direction is ${m.start} from ${m.ref}'s final position?`
      : `${walk}. ${pick([`In which direction is ${m.ref} now from ${m.start}?`, `In which direction from ${m.start} is ${m.ref} at the end?`])}`
    const a = reverse ? oppDir(ans) : ans
    return {
      concept: `directions-direction-from-start-${reverse ? 'reverse-' : ''}${legSummary(w)}`,
      q: cap(q), answer: a, distractors: dirDistractors(a, [oppDir(a), facing, dirName(-w.x, w.y) ?? null]),
      explanation: `Adding the legs gives ${Math.abs(w.x)} ${m.unit} ${w.x >= 0 ? 'east' : 'west'} and ${Math.abs(w.y)} ${m.unit} ${w.y >= 0 ? 'north' : 'south'} of the start, so ${reverse ? `the start lies ${a.toLowerCase()} of the final point` : `the final point is ${a.toLowerCase()} of the start`}.`,
    }
  }
  return null
}

function genFinalFacing(d) {
  // headings in 45° steps (index into C8)
  const f = chance(0.45)
  const name = pick(f ? FEMALE : MALE)
  const he = f ? 'she' : 'he'
  const ctx = pick([
    { open: (s) => `A soldier on parade is facing ${s}. On command, he`, q: 'Which direction is he facing now?' },
    { open: (s) => `${name} is standing in the playground facing ${s}. ${cap(he)}`, q: `Which direction is ${name} facing now?` },
    { open: (s) => `A robot facing ${s} is programmed so that it`, q: 'In which direction is the robot facing at the end?' },
    { open: (s) => `The pointer of a dial points ${s}. It`, q: 'In which direction does the pointer point now?', noun: 'pointer' },
    { open: (s) => `During a drill, a cadet facing ${s}`, q: 'Which direction does the cadet face at the end?' },
    { open: (s) => `${name} is sitting on a revolving chair facing ${s}. ${cap(he)}`, q: `Which direction is ${name} facing finally?` },
  ])
  const start = d === 3 ? ri(0, 7) : 2 * ri(0, 3)
  const steps = []
  const nSteps = d === 1 ? 2 : 3
  for (let i = 0; i < nSteps; i++) {
    let deg
    if (d === 1) deg = pick([90, -90])
    else if (d === 2) deg = pick([90, -90, 180, 90, -90])
    else deg = pick([45, -45, 135, -135, 90, -90, 180])
    steps.push(deg)
  }
  const sum = steps.reduce((a, b) => a + b, 0)
  const fin = ((start + sum / 45) % 8 + 8) % 8
  const mirror = ((start - sum / 45) % 8 + 8) % 8
  if (fin === start && d > 1) return null
  if (d === 3 && fin % 2 === 0 && chance(0.6)) return null
  const pointer = ctx.noun === 'pointer'
  const phrase = (deg, i) => {
    if (deg === 180) return pick(pointer ? ['is turned through 180°', 'is rotated half a turn'] : ['makes an about-turn', 'turns 180°', 'turns round completely to face the opposite way'])
    const cw = deg > 0
    const a = Math.abs(deg)
    if (a === 90 && !pointer && d < 3 && chance(0.6)) return `turns ${cw ? 'right' : 'left'}${i > 0 && steps[i - 1] === deg ? ' again' : ''}`
    return `${pointer ? 'is rotated' : 'turns'} ${a}° ${cw ? 'clockwise' : pick(['anticlockwise', 'anti-clockwise'])}`
  }
  const ph = steps.map(phrase)
  const q = `${ctx.open(C8[start].toLowerCase())} ${ph.slice(0, -1).join(', ')} and then ${ph[ph.length - 1]}. ${ctx.q}`
  const ans = C8[fin]
  return {
    concept: `directions-final-facing-${C8[start]}-${steps.join('_')}`,
    q, answer: ans, distractors: dirDistractors(ans, [C8[mirror], oppDir(ans), C8[start]]),
    explanation: `Net rotation is ${sum >= 0 ? `${sum}° clockwise` : `${-sum}° anticlockwise`} from ${C8[start].toLowerCase()}, which ends at ${ans.toLowerCase()}.`,
  }
}

// Positions described without distances: the direction is asked only when both axis signs are forced.
const REL_CTX = [
  { names: (k) => mixedNames(k), stand: 'stands', pre: 'In a field,' },
  { names: (k) => letters(k).map((l) => `town ${l}`), stand: 'lies', pre: '' },
  { names: (k) => letters(k).map((l) => `house ${l}`), stand: 'is', pre: 'In a village,' },
  { names: (k) => sample(['the bakery', 'the pharmacy', 'the bank', 'the mosque', 'the post office', 'the school', 'the library'], k), stand: 'is', pre: 'In a small town,' },
  { names: (k) => letters(k), stand: 'is', pre: '' },
  { names: (k) => sample(['the mango tree', 'the well', 'the tube-well', 'the barn', 'the gate', 'the pond'], k), stand: 'is', pre: 'On a farm,' },
]
const DIAG = [[1, 1, 'north-east'], [1, -1, 'south-east'], [-1, -1, 'south-west'], [-1, 1, 'north-west']]
function genRelativePosition(d) {
  const k = d === 1 ? 3 : d === 2 ? 4 : 5
  const ctx = pick(REL_CTX)
  const names = ctx.names(k)
  const pos = [{ x: {}, y: {} }]
  const facts = []
  for (let i = 1; i < k; i++) {
    const j = ri(0, i - 1)
    let dx, dy, word
    if (d === 3 && chance(0.35)) [dx, dy, word] = pick(DIAG)
    else { const h = ri(0, 3); [dx, dy] = VEC4[h]; word = H4[h] }
    const x = { ...pos[j].x }, y = { ...pos[j].y }
    if (dx) x[i] = dx
    if (dy) y[i] = dy
    pos.push({ x, y })
    const opp = dirName(-dx, -dy).toLowerCase()
    facts.push(chance(0.6)
      ? pick([`${names[i]} ${ctx.stand} ${word} of ${names[j]}`, `${names[i]} ${ctx.stand} to the ${word} of ${names[j]}`])
      : pick([`${names[j]} ${ctx.stand} ${opp} of ${names[i]}`, `${names[j]} ${ctx.stand} to the ${opp} of ${names[i]}`]))
  }
  const sign = (A, B) => { // sign of A-B over edge variables
    const keys = new Set([...Object.keys(A), ...Object.keys(B)])
    const coeffs = [...keys].map((e) => (A[e] ?? 0) - (B[e] ?? 0)).filter((c) => c !== 0)
    if (!coeffs.length) return 0
    if (coeffs.every((c) => c > 0)) return 1
    if (coeffs.every((c) => c < 0)) return -1
    return null
  }
  const pairs = []
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
    if (a === b) continue
    const sx = sign(pos[a].x, pos[b].x), sy = sign(pos[a].y, pos[b].y)
    if (sx === null || sy === null || (!sx && !sy)) continue
    const live = new Set()
    for (const ax of ['x', 'y']) for (const e of new Set([...Object.keys(pos[a][ax]), ...Object.keys(pos[b][ax])])) if ((pos[a][ax][e] ?? 0) !== (pos[b][ax][e] ?? 0)) live.add(e)
    if (live.size < 2) continue
    pairs.push([a, b, sx, sy])
  }
  if (!pairs.length) return null
  pairs.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]))
  const [a, b, sx, sy] = pick(pairs.slice(0, 3))
  const ans = dirName(sx, sy)
  const A = names[a], B = names[b]
  const lead = ctx.pre ? `${ctx.pre} ` : ''
  const body = `${facts.slice(0, -1).join(', ')} and ${facts[facts.length - 1]}`
  const q = cap(`${lead}${body}. ${pick([`In which direction of ${B} is ${A}?`, `In which direction is ${A} from ${B}?`, `Where is ${A} with respect to ${B}?`])}`)
  return {
    concept: `directions-relative-position-${kebab(signature(body))}-${a}-${b}`.slice(0, 120),
    q, answer: ans, distractors: dirDistractors(ans, [oppDir(ans), dirName(-sx, sy), dirName(sx, -sy)]),
    explanation: `Every step from ${B} to ${A} moves ${[sy > 0 ? 'north' : sy < 0 ? 'south' : '', sx > 0 ? 'east' : sx < 0 ? 'west' : ''].filter(Boolean).join(' and ')}, whatever the distances, so ${A} is ${ans.toLowerCase()} of ${B}.`,
  }
}

function genDistanceBetween(d) {
  const k = d === 1 ? 3 : 4
  const ctx = pick([
    { names: () => letters(k).map((l) => `Town ${l}`), unit: 'km', verb: 'is' },
    { names: () => letters(k).map((l) => `pole ${l}`), unit: 'm', verb: 'stands' },
    { names: () => sample(['the clinic', 'the market', 'the school', 'the stadium', 'the park', 'the mosque'], k), unit: 'km', verb: 'is' },
    { names: () => letters(k).map((l) => `tree ${l}`), unit: 'm', verb: 'is' },
    { names: () => letters(k).map((l) => `station ${l}`), unit: 'km', verb: 'is' },
    { names: () => sample(['Ali\'s house', 'Sara\'s house', 'Omar\'s house', 'Hina\'s house', 'Zara\'s house'], k), unit: 'm', verb: 'is' },
  ])
  for (let t = 0; t < 300; t++) {
    const names = ctx.names()
    const P = [[0, 0]]
    const facts = []
    const par = []
    for (let i = 1; i < k; i++) {
      const j = d === 1 ? i - 1 : ri(0, i - 1)
      const h = ri(0, 3)
      const len = pick(ctx.unit === 'km' ? [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16] : [3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 30])
      P.push([P[j][0] + VEC4[h][0] * len, P[j][1] + VEC4[h][1] * len])
      par.push(j)
      facts.push(`${cap(names[i])} ${ctx.verb} ${len} ${ctx.unit} ${pick(['', 'to the '])}${H4[h]} of ${names[j]}`.replace('  ', ' '))
    }
    const cands = []
    for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
      if (par[b - 1] === a) continue
      const dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1]
      const dist = isqrt(dx * dx + dy * dy)
      if (!dist || !dx || !dy) continue
      cands.push([a, b, dx, dy, dist])
    }
    if (!cands.length) continue
    const uniquePts = new Set(P.map((p) => p.join(','))).size
    if (uniquePts !== k) continue
    const [a, b, dx, dy, dist] = pick(cands)
    const withDir = d === 3
    const dn = dirName(dx, dy)
    const body = `${facts.slice(0, -1).join('. ')}. ${facts[facts.length - 1]}.`.replace(/\. \./g, '.')
    const q = withDir
      ? `${body} How far and in which direction is ${names[b]} from ${names[a]}?`
      : `${body} ${pick([`What is the straight-line distance between ${names[a]} and ${names[b]}?`, `How far is ${names[b]} from ${names[a]} in a straight line?`])}`
    const u = ` ${ctx.unit}`
    const ans = withDir ? `${dist}${u} ${dn}` : `${dist}${u}`
    const dis = withDir
      ? shuffle([`${dist}${u} ${oppDir(dn)}`, `${Math.abs(dx) + Math.abs(dy)}${u} ${dn}`, `${dist}${u} ${dirName(-dx, dy)}`, `${dist + 2}${u} ${dn}`])
      : numDistractors(dist, [Math.abs(dx) + Math.abs(dy), Math.abs(dx), Math.abs(dy)], u)
    return {
      concept: `directions-distance-between-${kebab(signature(body))}-${a}-${b}`.slice(0, 120),
      q: cap(q), answer: ans, distractors: dis, order: withDir ? 'shuffle' : 'numeric',
      explanation: `${cap(names[b])} is ${Math.abs(dx)}${u} ${dx > 0 ? 'east' : 'west'} and ${Math.abs(dy)}${u} ${dy > 0 ? 'north' : 'south'} of ${names[a]}, so the distance is √(${dx * dx} + ${dy * dy}) = ${dist}${u}${withDir ? `, towards the ${dn.toLowerCase()}` : ''}.`,
    }
  }
  return null
}

// Sun in the east in the morning (shadows fall west) and in the west in the evening (shadows fall east).
function genShadow(d) {
  const morning = chance(0.5)
  const time = morning ? pick(['One morning after sunrise', 'At about 7 a.m.', 'Early one morning', 'Soon after sunrise']) : pick(['One evening before sunset', 'At about 5 p.m. in winter', 'Late in the afternoon, shortly before sunset', 'Just before sunset'])
  const s = morning ? 3 : 1 // shadow heading index (west / east)
  const REL = { front: 0, right: 1, behind: 2, left: 3 }
  const relWord = { front: 'straight in front of', right: 'to the right of', behind: 'behind', left: 'to the left of' }
  const [pA, pB] = mixedNames(2)
  const hisA = isFemale(pA) ? 'her' : 'his'
  const heA = isFemale(pA) ? 'she' : 'he'
  const rel = pick(Object.keys(REL))
  const facingA = ((s - REL[rel]) % 4 + 4) % 4
  let q, ans, expl, concept
  const shadowTxt = `${pA}'s shadow falls ${relWord[rel].replace(' of', '')} ${rel === 'behind' || rel === 'front' ? hisA : hisA}`.replace(`straight in front ${hisA}`, `straight in front of ${hisA}`)
  const shadowPhrase = rel === 'front' ? `${pA}'s shadow falls straight in front of ${isFemale(pA) ? 'her' : 'him'}` : rel === 'behind' ? `${pA}'s shadow falls behind ${isFemale(pA) ? 'her' : 'him'}` : `${pA}'s shadow falls to ${hisA} ${rel}`
  void shadowTxt
  if (d === 1) {
    if (chance(0.5)) {
      q = `${time}, ${shadowPhrase}. Which direction is ${pA} facing?`
      ans = cap(H4[facingA]); concept = `shadow-self-facing-${morning ? 'am' : 'pm'}-${rel}`
      expl = `The ${morning ? 'morning sun is in the east, so shadows fall west' : 'evening sun is in the west, so shadows fall east'}; a shadow ${relWord[rel]} ${pA} means ${heA} faces ${H4[facingA]}.`
    } else {
      const f = ri(0, 3)
      const relIdx = ((s - f) % 4 + 4) % 4
      const relName = Object.keys(REL).find((k) => REL[k] === relIdx)
      q = `${time}, ${pA} stands facing ${H4[f]}. Where does ${hisA} shadow fall?`
      ans = { front: `In front of ${isFemale(pA) ? 'her' : 'him'}`, behind: `Behind ${isFemale(pA) ? 'her' : 'him'}`, left: `To ${hisA} left`, right: `To ${hisA} right` }
      const all = ans
      ans = all[relName]
      concept = `shadow-where-${morning ? 'am' : 'pm'}-${H4[f]}`
      expl = `${morning ? 'In the morning shadows point west' : 'In the evening shadows point east'}; facing ${H4[f]}, ${H4[s]} is ${relName === 'front' ? 'ahead' : relName === 'behind' ? 'behind' : `on the ${relName}`}.`
      return { concept, q, answer: ans, distractors: Object.values(all).filter((x) => x !== ans), explanation: expl }
    }
  } else {
    const how = pick(d === 2 ? ['facing each other', 'back to back'] : ['facing each other', 'back to back', 'side'])
    let facingB
    if (how === 'facing each other') facingB = (facingA + 2) % 4
    else if (how === 'back to back') facingB = (facingA + 2) % 4
    else facingB = facingA
    if (how === 'side') {
      const turn = pick(['right', 'left', 'about'])
      const nf = (facingA + (turn === 'right' ? 1 : turn === 'left' ? 3 : 2)) % 4
      const relIdx = ((s - nf) % 4 + 4) % 4
      const relName = Object.keys(REL).find((k) => REL[k] === relIdx)
      q = `${time}, ${shadowPhrase}. ${cap(heA)} then turns ${turn === 'about' ? 'about' : turn}. Which direction is ${heA} facing now, and where does ${hisA} shadow fall?`
      const lbl = (dirI, r) => `${cap(H4[dirI])}; ${r === 'front' ? 'in front' : r === 'behind' ? 'behind' : `to the ${r}`}`
      ans = lbl(nf, relName)
      const others = shuffle([lbl((nf + 2) % 4, relName), lbl(nf, Object.keys(REL).find((k) => REL[k] === (relIdx + 2) % 4)), lbl(facingA, rel), lbl((nf + 1) % 4, relName)]).filter((x) => x !== ans)
      concept = `shadow-turn-${morning ? 'am' : 'pm'}-${rel}-${turn}`
      expl = `First ${pA} faces ${H4[facingA]} (shadow ${H4[s]}); after turning ${turn} ${heA} faces ${H4[nf]}, and the ${H4[s]}-pointing shadow is then ${relName === 'front' ? 'in front' : relName === 'behind' ? 'behind' : `on the ${relName}`}.`
      return { concept, q, answer: ans, distractors: others, explanation: expl }
    }
    q = `${time}, ${pA} and ${pB} were standing ${how}. ${shadowPhrase.replace(' falls ', ' fell ')}. Which direction was ${pB} facing?`
    ans = cap(H4[facingB]); concept = `shadow-pair-${morning ? 'am' : 'pm'}-${rel}-${kebab(how)}`
    expl = `Shadows fall ${H4[s]} ${morning ? 'in the morning' : 'in the evening'}, so ${pA} faces ${H4[facingA]}; standing ${how}, ${pB} faces ${H4[facingB]}.`
  }
  return { concept, q, answer: ans, distractors: dirDistractors(ans, [cap(H4[(H4.indexOf(ans.toLowerCase()) + 2) % 4])]).filter((x) => !x.includes('-')).concat(C8.filter((c) => !c.includes('-') && c !== ans)).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 3), explanation: expl }
}

// ---------------------------------------------------------------------------
// Blood relations: explicit family model
// ---------------------------------------------------------------------------
// Conventions (standard for these papers): siblings are full siblings; a child's two parents are
// married to each other; a spouse's child is one's own child. Units hold a couple's children.
class Fam {
  constructor() { this.p = []; this.units = [] }
  add(g = null) { this.p.push({ g, unit: null, spouse: null }); return this.p.length - 1 }
  pu(x) { return this.units.findIndex((u) => u.parents.includes(x)) }
  parents(x) { const u = this.p[x].unit; return u == null ? [] : this.units[u].parents }
  children(x) { const u = this.pu(x); return u < 0 ? [] : this.p.map((_, i) => i).filter((i) => this.p[i].unit === u) }
  siblings(x) { const u = this.p[x].unit; return u == null ? [] : this.p.map((_, i) => i).filter((i) => i !== x && this.p[i].unit === u) }
  g(x) { return this.p[x].g }
  setG(x, g) { if (!g) return true; if (this.p[x].g && this.p[x].g !== g) return false; this.p[x].g = g; return true }
  marry(a, b) {
    if (a === b) return false
    const A = this.p[a], B = this.p[b]
    if (A.spouse === b) return true
    if (A.spouse != null || B.spouse != null) return false
    if (A.g && B.g && A.g === B.g) return false
    if (this.siblings(a).includes(b) || this.parents(a).includes(b) || this.parents(b).includes(a)) return false
    if (A.g) B.g = A.g === 'm' ? 'f' : 'm'
    else if (B.g) A.g = B.g === 'm' ? 'f' : 'm'
    const ua = this.pu(a), ub = this.pu(b)
    if (ua >= 0 && ub >= 0 && ua !== ub) return false
    A.spouse = b; B.spouse = a
    if (ua >= 0 && ub < 0) { if (this.units[ua].parents.length > 1) return false; this.units[ua].parents.push(b) }
    if (ub >= 0 && ua < 0) { if (this.units[ub].parents.length > 1) return false; this.units[ub].parents.push(a) }
    return true
  }
  makeParent(par, c) {
    if (par === c) return false
    if (this.parents(c).includes(par)) return true
    if (this.siblings(c).includes(par) || this.p[c].spouse === par || this.parents(par).includes(c)) return false
    const uc = this.p[c].unit, up = this.pu(par)
    if (uc == null && up < 0) {
      const parents = [par]
      const s = this.p[par].spouse
      if (s != null) { if (this.pu(s) >= 0) return false; parents.push(s) }
      this.units.push({ parents }); this.p[c].unit = this.units.length - 1
      return true
    }
    if (uc == null) { this.p[c].unit = up; return true }
    if (up >= 0) return up === uc
    const u = this.units[uc]
    if (u.parents.length >= 2) return false
    if (u.parents.length === 1) {
      const q = u.parents[0]
      if (this.p[q].g && this.p[par].g && this.p[q].g === this.p[par].g) return false
      if (!this.marry(par, q)) return false
      if (!u.parents.includes(par)) u.parents.push(par)
      return true
    }
    u.parents.push(par)
    const s = this.p[par].spouse
    if (s != null) { if (this.pu(s) >= 0 && this.pu(s) !== uc) return false; if (!u.parents.includes(s)) u.parents.push(s) }
    return true
  }
  makeSibling(a, b) {
    if (a === b) return false
    const ua = this.p[a].unit, ub = this.p[b].unit
    if (this.p[a].spouse === b || this.parents(a).includes(b) || this.parents(b).includes(a)) return false
    if (ua != null && ub != null) return ua === ub
    if (ua == null && ub == null) { this.units.push({ parents: [] }); this.p[a].unit = this.p[b].unit = this.units.length - 1; return true }
    if (ua == null) this.p[a].unit = ub; else this.p[b].unit = ua
    return true
  }
  // x is <rel> of y
  link(x, rel, y) {
    const g = REL_GENDER[rel]
    if (!this.setG(x, g)) return false
    if (rel === 'father' || rel === 'mother') return this.makeParent(x, y)
    if (rel === 'son' || rel === 'daughter') return this.makeParent(y, x)
    if (rel === 'brother' || rel === 'sister') return this.makeSibling(x, y)
    if (rel === 'husband' || rel === 'wife') return this.marry(x, y)
    return false
  }
  // relation of x to y: { term, qual } or null. Needs x's gender (except cousin).
  relation(x, y) {
    if (x === y) return null
    const G = this.g(x)
    const t = (m, f) => (G === 'm' ? m : G === 'f' ? f : null)
    const par = (z) => this.parents(z)
    const sib = (z) => this.siblings(z)
    const sp = (z) => this.p[z].spouse
    const res = (term, qual = null) => (term ? { term, qual } : null)
    const qualOf = (p) => (this.g(p) === 'm' ? 'paternal' : this.g(p) === 'f' ? 'maternal' : null)
    if (par(y).includes(x)) return res(t('father', 'mother'))
    if (par(x).includes(y)) return res(t('son', 'daughter'))
    if (sib(x).includes(y)) return res(t('brother', 'sister'))
    if (sp(x) === y) return res(t('husband', 'wife'))
    for (const p of par(y)) if (par(p).includes(x)) return res(t('grandfather', 'grandmother'), qualOf(p))
    for (const p of par(x)) if (par(p).includes(y)) return res(t('grandson', 'granddaughter'))
    for (const p of par(y)) for (const q of par(p)) if (par(q).includes(x)) return res(t('great-grandfather', 'great-grandmother'))
    for (const p of par(x)) for (const q of par(p)) if (par(q).includes(y)) return res(t('great-grandson', 'great-granddaughter'))
    for (const p of par(y)) {
      if (sib(p).includes(x)) return res(t('uncle', 'aunt'), qualOf(p))
      if (sib(p).some((s) => sp(s) === x)) return res(t('uncle', 'aunt'), qualOf(p))
    }
    for (const p of par(x)) if (sib(p).includes(y) || sib(p).some((s) => sp(s) === y)) return res(t('nephew', 'niece'))
    for (const p of par(x)) for (const q of par(y)) if (sib(p).includes(q)) return res('cousin')
    if (sp(y) != null && par(sp(y)).includes(x)) return res(t('father-in-law', 'mother-in-law'))
    if (sp(x) != null && par(sp(x)).includes(y)) return res(t('son-in-law', 'daughter-in-law'))
    if ((sp(y) != null && sib(sp(y)).includes(x)) || sib(y).some((s) => sp(s) === x)) return res(t('brother-in-law', 'sister-in-law'))
    return null
  }
}
const REL_GENDER = { father: 'm', mother: 'f', son: 'm', daughter: 'f', brother: 'm', sister: 'f', husband: 'm', wife: 'f' }
const PRIM = Object.keys(REL_GENDER)
const FLIP = { father: 'mother', son: 'daughter', brother: 'sister', husband: 'wife', grandfather: 'grandmother', grandson: 'granddaughter', uncle: 'aunt', nephew: 'niece', 'father-in-law': 'mother-in-law', 'son-in-law': 'daughter-in-law', 'brother-in-law': 'sister-in-law', 'great-grandfather': 'great-grandmother', 'great-grandson': 'great-granddaughter', cousin: 'cousin' }
for (const [k, v] of Object.entries({ ...FLIP })) FLIP[v] = k
const CONF_M = {
  father: ['uncle', 'grandfather', 'brother', 'father-in-law'], son: ['nephew', 'grandson', 'brother', 'son-in-law'],
  brother: ['cousin', 'son', 'nephew', 'brother-in-law', 'father'], husband: ['brother-in-law', 'father', 'son', 'brother'],
  grandfather: ['father', 'uncle', 'great-grandfather', 'father-in-law'], grandson: ['son', 'nephew', 'great-grandson', 'brother'],
  'great-grandfather': ['grandfather', 'father', 'uncle'], 'great-grandson': ['grandson', 'son', 'nephew'],
  uncle: ['father', 'brother', 'cousin', 'grandfather', 'nephew'], nephew: ['son', 'brother', 'cousin', 'grandson', 'uncle'],
  cousin: ['brother', 'nephew', 'uncle', 'brother-in-law'], 'father-in-law': ['father', 'uncle', 'grandfather', 'brother-in-law'],
  'son-in-law': ['son', 'nephew', 'brother-in-law', 'grandson'], 'brother-in-law': ['brother', 'cousin', 'husband', 'uncle', 'son-in-law'],
}
function relTerm(r) { return r.qual && /uncle|aunt|grand(father|mother)$/.test(r.term) ? `${r.qual} ${r.term}` : r.term }
function relDistractors(r, gender) {
  const male = r.term === 'cousin' ? gender !== 'f' : FLIP[r.term] && CONF_M[r.term] !== undefined
  const baseM = male ? r.term : FLIP[r.term]
  let list = [...(CONF_M[baseM] ?? CONF_M.cousin)]
  if (!male && r.term !== 'cousin') list = list.map((w) => FLIP[w])
  if (r.term === 'cousin' && gender === 'f') list = CONF_M.cousin.map((w) => FLIP[w])
  const out = []
  if (r.qual && /uncle|aunt|grand/.test(r.term)) out.push(`${r.qual === 'paternal' ? 'maternal' : 'paternal'} ${r.term}`)
  for (const w of shuffle(list)) if (w !== r.term && !out.includes(w)) out.push(w)
  return out.slice(0, 3)
}
const relExplain = (x, y, r) => `${x} is ${y}'s ${relTerm(r)}`
function statement(X, rel, Y) {
  return pick([`${X} is ${Y}'s ${rel}`, `${X} is the ${rel} of ${Y}`, `${Y}'s ${rel} is ${X}`])
}
function namesForGenders(genders) { // name per gender, distinct initials
  const used = new Set()
  return genders.map((g) => { const n = distinctInitials(g === 'f' ? FEMALE : MALE, 1, used); return n ? n[0] : null })
}

function genChainStatement(d) {
  const k = d === 1 ? 3 : d === 2 ? 4 : 5
  const useLetters = chance(0.55)
  for (let t = 0; t < 200; t++) {
    const fam = new Fam()
    const ids = [fam.add(useLetters ? null : pick(['m', 'f']))]
    const st = []
    const adj = new Map([[0, new Set()]])
    let ok = true
    for (let i = 1; i < k && ok; i++) {
      const j = chance(0.6) ? i - 1 : ri(0, i - 1)
      const rel = pick(PRIM)
      const nw = fam.add(useLetters ? null : pick(['m', 'f']))
      const subjNew = chance(0.5)
      ok = subjNew ? fam.link(nw, rel, j) : fam.link(j, rel, nw)
      ids.push(nw); adj.set(nw, new Set()); adj.get(nw).add(j); adj.get(j).add(nw)
      st.push(subjNew ? [nw, rel, j] : [j, rel, nw])
    }
    if (!ok) continue
    const names = useLetters ? letters(k) : namesForGenders(ids.map((i) => fam.g(i)))
    if (names.includes(null)) continue
    const dist = (a, b) => { const seen = new Map([[a, 0]]); const qu = [a]; while (qu.length) { const u = qu.shift(); for (const v of adj.get(u)) if (!seen.has(v)) { seen.set(v, seen.get(u) + 1); qu.push(v) } } return seen.get(b) }
    const pairs = []
    for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) {
      if (x === y) continue
      const dd = dist(x, y)
      if (dd < (d === 3 ? 3 : 2)) continue
      const r = fam.relation(x, y)
      if (!r || (!fam.g(x) && r.term !== 'cousin')) continue
      pairs.push([x, y, r])
    }
    if (!pairs.length) continue
    const [x, y, r] = pick(pairs)
    const body = listAnd(st.map(([a, rel, b]) => statement(names[a], rel, names[b])))
    const q = `${cap(body)}. ${pick([`How is ${names[x]} related to ${names[y]}?`, `What is ${names[x]} to ${names[y]}?`, `${names[x]} is ${names[y]}'s:`])}`
    return {
      concept: `blood-chain-${st.map(([a, rel, b]) => `${a}${rel}${b}`).join('-')}-${x}-to-${y}-${kebab(r.term)}`,
      q, answer: cap(r.term), distractors: relDistractors({ term: r.term }, fam.g(x)).map(cap),
      explanation: `Linking the statements: ${st.map(([a, rel, b]) => `${names[a]} is ${names[b]}'s ${rel}`).join('; ')}. Hence ${relExplain(names[x], names[y], { term: r.term })}.`,
    }
  }
  return null
}

// Possessive descriptions from the speaker, each step resolved to one definite person.
function resolveStep(fam, cur, step) {
  // step: 'father' | 'mother' | 'onlyson' | 'onlydaughter' | 'onlybrother' | 'onlysister' | 'husband' | 'wife'
  if (step === 'father' || step === 'mother') {
    const g = step === 'father' ? 'm' : 'f'
    const ex = fam.parents(cur).find((p) => fam.g(p) === g)
    if (ex != null) return ex
    const n = fam.add(g); return fam.makeParent(n, cur) ? n : null
  }
  if (step === 'husband' || step === 'wife') {
    const s = fam.p[cur].spouse
    if (s != null) return fam.g(s) === (step === 'husband' ? 'm' : 'f') ? s : null
    const n = fam.add(step === 'husband' ? 'm' : 'f'); return fam.marry(n, cur) ? n : null
  }
  const g = /son|brother/.test(step) ? 'm' : 'f'
  const pool = /son|daughter/.test(step) ? fam.children(cur) : fam.siblings(cur)
  const same = pool.filter((p) => fam.g(p) === g)
  if (same.length === 1) return same[0]
  if (same.length > 1) return null
  const n = fam.add(g)
  return (/son|daughter/.test(step) ? fam.makeParent(cur, n) : fam.makeSibling(cur, n)) ? n : null
}
const STEP_WORD = { father: 'father', mother: 'mother', onlyson: 'only son', onlydaughter: 'only daughter', onlybrother: 'only brother', onlysister: 'only sister', husband: 'husband', wife: 'wife' }
function describe(steps, owner = 'my') {
  const w = steps.map((s) => STEP_WORD[s])
  if (w.length >= 2 && chance(0.4)) return `the ${w[w.length - 1]} of ${owner} ${w.slice(0, -1).join("'s ")}`
  return `${owner} ${w.join("'s ")}`
}
function genPhotograph(d) {
  const nSteps = d === 1 ? ri(1, 2) : d === 2 ? 2 : 3
  for (let t = 0; t < 300; t++) {
    const fam = new Fam()
    const sg = pick(['m', 'f'])
    const S = fam.add(sg)
    let special = null, steps = [], Z = S
    if (d <= 2 && chance(0.25)) {
      special = sg === 'm' ? ['I have no brother', "my father's son"] : ['I have no sister', "my mother's daughter"]
    } else {
      for (let i = 0; i < nSteps; i++) {
        const step = i === 0 ? pick(['father', 'mother', 'father', 'mother', 'husband', 'wife', 'onlybrother', 'onlysister']) : pick(Object.keys(STEP_WORD))
        steps.push(step)
      }
      // forbid trivial back-and-forth that returns to the speaker
      let cur = S, bad = false
      for (const s of steps) { const nx = resolveStep(fam, cur, s); if (nx == null) { bad = true; break } cur = nx }
      if (bad || cur === S) continue
      Z = cur
    }
    const pg = pick(['m', 'f'])
    const prel = pick(PRIM)
    const P = fam.add(pg)
    // "P's <prel> is Z" means Z is P's prel
    if (!fam.link(Z, prel, P)) continue
    if (REL_GENDER[prel] !== fam.g(Z)) continue
    if (special && (prel === 'brother' || prel === 'sister')) continue
    if (special && fam.siblings(S).some((s) => fam.g(s) === sg)) continue
    // every "only ..." step must still hold in the final model
    let onlyOk = true
    { let cur = S; for (const s of steps) { const nx = resolveStep(fam, cur, s); if (nx == null) { onlyOk = false; break } cur = nx } if (onlyOk && !special && cur !== Z) onlyOk = false }
    if (!onlyOk) continue
    const r = fam.relation(P, S)
    if (!r) continue
    const young = /^(son|daughter|nephew|niece|grandson|granddaughter|great-grandson|great-granddaughter|brother|sister|cousin)$/.test(r.term)
    const who = pg === 'm' ? pick(young ? ['that boy', 'that young man'] : ['that man', 'the gentleman']) : pick(young ? ['that girl', 'that young woman'] : ['that woman', 'the lady'])
    const noun = pg === 'm' ? (young ? 'boy' : 'man') : (young ? 'girl' : 'woman')
    const poss = pg === 'm' ? 'his' : 'her'
    const [sp] = namesForGenders([sg])
    const spPron = sg === 'm' ? 'his' : 'her'
    const desc = special ? special[1] : describe(steps)
    const quote = special
      ? `${special[0]}, and ${who}'s ${prel} is ${desc}.`
      : pick([`${cap(poss)} ${prel} is ${desc}.`, `${cap(who)}'s ${prel} is ${desc}.`])
    const lead = pick([`Pointing to a photograph, ${sp} said,`, `Pointing to a person in a picture, ${sp} said,`, `Introducing a ${pg === 'm' ? (young ? 'young man' : 'man') : (young ? 'young woman' : 'woman')}, ${sp} said,`, `Showing a photo on ${spPron} phone, ${sp} said,`])
    const introduce = lead.startsWith('Introducing')
    const ask = introduce ? `How is the ${pg === 'm' ? (young ? 'young man' : 'man') : (young ? 'young woman' : 'woman')} related to ${sp}?` : pick([`Whose photograph was it?`, `How is the person in the picture related to ${sp}?`])
    const q = `${lead} ‘${quote}’ ${ask}`
    const bare = ask.startsWith('Whose')
    const term = relTerm(r)
    const fmt = (w) => (bare ? `${cap(spPron)} ${w}` : cap(w))
    return {
      concept: `blood-photo-${special ? 'nosibling' : steps.join('-')}-${prel}-${sg}${pg}-${kebab(term)}`,
      q, answer: fmt(term), distractors: relDistractors(r, pg).map(fmt),
      explanation: (() => {
        const rz = fam.relation(Z, S)
        const first = special
          ? `With no ${sg === 'm' ? 'brother' : 'sister'}, “${desc}” is ${sp} ${sg === 'm' ? 'himself' : 'herself'}`
          : steps.length > 1 && rz ? `“${desc}” is ${sp}'s ${relTerm(rz)}` : `The person meant is ${sp}'s ${steps.map((s) => STEP_WORD[s]).join("'s ")}`
        return `${first}, who is the ${noun}'s ${prel}; so the ${noun} is ${sp}'s ${term}.`
      })(),
    }
  }
  return null
}

// "How is Sara's mother's brother's son related to Sara?" — chains avoiding steps that could loop back.
const CHAIN_STEPS = ['father', 'mother', 'brother', 'sister', 'son', 'daughter', 'husband', 'wife']
const KIND = { father: 'up', mother: 'up', son: 'down', daughter: 'down', brother: 'side', sister: 'side', husband: 'sp', wife: 'sp' }
function genPossessiveChain(d) {
  const n = d === 1 ? 2 : d === 2 ? 3 : pick([3, 4])
  for (let t = 0; t < 300; t++) {
    const steps = []
    for (let i = 0; i < n; i++) {
      const s = pick(CHAIN_STEPS)
      const prev = steps[i - 1]
      if (prev) {
        const a = KIND[prev], b = KIND[s]
        if ((a === 'up' && (b === 'down' || b === 'sp')) || (a === 'down' && b === 'up') || (a === 'side' && b === 'side') || (a === 'sp' && (b === 'sp' || b === 'down'))) { i--; continue }
      }
      steps.push(s)
    }
    const fam = new Fam()
    const tg = pick(['m', 'f'])
    const T = fam.add(tg)
    let cur = T, bad = false
    for (const s of steps) {
      const nx = fam.add(REL_GENDER[s])
      // nx is s of cur
      if (!fam.link(nx, s, cur)) { bad = true; break }
      cur = nx
    }
    if (bad) continue
    const r = fam.relation(cur, T)
    if (!r) continue
    if (r.term === 'cousin' && d === 3 && chance(0.5)) continue
    const [tn, xn] = namesForGenders([tg, REL_GENDER[steps[n - 1]]])
    const chainTxt = `${tn}'s ${steps.join("'s ")}`
    const form = d === 1 ? 0 : ri(0, 2)
    let q
    if (form === 0) q = `How is ${chainTxt} related to ${tn}?`
    else if (form === 1) q = `${xn} is ${`${tn}'s ${steps.slice(0, -1).join("'s ")}`}'s ${steps[n - 1]}. What is ${xn} to ${tn}?`
    else q = `${xn} is the ${steps[n - 1]} of ${tn}'s ${steps.slice(0, -1).join("'s ")}. How is ${xn} related to ${tn}?`
    const term = relTerm(r)
    return {
      concept: `blood-possessive-${tg}-${steps.join('-')}-${kebab(term)}`,
      q, answer: cap(term), distractors: relDistractors(r, REL_GENDER[steps[n - 1]]).map(cap),
      explanation: `Work outwards from ${tn}: ${steps.map((s) => s).join(' → ')}; that person is ${tn}'s ${term}.`,
    }
  }
  return null
}

const SYMBOLS = [['+', '−', '×', '÷'], ['@', '#', '$', '%'], ['*', '&', '@', '#'], ['P', 'M', 'T', 'D']]
function genCodedRelations(d) {
  const symSet = pick(SYMBOLS.slice(0, 3))
  const rels = sample(PRIM, 4)
  const codeOf = Object.fromEntries(rels.map((r, i) => [symSet[i], r]))
  const verbs = pick(['means', 'stands for', 'indicates'])
  const legend = symSet.map((s) => `‘X ${s} Y’ ${verbs} X is the ${codeOf[s]} of Y`).join('; ')
  const L = letters(4)
  const nOps = d === 1 ? 2 : 3
  const exprOf = (ops, who) => who.map((w, i) => (i ? ` ${ops[i - 1]} ` : '') + w).join('')
  const evalExpr = (ops) => {
    const fam = new Fam(); const ids = L.slice(0, ops.length + 1).map(() => fam.add(null))
    for (let i = 0; i < ops.length; i++) if (!fam.link(ids[i], codeOf[ops[i]], ids[i + 1])) return null
    return { fam, ids }
  }
  for (let t = 0; t < 200; t++) {
    const ops = Array.from({ length: nOps }, () => pick(symSet))
    const ev = evalExpr(ops)
    if (!ev) continue
    const x = ev.ids[0], y = ev.ids[nOps]
    const r = ev.fam.relation(x, y)
    if (!r || !ev.fam.g(x)) continue
    const who = L.slice(0, nOps + 1)
    if (d === 3 && chance(0.6)) {
      // which expression means ... ? three other expressions must give a different, determinate relation
      const target = r.term
      const wrong = []
      for (let u = 0; u < 200 && wrong.length < 3; u++) {
        const o2 = Array.from({ length: nOps }, () => pick(symSet))
        const e2 = evalExpr(o2)
        if (!e2) continue
        const r2 = e2.fam.relation(e2.ids[0], e2.ids[nOps])
        if (!r2 || !e2.fam.g(e2.ids[0]) || r2.term === target) continue
        const ex = exprOf(o2, who)
        if (!wrong.includes(ex)) wrong.push(ex)
      }
      if (wrong.length < 3) continue
      return {
        concept: `blood-coded-which-${rels.join('-')}-${ops.join('')}-${target}`,
        q: `If ${legend}, which expression means that ${who[0]} is the ${target} of ${who[nOps]}?`,
        answer: exprOf(ops, who), distractors: wrong,
        explanation: `${exprOf(ops, who)}: ${ops.map((o, i) => `${who[i]} is the ${codeOf[o]} of ${who[i + 1]}`).join(', ')}, so ${who[0]} is the ${target} of ${who[nOps]}.`,
      }
    }
    return {
      concept: `blood-coded-${rels.join('-')}-${ops.join('')}-${r.term}`,
      q: `If ${legend}, then in ‘${exprOf(ops, who)}’, how is ${who[0]} related to ${who[nOps]}?`,
      answer: cap(r.term), distractors: relDistractors({ term: r.term }, ev.fam.g(x)).map(cap),
      explanation: `${ops.map((o, i) => `${who[i]} is the ${codeOf[o]} of ${who[i + 1]}`).join('; ')}; hence ${who[0]} is ${who[nOps]}'s ${r.term}.`,
    }
  }
  return null
}

// Family-size puzzles: the family is built explicitly and counted.
const pl = (k, w, plural = `${w}s`) => `${k} ${k === 1 ? w : plural}`
function genFamilyCount(d) {
  for (let t = 0; t < 200; t++) {
    if (d === 3 && chance(0.7)) {
      // brothers/sisters relation puzzle solved by brute force
      const pB = pick([1, 2]), qB = pick([0, 1, -1]) // each boy: sisters = pB*(brothers) + qB
      const pG = pick([1, 2, 3]), qG = pick([0, 1, -1, 2]) // each girl: brothers = pG*(sisters) + qG
      const sols = []
      for (let b = 1; b <= 12; b++) for (let g = 1; g <= 12; g++) if (g === pB * (b - 1) + qB && b === pG * (g - 1) + qG) sols.push([b, g])
      if (sols.length !== 1) continue
      const [b, g] = sols[0]
      if (b + g < 5) continue
      const sg1 = (w, k) => (Math.abs(k) === 1 ? w.replace(/s$/, '') : w)
      const phr = (p, q, a, c) => `${p === 1 ? (q === 0 ? `as many ${a} as ${c}` : q > 0 ? `${NUMW[q]} more ${sg1(a, q)} than ${c}` : `${NUMW[-q]} ${-q === 1 ? 'fewer' : 'fewer'} ${sg1(a, q)} than ${c}`) : (q === 0 ? `${p === 2 ? 'twice' : 'three times'} as many ${a} as ${c}` : null)}`
      const boyTxt = phr(pB, qB, 'sisters', 'brothers'), girlTxt = phr(pG, qG, 'brothers', 'sisters')
      if (boyTxt.includes('null') || girlTxt.includes('null')) continue
      const ask = pick([['children', b + g], ['sons', b], ['daughters', g]])
      const q = `In a family, each son has ${boyTxt}, and each daughter has ${girlTxt}. How many ${ask[0]} are there in the family?`
      return {
        concept: `family-count-siblings-${pB}-${qB}-${pG}-${qG}-${ask[0]}`, q, answer: String(ask[1]), order: 'numeric',
        distractors: numDistractors(ask[1], [b + g, b, g, b + g - 1].filter((v) => v !== ask[1])).map(String),
        explanation: `With ${b} sons and ${g} daughters, each son has ${pl(b - 1, 'brother')} and ${pl(g, 'sister')}, and each daughter has ${pl(b, 'brother')} and ${pl(g - 1, 'sister')}; this fits both conditions and no other numbers do.`,
      }
    }
    const sons = ri(2, 4), daus = ri(1, 3)
    const couple = pick([['My wife and I have', 'me'], ['Mr and Mrs Qureshi have', 'the couple'], ['A man and his wife have', 'the couple'], ['Grandfather Rahim and his wife have', 'the couple']])
    const childTxt = pick([
      `${NUMW[sons]} sons and ${NUMW[daus]} ${daus > 1 ? 'daughters' : 'daughter'}`,
      daus === 1 ? `${NUMW[sons]} sons, and each son has exactly one sister` : `${NUMW[sons]} sons, and each son has ${NUMW[daus]} sisters`,
      daus > 1 ? `${NUMW[daus]} daughters, and each daughter has ${NUMW[sons]} brothers` : null,
    ])
    if (!childTxt) continue
    const married = d >= 2 ? pick(['all', 'allbutone']) : pick(['none', 'all'])
    const nMarried = married === 'all' ? sons : married === 'allbutone' ? sons - 1 : 0
    let marriedTxt = married === 'all' ? ' All the sons are married and live with their wives in the same house.' : married === 'allbutone' ? ' All the sons except one are married, and the wives live in the same house.' : ''
    let gs = 0, gd = 0, gTxt = ''
    if (d >= 2 && nMarried) {
      gs = ri(0, 3); gd = ri(0, 2)
      if (gs + gd === 0) continue
      gTxt = ` Each married son has ${gs ? `${NUMW[gs]} ${gs > 1 ? 'sons' : 'son'}` : ''}${gs && gd ? ' and ' : ''}${gd ? `${NUMW[gd]} ${gd > 1 ? 'daughters' : 'daughter'}` : ''}.`
    }
    // build the family explicitly
    const people = [{ g: 'm' }, { g: 'f' }]
    for (let i = 0; i < sons; i++) people.push({ g: 'm' })
    for (let i = 0; i < daus; i++) people.push({ g: 'f' })
    for (let i = 0; i < nMarried; i++) { people.push({ g: 'f' }); for (let j = 0; j < gs; j++) people.push({ g: 'm', gc: 1 }); for (let j = 0; j < gd; j++) people.push({ g: 'f', gc: 1 }) }
    const total = people.length, fem = people.filter((p) => p.g === 'f').length, mal = total - fem, gc = people.filter((p) => p.gc).length
    const asks = [['How many members are there in the family?', total], ['How many female members are there in the family?', fem], ['How many male members does the family have?', mal]]
    if (gc) asks.push(['How many grandchildren do the couple have?', gc])
    const [askTxt, ans] = pick(asks)
    const who = couple[0].startsWith('My') ? '' : ''
    void who
    const q = `${couple[0]} ${childTxt}.${marriedTxt}${gTxt} ${askTxt}`
    const naive = childTxt.includes('each son has') ? total + sons * daus - daus : total + 1
    return {
      concept: `family-count-${sons}s-${daus}d-${married}-${gs}-${gd}-${kebab(askTxt).slice(0, 30)}`,
      q, answer: String(ans), order: 'numeric',
      distractors: numDistractors(ans, [naive, total, fem, mal, ans + 2].filter((v) => v !== ans)).map(String),
      explanation: `The family has 2 parents, ${pl(sons, 'son')} and ${pl(daus, 'daughter')}${nMarried ? `, ${pl(nMarried, 'daughter-in-law', 'daughters-in-law')}` : ''}${gc ? ` and ${pl(gc, 'grandchild', 'grandchildren')}` : ''}: ${total} people, of whom ${fem} are female and ${mal} male.`,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Ordering and ranking
// ---------------------------------------------------------------------------
const CMP = [
  { gt: 'is taller than', lt: 'is shorter than', lt2: 'shorter than', gt2: 'taller than', eq: 'are of the same height', top: 'the tallest', bot: 'the shortest', nth: (k, top) => `the ${ORDW[k]} ${top ? 'tallest' : 'shortest'}`, who: 'Who' },
  { gt: 'has more money than', lt: 'has less money than', lt2: 'less than', gt2: 'more than', eq: 'have the same amount of money', top: 'the richest', bot: 'the poorest', nth: (k, top) => `the ${ORDW[k]} ${top ? 'richest' : 'poorest'}`, who: 'Who', q: { top: 'Who has the most money?', bot: 'Who has the least money?' } },
  { gt: 'scored more marks than', lt: 'scored fewer marks than', lt2: 'fewer than', gt2: 'more than', eq: 'scored equal marks', top: 'the top scorer', bot: 'the lowest scorer', nth: (k, top) => `${ordinal(k)} from the ${top ? 'top' : 'bottom'} in marks`, who: 'Who', q: { top: 'Who scored the highest marks?', bot: 'Who scored the lowest marks?' } },
  { gt: 'is older than', lt: 'is younger than', lt2: 'younger than', gt2: 'older than', eq: 'are of the same age', top: 'the oldest', bot: 'the youngest', nth: (k, top) => `the ${ORDW[k]} ${top ? 'oldest' : 'youngest'}`, who: 'Who' },
  { gt: 'is heavier than', lt: 'is lighter than', lt2: 'lighter than', gt2: 'heavier than', eq: 'weigh the same', top: 'the heaviest', bot: 'the lightest', nth: (k, top) => `the ${ORDW[k]} ${top ? 'heaviest' : 'lightest'}`, who: 'Which box', items: 'boxes' },
  { gt: 'is taller than', lt: 'is shorter than', lt2: 'shorter than', gt2: 'taller than', eq: 'are of the same height', top: 'the tallest', bot: 'the shortest', nth: (k, top) => `the ${ORDW[k]} ${top ? 'tallest' : 'shortest'}`, who: 'Which building', items: 'towers' },
  { gt: 'scored more runs than', lt: 'scored fewer runs than', lt2: 'fewer than', gt2: 'more than', eq: 'scored the same number of runs', top: 'the highest scorer', bot: 'the lowest scorer', nth: (k, top) => `${ordinal(k)} ${top ? 'highest' : 'lowest'} in runs`, who: 'Who', q: { top: 'Who made the most runs?', bot: 'Who made the fewest runs?' } },
  { gt: 'earns more than', lt: 'earns less than', lt2: 'less than', gt2: 'more than', eq: 'earn the same', top: 'the highest earner', bot: 'the lowest earner', nth: (k, top) => `the ${ORDW[k]} ${top ? 'highest' : 'lowest'} earner`, who: 'Who', q: { top: 'Who earns the most?', bot: 'Who earns the least?' } },
  { gt: 'ran faster than', lt: 'ran slower than', lt2: 'slower than', gt2: 'faster than', eq: 'ran at the same speed', top: 'the fastest', bot: 'the slowest', nth: (k, top) => `the ${ORDW[k]} ${top ? 'fastest' : 'slowest'}`, who: 'Who' },
  { gt: 'has more pages than', lt: 'has fewer pages than', lt2: 'fewer than', gt2: 'more than', eq: 'have the same number of pages', top: 'the thickest', bot: 'the thinnest', nth: (k, top) => `the ${ORDW[k]} ${top ? 'thickest' : 'thinnest'}`, who: 'Which book', items: 'books' },
]
const GRP = ['friends', 'friends', 'students who took a test', 'cousins', 'boxes', 'buildings', 'cricketers', 'colleagues', 'athletes who ran a race', 'books']
CMP.forEach((c, i) => { c.grp = GRP[i] })
function groupIntro(ctx, N) {
  const n = N.length
  return pick([`${listAnd(N)} are ${NUMW[n]} ${ctx.grp}.`, `Consider ${NUMW[n]} ${ctx.grp}: ${listAnd(N)}.`, `There are ${NUMW[n]} ${ctx.grp} — ${listAnd(N)}.`])
}
const SETTING = {
  plain: '', friends: 'Among five friends, ', class: 'In a class test, ', team: 'In a cricket team, ', office: 'In an office, ',
}
function itemNames(ctx, k) {
  if (ctx.items === 'boxes') return letters(k).map((l) => `Box ${l}`)
  if (ctx.items === 'towers') return sample(['Pearl Tower', 'Sky Tower', 'Ocean Tower', 'Crystal Tower', 'Bahria Tower', 'Sun Tower', 'River Tower', 'Hill Tower'], k)
  if (ctx.items === 'books') return letters(k).map((l) => `Book ${l}`)
  return personNames(k)
}
const askText = (ctx, key) => {
  if (key.type === 'top') return ctx.q?.top ?? `${ctx.who} is ${ctx.top}?`
  if (key.type === 'bot') return ctx.q?.bot ?? `${ctx.who} is ${ctx.bot}?`
  return `${ctx.who} is ${ctx.nth(key.k, key.fromTop)}?`
}
// models: arrays v where v[i] is the value (0 = lowest) of item i; ties allowed when tie given
function orderModels(n, tie = null) {
  if (!tie) return perms(n)
  const [a, b] = tie
  const others = [...Array(n).keys()].filter((i) => i !== b)
  return perms(n - 1).map((p) => { const v = Array(n); others.forEach((i, j) => { v[i] = p[j] }); v[b] = v[a]; return v })
}
function rankFromBottom(v, i) { return 1 + v.filter((x) => x < v[i]).length }
function rankFromTop(v, i) { return 1 + v.filter((x) => x > v[i]).length }
function askFn(key, n) {
  return (v) => {
    const hits = [...Array(n).keys()].filter((i) => key.type === 'top' ? rankFromTop(v, i) === 1 : key.type === 'bot' ? rankFromBottom(v, i) === 1 : key.fromTop ? rankFromTop(v, i) === key.k : rankFromBottom(v, i) === key.k)
    return hits.length === 1 ? String(hits[0]) : `none:${hits.join('|')}`
  }
}
function orderCluePool(ctx, N, hidden, n, opts = {}) {
  const pool = []
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (a === b) continue
    if (hidden[a] > hidden[b]) {
      pool.push({ text: `${N[a]} ${ctx.gt} ${N[b]}`, test: (v) => v[a] > v[b], kind: 'gt', a, b })
      if (opts.lt !== false) pool.push({ text: `${N[b]} ${ctx.lt} ${N[a]}`, test: (v) => v[a] > v[b], kind: 'gt', a, b })
    }
    for (let c = 0; c < n; c++) {
      if (c === a || c === b) continue
      if (hidden[b] < hidden[a] && hidden[a] < hidden[c] && a < c && chance(0.5)) pool.push({ text: `${N[a]} ${ctx.gt} ${N[b]} but ${ctx.lt2} ${N[c]}`, test: (v) => v[b] < v[a] && v[a] < v[c], kind: 'btw' })
    }
  }
  const sortedIdx = [...Array(n).keys()].sort((x, y) => hidden[x] - hidden[y])
  if (opts.only !== false && hidden[sortedIdx[1]] > hidden[sortedIdx[0]] && hidden[sortedIdx[2]] > hidden[sortedIdx[1]]) {
    const [lo, lo2] = sortedIdx
    pool.push({ text: `${N[lo2]} ${ctx.gt} only ${N[lo]}`, test: (v) => rankFromBottom(v, lo) === 1 && rankFromBottom(v, lo2) === 2 && v.filter((x) => x === v[lo]).length === 1 && v.filter((x) => x === v[lo2]).length === 1, kind: 'only' })
  }
  for (let a = 0; a < n; a++) {
    if (rankFromTop(hidden, a) !== 1) pool.push({ text: `${N[a]} is not ${ctx.top}`, test: (v) => rankFromTop(v, a) !== 1, kind: 'not' })
    if (rankFromBottom(hidden, a) !== 1) pool.push({ text: `${N[a]} is not ${ctx.bot}`, test: (v) => rankFromBottom(v, a) !== 1, kind: 'not' })
  }
  return pool
}
const joinClues = (cl) => cap(`${cl.slice(0, -1).map((c) => c.text).join('; ')}${cl.length > 1 ? '; and ' : ''}${cl[cl.length - 1].text}.`).replace(/; and /, cl.length === 2 ? ' and ' : '; and ')
const cfgFor = (d) => (d === 1 ? { n: pick([4, 5]), min: 2, max: 3 } : d === 2 ? { n: 5, min: 3, max: 4 } : { n: pick([5, 6]), min: 4, max: 5 })

function genComparisonExtreme(d) {
  const ctx = pick(CMP)
  const { n, min, max } = cfgFor(d)
  const N = itemNames(ctx, n)
  const hidden = shuffle([...Array(n).keys()])
  const key = { type: pick(['top', 'bot']) }
  const pz = buildPuzzle({ models: orderModels(n), pool: orderCluePool(ctx, N, hidden, n), ask: askFn(key, n), minClues: min, maxClues: max })
  if (!pz || pz.answer.startsWith('none')) return null
  const ans = N[+pz.answer]
  const q = `${groupIntro(ctx, N)} ${joinClues(presentOrder(pz.clues))} ${askText(ctx, key)}`
  return {
    concept: `ordering-extreme-${n}-${kebab(signature(q)).slice(0, 80)}-${hash36(q)}`,
    q, answer: ans, distractors: sample(N.filter((x) => x !== ans), 3),
    explanation: `The only order consistent with every clue for the ${key.type === 'top' ? 'top' : 'bottom'} place puts ${ans} there; each other candidate is beaten by someone (${pz.clues.length} clues combined).`,
  }
}

function genNthPosition(d) {
  const ctx = pick(CMP)
  const { n, min, max } = cfgFor(d)
  const N = itemNames(ctx, n)
  const useTie = d >= 2 && chance(0.35)
  const tie = useTie ? sample([...Array(n).keys()], 2) : null
  let hidden = shuffle([...Array(n).keys()])
  if (tie) { hidden = orderModels(n, tie)[ri(0, orderModels(n, tie).length - 1)] }
  const key = { type: 'nth', k: 2, fromTop: chance(0.5) }
  if (d === 3 && n === 6 && chance(0.4)) key.k = 3
  const fixed = tie ? [{ text: `${N[tie[0]]} and ${N[tie[1]]} ${ctx.eq}`, test: (v) => v[tie[0]] === v[tie[1]] }] : []
  const models = tie ? orderModels(n, tie) : orderModels(n)
  const pz = buildPuzzle({ models, pool: orderCluePool(ctx, N, hidden, n, { only: !tie }), ask: askFn(key, n), minClues: min, maxClues: max + (tie ? 1 : 0), fixed })
  if (!pz || pz.answer.startsWith('none')) return null
  const ans = N[+pz.answer]
  const q = `${groupIntro(ctx, N)} ${joinClues(presentOrder(pz.clues))} ${ctx.who} is ${ctx.nth(key.k, key.fromTop)}${ctx.items === 'towers' ? ' among all the buildings' : ''}?`
  return {
    concept: `ordering-nth-${key.k}-${key.fromTop ? 'top' : 'bottom'}-${hash36(q)}`,
    q, answer: ans, distractors: sample(N.filter((x) => x !== ans), 3),
    explanation: `In every arrangement that satisfies the clues, exactly ${key.k - 1} ${key.k - 1 === 1 ? 'item is' : 'items are'} ${key.fromTop ? 'above' : 'below'} ${ans}, so ${ans} is ${ctx.nth(key.k, key.fromTop)}.`,
  }
}

function genConditionalExtreme(d) {
  const ctx = pick(CMP.filter((c) => !c.items))
  const n = d === 3 ? pick([5, 6]) : 5
  const N = itemNames(ctx, n)
  const hidden = shuffle([...Array(n).keys()])
  const key = { type: pick(['top', 'bot', 'top']) }
  const models = orderModels(n)
  const ask = askFn(key, n)
  const pool = orderCluePool(ctx, N, hidden, n, { only: false }).filter((c) => c.kind !== 'not')
  for (let t = 0; t < 60; t++) {
    const base = []
    let live = models
    for (const c of shuffle(pool)) {
      if (base.length >= (d === 1 ? 2 : d === 2 ? 3 : 3)) break
      const nx = live.filter(c.test)
      if (nx.length < live.length && new Set(nx.map(ask)).size > 1) { base.push(c); live = nx }
    }
    if (new Set(live.map(ask)).size < 2) continue
    const cond = shuffle(pool).find((c) => !base.includes(c) && c.kind === 'gt' && new Set(live.filter(c.test).map(ask)).size === 1 && new Set(models.filter(c.test).map(ask)).size > 1)
    if (!cond) continue
    const ansIdx = +ask(live.filter(cond.test)[0])
    if (Number.isNaN(ansIdx)) continue
    const ans = N[ansIdx]
    const qTail = askText(ctx, key)
    const q = `${groupIntro(ctx, N)} ${joinClues(base)} If ${cond.text}, ${qTail.charAt(0).toLowerCase()}${qTail.slice(1)}`
    const possible = new Set(live.map(ask))
    const dist = shuffle(N.filter((x, i) => x !== ans && possible.has(String(i)))).concat(shuffle(N.filter((x, i) => x !== ans && !possible.has(String(i)))))
    return {
      concept: `ordering-conditional-${key.type}-${hash36(q)}`,
      q, answer: ans, distractors: dist.slice(0, 3),
      explanation: `The first statements leave ${[...possible].map((i) => N[+i]).join(' or ')} as possible; adding "${cond.text}" leaves only ${ans} in that place.`,
    }
  }
  return null
}

function genOrderMustBeTrue(d) {
  const ctx = pick(CMP)
  const { n, min, max } = cfgFor(d)
  const N = itemNames(ctx, n)
  const hidden = shuffle([...Array(n).keys()])
  const models = orderModels(n)
  const pool = orderCluePool(ctx, N, hidden, n)
  for (let t = 0; t < 40; t++) {
    const seenPair = new Set()
    const cl = shuffle(pool.filter((c) => c.kind !== 'not')).filter((c) => { const key = c.kind === 'gt' ? `${c.a}-${c.b}` : c.text; if (seenPair.has(key)) return false; seenPair.add(key); return true }).slice(0, ri(min, max))
    const live = models.filter((m) => cl.every((c) => c.test(m)))
    if (!live.length || live.length === models.length) continue
    const stated = new Set(cl.filter((c) => c.kind === 'gt').map((c) => `${c.a}>${c.b}`))
    const cands = []
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) cands.push({ text: `${N[a]} ${ctx.gt} ${N[b]}`, test: (v) => v[a] > v[b], key: `${a}>${b}` })
    for (let a = 0; a < n; a++) { cands.push({ text: `${N[a]} is ${ctx.top}`, test: (v) => rankFromTop(v, a) === 1, key: `top${a}` }); cands.push({ text: `${N[a]} is ${ctx.bot}`, test: (v) => rankFromBottom(v, a) === 1, key: `bot${a}` }) }
    const cls = (c) => { const k = live.filter(c.test).length; return k === live.length ? 'T' : k === 0 ? 'F' : 'U' }
    const truths = cands.filter((c) => cls(c) === 'T' && !stated.has(c.key))
    if (!truths.length) continue
    const right = pick(truths)
    const wrongs = shuffle(cands.filter((c) => cls(c) !== 'T'))
    const fs = wrongs.filter((c) => cls(c) === 'F'), us = wrongs.filter((c) => cls(c) === 'U')
    if (fs.length < 1 || us.length < 1) continue
    const dis = [fs[0], us[0], ...shuffle([...fs.slice(1), ...us.slice(1)])].slice(0, 3)
    const q = `${groupIntro(ctx, N)} ${joinClues(presentOrder(cl))} Which of the following must be true?`
    return {
      concept: `ordering-must-be-true-${hash36(q + right.text)}`,
      q, answer: cap(right.text), distractors: dis.map((c) => cap(c.text)),
      explanation: `“${cap(right.text)}” holds in every order that fits the clues; each other option fails in at least one such order.`,
    }
  }
  return null
}

// Rank arithmetic --------------------------------------------------------------
const RANK_CTX = [
  { grp: 'class', unit: 'student', units: 'students', top: 'top', bot: 'bottom', place: (x) => `in a class` },
  { grp: 'merit list', unit: 'candidate', units: 'candidates', top: 'top', bot: 'bottom', place: () => 'in a merit list' },
  { grp: 'row', unit: 'student', units: 'students', top: 'left', bot: 'right', place: () => 'in a row of students', line: true },
  { grp: 'queue', unit: 'person', units: 'people', top: 'front', bot: 'back', place: () => 'in a queue at a bank', line: true },
  { grp: 'shelf', unit: 'book', units: 'books', top: 'left', bot: 'right', place: () => 'on a shelf', book: true },
  { grp: 'line', unit: 'car', units: 'cars', top: 'front', bot: 'back', place: () => 'in a line of cars at a toll plaza', car: true },
  { grp: 'queue', unit: 'person', units: 'people', top: 'front', bot: 'back', place: () => 'in a queue at a ticket counter', line: true },
  { grp: 'line', unit: 'student', units: 'students', top: 'front', bot: 'back', place: () => 'in a line at the morning assembly', line: true },
  { grp: 'queue', unit: 'person', units: 'people', top: 'front', bot: 'back', place: () => 'in a queue outside a passport office', line: true },
  { grp: 'row', unit: 'tree', units: 'trees', top: 'east end', bot: 'west end', place: () => 'in a row of trees', tree: true },
]
function subjectFor(c) {
  if (c.book) return pick(['a history book', 'a dictionary', 'an atlas'])
  if (c.car) return pick(['a white car', 'a red car', 'a jeep'])
  if (c.tree) return pick(['a neem tree', 'a mango tree', 'a banyan tree'])
  return pick(personNames(1).concat(mixedNames(1)))
}
const placeWith = (c, place, n) => place.replace(/^in a (\w+(?: list)?)(?: of \w+)?/, (m, nn) => `in a ${nn} of ${n} ${c.units}`)
const fromTxt = (c, k, side) => `${ordinal(k)} from the ${side}`
function genRankTopBottom(d) {
  const c = pick(RANK_CTX)
  const X = subjectFor(c)
  const Xc = cap(X)
  const tmpl = d === 1 ? pick(['R1', 'R2', 'R3']) : d === 2 ? pick(['R1b', 'R5', 'R7', 'R3b']) : pick(['R5b', 'R7', 'R7b'])
  const place = c.place()
  let q, ans, expl, cands
  const t = ri(5, 25), b = ri(5, 25)
  if (tmpl === 'R1') {
    ans = t + b - 1; cands = [t + b, t + b - 2, t + b + 1]
    q = `${Xc} is ${fromTxt(c, t, c.top)} and ${fromTxt(c, b, c.bot)} ${place}. How many ${c.units} are there?`
    expl = `${t - 1} ${c.units} are on one side and ${b - 1} on the other, plus ${X}: ${t - 1} + ${b - 1} + 1 = ${ans}.`
  } else if (tmpl === 'R1b') {
    ans = t + b - 1; cands = [t + b, t + b - 2, t + b + 1]
    q = `${cap(place)}, ${X} is ${ordinal(t)} counted from the ${c.top}. Counting from the ${c.bot}, ${c.book || c.car || c.tree ? `the ${X.replace(/^an? /, '')}` : X} is ${ordinal(b)}. What is the total number of ${c.units}?`
    expl = `Total = ${t} + ${b} − 1 = ${ans}, because ${X} is counted twice.`
  } else if (tmpl === 'R2') {
    const n = t + b + ri(0, 10)
    ans = n - t + 1; cands = [n - t, n - t + 2, n - t - 1]
    q = `There are ${n} ${c.units} ${place.replace(/^in a (row|queue|line|class|merit list) of \w+/, 'in a $1')}. ${Xc} is ${fromTxt(c, t, c.top)}. What is ${c.book || c.car || c.tree ? 'its' : 'the'} position from the ${c.bot}?`.replace(' in a class.', ' in a class.')
    expl = `Position from the ${c.bot} = ${n} − ${t} + 1 = ${ans}.`
  } else if (tmpl === 'R3' || tmpl === 'R3b') {
    const m = ri(4, 30)
    if (tmpl === 'R3') { ans = t + m; cands = [t + m - 1, t + m + 1, m - t > 0 ? m - t : t + m + 2]; q = `${Xc} is ${fromTxt(c, t, c.top)} ${place}, and ${m} ${c.units} come after ${c.book || c.car || c.tree ? 'it' : X} towards the ${c.bot}. How many ${c.units} are there in all?`; expl = `${t} (up to and including ${X}) + ${m} = ${ans}.` }
    else { const n = t + m; ans = n - t + 1; cands = [n - t, n - t + 2, t]; q = `${cap(placeWith(c, place, n))}, exactly ${t - 1} ${c.units} are ahead of ${X} counting from the ${c.top}. What is ${X}'s position from the ${c.bot}?`; expl = `${X} is ${ordinal(t)} from the ${c.top}, so from the ${c.bot}: ${n} − ${t} + 1 = ${ans}.` }
  } else if (tmpl === 'R5' || tmpl === 'R5b') {
    if (!(c.grp === 'class' || c.grp === 'merit list')) return null
    const f = ri(3, 12)
    ans = t + b - 1 + f; cands = [t + b + f, t + b - 1, t + b + f - 2]
    q = tmpl === 'R5'
      ? `Among the ${c.units} who passed a test, ${X} ranked ${ordinal(t)} from the top and ${ordinal(b)} from the bottom. If ${f} ${c.units} failed, how many ${c.units} took the test?`
      : `${Xc} is ${ordinal(t)} from the top and ${ordinal(b)} from the bottom among the successful ${c.units}. Another ${f} ${c.units} were absent and ${ri(2, 6)} did not qualify... `
    if (tmpl === 'R5b') {
      const ab = ri(2, 6), nq = ri(2, 6)
      ans = t + b - 1 + ab + nq; cands = [t + b + ab + nq, t + b - 1 + nq, t + b - 1 + ab]
      q = `In a recruitment test, ${X} was ${ordinal(t)} from the top and ${ordinal(b)} from the bottom among those who qualified. ${ab} ${c.units} were absent and ${nq} appeared but failed. How many ${c.units} had registered?`
      expl = `Qualified = ${t} + ${b} − 1 = ${t + b - 1}; adding ${ab} absent and ${nq} failed gives ${ans}.`
    } else expl = `Passed = ${t} + ${b} − 1 = ${t + b - 1}; with ${f} failures, ${ans} took the test.`
  } else {
    // R7: Y is g places below X; Y is b-th from bottom
    const Y = mixedNames(3).find((y) => y !== X && y[0] !== X[0])
    const g = ri(3, 9)
    ans = t + g + b - 1; cands = [t + g + b, t + b - 1, t + g + b - 2]
    q = tmpl === 'R7'
      ? `${cap(place)}, ${X} is ${fromTxt(c, t, c.top)}. ${Y} is ${g} places behind ${X} and ${fromTxt(c, b, c.bot)}. How many ${c.units} are there?`
      : `${Xc} ${c.line ? 'is' : 'ranks'} ${ordinal(t)} from the ${c.top} ${place}. ${Y}, who is ${ordinal(b)} from the ${c.bot}, is exactly ${g} ${c.line ? 'places behind' : 'ranks below'} ${X}. Find the total number of ${c.units}.`
    expl = `${Y} is ${ordinal(t + g)} from the ${c.top} and ${ordinal(b)} from the ${c.bot}: ${t + g} + ${b} − 1 = ${ans}.`
    if (c.book || c.car || c.tree) return null
  }
  if (!q || q.includes('...')) return null
  return {
    concept: `ranking-${tmpl}-${c.grp}-${kebab(q).slice(0, 60)}-${hash36(q)}`,
    q, answer: String(ans), order: 'numeric', distractors: numDistractors(ans, cands).map(String), explanation: expl,
  }
}

function genQueueBetween(d) {
  const c = pick(RANK_CTX.filter((x) => x.line))
  const [A, B] = mixedNames(2)
  const tmpl = d === 1 ? pick(['Q1', 'Q4']) : d === 2 ? pick(['Q2', 'Q3', 'Q4b']) : pick(['Q3b', 'Q6', 'Q5'])
  const front = c.top, back = c.bot
  const place = c.place()
  let q, ans, expl, cands
  if (tmpl === 'Q1') {
    const p = ri(3, 12), r = p + ri(3, 12)
    ans = r - p - 1; cands = [r - p, r - p + 1, r + p]
    q = `${cap(place)}, ${A} is ${ordinal(p)} from the ${front} and ${B} is ${ordinal(r)} from the ${front}. How many ${c.units} are there between them?`
    expl = `Positions ${p + 1} to ${r - 1} lie between them: ${r} − ${p} − 1 = ${ans}.`
  } else if (tmpl === 'Q4' || tmpl === 'Q4b') {
    const n = ri(20, 45), p = ri(3, 12), m = ri(3, 10)
    ans = n - (p + m) + 1; cands = [n - (p + m), n - p - m + 2, n - p + 1]
    q = tmpl === 'Q4'
      ? `There are ${n} ${c.units} ${place.replace(/^in a \w+ of \w+/, 'in a line').replace(/^in a queue at a bank/, 'in a queue at a bank')}. ${A} is ${ordinal(p)} from the ${front}, and ${B} stands ${m} places behind ${A}. What is ${B}'s position from the ${back}?`
      : `${cap(placeWith(c, place, n))}, ${A} is ${ordinal(p)} from the ${front}. ${B} is ${m} places further back than ${A}. Counting from the ${back}, where does ${B} stand?`
    expl = `${B} is ${ordinal(p + m)} from the ${front}, so ${n} − ${p + m} + 1 = ${ans} from the ${back}.`
  } else if (tmpl === 'Q2') {
    const n = ri(25, 45), p = ri(4, 12), qb = ri(4, 12)
    const posB = n - qb + 1
    if (posB <= p + 2) return null
    ans = posB - p - 1; cands = [posB - p, n - p - qb, posB - p + 1]
    q = `${cap(placeWith(c, place, n))}, ${A} is ${ordinal(p)} from the ${front} and ${B} is ${ordinal(qb)} from the ${back}. How many ${c.units} stand between ${A} and ${B}?`
    expl = `${B} is ${ordinal(posB)} from the ${front} (${n} − ${qb} + 1), so ${posB} − ${p} − 1 = ${ans} stand between.`
  } else if (tmpl === 'Q3' || tmpl === 'Q3b') {
    const p = ri(4, 14), qb = ri(4, 14), m = ri(2, 9)
    ans = p + m + qb; cands = [p + m + qb - 1, p + m + qb + 1, p + qb - 1]
    q = tmpl === 'Q3'
      ? `${cap(place)}, ${A} is ${ordinal(p)} from the ${front} and ${B} is ${ordinal(qb)} from the ${back}. If ${m} ${c.units} stand between them and ${A} is ahead of ${B}, how many ${c.units} are there?`
      : `${A} is ${ordinal(p)} from the ${front} ${place}; ${B} is behind ${A} and ${ordinal(qb)} from the ${back}. Exactly ${m} ${c.units} separate the two. What is the length of the line in ${c.units}?`
    expl = `${p} (up to ${A}) + ${m} between + ${qb} (from ${B} to the ${back}) = ${ans}.`
  } else if (tmpl === 'Q6') {
    const n = ri(25, 45), qb = ri(4, 12)
    const posB = n - qb + 1
    const p = posB + ri(3, 8)
    if (p > n) return null
    ans = p - posB - 1; cands = [p - posB, n - p - qb, p - posB + 1]
    q = `${cap(placeWith(c, place, n))}, ${A} is ${ordinal(n - p + 1)} from the ${back}, while ${B} is ${ordinal(qb)} from the ${back}. How many ${c.units} are there between them?`
    expl = `From the ${back}, ${B} is ${ordinal(qb)} and ${A} is ${ordinal(n - p + 1)}, so ${n - p + 1 > qb ? `${n - p + 1} − ${qb}` : `${qb} − ${n - p + 1}`} − 1 = ${ans} stand between.`
    if (n - p + 1 <= qb) { ans = qb - (n - p + 1) - 1 }
    if (ans <= 0) return null
  } else {
    const n = 2 * ri(9, 20) + 1, mid = (n + 1) / 2, p = ri(2, mid - 3)
    ans = mid - p - 1; cands = [mid - p, mid - p + 1, n - p]
    q = `${cap(placeWith(c, place, n))}, ${B} stands exactly in the middle and ${A} is ${ordinal(p)} from the ${front}. How many ${c.units} are between ${A} and ${B}?`
    expl = `The middle position of ${n} is ${mid}; between positions ${p} and ${mid} there are ${mid} − ${p} − 1 = ${ans}.`
  }
  return {
    concept: `queue-${tmpl}-${hash36(q)}`, q, answer: String(ans), order: 'numeric',
    distractors: numDistractors(ans, cands).map(String), explanation: expl,
  }
}

function genRankInterchange(d) {
  const c = pick(RANK_CTX.filter((x) => x.line || x.grp === 'class'))
  const [A, B] = mixedNames(2)
  const L = c.top, Rt = c.bot
  const place = c.place()
  const n = ri(20, 45), l = ri(4, 14), posB = ri(l + 3, n - 3)
  const r = n - posB + 1
  let q, ans, expl, cands
  const tmpl = d === 1 ? 'I4' : d === 2 ? pick(['I1', 'I2']) : 'I3'
  if (tmpl === 'I4') {
    ans = n - r + 1; cands = [n - r, n - l + 1, r]
    q = `${cap(placeWith(c, place, n))}, ${A} is ${ordinal(l)} from the ${L} and ${B} is ${ordinal(r)} from the ${Rt}. If ${A} and ${B} interchange their places, what will be ${A}'s new position from the ${L}?`
    expl = `${A} moves to ${B}'s place, which is ${n} − ${r} + 1 = ${ans} from the ${L}.`
  } else if (tmpl === 'I1') {
    ans = n; cands = [n - 1, n + 1, n - 2]
    q = `${cap(place)}, ${A} is ${ordinal(l)} from the ${L} and ${B} is ${ordinal(r)} from the ${Rt}. When they interchange positions, ${A} becomes ${ordinal(posB)} from the ${L}. How many ${c.units} are there?`
    expl = `${A}'s new place is ${B}'s old place: ${ordinal(posB)} from the ${L} and ${ordinal(r)} from the ${Rt}, so ${posB} + ${r} − 1 = ${n}.`
  } else if (tmpl === 'I2') {
    const rB = n - l + 1
    ans = n; cands = [n - 1, n + 1, n + 2]
    q = `${A} and ${B} are standing ${place.replace(/^in a /, 'in a ')}; ${A} is ${ordinal(l)} from the ${L}. After ${A} and ${B} swap places, ${B} is ${ordinal(rB)} from the ${Rt}. How many ${c.units} are there?`
    expl = `${B} now occupies ${A}'s old place, ${ordinal(l)} from the ${L} and ${ordinal(rB)} from the ${Rt}: ${l} + ${rB} − 1 = ${n}.`
  } else {
    ans = posB - l - 1; cands = [posB - l, posB - l + 1, n - posB]
    q = `${cap(place)}, ${A} is ${ordinal(l)} from the ${L}. ${A} and ${B} exchange places, after which ${A} is ${ordinal(posB)} from the ${L}. How many ${c.units} stand between ${A} and ${B}?`
    expl = `${B} was ${ordinal(posB)} from the ${L} and ${A} was ${ordinal(l)}; between them are ${posB} − ${l} − 1 = ${ans}, and a swap does not change that.`
  }
  return { concept: `rank-interchange-${tmpl}-${hash36(q)}`, q, answer: String(ans), order: 'numeric', distractors: numDistractors(ans, cands).map(String), explanation: expl }
}

// ---------------------------------------------------------------------------
// Seating arrangement (linear and circular); model m[i] = seat of person i
// ---------------------------------------------------------------------------
// Linear seats 0..n-1 run west→east. Facing north, a person's left is the lower index (L = -1);
// facing south it is the higher index (L = +1). Circular seats run so that, facing the centre,
// a person's right neighbour is seat+1 (L = -1); facing outward the sides swap (L = +1).
function seatModels(n, circle) {
  if (!circle) return perms(n)
  return perms(n - 1).map((p) => [0, ...p.map((x) => x + 1)])
}
const wrap = (x, n) => ((x % n) + n) % n
function seatingPool(N, hidden, S) {
  const { n, circle, L } = S
  const pool = []
  const at = (m, a, off) => circle ? wrap(m[a] + off, n) : m[a] + off
  const add = (text, test) => { if (test(hidden)) pool.push({ text, test }) }
  const kw = (k) => (k === 1 ? 'immediately' : `${ORDW[k]}`)
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (a === b) continue
    for (const k of [1, 2, 3]) {
      if (k > (circle ? Math.floor(n / 2) : n - 1)) continue
      const txtL = k === 1 ? pick([`${N[a]} sits immediately to the left of ${N[b]}`, `${N[a]} is to the immediate left of ${N[b]}`, `${N[a]} is next to the left of ${N[b]}`]) : `${N[a]} is ${kw(k)} to the left of ${N[b]}`
      const txtR = k === 1 ? pick([`${N[a]} sits immediately to the right of ${N[b]}`, `${N[a]} is to the immediate right of ${N[b]}`]) : `${N[a]} is ${kw(k)} to the right of ${N[b]}`
      add(txtL, (m) => m[a] === at(m, b, k * L))
      add(txtR, (m) => m[a] === at(m, b, -k * L))
    }
    if (a < b) {
      const dist = (m) => circle ? Math.min(wrap(m[a] - m[b], n), wrap(m[b] - m[a], n)) : Math.abs(m[a] - m[b])
      add(pick([`${N[a]} does not sit next to ${N[b]}`, `${N[a]} and ${N[b]} are not neighbours`]), (m) => dist(m) > 1)
      add(pick([`${N[a]} sits next to ${N[b]}`, `${N[a]} and ${N[b]} sit side by side`]), (m) => dist(m) === 1)
      if (!circle) add(`exactly one person sits between ${N[a]} and ${N[b]}`, (m) => dist(m) === 2)
      if (circle && n % 2 === 0) add(pick([`${N[a]} sits opposite ${N[b]}`, `${N[a]} is directly opposite ${N[b]}`]), (m) => wrap(m[a] - m[b], n) === n / 2)
      if (circle && n % 2 === 0) add(`${N[a]} is not opposite ${N[b]}`, (m) => wrap(m[a] - m[b], n) !== n / 2)
      if (!circle) add(`${N[a]} sits somewhere to the ${L < 0 ? 'left' : 'right'} of ${N[b]}`, (m) => m[a] < m[b])
    }
    for (let c = b + 1; c < n; c++) {
      if (c === a) continue
      add(pick([`${N[a]} sits between ${N[b]} and ${N[c]}`, `${N[a]} is seated between ${N[b]} and ${N[c]}`]), (m) => {
        const nb = (x, y) => (circle ? Math.min(wrap(m[x] - m[y], n), wrap(m[y] - m[x], n)) : Math.abs(m[x] - m[y])) === 1
        return nb(a, b) && nb(a, c)
      })
    }
  }
  if (!circle) {
    for (let a = 0; a < n; a++) {
      add(`${N[a]} sits at one of the ends`, (m) => m[a] === 0 || m[a] === n - 1)
      add(`${N[a]} does not sit at either end`, (m) => m[a] !== 0 && m[a] !== n - 1)
      const leftSeat = L < 0 ? 0 : n - 1
      add(`${N[a]} is at the extreme left end`, (m) => m[a] === leftSeat)
      add(`${N[a]} is at the extreme right end`, (m) => m[a] === n - 1 - leftSeat)
      if (n % 2) add(`${N[a]} sits in the middle of the row`, (m) => m[a] === (n - 1) / 2)
    }
    if (n % 2 === 0) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      add(`${N[a]} and ${N[b]} are in the centre`, (m) => Math.min(m[a], m[b]) === n / 2 - 1 && Math.max(m[a], m[b]) === n / 2)
      add(`${N[a]} and ${N[b]} are at the ends`, (m) => Math.min(m[a], m[b]) === 0 && Math.max(m[a], m[b]) === n - 1)
    }
  }
  return pool
}
function seatAsks(N, S) {
  const { n, circle, L } = S
  const asks = []
  const who = (m, seat) => m.indexOf(seat)
  const off = (m, a, k) => { const s = circle ? wrap(m[a] + k, n) : m[a] + k; return s < 0 || s >= n ? -1 : who(m, s) }
  for (let a = 0; a < n; a++) {
    asks.push({ text: `Who sits immediately to the right of ${N[a]}?`, f: (m) => off(m, a, -L), about: [a] })
    asks.push({ text: `Who is to the immediate left of ${N[a]}?`, f: (m) => off(m, a, L), about: [a] })
    asks.push({ text: `Who is second to the left of ${N[a]}?`, f: (m) => off(m, a, 2 * L), about: [a] })
    asks.push({ text: `Who sits second to the right of ${N[a]}?`, f: (m) => off(m, a, -2 * L), about: [a] })
    if (circle && n % 2 === 0) asks.push({ text: `Who sits opposite ${N[a]}?`, f: (m) => off(m, a, n / 2), about: [a] })
    if (circle) asks.push({ text: `Who are the immediate neighbours of ${N[a]}?`, pair: true, f: (m) => [off(m, a, 1), off(m, a, -1)].sort().join('&'), about: [a] })
    if (circle) asks.push({ text: `What is the position of ${N[a]}?`, pair: true, f: (m) => [off(m, a, 1), off(m, a, -1)].sort().join('&'), about: [a], between: true })
  }
  if (!circle) {
    const leftSeat = L < 0 ? 0 : n - 1
    asks.push({ text: 'Who sits at the extreme left end?', f: (m) => who(m, leftSeat) })
    asks.push({ text: 'Who sits at the extreme right end?', f: (m) => who(m, n - 1 - leftSeat) })
    if (n % 2) asks.push({ text: 'Who sits in the middle?', f: (m) => who(m, (n - 1) / 2) })
    asks.push({ text: 'Which pair sits at the two ends?', pair: true, f: (m) => [who(m, 0), who(m, n - 1)].sort().join('&') })
  }
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (a === b) continue
    asks.push({ text: `What is the position of ${N[a]} with respect to ${N[b]}?`, rel: true, f: (m) => {
      let dlt = m[a] - m[b]
      if (circle) { dlt = wrap(dlt, n); if (dlt > n / 2) dlt -= n; if (n % 2 === 0 && Math.abs(dlt) === n / 2) return 'opp' }
      const k = Math.abs(dlt)
      if (k > 3) return 'far'
      const side = (dlt * L > 0) ? 'left' : 'right'
      return `${k}-${side}`
    }, about: [a, b] })
  }
  return asks
}
const relLabel = (key) => {
  if (key === 'opp') return 'Opposite'
  const [k, side] = key.split('-')
  return +k === 1 ? `Immediately to the ${side}` : `${cap(ORDW[+k])} to the ${side}`
}
const SEAT_SETTINGS = {
  north: [(n, N) => `${cap(NUMW[n])} friends, ${listAnd(N)}, are sitting in a row facing north.`, (n, N) => `${listAnd(N)} sit on a bench facing north.`,
    (n, N) => `${cap(NUMW[n])} students, ${listAnd(N)}, sit in a row in an exam hall, all facing north.`, (n, N) => `${listAnd(N)} are standing in a line facing north.`],
  south: [(n, N) => `${listAnd(N)} are sitting in a row facing south.`, (n, N) => `${cap(NUMW[n])} panellists, ${listAnd(N)}, sit in a row on a stage facing south towards the audience.`,
    (n, N) => `For a team photograph, ${listAnd(N)} stand in a line facing south.`],
  centre: [(n, N) => `${cap(NUMW[n])} friends, ${listAnd(N)}, sit around a circular table facing the centre.`, (n, N) => `${listAnd(N)} stand in a circle facing the centre.`,
    (n, N) => `${cap(NUMW[n])} colleagues, ${listAnd(N)}, are seated at a round table facing the centre.`, (n, N) => `At a family dinner, ${listAnd(N)} sit around a round table facing the centre.`],
  outward: [(n, N) => `${listAnd(N)} are sitting around a circular table facing away from the centre.`, (n, N) => `${cap(NUMW[n])} guards, ${listAnd(N)}, stand in a circle facing outward.`,
    (n, N) => `${cap(NUMW[n])} children, ${listAnd(N)}, sit in a ring facing outwards.`],
}
function genSeating(d, variant) {
  const S = variant === 'north' ? { circle: false, L: -1 } : variant === 'south' ? { circle: false, L: 1 } : variant === 'outward' ? { circle: true, L: 1 } : { circle: true, L: -1 }
  const oppFamily = variant === 'opposite'
  S.n = oppFamily ? 6 : d === 1 ? 5 : d === 2 ? pick([5, 6]) : 6
  const n = S.n
  const N = personNames(n)
  const models = seatModels(n, S.circle)
  const hidden = models[ri(0, models.length - 1)]
  let pool = seatingPool(N, hidden, S)
  if (oppFamily) pool = pool.filter((c) => /opposite|between|immediate|next to|neighbours/.test(c.text))
  let asks = seatAsks(N, S).filter((a) => { const v = a.f(hidden); return v !== -1 && v !== 'far' && !String(v).includes('-1') })
  if (oppFamily) asks = asks.filter((a) => /opposite/.test(a.text))
  else if (S.circle && d === 1) asks = asks.filter((a) => !a.rel)
  const ask = pick(asks)
  const minC = d === 1 ? 2 : d === 2 ? 3 : 4
  const maxC = d === 1 ? 3 : d === 2 ? 4 : 5
  const pz = buildPuzzle({ models, pool, ask: (m) => String(ask.f(m)), minClues: minC, maxClues: maxC })
  if (!pz) return null
  const ansKey = pz.answer
  if (ansKey === '-1' || ansKey === 'far' || ansKey.includes('-1&') || ansKey.endsWith('&-1')) return null
  // clue text must not mention the answer trivially as the asked relation; also, all shown persons must be used
  const setting = pick(SEAT_SETTINGS[oppFamily ? 'centre' : variant])(n, N)
  const fmt = (key) => {
    if (ask.rel) return relLabel(key)
    if (ask.pair) { const [x, y] = key.split('&').map(Number); return ask.between ? `Between ${N[x]} and ${N[y]}` : `${N[x]} and ${N[y]}` }
    return N[+key]
  }
  const answer = fmt(ansKey)
  let distractors
  if (ask.rel) {
    const labels = ['1-left', '1-right', '2-left', '2-right', '3-left', '3-right'].filter((k) => S.circle ? +k[0] <= Math.floor((n - 1) / 2) : true)
    if (S.circle && n % 2 === 0) labels.push('opp')
    const possible = new Set(models.map((m) => ask.f(m)))
    distractors = shuffle(labels.filter((k) => k !== ansKey)).sort((x, y) => possible.has(y) - possible.has(x)).slice(0, 3).map(relLabel)
  } else if (ask.pair) {
    const pairs = []
    for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) if (!(ask.about ?? []).includes(x) && !(ask.about ?? []).includes(y)) pairs.push(`${x}&${y}`)
    distractors = shuffle(pairs.filter((k) => k !== ansKey)).slice(0, 3).map(fmt)
  } else {
    const possible = new Set(models.map((m) => String(ask.f(m))))
    distractors = shuffle(N.map((_, i) => String(i)).filter((k) => k !== ansKey && !(ask.about ?? []).includes(+k))).sort((x, y) => possible.has(y) - possible.has(x)).slice(0, 3).map(fmt)
  }
  const cl = presentOrder(pz.clues)
  const q = `${setting} ${cap(cl.map((c) => c.text).join('; '))}. ${ask.text}`
  const layout = S.circle ? `going round the table` : `from ${S.L < 0 ? 'left to right' : 'right to left (their left to right)'}`
  const listing = `${[...pz.models[0]].map((_, s) => N[pz.models[0].indexOf(s)]).join(', ')} (${S.circle ? 'anticlockwise as seen from above' : 'west to east'})`
  const sol = pz.models.length === 1 ? ` The only arrangement that fits is ${listing}.` : ` ${pz.models.length} arrangements fit (for example ${listing}) and all give the same answer.`
  void layout
  return {
    concept: `seating-${variant}-${n}-${hash36(q)}`,
    q, answer, distractors,
    explanation: `${S.circle ? `Facing ${S.L < 0 ? 'the centre' : 'outward'}, a person's right is ${S.L < 0 ? 'anticlockwise' : 'clockwise'} as seen from above.` : `Facing ${variant === 'south' ? 'south, each person’s left is towards the east' : 'north, each person’s left is towards the west'}.`}${sol} Hence the answer is ${answer}.`,
  }
}
const genSeatNorth = (d) => genSeating(d, 'north')
const genSeatSouth = (d) => genSeating(d, 'south')
const genSeatCentre = (d) => genSeating(d, 'centre')
const genSeatOutward = (d) => genSeating(d, 'outward')
const genSeatOpposite = (d) => genSeating(d, 'opposite')

// ---------------------------------------------------------------------------
// Deduction: Venn-region syllogisms, comparative chains, if-then chains
// ---------------------------------------------------------------------------
const TERM_SETS = [
  ['doctors', 'teachers', 'singers', 'writers'], ['painters', 'poets', 'dancers', 'actors'], ['players', 'coaches', 'umpires', 'captains'],
  ['pens', 'pencils', 'markers', 'erasers'], ['boxes', 'cartons', 'crates', 'packets'], ['cars', 'buses', 'vans', 'trucks'],
  ['roses', 'lilies', 'tulips', 'daisies'], ['engineers', 'lawyers', 'bankers', 'clerks'], ['chairs', 'tables', 'benches', 'stools'],
  ['students', 'athletes', 'swimmers', 'cyclists'], ['files', 'folders', 'reports', 'letters'], ['mangoes', 'apples', 'guavas', 'oranges'],
  ['officers', 'managers', 'auditors', 'trainees'], ['rings', 'bangles', 'chains', 'lockets'], ['kites', 'balloons', 'toys', 'gifts'],
]
function vennModels(k) {
  const R = (1 << k) - 1 // regions 1..R
  const out = []
  for (let mask = 1; mask < (1 << R); mask++) {
    const regs = []
    for (let r = 1; r <= R; r++) if (mask & (1 << (r - 1))) regs.push(r)
    let ok = true
    for (let t = 0; t < k; t++) if (!regs.some((r) => r & (1 << t))) { ok = false; break }
    if (ok) out.push(regs)
  }
  return out
}
const VENN = { 3: vennModels(3), 4: vennModels(4) }
function catEval(s, regs) {
  const X = 1 << s.x, Y = 1 << s.y
  if (s.t === 'all') return !regs.some((r) => (r & X) && !(r & Y))
  if (s.t === 'no') return !regs.some((r) => (r & X) && (r & Y))
  if (s.t === 'some') return regs.some((r) => (r & X) && (r & Y))
  return regs.some((r) => (r & X) && !(r & Y)) // somenot
}
function catText(s, T) {
  const X = T[s.x], Y = T[s.y]
  if (s.t === 'all') return `All ${X} are ${Y}`
  if (s.t === 'no') return `No ${X} are ${Y}`
  if (s.t === 'some') return `Some ${X} are ${Y}`
  return `Some ${X} are not ${Y}`
}
const catKey = (s) => `${s.t}:${s.x}:${s.y}`
function catClassify(premises, k) {
  const live = VENN[k].filter((m) => premises.every((p) => catEval(p, m)))
  return { live, cls: (s) => { const n = live.filter((m) => catEval(s, m)).length; return n === live.length ? 'T' : n === 0 ? 'F' : 'U' } }
}
function catPremises(d) {
  const k = d === 3 ? 4 : 3
  const types = ['all', 'all', 'no', 'some', 'somenot']
  const np = d === 3 ? 3 : 2
  // chain structure: term0-term1, term1-term2 (, term2-term3), random direction
  const prem = []
  for (let i = 0; i < np; i++) {
    const t = pick(d === 1 ? ['all', 'all', 'no', 'some'] : types)
    const [x, y] = chance(0.5) || t === 'all' || t === 'somenot' ? [i, i + 1] : [i + 1, i]
    prem.push({ t, x, y })
  }
  return { k, prem }
}
function catCandidates(k, prem) {
  const out = []
  for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) if (x !== y) for (const t of ['all', 'no', 'some', 'somenot']) out.push({ t, x, y })
  const pk = new Set(prem.map(catKey))
  return out.filter((c) => !pk.has(catKey(c)))
}
const TFU = { T: 'true', F: 'false', U: 'uncertain' }
function comboLabel(a, b) { return `(iii) is ${TFU[a]} and (iv) is ${TFU[b]}` }
function comboOptions(a, b, lab = comboLabel) {
  const all = []
  for (const x of 'TFU') for (const y of 'TFU') if (x !== a || y !== b) all.push([x, y])
  const near = shuffle(all.filter(([x, y]) => x === a || y === b))
  const far = shuffle(all.filter(([x, y]) => x !== a && y !== b))
  return [...near.slice(0, 2), ...far.slice(0, 1), ...near.slice(2)].slice(0, 3).map(([x, y]) => lab(x, y))
}
const expCat = (c, T, cl) => `${catText(c, T)} is ${cl === 'T' ? 'forced by the statements' : cl === 'F' ? 'contradicted by the statements' : 'possible but not forced'}`

function genCategoricalTFU(d) {
  for (let t = 0; t < 60; t++) {
    const { k, prem } = catPremises(d)
    const T = pick(TERM_SETS).slice(0, k)
    const { live, cls } = catClassify(prem, k)
    if (!live.length) continue
    const cands = catCandidates(k, prem).filter((c) => (d === 3 ? true : Math.abs(c.x - c.y) >= 1))
    const c1 = pick(cands), c2 = pick(cands.filter((c) => c !== c1 && !(c.x === c1.x && c.y === c1.y)))
    if (!c2) continue
    const a = cls(c1), b = cls(c2)
    if (d === 1 && a === 'U' && b === 'U') continue
    const romans = ['(i)', '(ii)', '(iii)']
    const pTxt = prem.map((p, i) => `${romans[i]} ${catText(p, T)}.`).join(' ')
    const q = `${pTxt} ${prem.length === 3 ? '(iv)' : '(iii)'} ${catText(c1, T)}. ${prem.length === 3 ? '(v)' : '(iv)'} ${catText(c2, T)}. If the ${prem.length === 3 ? 'first three statements' : 'first two statements'} are true, which of the following is correct?`
    const label = prem.length === 3 ? (x, y) => `(iv) is ${TFU[x]} and (v) is ${TFU[y]}` : comboLabel
    const opts = comboOptions(a, b, label)
    return {
      concept: `syllogism-tfu-${prem.map(catKey).join('_')}-${catKey(c1)}-${catKey(c2)}-${T[0]}`,
      q, answer: label(a, b), distractors: opts,
      explanation: `Checking every Venn diagram allowed by the statements: ${expCat(c1, T, a)}; ${expCat(c2, T, b)}.`,
    }
  }
  return null
}

function genSyllogismFollows(d, negate = false) {
  for (let t = 0; t < 80; t++) {
    const { k, prem } = catPremises(d)
    const T = pick(TERM_SETS).slice(0, k)
    const { live, cls } = catClassify(prem, k)
    if (!live.length) continue
    let cands = catCandidates(k, prem)
    // trivial converses/subalterns of a single premise are too easy except at level 1
    const trivial = (c) => prem.some((p) => (p.x === c.x && p.y === c.y) || (p.x === c.y && p.y === c.x))
    if (d >= 2) cands = cands.filter((c) => !trivial(c) || chance(0.25))
    const Ts = shuffle(cands.filter((c) => cls(c) === 'T'))
    const Us = shuffle(cands.filter((c) => cls(c) === 'U'))
    const Fs = shuffle(cands.filter((c) => cls(c) === 'F'))
    const romans = ['I', 'II', 'III']
    const pTxt = prem.map((p, i) => `${romans[i]}. ${catText(p, T)}.`).join(' ')
    if (!negate) {
      if (!Ts.length || Us.length + Fs.length < 3) continue
      const right = Ts[0]
      const wrong = [...Us.slice(0, 2), ...Fs.slice(0, 1), ...Us.slice(2), ...Fs.slice(1)].slice(0, 3)
      const q = `Statements: ${pTxt} ${pick(['Which conclusion definitely follows from the statements?', 'Which of the following conclusions follows logically?', 'If the statements are true, which conclusion must also be true?'])}`
      return {
        concept: `syllogism-follows-${prem.map(catKey).join('_')}-${catKey(right)}-${T[0]}`,
        q, answer: catText(right, T), distractors: wrong.map((c) => catText(c, T)),
        explanation: `${catText(right, T)} holds in every diagram consistent with the statements; the other conclusions are ${wrong.map((c) => cls(c) === 'F' ? 'impossible' : 'only possible').join(', ')} respectively.`,
      }
    }
    if (Ts.length < 3 || !(Us.length + Fs.length)) continue
    const bad = Us.length ? Us[0] : Fs[0]
    const q = `Statements: ${pTxt} Which of the following conclusions does NOT follow?`
    return {
      concept: `syllogism-not-follow-${prem.map(catKey).join('_')}-${catKey(bad)}-${T[0]}`,
      q, answer: catText(bad, T), distractors: Ts.slice(0, 3).map((c) => catText(c, T)),
      explanation: `${catText(bad, T)} is ${cls(bad) === 'F' ? 'ruled out' : 'not forced'}: a diagram satisfying the statements exists where it fails. The other three hold in every such diagram.`,
    }
  }
  return null
}
const genSyllogismNotFollow = (d) => genSyllogismFollows(d, true)

function genCategoricalMustBeFalse(d) {
  for (let t = 0; t < 80; t++) {
    const { k, prem } = catPremises(d)
    const T = pick(TERM_SETS).slice(0, k)
    const { live, cls } = catClassify(prem, k)
    if (!live.length) continue
    const cands = catCandidates(k, prem)
    const Fs = shuffle(cands.filter((c) => cls(c) === 'F' && !(d >= 2 && prem.some((p) => (p.x === c.x && p.y === c.y) || (p.x === c.y && p.y === c.x)))))
    const Ts = shuffle(cands.filter((c) => cls(c) === 'T')), Us = shuffle(cands.filter((c) => cls(c) === 'U'))
    if (!Fs.length || Ts.length < 1 || Us.length < 1 || Ts.length + Us.length < 3) continue
    const wrong = [Ts[0], Us[0], ...shuffle([...Ts.slice(1), ...Us.slice(1)])].slice(0, 3)
    const q = `If it is true that ${listAnd(prem.map((p) => catText(p, T).replace(/^A/, 'a').replace(/^N/, 'n').replace(/^S/, 's')))}, which of the following must be false?`
    return {
      concept: `syllogism-must-be-false-${prem.map(catKey).join('_')}-${catKey(Fs[0])}-${T[0]}`,
      q, answer: catText(Fs[0], T), distractors: wrong.map((c) => catText(c, T)),
      explanation: `No diagram consistent with the statements allows “${catText(Fs[0], T)}”; each other option is either forced or at least possible.`,
    }
  }
  return null
}

// Comparative chains with ties -----------------------------------------------
const COMP_CTX = [
  { gt: 'lasts longer than', lt: 'does not last as long as', le: 'does not last longer than', ge: 'lasts at least as long as', eq: 'lasts exactly as long as', items: (L) => L.map((l) => `Bulb ${l}`) },
  { gt: 'is faster than', lt: 'is slower than', le: 'is not faster than', ge: 'is at least as fast as', eq: 'is exactly as fast as', items: (L) => L.map((l) => `Train ${l}`) },
  { gt: 'is heavier than', lt: 'is lighter than', le: 'is not heavier than', ge: 'is at least as heavy as', eq: 'weighs the same as', items: (L) => L.map((l) => `Bag ${l}`) },
  { gt: 'costs more than', lt: 'costs less than', le: 'does not cost more than', ge: 'costs at least as much as', eq: 'costs the same as', items: (L) => L.map((l) => `Phone ${l}`) },
  { gt: 'is older than', lt: 'is younger than', le: 'is not older than', ge: 'is at least as old as', eq: 'is the same age as', items: (L) => mixedNames(L.length) },
  { gt: 'is taller than', lt: 'is shorter than', le: 'is not taller than', ge: 'is at least as tall as', eq: 'is exactly as tall as', items: (L) => sample(['Mount P', 'Mount Q', 'Mount R', 'Mount S', 'Mount T'], L.length).map((x) => x.replace('Mount', 'Peak')) },
  { gt: 'is longer than', lt: 'is shorter than', le: 'is not longer than', ge: 'is at least as long as', eq: 'is as long as', items: (L) => L.map((l) => `River ${l}`) },
  { gt: 'opens earlier than', lt: 'opens later than', le: 'does not open earlier than', ge: 'opens no later than', eq: 'opens at the same time as', items: (L) => L.map((l) => `Shop ${l}`) },
  { gt: 'scored more than', lt: 'scored less than', le: 'did not score more than', ge: 'scored at least as much as', eq: 'scored the same as', items: (L) => mixedNames(L.length) },
]
const CMP_OPS = { gt: (a, b) => a > b, lt: (a, b) => a < b, le: (a, b) => a <= b, ge: (a, b) => a >= b, eq: (a, b) => a === b }
function valueModels(k) {
  const out = []
  const total = k ** k
  for (let i = 0; i < total; i++) { const v = []; let x = i; for (let j = 0; j < k; j++) { v.push(x % k); x = Math.floor(x / k) } out.push(v) }
  return out
}
const VALS = { 3: valueModels(3), 4: valueModels(4) }
function compPremises(d) {
  const k = d === 3 ? 4 : 3
  const np = d === 3 ? 3 : 2
  const ops = d === 1 ? ['gt', 'lt', 'gt'] : ['gt', 'lt', 'le', 'ge', 'gt', 'eq']
  const prem = []
  for (let i = 0; i < np; i++) { const [x, y] = chance(0.5) ? [i, i + 1] : [i + 1, i]; prem.push({ op: pick(ops), x, y }) }
  return { k, prem }
}
function compClassify(prem, k) {
  const live = VALS[k].filter((v) => prem.every((p) => CMP_OPS[p.op](v[p.x], v[p.y])))
  return { live, cls: (s) => { const n = live.filter((v) => CMP_OPS[s.op](v[s.x], v[s.y])).length; return n === live.length ? 'T' : n === 0 ? 'F' : 'U' } }
}
const compText = (s, ctx, I) => `${I[s.x]} ${ctx[s.op]} ${I[s.y]}`
function genComparativeTFU(d) {
  for (let t = 0; t < 80; t++) {
    const { k, prem } = compPremises(d)
    const ctx = pick(COMP_CTX)
    const I = ctx.items(letters(k))
    const { live, cls } = compClassify(prem, k)
    if (!live.length) continue
    const cands = []
    for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) if (x !== y && Math.abs(x - y) >= (d === 1 ? 2 : 1)) for (const op of ['gt', 'lt', 'le', 'ge']) cands.push({ op, x, y })
    const fresh = cands.filter((c) => !prem.some((p) => (p.x === c.x && p.y === c.y) || (p.x === c.y && p.y === c.x)))
    if (!fresh.length) continue
    const norm = (c) => (c.op === 'lt' ? `gt${c.y}${c.x}` : c.op === 'le' ? `ge${c.y}${c.x}` : `${c.op}${c.x}${c.y}`)
    const c1 = pick(fresh)
    const samePair = (c) => (c.x === c1.x && c.y === c1.y) || (c.x === c1.y && c.y === c1.x)
    const otherPairs = fresh.filter((c) => !samePair(c))
    const c2 = pick(otherPairs.length ? otherPairs : fresh.filter((c) => norm(c) !== norm(c1) && c.x === c1.y))
    if (!c2) continue
    const a = cls(c1), b = cls(c2)
    if (a === b && chance(0.6)) continue
    const n = prem.length
    const R = ['(i)', '(ii)', '(iii)', '(iv)', '(v)']
    const q = `${prem.map((p, i) => `${R[i]} ${compText(p, ctx, I)}.`).join(' ')} ${R[n]} ${compText(c1, ctx, I)}. ${R[n + 1]} ${compText(c2, ctx, I)}. If ${n === 2 ? 'statements (i) and (ii)' : 'statements (i), (ii) and (iii)'} are true, then:`
    const lab = (x, y) => `${R[n]} is ${TFU[x]} and ${R[n + 1]} is ${TFU[y]}`
    const dis = comboOptions(a, b, lab)
    return {
      concept: `comparative-tfu-${prem.map((p) => `${p.op}${p.x}${p.y}`).join('_')}-${c1.op}${c1.x}${c1.y}-${c2.op}${c2.x}${c2.y}-${kebab(ctx.gt)}`,
      q, answer: lab(a, b), distractors: dis,
      explanation: `Trying every ordering (ties allowed) that fits the statements: “${compText(c1, ctx, I)}” is ${TFU[a]} and “${compText(c2, ctx, I)}” is ${TFU[b]}.`,
    }
  }
  return null
}
function genComparativeMustBeTrue(d) {
  for (let t = 0; t < 80; t++) {
    const { k, prem } = compPremises(d === 1 ? 2 : d)
    const ctx = pick(COMP_CTX)
    const I = ctx.items(letters(k))
    const { live, cls } = compClassify(prem, k)
    if (!live.length) continue
    const cands = []
    for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) if (x !== y) for (const op of ['gt', 'lt', 'le', 'ge', 'eq']) cands.push({ op, x, y })
    const fresh = cands.filter((c) => !prem.some((p) => (p.x === c.x && p.y === c.y) || (p.x === c.y && p.y === c.x)))
    const Ts = shuffle(fresh.filter((c) => cls(c) === 'T'))
    const others = shuffle(fresh.filter((c) => cls(c) !== 'T'))
    const Fs = others.filter((c) => cls(c) === 'F'), Us = others.filter((c) => cls(c) === 'U')
    if (!Ts.length || !Fs.length || !Us.length) continue
    const wrong = [Us[0], Fs[0], ...shuffle([...Us.slice(1), ...Fs.slice(1)])].filter((c) => !(c.x === Ts[0].x && c.y === Ts[0].y && c.op === Ts[0].op)).slice(0, 3)
    const q = `${cap(listAnd(prem.map((p) => compText(p, ctx, I))))}. ${pick(['Which of the following must be true?', 'Which conclusion necessarily follows?', 'Which statement is definitely true?'])}`
    return {
      concept: `comparative-must-${prem.map((p) => `${p.op}${p.x}${p.y}`).join('_')}-${Ts[0].op}${Ts[0].x}${Ts[0].y}-${kebab(ctx.gt)}`,
      q, answer: compText(Ts[0], ctx, I), distractors: wrong.map((c) => compText(c, ctx, I)),
      explanation: `Chaining the given comparisons (equal values allowed where the wording permits) forces “${compText(Ts[0], ctx, I)}”; each other option fails in some arrangement that fits.`,
    }
  }
  return null
}

// If–then chains (truth tables) -------------------------------------------------
const PROPS = [
  [['the shop is open', 'the shop is not open'], ['Ali buys bread', 'Ali does not buy bread'], ['Ali makes sandwiches', 'Ali does not make sandwiches']],
  [['Sara passes the MPT', 'Sara does not pass the MPT'], ['Sara sits the written examination', 'Sara does not sit the written examination'], ['Sara buys new books', 'Sara does not buy new books']],
  [['the electricity fails', 'the electricity does not fail'], ['the generator starts', 'the generator does not start'], ['the factory keeps running', 'the factory does not keep running']],
  [['the train is late', 'the train is not late'], ['Omar misses the meeting', 'Omar does not miss the meeting'], ['the report is delayed', 'the report is not delayed']],
  [['the river floods', 'the river does not flood'], ['the road is closed', 'the road is not closed'], ['the bus takes a longer route', 'the bus does not take a longer route']],
  [['the team wins today', 'the team does not win today'], ['the team reaches the final', 'the team does not reach the final'], ['the captain holds a press conference', 'the captain does not hold a press conference']],
  [['the price of wheat rises', 'the price of wheat does not rise'], ['flour becomes costly', 'flour does not become costly'], ['bakers raise bread prices', 'bakers do not raise bread prices']],
  [['Hina finishes her homework', 'Hina does not finish her homework'], ['Hina watches television', 'Hina does not watch television'], ['Hina sleeps late', 'Hina does not sleep late']],
  [['the alarm rings', 'the alarm does not ring'], ['the guards lock the gate', 'the guards do not lock the gate'], ['visitors wait outside', 'visitors do not wait outside']],
  [['the temperature falls below zero', 'the temperature does not fall below zero'], ['the pipes freeze', 'the pipes do not freeze'], ['the water supply stops', 'the water supply does not stop']],
  [['Bilal saves money', 'Bilal does not save money'], ['Bilal buys a laptop', 'Bilal does not buy a laptop'], ['Bilal takes an online course', 'Bilal does not take an online course']],
  [['the file is approved', 'the file is not approved'], ['the funds are released', 'the funds are not released'], ['the project begins', 'the project does not begin']],
]
function genConditionalChain(d) {
  for (let t = 0; t < 80; t++) {
    const S = pick(PROPS)
    const lit = (v, pos) => S[v][pos ? 0 : 1] // v: 0=P 1=Q 2=R
    const imps = [[0, 1], [1, 2]]
    const facts = d === 1 ? [[0, true]] : d === 2 ? [pick([[1, true], [1, false], [2, true], [0, false]])] : [pick([[2, false], [1, false], [2, true]])]
    const worlds = []
    for (let w = 0; w < 8; w++) {
      const val = [!!(w & 1), !!(w & 2), !!(w & 4)]
      if (imps.every(([a, b]) => !val[a] || val[b]) && facts.every(([v, p]) => val[v] === p)) worlds.push(val)
    }
    const concl = []
    for (let v = 0; v < 3; v++) for (const p of [true, false]) if (!facts.some(([fv]) => fv === v)) concl.push([v, p])
    const cls = ([v, p]) => { const n = worlds.filter((w) => w[v] === p).length; return n === worlds.length ? 'T' : n === 0 ? 'F' : 'U' }
    const Ts = concl.filter((c) => cls(c) === 'T'), rest = concl.filter((c) => cls(c) !== 'T')
    const stmt = imps.map(([a, b]) => `If ${lit(a, true)}, ${lit(b, true)}.`).join(' ')
    const fact = `${cap(lit(facts[0][0], facts[0][1]))}.`
    if (Ts.length && rest.length >= 3 && chance(0.6)) {
      const right = pick(Ts)
      const q = `${stmt} ${fact} ${pick(['Which conclusion follows?', 'What can be concluded?', 'Which of the following must be true?'])}`
      return {
        concept: `conditional-follows-${kebab(S[0][0]).slice(0, 20)}-${imps.length}-${facts[0].join('')}-${right.join('')}`,
        q, answer: `${cap(lit(right[0], right[1]))}`, distractors: shuffle(rest).slice(0, 3).map(([v, p]) => cap(lit(v, p))),
        explanation: `Only “${lit(right[0], right[1])}” is true in every case allowed by the statements; the other conclusions ${rest.some((c) => cls(c) === 'U') ? 'may or may not hold (for example, affirming the consequent or denying the antecedent)' : 'are contradicted'}.`,
      }
    }
    // pair format
    if (concl.length < 2) continue
    const [c1, c2] = sample(concl, 2)
    if (c1[0] === c2[0]) continue
    const a = cls(c1), b = cls(c2)
    const q = `(i) ${stmt.replace(/\. If/g, '. (ii) If')} ${imps.length === 1 ? '(ii)' : '(iii)'} ${fact} ${imps.length === 1 ? '(iii)' : '(iv)'} ${cap(lit(c1[0], c1[1]))}. ${imps.length === 1 ? '(iv)' : '(v)'} ${cap(lit(c2[0], c2[1]))}. If the first ${imps.length === 1 ? 'two' : 'three'} statements are true, then:`
    const R3 = imps.length === 1 ? '(iii)' : '(iv)', R4 = imps.length === 1 ? '(iv)' : '(v)'
    const lab = (x, y) => `${R3} is ${TFU[x]} and ${R4} is ${TFU[y]}`
    return {
      concept: `conditional-tfu-${kebab(S[0][0]).slice(0, 20)}-${imps.length}-${facts[0].join('')}-${c1.join('')}-${c2.join('')}`,
      q, answer: lab(a, b), distractors: comboOptions(a, b, lab),
      explanation: `Checking every case consistent with the statements: “${lit(c1[0], c1[1])}” is ${TFU[a]} and “${lit(c2[0], c2[1])}” is ${TFU[b]}.`,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Analytical puzzles (4–6 elements, 3–4 conditions, one question each)
// ---------------------------------------------------------------------------
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SUBJECTS = ['History', 'Geography', 'Kinetics', 'Physics', 'English', 'Urdu', 'Mathematics', 'Chemistry', 'Biology', 'Economics']
const RENDER = {
  timetable: {
    items: (n) => sample(SUBJECTS, n),
    intro: (n, N) => pick([`A class has ${NUMW[n]} periods on Monday, one each for ${listAnd(N)}.`, `A school timetable fits ${listAnd(N)} into ${NUMW[n]} consecutive periods, one subject per period.`, `On exam day, papers in ${listAnd(N)} are held one after another in ${NUMW[n]} sessions.`]),
    imm: (a, b) => pick([`${a} is immediately after ${b}`, `${a} comes right after ${b}`]),
    before: (a, b) => pick([`${a} is earlier than ${b}`, `${a} comes before ${b}`]),
    at: (a, k, n) => (k === 0 ? `${a} is first` : k === n - 1 ? `${a} is last` : `${a} is ${ordinal(k + 1)}`),
    notAt: (a, k, n) => (k === 0 ? `${a} is not first` : k === n - 1 ? `${a} is not last` : null),
    gap1: (a, b) => `exactly one subject comes between ${a} and ${b}`,
    notAdj: (a, b) => `${a} and ${b} are not consecutive`,
    label: (k) => `${cap(ORDW[k + 1])}`,
    askSlot: (a) => pick([`What is the position of ${a}?`, `In which period is ${a}?`]),
    askWho: (k) => `Which subject is ${ORDW[k + 1]}?`,
    askNext: (a) => `Which subject comes immediately after ${a}?`,
  },
  seminar: {
    items: (n) => personNames(n),
    intro: (n, N) => pick([`${cap(NUMW[n])} speakers, ${listAnd(N)}, present one after another at a seminar.`, `At a debate contest, ${listAnd(N)} speak in turn, one at a time.`, `${listAnd(N)} are interviewed one by one for a job.`]),
    imm: (a, b) => pick([`${a} goes immediately after ${b}`, `${a} follows ${b} directly`]),
    before: (a, b) => `${a} goes before ${b}`,
    at: (a, k, n) => (k === 0 ? `${a} goes first` : k === n - 1 ? `${a} goes last` : `${a} is ${ordinal(k + 1)} in the order`),
    notAt: (a, k, n) => (k === 0 ? `${a} does not go first` : k === n - 1 ? `${a} is not the last` : `${a} is not ${ordinal(k + 1)}`),
    gap1: (a, b) => `exactly one person goes between ${a} and ${b}`,
    notAdj: (a, b) => `${a} and ${b} do not go one after the other`,
    label: (k) => cap(ORDW[k + 1]),
    askSlot: (a) => `In what position does ${a} go?`,
    askWho: (k) => `Who goes ${ORDW[k + 1]}?`,
    askNext: (a) => `Who goes immediately after ${a}?`,
  },
  weekday: {
    items: (n) => personNames(n),
    intro: (n, N) => pick([`${cap(NUMW[n])} officers, ${listAnd(N)}, each take one day of duty from Monday to ${DAYS[n - 1]}.`, `A doctor sees ${listAnd(N)} on different days from Monday to ${DAYS[n - 1]}, one patient a day.`, `${listAnd(N)} each give one presentation, on different days from Monday to ${DAYS[n - 1]}.`]),
    imm: (a, b) => `${a}'s day is the day after ${b}'s`,
    before: (a, b) => `${a}'s day is earlier in the week than ${b}'s`,
    at: (a, k) => `${a}'s day is ${DAYS[k]}`,
    notAt: (a, k) => `${a}'s day is not ${DAYS[k]}`,
    gap1: (a, b) => `there is exactly one day between ${a}'s day and ${b}'s`,
    notAdj: (a, b) => `${a} and ${b} are not on consecutive days`,
    after: (a, k) => `${a}'s day is later than ${DAYS[k]}`,
    label: (k) => DAYS[k],
    askSlot: (a) => `On which day is ${a}'s turn?`,
    askWho: (k) => `Whose day is ${DAYS[k]}?`,
    askNext: (a) => `Whose day comes immediately after ${a}'s?`,
  },
  floors: {
    items: (n) => personNames(n),
    intro: (n, N) => pick([`${listAnd(N)} live in a ${n}-storey building, one on each floor; floor 1 is the lowest and floor ${n} the top.`, `In a hostel block with ${n} floors (1 at the bottom, ${n} at the top), ${listAnd(N)} occupy one floor each.`]),
    imm: (a, b) => `${a} lives immediately above ${b}`,
    before: (a, b) => pick([`${a} lives on a lower floor than ${b}`, `${a} lives below ${b}`]),
    at: (a, k, n) => (k === n - 1 ? `${a} lives on the top floor` : `${a} lives on floor ${k + 1}`),
    notAt: (a, k, n) => (k === n - 1 ? `${a} does not live on the top floor` : k === 0 ? `${a} does not live on floor 1` : null),
    gap1: (a, b) => `exactly one floor lies between the floors of ${a} and ${b}`,
    notAdj: (a, b) => `${a} and ${b} do not live on adjacent floors`,
    even: (a, e) => `${a} lives on an ${e ? 'even' : 'odd'}-numbered floor`,
    label: (k) => `Floor ${k + 1}`,
    askSlot: (a) => `On which floor does ${a} live?`,
    askWho: (k, n) => (k === n - 1 ? 'Who lives on the top floor?' : `Who lives on floor ${k + 1}?`),
    askNext: (a) => `Who lives immediately above ${a}?`,
  },
  stack: {
    items: (n) => sample(['the atlas', 'the dictionary', 'the novel', 'the diary', 'the cookbook', 'the textbook', 'the album'], n),
    intro: (n, N) => `${cap(NUMW[n])} books — ${listAnd(N)} — are stacked in a single pile on a desk.`,
    imm: (a, b) => `${a} lies directly on top of ${b}`,
    before: (a, b) => `${a} is somewhere below ${b}`,
    at: (a, k, n) => (k === 0 ? `${a} is at the bottom` : k === n - 1 ? `${a} is at the top` : null),
    notAt: (a, k, n) => (k === 0 ? `${a} is not at the bottom` : k === n - 1 ? `${a} is not at the top` : null),
    gap1: (a, b) => `exactly one book lies between ${a} and ${b}`,
    notAdj: (a, b) => `${a} and ${b} are not touching`,
    label: (k, n) => (k === 0 ? 'At the bottom' : k === n - 1 ? 'At the top' : `${cap(ORDW[k + 1])} from the bottom`),
    askSlot: (a) => `Where is ${a} in the pile?`,
    askWho: (k, n) => (k === 0 ? 'Which book is at the bottom?' : k === n - 1 ? 'Which book is at the top?' : `Which book is ${ORDW[k + 1]} from the bottom?`),
    askNext: (a) => `Which book lies directly on top of ${a}?`,
  },
}
function slotPool(N, hidden, n, R) {
  const pool = []
  const add = (text, test) => { if (text && test(hidden)) pool.push({ text, test }) }
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a === b) continue
      add(R.imm(N[a], N[b]), (m) => m[a] === m[b] + 1)
      add(R.before(N[a], N[b]), (m) => m[a] < m[b])
      if (a < b) {
        add(R.gap1(N[a], N[b]), (m) => Math.abs(m[a] - m[b]) === 2)
        add(R.notAdj(N[a], N[b]), (m) => Math.abs(m[a] - m[b]) > 1)
      }
    }
    for (let k = 0; k < n; k++) {
      add(R.at(N[a], k, n), (m) => m[a] === k)
      add(R.notAt(N[a], k, n), (m) => m[a] !== k)
    }
    if (R.after) for (const k of [1, 2]) add(R.after(N[a], k), (m) => m[a] > k)
    if (R.even) { add(R.even(N[a], true), (m) => (m[a] + 1) % 2 === 0); add(R.even(N[a], false), (m) => (m[a] + 1) % 2 === 1) }
  }
  return pool
}
function genSlotPuzzle(d, kinds) {
  const kind = pick(kinds)
  const R = RENDER[kind]
  const n = d === 1 ? pick([4, 5]) : d === 2 ? 5 : pick([5, 6])
  if (kind === 'weekday' && n < 5) return null
  const N = R.items(n)
  const models = perms(n)
  const hidden = models[ri(0, models.length - 1)]
  const pool = slotPool(N, hidden, n, R)
  const a = ri(0, n - 1), k = ri(0, n - 1)
  const askType = pick(['slot', 'who', 'who', 'next'])
  let ask, text, fmt
  if (askType === 'slot') { ask = (m) => String(m[a]); text = R.askSlot(N[a]); fmt = (v) => R.label(+v, n) }
  else if (askType === 'who') { ask = (m) => String(m.indexOf(k)); text = R.askWho(k, n); fmt = (v) => cap(N[+v]) }
  else { if (hidden[a] === n - 1) return null; ask = (m) => String(m.indexOf(m[a] + 1)); text = R.askNext(N[a]); fmt = (v) => (v === '-1' ? null : cap(N[+v])) }
  const pz = buildPuzzle({ models, pool, ask, minClues: 3, maxClues: 4 })
  if (!pz || pz.answer === '-1') return null
  const answer = fmt(pz.answer)
  if (!answer) return null
  const possible = new Set(models.map(ask))
  const others = askType === 'slot' ? [...Array(n).keys()].map(String) : N.map((_, i) => String(i)).filter((i) => askType !== 'next' || +i !== a)
  const distractors = shuffle(others.filter((v) => v !== pz.answer)).sort((x, y) => possible.has(y) - possible.has(x)).slice(0, 3).map(fmt)
  const q = `${R.intro(n, N)} ${cap(presentOrder(pz.clues).map((c) => c.text).join('; '))}. ${text}`
  const listing = `${pz.models[0].map((_, s) => N[pz.models[0].indexOf(s)]).join(', ')} (${kind === 'floors' || kind === 'stack' ? 'bottom to top' : kind === 'weekday' ? `Monday to ${DAYS[n - 1]}` : 'first to last'})`
  const sol = pz.models.length === 1 ? ` The only order that fits is ${listing}.` : ` ${pz.models.length} orders fit (for example ${listing}), and all give the same answer.`
  return {
    concept: `puzzle-${kind}-${n}-${hash36(q)}`,
    q: cap(q), answer, distractors,
    explanation: `Testing all ${models.length} possible orders against the conditions.${sol}`,
  }
}
const genScheduleImmediate = (d) => genSlotPuzzle(d, ['timetable', 'seminar'])
const genWeekday = (d) => genSlotPuzzle(d, ['weekday'])
const genFloors = (d) => genSlotPuzzle(d, ['floors', 'stack'])

// Matching people to attributes -------------------------------------------------
const ATTRS = [
  { noun: 'colour', vals: ['red', 'blue', 'green', 'yellow', 'white'], is: (p, v) => `${p} likes ${v}`, not: (p, v) => `${p} does not like ${v}`, who: (v) => `Who likes ${v}?`, what: (p) => `Which colour does ${p} like?`, ref: (v) => `the person who likes ${v}` },
  { noun: 'city', vals: ['Lahore', 'Karachi', 'Quetta', 'Peshawar', 'Multan'], is: (p, v) => `${p} lives in ${v}`, not: (p, v) => `${p} does not live in ${v}`, who: (v) => `Who lives in ${v}?`, what: (p) => `In which city does ${p} live?`, ref: (v) => `the person from ${v}` },
  { noun: 'subject', vals: ['Physics', 'Urdu', 'History', 'Economics', 'Botany'], is: (p, v) => `${p} teaches ${v}`, not: (p, v) => `${p} does not teach ${v}`, who: (v) => `Who teaches ${v}?`, what: (p) => `Which subject does ${p} teach?`, ref: (v) => `the ${v} teacher` },
  { noun: 'sport', vals: ['cricket', 'hockey', 'squash', 'football', 'tennis'], is: (p, v) => `${p} plays ${v}`, not: (p, v) => `${p} does not play ${v}`, who: (v) => `Who plays ${v}?`, what: (p) => `Which game does ${p} play?`, ref: (v) => `the ${v} player` },
  { noun: 'drink', vals: ['tea', 'coffee', 'lassi', 'juice', 'milk'], is: (p, v) => `${p} drinks ${v}`, not: (p, v) => `${p} does not drink ${v}`, who: (v) => `Who drinks ${v}?`, what: (p) => `What does ${p} drink?`, ref: (v) => `the ${v} drinker` },
]
function genMatching(d) {
  const n = d === 1 ? 4 : d === 2 ? pick([4, 5]) : 4
  const two = d === 3
  const [A1, A2] = sample(ATTRS, 2)
  const N = mixedNames(n)
  const V1 = sample(A1.vals, n), V2 = sample(A2.vals, n)
  const P = perms(n)
  const models = two ? P.flatMap((p) => P.map((q) => ({ a: p, b: q }))) : P.map((p) => ({ a: p }))
  const hidden = models[ri(0, models.length - 1)]
  const pool = []
  const add = (text, test) => { if (test(hidden)) pool.push({ text, test }) }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    add(A1.not(N[i], V1[j]), (m) => m.a[i] !== j)
    for (let j2 = j + 1; j2 < n; j2++) add(`${A1.is(N[i], `either ${V1[j]} or ${V1[j2]}`)}`, (m) => m.a[i] === j || m.a[i] === j2)
    if (two) {
      add(A2.not(N[i], V2[j]), (m) => m.b[i] !== j)
      for (let j2 = 0; j2 < n; j2++) {
        add(`${cap(A1.ref(V1[j]))} ${A2.is('', V2[j2]).trim()}`, (m) => m.b[m.a.indexOf(j)] === j2)
        add(`${cap(A1.ref(V1[j]))} ${A2.not('', V2[j2]).trim()}`, (m) => m.b[m.a.indexOf(j)] !== j2)
      }
    }
  }
  const mode = pick(two ? ['what2', 'who2'] : ['who1', 'what1'])
  const i = ri(0, n - 1), j = ri(0, n - 1)
  let ask, text, fmt, others
  if (mode === 'who1') { ask = (m) => String(m.a.indexOf(j)); text = A1.who(V1[j]); fmt = (v) => N[+v]; others = N.map((_, x) => String(x)) }
  else if (mode === 'what1') { ask = (m) => String(m.a[i]); text = A1.what(N[i]); fmt = (v) => cap(V1[+v]); others = V1.map((_, x) => String(x)) }
  else if (mode === 'what2') { ask = (m) => String(m.b[i]); text = A2.what(N[i]); fmt = (v) => cap(V2[+v]); others = V2.map((_, x) => String(x)) }
  else { ask = (m) => String(m.b.indexOf(j)); text = A2.who(V2[j]); fmt = (v) => N[+v]; others = N.map((_, x) => String(x)) }
  const pz = buildPuzzle({ models, pool, ask, minClues: 3, maxClues: two ? 5 : 4 })
  if (!pz) return null
  if (two && pz.clues.length > 4 && chance(0.5)) return null
  const intro = two
    ? `${listAnd(N)} each have a different ${A1.noun} (${listAnd(V1)}) and a different ${A2.noun} (${listAnd(V2)}).`
    : `${listAnd(N)} each ${A1.is('', `a different one of ${listAnd(V1)}`).trim().replace(/^(likes|lives in|teaches|plays|drinks)/, (w) => ({ likes: 'like', 'lives in': 'live in', teaches: 'teach', plays: 'play', drinks: 'drink' })[w])}.`
  const q = `${intro} ${cap(presentOrder(pz.clues).map((c) => c.text).join('; '))}. ${text}`
  if (q.length > 420) return null
  const answer = fmt(pz.answer)
  return {
    concept: `puzzle-matching-${A1.noun}-${two ? A2.noun : 'single'}-${hash36(q)}`,
    q, answer, distractors: shuffle(others.filter((v) => v !== pz.answer)).slice(0, 3).map(fmt),
    explanation: `Checking all ${models.length} possible assignments, ${pz.models.length === 1 ? 'only one satisfies every condition' : `the ${pz.models.length} that satisfy every condition all agree`}, giving ${answer}.`,
  }
}

// Team selection ------------------------------------------------------------------
function genSelection(d) {
  const n = d === 1 ? 5 : 6
  const k = d === 3 ? pick([3, 4]) : 3
  const N = personNames(n)
  const subsets = []
  for (let mask = 0; mask < (1 << n); mask++) {
    let c = 0; for (let i = 0; i < n; i++) if (mask & (1 << i)) c++
    if (c === k) subsets.push(mask)
  }
  const has = (m, i) => !!(m & (1 << i))
  const ctx = pick([
    { grp: 'committee', v: 'chosen', intro: `A committee of ${NUMW[k]} is to be chosen from ${listAnd(N)}.` },
    { grp: 'team', v: 'selected', intro: `A quiz team of ${NUMW[k]} must be selected from ${listAnd(N)}.` },
    { grp: 'delegation', v: 'included', intro: `A delegation of ${NUMW[k]} officers is to be formed from ${listAnd(N)}.` },
  ])
  const v = ctx.v
  const condMakers = [
    () => { const [a, b] = sample([...Array(n).keys()], 2); return { text: `if ${N[a]} is ${v}, ${N[b]} must also be ${v}`, t: (m) => !has(m, a) || has(m, b) } },
    () => { const [a, b] = sample([...Array(n).keys()], 2); return { text: `${N[a]} and ${N[b]} cannot both be ${v}`, t: (m) => !(has(m, a) && has(m, b)) } },
    () => { const [a, b] = sample([...Array(n).keys()], 2); return { text: `exactly one of ${N[a]} and ${N[b]} must be ${v}`, t: (m) => has(m, a) !== has(m, b) } },
    () => { const [a, b] = sample([...Array(n).keys()], 2); return { text: `if ${N[a]} is not ${v}, ${N[b]} must be ${v}`, t: (m) => has(m, a) || has(m, b) } },
    () => { const a = ri(0, n - 1); return { text: `${N[a]} must be ${v}`, t: (m) => has(m, a) } },
    () => { const [a, b] = sample([...Array(n).keys()], 2); return { text: `${N[a]} will not serve unless ${N[b]} is also ${v}`, t: (m) => !has(m, a) || has(m, b) } },
  ]
  for (let t = 0; t < 60; t++) {
    const conds = Array.from({ length: d === 1 ? 3 : pick([3, 4]) }, () => pick(condMakers)())
    if (new Set(conds.map((c) => c.text)).size !== conds.length) continue
    const valid = subsets.filter((m) => conds.every((c) => c.t(m)))
    if (valid.length < 1 || valid.length > 6) continue
    // every condition must matter
    if (conds.some((c) => subsets.filter((m) => conds.every((x) => x === c || x.t(m))).length === valid.length)) continue
    const names = (m) => listAnd(N.filter((_, i) => has(m, i)))
    const body = `${ctx.intro} Conditions: ${conds.map((c) => c.text).join('; ')}.`
    const mode = pick(d === 1 ? ['acceptable', 'must'] : ['acceptable', 'must', 'count', 'cannot'])
    if (mode === 'acceptable') {
      const right = pick(valid)
      const wrong = shuffle(subsets.filter((m) => !valid.includes(m)))
      if (wrong.length < 3) continue
      return {
        concept: `selection-acceptable-${hash36(body)}`, q: `${body} Which of the following is an acceptable ${ctx.grp}?`,
        answer: names(right), distractors: wrong.slice(0, 3).map(names),
        explanation: `${names(right)} satisfies every condition; each of the other groups breaks at least one of them.`,
      }
    }
    if (mode === 'must' || mode === 'cannot') {
      const must = N.map((_, i) => i).filter((i) => valid.every((m) => has(m, i) === (mode === 'must')))
      const never = N.map((_, i) => i).filter((i) => !must.includes(i))
      if (must.length !== 1 || never.length < 3) continue
      // the answer must not be given away by a single "must be" condition
      if (conds.some((c) => c.text === `${N[must[0]]} must be ${v}`)) continue
      return {
        concept: `selection-${mode}-${hash36(body)}`,
        q: `${body} ${mode === 'must' ? `Who must be ${v} in every acceptable ${ctx.grp}?` : `Who can never be ${v}?`}`,
        answer: N[must[0]], distractors: shuffle(never).slice(0, 3).map((i) => N[i]),
        explanation: `The acceptable ${ctx.grp}s are ${valid.map((m) => `{${names(m)}}`).join(', ')}; ${N[must[0]]} ${mode === 'must' ? 'appears in all of them' : 'appears in none of them'}.`,
      }
    }
    const c = valid.length
    return {
      concept: `selection-count-${hash36(body)}`, q: `${body} How many different ${ctx.grp}s are possible?`,
      answer: String(c), order: 'numeric', distractors: numDistractors(c, [c + 1, c - 1, c + 2, subsets.length]).map(String),
      explanation: `Listing all ${subsets.length} possible groups of ${k} and keeping those that meet every condition leaves ${c}: ${valid.map((m) => `{${names(m)}}`).join(', ')}.`,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Plan, generation and output
// ---------------------------------------------------------------------------
const PLAN = [
  // subtopic, family, generator, [difficulty 1, 2, 3]
  ['ga.directions', 'ga.directions.net-displacement', genNetDisplacement, [7, 11, 4]],
  ['ga.directions', 'ga.directions.direction-from-start', genDirectionFromStart, [6, 10, 4]],
  ['ga.directions', 'ga.directions.final-facing', genFinalFacing, [5, 9, 4]],
  ['ga.directions', 'ga.directions.relative-position', genRelativePosition, [6, 9, 3]],
  ['ga.directions', 'ga.directions.distance-between-points', genDistanceBetween, [3, 6, 3]],
  ['ga.directions', 'ga.directions.shadow', genShadow, [3, 5, 2]],
  ['ga.blood-relations', 'ga.blood.chain-statement', genChainStatement, [8, 14, 6]],
  ['ga.blood-relations', 'ga.blood.photograph-statement', genPhotograph, [7, 12, 5]],
  ['ga.blood-relations', 'ga.blood.coded-relations', genCodedRelations, [7, 11, 4]],
  ['ga.blood-relations', 'ga.blood.possessive-chain', genPossessiveChain, [6, 10, 4]],
  ['ga.blood-relations', 'ga.blood.family-count', genFamilyCount, [5, 8, 3]],
  ['ga.ordering', 'ga.ordering.comparison-extreme', genComparisonExtreme, [7, 11, 4]],
  ['ga.ordering', 'ga.ordering.nth-position', genNthPosition, [6, 10, 4]],
  ['ga.ordering', 'ga.ordering.rank-top-bottom', genRankTopBottom, [7, 11, 4]],
  ['ga.ordering', 'ga.ordering.queue-between', genQueueBetween, [5, 9, 4]],
  ['ga.ordering', 'ga.ordering.rank-interchange', genRankInterchange, [4, 7, 3]],
  ['ga.ordering', 'ga.ordering.conditional-extreme', genConditionalExtreme, [5, 9, 4]],
  ['ga.ordering', 'ga.ordering.must-be-true', genOrderMustBeTrue, [5, 8, 3]],
  ['ga.seating', 'ga.seating.linear-facing-north', genSeatNorth, [7, 11, 4]],
  ['ga.seating', 'ga.seating.circular-facing-centre', genSeatCentre, [7, 11, 4]],
  ['ga.seating', 'ga.seating.circular-facing-outward', genSeatOutward, [3, 6, 3]],
  ['ga.seating', 'ga.seating.linear-facing-south', genSeatSouth, [4, 6, 2]],
  ['ga.seating', 'ga.seating.circular-opposite', genSeatOpposite, [3, 6, 3]],
  ['ga.deduction', 'ga.deduction.comparative-tfu', genComparativeTFU, [7, 12, 5]],
  ['ga.deduction', 'ga.deduction.categorical-tfu', genCategoricalTFU, [7, 11, 4]],
  ['ga.deduction', 'ga.deduction.syllogism-follows', genSyllogismFollows, [7, 12, 5]],
  ['ga.deduction', 'ga.deduction.syllogism-does-not-follow', genSyllogismNotFollow, [4, 7, 3]],
  ['ga.deduction', 'ga.deduction.comparative-must-be-true', genComparativeMustBeTrue, [7, 11, 4]],
  ['ga.deduction', 'ga.deduction.categorical-must-be-false', genCategoricalMustBeFalse, [3, 6, 3]],
  ['ga.deduction', 'ga.deduction.conditional-chain', genConditionalChain, [4, 6, 2]],
  ['ga.analytical', 'ga.analytical.schedule-immediately-after', genScheduleImmediate, [5, 8, 3]],
  ['ga.analytical', 'ga.analytical.weekday-assignment', genWeekday, [5, 8, 3]],
  ['ga.analytical', 'ga.analytical.attribute-matching', genMatching, [5, 8, 3]],
  ['ga.analytical', 'ga.analytical.selection-conditions', genSelection, [5, 8, 3]],
  ['ga.analytical', 'ga.analytical.floor-stack', genFloors, [4, 8, 4]],
]

const items = []
const shortfalls = []
for (const [subtopic, family, gen, counts] of PLAN) {
  const plan = { subtopic, family }
  counts.forEach((target, i) => {
    const d = i + 1
    let made = 0
    for (let attempt = 0; attempt < 4000 && made < target; attempt++) {
      let spec = null
      try { spec = gen(d) } catch (e) { throw new Error(`${family} d${d}: ${e.stack}`) }
      const it = finalise(spec, plan, d)
      if (it) { items.push(it); made++ }
    }
    if (made < target) shortfalls.push(`${family} d${d}: ${made}/${target}`)
  })
}

// Final integrity checks on every item
for (const it of items) {
  if (it.o.length !== 4 || new Set(it.o).size !== 4 || it.a < 0 || it.a > 3) throw new Error(`bad options ${it.q}`)
  if (/undefined|null|NaN|\[object/.test(it.q + it.o.join('|') + it.explanation)) throw new Error(`bad text: ${it.q} | ${it.o} | ${it.explanation}`)
}
items.forEach((it, i) => { it.id = `${PREFIX}${String(i + 1).padStart(4, '0')}` })

mkdirSync(OUT_DIR, { recursive: true })
for (const f of readdirSync(OUT_DIR)) if (f.startsWith(FILE_PREFIX) && f.endsWith('.json')) unlinkSync(join(OUT_DIR, f))
for (let i = 0; i * 100 < items.length; i++) {
  const file = join(OUT_DIR, `${FILE_PREFIX}${String(i + 1).padStart(2, '0')}.json`)
  writeFileSync(file, `${JSON.stringify(items.slice(i * 100, i * 100 + 100), null, 2)}\n`)
}
const bySub = {}, byFam = {}, pos = [0, 0, 0, 0]
for (const it of items) {
  const s = (bySub[it.subtopic] ??= { total: 0, 1: 0, 2: 0, 3: 0 })
  s.total++; s[it.difficulty]++
  byFam[it.pattern_family] = (byFam[it.pattern_family] ?? 0) + 1
  pos[it.a]++
}
console.log(JSON.stringify({ total: items.length, bySubtopic: bySub, families: Object.keys(byFam).length, maxFamily: Math.max(...Object.values(byFam)), answerPositions: pos, shortfalls }, null, 2))
