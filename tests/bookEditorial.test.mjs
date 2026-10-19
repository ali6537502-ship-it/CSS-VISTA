import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { bookEditorialFor, bookQuotationForCopy, reviewedBookBody } from '../src/data/bookEditorial.mjs'
import { validateBookReviewSummary } from '../scripts/editorial/book-review-validation.mjs'

const library = JSON.parse(await readFile(new URL('../public/book-summaries/index.json', import.meta.url), 'utf8'))
const bySlug = (slug) => library.books.find((book) => book.slug === slug)
const ledger = JSON.parse(await readFile(new URL('../docs/seo/editorial/book-quotation-review.json', import.meta.url), 'utf8'))

test('all existing book identities and source bodies remain usable with reviewed wording', () => {
  assert.equal(library.books.length, 100)
  for (const book of library.books) {
    const review = bookEditorialFor(book.slug)
    assert.ok(review, book.slug)
    const body = reviewedBookBody(book)
    if (review.originalLine) {
      assert.equal(body.replace(review.displayLine, review.originalLine), book.body, `${book.slug}: only reviewed quotation line may differ`)
    } else assert.equal(body, book.body)
  }
})

test('unverified wording is qualified in the reader and in copied quotations', () => {
  const book = bySlug('guns-germs-and-steel')
  assert.match(reviewedBookBody(book), /Study-note wording \(edition unverified\)/)
  const copy = bookQuotationForCopy(book)
  assert.match(copy, /have not yet been verified/)
  assert.match(copy, /Book under discussion:/)
  assert.doesNotMatch(copy, /— Guns, Germs, and Steel,/, 'do not copy an unverified attribution as a confirmed author quote')
})

test('an exact ebook sentence retains a file locator without inventing print pagination', () => {
  const book = bySlug('why-nations-fail')
  const review = bookEditorialFor(book.slug)
  assert.equal(review.quotationStatus, 'verified_exact')
  assert.equal(reviewedBookBody(book), book.body, 'The original complete quotation is unchanged')
  assert.ok(review.sources.some(source => source.scope === 'book_original'
    && source.locator.includes('eISBN 9780307719232')
    && source.locator.includes('physical PDF page 409')))
  assert.match(bookQuotationForCopy(book), /physical PDF page 409/)
})

test('related primary pages do not certify quotations from a named book', () => {
  for (const slug of ['the-silk-roads', 'long-walk-to-freedom', 'doughnut-economics', 'good-economics-for-hard-times']) {
    const book = bySlug(slug)
    const review = bookEditorialFor(slug)
    assert.equal(review.quotationStatus, 'unverified')
    assert.match(review.note, /does not establish that the wording appears in this book/)
    assert.match(reviewedBookBody(book), /edition unverified/)
  }
})

test('a changed source quotation requires renewed review instead of stale substitution', () => {
  const book = bySlug('the-art-of-war')
  assert.throws(() => reviewedBookBody({ ...book, body: book.body.replace('All warfare is based on deception.', 'Changed quotation.') }), /changed/)
  assert.equal(reviewedBookBody({ slug: book.slug, body: '' }), '', 'catalogue can render before the full body arrives')
})

test('verified original text has its actual translation and chapter citation', () => {
  const review = bookEditorialFor('the-art-of-war')
  assert.equal(review.quotationStatus, 'verified_exact')
  assert.ok(review.sources.some((source) => /Giles/.test(source.title) && /18/.test(source.locator)))
  assert.match(bookQuotationForCopy(bySlug('the-art-of-war')), /https:\/\/www.gutenberg.org/)
})

test('On War uses the explicitly identified Graham version without rewriting commentary', () => {
  const book = bySlug('on-war')
  assert.match(reviewedBookBody(book), /War is a mere continuation of policy by other means\./)
  assert.match(reviewedBookBody(book), /military action remains connected to political objectives/)
  assert.match(bookQuotationForCopy(book), /Graham translation/)
  assert.match(bookEditorialFor(book.slug).note, /Other translations may use different wording/)
})

