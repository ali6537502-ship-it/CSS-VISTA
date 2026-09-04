import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight,
  Circle, ClipboardCheck, GraduationCap, Lightbulb, ListChecks, RotateCcw,
  ShieldAlert, Sparkles, Target, Trophy,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { masterGrammarCourse, type MasterGrammarDay } from '@/data/masterGrammarCourse'

type CourseTab = 'learn' | 'practice' | 'quiz' | 'toolkit'
interface ProgressState { completed: number[]; scores: Record<string, number> }
interface QuizQuestion { id: string; question: string; options: string[]; correct: number; explanation: string }

const STORAGE_KEY = 'css-vista-master-grammar-progress-v1'
const EMPTY_PROGRESS: ProgressState = { completed: [], scores: {} }

function optionSet(values: string[], correctIndex: number, seed: number) {
  const indexes = [correctIndex]
  for (let step = 1; indexes.length < 4 && step <= values.length * 2; step += 1) {
    const index = (correctIndex + (step * 3) + seed) % values.length
    if (!indexes.includes(index)) indexes.push(index)
  }
  for (let index = 0; indexes.length < 4 && index < values.length; index += 1) {
    if (!indexes.includes(index)) indexes.push(index)
  }
  const shift = seed % 4
  const rotated = [...indexes.slice(shift), ...indexes.slice(0, shift)]
  return { options: rotated.map((index) => values[index]), correct: rotated.indexOf(correctIndex) }
}

function makeQuiz(day: MasterGrammarDay): QuizQuestion[] {
  const concepts = day.expanded.slice(0, 4)
  if (concepts.length < 4 || day.practice.length < 4) return []
  const titles = concepts.map((item) => item.title)
  const explanations = concepts.map((item) => item.explanation)
  const examples = concepts.map((item) => item.example)
  const questions: QuizQuestion[] = []

  concepts.forEach((concept, index) => {
    let set = optionSet(explanations, index, day.day + index)
    questions.push({ id: `d${day.day}-rule-exp-${index}`, question: `Which explanation best matches “${concept.title}”?`, ...set, explanation: `${concept.title}: ${concept.explanation}` })
    set = optionSet(examples, index, day.day + index + 1)
    questions.push({ id: `d${day.day}-rule-ex-${index}`, question: `Which example best demonstrates “${concept.title}”?`, ...set, explanation: `${concept.title}: ${concept.example}` })
    set = optionSet(titles, index, day.day + index + 2)
    questions.push({ id: `d${day.day}-exp-rule-${index}`, question: `Which concept is described by: “${concept.explanation}”`, ...set, explanation: `The description defines ${concept.title}.` })
    set = optionSet(titles, index, day.day + index + 3)
    questions.push({ id: `d${day.day}-ex-rule-${index}`, question: `Which concept is demonstrated by: “${concept.example}”`, ...set, explanation: `The example demonstrates ${concept.title}.` })
  })

  const practiceAnswers = day.practice.map((item) => item.answer)
  const practicePrompts = day.practice.map((item) => item.prompt)
  day.practice.slice(0, 8).forEach((item, index) => {
    const set = optionSet(practiceAnswers, index, day.day + index + 5)
    questions.push({ id: `d${day.day}-practice-${index}`, question: `Choose the best correction or model answer for: “${item.prompt}”`, ...set, explanation: item.answer })
  })
  day.practice.slice(0, 4).forEach((item, index) => {
    const set = optionSet(practicePrompts, index, day.day + index + 9)
    questions.push({ id: `d${day.day}-reverse-${index}`, question: `Which original exercise is correctly answered by: “${item.answer}”`, ...set, explanation: `This model answer belongs to: ${item.prompt}` })
  })
  return questions.slice(0, 28)
}

function loadProgress(): ProgressState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ProgressState>
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter((item): item is number => typeof item === 'number') : [],
      scores: parsed.scores && typeof parsed.scores === 'object' ? parsed.scores as Record<string, number> : {},
    }
  } catch { return EMPTY_PROGRESS }
}
function saveProgress(progress: ProgressState) { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) } catch {} }

