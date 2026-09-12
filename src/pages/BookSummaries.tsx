import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowLeft, ArrowRight, BookOpen, Bookmark, BookmarkCheck, CheckCircle2, Clock3, Copy,
  LibraryBig, Minus, Plus, Printer, Search, Sparkles, X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import {
  loadBookSummaries,
  type BookSummary,
  type BookSummaryLibrary,
} from '@/data/bookSummaries'
import {
  getAllBookSummaryProgress, getBookSummaryProgress, recordActivity,
  updateBookSummaryProgress, type BookSummaryProgress,
} from '@/lib/progress'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { printPage } from '@/components/PrintMenu'
import { usePageBack } from '@/lib/backNavigation'

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index}>{part.slice(1, -1)}</em>
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

function SummaryBody({ body }: { body: string }) {
  const lines = body.split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }

    const heading = line.match(/^###\s+(.+)$/)
    if (heading) {
      blocks.push(
        <h3 key={`heading-${index}`} className="mt-7 font-display text-xl font-bold text-pine">
          <InlineText text={heading[1]} />
        </h3>,
      )
      index += 1
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: Array<{ number: number; text: string }> = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        const numberedLine = lines[index].trim().match(/^(\d+)\.\s+(.+)$/)
        if (numberedLine) {
          items.push({
            number: Number(numberedLine[1]),
            text: numberedLine[2],
          })
        }
        index += 1
      }
      blocks.push(
        <ol key={`ordered-${index}`} className="my-5 list-decimal space-y-3 pl-6 marker:font-bold marker:text-emerald-800">
          {items.map((item) => (
            <li key={item.number} value={item.number} className="pl-1 leading-7 text-foreground/85">
              <InlineText text={item.text} />
            </li>
          ))}
        </ol>,
      )
      continue
    }

    if (/^[*+-]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[*+-]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[*+-]\s+/, ''))
        index += 1
      }
      blocks.push(
        <ul key={`unordered-${index}`} className="my-5 space-y-3">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-3 leading-7 text-foreground/85">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span><InlineText text={item} /></span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length
      && lines[index].trim()
      && !/^###\s+/.test(lines[index].trim())
      && !/^\d+\.\s+/.test(lines[index].trim())
      && !/^[*+-]\s+/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push(
      <p key={`paragraph-${index}`} className="my-4 leading-8 text-foreground/85">
        <InlineText text={paragraph.join(' ')} />
      </p>,
    )
  }

  return <div>{blocks}</div>
}

function keyQuotation(body: string) {
  const line = body.split('\n').map((item) => item.trim()).find((item) => /(?:famous|important) quotation/i.test(item))
  return line?.replace(/^[*+-]\s+/, '').replace(/^\d+\.\s+/, '').replace(/\*\*/g, '') ?? ''
}

