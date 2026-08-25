import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowRight, BarChart3, BookOpenCheck, ChevronDown,
  FileSearch, Loader2, Search,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import QuestionPagination from '@/components/QuestionPagination'
import {
  loadPastPaperAnalysis,
  type PastPaperAnalysisData,
  type PastPaperAnalysisTopic,
  type PastPaperQuestion,
} from '@/lib/pastPaperAnalysis'
import { questionPageRange } from '@/lib/questionPagination'

function normalized(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

function syllabusLink(subjectSlug: string, topic?: string) {
  return `/fpsc-syllabus?subject=${encodeURIComponent(subjectSlug)}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}`
}

interface VisibleTopic {
  topic: PastPaperAnalysisTopic
  questions: PastPaperQuestion[]
}

function PastPaperQuestionPage({ questions }: { questions: PastPaperQuestion[] }) {
  const [page, setPage] = useState(1)
  const range = questionPageRange(page, questions.length)
  const visible = questions.slice(range.start, range.end)

  useEffect(() => setPage(1), [questions])

  return (
    <div className="mt-3">
      <div className="space-y-2">
        {visible.map((question, index) => (
          <div key={question.id} className="rounded-lg border bg-white p-3">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              <span>Q{range.start + index + 1}</span><span>·</span><span>{question.year}</span><span>·</span>
              {question.paper !== 'Single Paper' && <><span>{question.paper}</span><span>·</span></>}
              <span>{question.number}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{question.text}</p>
          </div>
        ))}
      </div>
      <QuestionPagination currentPage={page} totalItems={questions.length} onPageChange={setPage} itemLabel="Past-paper questions" className="mt-4" />
    </div>
  )
}

export default function CssPastPaperAnalysis() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<PastPaperAnalysisData | null>(null)
  const [error, setError] = useState('')
  const [selectedSlug, setSelectedSlug] = useState(params.get('subject') ?? '')
  const [query, setQuery] = useState(params.get('search') ?? '')
  const [year, setYear] = useState(params.get('year') ?? 'all')
  const [openTopics, setOpenTopics] = useState<Set<string>>(() => {
    const requested = params.get('topic')
    return new Set(requested ? [requested] : [])
  })

  useEffect(() => {
    loadPastPaperAnalysis()
      .then((value) => {
        setData(value)
        const initialSearch = new URLSearchParams(window.location.search)
        const requestedSubject = initialSearch.get('subject')
        setSelectedSlug(value.subjects.some((subject) => subject.slug === requestedSubject)
          ? requestedSubject!
          : value.subjects[0]?.slug ?? '')
        const requestedTopic = initialSearch.get('topic')
        if (requestedTopic) setOpenTopics(new Set([requestedTopic]))
      })
      .catch(() => setError('The topic-wise past-paper analysis could not be loaded.'))
  }, []) // URL parameters seed the first view; filters then stay responsive in-place.

  useEffect(() => {
    if (!data) return
    const requestedTopic = new URLSearchParams(window.location.search).get('topic')
    if (!requestedTopic) return
    const timeout = window.setTimeout(() => {
      document.getElementById(requestedTopic)?.scrollIntoView({ block: 'center', behavior: 'auto' })
    }, 420)
    return () => window.clearTimeout(timeout)
  }, [data, selectedSlug])

  const selected = data?.subjects.find((subject) => subject.slug === selectedSlug) ?? data?.subjects[0] ?? null
  const requestedSection = params.get('section')
  const visibleSections = useMemo(() => {
    if (!selected) return []
    const needle = normalized(query)
    const requestedSectionIndex = requestedSection === null ? null : Number(requestedSection)
    return selected.sections.flatMap((section) => {
      const sourceTopics = requestedSectionIndex === null
        ? section.topics
        : section.topics.filter((topic) => (topic.syllabusSectionIndex ?? section.syllabusSectionIndex) === requestedSectionIndex)
      if (!sourceTopics.length) return []
      const sectionMatches = !needle || normalized(section.title).includes(needle)
      const topics: VisibleTopic[] = sourceTopics.flatMap((topic) => {
        const topicMatches = sectionMatches || normalized(`${topic.title} ${topic.analysis.join(' ')}`).includes(needle)
        const questions = topic.questions.filter((question) => {
          if (year !== 'all' && question.year !== Number(year)) return false
          return topicMatches || normalized(`${question.number} ${question.text}`).includes(needle)
        })
        return questions.length ? [{ topic, questions }] : []
      })
      return topics.length ? [{ section, topics }] : []
    })
  }, [query, requestedSection, selected, year])

  const visibleQuestions = visibleSections.reduce(
    (total, section) => total + section.topics.reduce((count, topic) => count + topic.questions.length, 0),
    0,
  )
  function chooseSubject(slug: string) {
    setSelectedSlug(slug)
    setOpenTopics(new Set())
    const next = new URLSearchParams(params)
    next.set('subject', slug)
    next.delete('topic')
    next.delete('section')
    setParams(next, { replace: true })
  }

  function toggleTopic(id: string) {
    setOpenTopics((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="CSS Past Paper Analysis"
        description="Explore original CSS descriptive questions by official syllabus area, topic and year—then move directly into the connected syllabus tracker and study planner."
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</p>}
        {!data && !error && <div className="grid min-h-72 place-items-center rounded-2xl border bg-white"><Loader2 className="h-7 w-7 animate-spin text-pine" /></div>}

        {data && <>
          <section className="overflow-hidden rounded-2xl bg-pine text-white" aria-labelledby="analysis-overview-title">
            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-end">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-amber-300">Syllabus → evidence → preparation plan</p>
                <h2 id="analysis-overview-title" className="mt-2 max-w-3xl font-display text-2xl font-bold leading-tight sm:text-4xl">See exactly which areas FPSC has tested.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100">Question wording, topic placement and year labels are preserved from the supplied analysis for accurate, focused preparation.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {[
                  [data.stats.questions.toLocaleString(), 'Questions'],
                  [data.stats.topics.toLocaleString(), 'Topic groups'],
                  [data.stats.subjects.toLocaleString(), 'Subjects'],
                  [`${data.stats.years[0]}–${data.stats.years.at(-1)}`, 'Coverage years'],
                ].map(([value, label]) => <div key={label} className="rounded-xl bg-white/10 p-3 text-center ring-1 ring-white/10"><strong className="block text-xl">{value}</strong><span className="text-[10px] text-emerald-100">{label}</span></div>)}
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
            <aside className="rounded-xl border bg-white p-3 lg:sticky lg:top-24 lg:self-start" aria-label="Past-paper analysis subjects">
              <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search this subject analysis</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topic or question…" className="h-11 w-full rounded-lg border pl-9 pr-3 text-sm" /></label>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_8rem] gap-2 lg:grid-cols-1">
                <select value={selected?.slug ?? ''} onChange={(event) => chooseSubject(event.target.value)} className="h-11 min-w-0 rounded-lg border bg-white px-3 text-sm lg:hidden" aria-label="Choose a CSS subject">{data.subjects.map((subject) => <option key={subject.slug} value={subject.slug}>{subject.name}</option>)}</select>
                <select value={year} onChange={(event) => setYear(event.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm" aria-label="Filter by year"><option value="all">All years</option>{data.stats.years.map((value) => <option key={value} value={value}>{value}</option>)}</select>
              </div>
              <div className="mt-2 hidden max-h-[40rem] space-y-1 overflow-y-auto pr-1 lg:block">{data.subjects.map((subject) => <button key={subject.slug} type="button" onClick={() => chooseSubject(subject.slug)} className={`w-full rounded-lg px-3 py-2.5 text-left ${selected?.slug === subject.slug ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-secondary/60'}`}><span className="block text-xs font-bold">{subject.name}</span><span className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>{subject.topicCount} topics</span><span>{subject.questionCount} questions</span></span></button>)}</div>
            </aside>

            <div className="min-w-0 space-y-4">
              {selected && <section className="rounded-xl border bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Topic-wise CSS evidence bank</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">{selected.name}</h2><p className="mt-1 text-xs text-muted-foreground">{selected.topicCount} topic groups · {selected.questionCount} questions · {selected.years.join(', ')}</p></div>
                  <Link to={`/fpsc-syllabus?subject=${encodeURIComponent(selected.slug)}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-pine px-3 text-xs font-bold text-white">Open official syllabus <ArrowRight className="h-4 w-4" /></Link>
                </div>
                <p className="mt-3 rounded-lg bg-secondary/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{selected.frequentTopics}</p>
              </section>}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-xs">
                <span className="font-bold text-pine">{visibleQuestions.toLocaleString()} question{visibleQuestions === 1 ? '' : 's'} in this view</span>
                <span className="text-muted-foreground">{visibleSections.reduce((sum, section) => sum + section.topics.length, 0)} matching topic groups</span>
              </div>

              {visibleSections.map(({ section, topics }) => <section key={section.title} className="overflow-hidden rounded-xl border bg-white">
                <div className="border-b bg-secondary/35 px-4 py-3 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Official syllabus area</p><h3 className="mt-1 text-sm font-bold leading-snug text-pine sm:text-base">{section.title}</h3></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-900">{topics.reduce((sum, item) => sum + item.questions.length, 0)} questions</span></div></div>
                <div className="space-y-2 p-3 sm:p-4">{topics.map(({ topic, questions }) => {
                  const open = openTopics.has(topic.id)
                  return <article key={topic.id} id={topic.id} className="overflow-hidden rounded-lg border">
                    <button type="button" onClick={() => toggleTopic(topic.id)} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-3 text-left hover:bg-secondary/30 sm:px-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><BarChart3 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold leading-snug text-pine">{topic.title}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{questions.length} question{questions.length === 1 ? '' : 's'} · {Array.from(new Set(questions.map((question) => question.year))).sort().join(', ')}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-emerald-700 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
                    {open && <div className="border-t bg-secondary/20 p-3 sm:p-4">
                      <div className="flex flex-wrap gap-2">{topic.analysis.map((line) => <span key={line} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-border">{line}</span>)}</div>
                      <PastPaperQuestionPage questions={questions} />
                      <Link to={syllabusLink(selected!.slug, topic.syllabusItemIndexes.length ? topic.title : undefined)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50"><BookOpenCheck className="h-4 w-4" /> Find this area in the syllabus & planner</Link>
                    </div>}
                  </article>
                })}</div>
              </section>)}

              {!visibleSections.length && <div className="rounded-xl border border-dashed bg-white px-6 py-14 text-center"><FileSearch className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 text-sm font-bold text-pine">No questions match these filters.</p><button type="button" onClick={() => { setQuery(''); setYear('all') }} className="mt-3 text-xs font-bold text-emerald-800 underline underline-offset-2">Clear search and year</button></div>}
            </div>
          </div>
        </>}
      </main>
    </div>
  )
}
