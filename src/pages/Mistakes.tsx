import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BookMarked, Check, RotateCcw, Trash2 } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import { getQuestionsByIds, type BankQuestion } from '@/data/mcq'
import { getMistakes, removeMistake, toggleMistakeRevised, type Mistake } from '@/lib/progress'
import { isRtlText } from '@/lib/utils'
import QuestionPagination from '@/components/QuestionPagination'
import { clampQuestionPage, questionPageRange } from '@/lib/questionPagination'

export default function Mistakes() {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [qs, setQs] = useState<Record<string, BankQuestion>>({})
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState<'all' | 'revised' | 'unrevised'>('all')
  const [minCount, setMinCount] = useState(0)
  const [sort, setSort] = useState<'recent' | 'count'>('recent')
  const [page, setPage] = useState(1)

  function load() {
    const m = getMistakes()
    setMistakes(m)
    getQuestionsByIds(m.map((x) => x.id)).then((list) => {
      const map: Record<string, BankQuestion> = {}
      list.forEach((q) => (map[q.id] = q))
      setQs(map)
    })
  }

  useEffect(load, [])

  const cats = useMemo(() => [...new Set(mistakes.map((m) => m.cat))].sort(), [mistakes])

  const filtered = useMemo(() => {
    let f = mistakes
    if (cat !== 'all') f = f.filter((m) => m.cat === cat)
    if (status === 'revised') f = f.filter((m) => m.revised)
    if (status === 'unrevised') f = f.filter((m) => !m.revised)
    if (minCount > 0) f = f.filter((m) => m.count > minCount)
    return [...f].sort((a, b) => (sort === 'recent' ? b.ts - a.ts : b.count - a.count))
  }, [mistakes, cat, status, minCount, sort])

  useEffect(() => setPage(1), [cat, status, minCount, sort])
  useEffect(() => {
    const safePage = clampQuestionPage(page, filtered.length)
    if (safePage !== page) setPage(safePage)
  }, [filtered.length, page])
  const range = questionPageRange(page, filtered.length)
  const pageMistakes = filtered.slice(range.start, range.end)

  return (
    <div>
      <PageHeader
        title="Mistake Notebook"
        description="Every question you answer incorrectly can be kept here - with your answer and the correct answer. Revise, retry and clear them as you improve."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <PrintMenu label="Print notebook" />
          <Link to="/gk/quiz?mode=wrong" className="no-print inline-flex h-9 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            <RotateCcw className="h-4 w-4" /> Retry all wrong answers
          </Link>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="no-print flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 text-sm">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border bg-white px-2">
            <option value="all">All subjects/categories</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'all')} className="h-9 rounded-md border bg-white px-2">
            <option value="all">Revised + unrevised</option>
            <option value="unrevised">Unrevised only</option>
            <option value="revised">Revised only</option>
          </select>
          <select value={minCount} onChange={(e) => setMinCount(parseInt(e.target.value, 10))} className="h-9 rounded-md border bg-white px-2">
            <option value={0}>Any mistake count</option>
            <option value={1}>Repeated 2+ times</option>
            <option value={2}>Repeated 3+ times</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as 'recent')} className="h-9 rounded-md border bg-white px-2">
            <option value="recent">Most recent first</option>
            <option value="count">Most repeated first</option>
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
        </div>

        <div className="print-area mt-4 space-y-4">
          {mistakes.length === 0 && (
            <EmptyState
              title="Your mistake notebook is empty"
              hint="When you answer a question incorrectly in GK World, MPT practice or a daily challenge, it can be saved here for revision."
            />
          )}
          {mistakes.length > 0 && filtered.length === 0 && (
            <EmptyState title="Nothing matches these filters" hint="Try a different category or status." />
          )}
          {pageMistakes.map((m, index) => {
            const q = qs[m.id]
            const rtl = q ? isRtlText(q.q) : false
            return (
              <div key={m.id} className={`mcq-card rounded-lg border bg-white p-4 ${m.revised ? 'opacity-75' : ''}`}>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-bold text-pine">Q{range.start + index + 1}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">{m.cat}</span>
                  <span>{new Date(m.ts).toLocaleDateString()}</span>
                  <span className={`rounded px-1.5 py-0.5 font-bold ${m.count > 1 ? 'bg-red-100 text-red-700' : 'bg-secondary'}`}>
                    Mistaken {m.count}×
                  </span>
                  {m.revised && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">Revised</span>}
                </div>
                {q ? (
                  <>
                    <p
                      dir={rtl ? 'rtl' : undefined}
                      lang={rtl ? 'ur' : undefined}
                      className={`mt-2 text-sm font-semibold ${rtl ? 'urdu-text text-right' : ''}`}
                    >
                      {q.q}
                    </p>
                    <div className="mt-2 grid gap-1 text-sm">
                      {q.o.map((o, j) => {
                        const optionRtl = isRtlText(o)
                        return (
                          <p
                            key={j}
                            dir={optionRtl ? 'rtl' : undefined}
                            lang={optionRtl ? 'ur' : undefined}
                            className={`rounded px-2 py-1 ${optionRtl ? 'urdu-text text-right' : ''} ${j === q.a ? 'bg-emerald-50 font-semibold text-emerald-900' : j === m.sel ? 'bg-red-50 text-red-800 line-through' : ''}`}
                          >
                            {'ABCD'[j]}) {o}
                          </p>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Question details unavailable (id: {m.id}).</p>
                )}
                <div className="no-print mt-3 flex flex-wrap gap-1.5 border-t pt-2.5">
                  <Link to={`/gk/quiz?mode=wrong`} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-pine hover:bg-secondary">
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </Link>
                  <button onClick={() => { toggleMistakeRevised(m.id); load() }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                    <Check className="h-3.5 w-3.5" /> {m.revised ? 'Mark unrevised' : 'Mark as revised'}
                  </button>
                  <button onClick={() => { removeMistake(m.id); load() }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <QuestionPagination currentPage={page} totalItems={filtered.length} onPageChange={setPage} className="mt-6" />

        {mistakes.length > 0 && (
          <p className="no-print mt-6 flex items-center gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
            <BookMarked className="h-4 w-4" /> The notebook works across GK World, MPT practice, vocabulary quizzes and daily challenges - all wrong answers collect here.
          </p>
        )}
      </div>
    </div>
  )
}
