import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSupabaseConfiguration } from '../src/lib/supabaseConfig.ts'

test('accepts a browser-safe publishable key and normalises the URL', () => {
  const result = resolveSupabaseConfiguration({
    url: ' https://example.supabase.co/ ',
    publishableKey: ' sb_publishable_example ',
  })

  assert.equal(result.configured, true)
  assert.equal(result.url, 'https://example.supabase.co')
  assert.equal(result.publishableKey, 'sb_publishable_example')
  assert.equal(result.error, null)
})

test('keeps guest mode when configuration is absent', () => {
  assert.deepEqual(resolveSupabaseConfiguration({}), {
    configured: false,
    url: null,
    publishableKey: null,
    error: null,
  })
})

test('uses the legacy anon key only as a compatibility fallback', () => {
  const result = resolveSupabaseConfiguration({
    url: 'https://example.supabase.co',
    publishableKey: '   ',
    legacyAnonKey: 'legacy-anon-key',
  })
  assert.equal(result.configured, true)
  assert.equal(result.publishableKey, 'legacy-anon-key')
})

test('rejects partial or placeholder configuration', () => {
  assert.equal(resolveSupabaseConfiguration({ url: 'https://example.supabase.co' }).configured, false)
  assert.equal(resolveSupabaseConfiguration({
    url: 'https://your-project.supabase.co',
    publishableKey: 'your-publishable-key',
  }).configured, false)
})

test('rejects privileged keys in public browser configuration', () => {
  const secret = resolveSupabaseConfiguration({
    url: 'https://example.supabase.co',
    publishableKey: 'sb_secret_example',
  })
  assert.equal(secret.configured, false)
  assert.match(secret.error || '', /must never be used in the browser/)

  const payload = globalThis.btoa(JSON.stringify({ role: 'service_role' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const legacyServiceRole = resolveSupabaseConfiguration({
    url: 'https://example.supabase.co',
    legacyAnonKey: `header.${payload}.signature`,
  })
  assert.equal(legacyServiceRole.configured, false)
})

test('allows the local Supabase development URL over HTTP', () => {
  const result = resolveSupabaseConfiguration({
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_local',
  })
  assert.equal(result.configured, true)
})
