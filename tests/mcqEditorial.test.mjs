import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { planReviewedMcqUpdates, reviewedQuestion } from '../scripts/editorial/reviewed-mcqs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const review = JSON.parse(fs.readFileSync(path.join(root, 'scripts/editorial/reviewed-mcq-explanations.json'), 'utf8'))
const readShard = shard => JSON.parse(fs.readFileSync(path.join(root, 'public/mcq', shard), 'utf8'))

test('the bounded editorial ledger matches both copies and preserves question identity', () => {
  assert.deepEqual(planReviewedMcqUpdates(root, review), [])
  for (const change of review.changes) {
    const row = readShard(change.shard).find(question => question.id === change.id)
    assert.equal(row.id, change.before.id)
    assert.equal(row.q, change.before.q)
    assert.deepEqual(row.o, change.before.o, `${change.id}: option order must preserve saved answer identities`)
    assert.equal(row.s, change.before.s)
    if (row.a !== change.before.a) assert.ok(change.correctionNote)
    if (row.sourceUrl) {
      assert.ok(change.sourceIds.some(id => review.sources[id].url === row.sourceUrl), `${change.id}: public reference must be an inspected source`)
    }
  }
  assert.equal(new Set(review.changes.map(change => change.id)).size, review.changes.length)
})

test('number-series explanations fit every given term, the missing position and the keyed option', () => {
  const isPrime = value => value >= 2 && Array.from({ length: Math.max(0, Math.floor(Math.sqrt(value)) - 1) }, (_, index) => index + 2).every(divisor => value % divisor !== 0)
  for (const change of review.changes.filter(entry => entry.verification.kind !== 'grammar-or-dictionary')) {
    const row = reviewedQuestion(change)
    const values = change.verification.completedSequence
    const parts = row.q.split(',').map(part => part.trim())
    assert.equal(parts.filter(part => part === '?').length, 1)
    assert.equal(parts.length, values.length)
    parts.forEach((part, index) => assert.equal(values[index], part === '?' ? Number(row.o[row.a]) : Number(part), `${row.id}: sequence differs from the actual question`))
    const proof = change.verification
    for (let index = 1; index < values.length; index += 1) {
      const previous = values[index - 1]
      let expected
      if (proof.kind === 'affine') expected = previous * proof.multiplier + proof.addend
      else if (proof.kind === 'interleaved') {
        if (index < 2) continue
        expected = values[index - 2] + proof.increments[index % 2]
      } else if (proof.kind === 'alternating') {
        const [operation, operand] = proof.operations[(index - 1) % proof.operations.length]
        assert.ok(['add', 'multiply'].includes(operation))
        expected = operation === 'add' ? previous + operand : previous * operand
      } else if (proof.kind === 'differences') expected = previous + proof.increments[(index - 1) % proof.increments.length]
      else if (proof.kind === 'growing-differences') expected = previous + proof.firstDifference + (index - 1) * proof.increase
      else if (proof.kind === 'doubling-differences') expected = previous + proof.firstDifference * 2 ** (index - 1)
      else if (proof.kind === 'previous-two') {
        if (index < 2) continue
        expected = previous + values[index - 2] + proof.addend
      } else if (proof.kind === 'prime-differences') {
        const primes = []
        for (let candidate = 2; primes.length < values.length; candidate += 1) if (isPrime(candidate)) primes.push(candidate)
        expected = previous + primes[index - 1]
      } else assert.fail(`${row.id}: unknown calculation proof`)
      assert.equal(values[index], expected, `${row.id}: the described rule fails at position ${index + 1}`)
    }
  }
})

test('the confirmed analogy correction has evidence and does not rewrite stored attempts', () => {
  const corrections = review.changes.filter(change => change.patch.a !== undefined && change.patch.a !== change.before.a)
  assert.deepEqual(corrections.map(change => change.id), ['english-grammar-6407'])
  const correction = corrections[0]
  assert.equal(correction.before.o[correction.before.a], 'Aerates: Aviator')
  assert.equal(correction.before.o[correction.patch.a], 'Senator: Legislates')
  assert.ok(correction.sourceIds.includes('senate-powers'))
  for (const sourceId of correction.sourceIds) {
    const source = review.sources[sourceId]
    assert.equal(source.httpStatus, 200)
    assert.match(source.url, /^https:\/\/(dictionary\.cambridge\.org|www\.senate\.gov)\//)
    assert.match(source.responseSha256, /^[a-f0-9]{64}$/)
  }
})

test('ambiguous source questions stay intact and are not counted as completed repairs', () => {
  const changedIds = new Set(review.changes.map(change => change.id))
  for (const candidate of review.unresolved) {
    assert.ok(!changedIds.has(candidate.id))
    assert.deepEqual(readShard(candidate.shard).find(row => row.id === candidate.id), candidate.snapshot)
    assert.ok(candidate.issue && candidate.action)
  }
})

test('review application refuses source drift and differing public/bundled copies before writing', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cssv-mcq-editorial-'))
  const change = review.changes[0]
  const publicPath = path.join(temporaryRoot, 'public/mcq', change.shard)
  const bundledPath = path.join(temporaryRoot, 'src/data/mcq-shards', change.shard)
  const save = (publicRows, bundledRows = publicRows) => {
    fs.mkdirSync(path.dirname(publicPath), { recursive: true })
    fs.mkdirSync(path.dirname(bundledPath), { recursive: true })
    fs.writeFileSync(publicPath, `${JSON.stringify(publicRows)}\n`)
    fs.writeFileSync(bundledPath, `${JSON.stringify(bundledRows)}\n`)
  }
  try {
    save([change.before])
    assert.equal(planReviewedMcqUpdates(temporaryRoot, { changes: [change] }).length, 1)
    const drifted = { ...change.before, q: 'A subsequently edited question' }
    save([drifted])
    assert.throws(() => planReviewedMcqUpdates(temporaryRoot, { changes: [change] }), /source changed after review/)
    assert.deepEqual(JSON.parse(fs.readFileSync(publicPath)), [drifted])
    save([change.before], [drifted])
    assert.throws(() => planReviewedMcqUpdates(temporaryRoot, { changes: [change] }), /public and bundled sources differ/)
    save([change.before, change.before])
    assert.throws(() => planReviewedMcqUpdates(temporaryRoot, { changes: [change] }), /source row missing or duplicated/)
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
})

test('the review tool cannot silently change options, wording or an undocumented answer', () => {
  const change = review.changes[0]
  assert.throws(() => reviewedQuestion({ ...change, patch: { ...change.patch, o: ['Replacement choices'] } }), /cannot change IDs, stems, choices/)
  assert.throws(() => reviewedQuestion({ ...change, patch: { ...change.patch, a: (change.before.a + 1) % 4 } }), /answer correction needs an explicit reason/)
})
