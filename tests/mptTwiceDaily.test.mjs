import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { build } from 'esbuild'

test('17 days of two full MPT papers contain no repeated question or stem', { timeout: 120000 }, async () => {
  const bundle = await build({
    entryPoints: ['src/data/mockPapers.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    alias: { '@': './src' },
  })
  const url = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`
  const { buildCompetitiveMock } = await import(url)
  const storage = new Map()
  const oldStorage = globalThis.localStorage
  const oldFetch = globalThis.fetch
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
  globalThis.fetch = async (url) => {
    try {
      const path = String(url) === '/mcq/index.json'
        ? 'public/mcq/index.json'
        : String(url).startsWith('/css-subject-mcqs/')
          ? `public${url}`
          : String(url).replace('/mcq/', 'src/data/mcq-shards/')
      return { ok: true, json: async () => JSON.parse(readFileSync(path, 'utf8')) }
    } catch {
      return { ok: false, json: async () => [] }
    }
  }

  try {
    const ids = new Set()
    const stems = new Set()
    for (let day = 1; day <= 17; day += 1) {
      const date = `2026-10-${String(day).padStart(2, '0')}`
      for (const key of [`${date}-15`, date]) {
        const paper = await buildCompetitiveMock('mpt', key, 'Test student')
        assert.equal(paper.questions.length, 200, `paper ${key}`)
        assert.deepEqual(paper.blueprint.map((part) => part.count), [20, 20, 50, 60, 50])
        for (const question of paper.questions) {
          const stem = question.q.normalize('NFKD').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
          assert(!ids.has(question.id), `Repeated ID ${question.id} in ${key}`)
          assert(!stems.has(stem), `Repeated stem ${question.q} in ${key}`)
          ids.add(question.id)
          stems.add(stem)
        }
        assert.equal(JSON.stringify((await buildCompetitiveMock('mpt', key, 'Test student')).questions), JSON.stringify(paper.questions), `paper ${key} should resume`)
      }
    }
    assert.equal(ids.size, 6800)
  } finally {
    globalThis.localStorage = oldStorage
    globalThis.fetch = oldFetch
  }
})
