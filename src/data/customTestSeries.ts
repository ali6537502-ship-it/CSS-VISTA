export const compulsoryTestSeriesSubjects = [
  'English Essay',
  'English (Precis & Composition)',
  'General Science & Ability',
  'Current Affairs',
  'Pakistan Affairs',
  'Islamic Studies / Comparative Religion',
] as const

export const optionalTestSeriesSubjects = [
  'Political Science',
  'Criminology',
  'European History',
  'Environmental Science',
  'Punjabi',
] as const

export const testSeriesSubjects = [
  ...compulsoryTestSeriesSubjects,
  ...optionalTestSeriesSubjects,
] as const

export type TestSeriesSubject = (typeof testSeriesSubjects)[number]
export type TestSeriesScheduleMode = 'automatic' | 'fixed-gap'

export interface TestSeriesScheduleItem {
  number: number
  date: string
  subject: TestSeriesSubject
  syllabus: string
}

export interface TestSeriesPrice {
  unitPrice: number | null
  totalFee: number | null
  label: string
}

/** Uses only the fee points confirmed by the owner; uncovered quantities require a direct quote. */
export function getTestSeriesPrice(testCount: number): TestSeriesPrice {
  if (testCount >= 1 && testCount <= 12) {
    return {
      unitPrice: 1200,
      totalFee: testCount * 1200,
      label: 'Rs. 1,200 per test',
    }
  }
  if (testCount === 24) {
    return {
      unitPrice: 1000,
      totalFee: 24_000,
      label: 'Rs. 1,000 per test',
    }
  }
  if (testCount > 36) {
    return {
      unitPrice: 800,
      totalFee: testCount * 800,
      label: 'Rs. 800 per test',
    }
  }
  return {
    unitPrice: null,
    totalFee: null,
    label: 'Fee confirmation required',
  }
}

function localDateParts(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day, 12)
}

function toLocalDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateValue: string, days: number) {
  const date = localDateParts(dateValue)
  date.setDate(date.getDate() + days)
  return toLocalDateInput(date)
}

const compulsorySyllabusUnits = Object.fromEntries(
  compulsorySubjects.map((subject) => [
    subject.name,
    subject.topics.flatMap((topic) => topic.points),
  ]),
) as Partial<Record<TestSeriesSubject, string[]>>

/** Broad units follow the subject coverage already used across CSS Vista. */
const optionalSyllabusUnits: Partial<Record<TestSeriesSubject, string[]>> = {
  'Political Science': [
    'Political concepts and the state', 'Western political thought', 'Muslim political thought',
    'Comparative political systems', 'Political participation and institutions',
    'Government and politics of Pakistan', 'International relations and foreign policy',
    'Contemporary political challenges',
  ],
  Criminology: [
    'Foundations and scope of criminology', 'Theories of crime and criminal behaviour',
    'Juvenile delinquency', 'Criminal justice system', 'Policing and criminal investigation',
    'Punishment, prisons and rehabilitation', 'Terrorism and organized crime',
    'Cybercrime, financial crime and crime prevention',
  ],
  'European History': [
    'French Revolution and Napoleon', 'Congress of Vienna and Concert of Europe',
    'Nationalism and unification movements', 'Industrialisation and imperialism',
    'First World War and its settlement', 'Inter-war Europe', 'Second World War',
    'Cold War Europe and European integration',
  ],
  'Environmental Science': [
    'Environmental systems and sustainable development', 'Natural resources and energy',
    'Biodiversity and conservation', 'Pollution and waste management',
    'Climate change science and impacts', 'Environmental governance and agreements',
    'Environmental impact assessment', 'Environmental challenges of Pakistan',
  ],
  Punjabi: [
    'Punjabi language and linguistic development', 'Classical Punjabi poetry',
    'Modern Punjabi poetry', 'Punjabi prose and fiction', 'Folk literature and oral traditions',
    'Major literary movements', 'Literary criticism and interpretation',
    'Translation, comprehension and written expression',
  ],
}

export function getTestSeriesSyllabusUnits(subject: TestSeriesSubject) {
  return compulsorySyllabusUnits[subject] ?? optionalSyllabusUnits[subject] ?? [subject]
}

function dividedSyllabus(subject: TestSeriesSubject, occurrence: number, totalForSubject: number) {
  const units = getTestSeriesSyllabusUnits(subject)
  if (totalForSubject >= units.length) return units[occurrence % units.length]
  const start = Math.floor((occurrence * units.length) / totalForSubject)
  const end = Math.max(start + 1, Math.floor(((occurrence + 1) * units.length) / totalForSubject))
  return units.slice(start, end).join('; ')
}

export function rebalanceTestSeriesSyllabus(items: Array<Omit<TestSeriesScheduleItem, 'syllabus'> & { syllabus?: string }>) {
  const totals = new Map<TestSeriesSubject, number>()
  items.forEach((item) => totals.set(item.subject, (totals.get(item.subject) ?? 0) + 1))
  const seen = new Map<TestSeriesSubject, number>()
  return items.map((item) => {
    const occurrence = seen.get(item.subject) ?? 0
    seen.set(item.subject, occurrence + 1)
    return {
      ...item,
      syllabus: dividedSyllabus(item.subject, occurrence, totals.get(item.subject) ?? 1),
    }
  })
}

export function buildTestSeriesSchedule({
  startDate,
  testCount,
  durationDays,
  gapDays,
  mode,
  subjects,
  alternatePapers = true,
}: {
  startDate: string
  testCount: number
  durationDays: number
  gapDays: number
  mode: TestSeriesScheduleMode
  subjects: TestSeriesSubject[]
  alternatePapers?: boolean
}): TestSeriesScheduleItem[] {
  const safeCount = Math.max(1, Math.min(60, Math.round(testCount)))
  const safeSubjects = subjects.length ? subjects : [testSeriesSubjects[0]]
  const totalSpan = Math.max(0, Math.round(durationDays) - 1)
  const fixedGap = Math.max(1, Math.round(gapDays))

  const proposed = Array.from({ length: safeCount }, (_, index) => {
    const offset = mode === 'automatic'
      ? (safeCount === 1 ? 0 : Math.round((index * totalSpan) / (safeCount - 1)))
      : index * fixedGap
    const subjectIndex = alternatePapers
      ? index % safeSubjects.length
      : Math.min(safeSubjects.length - 1, Math.floor((index * safeSubjects.length) / safeCount))
    return {
      number: index + 1,
      date: addDays(startDate, offset),
      subject: safeSubjects[subjectIndex],
    }
  })
  return rebalanceTestSeriesSyllabus(proposed)
}
import { compulsorySubjects } from '@/data/syllabus'
