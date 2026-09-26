import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck,
  ClipboardCheck, Clock3, Eye, FileText, GraduationCap, Layers, Lightbulb, ListChecks,
  NotebookPen, PenLine, RotateCcw, Sparkles, Target, TriangleAlert, Wrench,
} from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { addMistake, recordActivity } from '@/lib/progress'
import {
  GRAMMAR_PHASES, grammarCorrectionCount, grammarExampleCount, grammarLessonForDay,
  grammarLessons, grammarPhaseColors, grammarQuestionCount, grammarToolkit,
  type GrammarLesson, type GrammarQuestion,
} from '@/data/grammarCourse'

type CourseState = {
  completed: number[]
  scores: Record<string, number>
  mistakes: string[]
  notes: Record<string, string>
  currentDay: number
}

type View = 'course' | 'toolkit' | 'notebook'

const STATE_KEY = 'cssvista:grammar-course:v3'
const EMPTY_STATE: CourseState = { completed: [], scores: {}, mistakes: [], notes: {}, currentDay: 1 }

const KIND_LABEL: Record<GrammarQuestion['kind'], string> = {
  choice: 'Choose the correct sentence',
  gap: 'Complete the sentence',
  spot: 'Find the error',
}

function readState(): CourseState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw) as Partial<CourseState>
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      scores: parsed.scores ?? {},
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      notes: parsed.notes ?? {},
      currentDay: parsed.currentDay ?? 1,
    }
  } catch {
    return EMPTY_STATE
  }
}

function saveState(state: CourseState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)) } catch { /* private browsing */ }
}

/** Every authored question in the course, indexed by id, for the mistake notebook. */
const questionIndex = new Map<string, { question: GrammarQuestion; lesson: GrammarLesson }>()
for (const lesson of grammarLessons) {
  for (const question of [...lesson.warmUp, ...lesson.drill]) {
    questionIndex.set(question.id, { question, lesson })
  }
}