function BookReader({
  book,
  categoryName,
  onClose,
  previousBook,
  nextBook,
  onOpenBook,
  readingState,
  onReadingStateChange,
}: {
  book: BookSummary
  categoryName: string
  onClose: () => void
  previousBook?: BookSummary
  nextBook?: BookSummary
  onOpenBook: (book: BookSummary) => void
  readingState: BookSummaryProgress
  onReadingStateChange: (slug: string, state: BookSummaryProgress) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastSavedProgress = useRef(readingState.progress)
  const [localReadingState, setLocalReadingState] = useState(readingState)
  const [readingProgress, setReadingProgress] = useState(readingState.progress)
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('cssvista:book-font-size') ?? 1))
  const [copied, setCopied] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const quote = useMemo(() => keyQuotation(book.body), [book.body])
  const readingMinutes = Math.max(2, Math.ceil(book.wordCount / 220))

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  useEffect(() => {
    const saved = getBookSummaryProgress(book.slug)
    lastSavedProgress.current = saved.progress
    const frame = window.requestAnimationFrame(() => {
      const reader = scrollRef.current
      if (!reader || saved.progress <= 0) return
      reader.scrollTop = ((reader.scrollHeight - reader.clientHeight) * saved.progress) / 100
    })
    return () => window.cancelAnimationFrame(frame)
  }, [book.slug])

  function persist(patch: Partial<Omit<BookSummaryProgress, 'updatedAt'>>) {
    const next = updateBookSummaryProgress(book.slug, patch)
    setLocalReadingState(next)
    onReadingStateChange(book.slug, next)
    return next
  }

  function handleReaderScroll() {
    const reader = scrollRef.current
    if (!reader) return
    const available = reader.scrollHeight - reader.clientHeight
    const next = available <= 0 ? 100 : Math.min(100, Math.round((reader.scrollTop / available) * 100))
    setReadingProgress(next)
    if (Math.abs(next - lastSavedProgress.current) >= 3 || next === 100) {
      lastSavedProgress.current = next
      persist({ progress: next })
    }
  }

  function toggleSaved() {
    persist({ saved: !localReadingState.saved })
  }

  function markCompleted() {
    const firstCompletion = !localReadingState.completed
    persist({ completed: true, progress: 100 })
    setReadingProgress(100)
    recordActivity({ type: 'page', label: `Completed book summary: ${book.title}`, path: '/book-summaries' })
    if (firstCompletion) setShowCelebration(true)
  }

  function changeFontSize(next: number) {
    const safe = Math.max(0, Math.min(2, next))
    setFontSize(safe)
    localStorage.setItem('cssvista:book-font-size', String(safe))
  }

  async function copyQuote() {
    if (!quote) return
    try {
      await navigator.clipboard.writeText(`${quote}\n— ${book.title}, ${book.author}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function printSummary() {
    printPage(true, '.book-summary-print-area')
  }

  return (
    <div
      className="book-summary-backdrop fixed inset-0 z-[120] flex bg-[#fcfdfc]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-summary-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <article className="book-summary-reader relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#fcfdfc]">
        <span className="absolute inset-x-0 top-0 z-20 h-1 bg-slate-100"><span className="cssv-progress block h-full bg-amber-400" style={{ width: `${localReadingState.completed ? 100 : readingProgress}%` }} /></span>
        <header className="flex items-start gap-4 border-b bg-white px-4 py-4 sm:px-6">
          <img
            src={book.cover}
            alt={`Cover of ${book.title}`}
            className="hidden h-28 w-[74px] rounded-md border object-cover shadow-sm sm:block"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{categoryName}</p>
            <h2 id="book-summary-title" className="mt-1 font-display text-2xl font-bold leading-tight text-pine sm:text-3xl">
              {book.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">by {book.author}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                <Clock3 className="h-3.5 w-3.5" /> {readingMinutes} min read
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-semibold text-emerald-800">{localReadingState.completed ? 'Completed' : `${readingProgress}% read`}</span>
              {book.priority && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                  <Sparkles className="h-3.5 w-3.5" /> Priority reading
                </span>
              )}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-pine transition-colors hover:bg-secondary"
            aria-label="Back to all book summaries"
          >
            <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">All summaries</span><X className="h-4 w-4 sm:hidden" />
          </button>
        </header>

        <div className="no-print flex gap-1.5 overflow-x-auto border-b bg-white px-3 py-2 sm:px-6" aria-label="Book reading tools">
          <button type="button" onClick={toggleSaved} aria-pressed={localReadingState.saved} className={`cssv-tap inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold ${localReadingState.saved ? 'border-amber-300 bg-amber-50 text-amber-900' : 'text-pine hover:bg-secondary'}`}>
            {localReadingState.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {localReadingState.saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={markCompleted} disabled={localReadingState.completed} className="cssv-tap inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-900 disabled:opacity-70">
            <CheckCircle2 className="h-4 w-4" /> {localReadingState.completed ? 'Completed' : 'Mark complete'}
          </button>
          {quote && <button type="button" onClick={() => void copyQuote()} className="cssv-tap inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold text-pine hover:bg-secondary"><Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Key quote'}</button>}
          <button type="button" onClick={printSummary} className="cssv-tap inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold text-pine hover:bg-secondary"><Printer className="h-4 w-4" /> Print</button>
          <span className="ml-auto flex shrink-0 items-center rounded-lg border bg-white">
            <button type="button" onClick={() => changeFontSize(fontSize - 1)} disabled={fontSize === 0} className="cssv-tap grid h-9 w-9 place-items-center text-pine disabled:opacity-35" aria-label="Decrease reading text size"><Minus className="h-4 w-4" /></button>
            <span className="text-[10px] font-bold text-slate-500">Text</span>
            <button type="button" onClick={() => changeFontSize(fontSize + 1)} disabled={fontSize === 2} className="cssv-tap grid h-9 w-9 place-items-center text-pine disabled:opacity-35" aria-label="Increase reading text size"><Plus className="h-4 w-4" /></button>
          </span>
        </div>

        <div ref={scrollRef} onScroll={handleReaderScroll} className="book-summary-scroll-area min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
          <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8 sm:py-9">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Book summary</p>
              <p className="mt-2 leading-7 text-foreground/85">{book.excerpt}</p>
            </div>
            <div className={`book-summary-reading-copy ${fontSize === 0 ? 'book-text-small' : fontSize === 2 ? 'book-text-large' : ''}`}>
              <SummaryBody body={book.body} />
            </div>
            {book.coverSource && (
              <p className="mt-9 border-t pt-4 text-xs text-muted-foreground">
                Cover metadata from{' '}
                <a
                  href={book.coverSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-800 hover:underline"
                >
                  {book.coverProvider}
                </a>.
              </p>
            )}
            <div className="no-print mt-8 grid grid-cols-2 gap-2 border-t pt-5">
              {previousBook ? <button type="button" onClick={() => onOpenBook(previousBook)} className="cssv-tap inline-flex min-h-11 items-center justify-start gap-2 rounded-lg border px-3 text-left text-xs font-bold text-pine hover:bg-secondary"><ArrowLeft className="h-4 w-4 shrink-0" /><span className="line-clamp-1">{previousBook.title}</span></button> : <span />}
              {nextBook && <button type="button" onClick={() => onOpenBook(nextBook)} className="cssv-tap inline-flex min-h-11 items-center justify-end gap-2 rounded-lg border px-3 text-right text-xs font-bold text-pine hover:bg-secondary"><span className="line-clamp-1">{nextBook.title}</span><ArrowRight className="h-4 w-4 shrink-0" /></button>}
            </div>
          </div>
        </div>

        <section className="book-summary-print-area" aria-label={`Printable summary of ${book.title}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{categoryName}</p>
          <h1 className="mt-2 text-2xl font-bold text-emerald-950">{book.title}</h1>
          <p className="mt-1 text-sm">by {book.author}</p>
          <div className="mt-5 border-l-4 border-amber-400 bg-amber-50 p-4"><p className="leading-7">{book.excerpt}</p></div>
          <SummaryBody body={book.body} />
        </section>
      </article>
      <MilestoneCelebration
        open={showCelebration}
        title={`${book.title} completed`}
        description="The summary is now marked complete and saved with your reading progress."
        onClose={() => setShowCelebration(false)}
      />
    </div>
  )
}

export default function BookSummaries() {
  const navigate = useNavigate()
  const location = useLocation()
  const { slug: routeBookSlug } = useParams<{ slug?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [library, setLibrary] = useState<BookSummaryLibrary | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(() => searchParams.get('search') ?? '')
  const [category, setCategory] = useState(() => searchParams.get('category') ?? 'all')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [readingStates, setReadingStates] = useState(() => getAllBookSummaryProgress())

  useEffect(() => {
    setQuery(searchParams.get('search') ?? '')
    setCategory(searchParams.get('category') ?? 'all')
  }, [searchParams])

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setLibrary(null)
    loadBookSummaries(controller.signal)
      .then(setLibrary)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError('Book summaries are temporarily unavailable. Please try again.')
      })
    return () => controller.abort()
  }, [loadAttempt])

  const categoriesBySlug = useMemo(
    () => new Map(library?.categories.map((item) => [item.slug, item.name]) ?? []),
    [library],
  )

  const filteredBooks = useMemo(() => {
    if (!library) return []
    const needle = query.trim().toLocaleLowerCase()
    return library.books.filter((book) => {
      if (category !== 'all' && book.category !== category) return false
      if (!needle) return true
      return `${book.title} ${book.author} ${categoriesBySlug.get(book.category) ?? ''} ${book.excerpt} ${book.body}`
        .toLocaleLowerCase()
        .includes(needle)
    })
  }, [library, query, category, categoriesBySlug])

  const totalWords = useMemo(
    () => library?.books.reduce((sum, book) => sum + book.wordCount, 0) ?? 0,
    [library],
  )

  const requestedBookSlug = routeBookSlug ?? searchParams.get('book')
  const activeBook = useMemo(
    () => requestedBookSlug && library
      ? library.books.find((book) => book.slug === requestedBookSlug) ?? null
      : null,
    [library, requestedBookSlug],
  )

  function updateSearch(nextQuery: string) {
    setQuery(nextQuery)
    const next = new URLSearchParams(searchParams)
    if (nextQuery.trim()) next.set('search', nextQuery)
    else next.delete('search')
    next.delete('book')
    setSearchParams(next, { replace: true })
  }

  function updateCategory(nextCategory: string) {
    setCategory(nextCategory)
    const next = new URLSearchParams(searchParams)
    if (nextCategory !== 'all') next.set('category', nextCategory)
    else next.delete('category')
    next.delete('book')
    setSearchParams(next, { replace: true })
  }

  function openBook(book: BookSummary, replace = false) {
    navigate(`/book-summaries/${book.slug}`, {
      replace,
      state: replace ? location.state : { fromBookSummaries: true },
    })
    recordActivity({ type: 'page', label: `Book summary: ${book.title}`, path: '/book-summaries' })
  }

  const closeBook = useCallback(() => {
    const fromBookSummaries = Boolean((location.state as { fromBookSummaries?: boolean } | null)?.fromBookSummaries)
    if (routeBookSlug && fromBookSummaries) {
      navigate(-1)
      return
    }
    if (routeBookSlug) {
      navigate('/book-summaries', { replace: true })
      return
    }
    const next = new URLSearchParams(searchParams)
    next.delete('book')
    setSearchParams(next, { replace: true })
  }, [location.state, navigate, routeBookSlug, searchParams, setSearchParams])

  usePageBack(Boolean(activeBook), closeBook)

  const activeBookIndex = activeBook ? filteredBooks.findIndex((book) => book.slug === activeBook.slug) : -1

  useEffect(() => {
    if (!activeBook || !routeBookSlug) return
    const canonical = `https://www.css-vista.com/book-summaries/${activeBook.slug}`
    const title = `${activeBook.title} by ${activeBook.author} — Book Summary | CSS Vista`
    const description = `${activeBook.title} by ${activeBook.author}: ${activeBook.excerpt}`.slice(0, 158).trim()
    const metaUpdates: Array<[string, string]> = [
      ['meta[name="description"]', description],
      ['meta[name="robots"]', 'index, follow, max-image-preview:large'],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[property="og:url"]', canonical],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ]
    const previousTitle = document.title
    const previousMeta = metaUpdates.map(([selector]) => document.querySelector<HTMLMetaElement>(selector)?.content ?? null)
    const canonicalNode = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const previousCanonical = canonicalNode?.href ?? null
    const existingSchema = document.getElementById('cssv-route-structured-data') as HTMLScriptElement | null
    const schema = existingSchema || document.createElement('script')
    const previousSchema = existingSchema?.textContent ?? null

    document.title = title
    metaUpdates.forEach(([selector, content]) => document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content))
    canonicalNode?.setAttribute('href', canonical)
    schema.id = 'cssv-route-structured-data'
    schema.type = 'application/ld+json'
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: `${activeBook.title} summary`,
          description,
          url: canonical,
          mainEntityOfPage: canonical,
          inLanguage: 'en',
          about: { '@type': 'Book', name: activeBook.title, author: { '@type': 'Person', name: activeBook.author } },
          publisher: { '@type': 'Organization', name: 'CSS Vista', url: 'https://www.css-vista.com/' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.css-vista.com/' },
            { '@type': 'ListItem', position: 2, name: 'Book Summaries', item: 'https://www.css-vista.com/book-summaries' },
            { '@type': 'ListItem', position: 3, name: activeBook.title, item: canonical },
          ],
        },
      ],
    })
    if (!existingSchema) document.head.appendChild(schema)

    return () => {
      document.title = previousTitle
      metaUpdates.forEach(([selector], index) => {
        const node = document.querySelector<HTMLMetaElement>(selector)
        if (node && previousMeta[index] !== null) node.content = previousMeta[index]!
      })
      if (canonicalNode && previousCanonical) canonicalNode.href = previousCanonical
      if (!existingSchema) schema.remove()
      else schema.text = previousSchema ?? ''
    }
  }, [activeBook, routeBookSlug])

  return (
    <div>
      <PageHeader
        title="Book Summaries"
        description="Clear, exam-focused summaries of influential books for essays, current affairs, political thought, international relations, economics, society, Pakistan and literature."
      />

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-amber-700" />
            <h2 className="mt-3 font-semibold text-pine">We could not open the reading library</h2>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-4 min-h-10 rounded-lg bg-pine px-4 text-sm font-bold text-white">
              Try again
            </button>
          </div>
        ) : !library ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading book summaries">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="h-[430px] animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl bg-pine px-5 py-6 text-emerald-50 shadow-lg sm:px-8 sm:py-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <LibraryBig className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">CSS Vista reading library</span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
                    Read the central ideas before opening the complete summary
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-50/80">
                    Browse concise previews, then open a focused reader with the complete supplied explanation, lessons and quotations.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-2xl font-bold">{library.total}</div>
                    <div className="text-[11px] text-emerald-100">Books</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-2xl font-bold">{library.categories.length}</div>
                    <div className="text-[11px] text-emerald-100">Categories</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-2xl font-bold">{Math.round(totalWords / 1000)}k</div>
                    <div className="text-[11px] text-emerald-100">Words</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-white p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => updateSearch(event.target.value)}
                  placeholder="Search books, authors, ideas or topics..."
                  aria-label="Search book summaries"
                  className="h-11 w-full rounded-lg border border-input pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Book summary categories">
                <button
                  type="button"
                  onClick={() => updateCategory('all')}
                  aria-pressed={category === 'all'}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    category === 'all' ? 'bg-pine text-emerald-50' : 'bg-secondary text-pine hover:bg-emerald-50'
                  }`}
                >
                  All {library.total}
                </button>
                {library.categories.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => updateCategory(item.slug)}
                    aria-pressed={category === item.slug}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      category === item.slug ? 'bg-pine text-emerald-50' : 'bg-secondary text-pine hover:bg-emerald-50'
                    }`}
                  >
                    {item.name} {item.total}
                  </button>
                ))}
              </div>
            </section>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-pine">
                  {category === 'all' ? 'All summaries' : categoriesBySlug.get(category)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{filteredBooks.length} books found</p>
              </div>
            </div>

            {requestedBookSlug && !activeBook && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
                This book summary is not available. You can browse the complete library below.
              </div>
            )}

            {filteredBooks.length ? (
              <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredBooks.map((book) => (
                  <article
                    key={book.slug}
                    className="cssv-tap group flex overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:flex-col"
                  >
                    <div className="relative w-[116px] shrink-0 overflow-hidden bg-gradient-to-br from-emerald-50 to-stone-100 sm:aspect-[4/3] sm:w-full">
                      <img
                        src={book.cover}
                        alt={`Cover of ${book.title}`}
                        loading="lazy"
                        className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.035] sm:p-3"
                      />
                      {book.priority && (
                        <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow">
                          Priority
                        </span>
                      )}
                      {readingStates[book.slug]?.completed ? (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-emerald-800 px-2 py-1 text-[9px] font-bold text-white shadow"><CheckCircle2 className="h-3 w-3" /> Completed</span>
                      ) : readingStates[book.slug]?.saved ? (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-bold text-amber-950 shadow"><BookmarkCheck className="h-3 w-3" /> Saved</span>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        {categoriesBySlug.get(book.category)}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-bold leading-snug text-pine">{book.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">by {book.author}</p>
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Book summary</p>
                        <p className="book-summary-excerpt mt-1 text-sm leading-6 text-muted-foreground">{book.excerpt}</p>
                      </div>
                      <Link
                        to={`/book-summaries/${book.slug}`}
                        state={{ fromBookSummaries: true }}
                        onClick={() => recordActivity({ type: 'page', label: `Book summary: ${book.title}`, path: `/book-summaries/${book.slug}` })}
                        className="mt-auto inline-flex items-center justify-between gap-2 pt-4 text-sm font-bold text-emerald-800"
                        aria-label={`Open summary of ${book.title}`}
                      >
                        Open summary
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                      {(readingStates[book.slug]?.progress ?? 0) > 0 && !readingStates[book.slug]?.completed && (
                        <span className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100" aria-label={`${readingStates[book.slug].progress}% read`}>
                          <span className="cssv-progress block h-full rounded-full bg-amber-400" style={{ width: `${readingStates[book.slug].progress}%` }} />
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <div className="rounded-xl border border-dashed bg-secondary/30 p-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 font-semibold text-pine">{query.trim() ? 'No summaries match this search' : 'No summaries available in this category yet'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{query.trim() ? 'Try a book title, author, category or another topic.' : 'Choose another category to continue browsing.'}</p>
              </div>
            )}
          </>
        )}
      </main>

      {activeBook && (
        <BookReader
          key={activeBook.slug}
          book={activeBook}
          categoryName={categoriesBySlug.get(activeBook.category) ?? 'Book Summary'}
          onClose={closeBook}
          previousBook={activeBookIndex > 0 ? filteredBooks[activeBookIndex - 1] : undefined}
          nextBook={activeBookIndex >= 0 && activeBookIndex < filteredBooks.length - 1 ? filteredBooks[activeBookIndex + 1] : undefined}
          onOpenBook={(book) => openBook(book, true)}
          readingState={readingStates[activeBook.slug] ?? getBookSummaryProgress(activeBook.slug)}
          onReadingStateChange={(slug, state) => setReadingStates((current) => ({ ...current, [slug]: state }))}
        />
      )}
    </div>
  )
}