test('book source metadata is deterministic and agrees with the editorial ledger', () => {
  const result = spawnSync(process.execPath, ['scripts/editorial/build-book-reviews.mjs', '--check'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
})

test('a verified university identity is visible without certifying the book quotation', () => {
  const review = bookEditorialFor('the-strategy-of-conflict')
  assert.equal(review.identityStatus, 'verified_primary')
  assert.equal(review.quotationStatus, 'unverified')
  assert.ok(review.sources.some((source) => new URL(source.url).hostname === 'www.hks.harvard.edu' && source.scope === 'identity_only'))
  assert.match(reviewedBookBody(bySlug('the-strategy-of-conflict')), /edition unverified/)
  assert.equal(new Set(review.sources.map((source) => source.url)).size, review.sources.length, 'Do not repeat the same source as multiple bibliography links')
})

test('newly traced clauses remain excerpts when displayed and copied with study commentary', () => {
  for (const slug of ['capitalism-and-freedom', 'the-price-of-inequality', 'invisible-women',
    'manufacturing-consent', 'the-prize-the-epic-quest-for-oil-money-and-power',
    'the-clash-of-civilizations-and-the-remaking-of-world-order']) {
    const book = bySlug(slug)
    const review = bookEditorialFor(slug)
    assert.equal(review.quotationStatus, 'verified_excerpt', slug)
    assert.match(reviewedBookBody(book), /Quotation excerpt/)
    assert.match(bookQuotationForCopy(book), /Surrounding explanation is study commentary/)
    assert.ok(review.sources.some(source => source.scope === 'book_excerpt'), slug)
    assert.equal(reviewedBookBody(book).replace(review.displayLine, review.originalLine), book.body,
      'Source wording, including surrounding commentary, is preserved')
  }
})

test('books without a quotation can have a real bibliography without inventing a quote', () => {
  const book = bySlug('the-road-to-serfdom')
  const review = bookEditorialFor(book.slug)
  assert.equal(review.quotationStatus, 'no_quote')
  assert.ok(review.sources.length > 0, 'Previously verified book identity is available to readers')
  assert.equal(review.displayLine, '')
  assert.equal(bookQuotationForCopy(book), '')
  assert.equal(reviewedBookBody(book), book.body)
})

test('newly located passages keep their omissions and edition visible', () => {
  for (const [slug, locator] of [
    ['the-better-angels-of-our-nature', /Introduction/],
    ['brave-new-world', /Chapter III/],
  ]) {
    const review = bookEditorialFor(slug)
    assert.equal(review.quotationStatus, 'verified_excerpt')
    assert.match(reviewedBookBody(bySlug(slug)), /Quotation excerpt/)
    assert.ok(review.sources.some((source) => locator.test(source.locator)))
    assert.match(bookQuotationForCopy(bySlug(slug)), /excerpt/)
  }
})

test('the summary cannot claim more book verification than the individual evidence supports', () => {
  assert.doesNotThrow(() => validateBookReviewSummary(ledger))
  for (const key of ['inventoryEntries', 'labelledQuotations', 'verifiedBookQuotationEntries', 'identitiesVerifiedAgainstPrimaryRecord']) {
    const stale = structuredClone(ledger)
    stale.reviewSummary[key] += 1
    assert.throws(() => validateBookReviewSummary(stale), /summary is stale/)
  }
  const stale = structuredClone(ledger)
  stale.reviewSummary.quotationStatusCounts.unverified -= 1
  assert.throws(() => validateBookReviewSummary(stale), /summary is stale/)
})

test('a missing or unsuccessful source cannot support a verified identity', () => {
  for (const evidence of [[], [{ url: 'https://example.org/empty', httpStatus: 202 }], [{ url: 'http://example.org/' }]]) {
    const unsupported = structuredClone(ledger)
    unsupported.books[0].identityReview.evidence = evidence
    assert.throws(() => validateBookReviewSummary(unsupported), /identity/)
  }
})
