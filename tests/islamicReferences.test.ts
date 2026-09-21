/**
 * Islamic Studies reference bank regression tests.
 *
 * Generated from the seven chapter documents by
 * scripts/import_islamic_references.py. These pin the contract the pages rely
 * on, and in particular the one the reader sees: English and Urdu are held as
 * separate parallel fields and are never merged into a single string.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getRoutePolicy } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dataDir = join(root, 'public/study-material/islamic-studies')
const index = JSON.parse(
  readFileSync(join(root, 'src/data/bundled/islamic-references-index.json'), 'utf8'),
) as {
  referenceTotal: number
  chapters: Array<{
    numeral: string; slug: string; titleEn: string; titleUr: string; referenceCount: number
    topics: Array<{ slug: string; titleEn: string; titleUr: string; count: number; first: number; last: number }>
  }>
}

const ARABIC = /[؀-ۿ]/
const LATIN = /[A-Za-z]/

function topicPayload(chapterSlug: string, topicSlug: string) {
  return JSON.parse(readFileSync(join(dataDir, chapterSlug, `${topicSlug}.json`), 'utf8')) as {
    entries: Array<{
      number: number; titleEn: string; titleUr: string
      arabic: Array<{ kind: string; paragraphs: Array<Array<{ text: string; url?: string }>> }>
      blocks: Array<{ en: Array<Array<{ text: string; url?: string }>>; ur: Array<Array<{ text: string; url?: string }>> }>
    }>
  }
}

test('all seven CSS Islamic Studies chapters are published', () => {
  assert.equal(index.chapters.length, 7)
  assert.deepEqual(index.chapters.map((c) => c.numeral), ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'])
  assert.equal(index.referenceTotal, 1382)
})

test('every chapter and topic carries both an English and an Urdu title', () => {
  for (const chapter of index.chapters) {
    assert.ok(LATIN.test(chapter.titleEn), `${chapter.slug} has no English title`)
    assert.ok(ARABIC.test(chapter.titleUr), `${chapter.slug} has no Urdu title`)
    assert.ok(chapter.topics.length > 0, `${chapter.slug} has no topics`)
    for (const topic of chapter.topics) {
      assert.ok(topic.titleEn.trim().length > 0, `${chapter.slug}/${topic.slug} has no English title`)
      assert.ok(ARABIC.test(topic.titleUr), `${chapter.slug}/${topic.slug} has no Urdu title`)
      assert.ok(topic.count > 0)
    }
  }
})

test('topic reference counts add up to the chapter total, with no gaps', () => {
  for (const chapter of index.chapters) {
    const counted = chapter.topics.reduce((total, topic) => total + topic.count, 0)
    assert.equal(counted, chapter.referenceCount, `${chapter.slug} topic counts disagree with its total`)
    const numbers = chapter.topics.flatMap((topic) => {
      const payload = topicPayload(chapter.slug, topic.slug)
      return payload.entries.map((entry) => entry.number)
    })
    assert.deepEqual(
      numbers,
      Array.from({ length: chapter.referenceCount }, (_, i) => i + 1),
      `${chapter.slug} reference numbering is not continuous`,
    )
  }
})

test('the English and Urdu columns are never swapped', () => {
  // English left, Urdu right is the whole point of the layout. A fixed script
  // ratio is the wrong test, because scholarly English legitimately cites
  // Arabic inline - a lexeme such as "entry 'abd (عبد)", or Ibn Khaldun's
  // Arabic chapter title as a locator - and that must survive the import.
  // What must never happen is the two sides being exchanged, so each pair is
  // compared against the other: the English side must be the more Latin of
  // the two, and the Urdu side the more Arabic.
  const latinRatio = (value: string) => {
    const letters = value.replace(/[^\p{L}]/gu, '')
    if (!letters) return 0
    return letters.replace(/[^A-Za-z]/g, '').length / letters.length
  }
  let compared = 0
  for (const chapter of index.chapters) {
    for (const topic of chapter.topics) {
      for (const entry of topicPayload(chapter.slug, topic.slug).entries) {
        assert.ok(!ARABIC.test(entry.titleEn), `${chapter.slug} ref ${entry.number}: Urdu script in the English title`)
        assert.ok(ARABIC.test(entry.titleUr) || entry.titleUr === '',
          `${chapter.slug} ref ${entry.number}: the Urdu title carries no Urdu script`)
        for (const block of entry.blocks) {
          const english = block.en.flat().map((s) => s.text).join(' ')
          const urdu = block.ur.flat().map((s) => s.text).join(' ')
          if (english.length < 40 || urdu.length < 40) continue
          assert.ok(
            latinRatio(english) > latinRatio(urdu),
            `${chapter.slug} ref ${entry.number}: the English and Urdu columns look swapped`,
          )
          compared += 1
        }
      }
    }
  }
  assert.ok(compared > 1000, `expected to compare the whole bank, compared ${compared} pairs`)
})

test('Arabic source passages are kept out of the two language columns', () => {
  // The Arabic original belongs to neither column, so the page can set it
  // full width. It is stored separately for exactly that reason.
  let arabicBlocks = 0
  for (const chapter of index.chapters) {
    for (const topic of chapter.topics) {
      for (const entry of topicPayload(chapter.slug, topic.slug).entries) {
        for (const block of entry.arabic) {
          assert.ok(['arabic', 'note'].includes(block.kind))
          assert.ok(block.paragraphs.length > 0)
          if (block.kind === 'arabic') arabicBlocks += 1
        }
      }
    }
  }
  assert.ok(arabicBlocks > 500, `expected the Arabic passages to be preserved, found ${arabicBlocks}`)
})

test('every entry carries real content', () => {
  for (const chapter of index.chapters) {
    for (const topic of chapter.topics) {
      for (const entry of topicPayload(chapter.slug, topic.slug).entries) {
        assert.ok(entry.arabic.length > 0 || entry.blocks.length > 0,
          `${chapter.slug} ref ${entry.number} is empty`)
        assert.ok(entry.titleEn.trim().length > 0, `${chapter.slug} ref ${entry.number} has no title`)
      }
    }
  }
})

test('verification links are preserved as real URLs', () => {
  const payload = topicPayload('introduction-to-islam', index.chapters[0].topics[0].slug)
  const urls = payload.entries.flatMap((entry) =>
    entry.blocks.flatMap((block) => [...block.en, ...block.ur].flat().map((segment) => segment.url)))
    .filter(Boolean) as string[]
  assert.ok(urls.length > 0, 'no verification links survived the import')
  assert.ok(urls.every((url) => url.startsWith('https://')), 'a verification link is not https')
})

test('the reference bank is public, indexable and ad-eligible', () => {
  const chapter = index.chapters[0]
  const paths = [
    '/study-material/islamic-studies',
    `/study-material/islamic-studies/${chapter.slug}`,
    `/study-material/islamic-studies/${chapter.slug}/${chapter.topics[0].slug}`,
  ]
  for (const path of paths) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.known, true, `${path} is not in the route registry`)
    assert.equal(policy.access, 'public', path)
    assert.equal(policy.indexable, true, path)
    assert.equal(policy.adMode, 'enabled', path)
  }
})

test('every published topic has a data file the browser can fetch', () => {
  for (const chapter of index.chapters) {
    assert.ok(existsSync(join(dataDir, `${chapter.slug}.json`)), `${chapter.slug}.json missing`)
    for (const topic of chapter.topics) {
      assert.ok(existsSync(join(dataDir, chapter.slug, `${topic.slug}.json`)),
        `${chapter.slug}/${topic.slug}.json missing`)
    }
  }
})
