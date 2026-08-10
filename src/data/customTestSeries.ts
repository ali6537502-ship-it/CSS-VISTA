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

export function buildTestSeriesSchedule({
  startDate,
  testCount,
  durationDays,
  gapDays,
  mode,
  subjects,
}: {
  startDate: string
  testCount: number
  durationDays: number
  gapDays: number
  mode: TestSeriesScheduleMode
  subjects: TestSeriesSubject[]
}): TestSeriesScheduleItem[] {
  const safeCount = Math.max(1, Math.min(60, Math.round(testCount)))
  const safeSubjects = subjects.length ? subjects : [testSeriesSubjects[0]]
  const totalSpan = Math.max(0, Math.round(durationDays) - 1)
  const fixedGap = Math.max(1, Math.round(gapDays))

  return Array.from({ length: safeCount }, (_, index) => {
    const offset = mode === 'automatic'
      ? (safeCount === 1 ? 0 : Math.round((index * totalSpan) / (safeCount - 1)))
      : index * fixedGap
    return {
      number: index + 1,
      date: addDays(startDate, offset),
      subject: safeSubjects[index % safeSubjects.length],
    }
  })
}

