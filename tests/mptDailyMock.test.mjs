import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

test('17 consecutive MPT papers have 200 unseen questions in FPSC section counts', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'mpt-daily-mock-'))
  try {
    const outfile = join(folder, 'mock.mjs')
    await build({ entryPoints: ['src/data/mockPapers.ts'], outfile, bundle: true, platform: 'node', format: 'esm', alias: { '@': resolve('src') }, logLevel: 'silent' })
    const { buildCompetitiveMock } = await import(pathToFileURL(outfile).href)
    const storage = new Map()
    globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }
    globalThis.fetch = async (url) => {
      const path = url === '/mcq/index.json' ? 'public/mcq/index.json'
        : url.startsWith('/css-subject-mcqs/') ? `public${url}`
          : url.replace('/mcq/', 'src/data/mcq-shards/')
      try { return { ok: true, json: async () => JSON.parse(readFileSync(path, 'utf8')) } }
      catch { return { ok: false, json: async () => [] } }
    }
    const seenIds = new Set()
    const seenStems = new Set()
    const expected = { 'Islamic Studies': 20, Urdu: 20, English: 50, 'General Abilities': 60, 'General Knowledge': 50 }
    for (let day = 1; day <= 17; day += 1) {
      const date = `2026-10-${String(day).padStart(2, '0')}`
      const paper = await buildCompetitiveMock('mpt', date, 'Test Student')
      assert.equal(paper.questions.length, 200, `day ${day}`)
      assert.equal(paper.timeSec, 12000)
      const counts = {}
      for (const question of paper.questions) {
        assert.equal(seenIds.has(question.id), false, `repeated ID on day ${day}: ${question.id}`)
        const stem = question.q.toLocaleLowerCase('en').normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
        assert.equal(seenStems.has(stem), false, `repeated stem on day ${day}: ${question.q}`)
        seenIds.add(question.id)
        seenStems.add(stem)
        counts[question.paperSection] = (counts[question.paperSection] || 0) + 1
      }
      assert.deepEqual(counts, expected)
      const resume = await buildCompetitiveMock('mpt', date, 'Test Student')
      assert.deepEqual(resume.questions, JSON.parse(JSON.stringify(paper.questions)), `day ${day} changed on reload`)
    }
  } finally { rmSync(folder, { recursive: true, force: true }) }
})
