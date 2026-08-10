import { lectureCourses } from '@/data/lectures'

export interface HandwrittenNoteSubject {
  slug: string
  title: string
  kind: 'Compulsory' | 'Optional'
  description: string
  uploadedNotes: number
}

export const handwrittenNoteSubjects: HandwrittenNoteSubject[] = lectureCourses.map((course) => ({
  slug: course.slug,
  title: course.title,
  kind: course.kind,
  description: course.kind === 'Compulsory'
    ? 'Handwritten preparation notes for this compulsory CSS paper.'
    : `Handwritten preparation notes for ${course.title}.`,
  uploadedNotes: 0,
}))

export const handwrittenNotesOwner = 'Miss Sadia Zahoor, PAS'
