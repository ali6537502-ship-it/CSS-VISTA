import test from 'node:test'
import assert from 'node:assert/strict'
import { featureState, features } from '../src/features/workspace/registry.ts'

test('every discoverable learning feature is free apart from the independent MPT hibernation', () => {
  for (const feature of features) {
    if (/^\/mpt(?:\/|$)/.test(feature.to)) continue
    assert.equal(featureState(feature), 'free', feature.to)
  }
})
test('retired General Ability, payment and usage pages are absent from feature discovery', () => {
  assert.deepEqual(features.filter(feature => /^\/account\/(?:general-ability|membership|ai-usage)(?:[/?]|$)/.test(feature.to)), [])
  for (const to of ['/account/precis','/account/expression','/account/argumentation','/account/analytical-skills','/account/essay-builder','/account/answer-performance']) {
    assert.ok(features.some(feature => feature.to === to), to)
  }
})