function LessonNavigation({ activeDay, completed, onSelect }: { activeDay: number; completed: number[]; onSelect: (day: number) => void }) {
  return <nav aria-label="30-day grammar course lessons" className="space-y-4">
    {[1,2,3,4,5].map((phase) => {
      const phaseDays = masterGrammarCourse.days.filter((day) => day.phase === phase)
      if (!phaseDays.length) return null
      return <div key={phase}>
        <p className="px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800">Phase {phase} · {phaseDays[0].phaseTitle}</p>
        <div className="mt-1.5 space-y-1">{phaseDays.map((day) => {
          const selected = day.day === activeDay
          const done = completed.includes(day.day)
          return <button key={day.day} type="button" onClick={() => onSelect(day.day)} className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${selected ? 'bg-pine font-semibold text-white' : 'hover:bg-emerald-50'}`}>
            {done ? <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-amber-300' : 'text-emerald-700'}`} /> : <Circle className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-emerald-100' : 'text-muted-foreground'}`} />}
            <span><span className={`block text-[10px] uppercase tracking-wide ${selected ? 'text-emerald-100' : 'text-muted-foreground'}`}>Day {day.day}</span><span className="block leading-snug">{day.title}</span></span>
          </button>
        })}</div>
      </div>
    })}
  </nav>
}

