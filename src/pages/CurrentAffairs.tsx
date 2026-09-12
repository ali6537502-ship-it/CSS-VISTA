import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BookOpen, CheckCircle2, ChevronDown, Download, ExternalLink, FileText, Loader2, Newspaper, Printer, Search, X } from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { caIssues } from '@/data/currentAffairs'
import { weeklyMagazine, weeklyMagazines } from '@/data/weeklyMagazine'
import { mergedCaTopics, type CaTopic } from '@/lib/admin'
import { addMistake, getAttempt, getMistakes, recordAttempt, recordQuestionTiming } from '@/lib/progress'
import { printPdfFile } from '@/components/PrintMenu'
import { usePageBack } from '@/lib/backNavigation'
import QuestionPagination from '@/components/QuestionPagination'
import { QUESTIONS_PER_PAGE, clampQuestionPage } from '@/lib/questionPagination'

type OneLiner = { date: string; development: string; fact: string; source: string }
type AffairMcq = { id: string; date: string; development: string; background: string; whyItMatters: string; question: string; options: string[]; answer: number; explanation: string; source: string; updatedAt: string }
type AffairsBatch = { batch: string; title: string; sourceDocument: string; verification: string; oneLiners: OneLiner[]; mcqs: AffairMcq[] }
type Tab = 'one-liners' | 'mcqs' | 'issue-files' | 'magazine'

const COLLECTION_PAGE_SIZE = 20
const nowMs = () => Date.now()

