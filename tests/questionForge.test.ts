import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createServer, type ViteDevServer } from 'vite'

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)))

interface BankQuestion { id: string; q: string; o: string[]; a: number; e?: string; s?: string }

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const toNumber = (value: string) => Number(value.replace(/[^0-9.-]/g, ''))

let server: ViteDevServer
let forgeQuestions: (request: { topic: string; count: number; seed: string }) => BankQuestion[]
let topics: string[]

test.before(async () => {
  server = await createServer({ root, appType: 'custom', logLevel: 'silent', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true } })
  const module = await server.ssrLoadModule('/src/lib/forge/index.ts')
  forgeQuestions = module.forgeQuestions
  topics = module.FORGE_TOPICS
})

test.after(async () => { await server?.close() })

/** Every forged question, on every topic, in bulk. */
function forgeSample(count = 400): BankQuestion[] {
  return topics.flatMap((topic) => forgeQuestions({ topic, count, seed: `audit-${topic}` }))
}

test('forged questions are well formed', () => {
  for (const question of forgeSample()) {
    assert.ok(question.q.trim().length > 10, `stem too short: ${question.q}`)
    assert.equal(question.o.length, 4, `option count: ${question.q}`)
    assert.equal(new Set(question.o.map((option) => option.trim().toLocaleLowerCase())).size, 4, `duplicate option: ${question.q} ${JSON.stringify(question.o)}`)
    assert.ok(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, `answer index: ${question.q}`)
    assert.ok((question.e ?? '').trim().length > 10, `missing explanation: ${question.q}`)
    assert.ok(question.s, `missing subtopic: ${question.q}`)
    assert.ok(question.o.every((option) => option.trim().length > 0), `blank option: ${question.q}`)
  }
})

test('the answer key of computable items is independently correct', () => {
  // Re-derives the key from the question text rather than trusting the
  // generator's own arithmetic, so a generator that silently changes its
  // formula fails here instead of shipping a wrong answer to a candidate.
  const checks: { name: string; pattern: RegExp; expected: (match: RegExpMatchArray) => string | number }[] = [
    { name: 'percentage of a number', pattern: /^What is ([\d.]+)% of ([\d,]+)\?$/, expected: (m) => (Number(m[1]) * toNumber(m[2])) / 100 },
    { name: 'fraction of a number', pattern: /^What is (\d+)\/(\d+) of ([\d,]+)\?$/, expected: (m) => (toNumber(m[3]) * Number(m[1])) / Number(m[2]) },
    { name: 'order of operations', pattern: /^Evaluate: \((\d+) \+ (\d+)\) × (\d+) − (\d+)$/, expected: (m) => (Number(m[1]) + Number(m[2])) * Number(m[3]) - Number(m[4]) },
    { name: 'linear equation', pattern: /^Solve for x: (\d+)x \+ (\d+) = ([\d,]+)$/, expected: (m) => (toNumber(m[3]) - Number(m[2])) / Number(m[1]) },
    { name: 'remainder', pattern: /^What is the remainder when ([\d,]+) is divided by (\d+)\?$/, expected: (m) => toNumber(m[1]) % Number(m[2]) },
    { name: 'simple interest', pattern: /^Find the simple interest on Rs ([\d,]+) at (\d+)% per annum for (\d+) years\.$/, expected: (m) => (toNumber(m[1]) * Number(m[2]) * Number(m[3])) / 100 },
    { name: 'triangle angle', pattern: /^Two angles of a triangle measure (\d+)° and (\d+)°\. The third angle is:$/, expected: (m) => 180 - Number(m[1]) - Number(m[2]) },
    { name: 'letter value sum', pattern: /^If A = 1, B = 2, C = 3 and so on, what is the sum of the letters of the word ([A-Z]+)\?$/, expected: (m) => [...m[1]].reduce((sum, letter) => sum + (letter.charCodeAt(0) - 64), 0) },
    {
      name: 'clock angle',
      pattern: /^What is the angle between the hour hand and the minute hand of a clock at (\d+):(\d+)\?$/,
      expected: (m) => {
        const raw = Math.abs(30 * (Number(m[1]) % 12) - 5.5 * Number(m[2]))
        return Math.min(raw, 360 - raw)
      },
    },
    {
      name: 'calendar day',
      pattern: /^What day of the week was (\d+) (\w+) (\d+)\?$/,
      expected: (m) => WEEKDAYS[new Date(Date.UTC(Number(m[3]), MONTHS.indexOf(m[2]), Number(m[1]))).getUTCDay()],
    },
    {
      name: 'polygon exterior angle',
      pattern: /^Each exterior angle of a regular polygon with (\d+) sides measures:$/,
      expected: (m) => 360 / Number(m[1]),
    },
    {
      name: 'polygon interior angle',
      pattern: /^Each interior angle of a regular polygon with (\d+) sides measures:$/,
      expected: (m) => ((Number(m[1]) - 2) * 180) / Number(m[1]),
    },
  ]

  const verified = new Map<string, number>()
  for (const question of forgeSample(600)) {
    for (const check of checks) {
      const match = question.q.match(check.pattern)
      if (!match) continue
      const expected = check.expected(match)
      const actual = question.o[question.a]
      const matches = typeof expected === 'number'
        ? Math.abs(toNumber(actual) - expected) < 1e-6
        : actual.trim() === expected
      assert.ok(matches, `${check.name}: “${question.q}” keyed as “${actual}” but should be “${expected}”`)
      verified.set(check.name, (verified.get(check.name) ?? 0) + 1)
      break
    }
  }

  // A silent zero here would mean the checks stopped matching the generators
  // and were no longer verifying anything.
  for (const check of checks) {
    assert.ok((verified.get(check.name) ?? 0) > 0, `no ${check.name} items were produced to verify`)
  }
})

