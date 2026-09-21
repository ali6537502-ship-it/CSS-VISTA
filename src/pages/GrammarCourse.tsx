import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  BookOpen, Check, ChevronLeft, ChevronRight, CircleAlert, ClipboardCheck,
  Clock3, FileText, RotateCcw, Target,
} from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { addMistake, recordActivity } from '@/lib/progress'
import { grammarLessons, grammarPhaseColors, type GrammarLesson } from '@/data/grammarCourse'

type BankQuestion = { id: string; q: string; o: string[]; a: number; e: string; s: string }
type CourseState = {
  completed: number[]
  scores: Record<string, number>
  mistakes: string[]
  notes: Record<string, string>
  currentDay: number
}

const STATE_KEY = 'cssvista:grammar-course:v2'
const BANK_FILES = Array.from({ length: 7 }, (_, index) => `/mcq/cat-english-grammar-${index}.json`)

function readState(): CourseState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return { completed: [], scores: {}, mistakes: [], notes: {}, currentDay: 1 }
    const parsed = JSON.parse(raw) as Partial<CourseState>
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      scores: parsed.scores ?? {},
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      notes: parsed.notes ?? {},
      currentDay: parsed.currentDay ?? 1,
    }
  } catch {
    return { completed: [], scores: {}, mistakes: [], notes: {}, currentDay: 1 }
  }
}

function saveState(state: CourseState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)) } catch { /* private browsing */ }
}

function sampleQuestions(bank: BankQuestion[], lesson: GrammarLesson) {
  const matching = bank.filter((question) => lesson.bankSections.includes(question.s))
  const pool = matching.length >= 10 ? matching : bank
  if (!pool.length) return []
  const start = ((lesson.day - 1) * 17) % pool.length
  return Array.from({ length: Math.min(10, pool.length) }, (_, index) => pool[(start + index) % pool.length])
}

