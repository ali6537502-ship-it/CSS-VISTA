import { compulsorySubjects, optionalGroups } from '@/data/syllabus'
import type { StudyPlannerSettings } from '@/lib/store'

export interface PlanTask {
  id: string
  subject: string
  title: string
  detail: string
  minutes: number
  to: string
}

export const allOptionalSubjects = optionalGroups
  .flatMap((group) => group.subjects.map((subject) => subject.name))
  .sort((a, b) => a.localeCompare(b))

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function defaultStudyPlannerSettings(): Omit<StudyPlannerSettings, 'configuredAt'> {
  return {
    examDate: '2027-01-27',
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
  const compulsory = compulsorySubjects.map((subject) => ({
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
        : '/lectures'
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
