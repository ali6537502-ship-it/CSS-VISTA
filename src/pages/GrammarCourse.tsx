import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck,
  ClipboardCheck, Clock3, Eye, FileText, GraduationCap, Layers, Lightbulb, ListChecks,
  NotebookPen, PenLine, RotateCcw, Target, TriangleAlert, Wrench, Play, ArrowUpRight,
} from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { useAccount } from '@/lib/accountContext'
import { courseKey, emptySession, normalizeCourse, readCourse, STEPS, type CourseState, type Session } from '@/features/grammar/state'
import { QuestionCard, CorrectionCard } from '@/features/grammar/PracticeCards'
import ErrorLab from '@/features/grammar/ErrorLab'
import { scheduleReview } from '@/features/grammar/practice'
import { addMistake, recordActivity } from '@/lib/progress'
import {
  GRAMMAR_PHASES, grammarCorrectionCount, grammarExampleCount, grammarLessonForDay,
  grammarLessons, grammarPhaseColors, grammarQuestionCount, grammarToolkit,
  type GrammarLesson, type GrammarQuestion,
} from '@/data/grammarCourse'

type View = 'course' | 'toolkit' | 'notebook' | 'lab'
function loadCourse(userId?: string): CourseState {
  try { return userId === 'pending' ? normalizeCourse({}, grammarLessons) : readCourse(localStorage, userId, grammarLessons) }
  catch { return normalizeCourse({}, grammarLessons) }
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
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
        {step + 1}
      </span>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
          <Icon className="h-4 w-4 text-amber-600" aria-hidden="true" /> {title}
        </h3>
        <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

function GrammarCourseView({ initialDay, initialView, returnTo, userId, loading, onDayChange, onViewChange, lessonLink }: { initialDay?: number; initialView: View; returnTo?: string; userId?: string; loading: boolean; onDayChange: (day: number) => void; onViewChange: (view: View) => void; lessonLink: (day: number) => string }) {
  const [state, setState] = useState<CourseState>(() => loadCourse(userId))
  const [day, setDay] = useState(() => initialDay ?? state.currentDay)
  const [view, setLocalView] = useState<View>(initialView)
  function setView(next: View) { setLocalView(next); onViewChange(next) }
  const [fullLesson, setFullLesson] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const session = state.sessions[String(day)] ?? emptySession()
  const warmUpAnswers = session.warmUp, drillAnswers = session.drill, drafts = session.drafts
  const notes = state.notes[String(day)] ?? ''
  const step = session.step
  function commit(next: CourseState) {
    setState(next)
    try { localStorage.setItem(courseKey(userId), JSON.stringify(next)); setStorageFailed(false) }
    catch { setStorageFailed(true) }
  }
  function updateSession(patch: Partial<Session>, base = state) {
    commit({ ...base, sessions: { ...base.sessions, [String(day)]: { ...session, ...patch } } })
  }
  function chooseStep(next: number) {
    setView('course'); updateSession({ step: next })
    document.getElementById('grammar-focus')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function exerciseNavigation(group: 'warmUp' | 'drill' | 'corrections', length: number) {
    const position = session.position[group] ?? 0
    return <nav aria-label={`${group} exercise navigation`} className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={position === 0} onClick={() => updateSession({ position: { ...session.position, [group]: position - 1 } })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
      <p className="text-xs font-semibold text-slate-500" aria-live="polite">{position + 1} of {length}</p>
      <button type="button" disabled={position === length - 1} onClick={() => updateSession({ position: { ...session.position, [group]: position + 1 } })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-40">{group === 'corrections' ? 'Next correction' : 'Next question'}<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
    </nav>
  }

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
    if (loading) return
    recordActivity({ type: 'study-tool', label: view === 'lab' ? 'Grammar Error Lab' : `Grammar course · Day ${lesson.day}: ${lesson.title}`, path: view === 'lab' ? '/grammar-course?view=lab' : '/grammar-course' })
  }, [lesson.day, lesson.title, loading, view])

  function chooseDay(next: number) {
    const target = Math.min(grammarLessons.length, Math.max(1, next))
    setView('course'); setDay(target)
    commit({ ...state, currentDay: target })
    onDayChange(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function recordAnswer(question: GrammarQuestion, option: number, group: 'warmUp' | 'drill', answeredAt: number) {
    if (session[group][question.id] !== undefined) return
    const first = group === 'drill' && session.first[question.id] === undefined ? { ...session.first, [question.id]: option } : session.first
    const mistakes = option !== question.answer && !state.mistakes.includes(question.id) ? [...state.mistakes, question.id] : state.mistakes
    const recordDrill = group === 'drill' && !session.recorded && lesson.drill.every(q => first[q.id] !== undefined)
    const attempts = recordDrill ? [...state.attempts, { day, at: answeredAt, correct: lesson.drill.filter(q => first[q.id] === q.answer).length, total: lesson.drill.length }].slice(-100) : state.attempts
    updateSession({ [group]: { ...session[group], [question.id]: option }, first, recorded: session.recorded || recordDrill }, { ...state, mistakes, attempts, reviews: { ...state.reviews, [question.id]: scheduleReview(state.reviews[question.id], option === question.answer, answeredAt) } })
    if (option !== question.answer) addMistake(question.id, option, `Grammar · Day ${lesson.day}: ${lesson.title}`)
  }
  function retry(question: GrammarQuestion, group: 'warmUp' | 'drill') {
    const next = { ...session[group] }; delete next[question.id]
    updateSession({ [group]: next })
  }
  function resetDrill() { updateSession({ drill: {}, first: {}, recorded: false, position: { ...session.position, drill: 0 } }) }
  const correctionsWritten = lesson.corrections.filter(c => (drafts[c.id] ?? '').trim()).length
  const warmUpAnswered = lesson.warmUp.filter(q => warmUpAnswers[q.id] !== undefined).length
  const readyToComplete = warmUpAnswered === lesson.warmUp.length && drillAnswered === lesson.drill.length && correctionsWritten === lesson.corrections.length && Boolean(session.writing.trim()) && session.checks.length === lesson.checklist.length
  function completeDay() {
    if (!readyToComplete) return
    const percent = Math.round((drillScore / lesson.drill.length) * 100)
    commit({ ...state,
      completed: completed.has(day) ? state.completed : [...state.completed, day].sort((a, b) => a - b),
      scores: { ...state.scores, [String(day)]: Math.max(percent, state.scores[String(day)] ?? 0) },
    })
  }
  function clearNotebook() { commit({ ...state, mistakes: [] }) }
  function saveNotes(value: string) { commit({ ...state, notes: { ...state.notes, [String(day)]: value } }) }
  const referenceTopics: Record<number, string> = { 1: 'parts-of-speech', 2: 'sentences-clauses-and-phrases', 3: 'sentences-clauses-and-phrases', 4: 'sentences-clauses-and-phrases', 7: 'twelve-tenses', 8: 'twelve-tenses', 9: 'twelve-tenses', 11: 'active-and-passive-voice', 12: 'direct-and-indirect-speech', 13: 'articles', 14: 'pronoun-cases', 16: 'prepositions' }
  const referenceParams = new URLSearchParams({ lang: 'english', return_day: String(day) })
  if (referenceTopics[day]) referenceParams.set('topic', referenceTopics[day])
  if (returnTo) { const source = new URL(returnTo, 'https://www.css-vista.com'); referenceParams.set('from', source.pathname === '/grammar-course' ? 'lab' : 'expression'); if (source.searchParams.get('from') === 'expression') referenceParams.set('origin', 'expression'); for (const key of ['writing', 'version']) { const value = source.searchParams.get(key); if (value) referenceParams.set(key, value) } }
  const latestAttempt = state.attempts.filter(a => a.day === day).at(-1)

  const bestScore = state.scores[String(day)]
  const storageMessage = loading ? 'Checking your account before opening saved work…' : storageFailed ? 'This browser could not save your latest change. Keep this page open and copy your writing before leaving.' : userId ? 'Saved locally for your account in this browser. Device sync is not available for this course yet.' : 'Guest progress stays in this browser. Earlier course progress has been preserved.'

  return (
    <div>
      <PageHeader
        title={view === 'lab' ? 'VISTA Grammar Error Lab' : '30-Day Grammar Course'}
        description={view === 'lab' ? 'Focused practice, mixed questions and scheduled revision built from the existing course.' : 'Learn a rule, try it, understand your mistakes and use it in your own writing. Your lesson session picks up where you stopped.'}
      >
        <div className="mt-4 flex flex-wrap gap-2">
          {returnTo && <Link to={returnTo} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-secondary"><ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />{returnTo.startsWith('/grammar-course') ? 'Return to Error Lab' : 'Return to Expression Lab'}</Link>}
          <button type="button" onClick={() => setView('toolkit')} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-secondary"><Wrench className="h-3.5 w-3.5" /> Grammar toolkit</button>
          <Link to="/grammar-vocabulary" className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-secondary"><BookOpen className="h-3.5 w-3.5" /> Vocabulary practice</Link>
          <Link to="/books" className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-secondary"><FileText className="h-3.5 w-3.5" /> Handbook PDFs</Link>
        </div>
      </PageHeader>

      <main inert={loading} className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <section hidden={view === 'lab'} className="overflow-hidden rounded-3xl bg-slate-950 text-white">
          <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-indigo-200"><GraduationCap className="h-4 w-4" aria-hidden="true" />Grammar studio · Day {day} / 30</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{lesson.title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{lesson.goal}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => { setFullLesson(false); chooseStep(step) }} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white hover:bg-indigo-400"><Play className="h-4 w-4" aria-hidden="true" />Continue {STEPS[step].toLowerCase()}</button>
                <Link to={`/language-grammar?${referenceParams}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold hover:bg-white/10"><BookOpen className="h-4 w-4" aria-hidden="true" />Open reference<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
              <p className="mt-5 text-xs leading-6 text-slate-400">{grammarQuestionCount} authored questions · {grammarCorrectionCount} corrections · {grammarExampleCount} worked examples</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-300">Your session</p><span className="rounded-full bg-indigo-400/15 px-3 py-1 text-xs text-indigo-200">{completed.has(day) ? 'Revision' : 'In progress'}</span></div>
              <p className="mt-4 text-xl font-semibold">{STEPS[step]}</p>
              <dl className="mt-5 grid grid-cols-3 gap-2 border-y border-white/10 py-4"><div><dt className="text-[11px] text-slate-400">Warm-up</dt><dd className="mt-1 text-xl font-semibold">{warmUpAnswered}<span className="text-sm text-slate-400">/4</span></dd></div><div><dt className="text-[11px] text-slate-400">Drill</dt><dd className="mt-1 text-xl font-semibold">{drillAnswered}<span className="text-sm text-slate-400">/12</span></dd></div><div><dt className="text-[11px] text-slate-400">Corrections</dt><dd className="mt-1 text-xl font-semibold">{correctionsWritten}<span className="text-sm text-slate-400">/6</span></dd></div></dl>
              <div className="mt-5 flex justify-between text-xs text-slate-300"><span>Course completion</span><span>{completed.size}/30 days</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Completed course days" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-indigo-400 transition-all motion-reduce:transition-none" style={{ width: `${progressPercent}%` }} /></div>
              <p className="mt-4 text-xs leading-6 text-slate-400">About {lesson.minutes} minutes · Authored practice · Instant explanations</p>
            </div>
          </div>
          <div role={storageFailed ? 'alert' : 'status'} className={`border-t border-white/10 px-6 py-4 text-xs leading-6 sm:px-8 ${storageFailed ? 'bg-amber-100 text-amber-950' : 'text-slate-300'}`}>
            {storageMessage}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 border-b pb-3">
          {([
            { key: 'course' as const, label: 'Today’s lesson', icon: GraduationCap },
            { key: 'lab' as const, label: 'Error Lab', icon: Target },
            { key: 'toolkit' as const, label: 'Grammar toolkit', icon: Wrench },
            { key: 'notebook' as const, label: `Mistake notebook (${notebook.length})`, icon: CircleAlert },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              aria-pressed={view === tab.key}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${view === tab.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50'}`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {view === 'lab' && <ErrorLab state={state} commit={commit} lessonLink={lessonLink} storageMessage={storageMessage} storageFailed={storageFailed} suggestedDay={initialDay} />}

        {view === 'toolkit' && (
          <section className="mt-6 space-y-6">
            <div className="rounded-xl border bg-white p-5 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-900"><Wrench className="h-5 w-5 text-amber-600" /> Grammar toolkit</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                Reference tables you will need again and again. Open this tab whenever a lesson asks you to check a
                form, then go straight back to the drill.
              </p>
            </div>
            {grammarToolkit.map((table) => (
              <div key={table.id} className="rounded-xl border bg-white p-5 sm:p-7">
                <h3 className="font-display text-lg font-bold text-slate-900">{table.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{table.note}</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-secondary/60 text-left">
                        {table.columns.map((column, columnIndex) => (
                          <th key={`${column}-${columnIndex}`} className="border-b px-3 py-2 font-semibold text-slate-900">{column}</th>
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
                  <h2 className="font-display text-xl font-bold text-slate-900">Your mistake notebook</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Every question you answered wrongly is kept here with its rule. Read the explanation, then return
                    to that day and attempt the drill again.
                  </p>
                </div>
              </div>
              {notebook.length > 0 && (
                <button type="button" onClick={clearNotebook} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-900 hover:bg-secondary">
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
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${grammarPhaseColors[source.phase] ?? 'bg-secondary text-slate-900'}`}>Day {source.day} · {source.title}</span>
                      <button type="button" onClick={() => chooseDay(source.day)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 underline underline-offset-2">
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

        {view === 'course' && state.completed.length === grammarLessons.length && <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-7"><p className="font-semibold">All 30 course days are complete.</p><p>Keep practising with mixed sessions and scheduled revision.</p><button type="button" onClick={() => setView('lab')} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-indigo-700">Open Error Lab<ArrowRight className="h-4 w-4" aria-hidden="true" /></button></div>}
        {view === 'course' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="lg:hidden"><label htmlFor="grammar-day" className="text-xs font-semibold text-slate-600">Choose a day</label><select id="grammar-day" value={day} onChange={event => chooseDay(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border bg-white p-3 text-sm">{grammarLessons.map(item => <option key={item.day} value={item.day}>Day {item.day} · {item.title}{completed.has(item.day) ? ' · Completed' : ''}</option>)}</select></div>
            <aside className="hidden self-start rounded-2xl border bg-white p-3 lg:sticky lg:top-24 lg:block">
              <div className="flex items-center justify-between px-2 py-1">
                <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-slate-900"><Layers className="h-4 w-4 text-amber-600" /> Course map</h2>
                <Badge>{completed.size}/{grammarLessons.length}</Badge>
              </div>
              <div className="mt-3 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                {GRAMMAR_PHASES.map((phase) => (
                  <div key={phase.name}>
                    <p className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${grammarPhaseColors[phase.name] ?? 'bg-secondary text-slate-900'}`}>
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
                              className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${selected ? 'bg-indigo-600 text-white' : 'hover:bg-secondary'}`}
                            >
                              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-400 text-emerald-950' : selected ? 'bg-white/20 text-white' : 'bg-secondary text-slate-900'}`}>
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

            <section id="grammar-focus" className="min-w-0 scroll-mt-24 space-y-6 [overflow-wrap:anywhere]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-950">Your next action</h2><button type="button" onClick={() => setFullLesson(!fullLesson)} aria-pressed={fullLesson} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold text-indigo-700"><FileText className="h-4 w-4" aria-hidden="true" />{fullLesson ? 'Guided session' : 'Read full lesson'}</button></div>
                <nav aria-label="Lesson steps" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{STEPS.map((label, index) => <button key={label} type="button" onClick={() => { setFullLesson(false); chooseStep(index) }} aria-current={step === index ? 'step' : undefined} className={`flex min-h-12 items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold ${step === index ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-indigo-50'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step === index ? 'bg-white/20' : 'bg-white'}`}>{index + 1}</span>{label}</button>)}</nav>
              </div>

              <article hidden={!fullLesson && step !== 0} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${grammarPhaseColors[lesson.phase] ?? 'bg-secondary text-slate-900'}`}>Day {lesson.day} of 30 · {lesson.phase}</span>
                    {completed.has(lesson.day) && <Badge>Completed</Badge>}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" /> about {lesson.minutes} minutes
                    {bestScore !== undefined && <span className="ml-2 font-semibold text-emerald-800">Best drill score {bestScore}%</span>}
                  </span>
                </div>

                <h2 className="mt-4 font-display text-2xl font-bold text-slate-900 sm:text-3xl">{lesson.title}</h2>
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
                      <li>4. Attempt the drill and read each explanation.</li>
                      <li>5. Write the six corrections out by hand.</li>
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
                          <dt className="text-sm font-semibold text-slate-900">{term.term}</dt>
                          <dd className="mt-0.5 text-sm leading-6 text-muted-foreground">{term.meaning}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </article>

              <article hidden={!fullLesson && step !== 1} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <StepHeading step={1} icon={Lightbulb} title="Learn the rules" hint="Read each explanation together with the example placed immediately beside the point it illustrates." />
                <div className="mt-5 space-y-5">
                  {lesson.rules.map((rule, ruleIndex) => (
                    <div key={rule.heading} className="rounded-xl border p-4 sm:p-5">
                      <h4 className="font-display text-base font-bold text-slate-900">{ruleIndex + 1}. {rule.heading}</h4>
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
                                  <th key={`${column}-${columnIndex}`} className="border-b px-3 py-2 font-semibold text-slate-900">{column}</th>
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

              <article hidden={!fullLesson && step !== 2} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <StepHeading step={2} icon={ClipboardCheck} title="See the rule fail and work" hint="Read the reason, not just the corrected sentence. Cover the right-hand side and predict first." />
                <div className="mt-5 grid gap-3">
                  {lesson.examples.map((example, index) => (
                    <div key={example.wrong} className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Wrong</p>
                        <p className="mt-1 text-sm leading-7 text-red-950">{example.wrong}</p>
                      </div>
                      <div>
                        {!fullLesson && !session.revealed.includes(`example:${index}`) && <button type="button" onClick={() => updateSession({ revealed: [...session.revealed, `example:${index}`] })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 px-3 text-xs font-semibold text-indigo-700"><Eye className="h-4 w-4" aria-hidden="true" />Predict, then reveal</button>}
                        <div hidden={!fullLesson && !session.revealed.includes(`example:${index}`)}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Right</p>
                        <p className="mt-1 text-sm font-semibold leading-7 text-emerald-950">{example.right}</p>
                        </div>
                      </div>
                      <div hidden={!fullLesson && !session.revealed.includes(`example:${index}`)}>
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

              <article hidden={!fullLesson && step !== 3} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <StepHeading step={3} icon={Target} title="Warm-up" hint="Four easy items to confirm you have understood the rule. Answers and reasons appear at once." />
                <ul className="mt-5 grid gap-3">
                  {lesson.warmUp.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      hidden={!fullLesson && index !== (session.position.warmUp ?? 0)}
                      question={question}
                      index={index}
                      answer={warmUpAnswers[question.id]}
                      onAnswer={(option, at) => recordAnswer(question, option, 'warmUp', at)}
                      onRetry={() => retry(question, 'warmUp')}
                    />
                  ))}
                </ul>
                {!fullLesson && exerciseNavigation('warmUp', lesson.warmUp.length)}
                <p className="mt-4 text-xs text-muted-foreground">{warmUpScore}/{lesson.warmUp.length} correct so far. If you missed one, reread that rule before going on.</p>
              </article>

              <article hidden={!fullLesson && step !== 4} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-800"><Target className="h-4 w-4" /> How examiners actually test this</h4>
                  <p className="mt-1.5 text-sm leading-7 text-sky-950">{lesson.examTip}</p>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <StepHeading step={4} icon={ListChecks} title="Daily drill" hint="Twelve questions at examination difficulty, all on today’s topic. Anything you miss goes into your notebook." />
                  {drillAnswered > 0 && (
                    <button type="button" onClick={resetDrill} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-900 hover:bg-secondary">
                      <RotateCcw className="h-3.5 w-3.5" /> Start the drill again
                    </button>
                  )}
                </div>
                <ul className="mt-5 grid gap-3">
                  {lesson.drill.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      hidden={!fullLesson && index !== (session.position.drill ?? 0)}
                      question={question}
                      index={index}
                      answer={drillAnswers[question.id]}
                      onAnswer={(option, at) => recordAnswer(question, option, 'drill', at)}
                      onRetry={() => retry(question, 'drill')}
                    />
                  ))}
                </ul>
                {!fullLesson && exerciseNavigation('drill', lesson.drill.length)}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-900">{drillAnswered}/{lesson.drill.length} attempted · {drillScore} correct</span>
                  <span className="text-xs text-muted-foreground">Aim for 8 out of 10 before you move on — but you may repeat the drill as often as you like.</span>
                </div>
              </article>

              <article hidden={!fullLesson && step !== 5} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <StepHeading step={5} icon={PenLine} title="Correct the sentence yourself" hint="Write your version first, then reveal the model. Writing it out is what transfers the rule to the paper." />
                <ul className="mt-5 grid gap-3">
                  {lesson.corrections.map((correction, index) => (
                    <CorrectionCard
                      key={correction.id}
                      hidden={!fullLesson && index !== (session.position.corrections ?? 0)}
                      revealed={session.revealed.includes(correction.id)}
                      onReveal={() => updateSession({ revealed: [...session.revealed, correction.id] })}
                      index={index}
                      task={correction.task}
                      model={correction.model}
                      note={correction.note}
                      draft={drafts[correction.id] ?? ''}
                      onDraft={(value) => updateSession({ drafts: { ...drafts, [correction.id]: value } })}
                    />
                  ))}
                </ul>
                {!fullLesson && exerciseNavigation('corrections', lesson.corrections.length)}
                <p className="mt-4 text-xs leading-6 text-slate-500">Compare with the authored model and its rule. Other valid corrections are possible; this is self-review, not automated marking.</p>
              </article>

              <article hidden={!fullLesson && step !== 6} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <StepHeading step={6} icon={NotebookPen} title="Write it in your own words" hint="The task that turns a rule you recognise into a rule you use." />
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <p className="text-sm leading-8 text-emerald-950">{lesson.transfer}</p>
                    </div>
                    <label htmlFor="grammar-writing" className="mt-5 block text-sm font-semibold text-slate-900">Your writing for Day {day}</label>
                    <textarea id="grammar-writing" maxLength={20000} value={session.writing} onChange={event => updateSession({ writing: event.target.value })} rows={7} className="mt-2 w-full rounded-xl border p-4 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Apply today’s rule in your own words…" />
                    <Link to="/account/expression" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700">Open Expression Lab<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
                    <h4 className="mt-5 text-sm font-bold uppercase tracking-wide text-emerald-800">Before you move on</h4>
                    <ul className="mt-2 space-y-1.5">
                      {lesson.checklist.map((item, index) => (
                        <li key={item} className="flex items-start gap-2 text-sm leading-7">
                          <label className="flex min-h-11 cursor-pointer items-start gap-3"><input type="checkbox" checked={session.checks.includes(index)} onChange={() => updateSession({ checks: session.checks.includes(index) ? session.checks.filter(n => n !== index) : [...session.checks, index] })} className="mt-2 h-4 w-4 shrink-0 accent-indigo-600" /><span>{item}</span></label>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <label htmlFor="grammar-notes" className="text-sm font-semibold text-slate-900">My note for Day {lesson.day}</label>
                    <textarea
                      maxLength={20000}
                      id="grammar-notes"
                      value={notes}
                      onChange={(event) => saveNotes(event.target.value)}
                      placeholder="Write the one rule you never want to get wrong again…"
                      className="mt-2 min-h-32 w-full rounded-lg border bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">{storageFailed ? 'Your latest change is not saved. Copy your work before leaving.' : 'Saved on this device as you type.'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm leading-7 text-emerald-50">
                  <span className="font-bold text-amber-300">Remember this: </span>{lesson.recap}
                </div>
              </article>

              {!fullLesson && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><button type="button" disabled={step === 0} onClick={() => chooseStep(step - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous step</button><span className="text-xs text-slate-500">Step {step + 1} of {STEPS.length}</span><button type="button" disabled={step === 6} onClick={() => chooseStep(step + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-40">Next step<ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div>}
              {latestAttempt && <p className="rounded-xl border bg-white p-4 text-sm leading-7 text-slate-600">Latest saved drill: {latestAttempt.correct}/{latestAttempt.total} correct on first responses. Best practice score: {bestScore ?? 0}%. Completion records work and self-review; it is not a mastery certificate.</p>}
              {!readyToComplete && <p className="rounded-xl bg-slate-100 p-4 text-xs leading-6 text-slate-600">To complete this day: answer all 4 warm-up and 12 drill questions, write the 6 corrections, complete your writing task and tick the self-review checklist.</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 sm:p-5">
                <button type="button" onClick={() => chooseDay(day - 1)} disabled={day === 1} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-slate-900 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" /> Previous day
                </button>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={completeDay} disabled={!readyToComplete} className="inline-flex min-h-11 disabled:opacity-40 items-center gap-1.5 rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-600/90">
                    <ClipboardCheck className="h-4 w-4" /> {completed.has(day) ? 'Save progress again' : 'Mark this day complete'}
                  </button>
                  <button type="button" onClick={() => chooseDay(day + 1)} disabled={day === grammarLessons.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-slate-900 disabled:opacity-40">
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

/** A lesson link opens a view without overwriting the member's saved course position. */
export default function GrammarCourse() {
  const { user, loading } = useAccount()
  const [params, setParams] = useSearchParams()
  const requested = params.get('day'), initialDay = requested && /^(?:[1-9]|[12][0-9]|30)$/.test(requested) ? Number(requested) : undefined
  const writing = params.get('writing'), version = params.get('version'), idPattern = /^[a-f0-9-]{36}$/i
  const back = new URLSearchParams()
  if (writing && idPattern.test(writing)) back.set('writing', writing)
  if (version && idPattern.test(version)) back.set('version', version)
  const fromLab = params.get('from') === 'lab'
  const fromExpression = params.get('from') === 'expression' || fromLab && params.get('origin') === 'expression'
  const labParams = new URLSearchParams({ view: 'lab' })
  if (fromExpression) { labParams.set('from', 'expression'); for (const [key, value] of back) labParams.set(key, value) }
  const returnTo = fromLab ? `/grammar-course?${labParams}` : fromExpression ? `/account/expression${back.size ? `?${back}` : ''}` : undefined
  const requestedView = params.get('view')
  const initialView: View = requestedView === 'lab' || requestedView === 'toolkit' || requestedView === 'notebook' ? requestedView : 'course'
  return <GrammarCourseView key={`${loading ? 'pending' : user?.id ?? 'guest'}:${initialDay || 'saved'}:${returnTo || ''}`} initialDay={initialDay} initialView={initialView} returnTo={returnTo} userId={loading ? 'pending' : user?.id} loading={loading}
    onDayChange={day => { const next = new URLSearchParams(params); next.set('day', String(day)); next.delete('view'); setParams(next, { replace: true }) }}
    onViewChange={view => { const next = new URLSearchParams(params); if (view === 'course') next.delete('view'); else next.set('view', view); setParams(next, { replace: true }) }}
    lessonLink={day => { const next = new URLSearchParams({ day: String(day), from: 'lab' }); if (fromExpression) { next.set('origin', 'expression'); for (const [key, value] of back) next.set(key, value) }; return `/grammar-course?${next}` }} />
}
