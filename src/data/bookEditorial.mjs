import metadata from './bookEditorial.generated.json' with { type: 'json' }

const bySlug = new Map(metadata.books.map((book) => [book.slug, book]))

export function bookEditorialFor(slug) {
  return bySlug.get(slug) ?? null
}

/** The same reviewed quotation label and wording are shown in HTML and React. */
export function reviewedBookBody(book) {
  if (!book.body) return book.body
  const review = bookEditorialFor(book.slug)
  if (!review) throw new Error(`Book needs editorial review: ${book.slug}`)
  if (!review.originalLine) return book.body
  const matches = book.body.split('\n').filter((line) => line === review.originalLine)
  if (matches.length !== 1) throw new Error(`Reviewed quotation changed: ${book.slug}`)
  return book.body.replace(review.originalLine, review.displayLine)
}

export function bookQuotationForCopy(book) {
  const review = bookEditorialFor(book.slug)
  if (!book.body || !review?.displayLine) return ''
  // Validate the same source precondition as the visible reader.
  reviewedBookBody(book)
  const line = review.displayLine.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim()
  return `${line}\nBook under discussion: ${book.title}, ${book.author}\n${review.note}`
    + review.sources.map((source) => `\n${source.title}; ${source.locator}: ${source.url}`).join('')
}
