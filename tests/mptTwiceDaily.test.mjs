import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'

// The CSS MPT Mock is only the audited official series (docs/mpt/DECISIONS.md D-54);
// its release gates live in tests/mptRelease.test.mjs. The former browser-built
// paper from unreviewed practice pools must no longer be served.
test('the browser engine no longer builds an MPT paper from practice pools', async () => {
  const bundle = await build({ entryPoints: ['src/data/mockPapers.ts'], bundle: true, platform: 'node', format: 'esm', write: false, alias: { '@': './src' }, logLevel: 'silent' })
  const { buildCompetitiveMock } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`)
  const storage = new Map()
  globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) }
  await assert.rejects(() => buildCompetitiveMock('mpt', '2026-10-01-15', 'Test student'), /scheduled official paper/)
})
