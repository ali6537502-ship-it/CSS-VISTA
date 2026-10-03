export const CSS_ELIGIBILITY_RULES = {
  ruleVersion: 'CSS Competitive Examination Rules 2019 and onwards',
  minimumAge: 21,
  normalMaximumAge: 30,
  relaxedMaximumAge: 32,
  maxWrittenAttempts: 3,
  cutoffMonth: 12,
  cutoffDay: 31,
  mptConsumesWrittenAttempt: false,
  lastVerified: '2026-10-03',
  officialRulesUrl: 'https://cp.fpsc.gov.pk/mpt/Final_Approved_Rules_CE-2019_and_onwards.pdf',
} as const

export type DateOnly = `${number}-${string}-${string}`
export type MaximumAge = typeof CSS_ELIGIBILITY_RULES.normalMaximumAge | typeof CSS_ELIGIBILITY_RULES.relaxedMaximumAge
export type ExamYearAgeStatus = 'eligible' | 'underage' | 'overage'
export type AgeWindowStatus = 'within-window' | 'not-yet' | 'final-year-passed'

export const RULE6_RELAXATION_CATEGORIES = [
  { value: 'scheduled-caste-buddhist', label: 'Scheduled Caste / Buddhist Community' },
  { value: 'recognized-tribe-area', label: 'Recognized Tribe / eligible area under Rule 6' },
  { value: 'ajk', label: 'Permanent resident of Azad Jammu & Kashmir under Rule 6' },
  { value: 'gilgit-baltistan', label: 'Permanent resident of Gilgit-Baltistan under Rule 6' },
  { value: 'disability', label: 'Eligible person with disability under Rule 6' },
  { value: 'government-service', label: 'Eligible in-service Government servant / Armed Forces personnel / qualifying contract employee with the required continuous Government service' },
] as const

export type Rule6Category = typeof RULE6_RELAXATION_CATEGORIES[number]['value']

interface DateParts {
  year: number
  month: number
  day: number
}

export interface ExamYearEligibility {
  examYear: number
  cutoffDate: DateOnly
  earliestEligibleDOB: DateOnly
  latestEligibleDOB: DateOnly
  status: ExamYearAgeStatus
  eligible: boolean
  finalEligibleYear: boolean
}

export interface EligibilitySummary {
  dob: DateOnly
  maximumAge: MaximumAge
  currentYear: number
  nextExamYear: number
  firstEligibleExamYear: number
  lastEligibleExamYear: number
  ageWindowStatus: AgeWindowStatus
  nextExamYearStatus: ExamYearAgeStatus
  statutoryAttemptsRemaining: number
  futureAgeEligibleExamYears: number[]
  remainingAgeEligibleExamCycles: number
  maximumUsableAttemptsRemaining: number
}

const pad2 = (value: number) => String(value).padStart(2, '0')

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  if ([4, 6, 9, 11].includes(month)) return 30
  return 31
}

export function makeDateOnly(year: number, month: number, day: number): DateOnly {
  return `${year}-${pad2(month)}-${pad2(day)}` as DateOnly
}

