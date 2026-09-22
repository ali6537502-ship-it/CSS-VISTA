export type JournalArticle = {
  id: string
  slug: string
  title: string
  category: string
  author: string
  author_role: string
  excerpt: string
  body: string
  published_on: string
  featured: boolean
  published: boolean
  cover_url?: string
  author_photo_url?: string
  created_at?: string
  updated_at?: string
}

export const JOURNAL_CATEGORIES = [
  'Opinion',
  'Analysis',
  'Public Policy',
  'Global Affairs',
  'Economy & Development',
  'Technology & AI',
  'Environment & Climate',
  'Law & Society',
  'Ideas & History',
] as const

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number]

export function journalReadingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

export function formatJournalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

export async function loadPublishedJournalArticles(signal?: AbortSignal): Promise<JournalArticle[]> {
  const response = await fetch('/api/journal.php', {
    signal,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const data = await response.json().catch(() => ({})) as { articles?: JournalArticle[]; message?: string }
  if (!response.ok) throw new Error(data.message || 'VISTA Journal could not be loaded.')
  return Array.isArray(data.articles) ? data.articles : []
}
