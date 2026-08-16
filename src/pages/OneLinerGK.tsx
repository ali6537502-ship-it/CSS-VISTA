import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  BookOpenCheck, ChevronLeft, ChevronRight, Clock3,
  Filter, Layers3, Search,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import {
  getOneLinerCategory,
  getOneLinerIndex,
  type OneLinerCategory,
  type OneLinerIndex,
} from '@/data/oneLinerGk'

const PAGE_SIZE = 40
type FreshnessFilter = 'all' | 'stable' | 'dated'

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
  }, [])

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
  const datedTotal = useMemo(
    () => index?.categories.reduce((total, item) => total + item.timeSensitiveCount, 0) ?? 0,
    [index],
  )

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
        title="One-Liner GK"
        description="Quick, category-wise study facts extracted and organised from the supplied GK notes."
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <BookOpenCheck className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{index ? index.total.toLocaleString() : '…'}</p>
            <p className="text-xs text-muted-foreground">Cleaned one-liner notes</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <Layers3 className="h-5 w-5 text-emerald-800" />
            <p className="mt-2 text-2xl font-bold text-pine">{index ? index.categories.length : '…'}</p>
            <p className="text-xs text-muted-foreground">Subject categories</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <Clock3 className="h-5 w-5 text-amber-700" />
            <p className="mt-2 text-2xl font-bold text-pine">{index ? datedTotal.toLocaleString() : '…'}</p>
            <p className="text-xs text-muted-foreground">Time-sensitive notes clearly marked</p>
          </div>
        </section>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <section className="mt-8" aria-labelledby="one-liner-categories">
          <h2 id="one-liner-categories" className="font-display text-xl font-bold text-pine">Choose a category</h2>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap">
            {index?.categories.map((item) => {
              const active = item.slug === selectedSlug
              return (
                <button
                  key={item.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseCategory(item.slug)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-emerald-900 bg-pine text-white'
                      : 'bg-white text-foreground hover:border-emerald-700/50 hover:bg-secondary'
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.name}</span>
                  <span className={`text-[11px] ${active ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                    {item.count.toLocaleString()} notes
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-7" aria-labelledby="one-liner-results">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="one-liner-results" className="font-display text-xl font-bold text-pine">
                {category?.name ?? selectedSummary?.name ?? 'Loading category…'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {category ? `${filteredNotes.length.toLocaleString()} matching notes` : 'Loading notes…'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Search and filters apply within this category
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border bg-secondary/40 p-3 sm:grid-cols-3">
            <label className="relative block sm:col-span-1">
              <span className="sr-only">Search one-liner notes</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search these notes…"
                className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
              />
            </label>
            <label>
              <span className="sr-only">Filter by subcategory</span>
              <select
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="all">All subcategories</option>
                {selectedSummary?.subcategories.map((item) => (
                  <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by date sensitivity</span>
              <select
                value={freshness}
                onChange={(event) => setFreshness(event.target.value as FreshnessFilter)}
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="all">All notes</option>
                <option value="stable">Exclude dated-source notes</option>
                <option value="dated">Dated-source notes only</option>
              </select>
            </label>
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

          <ol start={resultStart} className="mt-4 grid gap-2">
            {visibleNotes.map((note, indexInPage) => (
              <li key={note.id} className="rounded-xl border bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 min-w-7 rounded bg-secondary px-1.5 py-1 text-center text-[11px] font-bold text-pine">
                    {resultStart + indexInPage}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-relaxed text-foreground">{note.text}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
                        {note.subcategory}
                      </span>
                      {note.timeSensitive && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          Dated source
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
