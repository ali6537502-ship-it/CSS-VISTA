/**
 * CSS optional-subject study notes.
 *
 * Generated from the 23 source documents in data-archive/optional-notes/ by
 * scripts/import_optional_notes.py, which checks every subject name against
 * the FPSC taxonomy in src/data/syllabus.ts. Notes therefore cannot appear
 * under a subject or group that does not exist, and the browsing path here is
 * the same Group -> Subject the Subject Selector uses.
 *
 * Each topic is its own public asset (3-85 KB) so a student downloads the
 * topic they opened, not a whole subject.
 */
import indexJson from './bundled/optional-notes-index.json'

export interface Segment {
  text: string
  /** A link in the source document. */
  url?: string
  /** Bold in the source document. */
  b?: boolean
}

/** The authors' own emphasis styles, preserved rather than flattened. */
export type CalloutTone = 'takeaway' | 'source' | 'intro'

export type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; segments: Segment[] }
  | { kind: 'list'; items: Segment[][] }
  | { kind: 'callout'; tone: CalloutTone; segments: Segment[] }
  | { kind: 'table'; rows: string[][] }

export interface TopicPayload {
  subject: string
  subjectSlug: string
  group: number
  slug: string
  title: string
  blocks: Block[]
  words: number
}

export interface SubjectPayload {
  subject: string
  subjectSlug: string
  group: number
  marks: number
  generatedFrom: string
  documentTitle: string
  /** Front matter: how to study the subject, syllabus map, references. */
  intro: Block[]
}

export interface TopicSummary {
  slug: string
  title: string
  words: number
}

export interface SubjectSummary {
  subject: string
  slug: string
  marks: number
  topicCount: number
  topics: TopicSummary[]
}

export interface GroupSummary {
  group: number
  rule: string
  subjects: SubjectSummary[]
}

const data = indexJson as {
  groups: GroupSummary[]
  subjectTotal: number
  topicTotal: number
}

export function optionalGroupsWithNotes(): GroupSummary[] {
  return data.groups
}

export function optionalSubjectTotal(): number {
  return data.subjectTotal
}

export function optionalTopicTotal(): number {
  return data.topicTotal
}

export function allOptionalSubjects(): Array<SubjectSummary & { group: number }> {
  return data.groups.flatMap((group) => group.subjects.map((subject) => ({ ...subject, group: group.group })))
}

export function findOptionalSubject(slug: string): (SubjectSummary & { group: number; rule: string }) | null {
  for (const group of data.groups) {
    const subject = group.subjects.find((item) => item.slug === slug)
    if (subject) return { ...subject, group: group.group, rule: group.rule }
  }
  return null
}

export function findOptionalTopic(subjectSlug: string, topicSlug: string): {
  subject: SubjectSummary & { group: number; rule: string }
  topic: TopicSummary
} | null {
  const subject = findOptionalSubject(subjectSlug)
  const topic = subject?.topics.find((item) => item.slug === topicSlug)
  return subject && topic ? { subject, topic } : null
}

/** Total words of notes published, for the section's own summary. */
export function optionalWordTotal(): number {
  return data.groups.reduce((total, group) => total
    + group.subjects.reduce((sum, subject) => sum
      + subject.topics.reduce((count, topic) => count + topic.words, 0), 0), 0)
}

// Primed during the production prerender, fetched in the browser.
const topicCache = new Map<string, TopicPayload>()
const subjectCache = new Map<string, SubjectPayload>()

export function primeOptionalTopic(payload: TopicPayload) {
  topicCache.set(`${payload.subjectSlug}/${payload.slug}`, payload)
}

export function primeOptionalSubject(payload: SubjectPayload) {
  subjectCache.set(payload.subjectSlug, payload)
}

export function optionalTopicNow(subjectSlug: string, topicSlug: string): TopicPayload | null {
  return topicCache.get(`${subjectSlug}/${topicSlug}`) ?? null
}

export function optionalSubjectNow(slug: string): SubjectPayload | null {
  return subjectCache.get(slug) ?? null
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('OPTIONAL_NOTES_UNAVAILABLE')
  return (await response.json()) as T
}

export async function loadOptionalTopic(
  subjectSlug: string, topicSlug: string, signal?: AbortSignal,
): Promise<TopicPayload> {
  const cached = optionalTopicNow(subjectSlug, topicSlug)
  if (cached) return cached
  const payload = await fetchJson<TopicPayload>(
    `/study-material/optional/${subjectSlug}/${topicSlug}.json`, signal)
  if (!Array.isArray(payload?.blocks)) throw new Error('OPTIONAL_NOTES_INVALID')
  primeOptionalTopic(payload)
  return payload
}

export async function loadOptionalSubject(slug: string, signal?: AbortSignal): Promise<SubjectPayload> {
  const cached = optionalSubjectNow(slug)
  if (cached) return cached
  const payload = await fetchJson<SubjectPayload>(`/study-material/optional/${slug}.json`, signal)
  primeOptionalSubject(payload)
  return payload
}

/** Sub-headings inside a topic, for its in-page contents list. */
export function topicOutline(blocks: Block[]): Array<{ id: string; text: string; level: number }> {
  return blocks
    .filter((block): block is Extract<Block, { kind: 'heading' }> => block.kind === 'heading')
    .map((block, index) => ({
      id: `section-${index}`,
      text: block.text,
      level: block.level,
    }))
}
