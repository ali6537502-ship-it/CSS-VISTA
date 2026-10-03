import { useState } from 'react'
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Clock3,
  ExternalLink, FileCheck2, ShieldCheck, Target,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import {
  CSS_ELIGIBILITY_RULES,
  RULE6_RELAXATION_CATEGORIES,
  compareDateOnly,
  formatDateOnlyForDisplay,
  getEligibilityForExamYear,
  getEligibilitySummary,
  getLastEligibleExamYear,
  getLocalTodayDateOnly,
  isValidDateOnly,
  parseDisplayDate,
  type DateOnly,
  type EligibilitySummary,
  type Rule6Category,
} from '@/lib/cssEligibility'

type RelaxationChoice = 'no' | 'yes' | 'not-sure'
type FormErrors = Partial<Record<'dob' | 'attempts' | 'relaxationCategory', string>>

interface CalculationResult {
  dob: DateOnly
  relaxationChoice: RelaxationChoice
  relaxationCategory: Rule6Category | ''
  primary: EligibilitySummary
  relaxedAlternative: EligibilitySummary | null
}

const inputClass = 'mt-2 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

function statusCopy(summary: EligibilitySummary, relaxationApplied: boolean) {
  if (summary.ageWindowStatus === 'final-year-passed') {
    return {
      title: 'Final Age-Eligible Year Passed',
      detail: relaxationApplied
        ? 'Based on the information entered, the Rule 6 age window used for this calculation has passed.'
        : 'Based on the information entered, your ordinary FPSC age window has passed.',
    }
  }
  if (summary.ageWindowStatus === 'not-yet') {
    return {
      title: 'Not Yet Eligible',
      detail: `You have not yet reached the FPSC age window for CE-${summary.nextExamYear}.`,
    }
  }
  return {
    title: 'Eligible',
    detail: relaxationApplied
      ? `Your age falls within the Rule 6 age window used for CE-${summary.nextExamYear}.`
      : `Your age falls within the ordinary FPSC age window for CE-${summary.nextExamYear}.`,
  }
}

function yearsRemainingCopy(count: number) {
  if (count === 0) return 'No future age-eligible examination years'
  return `${count} examination year${count === 1 ? '' : 's'} remaining`
}

function timelineYears(summary: EligibilitySummary) {
  const years = new Set<number>()
  if (summary.ageWindowStatus === 'final-year-passed') {
    years.add(summary.lastEligibleExamYear)
    years.add(summary.nextExamYear)
  } else if (summary.ageWindowStatus === 'not-yet') {
    years.add(summary.nextExamYear)
    years.add(summary.firstEligibleExamYear)
    years.add(summary.lastEligibleExamYear)
  } else {
    for (let year = summary.nextExamYear; year <= Math.min(summary.lastEligibleExamYear, summary.nextExamYear + 2); year += 1) years.add(year)
    years.add(summary.lastEligibleExamYear)
  }
  years.add(summary.lastEligibleExamYear + 1)
  return [...years].sort((a, b) => a - b).slice(0, 6)
}

function ResultMetric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-pine">{value}</p>
      {helper && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{helper}</p>}
    </div>
  )
}

