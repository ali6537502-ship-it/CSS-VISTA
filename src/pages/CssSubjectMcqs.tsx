import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Layers3, Loader2,
  RotateCcw, Search, ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import McqCard from '@/components/McqCard'
import { compulsorySubjects, optionalGroups } from '@/data/syllabus'
import {
  cssSubjectSlug, getCssSubjectMcqBank, getCssSubjectMcqIndex, toBankQuestion,
  type CssSubjectMcqIndex, type CssSubjectMcqSummary, type CssSubjectQuestion,
} from '@/data/cssSubjectMcqs'
import type { BankQuestion } from '@/data/mcq'
import { getAttempt, savedMcqIds } from '@/lib/progress'

type View = 'all' | 'compulsory' | 'optional'
type PracticeMode = 'topic' | 'unanswered' | 'incorrect' | 'saved'

interface SubjectBankSlot {
  slug: string
  name: string
  marks: number
  kind: 'Compulsory' | 'Optional'
  group?: number
}

const subjectSlots: SubjectBankSlot[] = [
  ...compulsorySubjects.map((subject) => ({
    slug: subject.slug,
    name: subject.name,
    marks: subject.marks,
    kind: 'Compulsory' as const,
  })),
  ...optionalGroups.flatMap((group) => group.subjects.map((subject) => ({
    slug: cssSubjectSlug(subject.name),
    name: subject.name,
    marks: subject.marks,
    kind: 'Optional' as const,
    group: group.group,
  }))),
].filter((subject) => ![
  'English Essay',
  'English (Precis & Composition)',
].includes(subject.name))

const comparableName = (value: string) => value
  .toLocaleLowerCase()
  .replace(/\/?\s*comparative\s+(?:study\s+of\s+major\s+)?religions?/g, '')
  .replace(/&/g, 'and')
  .replace(/sciences/g, 'science')
  .replace(/[^a-z0-9]+/g, '')

