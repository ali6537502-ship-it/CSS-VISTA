export interface PastPaperQuestion {
  id: string
  year: number
  paper: string
  number: string
  text: string
}

export interface PastPaperAnalysisTopic {
  id: string
  title: string
  summary: string
  analysis: string[]
  syllabusSectionIndex: number | null
  syllabusSectionMatchScore: number
  syllabusItemIndexes: number[]
  syllabusMatchScore: number
  questions: PastPaperQuestion[]
}

export interface PastPaperAnalysisSection {
  title: string
  syllabusSectionIndex: number | null
  syllabusMatchScore: number
  topics: PastPaperAnalysisTopic[]
}

export interface PastPaperAnalysisSubject {
  slug: string
  name: string
  summary: string
  officialReference: string
  frequentTopics: string
  questionCount: number
  topicCount: number
  years: number[]
  sections: PastPaperAnalysisSection[]
}

export interface PastPaperAnalysisData {
  version: number
  source: {
    title: string
    fileName: string
    sha256: string
    coverageLabel: string
    method: string[]
  }
  stats: PastPaperAnalysisStats
  integrity: {
    description: string
    limitations: { subject: string; year: number; note: string }[]
    coverage: { subject: string; files: number; questions: number; years: number[] }[]
  }
  subjects: PastPaperAnalysisSubject[]
}

export interface CompactPastPaperTopic {
  id: string
  title: string
  questionCount: number
  years: number[]
  syllabusSectionIndex: number | null
  syllabusItemIndexes: number[]
}

export interface CompactPastPaperSection {
  title: string
  syllabusSectionIndex: number | null
  questionCount: number
  topics: CompactPastPaperTopic[]
}

export interface CompactPastPaperSubject {
  slug: string
  name: string
  questionCount: number
  topicCount: number
  years: number[]
  sections: CompactPastPaperSection[]
}

export interface PastPaperAnalysisStats {
  subjects: number
  topics: number
  questions: number
  years: number[]
  mappedSections: number
  mappedTopics: number
  sourceLimitations: number
}

export interface PastPaperAnalysisIndex {
  version: number
  stats: PastPaperAnalysisStats
  subjects: CompactPastPaperSubject[]
}

let analysisRequest: Promise<PastPaperAnalysisData> | null = null
let indexRequest: Promise<PastPaperAnalysisIndex> | null = null

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json() as Promise<T>
}

export function loadPastPaperAnalysis() {
  analysisRequest ??= fetchJson<PastPaperAnalysisData>('/css-past-paper-analysis.json')
  return analysisRequest
}

export function loadPastPaperAnalysisIndex() {
  indexRequest ??= fetchJson<PastPaperAnalysisIndex>('/css-past-paper-analysis-index.json')
  return indexRequest
}
