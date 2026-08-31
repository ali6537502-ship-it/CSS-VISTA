import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { css2026WrittenResult } from '../src/data/css2026Result.ts'
import { getAdRoutePolicy } from '../src/lib/ads.ts'
import { shouldShowCss2026ResultAnnouncement } from '../src/lib/resultAnnouncement.ts'

const resultPdf = fileURLToPath(new URL(`../public${css2026WrittenResult.pdfUrl}`, import.meta.url))

test('CSS 2026 result metadata matches the supplied FPSC document', () => {
  assert.equal(css2026WrittenResult.announcedDate, '2026-08-31')
  assert.equal(css2026WrittenResult.qualifiedCandidates, 476)
  assert.equal(css2026WrittenResult.pageCount, 7)
  assert.equal(css2026WrittenResult.noticeNumber, 'F.2/4/2027-CE')
  assert.equal(css2026WrittenResult.pagePath, '/css-2026-written-result')
})

test('CSS 2026 result PDF is present, complete and publicly addressable', async () => {
  const file = await readFile(resultPdf)
  assert.equal(file.length, 985859)
  assert.equal(file.subarray(0, 5).toString('ascii'), '%PDF-')
})

test('CSS 2026 result page is ad-free under the central route policy', () => {
  const policy = getAdRoutePolicy(css2026WrittenResult.pagePath)
  assert.equal(policy.eligible, false)
  assert.equal(policy.minimumHeight, 0)
})

test('CSS 2026 result announcement is prominent without interrupting exams or private work', () => {
  assert.equal(shouldShowCss2026ResultAnnouncement('/'), true)
  assert.equal(shouldShowCss2026ResultAnnouncement('/current-affairs'), true)
  assert.equal(shouldShowCss2026ResultAnnouncement('/mpt/mock/active'), false)
  assert.equal(shouldShowCss2026ResultAnnouncement('/gk/quiz/world'), false)
  assert.equal(shouldShowCss2026ResultAnnouncement('/factbook'), false)
  assert.equal(shouldShowCss2026ResultAnnouncement(css2026WrittenResult.pagePath), false)
})
