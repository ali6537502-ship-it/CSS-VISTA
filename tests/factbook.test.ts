import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ENTRY_TYPE_DEFINITIONS, createEmptyContent } from '../src/features/factbook/entryTypes.ts'
import { FACTBOOK_ENTRY_TYPES } from '../src/features/factbook/types.ts'
import { safeWebUrl, sanitizePlainText, searchableText } from '../src/features/factbook/safety.ts'

test('every supported Factbook entry type has a functional definition', () => {
  assert.equal(FACTBOOK_ENTRY_TYPES.length, 17)
  assert.deepEqual(
    ENTRY_TYPE_DEFINITIONS.map((definition) => definition.type).sort(),
    [...FACTBOOK_ENTRY_TYPES].sort(),
  )
  for (const type of FACTBOOK_ENTRY_TYPES) assert.equal(typeof createEmptyContent(type), 'object')
})

test('structured entry types start with editable rows', () => {
  assert.equal(Array.isArray(createEmptyContent('timeline').timeline), true)
  assert.equal(Array.isArray((createEmptyContent('custom-table').table as { rows: unknown[] }).rows), true)
  assert.equal(Array.isArray((createEmptyContent('comparison').comparison as { criteria: unknown[] }).criteria), true)
  assert.equal(Array.isArray(createEmptyContent('cause-effect').causes), true)
})

test('unsafe source protocols are rejected', () => {
  assert.equal(safeWebUrl('javascript:alert(1)'), '')
  assert.equal(safeWebUrl('data:text/html,test'), '')
  assert.match(safeWebUrl('https://example.com/report.pdf'), /^https:\/\/example\.com/)
})

test('plain text sanitization removes nulls and enforces limits', () => {
  assert.equal(sanitizePlainText(`safe${String.fromCharCode(0)}text`, 20), 'safetext')
  assert.equal(sanitizePlainText('abcdefgh', 4), 'abcd')
})

test('searchable text covers nested fields and years', () => {
  const value = searchableText({ report: { organization: 'UNDP', year: 2026 }, tags: ['governance'], facts: [{ provision: 'Article 25' }] })
  assert.match(value, /UNDP/)
  assert.match(value, /2026/)
  assert.match(value, /Article 25/)
})

test('database migration enforces private ownership on every Factbook entity', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202608240001_personal_factbooks.sql', import.meta.url), 'utf8')
  const entities = [
    'factbook_subjects', 'factbook_categories', 'factbook_entries', 'factbook_entry_blocks',
    'factbook_sources', 'factbook_tags', 'factbook_entry_tags', 'factbook_collections',
    'factbook_collection_entries', 'factbook_media', 'factbook_revisions', 'factbook_preferences',
  ]
  for (const entity of entities) assert.match(sql, new RegExp(`'${entity}'`))
  assert.match(sql, /enable row level security/i)
  assert.match(sql, /auth\.uid\(\)\) = user_id/i)
  assert.match(sql, /foreign key \(subject_id, user_id\)/i)
  assert.match(sql, /foreign key \(entry_id, user_id\)/i)
  assert.match(sql, /bucket_id = 'factbook-media'/i)
  assert.match(sql, /storage\.foldername\(name\)/i)
})

test('Factbook route is centrally denied advertising', () => {
  const policy = readFileSync(new URL('../src/lib/ads.ts', import.meta.url), 'utf8')
  assert.match(policy, /pattern: '\/factbook'.*Private student factbook/)
})
