import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { protectUnverifiedBookCovers } from '../scripts/lib/book-cover-policy.mjs'

test('withheld artwork is blocked before normal file delivery, without disabling summaries', () => {
  const original = 'RewriteEngine On\nRewriteCond %{REQUEST_FILENAME} -f\nRewriteRule ^ - [L]\nRewriteRule ^book-summaries/([a-z-]+)$ seo/book-summaries/$1.html [L]\n'
  const output = protectUnverifiedBookCovers(original)
  const rule = output.split('\n').find(line => line.includes('[G,L,NC]'))
  const pattern = new RegExp(rule.trim().split(/\s+/)[1], 'i')
  for (const path of ['book-summaries/covers', 'book-summaries/covers/why-nations-fail.webp', 'BOOK-SUMMARIES/COVERS/example.webp']) assert.ok(pattern.test(path))
  for (const path of ['book-summaries/why-nations-fail', 'book-summaries/index.json', 'books/owner-book.pdf']) assert.equal(pattern.test(path), false)
  assert.ok(output.indexOf('[G,L,NC]') < output.indexOf('RewriteCond'))
  assert.ok(output.endsWith(original.slice(original.indexOf('RewriteCond'))), 'Existing delivery and reader rules are retained')
  assert.equal(protectUnverifiedBookCovers(output), output, 'Rebuilding cannot duplicate the rule')
  assert.throws(() => protectUnverifiedBookCovers('No rewrite engine'), /rewrite engine/)
})

test('book artwork is not requested by the catalogue, reader or share metadata', async () => {
  const reader = await readFile(new URL('../src/pages/BookSummaries.tsx', import.meta.url), 'utf8')
  const staticPages = await readFile(new URL('../scripts/expand-book-summary-seo.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(reader, /src=\{book\.cover\}|href=\{book\.coverSource\}/)
  assert.doesNotMatch(staticPages, /escapeHtml\(book\.cover\)/)
  assert.match(reader, /Summary by/)
  assert.match(reader, /Book by \{book\.author\}/)
  assert.match(staticPages, /Summary by/)
  assert.match(staticPages, /Book by/)
})
