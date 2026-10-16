import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { validateBookReviewSummary } from './book-review-validation.mjs'

const root = new URL('../../', import.meta.url)
const target = new URL('src/data/bookEditorial.generated.json', root)
const library = JSON.parse(await readFile(new URL('public/book-summaries/index.json', root), 'utf8'))
const ledger = JSON.parse(await readFile(new URL('docs/seo/editorial/book-quotation-review.json', root), 'utf8'))
validateBookReviewSummary(ledger)
const bySlug = new Map(ledger.books.map((entry) => [entry.slug, entry]))
if (bySlug.size !== ledger.books.length || bySlug.size !== library.books.length) {
  throw new Error('Every book needs exactly one editorial review; review the inventory before building.')
}

const accepted = new Set(['verified_exact', 'verified_excerpt', 'unverified', 'paraphrase', 'misattributed', 'no_quote'])
const books = library.books.map((book) => {
  const entry = bySlug.get(book.slug)
  if (!entry || entry.title !== book.title || entry.author !== book.author || !accepted.has(entry.status)) {
    throw new Error(`Missing or mismatched book review: ${book.slug}`)
  }
  const lines = book.body.split('\n').filter((line) => /(?:famous|important) quotation/i.test(line))
  if (lines.length > 1 || Boolean(lines.length) !== (entry.status !== 'no_quote')) {
    throw new Error(`Quotation inventory changed: ${book.slug}`)
  }
  const originalLine = lines[0] ?? ''
  if (originalLine && !originalLine.includes(entry.quote)) {
    throw new Error(`Quotation changed since review: ${book.slug}`)
  }
  const citationInputs = [...entry.sources]
  // A useful bibliography is separate from quotation verification. Preserve
  // each original source's narrower role and never turn a publisher listing
  // into evidence that the displayed quotation appears in the book.
  if (entry.identityReview.status === 'verified_primary') {
    for (const record of entry.identityReview.evidence) {
      if (citationInputs.some((source) => source.url === record.url)) continue
      citationInputs.push({
        url: record.url,
        title: record.title || `${book.title} — title and author record`,
        locator: record.locator || 'Primary bibliographic record: title and author identity only.',
        evidence_status: 'identity_only', source_scope: 'identity_only',
      })
    }
  }
  const sources = citationInputs.map((source) => {
    if (!source.title || !source.locator || new URL(source.url).protocol !== 'https:') {
      throw new Error(`Incomplete public citation: ${book.slug}`)
    }
    return {
      url: source.url, title: source.title, locator: source.locator,
      scope: source.source_scope ?? (source.evidence_status === 'identity_only' ? 'identity_only' : 'unclassified_primary_source'),
    }
  })
  let status = entry.status
  let displayLine = originalLine
  let note = ''
  if (entry.correction) {
    // A translation change is explicit, never presented as the only possible
    // translation. The original content asset remains preserved for review.
    if (status !== 'paraphrase' || !originalLine.includes(entry.correction.old)
      || !entry.sources.some((source) => source.evidence_status === 'passage_comparison'
        && source.source_scope === 'book_original')) {
      throw new Error(`Unsupported quotation correction: ${book.slug}`)
    }
    displayLine = displayLine.replace(entry.correction.old, entry.correction.new)
      .replace(/(?:famous|important) quotation/i, 'Quotation (Graham translation)')
    status = 'verified_translation'
    note = 'The quotation uses the J. J. Graham translation linked below. Other translations may use different wording.'
  } else if (status === 'verified_exact') {
    if (!entry.sources.some((source) => source.evidence_status === 'verified_quotation'
      && ['book_original', 'book_excerpt'].includes(source.source_scope))) {
      throw new Error(`An exact book quotation needs a book passage: ${book.slug}`)
    }
    note = 'Quotation checked against the linked book text or excerpt; use that edition and locator when citing it.'
  } else if (status === 'verified_excerpt') {
    if (!entry.sources.some((source) => source.evidence_status === 'verified_quotation'
      && ['book_original', 'book_excerpt'].includes(source.source_scope))) {
      throw new Error(`A book excerpt needs a verified book passage: ${book.slug}`)
    }
    displayLine = displayLine.replace(/(?:famous|important) quotation/i, 'Quotation excerpt')
    note = 'The quoted words are an excerpt. Surrounding explanation is study commentary; consult the linked passage and translation before citing.'
  } else if (originalLine) {
    displayLine = displayLine.replace(/(?:famous|important) quotation/i, 'Study-note wording (edition unverified)')
    note = 'The wording and book edition of this study-note quotation have not yet been verified. Check an original edition before quoting it in an answer.'
    if (entry.sources.some((source) => source.evidence_status === 'related_source_wording_verified_book_unverified')) {
      note += ' A related primary source is linked below; it does not establish that the wording appears in this book.'
    }
  }
  return { slug: book.slug, identityStatus: entry.identityReview.status, quotationStatus: status, originalLine, displayLine, note, sources }
})

const next = `${JSON.stringify({ reviewDate: ledger.reviewDate, books }, null, 2)}\n`
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8').catch(() => '') !== next) {
    throw new Error(`Book editorial metadata is stale. Run node ${fileURLToPath(import.meta.url)}.`)
  }
  console.log(`Book editorial metadata matches the reviewed ${books.length}-book inventory.`)
} else {
  await writeFile(target, next)
  console.log(`Generated source and quotation notes for ${books.length} existing books.`)
}
