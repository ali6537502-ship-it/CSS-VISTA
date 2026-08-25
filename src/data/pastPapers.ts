// Past-paper registry. Papers are added gradually by the owner (one by one, subject-wise)
// through the admin panel. No fabricated papers: only owner-provided files or official sources.
import { importedPastPapers } from './pastPapers.generated'
import { importedPmsPastPapers } from './pmsPastPapers.generated'
import { importedSupplementalPastPapers } from './supplementalPastPapers.generated'

export interface PastPaper {
  id: string
  title: string
  examination: 'CSS' | 'PMS' | 'PPSC' | 'MPT'
  subject: string
  subjectType: 'Compulsory' | 'Optional' | 'General'
  year: number
  paper: 'Single Paper' | 'Paper One' | 'Paper Two' | 'Combined Papers'
  mode: 'Objective' | 'Subjective'
  optionalGroup?: number | string
  fileUrl?: string // set only when the owner uploads a real file
  source: 'Owner-provided' | 'Official'
}

export const pastPapers: PastPaper[] = [...importedPastPapers, ...importedPmsPastPapers, ...importedSupplementalPastPapers]

export const examinations = ['CSS', 'PMS', 'PPSC', 'MPT'] as const
export const subjectTypes = ['Compulsory', 'Optional', 'General'] as const
export const paperParts = ['Single Paper', 'Paper One', 'Paper Two', 'Combined Papers'] as const
export const paperModes = ['Objective', 'Subjective'] as const

export const ppSubjects = [
  'Essay', 'Precis & Composition', 'General Science & Ability', 'Current Affairs', 'Pakistan Affairs', 'Islamic Studies', 'Comparative Study of Major Religions',
  'Accounting & Auditing', 'Economics', 'Computer Science', 'Political Science', 'International Relations',
  'Physics', 'Chemistry', 'Applied Mathematics', 'Pure Mathematics', 'Statistics', 'Geology',
  'Business Administration', 'Public Administration', 'Governance & Public Policies', 'Town Planning & Urban Management',
  'History of Pakistan & India', 'Islamic History & Culture', 'British History', 'European History', 'History of USA',
  'Gender Studies', 'Environmental Sciences', 'Agriculture & Forestry', 'Botany', 'Zoology', 'English Literature', 'Urdu Literature',
  'Law', 'Constitutional Law', 'International Law', 'Muslim Law & Jurisprudence', 'Mercantile Law', 'Criminology', 'Philosophy',
  'Journalism & Mass Communication', 'Psychology', 'Geography', 'Sociology', 'Anthropology',
  'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Persian', 'Arabic',
]
