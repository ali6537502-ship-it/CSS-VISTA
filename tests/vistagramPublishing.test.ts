import test from 'node:test'
import assert from 'node:assert/strict'
import {
  titleSimilarity,
  validateVistagramBatch,
  wordCountFromPost,
} from '../scripts/lib/vistagram-schema.mjs'

function article(overrides: Record<string, unknown> = {}) {
  const seed = String(overrides.slug || 'sample-topic')
  const paragraph = Array.from({ length: 90 }, (_, index) => `verified educational context ${index + 1}`).join(' ')
  return {
    id: seed,
    slug: seed,
    dedupeKey: seed,
    scope: 'Global',
    title: 'Understanding Social Capital in Modern Societies',
    excerpt: 'A concise introduction to social capital, its main forms, measurement and relevance for institutions and development.',
    type: 'Concept',
    category: 'Society',
    topic: 'Social Capital',
    tags: ['Society', 'Development'],
    sections: [
      { heading: 'Core idea', paragraphs: [paragraph] },
      { heading: 'Applications', paragraphs: [paragraph] },
    ],
    sources: [{ label: 'World Bank', url: 'https://www.worldbank.org/' }],
    evergreen: true,
    ...overrides,
  }
}

function validBatch() {
  return {
    schema_version: 1,
    profile: 'daily-six',
    date: '2026-09-22',
    published_at: '2026-09-22T12:00:00+05:00',
    edition: 'CSS Vistagram Daily Six — 22 September 2026',
    editorial_safety: {
      neutral_factual: true,
      non_partisan: true,
      no_personal_attacks: true,
      respectful_of_state_and_religion: true,
      no_defamation_or_inflammatory_framing: true,
    },
    posts: [
      article({ id: 'pk-water-governance', slug: 'pk-water-governance', dedupeKey: 'pk-water-governance', scope: 'Pakistan', title: 'Pakistan Water Governance and Institutional Coordination' }),
      article({ id: 'pk-export-diversification', slug: 'pk-export-diversification', dedupeKey: 'pk-export-diversification', scope: 'Pakistan', title: 'Pakistan Export Diversification and Economic Resilience' }),
      article({ id: 'pk-urban-planning', slug: 'pk-urban-planning', dedupeKey: 'pk-urban-planning', scope: 'Pakistan', title: 'Urban Planning in Pakistan and Sustainable City Growth' }),
      article({ id: 'global-social-capital', slug: 'global-social-capital', dedupeKey: 'global-social-capital', scope: 'Global', title: 'Understanding Social Capital in Modern Societies' }),
      article({ id: 'global-circular-economy', slug: 'global-circular-economy', dedupeKey: 'global-circular-economy', scope: 'Global', title: 'Circular Economy Principles and Resource Efficiency' }),
      article({ id: 'global-demographic-dividend', slug: 'global-demographic-dividend', dedupeKey: 'global-demographic-dividend', scope: 'Global', title: 'Demographic Dividend and the Conditions for Growth' }),
    ],
  }
}

test('daily-six accepts exactly three Pakistan and three Global posts', () => {
  const batch = validBatch()
  assert.equal(validateVistagramBatch(batch), batch)
})

test('launch-ten accepts exactly five Pakistan and five Global posts', () => {
  const batch = validBatch()
  batch.profile = 'launch-ten'
  batch.posts = [
    ...batch.posts,
    article({ id: 'pk-regional-cooperation', slug: 'pk-regional-cooperation', dedupeKey: 'pk-regional-cooperation', scope: 'Pakistan', title: 'Pakistan and Regional Cooperation Institutions' }),
    article({ id: 'pk-natural-resources', slug: 'pk-natural-resources', dedupeKey: 'pk-natural-resources', scope: 'Pakistan', title: 'Pakistan Natural Resources and Economic Geography' }),
    article({ id: 'global-ai-fundamentals', slug: 'global-ai-fundamentals', dedupeKey: 'global-ai-fundamentals', scope: 'Global', title: 'Artificial Intelligence Fundamentals and Machine-Based Decisions' }),
    article({ id: 'global-remote-sensing', slug: 'global-remote-sensing', dedupeKey: 'global-remote-sensing', scope: 'Global', title: 'Remote Sensing and Earth Observation in Environmental Science' }),
  ]
  assert.equal(validateVistagramBatch(batch), batch)
})

test('daily-six rejects the wrong geographic mix', () => {
  const batch = validBatch()
  batch.posts[0].scope = 'Global'
  assert.throws(() => validateVistagramBatch(batch), /exactly 3 Pakistan and 3 Global/i)
})

test('current updates require at least two sources', () => {
  const batch = validBatch()
  batch.posts[0].type = 'Current Update'
  assert.throws(() => validateVistagramBatch(batch), /at least two independent sources/i)
})

test('article word counting is stable and substantive', () => {
  assert.ok(wordCountFromPost(validBatch().posts[0]) >= 350)
})

test('similar titles are detected while distinct topics stay distinct', () => {
  assert.ok(titleSimilarity('Pakistan Water Governance and Institutional Coordination', 'Institutional Coordination in Pakistan Water Governance') >= 0.72)
  assert.ok(titleSimilarity('Pakistan Water Governance and Institutional Coordination', 'Circular Economy Principles and Resource Efficiency') < 0.72)
})

test('all editorial safety declarations are mandatory', () => {
  const batch = validBatch()
  batch.editorial_safety.no_personal_attacks = false
  assert.throws(() => validateVistagramBatch(batch))
})
