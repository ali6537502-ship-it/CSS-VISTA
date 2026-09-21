/**
 * Optional-subject notes regression tests.
 *
 * Generated from 23 source documents by scripts/import_optional_notes.py.
 * The documents disagree about what each heading level means, so the mapping
 * is declared in that script rather than inferred. These tests pin the result:
 * every subject is a real FPSC optional subject, sitting in the right group,
 * with topics that carry real content.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getRoutePolicy } from '../src/data/routeRegistry.mjs'
import { optionalGroups } from '../src/data/syllabus.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const dataDir = join(root, 'public/study-material/optional')
const index = JSON.parse(
  readFileSync(join(root, 'src/data/bundled/optional-notes-index.json'), 'utf8'),
) as {
  subjectTotal: number
  topicTotal: number
  groups: Array<{
    group: number
    rule: string
    subjects: Array<{
      subject: string; slug: string; marks: number; topicCount: number
      topics: Array<{ slug: string; title: string; words: number }>
    }>
  }>
}

interface Block { kind: string; segments?: Array<{ text: string }>; items?: Array<Array<{ text: string }>>; rows?: string[][]; text?: string }

const topicFile = (subjectSlug: string, topicSlug: string) =>
  JSON.parse(readFileSync(join(dataDir, subjectSlug, `${topicSlug}.json`), 'utf8')) as
    { subject: string; group: number; title: string; blocks: Block[]; words: number }

test('notes are published for subjects across all seven FPSC groups', () => {
  assert.deepEqual(index.groups.map((group) => group.group), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(index.subjectTotal, index.groups.reduce((n, g) => n + g.subjects.length, 0))
  assert.ok(index.subjectTotal >= 30, `expected most optional subjects, got ${index.subjectTotal}`)
  assert.ok(index.topicTotal >= 300, `expected the full topic set, got ${index.topicTotal}`)
})

test('every subject is a real FPSC optional subject in its declared group', () => {
  // This is what stops notes appearing under a subject or group that the
  // examination does not have.
  const canonical = new Map<string, { group: number; marks: number }>()
  for (const group of optionalGroups) {
    for (const subject of group.subjects) {
      canonical.set(subject.name, { group: group.group, marks: subject.marks })
    }
  }
  for (const group of index.groups) {
    for (const subject of group.subjects) {
      const match = canonical.get(subject.subject)
      assert.ok(match, `"${subject.subject}" is not an FPSC optional subject`)
      assert.equal(match.group, group.group, `${subject.subject} is in the wrong group`)
      assert.equal(match.marks, subject.marks, `${subject.subject} has the wrong marks`)
    }
  }
})

test('subject and topic slugs are unique', () => {
  const subjectSlugs = index.groups.flatMap((group) => group.subjects.map((s) => s.slug))
  assert.equal(new Set(subjectSlugs).size, subjectSlugs.length, 'duplicate subject slug')
  for (const group of index.groups) {
    for (const subject of group.subjects) {
      const slugs = subject.topics.map((topic) => topic.slug)
      assert.equal(new Set(slugs).size, slugs.length, `${subject.slug} has duplicate topic slugs`)
    }
  }
})

test('every topic carries real content, and none swallowed its whole subject', () => {
  for (const group of index.groups) {
    for (const subject of group.subjects) {
      assert.ok(subject.topics.length > 0, `${subject.subject} has no topics`)
      for (const topic of subject.topics) {
        const payload = topicFile(subject.slug, topic.slug)
        assert.equal(payload.subject, subject.subject)
        assert.equal(payload.group, group.group)
        assert.ok(payload.blocks.length > 0, `${subject.slug}/${topic.slug} is empty`)
        assert.ok(topic.words >= 25, `${subject.slug}/${topic.slug} has only ${topic.words} words`)
        // A topic holding almost the entire subject means the heading level
        // was mis-declared and the document was not really split.
        const subjectWords = subject.topics.reduce((total, item) => total + item.words, 0)
        if (subject.topics.length > 2) {
          assert.ok(topic.words / subjectWords < 0.8,
            `${subject.slug}/${topic.slug} holds ${Math.round(topic.words / subjectWords * 100)}% of the subject`)
        }
      }
    }
  }
})

test('block kinds are all ones the renderer knows', () => {
  const known = new Set(['heading', 'para', 'list', 'callout', 'table'])
  for (const group of index.groups) {
    for (const subject of group.subjects) {
      for (const topic of subject.topics) {
        for (const block of topicFile(subject.slug, topic.slug).blocks) {
          assert.ok(known.has(block.kind), `unknown block kind "${block.kind}"`)
        }
      }
    }
  }
})

test('the notes are public, indexable and ad-eligible', () => {
  const subject = index.groups[0].subjects[0]
  for (const path of [
    '/study-material/optional',
    `/study-material/optional/${subject.slug}`,
    `/study-material/optional/${subject.slug}/${subject.topics[0].slug}`,
  ]) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.known, true, `${path} is not in the route registry`)
    assert.equal(policy.access, 'public', path)
    assert.equal(policy.indexable, true, path)
    assert.equal(policy.adMode, 'enabled', path)
  }
})

test('every published topic has a data file the browser can fetch', () => {
  for (const group of index.groups) {
    for (const subject of group.subjects) {
      assert.ok(existsSync(join(dataDir, `${subject.slug}.json`)), `${subject.slug}.json missing`)
      for (const topic of subject.topics) {
        assert.ok(existsSync(join(dataDir, subject.slug, `${topic.slug}.json`)),
          `${subject.slug}/${topic.slug}.json missing`)
      }
    }
  }
})
