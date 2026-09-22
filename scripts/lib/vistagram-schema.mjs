import { z } from 'zod'

const required = (max) => z.string().max(max).refine((value) => value.trim().length > 0)
const optionalText = (max) => z.string().max(max).optional()
const slug = required(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const httpUrl = required(2000).refine((value) => {
  try {
    const parsed = new URL(value)
    return /^https?:$/.test(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password
  } catch {
    return false
  }
}, 'Use an original HTTP(S) source URL without embedded credentials')

export const VISTAGRAM_POST_TYPES = [
  'Concept',
  'Article',
  'Explainer',
  'Current Update',
  'Data & Statistics',
  'Case Study',
  'Exam Insight',
]

export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value + 'T00:00:00Z'))
    && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
}

const date = z.string().refine(validDate, 'Use a real YYYY-MM-DD date')
const source = z.object({
  label: required(300),
  url: httpUrl,
  date: optionalText(120),
}).passthrough()

const section = z.object({
  heading: optionalText(300),
  paragraphs: z.array(required(5000)).max(12).optional(),
  bullets: z.array(required(1500)).max(20).optional(),
  callout: optionalText(2000),
}).passthrough().refine(
  (value) => Boolean(value.heading || value.callout || value.paragraphs?.length || value.bullets?.length),
  'A section must contain a heading, paragraph, bullet or callout',
)

const post = z.object({
  id: slug,
  slug,
  dedupeKey: slug,
  scope: z.enum(['Pakistan', 'Global']),
  title: required(240),
  excerpt: required(650),
  type: z.enum(VISTAGRAM_POST_TYPES),
  category: required(120),
  topic: required(160),
  tags: z.array(required(80)).min(1).max(12),
  subtitle: optionalText(500),
  keyPoints: z.array(required(1000)).max(12).optional(),
  sections: z.array(section).min(2).max(20),
  examRelevance: z.array(required(1000)).max(12).optional(),
  sources: z.array(source).min(1).max(15),
  relatedSlugs: z.array(slug).max(12).optional(),
  evergreen: z.boolean().optional(),
  featured: z.boolean().optional(),
  updatedAt: optionalText(80),
}).passthrough().superRefine((item, ctx) => {
  const sourceUrls = new Set()
  item.sources.forEach((entry, index) => {
    if (sourceUrls.has(entry.url)) {
      ctx.addIssue({ code: 'custom', path: ['sources', index, 'url'], message: 'Duplicate source URL inside one post' })
    }
    sourceUrls.add(entry.url)
  })

  if (['Current Update', 'Data & Statistics'].includes(item.type) && item.sources.length < 2) {
    ctx.addIssue({ code: 'custom', path: ['sources'], message: item.type + ' posts require at least two independent sources' })
  }

  const words = wordCountFromPost(item)
  if (words < 350) {
    ctx.addIssue({ code: 'custom', path: ['sections'], message: 'Each Vistagram post requires at least 350 words of substantive content' })
  }
  if (words > 3200) {
    ctx.addIssue({ code: 'custom', path: ['sections'], message: 'Keep Vistagram posts below 3,200 words' })
  }
})

export const batchSchema = z.object({
  schema_version: z.literal(1).optional(),
  test: z.boolean().optional(),
  profile: z.enum(['daily-six', 'launch-ten']),
  date,
  published_at: required(40)
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/)
    .refine((value) => Number.isFinite(Date.parse(value)), 'Invalid publication timestamp'),
  edition: required(180),
  editorial_safety: z.object({
    neutral_factual: z.literal(true),
    non_partisan: z.literal(true),
    no_personal_attacks: z.literal(true),
    respectful_of_state_and_religion: z.literal(true),
    no_defamation_or_inflammatory_framing: z.literal(true),
  }),
  posts: z.array(post).min(6).max(10),
}).passthrough().superRefine((batch, ctx) => {
  const publicationDay = Number.isFinite(Date.parse(batch.published_at))
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(batch.published_at))
    : ''

  if (publicationDay && publicationDay !== batch.date) {
    ctx.addIssue({ code: 'custom', path: ['published_at'], message: 'Publication timestamp must fall on batch date in Asia/Karachi' })
  }

  const pakistan = batch.posts.filter((item) => item.scope === 'Pakistan').length
  const global = batch.posts.filter((item) => item.scope === 'Global').length
  const expected = batch.profile === 'launch-ten'
    ? { total: 10, pakistan: 5, global: 5 }
    : { total: 6, pakistan: 3, global: 3 }
  if (batch.posts.length !== expected.total || pakistan !== expected.pakistan || global !== expected.global) {
    ctx.addIssue({
      code: 'custom',
      path: ['posts'],
      message: batch.profile === 'launch-ten'
        ? 'Launch batch must contain exactly 5 Pakistan and 5 Global posts'
        : 'Daily batch must contain exactly 3 Pakistan and 3 Global posts',
    })
  }

  for (const field of ['id', 'slug', 'dedupeKey']) {
    const seen = new Set()
    batch.posts.forEach((item, index) => {
      const value = item[field]
      if (seen.has(value)) {
        ctx.addIssue({ code: 'custom', path: ['posts', index, field], message: 'Duplicate ' + field + ' in daily batch' })
      }
      seen.add(value)
    })
  }
})

export function validateVistagramBatch(data, { allowTest = false } = {}) {
  batchSchema.parse(data)
  if (data.test && !allowTest) throw new Error('Test Vistagram batches cannot be packaged for production.')
  return data
}

export function wordCountFromPost(post) {
  const chunks = [
    post.title,
    post.excerpt,
    post.subtitle,
    ...(post.keyPoints || []),
    ...(post.examRelevance || []),
  ]
  for (const item of post.sections || []) {
    chunks.push(item.heading, item.callout, ...(item.paragraphs || []), ...(item.bullets || []))
  }
  return chunks
    .filter(Boolean)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is',
  'it', 'of', 'on', 'or', 'that', 'the', 'to', 'what', 'why', 'with', 'understanding',
  'explained', 'explainer', 'analysis', 'overview',
])

export function titleTokens(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 2 && !stopWords.has(item)),
  )
}

export function titleSimilarity(left, right) {
  const a = titleTokens(left)
  const b = titleTokens(right)
  if (a.size < 3 || b.size < 3) return 0
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection += 1
  const union = a.size + b.size - intersection
  return union ? intersection / union : 0
}
