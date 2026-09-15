import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Link } from 'react-router'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2,
  Circle, ClipboardCheck, GraduationCap, Lightbulb, ListChecks, RotateCcw,
  ShieldAlert, Trophy,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { masterGrammarCourse, type GrammarDay, type PracticeStage } from '@/data/masterGrammarCourse'

type CourseTab = 'lesson' | 'practice' | 'quiz' | 'revision'
interface ProgressState { completed: number[]; scores: Record<string, number> }

const STORAGE_KEY = 'css-vista-master-grammar-progress-v2'
const EMPTY_PROGRESS: ProgressState = { completed: [], scores: {} }
const COURSE_TABS: CourseTab[] = ['lesson', 'practice', 'quiz', 'revision']
const PRACTICE_STAGE_ORDER: PracticeStage[] = [
  'Recognise it', 'Fill in the blank', 'Choose the correct form', 'Correct the sentence', 'Exam-style',
]

function loadProgress(): ProgressState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ProgressState>
    return {
      completed: Array.isArray(parsed.completed)
        ? parsed.completed.filter((item): item is number => typeof item === 'number')
        : [],
      scores: parsed.scores && typeof parsed.scores === 'object'
        ? parsed.scores as Record<string, number>
        : {},
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

function saveProgress(progress: ProgressState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function scrollToTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

function LessonNavigation({
  activeDay,
  completed,
  onSelect,
}: {
  activeDay: number
  completed: number[]
  onSelect: (day: number) => void
}) {
  return (
    <nav aria-label="30-day grammar course lessons" className="space-y-4">
      {[1, 2, 3, 4, 5].map((stage) => {
        const stageDays = masterGrammarCourse.days.filter((day) => day.stage === stage)
        if (!stageDays.length) return null
        return (
          <div key={stage}>
            <p className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
              Stage {stage} · {stageDays[0].stageTitle}
            </p>
            <div className="mt-1.5 space-y-1">
              {stageDays.map((day) => {
                const selected = day.day === activeDay
                const done = completed.includes(day.day)
                return (
                  <button
                    key={day.day}
                    type="button"
                    onClick={() => onSelect(day.day)}
                    className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${selected ? 'bg-pine font-semibold text-white' : 'hover:bg-emerald-50'}`}
                  >
                    {done
                      ? <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-amber-300' : 'text-emerald-700'}`} />
                      : <Circle className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-emerald-100' : 'text-muted-foreground'}`} />}
                    <span>
                      <span className={`block text-[10px] uppercase tracking-wide ${selected ? 'text-emerald-100' : 'text-muted-foreground'}`}>Day {day.day}</span>
                      <span className="block leading-snug">{day.title}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function FlowStrip({ current }: { current: CourseTab }) {
  const steps: Array<{ tab: CourseTab; number: string; label: string }> = [
    { tab: 'lesson', number: '1', label: 'Learn' },
    { tab: 'lesson', number: '2', label: 'Examples' },
    { tab: 'practice', number: '3', label: 'Practice' },
    { tab: 'quiz', number: '4', label: 'Test' },
  ]
  return (
    <div className="mt-5 grid grid-cols-4 gap-2" aria-label="Daily lesson flow">
      {steps.map((step) => {
        const active = step.tab === current
        return (
          <div key={`${step.number}-${step.label}`} className={`rounded-lg border px-2 py-2 text-center ${active ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'bg-white text-muted-foreground'}`}>
            <span className="block text-[10px] font-bold uppercase tracking-wide">Step {step.number}</span>
            <span className="mt-0.5 block text-xs font-semibold">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function RuleCard({ index, rule }: { index: number; rule: GrammarDay['rules'][number] }) {
  return (
    <article className="rounded-xl border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Rule {index + 1}</p>
      <h4 className="mt-1 font-bold text-emerald-950">{rule.rule}</h4>
      <p className="mt-2 text-sm leading-6">{rule.explanation}</p>
      <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Correct</p>
        <p className="mt-1 text-sm leading-6 text-emerald-950">{rule.correct}</p>
      </div>
      {rule.wrong && (
        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Wrong</p>
          <p className="mt-1 text-sm leading-6 text-rose-950">{rule.wrong}</p>
          {rule.correction && <p className="mt-2 text-xs leading-6 text-rose-900/80">{rule.correction}</p>}
        </div>
      )}
    </article>
  )
}

function TenseCard({ tense }: { tense: NonNullable<GrammarDay['tenses']>[number] }) {
  return (
    <article className="rounded-xl border p-4">
      <h4 className="font-display font-bold text-pine">{tense.name}</h4>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700">When we use it</p>
      <ul className="mt-1 list-inside list-disc text-sm leading-6">
        {tense.use.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Structure</p>
          <p className="mt-1 leading-6">{tense.structure}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Positive</p>
          <p className="mt-1 leading-6">{tense.positive}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Negative</p>
          <p className="mt-1 leading-6">{tense.negative}</p>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Question</p>
        <p className="mt-1 leading-6">{tense.question}</p>
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Examples</p>
        <ul className="mt-1 space-y-1 text-sm leading-6">
          {tense.examples.map((example) => <li key={example}>{example}</li>)}
        </ul>
      </div>
      {tense.signalWords && tense.signalWords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tense.signalWords.map((word) => (
            <span key={word} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">{word}</span>
          ))}
        </div>
      )}
      {tense.commonMistake && (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Common mistake</p>
          <p className="mt-1 leading-6"><span className="text-rose-700 line-through">{tense.commonMistake.wrong}</span></p>
          <p className="leading-6 text-emerald-900">{tense.commonMistake.right}</p>
          <p className="mt-1 text-xs leading-6 text-amber-900/80">{tense.commonMistake.why}</p>
        </div>
      )}
      {tense.note && <p className="mt-3 text-xs leading-6 text-muted-foreground">{tense.note}</p>}
    </article>
  )
}

export default function MasterGrammarCourse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeDayNumber, setActiveDayNumber] = useState(() => {
    const requested = Number.parseInt(searchParams.get('day') ?? '', 10)
    return Number.isFinite(requested) && requested >= 1 && requested <= 30 ? requested : 1
  })
  const [tab, setTab] = useState<CourseTab>(() => {
    const requested = searchParams.get('ctab') as CourseTab | null
    return requested && COURSE_TABS.includes(requested) ? requested : 'lesson'
  })
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS)
  const [revealedPractice, setRevealedPractice] = useState<number[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  useEffect(() => setProgress(loadProgress()), [])

  const activeDay = masterGrammarCourse.days.find((day) => day.day === activeDayNumber) ?? masterGrammarCourse.days[0]
  const quiz = activeDay.quiz
  const avgQuizLength = useMemo(() => Math.round(
    masterGrammarCourse.days.reduce((sum, day) => sum + day.quiz.length, 0) / masterGrammarCourse.days.length,
  ), [])
  const completionPercent = Math.round((progress.completed.length / masterGrammarCourse.days.length) * 100)
  const quizAnswered = quiz.filter((_, index) => quizAnswers[index] !== undefined).length
  const quizScore = quiz.reduce((score, question, index) => score + (quizAnswers[index] === question.correct ? 1 : 0), 0)
  const savedScore = progress.scores[String(activeDay.day)]
  const practiceGroups = new Map<PracticeStage, Array<GrammarDay['practice'][number]>>()
  for (const item of activeDay.practice) {
    if (!practiceGroups.has(item.stage)) practiceGroups.set(item.stage, [])
    practiceGroups.get(item.stage)!.push(item)
  }
  const practiceByStage = PRACTICE_STAGE_ORDER
    .map((stage) => ({ stage, items: practiceGroups.get(stage) ?? [] }))
    .filter((group) => group.items.length > 0)

  function selectDay(day: number) {
    setActiveDayNumber(day)
    setTab('lesson')
    setRevealedPractice([])
    setQuizAnswers({})
    setQuizSubmitted(false)
    scrollToTop()
  }

  function changeTab(next: CourseTab) {
    setTab(next)
    scrollToTop()
  }

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('day', String(activeDayNumber))
    if (tab === 'lesson') next.delete('ctab')
    else next.set('ctab', tab)
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [activeDayNumber, tab, searchParams, setSearchParams])

  function updateProgress(next: ProgressState) {
    setProgress(next)
    saveProgress(next)
  }

  function toggleComplete() {
    const completed = progress.completed.includes(activeDay.day)
      ? progress.completed.filter((day) => day !== activeDay.day)
      : [...progress.completed, activeDay.day].sort((a, b) => a - b)
    updateProgress({ ...progress, completed })
  }

  function submitQuiz() {
    if (quizAnswered !== quiz.length) return
    updateProgress({ ...progress, scores: { ...progress.scores, [String(activeDay.day)]: quizScore } })
    setQuizSubmitted(true)
  }

  return (
    <div>
      <PageHeader
        title="30-Day English Grammar Course"
        description="One clear lesson a day: learn the rule, see examples, practise it, take a short test, and move on."
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white shadow-sm">
          <div className="grid gap-7 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-300">
                <GraduationCap className="h-4 w-4" /> English Grammar · 30-day plan
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{masterGrammarCourse.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50 sm:text-base">
                {masterGrammarCourse.subtitle} Every day follows the same routine, so you always know what to do next.
              </p>
              <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['30', 'daily lessons'],
                  ['5', 'learning stages'],
                  [`~${avgQuizLength}`, 'test questions/day'],
                  ['✓', 'progress saved'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3">
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-[11px] text-emerald-100">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-center rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Your progress</p>
                <span className="text-sm font-bold text-amber-300">{completionPercent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-amber-300" style={{ width: `${completionPercent}%` }} />
              </div>
              <p className="mt-2 text-xs text-emerald-100">{progress.completed.length} of 30 days completed on this device.</p>
              <Link to="/language-grammar?lang=english" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold hover:text-amber-200">
                <ArrowLeft className="h-4 w-4" /> English grammar reference
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 lg:hidden">
          <label className="text-xs font-bold uppercase tracking-wide text-emerald-800" htmlFor="course-day-select">Choose a day</label>
          <select
            id="course-day-select"
            value={activeDay.day}
            onChange={(event) => selectDay(Number(event.target.value))}
            className="mt-2 h-12 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-pine"
          >
            {masterGrammarCourse.days.map((day) => <option key={day.day} value={day.day}>Day {day.day}: {day.title}</option>)}
          </select>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[285px_minmax(0,1fr)]">
          <aside className="hidden self-start rounded-xl border bg-white p-3 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <LessonNavigation activeDay={activeDay.day} completed={progress.completed} onSelect={selectDay} />
          </aside>

          <div className="min-w-0">
            <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                    Stage {activeDay.stage} · {activeDay.stageTitle}
                    {activeDay.isReview && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Review day</span>
                    )}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-pine sm:text-3xl">Day {activeDay.day}: {activeDay.title}</h2>
                  <div className="mt-3 max-w-3xl rounded-lg bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-950">
                    <strong>What you will learn:</strong> {activeDay.whatYouWillLearn}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleComplete}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${progress.completed.includes(activeDay.day) ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'bg-white text-pine hover:bg-emerald-50'}`}
                >
                  {progress.completed.includes(activeDay.day) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  {progress.completed.includes(activeDay.day) ? 'Completed' : 'Mark complete'}
                </button>
              </div>

              <FlowStrip current={tab} />

              <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
                {([
                  ['lesson', 'Lesson', BookOpen],
                  ['practice', 'Practice', ListChecks],
                  ['quiz', 'Daily test', ClipboardCheck],
                  ['revision', 'Course resources', CheckCircle2],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => changeTab(value)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === value ? 'bg-pine text-white' : 'border bg-white text-pine hover:bg-emerald-50'}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </section>

            {tab === 'lesson' && (
              <div className="mt-4 space-y-4">
                <section className="rounded-2xl border bg-white p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 font-display text-xl font-bold text-pine">
                    <BookOpen className="h-5 w-5 text-emerald-800" /> 1. Simple explanation
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Read this once slowly. Do not try to memorise every line yet.</p>
                  <div className="mt-4 space-y-3">
                    {activeDay.simpleExplanation.map((paragraph, index) => (
                      <p key={index} className="text-sm leading-7">{paragraph}</p>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border bg-white p-5 sm:p-6">
                  <h3 className="font-display text-xl font-bold text-pine">2. Core rules</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Each rule shows a correct example, and a common wrong version where useful.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {activeDay.rules.map((rule, index) => <RuleCard key={rule.rule} index={index} rule={rule} />)}
                  </div>
                </section>

                {activeDay.tenses && activeDay.tenses.length > 0 && (
                  <section className="rounded-2xl border bg-white p-5 sm:p-6">
                    <h3 className="font-display text-xl font-bold text-pine">Tense by tense</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Use, structure, positive, negative, and question forms for each tense.</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {activeDay.tenses.map((tense) => <TenseCard key={tense.name} tense={tense} />)}
                    </div>
                  </section>
                )}

                {activeDay.comparison && (
                  <section className="rounded-2xl border bg-white p-5 sm:p-6">
                    <h3 className="font-display text-lg font-bold text-pine">{activeDay.comparison.title}</h3>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{activeDay.comparison.columnA}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{activeDay.comparison.columnB}</p>
                      {activeDay.comparison.rows.map(([left, right]) => (
                        <Fragment key={left}>
                          <p className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm leading-6">{left}</p>
                          <p className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm leading-6">{right}</p>
                        </Fragment>
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border bg-white p-5 sm:p-6">
                  <h3 className="font-display text-xl font-bold text-pine">3. Examples, easy to advanced</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Easy examples</p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6">
                        {activeDay.easyExamples.map((example) => <li key={example}>{example}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Practical examples</p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6">
                        {activeDay.practicalExamples.map((example) => <li key={example}>{example}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Exam-style examples</p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6">
                        {activeDay.examExamples.map((example) => <li key={example}>{example}</li>)}
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                  <h3 className="flex items-center gap-2 font-bold text-amber-950"><ShieldAlert className="h-4 w-4" /> Common mistakes</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {activeDay.commonMistakes.map((mistake) => (
                      <div key={mistake.wrong} className="rounded-lg border border-amber-200 bg-white p-3">
                        <p className="text-sm leading-6 text-rose-700 line-through">{mistake.wrong}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-emerald-900">{mistake.right}</p>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">{mistake.why}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                  <h3 className="flex items-center gap-2 font-bold text-emerald-950"><Lightbulb className="h-4 w-4" /> Quick memory tip</h3>
                  <p className="mt-2 text-sm leading-7 text-emerald-950/80">{activeDay.memoryTip}</p>
                </section>

                <section className="rounded-2xl border bg-white p-5">
                  <h3 className="font-display text-lg font-bold text-pine">Quick revision</h3>
                  <ul className="mt-3 space-y-2">
                    {activeDay.quickRevision.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => changeTab('practice')}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Continue to practice <ArrowRight className="h-4 w-4" />
                  </button>
                </section>
              </div>
            )}

            {tab === 'practice' && (
              <section className="mt-4 rounded-2xl border bg-white p-5 sm:p-6">
                <h3 className="font-display text-xl font-bold text-pine">3. Practise it yourself</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">Try each item yourself before opening the answer. The exercises move from easy to more difficult.</p>
                <div className="mt-5 space-y-6">
                  {practiceByStage.map((group) => (
                    <div key={group.stage}>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{group.stage}</p>
                      <div className="mt-2 space-y-3">
                        {group.items.map((item) => {
                          const globalIndex = activeDay.practice.indexOf(item)
                          const shown = revealedPractice.includes(globalIndex)
                          return (
                            <article key={globalIndex} className="rounded-xl border p-4">
                              <div className="flex gap-3">
                                <span className="min-w-8 rounded-md bg-secondary px-2 py-1 text-center text-xs font-bold text-pine">{globalIndex + 1}</span>
                                <div className="flex-1">
                                  <p className="text-sm leading-7">{item.prompt}</p>
                                  <button
                                    type="button"
                                    onClick={() => setRevealedPractice((current) => current.includes(globalIndex) ? current.filter((number) => number !== globalIndex) : [...current, globalIndex])}
                                    className="mt-3 text-xs font-bold text-emerald-800 hover:underline"
                                  >
                                    {shown ? 'Hide answer' : 'Show answer'}
                                  </button>
                                  {shown && (
                                    <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-3 text-sm leading-7 text-emerald-950">
                                      <p className="font-semibold">{item.answer}</p>
                                      <p className="mt-1.5 text-emerald-950/80">Why: {item.reason}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => changeTab('quiz')}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-bold text-white"
                >
                  Continue to daily test <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            )}

            {tab === 'quiz' && (
              <section className="mt-4 rounded-2xl border bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-bold text-pine">4. Test yourself</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{quiz.length} questions from the rules and exercises you have just studied.</p>
                  </div>
                  {savedScore !== undefined && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">
                      Latest score: {savedScore}/{quiz.length}
                    </span>
                  )}
                </div>

                <div className="mt-6 space-y-5">
                  {quiz.map((question, questionIndex) => (
                    <article key={questionIndex} className="rounded-xl border p-4">
                      <p className="text-sm font-semibold leading-7">{questionIndex + 1}. {question.question}</p>
                      <div className="mt-3 grid gap-2">
                        {question.options.map((option, optionIndex) => {
                          const selected = quizAnswers[questionIndex] === optionIndex
                          const correct = optionIndex === question.correct
                          const className = quizSubmitted
                            ? correct
                              ? 'border-emerald-600 bg-emerald-50'
                              : selected
                                ? 'border-rose-500 bg-rose-50'
                                : 'bg-white'
                            : selected
                              ? 'border-emerald-700 bg-emerald-50'
                              : 'bg-white hover:bg-secondary/40'
                          return (
                            <button
                              key={optionIndex}
                              type="button"
                              disabled={quizSubmitted}
                              onClick={() => setQuizAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                              className={`rounded-lg border px-3 py-3 text-left text-sm leading-6 ${className}`}
                            >
                              <span className="mr-2 font-bold text-emerald-800">{String.fromCharCode(65 + optionIndex)}.</span>
                              {option}
                            </button>
                          )
                        })}
                      </div>
                      {quizSubmitted && (
                        <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs leading-6 text-muted-foreground">
                          {question.explanation}
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {!quizSubmitted ? (
                    <button
                      type="button"
                      disabled={quiz.length === 0 || quizAnswered !== quiz.length}
                      onClick={submitQuiz}
                      className="inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                    >
                      <ClipboardCheck className="h-4 w-4" /> Submit test ({quizAnswered}/{quiz.length})
                    </button>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-950">
                        <Trophy className="h-4 w-4" /> Score: {quizScore}/{quiz.length}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setQuizAnswers({}); setQuizSubmitted(false) }}
                        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold text-pine"
                      >
                        <RotateCcw className="h-4 w-4" /> Try again
                      </button>
                      {!progress.completed.includes(activeDay.day) && (
                        <button
                          type="button"
                          onClick={toggleComplete}
                          className="inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-bold text-white"
                        >
                          <Check className="h-4 w-4" /> Mark Day {activeDay.day} complete
                        </button>
                      )}
                    </>
                  )}
                </div>

                {quizSubmitted && activeDay.scoringGuidance && activeDay.scoringGuidance.length > 0 && (
                  <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <h4 className="font-display text-sm font-bold text-pine">How to read your score</h4>
                    <ul className="mt-2 space-y-1.5">
                      {activeDay.scoringGuidance.map((line) => (
                        <li key={line} className="text-xs leading-6 text-emerald-950/80">{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {tab === 'revision' && (
              <div className="mt-4 space-y-4">
                <section className="rounded-2xl border bg-white p-5 sm:p-6">
                  <h3 className="font-display text-xl font-bold text-pine">Useful formal alternatives</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Use these when they are clearer and more precise; do not replace a simple word just to sound formal.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {masterGrammarCourse.resources.formalReplacements.map(([from, to]) => (
                      <div key={from} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
                        <span>{from}</span><ArrowRight className="h-4 w-4 text-emerald-700" /><strong className="text-emerald-900">{to}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border bg-white p-5 sm:p-6">
                  <h3 className="font-display text-xl font-bold text-pine">Commonly confused words</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {masterGrammarCourse.resources.confusedWords.map(([first, firstMeaning, second, secondMeaning]) => (
                      <div key={`${first}-${second}`} className="rounded-xl border p-4 text-sm">
                        <p><strong className="text-emerald-900">{first}</strong> — {firstMeaning}</p>
                        <p className="mt-2"><strong className="text-emerald-900">{second}</strong> — {secondMeaning}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-5">
                    <h3 className="font-display text-lg font-bold text-pine">Prepositions and collocations</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {masterGrammarCourse.resources.collocations.map((item) => (
                        <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-white p-5">
                    <h3 className="font-display text-lg font-bold text-pine">Irregular verbs</h3>
                    <div className="mt-4 space-y-2">
                      {masterGrammarCourse.resources.irregularVerbs.map(([base, past, participle]) => (
                        <div key={base} className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                          <strong>{base}</strong><span>{past}</span><span>{participle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <h3 className="font-display text-lg font-bold text-pine">After Day 30</h3>
                  <ul className="mt-3 space-y-2">
                    {masterGrammarCourse.resources.maintenance.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <button
                type="button"
                disabled={activeDay.day <= 1}
                onClick={() => selectDay(activeDay.day - 1)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-pine disabled:opacity-35"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                onClick={toggleComplete}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${progress.completed.includes(activeDay.day) ? 'bg-emerald-100 text-emerald-900' : 'bg-pine text-white'}`}
              >
                {progress.completed.includes(activeDay.day) ? <CheckCircle2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {progress.completed.includes(activeDay.day) ? 'Day completed' : 'Complete day'}
              </button>
              <button
                type="button"
                disabled={activeDay.day >= 30}
                onClick={() => selectDay(activeDay.day + 1)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-pine disabled:opacity-35"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
