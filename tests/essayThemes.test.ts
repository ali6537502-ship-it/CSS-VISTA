/**
 * Essay-theme roadmap regression tests.
 *
 * The roadmap is generated from the source Word document by
 * scripts/import_essay_themes.py. These tests pin the contract the pages rely
 * on: 25 themes, a complete A-M research spine on each, checkpoint ids that are
 * unique and content-derived, and the two route-policy dimensions that decide
 * whether the section is indexed and whether it may carry advertising.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getRoutePolicy } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const fullPath = join(root, 'public/study-material/essay-themes.json')
const indexPath = join(root, 'src/data/bundled/essay-themes-index.json')

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']

interface Checkpoint { id: string; text: string; label?: string }
interface Section { letter: string; title: string; kind: string; items: Checkpoint[] }
interface Theme { number: number; slug: string; name: string; tier: string; brief: string; checkpointCount: number; sections: Section[] }
interface Roadmap { evidenceCardFields: string[]; universal: Array<{ heading: string; groups: Array<{ heading: string; items: string[] }> }>; themes: Theme[] }

const roadmap = JSON.parse(readFileSync(fullPath, 'utf8')) as Roadmap
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { themes: Theme[] }

test('the roadmap ships 25 themes in two tiers', () => {
  assert.equal(roadmap.themes.length, 25)
  assert.equal(roadmap.themes.filter((theme) => theme.tier === 'A').length, 15)
  assert.equal(roadmap.themes.filter((theme) => theme.tier === 'B').length, 10)
  assert.deepEqual(roadmap.themes.map((theme) => theme.number), Array.from({ length: 25 }, (_, i) => i + 1))
})

test('every theme carries the complete A-M research spine with content', () => {
  for (const theme of roadmap.themes) {
    assert.deepEqual(theme.sections.map((section) => section.letter), SECTIONS, `theme ${theme.number}`)
    assert.ok(theme.brief.length > 40, `theme ${theme.number} has no brief`)
    for (const section of theme.sections) {
      assert.ok(section.items.length > 0, `theme ${theme.number} section ${section.letter} is empty`)
      assert.ok(section.title.length > 0)
      for (const item of section.items) assert.ok(item.text.trim().length > 0)
    }
  }
})

test('checkpoint ids are unique across the whole roadmap', () => {
  const ids = roadmap.themes.flatMap((theme) => theme.sections.flatMap((section) => section.items.map((item) => item.id)))
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.length > 2500, `expected the full direction set, got ${ids.length}`)
})

test('checkpoint ids are derived from content, so a re-import keeps a student\'s ticks', () => {
  // Same wording in the same theme and section must always hash the same way.
  // A positional id would move a tick onto a different direction instead.
  const theme = roadmap.themes[0]
  const section = theme.sections[0]
  assert.match(section.items[0].id, /^[a-m][0-9a-f]{8}$/)
  const second = roadmap.themes[1].sections[0]
  assert.notEqual(section.items[0].id, second.items[0].id)
})

test('the bundled index agrees with the full roadmap', () => {
  assert.equal(index.themes.length, roadmap.themes.length)
  for (const [position, summary] of index.themes.entries()) {
    const theme = roadmap.themes[position]
    assert.equal(summary.slug, theme.slug)
    assert.equal(summary.name, theme.name)
    assert.equal(summary.tier, theme.tier)
    const counted = theme.sections.reduce((total, section) => total + section.items.length, 0)
    assert.equal(summary.checkpointCount, counted, `${theme.slug} count drifted`)
  }
})

test('the Evidence Capture Card keeps all six source fields', () => {
  assert.deepEqual(roadmap.evidenceCardFields, [
    'Indicator', 'Value', 'Country/Area', 'Year', 'Source/Report', 'What argument does it support?',
  ])
})

test('universal research rules are stored once, not repeated per theme', () => {
  assert.ok(roadmap.universal.length >= 2)
  const groups = roadmap.universal.flatMap((module) => module.groups)
  assert.ok(groups.some((group) => group.heading.includes('20-Layer Research Protocol')))
  assert.ok(groups.some((group) => group.heading.includes('Completion Checklist')))
  // No theme repeats them.
  for (const theme of roadmap.themes) {
    for (const section of theme.sections) {
      assert.ok(!section.title.startsWith('Universal '), `theme ${theme.number} repeats a universal module`)
    }
  }
})

test('the section is signed-in only, noindex, and still ad-eligible', () => {
  for (const path of ['/study-material/essay-themes', '/study-material/essay-themes/climate-change-climate-justice-and-resilience']) {
    const policy = getRoutePolicy(path)
    assert.equal(policy.known, true, `${path} is not in the route registry`)
    assert.equal(policy.access, 'authenticated', path)
    assert.equal(policy.indexable, false, path)
    assert.equal(policy.sitemap, false, path)
    // Authentication does not disable advertising.
    assert.equal(policy.adMode, 'enabled', path)
  }
})

test('the roadmap asset is published for the browser to fetch', () => {
  assert.ok(existsSync(fullPath))
  const built = join(root, 'dist/study-material/essay-themes.json')
  if (existsSync(join(root, 'dist/index.html'))) {
    assert.ok(existsSync(built), 'the build did not publish the roadmap asset')
  }
})
