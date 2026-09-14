import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)))

test('the shipped CSS and GK banks contain no deterministic duplicate facts', () => {
  const result = spawnSync(process.execPath, ['scripts/clean-mcq-quality.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
})

test('all GK shard counts match the public index', () => {
  const index = JSON.parse(readFileSync(path.join(root, 'public', 'mcq', 'index.json'), 'utf8'))
  let total = 0
  for (const category of index.categories) {
    let count = 0
    for (let chunk = 0; chunk < category.chunks; chunk += 1) {
      const rows = JSON.parse(readFileSync(path.join(root, 'public', 'mcq', `cat-${category.slug}-${chunk}.json`), 'utf8'))
      count += rows.length
    }
    assert.equal(count, category.count, category.slug)
    total += count
  }
  assert.equal(total, index.total)
})

test('all CSS subject-bank counts match the public index', () => {
  const index = JSON.parse(readFileSync(path.join(root, 'public', 'css-subject-mcqs', 'index.json'), 'utf8'))
  let total = 0
  for (const subject of index.subjects) {
    const rows = JSON.parse(readFileSync(path.join(root, 'public', 'css-subject-mcqs', subject.file), 'utf8'))
    assert.equal(rows.length, subject.count, subject.slug)
    total += rows.length
  }
  assert.equal(total, index.total)
})

// Blueprint conformance, per-attempt uniqueness and the generated-question
// audit live in tests/mockPapers.test.ts and tests/questionForge.test.ts, which
// feed the builder its shards from disk. This file stays with the shipped data.
