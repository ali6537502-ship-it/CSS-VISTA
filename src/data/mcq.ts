// Central MCQ bank - one database used across GK World, MPT, challenges and quizzes.
// Questions live in small JSON shards under /mcq/ and are fetched only when needed.

import { bundledBankIndex } from './mcqIndex'

export interface BankQuestion {
  id: string // "{slug}-{seq}" - seq locates the chunk: chunk = ceil(seq/800)
  q: string
  o: string[]
  a: number
  e?: string
  s?: string // subcategory
  d?: 'Basic' | 'Intermediate' | 'Advanced'
}

export interface BankCategory {
  slug: string
  name: string
  count: number
  chunks: number
  mpt: boolean
}

export interface BankIndex {
  generatedAt: string
  total: number
  categories: BankCategory[]
}

export const CHUNK_SIZE = 800

function questionKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function bankQuestionKey(question: { q: string; o?: string[]; a?: number }) {
  const questionText = questionKey(question.q)
  if (!question.o || question.o.length !== 4 || question.a === undefined) return questionText
  return [questionText, ...question.o.map(questionKey), question.a].join('|')
}

export function dedupeBankQuestions<T extends { q: string; o?: string[]; a?: number }>(questions: T[]): T[] {
  const seen = new Set<string>()
  return questions.filter((question) => {
    const key = bankQuestionKey(question)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

let indexPromise: Promise<BankIndex> | null = null
export function getBankIndex(): Promise<BankIndex> {
  if (!indexPromise) {
    // Try the live shard first (allows future content updates without rebuild),
    // and fall back to the bundled index so all categories always render.
    indexPromise = fetch('/mcq/index.json')
      .then((r) => (r.ok ? r.json() : bundledBankIndex))
      .catch(() => bundledBankIndex)
  }
  return indexPromise
}

const chunkCache = new Map<string, Promise<BankQuestion[]>>()
export function getChunk(slug: string, chunk: number): Promise<BankQuestion[]> {
  const key = `${slug}:${chunk}`
  if (!chunkCache.has(key)) {
    const promise: Promise<BankQuestion[]> = fetch(`/mcq/cat-${slug}-${chunk}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((qs: BankQuestion[]) => applyMcqCorrections(qs))
      .catch(() => [])
    chunkCache.set(key, promise)
  }
  return chunkCache.get(key)!
}

// Admin corrections (edited question/options/answer/explanation) override the shipped bank.
function applyMcqCorrections(qs: BankQuestion[]): BankQuestion[] {
  const overrides = getAdminContent().mcqOverrides.filter((o) => o.q !== undefined || o.a !== undefined)
  if (!overrides.length) return qs
  return qs.map((q) => {
    const o = overrides.find((x) => x.id === q.id)
    if (!o) return q
    return { ...q, q: o.q ?? q.q, o: o.o ?? q.o, a: o.a ?? q.a, e: o.e ?? q.e }
  })
}

export async function getCategoryQuestions(slug: string): Promise<BankQuestion[]> {
  const idx = await getBankIndex()
  const cat = idx.categories.find((c) => c.slug === slug)
  if (!cat) return []
  const parts = await Promise.all(Array.from({ length: cat.chunks }, (_, i) => getChunk(slug, i)))
  return dedupeBankQuestions(parts.flat())
}

export async function getQuestionById(id: string): Promise<BankQuestion | null> {
  if (id.startsWith('adm-')) {
    return adminBankQuestions().find((x) => x.id === id) ?? null
  }
  const m = id.match(/^([a-z-]+)-(\d+)$/)
  if (!m) return null
  const slug = m[1]
  const seq = parseInt(m[2], 10)
  const chunk = Math.floor((seq - 1) / CHUNK_SIZE)
  const qs = await getChunk(slug, chunk)
  return qs.find((q) => q.id === id) ?? null
}

export async function getQuestionsByIds(ids: string[]): Promise<BankQuestion[]> {
  // admin-uploaded questions resolve from the local admin store
  const out: BankQuestion[] = []
  const adminPool = adminBankQuestions()
  const shardIds: string[] = []
  for (const id of ids) {
    if (id.startsWith('adm-')) {
      const q = adminPool.find((x) => x.id === id)
      if (q) out.push(q)
    } else {
      shardIds.push(id)
    }
  }
  // group by chunk to minimise fetches
  const groups = new Map<string, string[]>()
  for (const id of shardIds) {
    const m = id.match(/^([a-z-]+)-(\d+)$/)
    if (!m) continue
    const key = `${m[1]}:${Math.floor((parseInt(m[2], 10) - 1) / CHUNK_SIZE)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(id)
  }
  await Promise.all(
    [...groups.entries()].map(async ([key, wanted]) => {
      const [slug, chunk] = key.split(':')
      const qs = await getChunk(slug, parseInt(chunk, 10))
      qs.forEach((q) => {
        if (wanted.includes(q.id)) out.push(q)
      })
    }),
  )
  return out
}

// Deterministic PRNG for daily challenges
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function daySeed(date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

// Fetch a random sample from the given categories without loading whole categories.
export async function sampleQuestions(
  slugs: string[],
  n: number,
  rng: () => number = Math.random,
): Promise<BankQuestion[]> {
  const idx = await getBankIndex()
  const cats = idx.categories.filter((c) => slugs.includes(c.slug) && c.count > 0)
  if (cats.length === 0) return []
  const pool: BankQuestion[] = []
  await Promise.all(
    cats.map(async (c) => {
      // pick up to two random chunks per category - enough variety for a quiz pool
      const picks = new Set<number>()
      picks.add(Math.floor(rng() * c.chunks))
      if (c.chunks > 1) picks.add(Math.floor(rng() * c.chunks))
      const parts = await Promise.all([...picks].map((i) => getChunk(c.slug, i)))
      pool.push(...parts.flat())
    }),
  )
  // shuffle pool, take n
  const arr = dedupeBankQuestions(pool)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

export function categoryName(idx: BankIndex | null, slug: string): string {
  return idx?.categories.find((c) => c.slug === slug)?.name ?? slug
}

// Admin-uploaded MCQs (CSV/Excel through the admin panel) merged into the same bank shape.
import { getAdminContent } from '@/lib/admin'

export function adminBankQuestions(slug?: string): BankQuestion[] {
  const questions = getAdminContent()
    .mcqs.filter((q) => !slug || q.category === slug)
    .map((q) => ({
      id: `adm-${q.id}`,
      q: q.question,
      o: q.options,
      a: q.answer,
      e: q.explanation === '-' ? undefined : q.explanation,
      s: q.topic || undefined,
      d: q.difficulty === 'Easy' ? ('Basic' as const) : q.difficulty === 'Hard' ? ('Advanced' as const) : ('Intermediate' as const),
    }))
  return dedupeBankQuestions(questions)
}

export function filterDisabled<T extends { id: string }>(qs: T[]): T[] {
  const disabled = new Set(getAdminContent().mcqOverrides.filter((o) => o.disabled).map((o) => o.id))
  if (!disabled.size) return qs
  return qs.filter((q) => !disabled.has(q.id))
}