function Timeline({ summary, dob }: { summary: EligibilitySummary; dob: DateOnly }) {
  const ordinaryLast = getLastEligibleExamYear(dob, CSS_ELIGIBILITY_RULES.normalMaximumAge)
  return (
    <div className="mt-4 space-y-2" aria-label="CSS examination year eligibility timeline">
      {timelineYears(summary).map((examYear) => {
        const item = getEligibilityForExamYear(dob, examYear, summary.maximumAge)
        const relaxedOnly = summary.maximumAge === CSS_ELIGIBILITY_RULES.relaxedMaximumAge
          && examYear > ordinaryLast
          && item.eligible
        let label = item.status === 'eligible' ? 'Age Eligible' : item.status === 'underage' ? 'Not Yet Age Eligible' : 'Over Age'
        if (relaxedOnly) label = 'Eligible under Rule 6 relaxation'
        if (item.finalEligibleYear && item.eligible) label += ' — Final Year'

        return (
          <div
            key={examYear}
            className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${item.finalEligibleYear && item.eligible ? 'border-amber-300 bg-amber-50/70' : 'bg-white'}`}
          >
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-secondary" aria-hidden="true">
              {item.eligible
                ? <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                : <Clock3 className="h-4 w-4 text-muted-foreground" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-pine">CE-{examYear}</p>
              <p className="mt-0.5 text-xs font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Age cut-off: 31 December {examYear - 1}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CssEligibilityCalculator() {
  const today = getLocalTodayDateOnly()
  const currentYear = Number(today.slice(0, 4))
  const [dobText, setDobText] = useState('')
  const [pickerValue, setPickerValue] = useState('')
  const [attempts, setAttempts] = useState('0')
  const [relaxation, setRelaxation] = useState<RelaxationChoice>('no')
  const [relaxationCategory, setRelaxationCategory] = useState<Rule6Category | ''>('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [result, setResult] = useState<CalculationResult | null>(null)

  function clearResult() {
    setResult(null)
  }

  function updateDobText(value: string) {
    setDobText(value)
    const parsed = parseDisplayDate(value)
    setPickerValue(parsed ?? '')
    setErrors((current) => ({ ...current, dob: undefined }))
    clearResult()
  }

  function updateDatePicker(value: string) {
    setPickerValue(value)
    setDobText(isValidDateOnly(value) ? formatDateOnlyForDisplay(value) : '')
    setErrors((current) => ({ ...current, dob: undefined }))
    clearResult()
  }

  function calculate() {
    const nextErrors: FormErrors = {}
    const dob = parseDisplayDate(dobText)
    const writtenAttemptsUsed = Number(attempts)

    if (!dob) nextErrors.dob = 'Enter a real calendar date in DD / MM / YYYY format.'
    else if (compareDateOnly(dob, today) > 0) nextErrors.dob = 'Date of birth cannot be in the future.'

    if (!Number.isInteger(writtenAttemptsUsed) || writtenAttemptsUsed < 0 || writtenAttemptsUsed > CSS_ELIGIBILITY_RULES.maxWrittenAttempts) {
      nextErrors.attempts = 'Choose a written-attempt count from 0 to 3.'
    }
    if (relaxation === 'yes' && !relaxationCategory) {
      nextErrors.relaxationCategory = 'Select the Rule 6 category you are relying on.'
    }

    setErrors(nextErrors)
    if (!dob || Object.keys(nextErrors).length) {
      setResult(null)
      return
    }

    const ordinary = getEligibilitySummary({
      dob,
      writtenAttemptsUsed,
      maxAge: CSS_ELIGIBILITY_RULES.normalMaximumAge,
      currentYear,
    })
    const relaxed = getEligibilitySummary({
      dob,
      writtenAttemptsUsed,
      maxAge: CSS_ELIGIBILITY_RULES.relaxedMaximumAge,
      currentYear,
    })

    setResult({
      dob,
      relaxationChoice: relaxation,
      relaxationCategory,
      primary: relaxation === 'yes' ? relaxed : ordinary,
      relaxedAlternative: relaxation === 'not-sure' ? relaxed : null,
    })
  }

  const primaryStatus = result ? statusCopy(result.primary, result.relaxationChoice === 'yes') : null
  const selectedRule6 = RULE6_RELAXATION_CATEGORIES.find((item) => item.value === result?.relaxationCategory)

  return (
    <div>
      <PageHeader
        title="CSS Age & Attempts Calculator"
        description="Check your FPSC age window, final age-eligible CSS examination year, written chances remaining, and the maximum attempts you can still realistically use."
      />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pine text-white">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-pine">Calculate My CSS Eligibility</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Age is checked against the FPSC cut-off for each examination year, not your age today.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <label htmlFor="css-dob" className="text-sm font-semibold text-foreground">Date of Birth</label>
                <p className="mt-1 text-xs text-muted-foreground">Enter it as DD / MM / YYYY, or use the calendar.</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_180px]">
                  <input
                    id="css-dob"
                    inputMode="numeric"
                    autoComplete="bday"
                    placeholder="15 / 06 / 1998"
                    value={dobText}
                    onChange={(event) => updateDobText(event.target.value)}
                    aria-invalid={Boolean(errors.dob)}
                    aria-describedby={errors.dob ? 'css-dob-error' : 'css-dob-help'}
                    className="min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                  <input
                    type="date"
                    aria-label="Choose date of birth from calendar"
                    value={pickerValue}
                    max={today}
                    onChange={(event) => updateDatePicker(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                </div>
                <p id="css-dob-help" className="mt-1.5 text-xs text-muted-foreground">
                  Your DOB is used only for this calculation and is not placed in the page URL.
                </p>
                {errors.dob && <p id="css-dob-error" role="alert" className="mt-1.5 text-xs font-medium text-red-700">{errors.dob}</p>}
              </div>

              <div>
                <label htmlFor="css-attempts" className="text-sm font-semibold text-foreground">Previous CSS Written Attempts</label>
                <select
                  id="css-attempts"
                  value={attempts}
                  onChange={(event) => {
                    setAttempts(event.target.value)
                    setErrors((current) => ({ ...current, attempts: undefined }))
                    clearResult()
                  }}
                  aria-invalid={Boolean(errors.attempts)}
                  className={inputClass}
                >
                  <option value="0">0 — I have never appeared in a CSS written examination</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
                {errors.attempts && <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{errors.attempts}</p>}
                <details className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-semibold text-emerald-900">What counts as a written attempt?</summary>
                  <p className="mt-2 leading-relaxed">
                    A chance is consumed if you actually appeared in one or more papers of the CSS written competitive examination, even if you submitted a blank answer book or sheet or were subsequently rejected. MPT registration, appearance, failure, or a passed MPT without appearing in a written paper does not consume one of the three written chances.
                  </p>
                </details>
              </div>

              <fieldset>
                <legend className="text-sm font-semibold text-foreground">FPSC Rule 6 Age Relaxation</legend>
                <p className="mt-1 text-xs text-muted-foreground">Do you qualify for the FPSC two-year upper-age relaxation under Rule 6?</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {([
                    ['no', 'No'],
                    ['yes', 'Yes'],
                    ['not-sure', 'Not Sure'],
                  ] as const).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${relaxation === value ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'bg-white'}`}
                    >
                      <input
                        type="radio"
                        name="rule6-relaxation"
                        value={value}
                        checked={relaxation === value}
                        onChange={() => {
                          setRelaxation(value)
                          setErrors((current) => ({ ...current, relaxationCategory: undefined }))
                          clearResult()
                        }}
                        className="h-4 w-4 accent-emerald-800"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {relaxation === 'yes' && (
                  <div className="mt-3">
                    <label htmlFor="rule6-category" className="text-sm font-semibold text-foreground">Rule 6 category</label>
                    <select
                      id="rule6-category"
                      value={relaxationCategory}
                      onChange={(event) => {
                        setRelaxationCategory(event.target.value as Rule6Category | '')
                        setErrors((current) => ({ ...current, relaxationCategory: undefined }))
                        clearResult()
                      }}
                      aria-invalid={Boolean(errors.relaxationCategory)}
                      className={inputClass}
                    >
                      <option value="">Choose the relevant category…</option>
                      {RULE6_RELAXATION_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>{category.label}</option>
                      ))}
                    </select>
                    {errors.relaxationCategory && <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{errors.relaxationCategory}</p>}
                    {relaxationCategory === 'government-service' && (
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                        Government-service relaxation is subject to the qualifying FPSC conditions, including the required continuous Government service as of the cut-off date. Employees of organizations excluded by Rule 6 are not automatically eligible.
                      </p>
                    )}
                  </div>
                )}

                {relaxation === 'not-sure' && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                    The main result will use the ordinary age limit first. A separate comparison will show what changes if FPSC confirms that you qualify for the two-year Rule 6 relaxation.
                  </p>
                )}
              </fieldset>

              <button
                type="button"
                onClick={calculate}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-pine px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                Calculate My CSS Eligibility <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-xl border bg-secondary/40 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-pine"><CalendarDays className="h-4 w-4" />FPSC cut-off method</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                For CE-Y, age eligibility is determined on 31 December of Y−1. The normal DOB window runs from 1 January of Y−30 through 1 January of Y−21, inclusive.
              </p>
            </div>
            <div className="rounded-xl border bg-secondary/40 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-pine"><ShieldCheck className="h-4 w-4" />Privacy</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This feature calculates locally in your browser. It does not require CNIC and does not send your DOB to an external eligibility service.
              </p>
            </div>
          </aside>
        </section>

        {result && primaryStatus && (
          <section className="mt-8" aria-live="polite" aria-labelledby="css-eligibility-result-title">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Your CSS Eligibility</p>
                  <h2 id="css-eligibility-result-title" className="mt-1 font-display text-2xl font-bold text-pine">{primaryStatus.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{primaryStatus.detail}</p>
                </div>
                <div className="rounded-lg border bg-white px-3 py-2 text-xs text-muted-foreground">
                  DOB used: <strong className="text-foreground">{formatDateOnlyForDisplay(result.dob)}</strong>
                </div>
              </div>

              {result.relaxationChoice === 'yes' && (
                <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    <strong>Rule 6 calculation selected:</strong> {selectedRule6?.label}. Age relaxation is subject to FPSC Rule 6 and the required documentary proof.
                  </p>
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <ResultMetric label="Age Status" value={primaryStatus.title} helper={`For CE-${result.primary.nextExamYear}`} />
                <ResultMetric label="Final Eligible CSS Exam" value={`CE-${result.primary.lastEligibleExamYear}`} helper="Final year under the age rule used above" />
                <ResultMetric label="Written Attempts Remaining" value={`${result.primary.statutoryAttemptsRemaining} of ${CSS_ELIGIBILITY_RULES.maxWrittenAttempts}`} helper="MPT does not reduce this number" />
                <ResultMetric label="Age-Eligible Opportunities Remaining" value={result.primary.remainingAgeEligibleExamCycles} helper={yearsRemainingCopy(result.primary.remainingAgeEligibleExamCycles)} />
                <ResultMetric label="Maximum Usable Attempts Remaining" value={result.primary.maximumUsableAttemptsRemaining} helper="Limited by both age and the three written chances" />
              </div>

              <div className="mt-5 rounded-xl border bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-pine">CSS Age Window Remaining</h3>
                    <p className="mt-1 text-sm font-semibold text-emerald-900">{yearsRemainingCopy(result.primary.remainingAgeEligibleExamCycles)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground">
                    Final age-eligible examination: CSS CE-{result.primary.lastEligibleExamYear}
                  </div>
                </div>
                {result.primary.futureAgeEligibleExamYears.length > 0 && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Future age-eligible CE years from {currentYear + 1} onward: {result.primary.futureAgeEligibleExamYears.map((year) => `CE-${year}`).join(', ')}. Age eligibility does not mean applications for those years are currently open.
                  </p>
                )}
              </div>

              <div className="mt-5 rounded-xl border bg-white p-4 sm:p-5">
                <h3 className="font-display text-lg font-bold text-pine">Examination-Year Timeline</h3>
                <p className="mt-1 text-xs text-muted-foreground">Each year is checked separately against the FPSC DOB boundaries.</p>
                <Timeline summary={result.primary} dob={result.dob} />
              </div>
            </div>

            {result.relaxedAlternative && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white">
                    <FileCheck2 className="h-4 w-4 text-amber-800" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-bold text-pine">If FPSC Confirms Rule 6 Eligibility</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      This comparison applies a maximum age of 32 only for information. It does not confirm entitlement to relaxation.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ResultMetric label="Final Eligible CSS Exam" value={`CE-${result.relaxedAlternative.lastEligibleExamYear}`} />
                  <ResultMetric label="Age-Eligible Opportunities" value={result.relaxedAlternative.remainingAgeEligibleExamCycles} />
                  <ResultMetric label="Maximum Usable Attempts" value={result.relaxedAlternative.maximumUsableAttemptsRemaining} />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-amber-950">
                  Age relaxation is subject to FPSC Rule 6 and the required documentary proof. The two-year relaxation changes only the upper age limit; it never increases the maximum of three written examination chances.
                </p>
              </div>
            )}

            <details className="mt-5 rounded-xl border bg-white p-4 sm:p-5">
              <summary className="cursor-pointer text-sm font-bold text-pine">How this was calculated</summary>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <p>FPSC determines CSS age eligibility on 31 December of the year preceding the examination. The normal upper-age limit is 30 years. Candidates qualifying under FPSC Rule 6 may receive a two-year upper-age relaxation.</p>
                <p>A maximum of three written examination chances is allowed. Appearing in MPT does not consume one of those three written CSS chances.</p>
                <p>The maximum usable attempts figure is the smaller of your written attempts remaining and your future age-eligible annual CE cycles.</p>
              </div>
            </details>
          </section>
        )}

        <section className="mt-8 rounded-xl border bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
            <div>
              <h2 className="text-sm font-bold text-pine">Official-rule notice</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Calculated according to FPSC CSS Competitive Examination Rules currently implemented by CSS VISTA. Eligibility remains subject to verification by FPSC and any subsequent amendment to the official rules.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={CSS_ELIGIBILITY_RULES.officialRulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold text-emerald-900 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  View FPSC Rules <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="text-xs text-muted-foreground">Rules last verified: 3 October 2026</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
