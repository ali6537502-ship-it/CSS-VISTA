import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Play, Search } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared'
import { adminBankQuestions, dedupeBankQuestions, filterDisabled, getBankIndex, getChunk, type BankQuestion } from '@/data/mcq'
import McqCard from '@/components/McqCard'
import PrintMenu from '@/components/PrintMenu'
import { recordActivity } from '@/lib/progress'
import QuestionPagination from '@/components/QuestionPagination'
import { QUESTIONS_PER_PAGE, clampQuestionPage, questionPageRange } from '@/lib/questionPagination'
import { diversifyQuestions } from '@/lib/questionDiversity'

const SITE_ORIGIN = 'https://www.css-vista.com'

export default function GKCategory() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [qs, setQs] = useState<BankQuestion[] | null>(null)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [name, setName] = useState(slug)
  const [total, setTotal] = useState(0)
  const [sub, setSub] = useState(() => searchParams.get('sub') || 'all')
  const [diff, setDiff] = useState(() => ['Basic', 'Intermediate', 'Advanced'].includes(searchParams.get('level') ?? '') ? searchParams.get('level')! : 'all')
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [page, setPage] = useState(() => Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1))
  const [, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    let backgroundTimer: number | null = null
    setQs(null)
    setLoadingComplete(false)
    getBankIndex().then(async (idx) => {
      const cat = idx.categories.find((c) => c.slug === slug)
      if (cancelled) return
      setName(cat?.name ?? slug)
      setTotal(cat?.count ?? 0)
      if (!cat) {
        setQs(adminBankQuestions(slug))
        setLoadingComplete(true)
        return
      }

      const firstChunk = await getChunk(slug, 0)
      if (cancelled) return
      const initialQuestions = diversifyQuestions(dedupeBankQuestions(filterDisabled([
        ...firstChunk,
        ...adminBankQuestions(slug),
      ])))
      setQs(initialQuestions)
      recordActivity({
        type: 'gk-category',
        label: `GK - ${cat.name}`,
        path: `/gk/cat/${slug}`,
      })

      if (cat.chunks > 1) {
        backgroundTimer = window.setTimeout(async () => {
          for (let chunk = 1; chunk < cat.chunks; chunk += 1) {
            const nextQuestions = await getChunk(slug, chunk)
            if (cancelled) return
            setQs((current) => diversifyQuestions(dedupeBankQuestions(filterDisabled([
              ...(current ?? []),
              ...nextQuestions,
            ]))))
          }
          if (!cancelled) setLoadingComplete(true)
        }, 250)
      } else {
        setLoadingComplete(true)
      }
    })
    return () => {
      cancelled = true
      if (backgroundTimer !== null) window.clearTimeout(backgroundTimer)
    }
  }, [slug])

  useEffect(() => {
    if (!total || !name) {
      if (!loadingComplete) return
      const previousTitle = document.title
      const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      const previousRobots = robots?.content ?? null
      const previousCanonical = canonical?.href ?? null
      document.title = 'GK Category Unavailable | CSS Vista'
      if (robots) robots.content = 'noindex, follow'
      if (canonical) canonical.href = `${SITE_ORIGIN}/404`
      document.getElementById('cssv-route-structured-data')?.remove()
      return () => {
        document.title = previousTitle
        if (robots && previousRobots !== null) robots.content = previousRobots
        if (canonical && previousCanonical) canonical.href = previousCanonical
      }
    }
    const canonicalUrl = `${SITE_ORIGIN}/gk/cat/${slug}`
    const title = `${name} MCQs - ${total.toLocaleString('en-US')} Questions | CSS Vista`
    const description = `Practice ${total.toLocaleString('en-US')} ${name} MCQs for competitive-examination preparation, with four-option questions, answer review and topic filters.`
    const previousTitle = document.title
    const metaUpdates = [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[property="og:url"]', canonicalUrl],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ] as const
    const previousMeta = metaUpdates.map(([selector, value]) => {
      const element = document.querySelector<HTMLMetaElement>(selector)
      const previous = element?.content ?? null
      if (element) element.content = value
      return { element, previous }
    })
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const previousCanonical = canonical?.href ?? null
    const structuredData = document.getElementById('cssv-route-structured-data') as HTMLScriptElement | null
    const schema = structuredData || document.createElement('script')
    const createdSchema = !structuredData
    const previousSchema = structuredData?.textContent ?? null

    document.title = title
    if (canonical) canonical.href = canonicalUrl
    schema.id = 'cssv-route-structured-data'
    schema.type = 'application/ld+json'
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${name} MCQs`,
      description,
      url: canonicalUrl,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@type': 'Thing', name },
    })
    if (createdSchema) document.head.append(schema)

    return () => {
      document.title = previousTitle
      previousMeta.forEach(({ element, previous }) => {
        if (element && previous !== null) element.content = previous
      })
      if (canonical && previousCanonical) canonical.href = previousCanonical
      if (createdSchema) schema.remove()
      else schema.textContent = previousSchema
    }
  }, [loadingComplete, name, slug, total])

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

  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    if (sub !== 'all') next.set('sub', sub)
    if (diff !== 'all') next.set('level', diff)
    if (page > 1) next.set('page', String(page))
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [diff, page, query, searchParams, setSearchParams, sub])

  const range = questionPageRange(page, filtered.length)
  const view = filtered.slice(range.start, range.end)

  useEffect(() => {
    if (!loadingComplete) return
    const safePage = clampQuestionPage(page, filtered.length)
    if (safePage !== page) setPage(safePage)
  }, [filtered.length, loadingComplete, page])

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
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="Search within this category…"
              className="h-9 w-full rounded-md border bg-white pl-8 pr-3 text-sm"
            />
          </div>
          {subs.length > 1 && (
            <select value={sub} onChange={(e) => { setSub(e.target.value); setPage(1) }} className="h-9 max-w-52 rounded-md border bg-white px-2 text-sm">
              <option value="all">All subcategories</option>
              {subs.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <select value={diff} onChange={(e) => { setDiff(e.target.value); setPage(1) }} className="h-9 rounded-md border bg-white px-2 text-sm">
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
              num={range.start + i + 1}
              catName={name}
              onAction={() => setRefresh((r) => r + 1)}
            />
          ))}
        </div>

        <QuestionPagination currentPage={page} totalItems={filtered.length} pageSize={QUESTIONS_PER_PAGE} onPageChange={setPage} className="mt-6" />
      </div>
    </div>
  )
}
