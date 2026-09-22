import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'

test('two independent MPT registrations open at 3 PM and 10:30 PM Pakistan time', async () => {
  const bundle = await build({ entryPoints: ['src/lib/store.ts'], bundle: true, platform: 'node', format: 'esm', write: false, alias: { '@': './src' } })
  const source = Buffer.from(bundle.outputFiles[0].contents).toString('base64')
  const oldStorage = globalThis.localStorage
  const memory = new Map()
  globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) }
  try {
    const { getDailyMockStatus } = await import(`data:text/javascript;base64,${source}`)
    const status = (kind, localClock) => getDailyMockStatus(kind, new Date(`2026-10-01T${localClock}+05:00`))
    assert.equal(status('mpt-afternoon', '14:59:59').state, 'upcoming')
    assert.equal(status('mpt-afternoon', '15:00:00').state, 'live')
    assert.equal(status('mpt-afternoon', '16:59:59').state, 'live')
    assert.equal(status('mpt-afternoon', '17:00:00').state, 'closed')
    assert.equal(status('mpt', '15:00:00').state, 'upcoming')
    assert.equal(status('mpt', '22:29:59').state, 'upcoming')
    assert.equal(status('mpt', '22:30:00').state, 'live')
    assert.equal(status('mpt', '23:59:59').state, 'live')
    assert.equal(status('mpt', '00:00:00').state, 'upcoming')
    assert.notEqual(status('mpt-afternoon', '15:00:00').route, status('mpt', '22:30:00').route)
  } finally {
    globalThis.localStorage = oldStorage
  }
})
