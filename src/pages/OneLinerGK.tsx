import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  BookOpenCheck, ChevronLeft, ChevronRight,
  Filter, Search,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import {
  getOneLinerCategory,
  getOneLinerIndex,
  type OneLinerCategory,
  type OneLinerIndex,
} from '@/data/oneLinerGk'
import { formatOneLiner } from '@/lib/oneLinerFormat'

const PAGE_SIZE = 20
type FreshnessFilter = 'all' | 'stable' | 'dated'

function OneLinerContent({ text }: { text: string }) {
  const formatted = formatOneLiner(text)

  if (formatted.kind === 'fields') {
    return (
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        {formatted.fields.map((field, index) => (
          <div key={`${field.label}-${index}`} className="min-w-[135px] flex-1 rounded-xl border border-emerald-100 bg-emerald-50/55 px-3 py-2.5">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-700">{field.label}</dt>
            <dd className="mt-1 text-sm font-semibold leading-snug text-slate-900">{field.value}</dd>
          </div>
        ))}
      </dl>
    )
  }

  if (formatted.kind === 'term') {
    return (
      <div>
        <p className="text-sm font-bold leading-snug text-slate-900">{formatted.term}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{formatted.detail}</p>
      </div>
    )
  }

  if (formatted.kind === 'list') {
    return (
      <ul className="grid gap-1.5 text-sm leading-relaxed text-slate-700 sm:grid-cols-2">
        {formatted.items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2">
            <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  return <p className="text-sm font-medium leading-relaxed text-slate-800">{formatted.text}</p>
}

export default function OneLinerGK() {
  const [searchParams] = useSearchParams()
  const [index, setIndex] = useState<OneLinerIndex | null>(null)
  const [category, setCategory] = useState<OneLinerCategory | null>(null)
  const [selectedSlug, setSelectedSlug] = useState(() => searchParams.get('category') ?? 'general-knowledge')
  const [query, setQuery] = useState(() => searchParams.get('search') ?? '')
  const [subcategory, setSubcategory] = useState('all')
  const [freshness, setFreshness] = useState<FreshnessFilter>('all')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getOneLinerIndex()
      .then((data) => {
        if (!active) return
        setIndex(data)
        if (!data.categories.some((item) => item.slug === selectedSlug) && data.categories[0]) {
          setSelectedSlug(data.categories[0].slug)
        }
      })
      .catch(() => active && setError('The One-Liner GK index could not be loaded. Please refresh and try again.'))
    return () => { active = false }
  }, [selectedSlug])

  useEffect(() => {
    let active = true
    setCategory(null)
    setError('')
    getOneLinerCategory(selectedSlug)
      .then((data) => active && setCategory(data))
      .catch(() => active && setError('This category could not be loaded. Please choose another category or refresh.'))
    return () => { active = false }
  }, [selectedSlug])

  useEffect(() => {
    setPage(1)
  }, [selectedSlug, query, subcategory, freshness])

  const selectedSummary = index?.categories.find((item) => item.slug === selectedSlug)
  const filteredNotes = useMemo(() => {
    if (!category) return []
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return category.notes.filter((note) => {
      if (subcategory !== 'all' && note.subcategory !== subcategory) return false
      if (freshness === 'stable' && note.timeSensitive) return false
      if (freshness === 'dated' && !note.timeSensitive) return false
      return !normalizedQuery || note.text.toLocaleLowerCase().includes(normalizedQuery)
    })
  }, [category, freshness, query, subcategory])

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleNotes = filteredNotes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const resultStart = filteredNotes.length ? (safePage - 1) * PAGE_SIZE + 1 : 0
  const resultEnd = Math.min(safePage * PAGE_SIZE, filteredNotes.length)

  function chooseCategory(slug: string) {
    setSelectedSlug(slug)
    setSubcategory('all')
    setFreshness('all')
    setQuery('')
  }

  return (
    <div>
      <PageHeader
        title="One-Liner GK Questions"
        description="Clear, subject-wise fact cards designed for fast reading and focused revision."
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <section className="rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="quick-revision-controls">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="quick-revision-controls" className="font-display text-lg font-bold text-pine">Find the facts you need</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {index ? `${index.total.toLocaleString()} revision facts across ${index.categories.length} subjects` : 'Loading revision library…'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-800">Subject</span>
              <select
                value={selectedSlug}
                onChange={(event) => chooseCategory(event.target.value)}
                className="h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-800"
              >
                {index?.categories.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name} ({item.count.toLocaleString()})</option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-1">
              <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-800">Search</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type a fact or keyword…"
                  className="h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-800">Topic</span>
              <select
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
                className="h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-800"
              >
                <option value="all">All topics</option>
                {selectedSummary?.subcategories.map((item) => (
                  <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-800">Freshness</span>
              <select
                value={freshness}
                onChange={(event) => setFreshness(event.target.value as FreshnessFilter)}
                className="h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-800"
              >
                <option value="all">All facts</option>
                <option value="stable">Evergreen facts</option>
                <option value="dated">Dated facts only</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-7" aria-labelledby="one-liner-results">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-emerald-900/10 pb-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">Revision cards</p>
              <h2 id="one-liner-results" className="mt-1 font-display text-xl font-bold text-pine">
                {category?.name ?? selectedSummary?.name ?? 'Loading subject…'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {category ? `${filteredNotes.length.toLocaleString()} matching facts · 20 per page` : 'Loading facts…'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Use the controls above to narrow this subject
            </div>
          </div>

          {!category && !error && (
            <div className="mt-4 space-y-2" aria-label="Loading one-liner notes">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-secondary" />)}
            </div>
          )}

          {category && visibleNotes.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No notes match these filters.
            </p>
          )}

          <ol start={resultStart} className="mt-4 grid gap-3">
            {visibleNotes.map((note, indexInPage) => (
              <li key={note.id} className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-7 min-w-7 place-items-center rounded-full bg-pine px-1.5 text-[11px] font-bold text-white">
                    {resultStart + indexInPage}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-900">
                    {note.subcategory}
                  </span>
                  {note.timeSensitive && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                      Check current date
                    </span>
                  )}
                </div>
                <div className="mt-3 min-w-0"><OneLinerContent text={note.text} /></div>
              </li>
            ))}
          </ol>

          {category && filteredNotes.length > 0 && (
            <nav aria-label="One-Liner GK pages" className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {resultStart.toLocaleString()}–{resultEnd.toLocaleString()} of {filteredNotes.length.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border bg-white px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="min-w-20 text-center text-xs font-medium text-muted-foreground">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border bg-white px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          )}
        </section>
      </main>
    </div>
  )
}

