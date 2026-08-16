import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BookOpen, CheckCircle2, ChevronDown, Download, FileText, Loader2, Newspaper, Printer, X } from 'lucide-react'
import { PageHeader } from '@/components/shared'

type OneLiner = { date: string; development: string; fact: string; source: string }
type AffairMcq = {
  id: string; date: string; development: string; background: string; whyItMatters: string
  question: string; options: string[]; answer: number; explanation: string; source: string
}
type AffairsBatch = { batch: string; title: string; sourceDocument: string; verification: string; oneLiners: OneLiner[]; mcqs: AffairMcq[] }

const PAGE_SIZE = 20
const magazineUrl = '/magazines/css-vista-current-affairs-weekly-2026-08-15.pdf'

function McqCard({ item, number }: { item: AffairMcq; number: number }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [details, setDetails] = useState(false)
  const submitted = selected !== null
  return (
    <article className="rounded-xl border bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold text-muted-foreground">{item.date} · Question {number}</p>
      <h3 className="mt-2 font-semibold leading-relaxed text-pine">{item.question}</h3>
      <div className="mt-3 grid gap-2">
        {item.options.map((option, index) => {
          const correct = submitted && index === item.answer
          const wrong = submitted && selected === index && index !== item.answer
          return (
            <button key={option} type="button" disabled={submitted} onClick={() => setSelected(index)} className={`min-h-11 rounded-lg border px-3 py-2.5 text-left text-sm ${correct ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : wrong ? 'border-red-400 bg-red-50 text-red-950' : 'hover:border-emerald-500 hover:bg-emerald-50/60'}`}>
              <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>{option}
            </button>
          )
        })}
      </div>
      {submitted && (
        <div className="mt-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-4 w-4" /> Correct answer: {String.fromCharCode(65 + item.answer)}</p>
          <button type="button" onClick={() => setDetails((value) => !value)} aria-expanded={details} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold text-pine hover:bg-secondary">Details <ChevronDown className={`h-4 w-4 transition-transform ${details ? 'rotate-180' : ''}`} /></button>
          {details && (
            <div className="mt-3 space-y-2 rounded-lg bg-secondary/60 p-4 text-sm leading-relaxed">
              {item.explanation && <p><strong>Explanation:</strong> {item.explanation}</p>}
              {item.background && <p><strong>Background:</strong> {item.background}</p>}
              {item.whyItMatters && <p><strong>Why it matters:</strong> {item.whyItMatters}</p>}
              {item.source && <p className="text-xs text-muted-foreground"><strong>Source recorded in supplied dossier:</strong> {item.source}</p>}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function CurrentAffairs() {
  const [searchParams] = useSearchParams()
  const [batch, setBatch] = useState<AffairsBatch | null>(null)
  const [tab, setTab] = useState<'one-liners' | 'mcqs' | 'magazine'>(() => searchParams.get('tab') === 'magazine' ? 'magazine' : searchParams.get('tab') === 'mcqs' ? 'mcqs' : 'one-liners')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [viewer, setViewer] = useState(false)

  useEffect(() => {
    fetch('/recent-affairs/batch-2026-07-11_2026-08-16.json').then((response) => {
      if (!response.ok) throw new Error('Batch unavailable')
      return response.json()
    }).then(setBatch).catch(() => setBatch({ batch: '', title: '', sourceDocument: '', verification: '', oneLiners: [], mcqs: [] }))
  }, [])

  const normalized = query.trim().toLowerCase()
  const oneLiners = useMemo(() => batch?.oneLiners.filter((item) => !normalized || `${item.date} ${item.development} ${item.fact}`.toLowerCase().includes(normalized)) ?? [], [batch, normalized])
  const mcqs = useMemo(() => batch?.mcqs.filter((item) => !normalized || `${item.date} ${item.development} ${item.question}`.toLowerCase().includes(normalized)) ?? [], [batch, normalized])
  const current = tab === 'mcqs' ? mcqs : oneLiners
  const pages = Math.max(1, Math.ceil(current.length / PAGE_SIZE))
  const start = (Math.min(page, pages) - 1) * PAGE_SIZE

  useEffect(() => setPage(1), [query, tab])

  return (
    <div>
      <PageHeader title="Recent Current & Pakistan Affairs" description="The supplied 11 July–16 August 2026 dossier, presented as dated one-liners and MCQs with source-linked Details, plus the genuine weekly magazine issue." />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ['one-liners', 'One-Liners', BookOpen],
            ['mcqs', 'Current-Affairs MCQs', CheckCircle2],
            ['magazine', 'Weekly Magazine', Newspaper],
          ] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => setTab(value)} aria-pressed={tab === value} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold ${tab === value ? 'border-pine bg-pine text-white' : 'bg-white text-pine hover:bg-secondary'}`}><Icon className="h-4 w-4" /> {label}</button>
          ))}
        </div>

        {tab !== 'magazine' && (
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab === 'mcqs' ? 'questions' : 'facts'}, dates or developments...`} className="mt-5 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700" />
        )}

        {!batch && <div className="grid place-items-center py-20 text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin" /><p className="mt-2 text-sm">Loading the supplied batch…</p></div>}

        {batch && tab === 'one-liners' && (
          <section className="mt-5 space-y-3" aria-label="Current affairs one-liners">
            {oneLiners.slice(start, start + PAGE_SIZE).map((item, index) => (
              <article key={`${item.date}-${item.development}-${index}`} className="rounded-xl border bg-white p-4">
                <p className="text-xs font-bold text-emerald-800">{item.date}</p>
                <h2 className="mt-1 text-sm font-semibold text-pine">{item.development}</h2>
                <p className="mt-2 text-sm leading-relaxed">{item.fact}</p>
                {item.source && <p className="mt-2 text-xs text-muted-foreground">Source recorded in supplied dossier: {item.source}</p>}
              </article>
            ))}
          </section>
        )}

        {batch && tab === 'mcqs' && (
          <section className="mt-5 space-y-4" aria-label="Current affairs MCQs">
            {mcqs.slice(start, start + PAGE_SIZE).map((item, index) => <McqCard key={item.id} item={item} number={start + index + 1} />)}
          </section>
        )}

        {batch && tab !== 'magazine' && current.length === 0 && <p className="mt-5 rounded-xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">No supplied item matches this search.</p>}
        {batch && tab !== 'magazine' && current.length > PAGE_SIZE && (
          <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Collection pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
            <span className="text-sm text-muted-foreground">Page {Math.min(page, pages)} of {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
          </nav>
        )}

        {tab === 'magazine' && (
          <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-[130px_1fr] sm:items-center">
              <div className="grid aspect-[3/4] place-items-center rounded-xl bg-gradient-to-br from-pine to-emerald-700 p-4 text-center text-white shadow-md"><div><Newspaper className="mx-auto h-8 w-8" /><p className="mt-3 text-xs font-bold uppercase tracking-wider">Issue No. 01</p><p className="mt-1 font-display text-lg font-bold">15 August 2026</p></div></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.15em] text-amber-700">Genuine supplied issue</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-pine">CSS VISTA Current Affairs Weekly — 15 August 2026</h2>
                <p className="mt-2 text-sm text-muted-foreground">Top Developments of the Week · 25 pages · original supplied page order preserved.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setViewer(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900"><FileText className="h-4 w-4" /> View Magazine</button>
                  <a href={magazineUrl} download className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold text-pine hover:bg-secondary"><Download className="h-4 w-4" /> Free Download PDF</a>
                  <a href={magazineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold text-pine hover:bg-secondary"><Printer className="h-4 w-4" /> Print</a>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {viewer && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white print:hidden" role="dialog" aria-modal="true" aria-label="Weekly magazine viewer">
          <div className="flex items-center justify-between gap-3 border-b border-white/15 p-3"><p className="truncate text-sm font-semibold">CSS VISTA Current Affairs Weekly — 15 August 2026</p><button type="button" onClick={() => setViewer(false)} className="grid h-10 w-10 place-items-center rounded-lg border border-white/25" aria-label="Close magazine"><X className="h-5 w-5" /></button></div>
          <object data={magazineUrl} type="application/pdf" className="min-h-0 flex-1 bg-white"><p className="p-6">Your browser cannot display the magazine inline. <a href={magazineUrl} className="underline">Open the PDF</a>.</p></object>
        </div>
      )}
    </div>
  )
}
