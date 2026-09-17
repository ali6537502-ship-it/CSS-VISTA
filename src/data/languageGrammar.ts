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

// Grammar courses are bundled as lazy chunks so they load without runtime fetches.
const courseLoaders = import.meta.glob<{ default: GrammarCourse }>([
  './bundled-grammar/*.json',
  '!./bundled-grammar/index.json',
])

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
  const loader = courseLoaders[`./bundled-grammar/${language}.json`]
  const request = loader
    ? loader().then((m) => m.default).catch(() => fetchJson<GrammarCourse>(`/language-grammar/${language}.json`))
    : fetchJson<GrammarCourse>(`/language-grammar/${language}.json`)
  courseRequests.set(language, request)
  return request
}
