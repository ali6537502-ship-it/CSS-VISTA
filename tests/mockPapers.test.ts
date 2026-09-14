import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createServer, type ViteDevServer } from 'vite'

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)))

interface BankQuestion {
  id: string
  q: string
  o: string[]
  a: number
  e?: string
  s?: string
  paperSection?: string
  paperTopic?: string
}

/**
 * The browser fetches question shards over HTTP; here they are read off disk
 * through the builder's data adapter. Without this the shard fetch silently
 * resolves to an empty list, which is how the previous suite managed to pass
 * while the mocks were drawing from a 1,859-question snapshot instead of the
 * shipped 38,000-question bank.
 */
function diskAdapter() {
  const index = JSON.parse(readFileSync(path.join(root, 'public', 'mcq', 'index.json'), 'utf8'))
  const cache = new Map<string, BankQuestion[]>()
  return {
    index: async () => index,
    chunk: async (slug: string, chunk: number) => {
      const key = `${slug}:${chunk}`
      if (!cache.has(key)) {
        try {
          cache.set(key, JSON.parse(readFileSync(path.join(root, 'public', 'mcq', `cat-${slug}-${chunk}.json`), 'utf8')))
        } catch {
          cache.set(key, [])
        }
      }
      return cache.get(key)!
    },
  }
}

async function loadBuilder(server: ViteDevServer) {
  const module = await server.ssrLoadModule('/src/data/mockPapers.ts')
  module.setMockDataAdapter(diskAdapter())
  return module
}

let server: ViteDevServer

test.before(async () => {
  server = await createServer({
    root,
    appType: 'custom',
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  })
})

test.after(async () => { await server?.close() })

test('every published blueprint adds up to its official paper', async () => {
  const { EXAM_BLUEPRINTS, validateBlueprint } = await server.ssrLoadModule('/src/data/examBlueprints.ts')
  const expected = {
    mpt: { total: 200, minutes: 200, negative: 0, sections: { English: 50, 'General Abilities': 60, 'General Knowledge': 50, 'Islamic Studies': 20, Urdu: 20 } },
    'pms-gk': { total: 100, minutes: 90, negative: 0.25, sections: { 'Current Affairs': 20, 'Physical Sciences': 16, 'Biological Sciences': 14, 'Environmental Science': 8, 'Food Sciences': 6, 'Computer Science & Information Technology': 12, 'Basic Mathematics': 16, General: 8 } },
    'one-paper': { total: 100, minutes: 90, negative: 0.25, sections: null as Record<string, number> | null },
  }

  for (const [kind, rules] of Object.entries(expected)) {
    const blueprint = EXAM_BLUEPRINTS[kind]
    validateBlueprint(blueprint)
    assert.equal(blueprint.totalQuestions, rules.total, `${kind} total`)
    assert.equal(blueprint.timeSec, rules.minutes * 60, `${kind} time`)
    assert.equal(blueprint.negativeMarkPerWrong, rules.negative, `${kind} negative marking`)
    if (rules.sections) {
      const actual = Object.fromEntries(blueprint.sections.map((section: { label: string; count: number }) => [section.label, section.count]))
      assert.deepEqual(actual, rules.sections, `${kind} section marks`)
    }
  }
})

test('each mock builds to the official section marks', async () => {
  const { buildCompetitiveMock, MOCK_BLUEPRINTS } = await loadBuilder(server)
  for (const kind of ['mpt', 'pms-gk', 'one-paper'] as const) {
    const paper = await buildCompetitiveMock(kind, { seed: `pattern-${kind}` })
    const total = MOCK_BLUEPRINTS[kind].reduce((sum: number, section: { count: number }) => sum + section.count, 0)
    assert.equal(paper.questions.length, total, `${kind} length`)
    for (const section of MOCK_BLUEPRINTS[kind]) {
      const actual = paper.questions.filter((question: BankQuestion) => question.paperSection === section.label).length
      assert.equal(actual, section.count, `${kind} · ${section.label}`)
    }
    for (const section of paper.sections) {
      for (const topic of section.topics) {
        const actual = paper.questions.filter((question: BankQuestion) => question.paperTopic === topic.label).length
        assert.equal(actual, topic.count, `${kind} · ${section.label} · ${topic.label}`)
      }
    }
  }
})

test('a mock paper never repeats a question, a stem or an option set', async () => {
  const { buildCompetitiveMock } = await loadBuilder(server)
  for (const kind of ['mpt', 'pms-gk', 'one-paper'] as const) {
    const paper = await buildCompetitiveMock(kind, { seed: `unique-${kind}` })
    const questions: BankQuestion[] = paper.questions
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length, `${kind} ids`)
    assert.equal(new Set(questions.map((question) => question.q.trim().toLocaleLowerCase())).size, questions.length, `${kind} stems`)
    for (const question of questions) {
      assert.equal(question.o.length, 4, `${kind} option count for ${question.id}`)
      assert.equal(new Set(question.o.map((option) => option.trim().toLocaleLowerCase())).size, 4, `${kind} duplicate option in ${question.id}`)
      assert.ok(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, `${kind} answer index for ${question.id}`)
    }
  }
})

test('two attempts at the same mock are substantially different papers', async () => {
  const { buildCompetitiveMock } = await loadBuilder(server)
  // The whole point of the rewrite: the default seed is random, so consecutive
  // attempts must not land on the same questions. Bank-drawn sections cannot be
  // 100% disjoint (a topic with a small pool will legitimately reuse items), so
  // the bar is a large majority rather than perfection.
  for (const kind of ['mpt', 'pms-gk', 'one-paper'] as const) {
    const first = await buildCompetitiveMock(kind)
    const second = await buildCompetitiveMock(kind)
    assert.notEqual(first.seed, second.seed, `${kind} seed`)
    const firstIds = new Set(first.questions.map((question: BankQuestion) => question.id))
    const shared = second.questions.filter((question: BankQuestion) => firstIds.has(question.id)).length
    const overlap = shared / second.questions.length
    assert.ok(overlap <= 0.2, `${kind} repeated ${Math.round(overlap * 100)}% of the previous paper's questions`)
  }
})

test('recently served questions are kept out of the next paper', async () => {
  const { buildCompetitiveMock } = await loadBuilder(server)
  const first = await buildCompetitiveMock('pms-gk', { seed: 'rotation-a' })
  const servedIds = first.questions.map((question: BankQuestion) => question.id)
  const second = await buildCompetitiveMock('pms-gk', { seed: 'rotation-a', avoidIds: servedIds })
  const repeated = second.questions.filter((question: BankQuestion) => servedIds.includes(question.id)).length
  assert.ok(repeated <= 5, `avoided paper still repeated ${repeated} questions`)
})

test('a fixed seed rebuilds exactly the same paper', async () => {
  const { buildCompetitiveMock } = await loadBuilder(server)
  const first = await buildCompetitiveMock('one-paper', { seed: 'reproducible' })
  const second = await buildCompetitiveMock('one-paper', { seed: 'reproducible' })
  assert.deepEqual(
    second.questions.map((question: BankQuestion) => [question.id, question.a]),
    first.questions.map((question: BankQuestion) => [question.id, question.a]),
  )
})
