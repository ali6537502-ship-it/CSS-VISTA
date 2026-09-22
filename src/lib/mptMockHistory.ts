import type { BankQuestion } from '@/data/mcq'

type MockHistory = { version: 1; papers: Record<string, BankQuestion[]> }
const PREFIX = 'cssvista:mpt-mock-papers:v1:'

function storageKey(name: string) {
  const student = name.trim().toLocaleLowerCase('en').replace(/\s+/g, ' ')
  if (student.length < 2) throw new Error('Enter your name before opening the MPT mock.')
  return PREFIX + student
}

function load(name: string): MockHistory {
  try {
    const raw = localStorage.getItem(storageKey(name))
    if (!raw) return { version: 1, papers: {} }
    const parsed: MockHistory = JSON.parse(raw)
    if (parsed.version !== 1 || !parsed.papers || typeof parsed.papers !== 'object') throw new Error('invalid history')
    return parsed
  } catch {
    throw new Error('Your saved MPT history cannot be read. Check browser storage before starting a fresh paper.')
  }
}

export function mptQuestionStem(value: string) {
  return value.toLocaleLowerCase('en').normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

export function readMptPaper(name: string, date: string): BankQuestion[] | null {
  return load(name).papers[date] ?? null
}

export function previouslySeenMptQuestions(name: string): Set<string> {
  const seen = new Set<string>()
  Object.values(load(name).papers).flat().forEach((question) => {
    seen.add(question.id)
    seen.add(`stem:${mptQuestionStem(question.q)}`)
  })
  return seen
}

export function saveMptPaper(name: string, date: string, questions: BankQuestion[]) {
  const history = load(name)
  if (history.papers[date]) return
  history.papers[date] = questions
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(history))
  } catch {
    throw new Error('Your browser could not save the MPT paper. Free browser storage and try again so questions do not repeat.')
  }
}
