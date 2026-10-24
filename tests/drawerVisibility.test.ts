import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldRenderDrawerLinks } from '../src/lib/drawerVisibility.ts'

test('closed drawer does not emit secondary links during SSR', () => {
  assert.equal(shouldRenderDrawerLinks(false), false)
  assert.equal(shouldRenderDrawerLinks(true), false)
})

test('browser drawer emits secondary links only when opened', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
    assert.equal(shouldRenderDrawerLinks(false), false)
    assert.equal(shouldRenderDrawerLinks(true), true)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else delete (globalThis as { window?: unknown }).window
  }
})