export function parseDateOnly(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

export function isValidDateOnly(value: string): value is DateOnly {
  return parseDateOnly(value) !== null
}

export function parseDisplayDate(value: string): DateOnly | null {
  const match = /^(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{4})$/.exec(value.trim())
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const dateOnly = makeDateOnly(year, month, day)
  return isValidDateOnly(dateOnly) ? dateOnly : null
}

export function formatDateOnlyForDisplay(value: DateOnly) {
  const parsed = parseDateOnly(value)
  if (!parsed) return value
  return `${pad2(parsed.day)} / ${pad2(parsed.month)} / ${parsed.year}`
}

export function compareDateOnly(a: DateOnly, b: DateOnly) {
  return a === b ? 0 : a < b ? -1 : 1
}

export function getLocalTodayDateOnly(now = new Date()): DateOnly {
  return makeDateOnly(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function assertValidDOB(dob: DateOnly) {
  if (!isValidDateOnly(dob)) throw new RangeError(`Invalid date-only DOB: ${dob}`)
}

function assertExamYear(examYear: number) {
  if (!Number.isInteger(examYear) || examYear < 1900 || examYear > 2200) throw new RangeError(`Invalid CSS examination year: ${examYear}`)
}

function assertMaximumAge(maxAge: number): asserts maxAge is MaximumAge {
  if (maxAge !== CSS_ELIGIBILITY_RULES.normalMaximumAge && maxAge !== CSS_ELIGIBILITY_RULES.relaxedMaximumAge) {
    throw new RangeError(`Unsupported CSS maximum age: ${maxAge}`)
  }
}

export function getEligibilityForExamYear(dob: DateOnly, examYear: number, maxAge: MaximumAge = CSS_ELIGIBILITY_RULES.normalMaximumAge): ExamYearEligibility {
  assertValidDOB(dob)
  assertExamYear(examYear)
  assertMaximumAge(maxAge)

  const earliestEligibleDOB = makeDateOnly(examYear - maxAge, 1, 1)
  const latestEligibleDOB = makeDateOnly(examYear - CSS_ELIGIBILITY_RULES.minimumAge, 1, 1)
  const cutoffDate = makeDateOnly(examYear - 1, CSS_ELIGIBILITY_RULES.cutoffMonth, CSS_ELIGIBILITY_RULES.cutoffDay)

  let status: ExamYearAgeStatus = 'eligible'
  if (compareDateOnly(dob, earliestEligibleDOB) < 0) status = 'overage'
  else if (compareDateOnly(dob, latestEligibleDOB) > 0) status = 'underage'

  return {
    examYear,
    cutoffDate,
    earliestEligibleDOB,
    latestEligibleDOB,
    status,
    eligible: status === 'eligible',
    finalEligibleYear: examYear === getLastEligibleExamYear(dob, maxAge),
  }
}

export function isAgeEligibleForCE(dob: DateOnly, examYear: number, maxAge: MaximumAge = CSS_ELIGIBILITY_RULES.normalMaximumAge) {
  return getEligibilityForExamYear(dob, examYear, maxAge).eligible
}

export function getFirstEligibleExamYear(dob: DateOnly, maxAge: MaximumAge = CSS_ELIGIBILITY_RULES.normalMaximumAge) {
  assertValidDOB(dob)
  assertMaximumAge(maxAge)
  const birthYear = parseDateOnly(dob)!.year
  const searchStart = birthYear + CSS_ELIGIBILITY_RULES.minimumAge
  const searchEnd = birthYear + maxAge
  for (let examYear = searchStart; examYear <= searchEnd; examYear += 1) {
    if (isAgeEligibleForCE(dob, examYear, maxAge)) return examYear
  }
  throw new Error(`No eligible CSS examination year found for DOB ${dob}`)
}

export function getLastEligibleExamYear(dob: DateOnly, maxAge: MaximumAge = CSS_ELIGIBILITY_RULES.normalMaximumAge) {
  assertValidDOB(dob)
  assertMaximumAge(maxAge)
  const birthYear = parseDateOnly(dob)!.year
  return birthYear + maxAge
}

export function getEligibleExamYears(
  dob: DateOnly,
  maxAge: MaximumAge = CSS_ELIGIBILITY_RULES.normalMaximumAge,
  fromExamYear = getFirstEligibleExamYear(dob, maxAge),
  throughExamYear = getLastEligibleExamYear(dob, maxAge),
) {
  assertValidDOB(dob)
  assertMaximumAge(maxAge)
  assertExamYear(fromExamYear)
  assertExamYear(throughExamYear)
  if (throughExamYear < fromExamYear) return []
  if (throughExamYear - fromExamYear > 100) throw new RangeError('Exam-year range is unreasonably large')

  const years: number[] = []
  for (let examYear = fromExamYear; examYear <= throughExamYear; examYear += 1) {
    if (isAgeEligibleForCE(dob, examYear, maxAge)) years.push(examYear)
  }
  return years
}

export function getWrittenAttemptsRemaining(writtenAttemptsUsed: number) {
  if (!Number.isInteger(writtenAttemptsUsed) || writtenAttemptsUsed < 0 || writtenAttemptsUsed > CSS_ELIGIBILITY_RULES.maxWrittenAttempts) {
    throw new RangeError(`Written attempts used must be between 0 and ${CSS_ELIGIBILITY_RULES.maxWrittenAttempts}`)
  }
  return Math.max(0, CSS_ELIGIBILITY_RULES.maxWrittenAttempts - writtenAttemptsUsed)
}

export function getMaximumUsableAttemptsRemaining(statutoryAttemptsRemaining: number, remainingAgeEligibleExamCycles: number) {
  if (!Number.isInteger(statutoryAttemptsRemaining) || statutoryAttemptsRemaining < 0) throw new RangeError('Statutory attempts remaining cannot be negative')
  if (!Number.isInteger(remainingAgeEligibleExamCycles) || remainingAgeEligibleExamCycles < 0) throw new RangeError('Age-eligible examination cycles cannot be negative')
  return Math.min(statutoryAttemptsRemaining, remainingAgeEligibleExamCycles)
}

export function getEligibilitySummary({
  dob,
  writtenAttemptsUsed,
  maxAge = CSS_ELIGIBILITY_RULES.normalMaximumAge,
  currentYear = new Date().getFullYear(),
}: {
  dob: DateOnly
  writtenAttemptsUsed: number
  maxAge?: MaximumAge
  currentYear?: number
}): EligibilitySummary {
  assertValidDOB(dob)
  assertMaximumAge(maxAge)
  assertExamYear(currentYear)

  const firstEligibleExamYear = getFirstEligibleExamYear(dob, maxAge)
  const lastEligibleExamYear = getLastEligibleExamYear(dob, maxAge)
  const nextExamYear = currentYear + 1
  const nextExamYearEligibility = getEligibilityForExamYear(dob, nextExamYear, maxAge)
  const futureAgeEligibleExamYears = lastEligibleExamYear < nextExamYear
    ? []
    : getEligibleExamYears(dob, maxAge, nextExamYear, lastEligibleExamYear)
  const statutoryAttemptsRemaining = getWrittenAttemptsRemaining(writtenAttemptsUsed)
  const remainingAgeEligibleExamCycles = futureAgeEligibleExamYears.length

  let ageWindowStatus: AgeWindowStatus = 'within-window'
  if (lastEligibleExamYear < nextExamYear) ageWindowStatus = 'final-year-passed'
  else if (firstEligibleExamYear > nextExamYear) ageWindowStatus = 'not-yet'

  return {
    dob,
    maximumAge: maxAge,
    currentYear,
    nextExamYear,
    firstEligibleExamYear,
    lastEligibleExamYear,
    ageWindowStatus,
    nextExamYearStatus: nextExamYearEligibility.status,
    statutoryAttemptsRemaining,
    futureAgeEligibleExamYears,
    remainingAgeEligibleExamCycles,
    maximumUsableAttemptsRemaining: getMaximumUsableAttemptsRemaining(statutoryAttemptsRemaining, remainingAgeEligibleExamCycles),
  }
}
