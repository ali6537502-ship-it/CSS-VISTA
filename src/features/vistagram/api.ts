import type { VistagramIndex, VistagramPost, VistagramPostSummary, VistagramPostType } from './types'

const INDEX_URL = '/vistagram-content/index.json'
const POST_TYPES = new Set<VistagramPostType>([
  'Concept',
  'Article',
  'Explainer',
  'Current Update',
  'Data & Statistics',
  'Case Study',
  'Exam Insight',
])

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : []
}

function safeContentPath(value: unknown) {
  const path = text(value)
  if (!/^\/vistagram-content\/posts\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(path)) return ''
  return path
}

function parseSummary(value: unknown): VistagramPostSummary | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = text(item.id)
  const slug = text(item.slug)
  const title = text(item.title)
  const excerpt = text(item.excerpt)
  const type = text(item.type) as VistagramPostType
  const category = text(item.category)
  const topic = text(item.topic)
  const publishedAt = text(item.publishedAt)
  const contentPath = safeContentPath(item.contentPath)
  const readingMinutes = Math.max(1, Math.round(Number(item.readingMinutes) || 1))
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title || !excerpt || !POST_TYPES.has(type) || !category || !topic || !publishedAt || !contentPath) return null

  return {
    id,
    slug,
    title,
    excerpt,
    type,
    category,
    topic,
    tags: stringList(item.tags),
    publishedAt,
    updatedAt: text(item.updatedAt) || undefined,
    readingMinutes,
    image: text(item.image) || undefined,
    featured: item.featured === true,
    evergreen: item.evergreen === true,
    contentPath,
  }
}

export async function loadVistagramIndex(signal?: AbortSignal): Promise<VistagramIndex> {
  const response = await fetch(INDEX_URL, { signal, cache: 'no-cache' })
  if (!response.ok) throw new Error('Vistagram feed is unavailable.')
  const raw = await response.json() as Record<string, unknown>
  const posts = Array.isArray(raw.posts)
    ? raw.posts.map(parseSummary).filter((item): item is VistagramPostSummary => Boolean(item))
    : []
  posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  return {
    version: Math.max(1, Math.round(Number(raw.version) || 1)),
    generatedAt: text(raw.generatedAt) || null,
    posts,
  }
}

export async function loadVistagramPost(summary: VistagramPostSummary, signal?: AbortSignal): Promise<VistagramPost> {
  const response = await fetch(summary.contentPath, { signal, cache: 'no-cache' })
  if (!response.ok) throw new Error('This Vistagram article is unavailable.')
  const raw = await response.json() as Record<string, unknown>
  const parsed = parseSummary(raw)
  if (!parsed || parsed.slug !== summary.slug || parsed.id !== summary.id) throw new Error('This Vistagram article is invalid.')

  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .filter((section) => section && typeof section === 'object')
        .map((section) => {
          const item = section as Record<string, unknown>
          return {
            heading: text(item.heading) || undefined,
            paragraphs: stringList(item.paragraphs),
            bullets: stringList(item.bullets),
            callout: text(item.callout) || undefined,
          }
        })
        .filter((section) => section.heading || section.paragraphs.length || section.bullets.length || section.callout)
    : []

  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .filter((source) => source && typeof source === 'object')
        .map((source) => {
          const item = source as Record<string, unknown>
          const label = text(item.label)
          const url = text(item.url)
          return { label, url, date: text(item.date) || undefined }
        })
        .filter((source) => source.label && /^https:\/\//i.test(source.url))
    : []

  return {
    ...parsed,
    subtitle: text(raw.subtitle) || undefined,
    keyPoints: stringList(raw.keyPoints),
    sections,
    examRelevance: stringList(raw.examRelevance),
    sources,
    relatedSlugs: stringList(raw.relatedSlugs),
  }
}

export function formatVistagramDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

export function vistagramUrl(slug: string) {
  return `${window.location.origin}/vistagram/${encodeURIComponent(slug)}`
}

export async function copyVistagramUrl(slug: string) {
  const url = vistagramUrl(slug)
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return
  }
  const field = document.createElement('textarea')
  field.value = url
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  document.execCommand('copy')
  field.remove()
}

export async function shareVistagramPost(post: Pick<VistagramPostSummary, 'slug' | 'title'>) {
  const url = vistagramUrl(post.slug)
  if (navigator.share) {
    await navigator.share({ title: post.title, url })
    return true
  }
  await copyVistagramUrl(post.slug)
  return false
}
