export const CURRICULUM_VERSION = 'grammar-v5-2026-10'
export const DEPTHS = ['Foundation', 'Intermediate', 'Advanced', 'Expert Extension'] as const
export type Depth = typeof DEPTHS[number]
export type Ability = 'Recognition' | 'Understanding' | 'Application' | 'Production and revision'
export interface Source { id: string; title: string; url: string; consulted: string; note: string }
export interface Concept {
  id: string; title: string; taxonomy: string[]; coverageIds: string[]; definition: string
  foundation: string[]; intermediate: string[]; advanced: string[]; expert: string[]
  patterns: { form: string; meaning: string }[]
  examples: { sentence: string; analysis: string }[]
  contrasts: { a: string; b: string; note: string }[]
  exceptions: string[]
  mistakes: { problem: string; repair: string; reason: string }[]
  glossary: { term: string; definition: string; example: string }[]; sourceIds: string[]
}
export interface ItemBase { id: string; prompt: string; conceptId: string; difficulty: Depth; ability: Ability; sourceIds: string[] }
export interface Objective extends ItemBase {
  type: 'objective'; kind: 'choice' | 'gap' | 'spot'; options: string[]; answer: number; why: string
}
export interface ResponseTask extends ItemBase {
  type: 'response'
  kind: 'gap' | 'multiple-gap' | 'correction' | 'transformation' | 'combining' | 'splitting' | 'ordering' | 'classification' | 'function' | 'comparison' | 'paragraph-edit' | 'writing' | 'analysis'
  model: string; rubric: string[]; alternatives: string[]
}
export type Item = Objective | ResponseTask
export interface Lesson {
  day: number; id: string; title: string; orientation: string; outcomes: string[]; prerequisiteDays: number[]
  modules: Concept[]; questions: Item[]; corrections: ResponseTask[]; transformations: ResponseTask[]
  writing: ResponseTask; recall: ResponseTask[]; checklist: string[]; sources: Source[]; editorialNotes: string[]
}
export interface ConceptIndex extends Pick<Concept, 'id' | 'title' | 'definition' | 'taxonomy' | 'coverageIds' | 'glossary'> {
  day: number; prerequisiteDays: number[]; words: number; hasExceptions: boolean; searchText: string; referenceFile?: string
}
export interface QuestionIndex extends Pick<Item, 'id' | 'type' | 'kind' | 'conceptId' | 'difficulty' | 'ability'> {
  day: number; errorCategory: string; answer?: number; options?: number; group: string; reinforcementId?: string
}
export interface DayIndex {
  day: number; id: string; title: string; outcomes: string[]; prerequisiteDays: number[]; modules: string[]
  counts: { objective: number; response: number; corrections: number; transformations: number; recall: number }
  words: number; essentialMinutes: number; extensionMinutes: number
}
export interface Assessment { id: string; title: string; orientation: string; items: Item[] }
export interface Catalog { version: string; contentHash: string; errorCategories: Record<string, string>; days: DayIndex[]; concepts: ConceptIndex[]; items: QuestionIndex[]; sources: Source[]; assessments: { id: string; title: string; count: number }[] }
export const TAXONOMY: Record<string, string> = {
  A: 'Morphology and word formation', B: 'Nouns and noun phrases', C: 'Pronouns and reference',
  D: 'Verb morphology and syntax', E: 'Time and aspect', F: 'Adjectives and adverbs',
  G: 'Prepositions and particles', H: 'Sentence syntax', I: 'Complex clauses',
  J: 'Advanced constructions', K: 'Meaning and interpretation', L: 'Lexical grammar',
  M: 'Discourse grammar', N: 'Academic and professional writing', O: 'Punctuation and conventions',
  P: 'Variation and disputed usage', Q: 'Error diagnosis', R: 'Applied grammar',
}
export const PHASES = [
  { start: 1, end: 6, title: 'Foundations and present-time grammar' },
  { start: 7, end: 12, title: 'Time, agreement and modification' },
  { start: 13, end: 18, title: 'Structure, relationships and modality' },
  { start: 19, end: 24, title: 'Complex constructions and conventions' },
  { start: 25, end: 30, title: 'Usage, writing and integrated assessment' },
] as const
export function lessonItems(day: Lesson): Item[] { return [...day.questions, ...day.corrections, ...day.transformations, day.writing, ...day.recall] }