export default function CssSubjectMcqs() {
  const [index, setIndex] = useState<CssSubjectMcqIndex | null>(null)
  const [selected, setSelected] = useState<CssSubjectMcqSummary | null>(null)
  const [rawBank, setRawBank] = useState<CssSubjectQuestion[]>([])
  const [bank, setBank] = useState<BankQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('compulsory')
  const [group, setGroup] = useState<number | 'all'>('all')
  const [query, setQuery] = useState('')
  const [withinQuery, setWithinQuery] = useState('')
  const [topic, setTopic] = useState('All topics')
  const [mode, setMode] = useState<PracticeMode>('topic')
  const [cursor, setCursor] = useState(0)
  const [progressVersion, setProgressVersion] = useState(0)

  useEffect(() => {
    getCssSubjectMcqIndex()
      .then(setIndex)
      .catch(() => setError('The supplied subject-bank index could not be loaded. Please retry.'))
      .finally(() => setLoading(false))
  }, [])

  const banksByName = useMemo(() => new Map(
    (index?.subjects ?? []).map((subject) => [comparableName(subject.name), subject]),
  ), [index])

  const directory = useMemo(() => subjectSlots.map((slot) => ({
    ...slot,
    bank: banksByName.get(comparableName(slot.name)),
  })), [banksByName])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return directory.filter((subject) => {
      if (view === 'compulsory' && subject.kind !== 'Compulsory') return false
      if (view === 'optional' && subject.kind !== 'Optional') return false
      if (group !== 'all' && subject.group !== group) return false
      return !needle || `${subject.name} ${subject.kind} group ${subject.group ?? ''}`.toLocaleLowerCase().includes(needle)
    })
  }, [directory, group, query, view])

  const visibleQuestions = useMemo(() => {
    void progressVersion
    const saved = new Set(savedMcqIds())
    const needle = withinQuery.trim().toLocaleLowerCase()
    return bank.filter((question) => {
      if (topic !== 'All topics' && question.s !== topic) return false
      const attempt = getAttempt(question.id)
      if (mode === 'unanswered' && attempt) return false
      if (mode === 'incorrect' && attempt?.c !== false) return false
      if (mode === 'saved' && !saved.has(question.id)) return false
      return !needle || `${question.q} ${question.o.join(' ')}`.toLocaleLowerCase().includes(needle)
    })
    // progressVersion refreshes the filters after answers, saves and mistake actions.
  }, [bank, mode, progressVersion, topic, withinQuery])

  const currentQuestion = visibleQuestions[cursor]
  const currentSource = currentQuestion
    ? rawBank.find((question) => question.id === currentQuestion.id)
    : null
  const answeredCount = bank.filter((question) => Boolean(getAttempt(question.id))).length
  const correctCount = bank.filter((question) => getAttempt(question.id)?.c).length

  useEffect(() => setCursor(0), [mode, topic, withinQuery])
  useEffect(() => {
    if (cursor >= visibleQuestions.length) setCursor(Math.max(0, visibleQuestions.length - 1))
  }, [cursor, visibleQuestions.length])

  function chooseView(next: View) {
    setView(next)
    if (next !== 'optional') setGroup('all')
  }

  async function openSubject(subject: CssSubjectMcqSummary) {
    setSelected(subject)
    setLoading(true)
    setError('')
    setTopic('All topics')
    setMode('topic')
    setWithinQuery('')
    setCursor(0)
    try {
      const questions = await getCssSubjectMcqBank(subject)
      setRawBank(questions)
      setBank(questions.map(toBankQuestion))
    } catch {
      setRawBank([])
      setBank([])
      setError(`${subject.name} could not be loaded. Please retry.`)
    } finally {
      setLoading(false)
    }
  }

  if (selected) {
    return (
      <div>
        <PageHeader
          title={selected.name}
          description="Focused CSS subject practice from the complete structurally validated owner-supplied bank. Every answer, save, response time and mistake connects to the existing progress system."
        />
        <main className="mx-auto max-w-6xl px-4 py-7 sm:py-9">
          <button type="button" onClick={() => { setSelected(null); setRawBank([]); setBank([]); setError('') }} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-emerald-800 hover:underline">
            <ArrowLeft className="h-4 w-4" /> All CSS subjects
          </button>

          <section className="mt-3 rounded-xl border bg-white p-4 sm:p-5" aria-label="Subject practice controls">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-amber-700">
                  {selected.designation === 'optional' ? `Optional Group ${selected.group}` : 'Compulsory'} · supplied bank
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-pine sm:text-2xl">{selected.name} MCQs</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.count.toLocaleString()} structurally complete questions from {selected.sourceCount.toLocaleString()} detected source items · {selected.topics.length} syllabus areas
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-800">
                  {answeredCount} answered · {correctCount} correct · {Math.max(0, answeredCount - correctCount)} incorrect
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-950 lg:max-w-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Four-option structure, answer index, duplicates, source metadata and malformed text were checked. Facts remain source-supplied and can be reported from each question.</span>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="h-11 min-w-0 rounded-lg border bg-white px-3 text-sm" aria-label="Select syllabus area">
                <option>All topics</option>
                {selected.topics.map((item) => <option key={item}>{item}</option>)}
              </select>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <span className="sr-only">Search within this subject</span>
                <input value={withinQuery} onChange={(event) => setWithinQuery(event.target.value)} placeholder="Search within this subject…" className="h-11 w-full rounded-lg border pl-9 pr-3 text-sm" />
              </label>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Practice mode">
              {([
                ['topic', 'Practice'], ['unanswered', 'Unanswered'], ['incorrect', 'Mistakes'], ['saved', 'Bookmarks'],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${mode === value ? 'bg-pine text-white' : 'border bg-white text-pine'}`}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          {loading && <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-pine" /></div>}
          {!loading && error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
              <p>{error}</p>
              <button type="button" onClick={() => openSubject(selected)} className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 font-bold">Retry</button>
            </div>
          )}
          {!loading && !error && currentQuestion && (
            <section className="mx-auto mt-5 max-w-4xl" aria-label="Current subject question">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Question {cursor + 1} of {visibleQuestions.length}</span>
                <span>{currentQuestion.s}</span>
              </div>
              <McqCard q={currentQuestion} num={cursor + 1} catName={selected.name} onAction={() => setProgressVersion((value) => value + 1)} />
              {currentSource && (
                <p className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  Supplied academic source: {currentSource.source || currentSource.sourceDocument}. Use Report on the question if an answer needs review.
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <button type="button" disabled={cursor === 0} onClick={() => setCursor((value) => Math.max(0, value - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-lg border bg-white px-4 text-sm font-bold disabled:opacity-40">
                  <ArrowLeft className="h-4 w-4" /> Previous
                </button>
                <button type="button" disabled={cursor >= visibleQuestions.length - 1} onClick={() => setCursor((value) => Math.min(visibleQuestions.length - 1, value + 1))} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-pine px-4 text-sm font-bold text-white disabled:opacity-40">
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}
          {!loading && !error && !currentQuestion && (
            <div className="mt-5 rounded-xl border border-dashed bg-white p-10 text-center">
              <RotateCcw className="mx-auto h-6 w-6 text-emerald-800" />
              <p className="mt-2 text-sm font-semibold text-pine">No questions in this view</p>
              <p className="mt-1 text-xs text-muted-foreground">Change the topic or choose another practice filter.</p>
              <button type="button" onClick={() => { setMode('topic'); setTopic('All topics'); setWithinQuery('') }} className="mt-3 rounded-lg border px-4 py-2 text-sm font-bold text-pine">Reset filters</button>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="All CSS Subject MCQs"
        description="Quality-gated banks for compulsory and optional papers. Every official subject remains visible while additional questions complete academic review."
      />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <section className="overflow-hidden rounded-2xl bg-pine text-white shadow-sm" aria-label="MCQ bank overview">
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">CSS written subjects</p>
              <h2 className="mt-2 max-w-2xl font-display text-xl font-bold leading-tight sm:text-2xl">Pick your subject. Challenge your recall. Master the paper.</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/10 px-4 py-3"><strong className="block text-xl">{index?.subjects.length ?? '–'}</strong><span className="text-[10px] text-emerald-100">Active subjects</span></div>
              <div className="rounded-xl bg-white/10 px-4 py-3"><strong className="block text-xl">{index?.total.toLocaleString() ?? '–'}</strong><span className="text-[10px] text-emerald-100">Practice MCQs</span></div>
            </div>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="subject-bank-directory">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 id="subject-bank-directory" className="font-display text-xl font-bold text-pine">Choose a subject</h2><p className="mt-1 text-xs text-muted-foreground">Inactive syllabus slots stay visible so the official subject hierarchy remains complete.</p></div>
            <label className="relative block sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search CSS subjects</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a CSS subject…" className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" /></label>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Filter subject type">
            {(['all', 'compulsory', 'optional'] as const).map((item) => <button key={item} type="button" onClick={() => chooseView(item)} aria-pressed={view === item} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${view === item ? 'bg-pine text-white' : 'border bg-white text-slate-700 hover:border-emerald-700/40'}`}>{item === 'all' ? 'All subjects' : item === 'compulsory' ? 'Compulsory' : 'Optional'}</button>)}
          </div>
          {view === 'optional' && <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filter optional group"><button type="button" onClick={() => setGroup('all')} aria-pressed={group === 'all'} className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold ${group === 'all' ? 'bg-emerald-100 text-emerald-950' : 'bg-secondary text-slate-600'}`}>All groups</button>{optionalGroups.map((item) => <button key={item.group} type="button" onClick={() => setGroup(item.group)} aria-pressed={group === item.group} className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold ${group === item.group ? 'bg-emerald-100 text-emerald-950' : 'bg-secondary text-slate-600'}`}>Group {item.group}</button>)}</div>}

          {loading && <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-pine" /></div>}
          {!loading && error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800">{error}</p>}
          {!loading && !error && <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((subject) => {
              const Icon = subject.kind === 'Compulsory' ? BookOpenCheck : Layers3
              return <button key={`${subject.kind}-${subject.slug}`} type="button" disabled={!subject.bank} onClick={() => subject.bank && openSubject(subject.bank)} className={`flex min-h-[78px] items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors ${subject.bank ? 'hover:border-emerald-700/40 hover:bg-emerald-50/40' : 'cursor-default'}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{subject.kind}{subject.group ? ` · Group ${subject.group}` : ''} · {subject.marks} marks</span><span className="mt-0.5 block text-sm font-bold leading-snug text-slate-900">{subject.name}</span><span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${subject.bank ? 'text-emerald-700' : 'text-slate-400'}`}>{subject.bank ? <><CheckCircle2 className="h-3 w-3" /> {subject.bank.count.toLocaleString()} practice MCQs</> : 'No supplied question file'}</span></span>
                {subject.bank && <ArrowRight className="h-4 w-4 shrink-0 text-emerald-700" />}
              </button>
            })}
          </div>}
          {!loading && !error && !filtered.length && <p className="mt-5 rounded-xl border border-dashed bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">No subject matches this search.</p>}
        </section>
      </main>
    </div>
  )
}