export default function GrammarCourse() {
  const [state, setState] = useState<CourseState>(() => readState())
  const [day, setDay] = useState(() => readState().currentDay)
  const [mode, setMode] = useState<'course' | 'review'>('course')
  const [bank, setBank] = useState<BankQuestion[]>([])
  const [bankLoading, setBankLoading] = useState(true)
  const [bankError, setBankError] = useState('')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({})
  const [transferDone, setTransferDone] = useState(false)
  const [notes, setNotes] = useState('')

  const lesson = grammarLessons.find((item) => item.day === day) ?? grammarLessons[0]
  const completed = new Set(state.completed)
  const progressPercent = Math.round((completed.size / grammarLessons.length) * 100)
  const practice = useMemo(() => sampleQuestions(bank, lesson), [bank, lesson])
  const answered = practice.filter((question) => answers[question.id] !== undefined).length
  const score = practice.reduce((total, question) => total + (answers[question.id] === question.a ? 1 : 0), 0)
  const reviewQuestions = useMemo(() => {
    const ids = new Set(state.mistakes)
    return bank.filter((question) => ids.has(question.id)).slice(0, 24)
  }, [bank, state.mistakes])

  useEffect(() => {
    recordActivity({ type: 'study-tool', label: `Grammar course · Day ${lesson.day}`, path: '/grammar-course' })
  }, [lesson.day])

  useEffect(() => {
    let active = true
    Promise.all(BANK_FILES.map((file) => fetch(file).then((response) => {
      if (!response.ok) throw new Error('Practice bank unavailable')
      return response.json() as Promise<BankQuestion[]>
    })))
      .then((chunks) => { if (active) setBank(chunks.flat()) })
      .catch(() => active && setBankError('The practice bank could not be loaded. You can still study the lesson and examples.'))
      .finally(() => active && setBankLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    setAnswers({})
    setShowAnswers({})
    setTransferDone(false)
    setNotes(readState().notes[String(day)] ?? '')
  }, [day])

  function chooseDay(next: number) {
    setMode('course')
    setDay(Math.min(grammarLessons.length, Math.max(1, next)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function answer(question: BankQuestion, option: number) {
    if (answers[question.id] !== undefined) return
    setAnswers((current) => ({ ...current, [question.id]: option }))
    setShowAnswers((current) => ({ ...current, [question.id]: true }))
    if (option !== question.a) {
      setState((current) => {
        const next = current.mistakes.includes(question.id) ? current.mistakes : [...current.mistakes, question.id]
        const updated = { ...current, mistakes: next }
        saveState(updated)
        return updated
      })
      addMistake(question.id, option, `Grammar · ${question.s}`)
    }
  }

  function finishLesson() {
    if (practice.length && answered < practice.length) return
    const pass = !practice.length || score / practice.length >= 0.7
    if (!pass || !transferDone) return
    const next = {
      ...state,
      completed: state.completed.includes(day) ? state.completed : [...state.completed, day].sort((a, b) => a - b),
      scores: { ...state.scores, [String(day)]: practice.length ? Math.round((score / practice.length) * 100) : 0 },
      notes: { ...state.notes, [String(day)]: notes },
      currentDay: day,
    }
    setState(next)
    saveState(next)
  }

  function saveNotes(value: string) {
    setNotes(value)
    const next = { ...state, notes: { ...state.notes, [String(day)]: value } }
    setState(next)
    saveState(next)
  }

  return (
    <div>
      <PageHeader
        title="30-Day Grammar Course"
        description="A beginner-first, detailed and practice-heavy course for CSS précis, composition, correction and analytical writing. Learn the rule, use it, correct it and retain it."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/books" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-pine/25 bg-white px-3 text-xs font-semibold text-pine hover:bg-secondary"><FileText className="h-3.5 w-3.5" /> Handbook PDF</Link>
          <Link to="/grammar-vocabulary" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-pine/25 bg-white px-3 text-xs font-semibold text-pine hover:bg-secondary"><BookOpen className="h-3.5 w-3.5" /> Vocabulary practice</Link>
        </div>
      </PageHeader>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <section className="rounded-2xl border bg-pine p-5 text-emerald-50 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Learn from zero · practise deeply · write confidently</p>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Grammar that improves your actual paper</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-emerald-100">Each lesson explains one skill in plain language, shows worked examples, gives you a substantial drill and finishes with a writing task. Your wrong answers return in the mistake notebook.</p>
            </div>
            <div className="min-w-[220px]">
              <div className="flex items-center justify-between text-xs text-emerald-100"><span>Course progress</span><span className="font-bold text-white">{completed.size}/30 days</span></div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progressPercent}%` }} /></div>
              <p className="mt-2 text-xs text-emerald-200">{progressPercent}% complete · Day {day} selected</p>
            </div>
          </div>
          <div className="mt-6 grid gap-2 border-t border-white/15 pt-4 text-xs text-emerald-100 sm:grid-cols-3">
            <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-300" /> 45–60 minutes per lesson</span>
            <span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-amber-300" /> 10-question daily drill</span>
            <span className="inline-flex items-center gap-2"><CircleAlert className="h-4 w-4 text-amber-300" /> Automatic mistake review</span>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 border-b pb-3">
          <button type="button" onClick={() => setMode('course')} className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === 'course' ? 'bg-pine text-white' : 'bg-secondary text-pine hover:bg-emerald-100'}`}>Course map</button>
          <button type="button" onClick={() => setMode('review')} className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${mode === 'review' ? 'bg-pine text-white' : 'bg-secondary text-pine hover:bg-emerald-100'}`}><RotateCcw className="h-4 w-4" /> Mistake notebook ({reviewQuestions.length})</button>
        </div>

        {mode === 'review' ? (
          <section className="mt-6 rounded-xl border bg-white p-5 sm:p-7">
            <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 text-amber-600" /><div><h2 className="font-display text-xl font-bold text-pine">Your mistake notebook</h2><p className="mt-1 text-sm text-muted-foreground">Every wrong answer is stored here for deliberate revision. Read the explanation, then return to the lesson and try a similar question.</p></div></div>
            {reviewQuestions.length === 0 ? <div className="mt-6 rounded-lg border border-dashed bg-secondary/40 px-5 py-10 text-center text-sm text-muted-foreground">Your notebook is empty. Attempt a drill and missed questions will appear here.</div> : <div className="mt-6 grid gap-3">{reviewQuestions.map((question) => <div key={question.id} className="rounded-lg border bg-secondary/30 p-4"><p className="text-sm font-semibold text-pine">{question.q}</p><p className="mt-2 text-sm leading-6"><span className="font-semibold text-emerald-800">Correct answer:</span> {question.o[question.a]}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{question.e}</p></div>)}</div>}
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="self-start rounded-xl border bg-white p-3 lg:sticky lg:top-24">
              <div className="flex items-center justify-between px-2 py-1"><h2 className="font-display text-lg font-bold text-pine">30-day map</h2><Badge>{completed.size}/30</Badge></div>
              <div className="mt-3 max-h-[68vh] space-y-1.5 overflow-y-auto pr-1">
                {grammarLessons.map((item) => { const done = completed.has(item.day); const selected = item.day === day; return <button key={item.day} type="button" onClick={() => chooseDay(item.day)} className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selected ? 'bg-pine text-white' : 'hover:bg-secondary'}`}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-400 text-emerald-950' : selected ? 'bg-white/20 text-white' : 'bg-secondary text-pine'}`}>{done ? <Check className="h-3.5 w-3.5" /> : item.day}</span><span className="min-w-0"><span className="block text-xs font-semibold leading-5">{item.title}</span><span className={`mt-0.5 block text-[10px] ${selected ? 'text-emerald-100' : 'text-muted-foreground'}`}>{item.phase}</span></span></button> })}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="rounded-xl border bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${grammarPhaseColors[lesson.phase]}`}>Day {lesson.day} · {lesson.phase}</span>{completed.has(lesson.day) && <Badge>Completed</Badge>}</div><span className="text-xs text-muted-foreground">{state.scores[String(lesson.day)] ? `${state.scores[String(lesson.day)]}% last score` : 'Not attempted yet'}</span></div>
                <h2 className="mt-4 font-display text-2xl font-bold text-pine sm:text-3xl">{lesson.title}</h2>
                <p className="mt-2 text-base font-medium leading-7 text-foreground">{lesson.goal}</p>
                <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">Learn the rule</h3>
                    <p className="mt-2 text-[15px] leading-8 text-foreground">{lesson.explanation}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">{lesson.steps.map((step, index) => <div key={step} className="rounded-lg border bg-secondary/50 p-3"><span className="text-xs font-bold text-amber-700">Step {index + 1}</span><p className="mt-1 text-sm leading-6">{step}</p></div>)}</div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Daily method</p><ol className="mt-2 space-y-2 text-sm leading-6 text-amber-950"><li>1. Read the rule slowly.</li><li>2. Cover the answers and predict.</li><li>3. Complete the drill.</li><li>4. Write the transfer task.</li><li>5. Record the rule behind each error.</li></ol></div>
                </div>

                <div className="mt-8 border-t pt-6"><h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">Worked examples</h3><p className="mt-1 text-sm text-muted-foreground">Study the reason, not just the corrected sentence.</p><div className="mt-4 grid gap-3">{lesson.examples.map((example) => <div key={example.wrong} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_1fr]"><div><p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Needs correction</p><p className="mt-1 text-sm leading-6 text-red-950">{example.wrong}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Better sentence</p><p className="mt-1 text-sm font-semibold leading-6 text-emerald-950">{example.right}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Reason</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{example.why}</p></div></div>)}</div></div>

                <div className="mt-8 border-t pt-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">Independent practice</h3><p className="mt-1 text-sm text-muted-foreground">Attempt every question before checking the explanation. Your wrong answers enter the notebook.</p></div>{bankLoading && <span className="text-xs text-muted-foreground">Loading practice bank…</span>}</div>{bankError && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{bankError}</p>}{!bankLoading && practice.length === 0 && <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">The lesson explanation is ready, but no drill items are available right now.</p>}<div className="mt-4 grid gap-3">{practice.map((question, index) => { const selected = answers[question.id]; const answeredQuestion = selected !== undefined; return <div key={`${lesson.day}-${question.id}`} className="rounded-lg border p-4"><div className="flex gap-2"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-pine">{index + 1}</span><p className="text-sm font-semibold leading-6">{question.q}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{question.o.map((option, optionIndex) => { const isCorrect = optionIndex === question.a; const isSelected = optionIndex === selected; return <button key={option} type="button" disabled={answeredQuestion} onClick={() => answer(question, optionIndex)} className={`rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${answeredQuestion && isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : answeredQuestion && isSelected ? 'border-red-400 bg-red-50 text-red-950' : 'hover:border-emerald-500 hover:bg-emerald-50'}`}>{option}</button> })}</div>{showAnswers[question.id] && <p className={`mt-3 rounded-md px-3 py-2 text-xs leading-5 ${selected === question.a ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}><span className="font-bold">{selected === question.a ? 'Correct. ' : 'Review this rule. '}</span>{question.e}</p>}</div> })}</div>{practice.length > 0 && <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{answered}/{practice.length} attempted · {score}/{practice.length} correct</span><span>Pass target: 70%</span></div>}</div>

                <div className="mt-8 grid gap-5 border-t pt-6 lg:grid-cols-[minmax(0,1fr)_300px]"><div><h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">Writing transfer</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{lesson.transfer}</p><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={transferDone} onChange={(event) => setTransferDone(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" /><span>I completed the writing task and checked it against today’s rule.</span></label></div><div><label htmlFor="grammar-notes" className="text-sm font-semibold text-pine">My note for today</label><textarea id="grammar-notes" value={notes} onChange={(event) => saveNotes(event.target.value)} placeholder="Write the mistake or rule you want to remember…" className="mt-2 min-h-28 w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div></div>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5"><button type="button" onClick={() => chooseDay(day - 1)} disabled={day === 1} className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous day</button><div className="flex flex-wrap gap-2"><button type="button" onClick={finishLesson} disabled={Boolean(practice.length && (answered < practice.length || score / practice.length < 0.7)) || !transferDone} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><ClipboardCheck className="h-4 w-4" /> {completed.has(day) ? 'Progress saved' : 'Complete this day'}</button><button type="button" onClick={() => chooseDay(day + 1)} disabled={day === grammarLessons.length} className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine disabled:opacity-40">Next day <ChevronRight className="h-4 w-4" /></button></div></div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
