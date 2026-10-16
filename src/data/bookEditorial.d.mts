export interface BookEditorialSource {
  url: string
  title: string
  locator: string
  scope: string
}
export interface BookEditorialReview {
  slug: string
  identityStatus: string
  quotationStatus: string
  originalLine: string
  displayLine: string
  note: string
  sources: BookEditorialSource[]
}
export function bookEditorialFor(slug: string): BookEditorialReview | null
export function reviewedBookBody(book: { slug: string; body: string }): string
export function bookQuotationForCopy(book: { slug: string; body: string; title: string; author: string }): string
