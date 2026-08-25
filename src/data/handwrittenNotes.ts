import { lectureCourses } from '@/data/lectures'

export interface HandwrittenNoteSubject {
  slug: string
  title: string
  kind: 'Compulsory' | 'Optional'
  description: string
}

export const handwrittenNoteSubjects: HandwrittenNoteSubject[] = lectureCourses.map((course) => ({
  slug: course.slug,
  title: course.title,
  kind: course.kind,
  description: course.kind === 'Compulsory'
    ? 'Handwritten preparation notes for this compulsory CSS paper.'
    : `Handwritten preparation notes for ${course.title}.`,
}))

export const handwrittenNotesOwner = 'Miss Sadia Zahoor, PAS'
