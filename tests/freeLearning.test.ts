import test from 'node:test'
import assert from 'node:assert/strict'
import { isProDestination } from '../src/features/membership/proDestinations.ts'

test('learning workspaces remain visible to free accounts during the Pro pause', () => {
  for (const path of ['/account/precis?view=guide', '/account/expression', '/account/expression?view=studio', '/account/argumentation', '/account/analytical-skills', '/account/essay-builder', '/account/preparation?view=topics']) {
    assert.equal(isProDestination(path), false, path)
  }
})
test('free learning does not reopen payments, AI or unrelated held features', () => {
  for (const path of ['/account/membership', '/account/ask-vista', '/account/handwriting', '/account/general-ability', '/account/ai-usage']) {
    assert.equal(isProDestination(path), true, path)
  }
})
