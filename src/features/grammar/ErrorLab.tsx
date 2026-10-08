import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Layers, RotateCcw, Target } from 'lucide-react'
import { grammarLessons } from '@/data/grammarCourse'
import { addMistake } from '@/lib/progress'
import type { CourseState } from './state'
import { answerRound, coveredDays, createRound, revisionIds, weakAreas, type LabRound, type PracticeMode } from './practice'
import { QuestionCard, CorrectionCard } from './PracticeCards'

const bank = new Map(grammarLessons.flatMap(lesson => [...lesson.warmUp, ...lesson.drill].map(question => [question.id, { question, lesson }] as const)))
const questions = new Map([...bank].map(([id, entry]) => [id, entry.question]))
const modes = [
  { key: 'targeted' as const, name: 'Focused practice', icon: Target, description: 'Work on one lesson. Missed questions receive priority.' },
  { key: 'mixed' as const, name: 'Mixed practice', icon: Layers, description: 'Apply rules across covered lessons without a topic label first.' },
  { key: 'revision' as const, name: 'Due revision', icon: Clock3, description: 'Revisit questions when their saved review is due.' },
]
const modeName = (mode: PracticeMode) => modes.find(item => item.key === mode)!.name
const date = (at: number) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' }).format(at)
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-40'

export default function ErrorLab({ state, commit, lessonLink, storageMessage, storageFailed, suggestedDay }: {
  state: CourseState; commit: (state: CourseState) => void; lessonLink: (day: number) => string
  storageMessage: string; storageFailed: boolean; suggestedDay?: number
}) {
  const [mode, setMode] = useState<PracticeMode>(state.lab?.mode ?? (state.completed.length === grammarLessons.length ? 'revision' : 'targeted'))
  const [target, setTarget] = useState(suggestedDay ?? state.lab?.day ?? state.currentDay)
  const [pending, setPending] = useState<LabRound | null>(null)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const covered = coveredDays(state, grammarLessons), due = revisionIds(state, now), weak = weakAreas(state, grammarLessons)
  const upcoming = Object.values(state.reviews).filter(r => r.dueAt > now).sort((a, b) => a.dueAt - b.dueAt)[0]
  const round = state.lab, entry = round ? bank.get(round.ids[round.position]) : undefined
  const answered = round ? Object.keys(round.first).length : 0
  const correct = round ? round.ids.filter(id => round.first[id] === bank.get(id)!.question.answer).length : 0
  const missed = round ? round.ids.filter(id => round.first[id] !== undefined && round.first[id] !== bank.get(id)!.question.answer) : []
  const correctionIndex = entry ? Math.max(0, [...entry.lesson.warmUp, ...entry.lesson.drill].findIndex(q => q.id === entry.question.id)) % entry.lesson.corrections.length : 0
  const correction = entry?.lesson.corrections[correctionIndex]
  function patch(patch: Partial<LabRound>) { if (round) commit({ ...state, lab: { ...round, ...patch } }) }
  function start(at: number, id: string) {
    const next = createRound(state, grammarLessons, mode, target, at, id)
    setNow(at)
    if (!next) { setMessage(mode === 'mixed' ? 'Cover at least three lessons to open mixed practice.' : 'No questions are due. You can use focused or mixed practice while waiting.'); return }
    setMessage('')
    if (round && !round.finishedAt && answered > 0) { setPending(next); return }
    commit({ ...state, lab: next })
  }
  function answer(option: number, at: number) {
    if (!entry) return
    const next = answerRound(state, questions, option, at)
    if (next === state) return
    commit(next); setNow(at)
    if (option !== entry.question.answer) addMistake(entry.question.id, option, `Grammar · Day ${entry.lesson.day}: ${entry.lesson.title}`)
  }
  function retry() { if (round && entry) { const answers = { ...round.answers }; delete answers[entry.question.id]; patch({ answers }) } }
  function move(position: number) { patch({ position }); document.getElementById('lab-question')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return <section className="mt-6 space-y-6 [overflow-wrap:anywhere]" aria-label="Grammar Error Lab">
    <div className="overflow-hidden rounded-3xl bg-slate-950 text-white">
      <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-200">Grammar studio · Error Lab</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Turn mistakes into your next practice.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Choose a lesson, mix the rules you have covered, or revisit a due question. Every answer comes with its authored explanation.</p><div className="mt-6 flex flex-wrap gap-3"><span className="rounded-full border border-white/15 px-3 py-2 text-xs">{covered.length} lessons covered</span><span className="rounded-full border border-white/15 px-3 py-2 text-xs">{due.length} questions due</span><span className="rounded-full border border-white/15 px-3 py-2 text-xs">{state.labHistory.length} saved sessions</span></div>{state.completed.length === grammarLessons.length && <p className="mt-4 text-sm text-indigo-200">All 30 days completed. Keep the rules active with mixed practice and due revision.</p>}</div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-5"><p className="text-xs font-semibold text-slate-300">{round ? 'Saved session' : 'Ready when you are'}</p><p className="mt-4 text-xl font-semibold">{round ? modeName(round.mode) : 'Your next practice'}</p><p className="mt-3 text-sm leading-7 text-slate-300">{round ? `${answered}/${round.ids.length} first responses · Question ${round.position + 1}` : 'Start with a lesson you want to strengthen.'}</p>{round && <><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Error Lab responses" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={round.ids.length}><div className="h-full bg-indigo-400 transition-all motion-reduce:transition-none" style={{ width: `${answered / round.ids.length * 100}%` }} /></div><a href="#lab-question" className={`${button} mt-5 bg-indigo-500 text-white`}>{round.finishedAt ? 'Review this session' : 'Continue session'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a></>}</div>
      </div><p role={storageFailed ? 'alert' : 'status'} className={`border-t border-white/10 px-6 py-4 text-xs leading-6 sm:px-8 ${storageFailed ? 'bg-amber-100 text-amber-950' : 'text-slate-300'}`}>{storageMessage}</p>
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        <section id="lab-setup" className="scroll-mt-24 rounded-2xl border bg-white p-5 sm:p-6" aria-label="Choose practice mode">
          <h3 className="text-lg font-semibold text-slate-900">Build your session</h3><div className="mt-4 grid gap-3 sm:grid-cols-3">{modes.map(item => <button key={item.key} type="button" aria-pressed={mode === item.key} onClick={() => { setMode(item.key); setMessage(''); setPending(null) }} className={`rounded-xl border p-4 text-left ${mode === item.key ? 'border-indigo-500 bg-indigo-50' : 'hover:border-indigo-300'}`}><item.icon className="h-5 w-5 text-indigo-600" aria-hidden="true" /><span className="mt-3 block text-sm font-semibold">{item.name}</span><span className="mt-2 block text-xs leading-6 text-slate-600">{item.description}</span></button>)}</div>
          {mode === 'targeted' && <label className="mt-5 block text-sm font-semibold">Lesson to practise<select value={target} onChange={e => { setTarget(Number(e.target.value)); setPending(null) }} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3 text-sm">{grammarLessons.map(d => <option key={d.day} value={d.day}>Day {d.day} · {d.title}</option>)}</select></label>}
          {mode === 'mixed' && <p className="mt-4 text-sm leading-7 text-slate-600">{covered.length < 3 ? `Mixed practice opens after three lessons are covered (${covered.length}/3). Answer all daily drill questions or use preserved completed days.` : `Balanced across ${covered.length} covered lessons. Lesson names appear after you answer.`}</p>}
          {mode === 'revision' && <p className="mt-4 text-sm leading-7 text-slate-600">{due.length ? `${due.length} questions are due. Oldest reviews come first.` : upcoming ? `No questions due. Next review: ${date(upcoming.dueAt)} PKT.` : 'No scheduled questions yet. Start focused practice or attempt a lesson drill.'}</p>}
          <button type="button" onClick={() => start(Date.now(), crypto.randomUUID())} disabled={mode === 'mixed' && covered.length < 3 || mode === 'revision' && !due.length} className={`${button} mt-5 bg-indigo-600 text-white hover:bg-indigo-700`}>{round ? 'Start a new session' : 'Start session'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          <p className="mt-3 text-xs leading-6 text-slate-500">Up to 10 existing authored questions. Questions can recur during review. Original responses determine the saved score.</p>
          {message && <p role="status" className="mt-3 text-sm text-amber-900">{message}</p>}
          {pending && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7"><p>Your current session is unfinished. Starting another replaces its answers and correction drafts. Completed session history and lesson progress remain saved.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setPending(null)} className={`${button} border bg-white`}>Keep current session</button><button type="button" onClick={() => { commit({ ...state, lab: pending }); setPending(null) }} className={`${button} bg-slate-900 text-white`}>Replace unfinished session</button></div></div>}
        </section>
        {round && entry && <section id="lab-question" className="scroll-mt-24 space-y-4" aria-label="Practice question">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Question {round.position + 1} of {round.ids.length}</h3><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{modeName(round.mode)}</span></div>
          <ol><QuestionCard question={entry.question} index={round.position} answer={round.answers[entry.question.id]} onAnswer={answer} onRetry={retry} /></ol>
          {round.answers[entry.question.id] !== undefined && <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-7"><p className="font-semibold">Day {entry.lesson.day} · {entry.lesson.title}</p><Link to={lessonLink(entry.lesson.day)} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-indigo-700"><BookOpen className="h-4 w-4" aria-hidden="true" />Review this lesson</Link><p className="mt-2 text-xs text-slate-600">First response: {round.first[entry.question.id] === entry.question.answer ? 'correct' : 'needs review'}. A retry does not change it.</p></div>}
          <nav aria-label="Error Lab question navigation" className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={round.position === 0} onClick={() => move(round.position - 1)} className={`${button} border bg-white`}><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button><button type="button" disabled={round.position === round.ids.length - 1 || round.first[entry.question.id] === undefined} onClick={() => move(round.position + 1)} className={`${button} bg-indigo-600 text-white`}>Next question<ChevronRight className="h-4 w-4" aria-hidden="true" /></button></nav>
          {correction && round.answers[entry.question.id] !== undefined && <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer text-sm font-semibold">Writing practice from this lesson</summary><p className="my-3 text-xs leading-6 text-slate-500">Apply a rule from the same lesson. Compare with the model yourself; valid alternatives are possible. This does not change the MCQ score.</p><ol><CorrectionCard index={correctionIndex} {...correction} draft={round.drafts[correction.id] ?? ''} onDraft={text => patch({ drafts: { ...round.drafts, [correction.id]: text } })} revealed={round.revealed.includes(correction.id)} onReveal={() => patch({ revealed: [...round.revealed, correction.id] })} /></ol></details>}
        </section>}
        {round?.finishedAt && <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6" aria-label="Session result"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Session saved</p><h3 className="mt-2 text-2xl font-semibold">{correct}/{round.ids.length} correct on first responses</h3><p className="mt-3 text-sm leading-7 text-slate-600">{missed.length ? 'Read the rules below, then revisit the scheduled questions after a day.' : 'Keep applying these rules in your writing and revisit them when due.'} A practice result is not a mastery certificate.</p>{missed.length > 0 && <ul className="mt-4 space-y-3">{missed.map(id => { const source = bank.get(id)!; return <li key={id} className="rounded-xl bg-white p-4 text-sm leading-7"><p className="font-semibold">{source.question.prompt}</p><p className="mt-2 text-slate-600">{source.question.why}</p><Link to={lessonLink(source.lesson.day)} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-indigo-700">Day {source.lesson.day}: {source.lesson.title}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link></li> })}</ul>}</section>}
      </div>
      <aside className="min-w-0 space-y-5">
        <section className="rounded-2xl border bg-white p-5"><h3 className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-indigo-600" aria-hidden="true" />Areas to revisit</h3><p className="mt-2 text-xs leading-6 text-slate-500">Missed questions stay here until two successful spaced reviews. Counts refer to questions, not mastery.</p>{weak.length ? <ul className="mt-4 space-y-2">{weak.slice(0, 5).map(item => <li key={item.day}><button type="button" onClick={() => { setMode('targeted'); setTarget(item.day); setPending(null); document.getElementById('lab-setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="w-full rounded-xl bg-slate-50 p-3 text-left text-sm"><span className="block font-semibold">Day {item.day} · {grammarLessons.find(d => d.day === item.day)!.title}</span><span className="mt-1 block text-xs text-slate-500">{item.missed} questions need review</span></button></li>)}</ul> : <p className="mt-4 text-sm leading-7 text-slate-500">No unresolved mistakes recorded. Practice will help identify what needs attention.</p>}</section>
        <section className="rounded-2xl border bg-white p-5"><h3 className="flex items-center gap-2 font-semibold"><RotateCcw className="h-4 w-4 text-indigo-600" aria-hidden="true" />Revision rhythm</h3><p className="mt-3 text-sm leading-7 text-slate-600">Reviews move through 1, 3, 7, 14 and 30 days after spaced correct answers. A wrong answer brings the question back in a day. Same-day retries do not advance the schedule.</p><p className="mt-3 text-xs leading-6 text-slate-500">Review dates use Pakistan Standard Time. Your browser clock determines when a review is due.</p></section>
        <section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Recent sessions</h3>{state.labHistory.length ? <ol className="mt-4 space-y-4">{state.labHistory.slice(-10).reverse().map(result => <li key={result.id} className="border-b pb-3 text-sm last:border-0"><p className="font-semibold">{modeName(result.mode)} · {result.ids.filter(id => result.first[id] === bank.get(id)!.question.answer).length}/{result.ids.length}</p><p className="mt-1 text-xs leading-6 text-slate-500">{date(result.at)} PKT · First responses</p></li>)}</ol> : <p className="mt-3 text-sm leading-7 text-slate-500">Complete a session to save its first-response result here.</p>}<p className="mt-3 text-xs leading-6 text-slate-500">Last 50 completed sessions retained on this device.</p></section>
      </aside>
    </div>
  </section>
}
