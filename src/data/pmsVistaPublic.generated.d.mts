/** Type declaration for the checked-in, source-derived PMS public syllabus module. */
export interface PmsPublicTopic {
  title: string
  detail?: string
  children?: PmsPublicTopic[]
}
export interface PmsPublicSection {
  title: string
  detail?: string
  topics: PmsPublicTopic[]
}
export interface PmsPublicSubject {
  id: string
  title: string
  designation: 'compulsory' | 'optional'
  marks: number | null
  sections: PmsPublicSection[]
  readings: string[]
  notes: string[]
}
export declare const pmsVistaSubjects: PmsPublicSubject[]
export declare const pmsVistaSyllabusVersion: string
export declare const pmsVistaSubjectsById: Map<string, PmsPublicSubject>
