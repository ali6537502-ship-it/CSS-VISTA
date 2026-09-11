import { z } from 'zod'

const text = z.string().trim().min(1)
// Source text is never rewritten by the reader.
const sourceText = z.string().refine((s) => s.trim().length > 0)
export function safeSourceUrl(url: string): boolean {
  try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password }
  catch { return false }
}
export const sourceSchema = z.object({
  publisher: sourceText, title: sourceText, url: z.string().refine(safeSourceUrl),
  published_at: z.string().optional(), source_type: z.string().optional(),
})
export const factSchema = z.union([sourceText, z.object({
  label: sourceText, value: sourceText, source: z.string().optional(),
  year: z.string().optional(), type: z.string().optional(), topic: z.string().optional(),
})])
const statisticSchema = z.object({
  label: sourceText, value: sourceText, source: sourceText,
  year: z.string().optional(), date: z.string().optional(),
}).refine((s) => Boolean(s.year || s.date))
const stringList = z.array(z.string()).catch([])
const facts = z.array(z.unknown()).catch([]).transform((items) =>
  items.flatMap((item) => { const r = factSchema.safeParse(item); return r.success ? [r.data] : [] }))
const statistics = z.array(z.unknown()).catch([]).transform((items) =>
  items.flatMap((item) => { const r = statisticSchema.safeParse(item); return r.success ? [r.data] : [] }))
export const preferencesSchema = z.object({
  reading_mode: z.enum(['quick', 'full']).catch('quick'),
  preferred_categories: stringList,
})
export const cardSchema = z.object({
  id: text.regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/),
  publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: sourceText, headline: sourceText, summary: sourceText,
  importance: z.string().optional(), reading_minutes: z.number().positive().catch(1),
  saved: z.boolean().catch(false), reading_status: z.enum(['unread', 'opened', 'read']).catch('unread'),
  topics: stringList, key_takeaways: stringList,
  facts, statistics, quick_gk: facts,
  sources: z.array(sourceSchema).catch([]),
  countries: stringList, people: stringList, organisations: stringList, reports: stringList, treaties: stringList,
})
export const storySchema = cardSchema.extend({
  what_happened: z.string().optional(), explanation: z.string().optional(), background: z.string().optional(),
  why_it_matters: z.string().optional(), pakistan_perspective: z.string().optional(),
  regional_implications: z.string().optional(), global_implications: z.string().optional(),
  what_to_watch: stringList, question_angles: stringList,
  timeline: z.array(z.object({ date: sourceText, text: sourceText })).catch([]),
  sources: z.array(sourceSchema).min(1),
}).transform((story) => ({
  ...story, statistics: story.statistics.filter((stat) => story.sources.some((s) => s.publisher === stat.source || s.url === stat.source)),
}))
export const summarySchema = z.object({
  date: z.string(), published: z.boolean(), latest_date: z.string().nullable(), edition: z.string(),
  published_at: z.string().nullable(), updated_at: z.string().nullable(),
  categories: z.array(z.object({ category: z.string(), count: z.number(), unread: z.number() })),
  total: z.number(), unread: z.number(),
})
const cards = z.array(z.unknown()).transform((items) => items.flatMap((item) => {
  const result = cardSchema.safeParse(item)
  if (!result.success) { console.warn('CSS Vista: an invalid briefing card was omitted.'); return [] }
  const card = result.data
  return [{ ...card, statistics: card.statistics.filter((stat) => card.sources.some((s) => s.publisher === stat.source || s.url === stat.source)) }]
}))
export const feedSchema = z.object({
  items: cards, has_more: z.boolean(), page: z.number(), summary: summarySchema,
  categories: stringList, preferences: preferencesSchema,
})
export const overviewSchema = z.object({
  summary: summarySchema, preferences: preferencesSchema, display_name: z.string(),
  continue_reading: cards, saved: cards, stories: cards, facts: cards, weekly_read: z.number(),
})
export const archiveSchema = z.object({
  days: z.array(z.object({ publication_date: z.string(), edition: z.string(), published_at: z.string(), story_count: z.number() })),
  has_more: z.boolean(), categories: stringList,
})
export const settingsSchema = z.object({
  preferences: preferencesSchema, categories: stringList, display_name: z.string(), email: z.string(),
})
export const readingResponseSchema = z.object({
  saved: z.boolean(), reading_status: z.enum(['unread', 'opened', 'read']),
})
export type StoryCard = z.infer<typeof cardSchema>
export type Story = z.infer<typeof storySchema>
export type Fact = z.infer<typeof factSchema>
export type Source = z.infer<typeof sourceSchema>
export type Preferences = z.infer<typeof preferencesSchema>
export type Summary = z.infer<typeof summarySchema>
export type ReadingStatus = StoryCard['reading_status']
export const accountRoot = '/account'
export const briefingRoot = '/account/current-affairs'
export function pakistanDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}
export function displayDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Karachi' }).format(new Date(date.length === 10 ? date + 'T12:00:00Z' : date))
}
export function displayUpdated(date: string | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' }).format(new Date(date)) + ' PKT'
}
export function factText(fact: Fact): string {
  return typeof fact === 'string' ? fact : fact.label + ': ' + fact.value
}
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !/[\\\u0000-\u0020]/.test(value) ? value : '/account/dashboard'
}
export function dateFilters(params: URLSearchParams, defaultRange = 'today'): URLSearchParams {
  const result = new URLSearchParams(params)
  const range = result.get('range') || defaultRange
  const today = pakistanDate()
  if (range === 'today' || range === 'yesterday') {
    const day = range === 'today' ? today : shiftDate(today, -1)
    result.set('from', day); result.set('to', day); result.set('date', day)
  } else if (range === '7' || range === '30') {
    result.set('from', shiftDate(today, 1 - Number(range))); result.set('to', today)
  } else if (range === 'custom') {
    if (result.get('from') === result.get('to') && result.get('from')) result.set('date', result.get('from')!)
  } else { result.delete('from'); result.delete('to') }
  result.delete('range'); result.delete('month')
  return result
}
