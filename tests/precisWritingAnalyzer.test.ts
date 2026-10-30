import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzePrecisWriting } from '../src/features/precis/writingAnalyzer.ts'

const original = 'Rapid urban growth increases pressure on housing, transport, sanitation, schools, hospitals, and employment. When cities expand without adequate planning, congestion, pollution, inequality, and social tension may increase. Urbanization contributes to development only when infrastructure and public services keep pace with population growth.'
function check(draft: string, title = 'Urban Growth and Planning', limit: number | null = null) {
  return analyzePrecisWriting({ original, draft, title, limit })
}
function codes(input: ReturnType<typeof check>) {
  return input.findings.map((finding) => finding.id)
}

test('flags clear repeated words, grammar, prepositions, double comparisons and modals', () => {
  const result = check('People is very very concerned about planning. They discuss about services. A university can improves roads. This is more better.', 'Urban Services')
  assert.ok(codes(result).includes('people-is'))
  assert.ok(codes(result).includes('discuss-about'))
  assert.ok(codes(result).includes('modal-verb'))
  assert.ok(codes(result).includes('more-better'))
  assert.ok(codes(result).includes('really-very'))
  assert.ok(!codes(result).includes('an-consonant'))
  const duplicate = check('Cities cities need better services.')
  assert.ok(codes(duplicate).includes('repeated-word'))
})

test('checks detectable article, punctuation and agreement errors with an exact excerpt', () => {
  const result = check('an university ,have  problems.It does improves services')
  for (const code of ['an-consonant','space-before-punctuation','double-space','missing-space-period','doesnt-base','end-punctuation'])
    assert.ok(codes(result).includes(code), code)
  assert.ok(result.findings.some((f)=>f.id==='an-consonant' && f.excerpt==='an university'))
})

test('preserves qualification and contrast as review prompts rather than invented semantic errors', () => {
  const result = check('Urbanization always guarantees development.')
  assert.ok(codes(result).includes('condition-review'))
  assert.ok(codes(result).includes('overstatement-review'))
  assert.equal(result.findings.find((finding)=>finding.id==='condition-review')?.certainty,'review')
  assert.ok(result.findings.every((finding)=>finding.handbook.startsWith('Chapter ')))
})

test('checks explicit word limit and title without inventing an official score', () => {
  const result = check('Cities need adequate planning and public services to support development.', '', 4)
  assert.equal(result.draftWords, 11)
  assert.ok(codes(result).includes('explicit-length'))
  assert.ok(codes(result).includes('no-title'))
  assert.ok(result.findings.find((f)=>f.id==='explicit-length')!.advice.includes('7 words'))
  assert.equal(Object.hasOwn(result,'score'),false)
})

test('warns on copied extended sequences but does not treat every shared phrase as plagiarism', () => {
  const copied = check('Rapid urban growth increases pressure on housing, transport, sanitation, schools, hospitals, and employment.')
  assert.ok(codes(copied).includes('source-copy'))
  const short = check('Urban expansion strains public infrastructure and services.')
  assert.ok(!codes(short).includes('source-copy'))
})

test('avoids overclaim when original contains an identical absolute statement', () => {
  const result = analyzePrecisWriting({
    original:'Governance always requires fair application of rules.',
    draft:'Fair application of rules always matters in governance.',
    title:'Fair Governance', limit:null,
  })
  assert.ok(!codes(result).includes('overstatement-review'))
  assert.equal(result.scope.includes('not a complete grammar'),true)
})

test('empty answer receives an actionable prompt, not a made-up evaluation', () => {
  const result = check('  ', '', 10)
  assert.deepEqual(codes(result),['empty-draft'])
  assert.equal(result.draftWords,0)
})
