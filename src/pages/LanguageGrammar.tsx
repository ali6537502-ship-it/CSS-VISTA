import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  BookOpen, ChevronLeft, ChevronRight, Languages, Search,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import MasterGrammarCourse from './MasterGrammarCourse'
import {
  getGrammarCourse,
  getGrammarIndex,
  type GrammarCourse,
  type GrammarIndex,
} from '@/data/languageGrammar'

const PAGE_SIZE = 30
type Language = 'urdu' | 'english'

export default function LanguageGrammar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialLanguage: Language = searchParams.get('lang') === 'english' ? 'english' : 'urdu'
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [index, setIndex] = useState<GrammarIndex | null>(null)
  const [course, setCourse] = useState<GrammarCourse | null>(null)
  const [topicSlug, setTopicSlug] = useState(() => searchParams.get('topic') ?? '')
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [page, setPage] = useState(() => Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getGrammarIndex()
      .then((data) => active && setIndex(data))
      .catch(() => active && setError('The grammar course index could not be loaded. Please refresh and try again.'))
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setCourse(null)
    setError('')
    setQuery('')
    setPage(1)
    getGrammarCourse(language)
      .then((data) => {
        if (!active) return
        setCourse(data)
        setTopicSlug(data.topics[0]?.slug ?? '')
      })
      .catch(() => active && setError('This grammar course could not be loaded. Please refresh and try again.'))
    return () => { active = false }
  }, [language])

  const activeTopic = course?.topics.find((topic) => topic.slug === topicSlug) ?? course?.topics[0]
  const filtered = useMemo(() => {
    if (!activeTopic) return []
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return activeTopic.items
    return activeTopic.items.filter((item) => item.fields.some((field) => (
      `${field.label} ${field.value}`.toLocaleLowerCase().includes(needle)
    )))
  }, [activeTopic, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const resultStart = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0
  const resultEnd = Math.min(safePage * PAGE_SIZE, filtered.length)
  useEffect(() => {
    if (searchParams.get('view') === 'master-course') return
    const next = new URLSearchParams(searchParams)
    next.set('lang', language)
    if (topicSlug) next.set('topic', topicSlug); else next.delete('topic')
    if (query.trim()) next.set('q', query.trim()); else next.delete('q')
    if (page > 1) next.set('page', String(page)); else next.delete('page')
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [language, topicSlug, query, page, searchParams, setSearchParams])

  const rtl = course?.direction === 'rtl'
  const showMasterCourse = language === 'english' && searchParams.get('view') === 'master-course'

  function selectLanguage(next: Language) {
    setLanguage(next)
    // Switching language used to replace the whole param set, which silently
    // dropped `view` and threw the student out of the 30-day course.
    const params = new URLSearchParams(searchParams)
    params.set('lang', next)
    params.delete('topic')
    params.delete('q')
    params.delete('page')
    if (next !== 'english') params.delete('view')
    setSearchParams(params, { replace: true })
  }

  function selectTopic(slug: string) {
    setTopicSlug(slug)
    setQuery('')
    setPage(1)
  }

  if (showMasterCourse) return <MasterGrammarCourse />

  return (
    <div>
      <PageHeader
        title="Urdu & English Grammar"
        description="Grammar rules and reference material for Urdu and English, with a separate 30-day English practice course."
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-9">
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Choose language course">
          {(['urdu', 'english'] as const).map((item) => {
            const summary = index?.languages.find((entry) => entry.slug === item)
            const selected = item === language
            const Icon = item === 'urdu' ? Languages : BookOpen
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => selectLanguage(item)}
                className={`rounded-xl border p-5 text-left transition-all ${
                  selected
                    ? 'border-emerald-900 bg-pine text-white shadow-sm'
                    : 'bg-white hover:-translate-y-0.5 hover:border-emerald-700/40 hover:shadow-sm'
                }`}
              >
                <Icon className={`h-5 w-5 ${selected ? 'text-amber-300' : 'text-emerald-800'}`} />
                <p className="mt-3 font-display text-lg font-bold">
                  {item === 'urdu' ? 'اردو قواعد' : 'English Grammar'}
                </p>
                <p className={`mt-1 text-xs ${selected ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                  {summary ? `${summary.total.toLocaleString()} reference entries · ${summary.topics} topics` : 'Loading course summary…'}
                </p>
              </button>
            )
          })}
        </section>

        {language === 'english' && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-950 to-emerald-800 p-5 text-white shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">30-day English course</p>
                <h2 className="mt-1 font-display text-2xl font-bold">30-Day English Grammar Course</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100">
                  Follow one lesson each day: learn the rule, see clear examples, practise it, take a daily test, and track your progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams({ lang: 'english', view: 'master-course' }))}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-emerald-950 hover:bg-amber-200"
              >
                Start 30-day course <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {!course && !error && (
          <div className="mt-7 grid gap-3 lg:grid-cols-4" aria-label="Loading grammar course">
            <div className="h-52 animate-pulse rounded-xl bg-secondary" />
            <div className="h-80 animate-pulse rounded-xl bg-secondary lg:col-span-3" />
          </div>
        )}

        {course && (
          <section
            className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"
            lang={course.lang}
            dir={course.direction}
            aria-label={language === 'urdu' ? 'Urdu Grammar course' : 'English Grammar course'}
          >
            <aside className="self-start rounded-xl border bg-white p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
              <h2 className={`px-2 py-1 font-display text-lg font-bold text-pine ${rtl ? 'urdu-text text-right' : ''}`}>
                {language === 'urdu' ? 'موضوعات' : 'Course topics'}
              </h2>
              <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:block lg:max-h-[calc(100vh-11rem)] lg:space-y-1.5 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                {course.topics.map((topic) => {
                  const selected = topic.slug === activeTopic?.slug
                  return (
                    <button
                      key={topic.slug}
                      type="button"
                      onClick={() => selectTopic(topic.slug)}
                      className={`min-w-52 snap-start rounded-lg px-3 py-2.5 text-sm transition-colors lg:block lg:w-full ${
                        rtl ? 'urdu-text text-right leading-8' : 'text-left'
                      } ${selected ? 'bg-pine font-semibold text-white' : 'bg-secondary/60 hover:bg-emerald-100'}`}
                    >
                      <span className="block">{topic.title}</span>
                      <span className={`text-[10px] ${selected ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                        {topic.items.length.toLocaleString()} {language === 'urdu' ? 'اسباق' : 'entries'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <div className="min-w-0">
              <div className={rtl ? 'text-right' : ''}>
                <h2 className={`font-display text-2xl font-bold text-pine ${rtl ? 'urdu-text leading-[2.1]' : ''}`}>
                  {activeTopic?.title}
                </h2>
                <p className={`mt-1 text-sm text-muted-foreground ${rtl ? 'urdu-text leading-8' : ''}`}>
                  {activeTopic?.description}
                </p>
              </div>

              <label className="relative mt-4 block">
                <span className="sr-only">{language === 'urdu' ? 'اسباق تلاش کریں' : 'Search this grammar topic'}</span>
                <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${rtl ? 'right-3' : 'left-3'}`} />
                <input
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setPage(1) }}
                  placeholder={language === 'urdu' ? 'اس موضوع میں تلاش کریں…' : 'Search this topic…'}
                  className={`h-11 w-full rounded-lg border bg-white px-10 text-sm outline-none ring-ring focus:ring-2 ${rtl ? 'urdu-text text-right' : ''}`}
                />
              </label>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{filtered.length.toLocaleString()} {language === 'urdu' ? 'نتائج' : 'matching entries'}</span>
                <span>{language === 'urdu' ? 'اردو نستعلیق' : 'English grammar reference'}</span>
              </div>

              {visible.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed bg-white px-4 py-10 text-center text-sm text-muted-foreground">
                  {language === 'urdu' ? 'کوئی نتیجہ نہیں ملا۔' : 'No grammar entry matches this search.'}
                </p>
              ) : (
                <ol start={resultStart} className="mt-4 grid gap-3">
                  {visible.map((item, indexInPage) => (
                    <li key={item.id} className="rounded-xl border bg-white p-4">
                      <div className={`flex items-start gap-3 ${rtl ? 'flex-row-reverse' : ''}`}>
                        <span className="mt-0.5 min-w-8 rounded bg-secondary px-1.5 py-1 text-center text-[11px] font-bold text-pine">
                          {resultStart + indexInPage}
                        </span>
                        <dl className="min-w-0 flex-1 space-y-2">
                          {item.fields.map((field, fieldIndex) => (
                            <div
                              key={`${field.label}-${fieldIndex}`}
                              className={`grid gap-1 ${rtl ? 'text-right sm:grid-cols-[minmax(0,1fr)_130px]' : 'sm:grid-cols-[130px_minmax(0,1fr)]'}`}
                            >
                              <dt className={`text-xs font-bold text-emerald-800 ${rtl ? 'urdu-text sm:order-2' : ''}`}>
                                {field.label}
                              </dt>
                              <dd className={`text-sm text-foreground ${rtl ? 'urdu-text leading-9 sm:order-1' : 'leading-relaxed'}`}>
                                {field.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {filtered.length > 0 && (
                <nav aria-label="Grammar lesson pages" className={`mt-5 flex flex-wrap items-center justify-between gap-3 ${rtl ? 'flex-row-reverse' : ''}`}>
                  <p className="text-xs text-muted-foreground">
                    {resultStart.toLocaleString()}–{resultEnd.toLocaleString()} / {filtered.length.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2" dir="ltr">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border bg-white px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="min-w-16 text-center text-xs text-muted-foreground">{safePage} / {totalPages}</span>
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
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
