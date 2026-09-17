export interface OneLinerSubcategory {
  name: string
  count: number
}

export interface OneLinerCategorySummary {
  slug: string
  name: string
  count: number
  timeSensitiveCount: number
  subcategories: OneLinerSubcategory[]
}

export interface OneLinerIndex {
  generatedAt: string
  total: number
  sourcePagesProcessed: number
  excludedPages: string
  categories: OneLinerCategorySummary[]
}

export interface OneLinerNote {
  id: string
  text: string
  subcategory: string
  sourcePage: number
  timeSensitive: boolean
}

export interface OneLinerCategory {
  slug: string
  name: string
  count: number
  notes: OneLinerNote[]
}

import bundledIndexJson from './bundled/index.json'

// Every One-Liner GK subject file is bundled as a lazy chunk so the section
// works even when runtime fetches of /one-liner-gk/*.json are unavailable.
const categoryLoaders = import.meta.glob<{ default: OneLinerCategory }>([
  './bundled/*.json',
  '!./bundled/index.json',
  '!./bundled/book-summaries-index.json',
])

const bundledIndex = bundledIndexJson as OneLinerIndex

let indexRequest: Promise<OneLinerIndex> | null = null
const categoryRequests = new Map<string, Promise<OneLinerCategory>>()

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load One-Liner GK data (${response.status})`)
  return response.json() as Promise<T>
}

/**
 * The index, available synchronously.
 *
 * It is compiled into the bundle, so there is no reason for a visitor (or the
 * build-time prerender) to see a loading state before it appears. The promise
 * form below is kept for callers that also want the runtime refresh.
 */
export function oneLinerIndexNow(): OneLinerIndex {
  return bundledIndex
}

export function getOneLinerIndex(): Promise<OneLinerIndex> {
  if (!indexRequest) {
    indexRequest = Promise.resolve(bundledIndex).catch(() => fetchJson<OneLinerIndex>('/one-liner-gk/index.json'))
  }
  return indexRequest
}

export function getOneLinerCategory(slug: string): Promise<OneLinerCategory> {
  const existing = categoryRequests.get(slug)
  if (existing) return existing
  const loader = categoryLoaders[`./bundled/${slug}.json`]
  const request = loader
    ? loader().then((m) => m.default).catch(() => fetchJson<OneLinerCategory>(`/one-liner-gk/${encodeURIComponent(slug)}.json`))
    : fetchJson<OneLinerCategory>(`/one-liner-gk/${encodeURIComponent(slug)}.json`)
  categoryRequests.set(slug, request)
  return request
}
