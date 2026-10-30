import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

test('seeded daily questions are identical under reversed shard response timing', async () => {
  const compiled = await build({ entryPoints: ['src/data/mcq.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' })
  const originalFetch = globalThis.fetch
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } })
  try {
    const outcomes = []
    for (const reverse of [false, true]) {
      const categories = ['science', 'history', 'politics'].map(slug => ({ slug, name: slug, chunks: 1, count: 20, mpt: false }))
      globalThis.fetch = async value => {
        const path = String(value)
        if (path === '/mcq/index.json') return Response.json({ categories, total: 60 })
        const slug = /cat-([a-z]+)-0\.json/.exec(path)?.[1]
        assert.ok(slug, `Unexpected fixture request ${path}`)
        const index = categories.findIndex(category => category.slug === slug)
        await new Promise(resolve => setTimeout(resolve, (reverse ? 2 - index : index) * 10))
        return Response.json(Array.from({ length: 20 }, (_, item) => ({ id: `${slug}-${item + 1}`, q: `${slug} topic ${String.fromCharCode(65 + item)} details?`, o: ['A', 'B', 'C', 'D'], a: 0 })))
      }
      const source = compiled.outputFiles[0].text + `\n// isolated timing fixture ${reverse}`
      const module = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
      const questions = await module.sampleQuestions(categories.map(category => category.slug), 10, module.seededRandom(20261026))
      assert.equal(questions.length, 10)
      outcomes.push(questions.map(question => question.id))
    }
    assert.deepEqual(outcomes[0], outcomes[1])
  } finally {
    globalThis.fetch = originalFetch
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else delete globalThis.localStorage
  }
})
