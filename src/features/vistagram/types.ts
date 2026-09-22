export type VistagramPostType =
  | 'Concept'
  | 'Article'
  | 'Explainer'
  | 'Current Update'
  | 'Data & Statistics'
  | 'Case Study'
  | 'Exam Insight'

export interface VistagramPostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  type: VistagramPostType
  category: string
  topic: string
  tags: string[]
  publishedAt: string
  updatedAt?: string
  readingMinutes: number
  image?: string
  featured?: boolean
  evergreen?: boolean
  contentPath: string
}

export interface VistagramSource {
  label: string
  url: string
  date?: string
}

export interface VistagramSection {
  heading?: string
  paragraphs?: string[]
  bullets?: string[]
  callout?: string
}

export interface VistagramPost extends VistagramPostSummary {
  subtitle?: string
  keyPoints?: string[]
  sections: VistagramSection[]
  examRelevance?: string[]
  sources: VistagramSource[]
  relatedSlugs?: string[]
}

export interface VistagramIndex {
  version: number
  generatedAt: string | null
  posts: VistagramPostSummary[]
}
