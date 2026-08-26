export interface BookSummaryCategory {
  slug: string
  name: string
  description: string
  total: number
}

export interface BookSummary {
  slug: string
  category: string
  order: number
  title: string
  author: string
  excerpt: string
  body: string
  wordCount: number
  priority: boolean
  cover: string
  coverProvider: string
  coverSource: string
}

export interface BookSummaryLibrary {
  generatedAt: string
  total: number
  categories: BookSummaryCategory[]
  books: BookSummary[]
  coverSources: Record<string, number>
}

function isBookSummaryLibrary(value: unknown): value is BookSummaryLibrary {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<BookSummaryLibrary>
  return Array.isArray(candidate.categories)
    && Array.isArray(candidate.books)
    && candidate.books.every((book) => (
      Boolean(book)
      && typeof book.slug === 'string'
      && typeof book.title === 'string'
      && typeof book.author === 'string'
      && typeof book.category === 'string'
      && typeof book.body === 'string'
    ))
}

// This file is a public, version-independent asset. Fetching it directly avoids
// coupling the library to a content-hashed JavaScript chunk during deployments.
export async function loadBookSummaries(signal?: AbortSignal): Promise<BookSummaryLibrary> {
  const response = await fetch('/book-summaries/index.json', {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('BOOK_SUMMARIES_UNAVAILABLE')
  const library: unknown = await response.json()
  if (!isBookSummaryLibrary(library)) throw new Error('BOOK_SUMMARIES_INVALID')
  return library
}