function StepHeading({ step, title, hint, icon: Icon }: {
  step: number
  title: string
  hint: string
  icon: typeof Lightbulb
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-pine">
          <Icon className="h-4 w-4 text-amber-600" aria-hidden="true" /> {title}
        </h3>
        <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

function QuestionCard({ question, index, answer, onAnswer, onRetry }: {
  question: GrammarQuestion
  index: number
  answer: number | undefined
  onAnswer: (option: number) => void
  onRetry: () => void
}) {
  const answered = answer !== undefined
  const correct = answer === question.answer
  const isSpot = question.kind === 'spot'
  return (
    <li className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-pine">{index + 1}</span>
        <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-pine">{KIND_LABEL[question.kind]}</span>
      </div>
      <p className="mt-3 text-[15px] font-medium leading-7 text-foreground">{question.prompt}</p>
      <div className={`mt-3 grid gap-2 ${isSpot ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
        {question.options.map((option, optionIndex) => {
          const isAnswer = optionIndex === question.answer
          const isChosen = optionIndex === answer
          const tone = !answered
            ? 'border-input hover:border-emerald-600 hover:bg-emerald-50'
            : isAnswer
              ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
              : isChosen
                ? 'border-red-400 bg-red-50 text-red-950'
                : 'border-input opacity-60'
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(optionIndex)}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-6 transition-colors ${isSpot ? 'justify-center font-bold' : 'text-left'} ${tone}`}
            >
              {!isSpot && <span className="mt-0.5 text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + optionIndex)}</span>}
              <span>{isSpot ? `Part ${option}` : option}</span>
            </button>
          )
        })}
      </div>
      {answered && (
        <div className={`mt-3 rounded-lg px-3 py-2.5 text-sm leading-6 ${correct ? 'bg-emerald-50 text-emerald-950' : 'bg-amber-50 text-amber-950'}`}>
          <p className="font-semibold">
            {correct
              ? 'Correct.'
              : isSpot
                ? `Not quite — the error is in part ${question.options[question.answer]}.`
                : `Not quite — the answer is ${String.fromCharCode(65 + question.answer)}.`}
          </p>
          <p className="mt-1">{question.why}</p>
          {!correct && (
            <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pine underline underline-offset-2">
              <RotateCcw className="h-3.5 w-3.5" /> Clear and try this one again
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function CorrectionCard({ id, index, task, model, note, draft, onDraft }: {
  id: string
  index: number
  task: string
  model: string
  note: string
  draft: string
  onDraft: (value: string) => void
}) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => { setRevealed(false) }, [id])
  return (
    <li className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-pine">{index + 1}</span>
        <p className="text-[15px] leading-7 text-red-950">{task}</p>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Write your corrected sentence</span>
        <textarea
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          rows={2}
          placeholder="Type the sentence as you would write it in the paper…"
          className="mt-1.5 w-full rounded-lg border bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      {revealed ? (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-950">
          <p><span className="font-semibold">Model answer: </span>{model}</p>
          <p className="mt-1 text-emerald-900">{note}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-pine/25 px-3 text-xs font-semibold text-pine hover:bg-secondary"
        >
          <Eye className="h-3.5 w-3.5" /> Show the model answer
        </button>
      )}
    </li>
  )
}

export default function GrammarCourse() {
  const [state, setState] = useState<CourseState>(() => readState())
  const [day, setDay] = useState(() => readState().currentDay)
  const [view, setView] = useState<View>('course')
  const [warmUpAnswers, setWarmUpAnswers] = useState<Record<string, number>>({})
  const [drillAnswers, setDrillAnswers] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const lesson = grammarLessonForDay(day)
  const completed = useMemo(() => new Set(state.completed), [state.completed])
  const progressPercent = Math.round((completed.size / grammarLessons.length) * 100)

  const drillAnswered = lesson.drill.filter((question) => drillAnswers[question.id] !== undefined).length
  const drillScore = lesson.drill.reduce(
    (total, question) => total + (drillAnswers[question.id] === question.answer ? 1 : 0), 0,
  )
  const warmUpScore = lesson.warmUp.reduce(
    (total, question) => total + (warmUpAnswers[question.id] === question.answer ? 1 : 0), 0,
  )

  const notebook = useMemo(() => {
    const seen = new Set<string>()
    return state.mistakes
      .map((id) => questionIndex.get(id))
      .filter((entry): entry is { question: GrammarQuestion; lesson: GrammarLesson } => {
        if (!entry || seen.has(entry.question.id)) return false
        seen.add(entry.question.id)
        return true
      })
  }, [state.mistakes])

  useEffect(() => {
    recordActivity({ type: 'study-tool', label: `Grammar course · Day ${lesson.day}: ${lesson.title}`, path: '/grammar-course' })
  }, [lesson.day, lesson.title])

  useEffect(() => {
    setWarmUpAnswers({})
    setDrillAnswers({})
    setDrafts({})
    setNotes(readState().notes[String(day)] ?? '')
  }, [day])

  function chooseDay(next: number) {
    const target = Math.min(grammarLessons.length, Math.max(1, next))
    setView('course')
    setDay(target)
    setState((current) => {
      const updated = { ...current, currentDay: target }
      saveState(updated)
      return updated
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function recordAnswer(question: GrammarQuestion, option: number, group: 'warmUp' | 'drill') {
    const setter = group === 'warmUp' ? setWarmUpAnswers : setDrillAnswers
    setter((current) => ({ ...current, [question.id]: option }))
    if (option === question.answer) return
    setState((current) => {
      if (current.mistakes.includes(question.id)) return current
      const updated = { ...current, mistakes: [...current.mistakes, question.id] }
      saveState(updated)
      return updated
    })
    addMistake(question.id, option, `Grammar · Day ${lesson.day}: ${lesson.title}`)
  }

  function retry(question: GrammarQuestion, group: 'warmUp' | 'drill') {
    const setter = group === 'warmUp' ? setWarmUpAnswers : setDrillAnswers
    setter((current) => {
      const next = { ...current }
      delete next[question.id]
      return next
    })
  }

  function resetDrill() {
    setDrillAnswers({})
  }

  function completeDay() {
    const percent = lesson.drill.length ? Math.round((drillScore / lesson.drill.length) * 100) : 0
    const best = Math.max(percent, state.scores[String(day)] ?? 0)
    const next: CourseState = {
      ...state,
      completed: completed.has(day) ? state.completed : [...state.completed, day].sort((a, b) => a - b),
      scores: { ...state.scores, [String(day)]: best },
      notes: { ...state.notes, [String(day)]: notes },
      currentDay: day,
    }
    setState(next)
    saveState(next)
  }

  function clearNotebook() {
    const next = { ...state, mistakes: [] }
    setState(next)
    saveState(next)
  }

  function saveNotes(value: string) {
    setNotes(value)
    setState((current) => {
      const updated = { ...current, notes: { ...current.notes, [String(day)]: value } }
      saveState(updated)
      return updated
    })
  }

  const bestScore = state.scores[String(day)]

  return (
    <div>
      <PageHeader
        title="30-Day Grammar Course"
        description="Start from zero and finish able to write accurate, formal English. Each day explains one skill in plain language, shows worked examples, gives you a warm-up, a ten-question drill and five sentence corrections, and ends with a short piece of writing of your own."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setView('toolkit')} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-pine/25 bg-white px-3 text-xs font-semibold text-pine hover:bg-secondary"><Wrench className="h-3.5 w-3.5" /> Grammar toolkit</button>
          <Link to="/grammar-vocabulary" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-pine/25 bg-white px-3 text-xs font-semibold text-pine hover:bg-secondary"><BookOpen className="h-3.5 w-3.5" /> Vocabulary practice</Link>
          <Link to="/books" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-pine/25 bg-white px-3 text-xs font-semibold text-pine hover:bg-secondary"><FileText className="h-3.5 w-3.5" /> Handbook PDFs</Link>
        </div>
      </PageHeader>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <section className="rounded-2xl border bg-pine p-5 text-emerald-50 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Learn the rule · see it work · use it · keep it</p>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Grammar you can actually apply in the paper</h2>
              <p className="mt-3 text-sm leading-7 text-emerald-100">
                Nothing here is borrowed from a general question bank. Every example and every exercise was written
                for the lesson it sits under, so the practice on subject–verb agreement is subject–verb agreement and
                nothing else. Work one day at a time, in order.
              </p>
            </div>
            <div className="min-w-[230px]">
              <div className="flex items-center justify-between text-xs text-emerald-100">
                <span>Your progress</span>
                <span className="font-bold text-white">{completed.size}/{grammarLessons.length} days</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-2 text-xs text-emerald-200">{progressPercent}% complete · currently on Day {day}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-2 border-t border-white/15 pt-4 text-xs text-emerald-100 sm:grid-cols-2 lg:grid-cols-4">
            <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-300" /> 45–60 minutes a day</span>
            <span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-amber-300" /> {grammarQuestionCount} lesson-specific questions</span>
            <span className="inline-flex items-center gap-2"><PenLine className="h-4 w-4 text-amber-300" /> {grammarCorrectionCount} sentence corrections</span>
            <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300" /> {grammarExampleCount} worked examples</span>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 border-b pb-3">
          {([
            { key: 'course' as const, label: 'Today’s lesson', icon: GraduationCap },
            { key: 'toolkit' as const, label: 'Grammar toolkit', icon: Wrench },
            { key: 'notebook' as const, label: `Mistake notebook (${notebook.length})`, icon: CircleAlert },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${view === tab.key ? 'bg-pine text-white' : 'bg-secondary text-pine hover:bg-emerald-100'}`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {view === 'toolkit' && (
          <section className="mt-6 space-y-6">
            <div className="rounded-xl border bg-white p-5 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-pine"><Wrench className="h-5 w-5 text-amber-600" /> Grammar toolkit</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                Reference tables you will need again and again. Open this tab whenever a lesson asks you to check a
                form, then go straight back to the drill.
              </p>
            </div>
            {grammarToolkit.map((table) => (
              <div key={table.id} className="rounded-xl border bg-white p-5 sm:p-7">
                <h3 className="font-display text-lg font-bold text-pine">{table.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{table.note}</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-secondary/60 text-left">
                        {table.columns.map((column, columnIndex) => (
                          <th key={`${column}-${columnIndex}`} className="border-b px-3 py-2 font-semibold text-pine">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rowIndex) => (
                        <tr key={`${row.join('|')}-${rowIndex}`} className="even:bg-secondary/20">
                          {row.map((cell, cellIndex) => (
                            <td key={`${cell}-${cellIndex}`} className="border-b px-3 py-2 leading-6 align-top">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {view === 'notebook' && (
          <section className="mt-6 rounded-xl border bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <h2 className="font-display text-xl font-bold text-pine">Your mistake notebook</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Every question you answered wrongly is kept here with its rule. Read the explanation, then return
                    to that day and attempt the drill again.
                  </p>
                </div>
              </div>
              {notebook.length > 0 && (
                <button type="button" onClick={clearNotebook} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-pine hover:bg-secondary">
                  <RotateCcw className="h-3.5 w-3.5" /> Clear notebook
                </button>
              )}
            </div>
            {notebook.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed bg-secondary/40 px-5 py-10 text-center text-sm text-muted-foreground">
                Your notebook is empty. Attempt a drill, and anything you miss will be collected here.
              </div>
            ) : (
              <ul className="mt-6 grid gap-3">
                {notebook.map(({ question, lesson: source }) => (
                  <li key={question.id} className="rounded-lg border bg-secondary/25 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${grammarPhaseColors[source.phase] ?? 'bg-secondary text-pine'}`}>Day {source.day} · {source.title}</span>
                      <button type="button" onClick={() => chooseDay(source.day)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-pine underline underline-offset-2">
                        Open that lesson <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-foreground">{question.prompt}</p>
                    <p className="mt-2 text-sm leading-6">
                      <span className="font-semibold text-emerald-800">Correct answer: </span>
                      {question.kind === 'spot' ? `part ${question.options[question.answer]}` : question.options[question.answer]}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{question.why}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {view === 'course' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="self-start rounded-xl border bg-white p-3 lg:sticky lg:top-24">
              <div className="flex items-center justify-between px-2 py-1">
                <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-pine"><Layers className="h-4 w-4 text-amber-600" /> Course map</h2>
                <Badge>{completed.size}/{grammarLessons.length}</Badge>
              </div>
              <div className="mt-3 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                {GRAMMAR_PHASES.map((phase) => (
                  <div key={phase.name}>
                    <p className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${grammarPhaseColors[phase.name] ?? 'bg-secondary text-pine'}`}>
                      Days {phase.days[0]}–{phase.days[1]} · {phase.name}
                    </p>
                    <p className="px-2 pt-1 text-[11px] leading-5 text-muted-foreground">{phase.summary}</p>
                    <div className="mt-1.5 space-y-1">
                      {grammarLessons
                        .filter((item) => item.day >= phase.days[0] && item.day <= phase.days[1])
                        .map((item) => {
                          const done = completed.has(item.day)
                          const selected = item.day === day
                          return (
                            <button
                              key={item.day}
                              type="button"
                              onClick={() => chooseDay(item.day)}
                              aria-current={selected ? 'true' : undefined}
                              className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${selected ? 'bg-pine text-white' : 'hover:bg-secondary'}`}
                            >
                              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-400 text-emerald-950' : selected ? 'bg-white/20 text-white' : 'bg-secondary text-pine'}`}>
                                {done ? <Check className="h-3.5 w-3.5" /> : item.day}
                              </span>
                              <span className="min-w-0 text-xs font-semibold leading-5">{item.title}</span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="min-w-0 space-y-6">
              <article className="rounded-xl border bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${grammarPhaseColors[lesson.phase] ?? 'bg-secondary text-pine'}`}>Day {lesson.day} of 30 · {lesson.phase}</span>
                    {completed.has(lesson.day) && <Badge>Completed</Badge>}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" /> about {lesson.minutes} minutes
                    {bestScore !== undefined && <span className="ml-2 font-semibold text-emerald-800">Best drill score {bestScore}%</span>}
                  </span>
                </div>

                <h2 className="mt-4 font-display text-2xl font-bold text-pine sm:text-3xl">{lesson.title}</h2>
                <p className="mt-3 text-base font-medium leading-7 text-foreground">{lesson.goal}</p>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Why this matters in the paper</p>
                    <p className="mt-1.5 text-sm leading-7 text-emerald-950">{lesson.why}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">How to work this day</p>
                    <ol className="mt-2 space-y-1 text-xs leading-6 text-amber-950">
                      <li>1. Read the rules slowly, once.</li>
                      <li>2. Cover the right-hand column of the examples and predict.</li>
                      <li>3. Do the warm-up; if you miss one, reread that rule.</li>
                      <li>4. Attempt the whole drill before checking anything.</li>
                      <li>5. Write the five corrections out by hand.</li>
                      <li>6. Finish with the writing task in your own words.</li>
                    </ol>
                  </div>
                </div>

                {lesson.terms.length > 0 && (
                  <div className="mt-6 rounded-xl border bg-secondary/30 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800"><BookOpen className="h-4 w-4" /> Words you will need today</h3>
                    <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {lesson.terms.map((term) => (
                        <div key={term.term} className="rounded-lg bg-white p-3">
                          <dt className="text-sm font-semibold text-pine">{term.term}</dt>
                          <dd className="mt-0.5 text-sm leading-6 text-muted-foreground">{term.meaning}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </article>

              <article className="rounded-xl border bg-white p-5 sm:p-7">
                <StepHeading step={1} icon={Lightbulb} title="Learn the rules" hint="Read each explanation together with the example placed immediately beside the point it illustrates." />
                <div className="mt-5 space-y-5">
                  {lesson.rules.map((rule, ruleIndex) => (
                    <div key={rule.heading} className="rounded-xl border p-4 sm:p-5">
                      <h4 className="font-display text-base font-bold text-pine">{ruleIndex + 1}. {rule.heading}</h4>
                      <p className="mt-2 text-[15px] leading-8 text-foreground">{rule.plain}</p>
                      {rule.models[0] && (
                        <div className="mt-2.5 rounded-lg border-l-4 border-emerald-500 bg-emerald-50/60 px-3.5 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Example</p>
                          <p className="mt-0.5 text-sm font-semibold leading-7 text-emerald-950">{rule.models[0].sentence}</p>
                          <p className="mt-0.5 text-xs leading-6 text-emerald-900">
                            <span className="font-semibold">Why: </span>{rule.models[0].note}
                          </p>
                        </div>
                      )}
                      <ul className="mt-3 space-y-3">
                        {rule.points.map((point, pointIndex) => {
                          const model = rule.models[pointIndex + 1]
                          return (
                            <li key={point} className="rounded-lg bg-secondary/20 px-3 py-2.5">
                              <div className="flex items-start gap-2 text-sm leading-7">
                                <CircleCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                                <span>{point}</span>
                              </div>
                              {model && (
                                <div className="ml-5 mt-2 border-l-2 border-emerald-400 pl-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Example</p>
                                  <p className="mt-0.5 text-sm font-medium leading-6 text-emerald-950">{model.sentence}</p>
                                  <p className="mt-0.5 text-xs leading-5 text-emerald-900">
                                    <span className="font-semibold">Why: </span>{model.note}
                                  </p>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {rule.table && (
                        <div className="mt-4 overflow-x-auto">
                          <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rule.table.caption}</p>
                          <table className="w-full min-w-[440px] border-collapse text-sm">
                            <thead>
                              <tr className="bg-secondary/60 text-left">
                                {rule.table.columns.map((column, columnIndex) => (
                                  <th key={`${column}-${columnIndex}`} className="border-b px-3 py-2 font-semibold text-pine">{column}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rule.table.rows.map((row, rowIndex) => (
                                <tr key={`${row.join('|')}-${rowIndex}`} className="even:bg-secondary/20">
                                  {row.map((cell, cellIndex) => (
                                    <td key={`${cell}-${cellIndex}`} className="border-b px-3 py-2 leading-6 align-top">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border bg-white p-5 sm:p-7">
                <StepHeading step={2} icon={ClipboardCheck} title="See the rule fail and work" hint="Read the reason, not just the corrected sentence. Cover the right-hand side and predict first." />
                <div className="mt-5 grid gap-3">
                  {lesson.examples.map((example) => (
                    <div key={example.wrong} className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Wrong</p>
                        <p className="mt-1 text-sm leading-7 text-red-950">{example.wrong}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Right</p>
                        <p className="mt-1 text-sm font-semibold leading-7 text-emerald-950">{example.right}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Why</p>
                        <p className="mt-1 text-sm leading-7 text-muted-foreground">{example.why}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-800"><TriangleAlert className="h-4 w-4" /> Mistakes that cost marks here</h4>
                  <ul className="mt-2.5 space-y-1.5">
                    {lesson.pitfalls.map((pitfall) => (
                      <li key={pitfall} className="flex items-start gap-2 text-sm leading-7 text-amber-950">
                        <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                        <span>{pitfall}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="rounded-xl border bg-white p-5 sm:p-7">
                <StepHeading step={3} icon={Target} title="Warm-up" hint="Four easy items to confirm you have understood the rule. Answers and reasons appear at once." />
                <ul className="mt-5 grid gap-3">
                  {lesson.warmUp.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      answer={warmUpAnswers[question.id]}
                      onAnswer={(option) => recordAnswer(question, option, 'warmUp')}
                      onRetry={() => retry(question, 'warmUp')}
                    />
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">{warmUpScore}/{lesson.warmUp.length} correct so far. If you missed one, reread that rule before going on.</p>
              </article>

              <article className="rounded-xl border bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <StepHeading step={4} icon={ListChecks} title="Daily drill" hint="Ten questions at examination difficulty, all on today’s topic. Anything you miss goes into your notebook." />
                  {drillAnswered > 0 && (
                    <button type="button" onClick={resetDrill} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-pine hover:bg-secondary">
                      <RotateCcw className="h-3.5 w-3.5" /> Start the drill again
                    </button>
                  )}
                </div>
                <ul className="mt-5 grid gap-3">
                  {lesson.drill.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      answer={drillAnswers[question.id]}
                      onAnswer={(option) => recordAnswer(question, option, 'drill')}
                      onRetry={() => retry(question, 'drill')}
                    />
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 px-4 py-3 text-sm">
                  <span className="font-semibold text-pine">{drillAnswered}/{lesson.drill.length} attempted · {drillScore} correct</span>
                  <span className="text-xs text-muted-foreground">Aim for 8 out of 10 before you move on — but you may repeat the drill as often as you like.</span>
                </div>
              </article>

              <article className="rounded-xl border bg-white p-5 sm:p-7">
                <StepHeading step={5} icon={PenLine} title="Correct the sentence yourself" hint="Write your version first, then reveal the model. Writing it out is what transfers the rule to the paper." />
                <ul className="mt-5 grid gap-3">
                  {lesson.corrections.map((correction, index) => (
                    <CorrectionCard
                      key={correction.id}
                      id={correction.id}
                      index={index}
                      task={correction.task}
                      model={correction.model}
                      note={correction.note}
                      draft={drafts[correction.id] ?? ''}
                      onDraft={(value) => setDrafts((current) => ({ ...current, [correction.id]: value }))}
                    />
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border bg-white p-5 sm:p-7">
                <StepHeading step={6} icon={NotebookPen} title="Write it in your own words" hint="The task that turns a rule you recognise into a rule you use." />
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <p className="text-sm leading-8 text-emerald-950">{lesson.transfer}</p>
                    </div>
                    <h4 className="mt-5 text-sm font-bold uppercase tracking-wide text-emerald-800">Before you move on</h4>
                    <ul className="mt-2 space-y-1.5">
                      {lesson.checklist.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm leading-7">
                          <CircleCheck className="mt-1.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <label htmlFor="grammar-notes" className="text-sm font-semibold text-pine">My note for Day {lesson.day}</label>
                    <textarea
                      id="grammar-notes"
                      value={notes}
                      onChange={(event) => saveNotes(event.target.value)}
                      placeholder="Write the one rule you never want to get wrong again…"
                      className="mt-2 min-h-32 w-full rounded-lg border bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">Saved on this device as you type.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-pine px-4 py-3.5 text-sm leading-7 text-emerald-50">
                  <span className="font-bold text-amber-300">Remember this: </span>{lesson.recap}
                </div>
              </article>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 sm:p-5">
                <button type="button" onClick={() => chooseDay(day - 1)} disabled={day === 1} className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" /> Previous day
                </button>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={completeDay} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-5 text-sm font-semibold text-white hover:bg-pine/90">
                    <ClipboardCheck className="h-4 w-4" /> {completed.has(day) ? 'Save progress again' : 'Mark this day complete'}
                  </button>
                  <button type="button" onClick={() => chooseDay(day + 1)} disabled={day === grammarLessons.length} className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine disabled:opacity-40">
                    Next day <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
