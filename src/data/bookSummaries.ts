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

// The summary library is bundled as a lazy chunk so it loads without runtime fetches.
const bundledLoader = import.meta.glob<{ default: BookSummaryLibrary }>('./bundled/book-summaries-index.json')

export async function loadBookSummaries(): Promise<BookSummaryLibrary> {
  const loader = bundledLoader['./bundled/book-summaries-index.json']
  if (loader) {
    try {
      return (await loader()).default
    } catch {
      // fall through to fetch
    }
  }
  const response = await fetch('/book-summaries/index.json')
  if (!response.ok) throw new Error('Book summaries could not be loaded.')
  return response.json()
}
