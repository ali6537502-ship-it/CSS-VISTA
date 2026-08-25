import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLatestVersionUrl, isDynamicImportFailure } from '../src/lib/chunkRecovery.ts'

test('recognises browser and Vite dynamic import failures', () => {
  assert.equal(isDynamicImportFailure(new TypeError('Failed to fetch dynamically imported module: https://www.css-vista.com/assets/Mistakes-old.js')), true)
  assert.equal(isDynamicImportFailure(new Error('Importing a module script failed.')), true)
  assert.equal(isDynamicImportFailure(new Error('Unable to preload CSS for /assets/page-old.css')), true)
  assert.equal(isDynamicImportFailure(new Error('A normal page error')), false)
})

test('adds a cache buster without losing route state or the hash', () => {
  const result = new URL(buildLatestVersionUrl('https://www.css-vista.com/gk/quiz?mode=practice#question-4', 12345))
  assert.equal(result.pathname, '/gk/quiz')
  assert.equal(result.searchParams.get('mode'), 'practice')
  assert.equal(result.searchParams.get('__cssv_refresh'), '9ix')
  assert.equal(result.hash, '#question-4')
})
