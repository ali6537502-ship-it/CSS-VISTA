import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { weeklyMagazine, weeklyMagazines } from '../src/data/weeklyMagazine.ts'

const projectFile = (publicPath: string) => fileURLToPath(new URL(`../public${publicPath}`, import.meta.url))

test('Issue 03 is the current CSS Vista weekly journal', () => {
  assert.equal(weeklyMagazine.issue, 'Issue No. 03 · 03 September 2026')
  assert.equal(weeklyMagazine.publishedDate, '2026-09-03')
  assert.match(weeklyMagazine.description, /23 August to 3 September 2026/)
  assert.deepEqual(weeklyMagazines.map((issue) => issue.publishedDate), ['2026-09-03', '2026-08-25', '2026-08-15'])
})

test('Issue 03 PDF and cover are shipped as valid non-empty assets', () => {
  assert.ok(weeklyMagazine.pdfUrl)
  assert.ok(weeklyMagazine.coverUrl)
  const pdfPath = projectFile(weeklyMagazine.pdfUrl!)
  const coverPath = projectFile(weeklyMagazine.coverUrl!)
  assert.equal(existsSync(pdfPath), true)
  assert.equal(existsSync(coverPath), true)
  assert.equal(readFileSync(pdfPath).subarray(0, 4).toString(), '%PDF')
  assert.ok(statSync(pdfPath).size > 1_000_000)
  assert.ok(statSync(coverPath).size > 10_000)
  assert.equal(weeklyMagazine.pageCount, 21)
})
