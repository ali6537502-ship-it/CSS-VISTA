// Check the claims made by the review ledger, independently of the generated
// reader metadata. A title/author record must never count as a book passage.
export function validateBookReviewSummary(ledger) {
  const counts = new Map()
  let identities = 0
  for (const book of ledger.books) {
    counts.set(book.status, (counts.get(book.status) || 0) + 1)
    if (book.identityReview.status !== 'verified_primary') continue
    identities += 1
    const evidence = book.identityReview.evidence
    if (!evidence.length) throw new Error(`Verified identity needs inspected evidence: ${book.slug}`)
    for (const record of evidence) {
      const url = new URL(record.url)
      if (url.protocol !== 'https:' || url.username || url.password
        || (record.httpStatus !== undefined && record.httpStatus !== 200)) {
        throw new Error(`Unsafe or unsuccessful identity evidence: ${book.slug}`)
      }
    }
  }
  const summary = ledger.reviewSummary
  const verified = (counts.get('verified_exact') || 0) + (counts.get('verified_excerpt') || 0)
  const expected = {
    inventoryEntries: ledger.books.length,
    labelledQuotations: ledger.books.length - (counts.get('no_quote') || 0),
    verifiedBookQuotationEntries: verified,
    identitiesVerifiedAgainstPrimaryRecord: identities,
  }
  for (const [key, value] of Object.entries(expected)) {
    if (summary[key] !== value) throw new Error(`Book review summary is stale: ${key}`)
  }
  const statuses = new Set([...counts.keys(), ...Object.keys(summary.quotationStatusCounts)])
  for (const status of statuses) {
    if (summary.quotationStatusCounts[status] !== counts.get(status)) {
      throw new Error(`Book review summary is stale: quotationStatusCounts.${status}`)
    }
  }
}
