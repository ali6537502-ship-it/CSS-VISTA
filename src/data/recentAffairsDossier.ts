import type { BankQuestion } from '@/data/mcq'

export interface RecentAffairsOneLiner {
  date: string
  development: string
  fact: string
  source: string
}

export interface RecentAffairsMcq {
  id: string
  date: string
  development: string
  background: string
  whyItMatters: string
  question: string
  options: [string, string, string, string]
  answer: number
  explanation: string
  source: string
  updatedAt: string
}

export interface RecentAffairsBatch {
  batch: string
  title: string
  sourceDocument: string
  verification: string
  oneLiners: RecentAffairsOneLiner[]
  mcqs: RecentAffairsMcq[]
}

export async function getRecentAffairsBatch(): Promise<RecentAffairsBatch> {
  const response = await fetch('/api/student/premium-content.php?file=recent-affairs/batch-2026-07-11_2026-08-16.json')
  if (!response.ok) throw new Error('Current Affairs requires active Pro access.')
  return response.json() as Promise<RecentAffairsBatch>
}

export function recentAffairsToBankQuestion(question: RecentAffairsMcq): BankQuestion {
  const detail = [question.explanation, question.background, question.whyItMatters]
    .filter(Boolean)
    .join(' ')
  return {
    id: question.id,
    q: question.question,
    o: question.options,
    a: question.answer,
    e: detail || undefined,
    s: question.development,
    d: 'Intermediate',
  }
}

export async function getRecentAffairsQuestionById(id: string): Promise<BankQuestion | null> {
  if (!id.startsWith('ca-')) return null
  const batch = await getRecentAffairsBatch().catch(() => null)
  const question = batch?.mcqs.find((item) => item.id === id)
  return question ? recentAffairsToBankQuestion(question) : null
}