function TopicCard({ topic }: { topic: CaTopic }) {
  const [open, setOpen] = useState(false)
  return (
    <article id={topic.id} className="scroll-mt-24 rounded-xl border bg-white">
      <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div><div className="flex flex-wrap items-center gap-2">{topic.important && <Badge tone="gold">Important</Badge>}{topic.date && <span className="text-xs text-muted-foreground">{topic.date}</span>}</div><h2 className="mt-1.5 font-display text-lg font-bold text-pine">{topic.title}</h2>{topic.summary && !open && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{topic.summary}</p>}</div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><div className="space-y-4 border-t px-4 py-5 sm:px-5">{topic.summary && <p className="text-sm font-medium text-foreground/90">{topic.summary}</p>}<p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{topic.content}</p>{topic.sourceUrl && <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3.5 py-2 text-sm font-medium hover:bg-secondary">Source <ExternalLink className="h-3.5 w-3.5" /></a>}</div></div></div>
    </article>
  )
}

function McqCard({ item, number }: { item: AffairMcq; number: number }) {
  const previousAttempt = getAttempt(item.id)
  const previousMistake = previousAttempt?.c === false ? getMistakes().find((mistake) => mistake.id === item.id) : null
  const [selected, setSelected] = useState<number | null>(() => previousAttempt?.c ? item.answer : previousMistake?.sel ?? null)
  const [previouslyAnswered] = useState(Boolean(previousAttempt))
  const [details, setDetails] = useState(false)
  const startedAt = useRef(nowMs())
  const submitted = selected !== null || previouslyAnswered

  function answer(option: number) {
    if (submitted) return
    const correct = option === item.answer
    setSelected(option)
    recordAttempt(item.id, correct, 'Recent affairs', { selected: option, topic: item.development, mode: 'quiz' })
    recordQuestionTiming({ questionId: item.id, category: 'Recent affairs', mode: 'quiz', seconds: Math.max(1, Math.round((nowMs() - startedAt.current) / 1000)), correct, selected: option, topic: item.development })
    if (!correct) addMistake(item.id, option, 'Recent affairs')
  }

  return (
    <article className="rounded-xl border bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold text-muted-foreground">{item.date} · Question {number}</p>
      <h3 className="mt-2 font-semibold leading-relaxed text-pine">{item.question}</h3>
      <div
        className="mt-3 grid gap-2"
        role="radiogroup"
        aria-label={`Answer options for question ${number}`}
        onKeyDown={(event) => {
          if (submitted || event.altKey || event.ctrlKey || event.metaKey) return
          const key = event.key.toLowerCase()
          const byNumber = '1234'.indexOf(key)
          const byLetter = 'abcd'.indexOf(key)
          const index = byNumber >= 0 ? byNumber : byLetter
          if (index < 0 || index >= item.options.length) return
          event.preventDefault()
          answer(index)
        }}
      >
        {item.options.map((option, index) => {
          const correct = submitted && index === item.answer
          const wrong = submitted && selected === index && index !== item.answer
          return (
            <button
              key={`${index}-${option}`}
              type="button"
              role="radio"
              aria-checked={selected === index}
              // aria-disabled rather than disabled: a disabled button leaves the
              // tab order, so a keyboard user could not review their own answer.
              aria-disabled={submitted}
              onClick={() => answer(index)}
              className={`min-h-11 rounded-lg border px-3 py-2.5 text-left text-sm ${correct ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : wrong ? 'border-red-400 bg-red-50 text-red-950' : submitted ? 'opacity-70' : 'hover:border-emerald-500 hover:bg-emerald-50/60'}`}
            >
              <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>{option}
            </button>
          )
        })}
      </div>
      {submitted && <div className="mt-3" role="status" aria-live="polite"><p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-4 w-4" /> Correct answer: {String.fromCharCode(65 + item.answer)}</p><button type="button" onClick={() => setDetails((value) => !value)} aria-expanded={details} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold text-pine hover:bg-secondary">Details <ChevronDown className={`h-4 w-4 transition-transform ${details ? 'rotate-180' : ''}`} /></button>{details && <div className="mt-3 space-y-2 rounded-lg bg-secondary/60 p-4 text-sm leading-relaxed">{item.explanation && <p><strong>Explanation:</strong> {item.explanation}</p>}{item.background && <p><strong>Background:</strong> {item.background}</p>}{item.whyItMatters && <p><strong>Why it matters:</strong> {item.whyItMatters}</p>}{item.source && <p className="text-xs text-muted-foreground"><strong>Source recorded in the supplied dossier:</strong> {item.source}</p>}</div>}</div>}
    </article>
  )
}

export default function CurrentAffairs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') as Tab | null
  const tab: Tab = ['one-liners', 'mcqs', 'issue-files', 'magazine'].includes(requestedTab ?? '') ? requestedTab! : 'one-liners'
  const [batch, setBatch] = useState<AffairsBatch | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [page, setPage] = useState(() => Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1))
  const [viewer, setViewer] = useState(false)
  usePageBack(viewer, () => setViewer(false))

  // The dossier is ~740 KB and only the one-liner and MCQ tabs read it, so a
  // visitor who came for the magazine no longer pays for it.
  const needsBatch = tab === 'one-liners' || tab === 'mcqs'

  useEffect(() => {
    if (!viewer) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setViewer(false) }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [viewer])

  useEffect(() => {
    if (!needsBatch) return
    let active = true
    fetch('/recent-affairs/batch-2026-07-11_2026-08-16.json')
      .then((response) => { if (!response.ok) throw new Error('Batch unavailable'); return response.json() as Promise<AffairsBatch> })
      .then((value) => { if (active) setBatch(value) })
      .catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [needsBatch])

  useEffect(() => {
    const next = new URLSearchParams()
    if (tab !== 'one-liners') next.set('tab', tab)
    if (query.trim()) next.set('q', query.trim())
    if (page > 1) next.set('page', String(page))
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [page, query, searchParams, setSearchParams, tab])
  const normalized = query.trim().toLowerCase()
  const oneLiners = useMemo(() => batch?.oneLiners.filter((item) => !normalized || `${item.date} ${item.development} ${item.fact}`.toLowerCase().includes(normalized)) ?? [], [batch, normalized])
  const mcqs = useMemo(() => batch?.mcqs.filter((item) => !normalized || `${item.date} ${item.development} ${item.question}`.toLowerCase().includes(normalized)) ?? [], [batch, normalized])
  const topics = useMemo(() => {
    const seed: CaTopic[] = caIssues.map((issue, index) => ({ id: `seed-${issue.slug}`, title: issue.title, date: issue.lastUpdated, summary: issue.background.slice(0, 180), content: `${issue.background}\n\nMajor actors: ${issue.actors.join('; ')}.\n\nImplications for Pakistan: ${issue.pakistanImplications.join('; ')}.\n\nPolicy options: ${issue.policyOptions.join('; ')}.\n\nKey statistics: ${issue.statistics.map((stat) => `${stat.figure} (${stat.source})`).join(' | ')}`, important: false, published: true, order: index }))
    return mergedCaTopics(seed).filter((topic) => topic.published && (!normalized || `${topic.title} ${topic.summary} ${topic.content}`.toLowerCase().includes(normalized)))
  }, [normalized])
  const currentCount = tab === 'mcqs' ? mcqs.length : tab === 'one-liners' ? oneLiners.length : topics.length
  const pageSize = tab === 'mcqs' ? QUESTIONS_PER_PAGE : COLLECTION_PAGE_SIZE
  const pages = Math.max(1, Math.ceil(currentCount / pageSize))
  const safePage = clampQuestionPage(page, currentCount, pageSize)
  const start = (safePage - 1) * pageSize

  function selectTab(next: Tab) {
    setPage(1)
    const params = new URLSearchParams()
    if (next !== 'one-liners') params.set('tab', next)
    if (query.trim()) params.set('q', query.trim())
    setSearchParams(params, { replace: true })
  }

  return (
    <div>
      <PageHeader title="Global Pakistan Affairs Expanded" description="Current and Pakistan affairs from the supplied 11 July–16 August 2026 dossier, with dated one-liners, MCQs, issue files and the weekly magazine." />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {batch && <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4" aria-label="Supplied dossier coverage"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-emerald-800">Global Pakistan Affairs Expanded</p><p className="mt-1 text-sm font-semibold text-pine">11 July–16 August 2026 · supplied source collection</p></div><p className="mt-2 text-xs font-bold text-emerald-900 sm:mt-0">{batch.oneLiners.length.toLocaleString()} one-liners · {batch.mcqs.length.toLocaleString()} MCQs</p></section>}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {([['one-liners', 'One-Liners', BookOpen], ['mcqs', 'Recent MCQs', CheckCircle2], ['issue-files', 'Issue Files', FileText], ['magazine', 'Weekly Magazine', Newspaper]] as const).map(([value, label, Icon]) => <button key={value} type="button" onClick={() => selectTab(value)} aria-pressed={tab === value} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold sm:text-sm ${tab === value ? 'border-pine bg-pine text-white' : 'bg-white text-pine hover:bg-secondary'}`}><Icon className="h-4 w-4" /> {label}</button>)}
        </div>

        {tab !== 'magazine' && <label className="relative mt-5 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search current affairs</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search dates, developments, questions or issues…" className="h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700" /></label>}

        {!batch && !loadError && tab !== 'issue-files' && tab !== 'magazine' && <div className="grid place-items-center py-20 text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin" /><p className="mt-2 text-sm">Loading recent-affairs collection…</p></div>}
        {loadError && tab !== 'issue-files' && tab !== 'magazine' && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">The recent-affairs batch could not be loaded. Issue files and the weekly magazine remain available.</p>}

        {batch && tab === 'one-liners' && <section className="mt-5 space-y-3" aria-label="Recent affairs one-liners">{oneLiners.slice(start, start + pageSize).map((item, index) => <article key={`${item.date}-${item.development}-${index}`} className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-emerald-800">{item.date}</p><h2 className="mt-1 text-sm font-semibold text-pine">{item.development}</h2><p className="mt-2 text-sm leading-relaxed">{item.fact}</p>{item.source && <p className="mt-2 text-xs text-muted-foreground">Source recorded in the supplied dossier: {item.source}</p>}</article>)}</section>}
        {batch && tab === 'mcqs' && <section className="mt-5 space-y-4" aria-label="Recent affairs MCQs">{mcqs.slice(start, start + pageSize).map((item, index) => <McqCard key={item.id} item={item} number={start + index + 1} />)}</section>}
        {tab === 'issue-files' && <section className="mt-5 space-y-4" aria-label="Current affairs issue files">{topics.slice(start, start + pageSize).map((topic) => <TopicCard key={topic.id} topic={topic} />)}</section>}
        {tab !== 'magazine' && currentCount === 0 && !loadError && <p className="mt-5 rounded-xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">No item matches this search.</p>}
        {tab === 'mcqs' && <QuestionPagination currentPage={safePage} totalItems={currentCount} onPageChange={setPage} className="mt-6" />}
        {tab !== 'mcqs' && tab !== 'magazine' && currentCount > pageSize && <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Collection pages"><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="text-sm text-muted-foreground">Page {safePage} of {pages}</span><button type="button" disabled={safePage >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></nav>}

        {tab === 'magazine' && <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">{weeklyMagazine.coverUrl ? <img src={weeklyMagazine.coverUrl} alt={`${weeklyMagazine.title}, ${weeklyMagazine.issue} cover`} className="aspect-[3/4] w-full rounded-xl border object-cover object-top shadow-md" /> : <div className="grid aspect-[3/4] place-items-center rounded-xl bg-pine text-white"><Newspaper className="h-8 w-8" /></div>}<div><p className="text-xs font-bold uppercase tracking-[.15em] text-amber-700">Free weekly issue</p><h2 className="mt-2 font-display text-2xl font-bold text-pine">{weeklyMagazine.title}</h2><p className="mt-1 text-sm font-semibold text-emerald-800">{weeklyMagazine.issue}</p><p className="mt-2 text-sm text-muted-foreground">{weeklyMagazine.description} {weeklyMagazine.pageCount ? `${weeklyMagazine.pageCount} pages.` : ''}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setViewer(true)} disabled={!weeklyMagazine.pdfUrl} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white disabled:opacity-50"><FileText className="h-4 w-4" /> View magazine</button>{weeklyMagazine.pdfUrl && <a href={weeklyMagazine.pdfUrl} download className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold text-pine hover:bg-secondary"><Download className="h-4 w-4" /> Free PDF</a>}<button type="button" onClick={() => weeklyMagazine.pdfUrl && printPdfFile(weeklyMagazine.pdfUrl)} disabled={!weeklyMagazine.pdfUrl} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold text-pine hover:bg-secondary disabled:opacity-50"><Printer className="h-4 w-4" /> Print</button></div></div></div></section>}

        {tab === 'magazine' && weeklyMagazines.length > 1 && (
          <section className="mt-5 rounded-2xl border bg-white p-5 sm:p-7">
            <h2 className="font-display text-lg font-bold text-pine">Previous issues</h2>
            <p className="mt-1 text-sm text-muted-foreground">Earlier weekly issues stay available to read and download.</p>
            <ul className="mt-4 space-y-2">
              {weeklyMagazines.slice(1).map((issue) => (
                <li key={issue.issue} className="flex flex-wrap items-center gap-2 rounded-lg border bg-secondary/30 px-3 py-2.5">
                  <div className="mr-auto min-w-0">
                    <p className="truncate text-sm font-semibold text-pine">{issue.issue}</p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={issue.publishedDate}>
                        {new Date(`${issue.publishedDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </time>
                      {issue.pageCount ? ` · ${issue.pageCount} pages` : ''}
                    </p>
                  </div>
                  {issue.pdfUrl && (
                    <>
                      <a href={issue.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-bold text-emerald-800">
                        <FileText className="h-3.5 w-3.5" /> View
                      </a>
                      <a href={issue.pdfUrl} download className="inline-flex min-h-11 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-bold text-emerald-800">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                      <button type="button" onClick={() => issue.pdfUrl && printPdfFile(issue.pdfUrl)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-bold text-emerald-800">
                        <Printer className="h-3.5 w-3.5" /> Print
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {viewer && weeklyMagazine.pdfUrl && <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white print:hidden" role="dialog" aria-modal="true" aria-label="Weekly magazine viewer"><div className="flex items-center justify-between gap-3 border-b border-white/15 p-3"><p className="truncate text-sm font-semibold">{weeklyMagazine.title} · {weeklyMagazine.issue}</p><button type="button" onClick={() => setViewer(false)} className="grid h-10 w-10 place-items-center rounded-lg border border-white/25" aria-label="Close magazine"><X className="h-5 w-5" /></button></div><object data={weeklyMagazine.pdfUrl} type="application/pdf" className="min-h-0 flex-1 bg-white"><p className="p-6">Your browser cannot display this PDF inline. <a href={weeklyMagazine.pdfUrl} className="underline">Open the magazine</a>.</p></object></div>}
    </div>
  )
}
