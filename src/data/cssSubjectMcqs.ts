import type { BankQuestion } from '@/data/mcq'

export interface CssSubjectMcqSummary {
  slug: string
  name: string
  designation: 'compulsory' | 'optional'
  group: number | null
  count: number
  topics: string[]
  file: string
  sourceCount: number
  audit: string
}

export interface CssSubjectMcqIndex {
  batch: string
  generatedAt: string
  policy: string
  total: number
  subjects: CssSubjectMcqSummary[]
}

export interface CssSubjectQuestion {
  id: string
  subject: string
  topic: string
  question: string
  options: [string, string, string, string]
  answer: number
  explanation: string | null
  sourceDocument: string
  source: string | null
  verification: string
}

const root = '/css-subject-mcqs-curated'
let indexPromise: Promise<CssSubjectMcqIndex> | null = null
const bankCache = new Map<string, Promise<CssSubjectQuestion[]>>()

export function cssSubjectSlug(name: string) {
  return name
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getCssSubjectMcqIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${root}/index.json`).then((response) => {
      if (!response.ok) throw new Error(`Subject MCQ index returned ${response.status}`)
      return response.json() as Promise<CssSubjectMcqIndex>
    })
  }
  return indexPromise
}

export function getCssSubjectMcqBank(subject: CssSubjectMcqSummary) {
  if (!bankCache.has(subject.slug)) {
    bankCache.set(subject.slug, fetch(`${root}/${subject.file}`).then((response) => {
      if (!response.ok) throw new Error(`${subject.name} bank returned ${response.status}`)
      return response.json() as Promise<CssSubjectQuestion[]>
    }))
  }
  return bankCache.get(subject.slug)!
}

export function toBankQuestion(question: CssSubjectQuestion): BankQuestion {
  return {
    id: question.id,
    q: question.question,
    o: question.options,
    a: question.answer,
    e: question.explanation || undefined,
    s: question.topic,
    d: 'Intermediate',
  }
}

export async function getCuratedSubjectQuestionById(id: string): Promise<BankQuestion | null> {
  if (!id.startsWith('css-')) return null
  const index = await getCssSubjectMcqIndex().catch(() => null)
  const subject = index?.subjects.find((item) => id.startsWith(`css-${item.slug}-`))
  if (!subject) return null
  const questions = await getCssSubjectMcqBank(subject).catch(() => [])
  const question = questions.find((item) => item.id === id)
  return question ? toBankQuestion(question) : null
}
