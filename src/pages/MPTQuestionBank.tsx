import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { BookOpenCheck, Loader2, Search } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/shared'
import McqCard from '@/components/McqCard'
import QuestionPagination from '@/components/QuestionPagination'
import {
  adminBankQuestions, dedupeBankQuestions, filterDisabled, getCategoryQuestions, type BankQuestion,
} from '@/data/mcq'
import { getCssSubjectMcqBank, getCssSubjectMcqIndex, toBankQuestion } from '@/data/cssSubjectMcqs'
import { matchesMptBankTopic, mptQuestionBanks } from '@/data/mptQuestionBanks'
import { diversifyQuestions } from '@/lib/questionDiversity'
import { recordActivity } from '@/lib/progress'
import { QUESTIONS_PER_PAGE, clampQuestionPage, questionPageRange } from '@/lib/questionPagination'

export default function MPTQuestionBank() {
  const { bankId = '' } = useParams()
  const definition = mptQuestionBanks[bankId]
  const [searchParams, setSearchParams] = useSearchParams()
  const [questions, setQuestions] = useState<BankQuestion[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [topic, setTopic] = useState(() => searchParams.get('topic') ?? 'all')
  const [difficulty, setDifficulty] = useState(() => searchParams.get('level') ?? 'all')
  const [page, setPage] = useState(() => Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1))
  const [, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    setQuestions(null)
    setError('')

    async function load() {
      if (!definition) throw new Error('This MPT subject bank is not available.')

      let loaded: BankQuestion[] = []
      if (definition.centralSlugs?.length) {
        const parts = await Promise.all(definition.centralSlugs.map(getCategoryQuestions))
        const admin = definition.centralSlugs.flatMap((slug) => adminBankQuestions(slug))
        loaded = filterDisabled(dedupeBankQuestions([...parts.flat(), ...admin]))
      } else if (definition.cssSubjectSlug) {
        const index = await getCssSubjectMcqIndex()
        const subject = index.subjects.find((item) => item.slug === definition.cssSubjectSlug)
        if (!subject) throw new Error('The verified source bank could not be found.')
        loaded = (await getCssSubjectMcqBank(subject)).map(toBankQuestion)
      }

      loaded = loaded.filter((question) => matchesMptBankTopic(question.s, definition))
      if (cancelled) return
      setQuestions(diversifyQuestions(loaded))
      recordActivity({
        type: 'gk-category',
        label: `MPT - ${definition.name}`,
        path: `/mpt/bank/${definition.id}`,
      })
    }

    load().catch((reason: unknown) => {
      if (cancelled) return
      setQuestions([])
      setError(reason instanceof Error ? reason.message : 'This question bank could not be loaded. Please retry.')
    })

    return () => { cancelled = true }
  }, [bankId, definition, retry])

  const topics = useMemo(() => [...new Set((questions ?? []).map((question) => question.s).filter(Boolean))].sort() as string[], [questions])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return (questions ?? []).filter((question) => {
      if (topic !== 'all' && question.s !== topic) return false
      if (difficulty !== 'all' && question.d !== difficulty) return false
      return !needle || `${question.q} ${question.o.join(' ')}`.toLocaleLowerCase().includes(needle)
    })
  }, [difficulty, query, questions, topic])

  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    if (topic !== 'all') next.set('topic', topic)
    if (difficulty !== 'all') next.set('level', difficulty)
    if (page > 1) next.set('page', String(page))
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [difficulty, page, query, searchParams, setSearchParams, topic])

  useEffect(() => {
    if (questions === null) return
    const safePage = clampQuestionPage(page, filtered.length)
    if (safePage !== page) setPage(safePage)
  }, [filtered.length, page, questions])

  const range = questionPageRange(page, filtered.length)
  const visible = filtered.slice(range.start, range.end)
  const title = definition?.name ?? 'MPT Question Bank'

  return (
    <div>
      <PageHeader
        title={`${title} MCQ Bank`}
        description={questions === null
          ? 'Loading the complete verified question bank…'
          : `${questions.length.toLocaleString()} source questions available in a full, searchable bank. Similar templates are spaced apart for clearer study.`}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {questions === null && (
          <div className="grid place-items-center py-20" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin text-pine" />
            <p className="mt-3 text-sm text-muted-foreground">Opening the complete bank…</p>
          </div>
        )}

        {questions !== null && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
            <p>{error}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 font-bold">Retry</button>
          </div>
        )}

        {questions !== null && !error && (
          <>
            <section className="no-print rounded-xl border bg-white p-3" aria-label="Question bank filters">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <BookOpenCheck className="h-4 w-4" /> Full question bank · {questions.length.toLocaleString()} questions
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <label className="relative block sm:col-span-3">
                  <span className="sr-only">Search this question bank</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search questions and options…" className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm" />
                </label>
                <select value={topic} onChange={(event) => { setTopic(event.target.value); setPage(1) }} className="h-10 rounded-lg border bg-white px-3 text-sm" aria-label="Filter by topic">
                  <option value="all">All topics</option>
                  {topics.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1) }} className="h-10 rounded-lg border bg-white px-3 text-sm" aria-label="Filter by difficulty">
                  <option value="all">All levels</option>
                  <option>Basic</option><option>Intermediate</option><option>Advanced</option>
                </select>
                <span className="flex h-10 items-center text-xs text-muted-foreground">{filtered.length.toLocaleString()} matching questions</span>
              </div>
            </section>

            <section className="print-area mt-4 space-y-4" aria-label="MPT question bank">
              {visible.map((question, index) => (
                <McqCard key={question.id} q={question} num={range.start + index + 1} catName={title} onAction={() => setRefresh((value) => value + 1)} />
              ))}
              {!visible.length && <EmptyState title="No questions match these filters" hint="Try another search term or reset the topic and level filters." />}
            </section>

            <QuestionPagination currentPage={page} totalItems={filtered.length} pageSize={QUESTIONS_PER_PAGE} onPageChange={setPage} className="mt-6" />
          </>
        )}
      </main>
    </div>
  )
}