test('no forged distractor equals the key, and none is negative where the key is not', () => {
  for (const question of forgeSample(400)) {
    const key = question.o[question.a]
    const others = question.o.filter((_, index) => index !== question.a)
    for (const option of others) {
      assert.notEqual(option.trim().toLocaleLowerCase(), key.trim().toLocaleLowerCase(), `distractor repeats the key: ${question.q}`)
    }
    // Slopes, coordinates and equation roots are legitimately negative, so the
    // rule applies only where the quantity itself cannot be: money, counts,
    // distances, times, areas and angles. A negative option there is an
    // instant giveaway rather than a plausible candidate error.
    const signedDomain = question.s === 'Coordinate geometry' || question.s === 'Algebra'
    if (!signedDomain && /^(Rs |\d)/.test(key)) {
      for (const option of others) {
        assert.ok(!/^-|^Rs -/.test(option.trim()), `negative distractor against a positive key: ${question.q} ${JSON.stringify(question.o)}`)
      }
    }
  }
})

test('different seeds forge almost entirely different questions', () => {
  // 17 is the largest number of questions any blueprint draws from a single
  // forge topic (the MPT quantitative block), so this measures the real thing.
  // A single seed pair is noisy - one collision in eight items is already 13% -
  // so the bar is on the mean over many pairs, with a looser cap on the worst.
  const PAIRS = 24
  const DRAW = 17
  for (const topic of topics) {
    const overlaps: number[] = []
    for (let pair = 0; pair < PAIRS; pair += 1) {
      const first = forgeQuestions({ topic, count: DRAW, seed: `variety-${pair}-a` })
      const second = forgeQuestions({ topic, count: DRAW, seed: `variety-${pair}-b` })
      const firstIds = new Set(first.map((question) => question.id))
      overlaps.push(second.filter((question) => firstIds.has(question.id)).length / DRAW)
    }
    const mean = overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length
    const worst = Math.max(...overlaps)
    assert.ok(mean <= 0.15, `${topic} repeated ${Math.round(mean * 100)}% of a different seed's questions on average`)
    assert.ok(worst <= 0.35, `${topic} repeated ${Math.round(worst * 100)}% of a different seed's questions at worst`)
  }
})
