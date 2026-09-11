import { z } from 'zod'

const required = (max) => z.string().max(max).refine((s) => s.trim().length > 0)
const optionalText = (max = 20000) => z.string().max(max).optional()
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
}
const date = z.string().refine(validDate, 'Use a real YYYY-MM-DD date')
const source = z.object({
  publisher: required(200), title: required(500),
  url: required(2000).refine((value) => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) && !!u.hostname && !u.username && !u.password } catch { return false } }),
  published_at: optionalText(120), source_type: optionalText(120),
}).passthrough()
const fact = z.union([required(3000), z.object({
  label: required(300), value: required(3000), source: optionalText(2000), year: optionalText(2000), type: optionalText(2000), topic: optionalText(2000),
}).passthrough()])
const stat = z.object({
  label: required(300), value: required(300), source: required(2000), year: required(120).optional(), date: required(120).optional(),
}).passthrough().refine((s) => Boolean(s.year || s.date), 'Statistics require a year or date')
const list = z.array(required(2000)).max(50).optional()
const story = z.object({
  id: required(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/),
  category: required(120), headline: required(350), summary: required(4000), importance: optionalText(80),
  what_happened: optionalText(), explanation: optionalText(), background: optionalText(), why_it_matters: optionalText(),
  pakistan_perspective: optionalText(), regional_implications: optionalText(), global_implications: optionalText(),
  key_takeaways: list, what_to_watch: list, question_angles: list, topics: list, countries: list,
  institutions: list, reports: list, treaties: list, organisations: list, people: list,
  facts: z.array(fact).max(60).optional(), quick_gk: z.array(fact).max(60).optional(),
  statistics: z.array(stat).max(40).optional(),
  timeline: z.array(z.object({ date: required(120), text: required(3000) }).passthrough()).max(30).optional(),
  sources: z.array(source).min(1).max(30),
}).passthrough().superRefine((s, ctx) => {
  for (const [index, statistic] of (s.statistics || []).entries()) {
    if (!s.sources.some((source) => source.publisher === statistic.source || source.url === statistic.source)) ctx.addIssue({ code: 'custom', path: ['statistics', index, 'source'], message: 'Must exactly match a listed source publisher or URL' })
  }
})
export const datasetSchema = z.object({
  schema_version: z.literal(1).optional(), test: z.boolean().optional(), date,
  published_at: required(40).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/).refine((v) => validDate(v.slice(0, 10)) && Number.isFinite(Date.parse(v))),
  edition: required(160), stories: z.array(story).min(1).max(100),
}).passthrough().superRefine((data, ctx) => {
  if (Number.isFinite(Date.parse(data.published_at))) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(data.published_at))
    if (day !== data.date) ctx.addIssue({ code: 'custom', path: ['published_at'], message: 'Must fall on the edition date in Asia/Karachi' })
  }
  const ids = new Set()
  for (const [index, item] of data.stories.entries()) {
    if (ids.has(item.id)) ctx.addIssue({ code: 'custom', path: ['stories', index, 'id'], message: 'Duplicate stable story ID' })
    ids.add(item.id)
  }
})
export function validateDataset(data, { allowTest = false } = {}) {
  datasetSchema.parse(data)
  if (data.test && !allowTest) throw new Error('Test editions cannot be packaged for production.')
  // Return the original object, including unrecognised future metadata.
  return data
}