export default function MasterGrammarCourse() {
  const [activeDayNumber, setActiveDayNumber] = useState(1)
  const [tab, setTab] = useState<CourseTab>('learn')
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS)
  const [revealedPractice, setRevealedPractice] = useState<number[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  useEffect(() => setProgress(loadProgress()), [])

  const activeDay = masterGrammarCourse.days.find((day) => day.day === activeDayNumber) ?? masterGrammarCourse.days[0]
  const quiz = useMemo(() => makeQuiz(activeDay), [activeDay])
  const completionPercent = Math.round((progress.completed.length / masterGrammarCourse.days.length) * 100)
  const quizAnswered = quiz.filter((q) => quizAnswers[q.id] !== undefined).length
  const quizScore = quiz.reduce((score, q) => score + (quizAnswers[q.id] === q.correct ? 1 : 0), 0)
  const savedScore = progress.scores[String(activeDay.day)]

  function selectDay(day: number) {
    setActiveDayNumber(day); setTab('learn'); setRevealedPractice([]); setQuizAnswers({}); setQuizSubmitted(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function updateProgress(next: ProgressState) { setProgress(next); saveProgress(next) }
  function toggleComplete() {
    const completed = progress.completed.includes(activeDay.day) ? progress.completed.filter((day) => day !== activeDay.day) : [...progress.completed, activeDay.day].sort((a,b) => a-b)
    updateProgress({ ...progress, completed })
  }
  function submitQuiz() {
    if (quizAnswered !== quiz.length) return
    updateProgress({ ...progress, scores: { ...progress.scores, [String(activeDay.day)]: quizScore } })
    setQuizSubmitted(true)
  }

  return <div>
    <PageHeader title="30-Day Master Grammar Course" description="A guided, expanded English course with deep explanations, extensive worked examples, exercises, 28-question daily quizzes, progress tracking, and a complete revision toolkit." />
    <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white shadow-sm">
        <div className="grid gap-7 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-300"><GraduationCap className="h-4 w-4" /> Expanded interactive edition</p>
            <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{masterGrammarCourse.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50 sm:text-base">Based on <strong>{masterGrammarCourse.source}</strong> by {masterGrammarCourse.author}. The book’s 30-day sequence is preserved while each day adds deeper teaching, a large worked-example bank, extra drills, a 28-question quiz, answer feedback, and saved progress.</p>
            <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">{[['30','guided days'],['5','learning phases'],['28','quiz items/day'],['12+','worked examples/day']].map(([value,label]) => <div key={label} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3"><p className="text-xl font-bold">{value}</p><p className="text-[11px] text-emerald-100">{label}</p></div>)}</div>
          </div>
          <div className="self-center rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Course progress</p><span className="text-sm font-bold text-amber-300">{completionPercent}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-amber-300" style={{ width: `${completionPercent}%` }} /></div>
            <p className="mt-2 text-xs text-emerald-100">{progress.completed.length} of 30 days completed on this device.</p>
            <Link to="/language-grammar?lang=english" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold hover:text-amber-200"><ArrowLeft className="h-4 w-4" /> Back to English grammar reference</Link>
          </div>
        </div>
      </section>

      <div className="mt-6 lg:hidden"><label className="text-xs font-bold uppercase tracking-wide text-emerald-800" htmlFor="course-day-select">Choose a lesson</label><select id="course-day-select" value={activeDay.day} onChange={(e) => selectDay(Number(e.target.value))} className="mt-2 h-12 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-pine">{masterGrammarCourse.days.map((day) => <option key={day.day} value={day.day}>Day {day.day}: {day.title}</option>)}</select></div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[285px_minmax(0,1fr)]">
        <aside className="hidden self-start rounded-xl border bg-white p-3 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"><LessonNavigation activeDay={activeDay.day} completed={progress.completed} onSelect={selectDay} /></aside>
        <div className="min-w-0">
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Phase {activeDay.phase} · {activeDay.phaseTitle}</p><h2 className="mt-2 font-display text-2xl font-bold text-pine sm:text-3xl">Day {activeDay.day}: {activeDay.title}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground"><strong className="text-foreground">Goal:</strong> {activeDay.goal}</p></div><button type="button" onClick={toggleComplete} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${progress.completed.includes(activeDay.day) ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'bg-white text-pine hover:bg-emerald-50'}`}>{progress.completed.includes(activeDay.day) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}{progress.completed.includes(activeDay.day) ? 'Completed' : 'Mark complete'}</button></div>
            <div className="mt-5 rounded-xl border border-emerald-900/10 bg-emerald-50/70 p-4"><p className="flex items-center gap-2 text-sm font-bold text-emerald-950"><Target className="h-4 w-4" /> Why this matters</p><p className="mt-2 text-sm leading-7 text-emerald-950/80">{activeDay.why}</p></div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist">{([['learn','Learn',BookOpen],['practice','Practice',ListChecks],['quiz','Quiz',ClipboardCheck],['toolkit','Toolkit',Sparkles]] as const).map(([value,label,Icon]) => <button key={value} type="button" role="tab" aria-selected={tab===value} onClick={() => setTab(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab===value ? 'bg-pine text-white' : 'border bg-white text-pine hover:bg-emerald-50'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
          </section>

          {tab === 'learn' && <div className="mt-4 space-y-4">
            <section className="rounded-2xl border bg-white p-5 sm:p-6"><h3 className="flex items-center gap-2 font-display text-xl font-bold text-pine"><BookOpen className="h-5 w-5 text-emerald-800" /> Book core lesson</h3><p className="mt-1 text-xs text-muted-foreground">Source-derived teaching preserved from the supplied 30-day course.</p><div className="mt-5 space-y-3">{activeDay.coreNotes.map((note,index) => note.trim().startsWith('→') ? <div key={index} className="flex gap-3 rounded-lg bg-secondary/50 px-3 py-2.5 text-sm leading-6"><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /><p>{note.replace(/^→\s*/, '')}</p></div> : <p key={index} className="text-sm leading-7">{note}</p>)}</div></section>
            <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6"><h3 className="flex items-center gap-2 font-display text-xl font-bold text-pine"><Sparkles className="h-5 w-5 text-amber-700" /> Expanded teaching</h3><p className="mt-1 text-xs text-muted-foreground">Additional web-course explanation that deepens the book lesson.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{activeDay.expanded.map((concept) => <article key={concept.title} className="rounded-xl border bg-white p-4"><h4 className="font-bold text-emerald-900">{concept.title}</h4><p className="mt-2 text-sm leading-7">{concept.explanation}</p><div className="mt-3 rounded-lg bg-secondary/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Example</p><p className="mt-1 text-sm leading-6">{concept.example}</p></div></article>)}</div></section>
            {activeDay.models.length > 0 && <section className="rounded-2xl border bg-white p-5 sm:p-6"><h3 className="font-display text-xl font-bold text-pine">Worked model sentences</h3><div className="mt-4 space-y-3">{activeDay.models.map((model,index) => <div key={index} className="grid gap-2 rounded-xl border p-4 sm:grid-cols-[110px_minmax(0,1fr)]"><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">{model.status}</span><div><p className="text-sm font-semibold leading-6">{model.sentence}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{model.note}</p></div></div>)}</div></section>}
            <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 sm:p-6"><h3 className="font-display text-xl font-bold text-pine">Additional worked examples</h3><p className="mt-1 text-xs text-muted-foreground">The day’s exercise bank is also shown as worked examples so you can study the correction and the rule before attempting it independently.</p><div className="mt-4 grid gap-3">{activeDay.practice.slice(0,8).map((item,index) => <article key={index} className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-sky-800">Example {index+1}</p><p className="mt-2 text-sm leading-7"><strong>Prompt:</strong> {item.prompt}</p><p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm leading-7 text-emerald-950"><strong>Model:</strong> {item.answer}</p></article>)}</div></section>
            <div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"><h3 className="flex items-center gap-2 font-bold text-emerald-950"><Lightbulb className="h-4 w-4" /> Mentor’s tip</h3><p className="mt-2 text-sm leading-7 text-emerald-950/80">{activeDay.tip}</p></section><section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5"><h3 className="flex items-center gap-2 font-bold text-rose-950"><ShieldAlert className="h-4 w-4" /> Common trap</h3><p className="mt-2 text-sm leading-7 text-rose-950/80">{activeDay.trap}</p></section></div>
            <section className="rounded-2xl border bg-white p-5"><h3 className="font-display text-lg font-bold text-pine">Close the day</h3><p className="mt-2 text-sm leading-7"><strong>Deliverable:</strong> {activeDay.deliverable}</p><ul className="mt-3 space-y-2">{activeDay.selfCheck.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>)}</ul></section>
          </div>}

          {tab === 'practice' && <section className="mt-4 rounded-2xl border bg-white p-5 sm:p-6"><h3 className="font-display text-xl font-bold text-pine">Core exercise set</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{activeDay.practiceInstruction || 'Attempt each item before revealing the model answer.'}</p><div className="mt-5 space-y-3">{activeDay.practice.map((item,index) => { const shown = revealedPractice.includes(index); return <article key={index} className="rounded-xl border p-4"><div className="flex gap-3"><span className="min-w-8 rounded-md bg-secondary px-2 py-1 text-center text-xs font-bold text-pine">{index+1}</span><div className="flex-1"><p className="text-sm leading-7">{item.prompt}</p><button type="button" onClick={() => setRevealedPractice((current) => current.includes(index) ? current.filter((n)=>n!==index) : [...current,index])} className="mt-3 text-xs font-bold text-emerald-800 hover:underline">{shown ? 'Hide model answer' : 'Reveal model answer'}</button>{shown && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-3 text-sm leading-7 text-emerald-950">{item.answer}</div>}</div></div></article> })}</div></section>}

          {tab === 'quiz' && <section className="mt-4 rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-xl font-bold text-pine">Day {activeDay.day} mastery quiz</h3><p className="mt-1 text-sm text-muted-foreground">28 questions test rules, explanations, examples, and correction exercises from this day.</p></div>{savedScore !== undefined && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">Latest saved score: {savedScore}/{quiz.length}</span>}</div><div className="mt-6 space-y-5">{quiz.map((question,qIndex) => <article key={question.id} className="rounded-xl border p-4"><p className="text-sm font-semibold leading-7">{qIndex+1}. {question.question}</p><div className="mt-3 grid gap-2">{question.options.map((option,oIndex) => { const selected = quizAnswers[question.id]===oIndex; const correct = oIndex===question.correct; const cls = quizSubmitted ? correct ? 'border-emerald-600 bg-emerald-50' : selected ? 'border-rose-500 bg-rose-50' : 'bg-white' : selected ? 'border-emerald-700 bg-emerald-50' : 'bg-white hover:bg-secondary/40'; return <button key={oIndex} type="button" disabled={quizSubmitted} onClick={() => setQuizAnswers((current) => ({...current,[question.id]:oIndex}))} className={`rounded-lg border px-3 py-3 text-left text-sm leading-6 ${cls}`}><span className="mr-2 font-bold text-emerald-800">{String.fromCharCode(65+oIndex)}.</span>{option}</button> })}</div>{quizSubmitted && <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs leading-6 text-muted-foreground">{question.explanation}</p>}</article>)}</div><div className="mt-6 flex flex-wrap items-center gap-3">{!quizSubmitted ? <button type="button" disabled={quizAnswered!==quiz.length} onClick={submitQuiz} className="inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><ClipboardCheck className="h-4 w-4" /> Submit quiz ({quizAnswered}/{quiz.length})</button> : <><div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-950"><Trophy className="h-4 w-4" /> Score: {quizScore}/{quiz.length}</div><button type="button" onClick={() => {setQuizAnswers({});setQuizSubmitted(false)}} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold text-pine"><RotateCcw className="h-4 w-4" /> Retake quiz</button></>}</div></section>}

          {tab === 'toolkit' && <div className="mt-4 space-y-4"><section className="rounded-2xl border bg-white p-5 sm:p-6"><h3 className="font-display text-xl font-bold text-pine">High-yield formal replacements</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{masterGrammarCourse.resources.formalReplacements.map(([a,b]) => <div key={a} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-sm"><span>{a}</span><ArrowRight className="h-4 w-4 text-emerald-700" /><strong className="text-emerald-900">{b}</strong></div>)}</div></section><section className="rounded-2xl border bg-white p-5 sm:p-6"><h3 className="font-display text-xl font-bold text-pine">Confused-word bank</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{masterGrammarCourse.resources.confusedWords.map(([a,b,c,d]) => <div key={`${a}-${c}`} className="rounded-xl border p-4 text-sm"><p><strong className="text-emerald-900">{a}</strong> — {b}</p><p className="mt-2"><strong className="text-emerald-900">{c}</strong> — {d}</p></div>)}</div></section><section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><h3 className="font-display text-lg font-bold text-pine">Preposition & collocation bank</h3><div className="mt-4 flex flex-wrap gap-2">{masterGrammarCourse.resources.collocations.map((item) => <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{item}</span>)}</div></div><div className="rounded-2xl border bg-white p-5"><h3 className="font-display text-lg font-bold text-pine">Troublesome irregular verbs</h3><div className="mt-4 space-y-2">{masterGrammarCourse.resources.irregularVerbs.map(([a,b,c]) => <div key={a} className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs"><strong>{a}</strong><span>{b}</span><span>{c}</span></div>)}</div></div></section><section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"><h3 className="font-display text-lg font-bold text-pine">Four-week maintenance loop</h3><ul className="mt-3 space-y-2">{masterGrammarCourse.resources.maintenance.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>)}</ul></section></div>}

          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border bg-white p-4"><button type="button" disabled={activeDay.day<=1} onClick={() => selectDay(activeDay.day-1)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-pine disabled:opacity-35"><ArrowLeft className="h-4 w-4" /> Previous day</button><button type="button" onClick={toggleComplete} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${progress.completed.includes(activeDay.day) ? 'bg-emerald-100 text-emerald-900' : 'bg-pine text-white'}`}>{progress.completed.includes(activeDay.day) ? <CheckCircle2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}{progress.completed.includes(activeDay.day) ? 'Day completed' : 'Complete this day'}</button><button type="button" disabled={activeDay.day>=30} onClick={() => selectDay(activeDay.day+1)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-pine disabled:opacity-35">Next day <ArrowRight className="h-4 w-4" /></button></div>
        </div>
      </section>
    </main>
  </div>
}
