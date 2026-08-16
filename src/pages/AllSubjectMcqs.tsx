import { useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Search, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'

type SubjectSummary = { slug: string; name: string; designation: 'compulsory' | 'optional'; group: number | null; count: number; topics: string[]; file: string }
type SubjectIndex = { batch: string; subjects: SubjectSummary[] }
type SubjectQuestion = { id: string; subject: string; topic: string; question: string; options: string[]; answer: number; explanation?: string | null; sourceDocument: string; source?: string | null }
type Mode = 'topic' | 'mixed' | 'unanswered' | 'incorrect' | 'bookmarked'
type Stored = { answers: Record<string, number>; bookmarks: string[] }

const progressKey = 'cssvista:subject-mcq-progress:v1'
const emptyProgress: Stored = { answers: {}, bookmarks: [] }

function loadProgress(): Stored {
  try { return { ...emptyProgress, ...JSON.parse(localStorage.getItem(progressKey) ?? '{}') } } catch { return emptyProgress }
}

export default function AllSubjectMcqs() {
  const [index, setIndex] = useState<SubjectIndex | null>(null)
  const [selected, setSelected] = useState<SubjectSummary | null>(null)
  const [bank, setBank] = useState<SubjectQuestion[]>([])
  const [loadingBank, setLoadingBank] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [topic, setTopic] = useState('All topics')
  const [mode, setMode] = useState<Mode>('topic')
  const [query, setQuery] = useState('')
  const [subjectQuery, setSubjectQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [progress, setProgress] = useState<Stored>(loadProgress)
  const [retryIds, setRetryIds] = useState<string[]>([])

  useEffect(() => {
    fetch('/css-subject-mcqs/index.json')
      .then((response) => {
        if (!response.ok) throw new Error(`MCQ index returned ${response.status}`)
        return response.json()
      })
      .then(setIndex)
      .catch(() => setLoadError('The subject index could not be loaded. Please retry.'))
  }, [])
  useEffect(() => { localStorage.setItem(progressKey, JSON.stringify(progress)) }, [progress])

  async function openSubject(subject: SubjectSummary) {
    setSelected(subject); setTopic('All topics'); setMode('topic'); setCursor(0); setRetryIds([]); setLoadingBank(true); setLoadError(null)
    try {
      const response = await fetch(`/css-subject-mcqs/${subject.file}`)
      if (!response.ok) throw new Error(`Subject bank returned ${response.status}`)
      const questions = await response.json()
      if (!Array.isArray(questions)) throw new Error('Subject bank is not a question list')
      setBank(questions)
    } catch {
      setBank([])
      setLoadError(`${subject.name} could not be loaded. Please retry.`)
    } finally { setLoadingBank(false) }
  }

  const visibleSubjects = useMemo(() => {
    const needle = subjectQuery.trim().toLowerCase()
    return index?.subjects.filter((subject) => !needle || `${subject.name} ${subject.topics.join(' ')}`.toLowerCase().includes(needle)) ?? []
  }, [index, subjectQuery])
  const retrySet = useMemo(() => new Set(retryIds), [retryIds])

  const questions = useMemo(() => {
    const saved = new Set(progress.bookmarks)
    let result = bank.filter((item) => topic === 'All topics' || item.topic === topic)
    if (mode === 'unanswered') result = result.filter((item) => progress.answers[item.id] === undefined)
    if (mode === 'incorrect') result = retryIds.length
      ? result.filter((item) => retrySet.has(item.id))
      : result.filter((item) => progress.answers[item.id] !== undefined && progress.answers[item.id] !== item.answer)
    if (mode === 'bookmarked') result = result.filter((item) => saved.has(item.id))
    const needle = query.trim().toLowerCase()
    if (needle) result = result.filter((item) => `${item.question} ${item.options.join(' ')}`.toLowerCase().includes(needle))
    if (mode === 'mixed') result = [...result].sort((a, b) => a.id.slice(-8).localeCompare(b.id.slice(-8)))
    return result
    // Progress intentionally updates this filtered collection.
  }, [bank, mode, progress, query, retryIds.length, retrySet, topic])

  useEffect(() => setCursor(0), [mode, query, topic])
  const item = questions[cursor]
  const selectedAnswer = item ? progress.answers[item.id] : undefined
  const bookmarked = item ? progress.bookmarks.includes(item.id) : false

  function answer(indexValue: number) {
    if (!item || selectedAnswer !== undefined) return
    setProgress((state) => ({ ...state, answers: { ...state.answers, [item.id]: indexValue } }))
  }
  function toggleBookmark() {
    if (!item) return
    setProgress((state) => ({ ...state, bookmarks: state.bookmarks.includes(item.id) ? state.bookmarks.filter((id) => id !== item.id) : [...state.bookmarks, item.id] }))
  }
  function retryIncorrect() {
    const base = bank.filter((question) => topic === 'All topics' || question.topic === topic)
    const incorrectIds = base.filter((question) => progress.answers[question.id] !== undefined && progress.answers[question.id] !== question.answer).map((question) => question.id)
    if (!incorrectIds.length) return
    setRetryIds(incorrectIds)
    setProgress((state) => ({ ...state, answers: Object.fromEntries(Object.entries(state.answers).filter(([id]) => !incorrectIds.includes(id))) }))
    setMode('incorrect'); setCursor(0)
  }

  const answeredCount = bank.filter((question) => progress.answers[question.id] !== undefined).length
  const correctCount = bank.filter((question) => progress.answers[question.id] === question.answer).length
  const rtl = item ? /[\u0600-\u06ff\u0750-\u077f]/.test(`${item.question} ${item.options.join(' ')}`) : false

  return (
    <div>
      <PageHeader title="ALL CSS SUBJECTS MCQs" description="Compulsory and optional MCQs classified by the shared FPSC subject taxonomy, checked for answer completeness and loaded one subject at a time." />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {!selected ? (
          <>
            <label className="relative block"><span className="sr-only">Search subjects</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={subjectQuery} onChange={(event) => setSubjectQuery(event.target.value)} placeholder="Search subjects or syllabus areas…" className="h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700" /></label>
            {!index && !loadError && <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-pine" /></div>}
            {!index && loadError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800"><p>{loadError}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 font-bold">Retry</button></div>}
            {index && (
              <div className="mt-6 space-y-8">
                <section><h2 className="font-display text-xl font-bold text-pine">Compulsory Subjects</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleSubjects.filter((subject) => subject.designation === 'compulsory').map((subject) => <SubjectButton key={subject.slug} subject={subject} onClick={() => openSubject(subject)} />)}</div></section>
                {[1,2,3,4,5,6,7].map((group) => {
                  const subjects = visibleSubjects.filter((subject) => subject.group === group)
                  return subjects.length ? <section key={group}><h2 className="font-display text-xl font-bold text-pine">Optional Group {group}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.map((subject) => <SubjectButton key={subject.slug} subject={subject} onClick={() => openSubject(subject)} />)}</div></section> : null
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setSelected(null); setBank([]); setRetryIds([]); setLoadError(null) }} className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:underline"><ChevronLeft className="h-4 w-4" /> All subjects</button>
            <div className="mt-4 rounded-xl border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-amber-700">{selected.designation === 'optional' ? `Optional Group ${selected.group}` : 'Compulsory'}</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.count.toLocaleString()} accepted questions · {selected.topics.length} syllabus areas</p><p className="mt-1 text-xs font-semibold text-emerald-800">Answered {answeredCount.toLocaleString()} · Correct {correctCount.toLocaleString()} · Incorrect {(answeredCount - correctCount).toLocaleString()}</p></div>{bank.some((question) => progress.answers[question.id] !== undefined && progress.answers[question.id] !== question.answer) && <button type="button" onClick={retryIncorrect} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold text-pine hover:bg-secondary"><RotateCcw className="h-4 w-4" /> Retry Incorrect</button>}</div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]"><select value={topic} onChange={(event) => { setTopic(event.target.value); setRetryIds([]) }} className="h-11 min-w-0 rounded-lg border bg-white px-3 text-sm"><option>All topics</option>{selected.topics.map((value) => <option key={value}>{value}</option>)}</select><div className="flex gap-2 overflow-x-auto">{([['topic','Practice by Topic'],['mixed','Mixed Practice'],['unanswered','Unanswered'],['incorrect','Incorrect'],['bookmarked','Bookmarked']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => { setMode(value); if (value !== 'incorrect') setRetryIds([]) }} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${mode === value ? 'bg-pine text-white' : 'border bg-white text-pine'}`}>{label}</button>)}</div></div>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search within this subject…" className="mt-3 h-10 w-full rounded-lg border px-3 text-sm" />
            </div>

            {loadingBank && <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-pine" /></div>}
            {!loadingBank && loadError && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800"><p>{loadError}</p><button type="button" onClick={() => openSubject(selected)} className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 font-bold">Retry subject</button></div>}
            {!loadingBank && item && (
              <article className="subject-mcq-print print-area mx-auto mt-5 max-w-4xl rounded-xl border bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{item.topic} · {cursor + 1} of {questions.length}</span><div className="flex flex-wrap items-center gap-2"><PrintMenu label="Print MCQ" targetSelector=".subject-mcq-print" /><button type="button" onClick={toggleBookmark} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 font-semibold text-pine">{bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {bookmarked ? 'Bookmarked' : 'Bookmark'}</button></div></div>
                <h3 dir={rtl ? 'rtl' : 'ltr'} className={`mt-4 text-lg font-semibold leading-relaxed text-pine ${rtl ? 'text-right' : ''}`}>{item.question}</h3>
                <div dir={rtl ? 'rtl' : 'ltr'} className="mt-4 grid gap-2">{item.options.map((option, indexValue) => { const submitted = selectedAnswer !== undefined; const correct = submitted && indexValue === item.answer; const wrong = submitted && selectedAnswer === indexValue && indexValue !== item.answer; return <button key={option} type="button" disabled={submitted} onClick={() => answer(indexValue)} className={`min-h-12 rounded-lg border px-4 py-3 text-left text-sm ${rtl ? 'text-right' : ''} ${correct ? 'border-emerald-600 bg-emerald-50' : wrong ? 'border-red-400 bg-red-50' : 'hover:border-emerald-600 hover:bg-emerald-50/50'}`}><strong className="mx-2">{String.fromCharCode(65 + indexValue)}.</strong>{option}</button> })}</div>
                {selectedAnswer !== undefined && <div className="mt-4 rounded-lg bg-secondary/60 p-4 text-sm"><p className={`flex items-center gap-2 font-bold ${selectedAnswer === item.answer ? 'text-emerald-800' : 'text-red-700'}`}>{selectedAnswer === item.answer ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{selectedAnswer === item.answer ? 'Correct' : `Correct answer: ${String.fromCharCode(65 + item.answer)}`}</p>{item.explanation && <p className="mt-2 leading-relaxed">{item.explanation}</p>}{item.source && <p className="mt-2 text-xs text-muted-foreground">Verification recorded in source: {item.source}</p>}</div>}
                <div className="mt-5 flex justify-between gap-3"><button type="button" disabled={cursor === 0} onClick={() => setCursor((value) => value - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-4 text-sm font-bold disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><button type="button" disabled={cursor >= questions.length - 1} onClick={() => setCursor((value) => value + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-pine px-4 text-sm font-bold text-white disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button></div>
              </article>
            )}
            {!loadingBank && !loadError && !item && <p className="mt-5 rounded-xl border border-dashed bg-white p-12 text-center text-sm text-muted-foreground">No questions match this practice view. Change the topic or mode.</p>}
          </>
        )}
      </main>
    </div>
  )
}

function SubjectButton({ subject, onClick }: { subject: SubjectSummary; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md"><h3 className="font-semibold text-pine">{subject.name}</h3><p className="mt-1 text-xs text-muted-foreground">{subject.count.toLocaleString()} MCQs · {subject.topics.length} areas</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800">Start MCQs <ChevronRight className="h-3.5 w-3.5" /></span></button>
}
