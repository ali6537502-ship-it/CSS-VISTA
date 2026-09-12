import type { StudyPlannerSettings } from '@/lib/store'

export interface PlanTask {
  id: string
  subject: string
  title: string
  detail: string
  minutes: number
  to: string
}

const compulsoryPlannerSubjects = [
  { name: 'English Essay', slug: 'essay' },
  { name: 'English (Precis & Composition)', slug: 'precis-composition' },
  { name: 'General Science & Ability', slug: 'general-science-ability' },
  { name: 'Current Affairs', slug: 'current-affairs' },
  { name: 'Pakistan Affairs', slug: 'pakistan-affairs' },
  { name: 'Islamic Studies / Comparative Religion', slug: 'islamic-studies' },
] as const

// Keep the homepage planner independent from the full 30 KB detailed syllabus
// dataset. The planner only needs the official subject names, while syllabus
// pages load the detailed FPSC material in their own lazy route chunk.
export const allOptionalSubjects = [
  'Accounting & Auditing',
  'Economics',
  'Computer Science',
  'Political Science',
  'International Relations',
  'Physics',
  'Chemistry',
  'Applied Mathematics',
  'Pure Mathematics',
  'Statistics',
  'Geology',
  'Business Administration',
  'Public Administration',
  'Governance & Public Policies',
  'Town Planning & Urban Management',
  'History of Pakistan & India',
  'Islamic History & Culture',
  'British History',
  'European History',
  'History of USA',
  'Gender Studies',
  'Environmental Sciences',
  'Agriculture & Forestry',
  'Botany',
  'Zoology',
  'English Literature',
  'Urdu Literature',
  'Law',
  'Constitutional Law',
  'International Law',
  'Muslim Law & Jurisprudence',
  'Mercantile Law',
  'Criminology',
  'Philosophy',
  'Journalism & Mass Communication',
  'Psychology',
  'Geography',
  'Sociology',
  'Anthropology',
  'Punjabi',
  'Sindhi',
  'Pashto',
  'Balochi',
  'Persian',
  'Arabic',
].sort((a, b) => a.localeCompare(b))

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The default exam date rolls forward instead of rotting. A hardcoded date
 * silently becomes "0 days left" for every new student once it passes.
 */
export function nextDefaultExamDate(today = new Date()) {
  const month = 0 // January
  const day = 27
  const candidate = new Date(today.getFullYear(), month, day)
  const year = candidate >= today ? today.getFullYear() : today.getFullYear() + 1
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function defaultStudyPlannerSettings(): Omit<StudyPlannerSettings, 'configuredAt'> {
  return {
    examDate: nextDefaultExamDate(),
    dailyHours: 4,
    restDay: 5,
    selectedOptionals: [],
  }
}

function daySeed(dateKey: string) {
  return dateKey.split('-').reduce((total, value) => total + Number(value), 0)
}

export function buildDailyPlan(
  settings: Omit<StudyPlannerSettings, 'configuredAt'>,
  progress: Record<string, number>,
  dateKey: string,
  dueRevisions: number,
): PlanTask[] {
  const compulsory = compulsoryPlannerSubjects.map((subject) => ({
    name: subject.name,
    slug: subject.slug,
    progress: progress[subject.slug] ?? 0,
    compulsory: true,
  }))
  const optional = settings.selectedOptionals.map((name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return { name, slug, progress: progress[slug] ?? 0, compulsory: false }
  })
  const subjects = [...compulsory, ...optional].sort((a, b) => (
    a.progress - b.progress || a.name.localeCompare(b.name)
  ))
  const count = Math.max(3, Math.min(5, Math.round(settings.dailyHours)))
  const offset = subjects.length ? daySeed(dateKey) % subjects.length : 0
  const rotated = [...subjects.slice(offset), ...subjects.slice(0, offset)]
  const actions = [
    { title: 'Learn one syllabus unit', detail: 'Read the notes or watch the relevant lecture.', minutes: 50 },
    { title: 'Practise active recall', detail: 'Close the notes and reproduce the main headings.', minutes: 35 },
    { title: 'Write one timed answer', detail: 'Attempt one analytical answer with an outline.', minutes: 30 },
    { title: 'Revise and consolidate', detail: 'Review weak areas and update short notes.', minutes: 35 },
    { title: 'Attempt focused practice', detail: 'Use questions linked to this subject.', minutes: 30 },
  ]

  const tasks = Array.from({ length: count }, (_, index) => {
    const subject = rotated[index % Math.max(1, rotated.length)] ?? compulsory[0]
    const action = actions[index % actions.length]
    const to = index === 2
      ? `/answer-evaluation?subject=${encodeURIComponent(subject.name)}`
      : subject.compulsory
        ? `/subjects/compulsory/${subject.slug}`
        : `/lectures?course=${encodeURIComponent(subject.slug)}`
    return {
      id: `${dateKey}-${subject.slug}-${index}`,
      subject: subject.name,
      title: action.title,
      detail: action.detail,
      minutes: action.minutes,
      to,
    }
  })

  if (dueRevisions > 0) {
    tasks[0] = {
      id: `${dateKey}-smart-revision`,
      subject: 'Smart Revision',
      title: `Complete ${Math.min(20, dueRevisions)} due questions`,
      detail: 'These questions are due now according to your personal revision schedule.',
      minutes: 25,
      to: '/gk/quiz?mode=revision',
    }
  }
  return tasks
}
