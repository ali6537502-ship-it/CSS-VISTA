import type { BankQuestion } from '@/data/mcq'

type MockHistory = { version: 1 | 2; papers: Record<string, BankQuestion[]> }
const PREFIX = 'cssvista:mpt-mock-papers:v2:'
const LEGACY_PREFIX = 'cssvista:mpt-mock-papers:v1:'

function storageKey(name: string, legacy = false) {
  const student = name.trim().toLocaleLowerCase('en').replace(/\s+/g, ' ')
  if (student.length < 2) throw new Error('Enter your name before opening the MPT mock.')
  return (legacy ? LEGACY_PREFIX : PREFIX) + student
}

function load(name: string, legacy = false): MockHistory {
  const version = legacy ? 1 : 2
  try {
    const raw = localStorage.getItem(storageKey(name, legacy))
    if (!raw) return { version, papers: {} }
    const parsed: MockHistory = JSON.parse(raw)
    if (parsed.version !== version || !parsed.papers || typeof parsed.papers !== 'object') throw new Error('invalid history')
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
  // A new series must not replay the old saved paper in the same window. Keep
  // its questions reserved even though new papers are stored under v2.
  ;[load(name, true), load(name)].flatMap((history) => Object.values(history.papers).flat()).forEach((question) => {
    seen.add(question.id)
    seen.add(`stem:${mptQuestionStem(question.q)}`)
  })
  return seen
}

function numericPattern(value: string) {
  if (!/\d/.test(value) || /^[\d,.?\s\-–+]+$/.test(value)) return ''
  return value.toLocaleLowerCase('en').replace(/\d+(?:[.,]\d+)*/g, '#').replace(/\s+/g, ' ').trim()
}

export function previouslyUsedMptQuestionPatterns(name: string): Map<string, number> {
  const patterns = new Map<string, number>()
  Object.values(load(name).papers).flat().forEach((question) => {
    const pattern = numericPattern(question.q)
    if (pattern) patterns.set(pattern, (patterns.get(pattern) ?? 0) + 1)
  })
  return patterns
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
