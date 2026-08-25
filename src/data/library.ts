// Notes, past papers and downloads registries.
// Owner-provided files (notes, past papers) are registered here when uploaded.
// Until then, the library lists researched/original CSS Vista material only.

export interface LibraryItem {
  id: string
  title: string
  subject: string
  topic: string
  type: 'Notes' | 'Past Paper' | 'Planner' | 'Worksheet' | 'Revision Sheet' | 'Syllabus Guide' | 'Outline' | 'Grammar Exercise'
  description: string
  author: string
  source: 'Owner-provided' | 'CSS Vista original' | 'CSS Vista archive' | 'Official (FPSC/GoP)'
  pages?: number
  year?: number
  tags: string[]
  lastUpdated: string
  fileUrl?: string // real file only; no broken links
  status: 'available' | 'awaiting-owner-file'
}

export const libraryItems: LibraryItem[] = [
  { id: 'lib1', title: 'English Essay - Syllabus & Preparation Guide', subject: 'Essay', topic: 'Getting started', type: 'Syllabus Guide', description: 'Paper structure, recurring themes, preparation sequence and revision checklist for the Essay paper.', author: 'CSS Vista', source: 'CSS Vista original', tags: ['essay', 'guide', 'beginner'], lastUpdated: '2026-07-17', status: 'available' },
  { id: 'lib2', title: 'Precis & Composition - Syllabus & Preparation Guide', subject: 'Precis & Composition', topic: 'Getting started', type: 'Syllabus Guide', description: 'Paper pattern, grammar and vocabulary core areas, and a daily-practice sequence.', author: 'CSS Vista', source: 'CSS Vista original', tags: ['precis', 'grammar', 'guide'], lastUpdated: '2026-07-17', status: 'available' },
  { id: 'lib3', title: 'Pakistan Affairs - Topic Map 1857 to Present', subject: 'Pakistan Affairs', topic: 'Full syllabus', type: 'Notes', description: 'Topic-wise map of the Pakistan Affairs syllabus linking pre- and post-1947 areas with past-paper themes.', author: 'CSS Vista', source: 'CSS Vista original', tags: ['pakistan affairs', 'timeline', 'topic map'], lastUpdated: '2026-07-17', status: 'available' },
  { id: 'lib4', title: 'Current Affairs - Issue Files (Climate, CPEC, Economy, AI, Afghanistan, Water)', subject: 'Current Affairs', topic: 'Issue files', type: 'Notes', description: 'Structured issue files with background, actors, statistics, timeline, policy options and sources.', author: 'CSS Vista', source: 'CSS Vista original', tags: ['current affairs', 'issue files'], lastUpdated: '2026-07-17', status: 'available' },
  { id: 'lib5', title: 'Islamic Studies - Core Topics & Reference Guide', subject: 'Islamic Studies', topic: 'Full syllabus', type: 'Notes', description: 'Beliefs, pillars, Seerah timeline and contemporary topics with guidance on accurate referencing.', author: 'CSS Vista', source: 'CSS Vista original', tags: ['islamiat', 'seerah'], lastUpdated: '2026-07-17', status: 'available' },
  { id: 'lib6', title: 'General Science & Ability - Concept Checklist', subject: 'General Science & Ability', topic: 'Full syllabus', type: 'Revision Sheet', description: 'Topic checklist for science concepts and the quantitative/reasoning areas to drill.', author: 'CSS Vista', source: 'CSS Vista original', tags: ['gsa', 'checklist'], lastUpdated: '2026-07-17', status: 'available' },
  { id: 'lib7', title: 'Answer-Writing Self-Assessment Rubric', subject: 'All subjects', topic: 'Answer writing', type: 'Worksheet', description: 'Twelve-point rubric covering relevance, structure, analysis, evidence and presentation.', author: 'CSS Vista', source: 'CSS Vista original', tags: ['answer writing', 'rubric'], lastUpdated: '2026-07-17', status: 'available' },
  { id: 'lib8', title: 'CSS, PMS & PPSC Past-Paper Archive', subject: 'All subjects', topic: 'Past papers', type: 'Past Paper', description: 'Browse the CSS Vista archive by examination, subject, year, paper type and mode.', author: 'CSS Vista', source: 'CSS Vista archive', tags: ['past papers'], lastUpdated: '2026-08-24', fileUrl: '/past-papers', status: 'available' },
  { id: 'lib9', title: 'Grammar Book Lessons - Owner file pending', subject: 'Precis & Composition', topic: 'Grammar', type: 'Grammar Exercise', description: 'The authorised grammar lessons activate when the owner uploads the grammar book; CSS Vista original lessons remain available meanwhile.', author: '-', source: 'Owner-provided', tags: ['grammar'], lastUpdated: '2026-07-17', status: 'awaiting-owner-file' },
]

export interface PastPaperMeta {
  id: string
  year: number
  subject: string
  category: 'Compulsory' | 'Optional'
  status: 'awaiting-owner-file'
}

// Metadata for the standard compulsory set; files are added by the owner.
export const pastPaperYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]
export const pastPaperCompulsorySubjects = ['Essay', 'Precis & Composition', 'General Science & Ability', 'Current Affairs', 'Pakistan Affairs', 'Islamic Studies']
