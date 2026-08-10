import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft, ChevronRight, Play, Search } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared'
import { adminBankQuestions, dedupeBankQuestions, filterDisabled, getBankIndex, getCategoryQuestions, type BankQuestion } from '@/data/mcq'
import McqCard from '@/components/McqCard'
import PrintMenu from '@/components/PrintMenu'
import { recordActivity } from '@/lib/progress'

const PAGE_SIZE = 25

export default function GKCategory() {
  const { slug = '' } = useParams()
  const [qs, setQs] = useState<BankQuestion[] | null>(null)
  const [name, setName] = useState(slug)
  const [total, setTotal] = useState(0)
  const [sub, setSub] = useState('all')
  const [diff, setDiff] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [, setRefresh] = useState(0)

  useEffect(() => {
    setQs(null)
    getBankIndex().then((idx) => {
      const cat = idx.categories.find((c) => c.slug === slug)
      setName(cat?.name ?? slug)
      setTotal(cat?.count ?? 0)
    })
    getCategoryQuestions(slug).then((data) => {
      const questions = dedupeBankQuestions(filterDisabled([...data, ...adminBankQuestions(slug)]))
      setQs(questions)
      setTotal(questions.length)
      recordActivity({ type: 'gk-category', label: `GK - ${name}`, path: `/gk/cat/${slug}` })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const subs = useMemo(() => {
    if (!qs) return []
    return [...new Set(qs.map((q) => q.s).filter(Boolean))].sort() as string[]
  }, [qs])

  const filtered = useMemo(() => {
    if (!qs) return []
    let f = qs
    if (sub !== 'all') f = f.filter((q) => q.s === sub)
    if (diff !== 'all') f = f.filter((q) => q.d === diff)
    if (query.trim()) {
      const t = query.toLowerCase()
      f = f.filter((q) => q.q.toLowerCase().includes(t) || q.o.some((o) => o.toLowerCase().includes(t)))
    }
    return f
  }, [qs, sub, diff, query])

  useEffect(() => setPage(1), [sub, diff, query])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const view = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title={name}
        description={`${total.toLocaleString()} questions in this category. Select an option to check yourself - the correct answer appears after you attempt, or when you choose Reveal Answer.`}
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            to={`/gk/quiz?mode=category&cats=${slug}`}
            className="no-print inline-flex h-9 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
          >
            <Play className="h-4 w-4" /> Practise as quiz
          </Link>
          <PrintMenu label="Print questions" />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Filters */}
        <div className="no-print flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search within this category…"
              className="h-9 w-full rounded-md border bg-white pl-8 pr-3 text-sm"
            />
          </div>
          {subs.length > 1 && (
            <select value={sub} onChange={(e) => setSub(e.target.value)} className="h-9 max-w-52 rounded-md border bg-white px-2 text-sm">
              <option value="all">All subcategories</option>
              {subs.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <select value={diff} onChange={(e) => setDiff(e.target.value)} className="h-9 rounded-md border bg-white px-2 text-sm">
            <option value="all">All levels</option>
            <option value="Basic">Basic</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Question list */}
        <div className="print-area mt-4 space-y-4">
          {qs === null && <p className="py-8 text-center text-sm text-muted-foreground">Loading questions…</p>}
          {qs !== null && view.length === 0 && (
            <EmptyState title="No questions match these filters" hint="Try clearing the search or choosing a different subcategory." />
          )}
          {view.map((q, i) => (
            <McqCard
              key={q.id}
              q={q}
              num={(page - 1) * PAGE_SIZE + i + 1}
              catName={name}
              onAction={() => setRefresh((r) => r + 1)}
            />
          ))}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="no-print mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-9 items-center gap-1 rounded-md border bg-white px-3 text-sm font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="inline-flex h-9 items-center gap-1 rounded-md border bg-white px-3 text-sm font-semibold disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
