// Handwritten notes library by Miss Sadia Zahoor, PAS. Categories follow the same
// subject structure as the lecture centre; files appear only after original uploads.
import { allLectureCourses } from './lectures'

export interface HandwrittenNoteCategory {
  slug: string
  title: string
  kind: 'Compulsory' | 'Optional'
  description: string
  uploadedNotes: number
}

export const handwrittenNoteCategories: HandwrittenNoteCategory[] = allLectureCourses.map((c) => ({
  slug: c.slug,
  title: c.title,
  kind: c.kind,
  description:
    c.kind === 'Compulsory'
      ? 'Handwritten preparation notes for this compulsory CSS paper.'
      : `Handwritten preparation notes for ${c.title}.`,
  uploadedNotes: 0,
}))

export const notesAuthor = 'Miss Sadia Zahoor, PAS'
