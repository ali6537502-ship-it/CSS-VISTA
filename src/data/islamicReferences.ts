/**
 * Islamic Studies bilingual reference banks.
 *
 * Generated from the seven chapter documents in data-archive/islamic-studies/
 * by scripts/import_islamic_references.py. `npm run audit:islamic-references`
 * fails the build if the shipped data drifts from the source documents.
 *
 * English and Urdu are kept as separate parallel arrays at every level, never
 * merged into one string. That is what lets the page put English on the left
 * and Urdu on the right without the two ever interleaving.
 *
 * Each topic is its own public asset. A whole chapter would be up to 1.1 MB;
 * a topic is a few tens of kilobytes, and it is what the student opened.
 */
import indexJson from './bundled/islamic-references-index.json'

/** A run of text, optionally a link. Preserves the sources' verify links. */
export interface Segment {
  text: string
  url?: string
}

/** A paragraph is an ordered list of segments. */
export type Paragraph = Segment[]

/** Parallel English and Urdu content. Either side may be empty. */
export interface BilingualBlock {
  en: Paragraph[]
  ur: Paragraph[]
}

/** A full-width row: the Arabic source passage, or a shared note. */
export interface WideBlock {
  kind: 'arabic' | 'note'
  paragraphs: Paragraph[]
}

export interface ReferenceEntry {
  number: number
  titleEn: string
  titleUr: string
  subtitleEn?: string
  subtitleUr?: string
  arabic: WideBlock[]
  blocks: BilingualBlock[]
}

export interface TopicPayload {
  chapterSlug: string
  chapterNumeral: string
  chapterTitleEn: string
  chapterTitleUr: string
  slug: string
  titleEn: string
  titleUr: string
  rangeEn: string
  rangeUr: string
  intro: BilingualBlock[]
  entries: ReferenceEntry[]
}

export interface ChapterPayload {
  numeral: string
  slug: string
  generatedFrom: string
  titleEn: string
  titleUr: string
  /** The compiler's scope, evidence rules and how-to-read guidance. */
  frontMatter: BilingualBlock[]
  /** The closing verification audit: what was checked and what was not. */
  audit: BilingualBlock[]
}

export interface TopicSummary {
  slug: string
  titleEn: string
  titleUr: string
  count: number
  first: number
  last: number
}

export interface ChapterSummary {
  numeral: string
  slug: string
  titleEn: string
  titleUr: string
  referenceCount: number
  topics: TopicSummary[]
}

const data = indexJson as { chapters: ChapterSummary[]; referenceTotal: number }

export function islamicChapters(): ChapterSummary[] {
  return data.chapters
}

export function islamicReferenceTotal(): number {
  return data.referenceTotal
}

export function islamicTopicTotal(): number {
  return data.chapters.reduce((total, chapter) => total + chapter.topics.length, 0)
}

export function findChapterSummary(slug: string): ChapterSummary | null {
  return data.chapters.find((chapter) => chapter.slug === slug) ?? null
}

export function findTopicSummary(chapterSlug: string, topicSlug: string): {
  chapter: ChapterSummary
  topic: TopicSummary
} | null {
  const chapter = findChapterSummary(chapterSlug)
  const topic = chapter?.topics.find((item) => item.slug === topicSlug)
  return chapter && topic ? { chapter, topic } : null
}

/**
 * The chapter title without its leading numeral, which the page shows
 * separately. "IV. Islamic Civilization and Culture" -> the words alone.
 */
export function chapterName(chapter: { titleEn: string }): string {
  return chapter.titleEn.replace(/^[IVX]+\.\s*/, '').trim()
}

// Published data is primed during the production prerender so the crawler and
// the visitor are served the same page; in the browser it is fetched on demand.
const topicCache = new Map<string, TopicPayload>()
const chapterCache = new Map<string, ChapterPayload>()

export function primeTopic(payload: TopicPayload) {
  topicCache.set(`${payload.chapterSlug}/${payload.slug}`, payload)
}

export function primeChapter(payload: ChapterPayload) {
  chapterCache.set(payload.slug, payload)
}

/** The topic if it is already in hand, for a synchronous first render. */
export function topicNow(chapterSlug: string, topicSlug: string): TopicPayload | null {
  return topicCache.get(`${chapterSlug}/${topicSlug}`) ?? null
}

export function chapterNow(slug: string): ChapterPayload | null {
  return chapterCache.get(slug) ?? null
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('ISLAMIC_REFERENCES_UNAVAILABLE')
  return (await response.json()) as T
}

export async function loadTopic(
  chapterSlug: string, topicSlug: string, signal?: AbortSignal,
): Promise<TopicPayload> {
  const cached = topicNow(chapterSlug, topicSlug)
  if (cached) return cached
  const payload = await fetchJson<TopicPayload>(
    `/study-material/islamic-studies/${chapterSlug}/${topicSlug}.json`, signal)
  if (!Array.isArray(payload?.entries)) throw new Error('ISLAMIC_REFERENCES_INVALID')
  primeTopic(payload)
  return payload
}

export async function loadChapter(slug: string, signal?: AbortSignal): Promise<ChapterPayload> {
  const cached = chapterNow(slug)
  if (cached) return cached
  const payload = await fetchJson<ChapterPayload>(
    `/study-material/islamic-studies/${slug}.json`, signal)
  primeChapter(payload)
  return payload
}
