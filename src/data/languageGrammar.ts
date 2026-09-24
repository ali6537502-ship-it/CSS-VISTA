export interface GrammarField {
  label: string
  value: string
}

export interface GrammarRecord {
  id: string
  fields: GrammarField[]
  sourcePage: number
}

export interface GrammarTopic {
  slug: string
  title: string
  description: string
  items: GrammarRecord[]
}

export interface GrammarCourse {
  language: 'urdu' | 'english'
  lang: 'ur' | 'en'
  direction: 'rtl' | 'ltr'
  sourcePages: string
  total: number
  topics: GrammarTopic[]
}

export interface GrammarLanguageSummary {
  slug: 'urdu' | 'english'
  name: string
  nativeName: string
  total: number
  topics: number
}

export interface GrammarIndex {
  generatedAt: string
  source: string
  languages: GrammarLanguageSummary[]
}

import bundledIndexJson from './bundled-grammar/index.json'
import bundledEnglishJson from './bundled-grammar/english.json' with { type: 'json' }
import bundledUrduJson from './bundled-grammar/urdu.json' with { type: 'json' }

// The same checked repository records feed the grammar course and MPT banks.
// Keeping one import form prevents the bundler from creating inconsistent JSON modules.
const bundledCourses: Record<'english' | 'urdu', GrammarCourse> = {
  english: bundledEnglishJson as GrammarCourse,
  urdu: bundledUrduJson as GrammarCourse,
}

const bundledIndex = bundledIndexJson as GrammarIndex

let indexRequest: Promise<GrammarIndex> | null = null
const courseRequests = new Map<string, Promise<GrammarCourse>>()

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load grammar material (${response.status})`)
  return response.json() as Promise<T>
}

/**
 * The grammar index, available synchronously. It is compiled into the bundle,
 * so neither a visitor nor the build-time prerender needs a loading state.
 */
export function grammarIndexNow(): GrammarIndex {
  return bundledIndex
}

export function getGrammarIndex(): Promise<GrammarIndex> {
  if (!indexRequest) {
    indexRequest = Promise.resolve(bundledIndex).catch(() => fetchJson<GrammarIndex>('/language-grammar/index.json'))
  }
  return indexRequest
}

export function getGrammarCourse(language: 'urdu' | 'english'): Promise<GrammarCourse> {
  const existing = courseRequests.get(language)
  if (existing) return existing
  const request = Promise.resolve(bundledCourses[language])
    .catch(() => fetchJson<GrammarCourse>(`/language-grammar/${language}.json`))
  courseRequests.set(language, request)
  return request
}
