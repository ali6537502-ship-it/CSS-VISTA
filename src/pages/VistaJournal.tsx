import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, FileText, Send, X } from 'lucide-react'
import { opinions, type Opinion } from '@/data/books'
import { usePageBack } from '@/lib/backNavigation'

const journalTopics = [
  'Pakistan & Governance',
  'International Affairs',
  'Economy & Development',
  'Technology & AI',
  'Environment & Climate',
  'Law & Society',
  'Ideas & History',
]

const submissionHref =
  'https://wa.me/923166050195?text=I%20would%20like%20to%20submit%20an%20article%20for%20VISTA%20Journal%20editorial%20review.'

export default function VistaJournal() {
  const [active, setActive] = useState<Opinion | null>(null)
  const [pageIdx, setPageIdx] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)
  usePageBack(Boolean(active), () => setActive(null))

  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setActive(null); return }
      if (event.key === 'ArrowLeft') setPageIdx((p) => Math.max(0, p - 1))
      if (event.key === 'ArrowRight') setPageIdx((p) => Math.min(active.pages.length - 1, p + 1))
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [active])

  const featured = opinions[0]
  const latest = opinions.slice(1)

  const openArticle = (article: Opinion) => {
    setActive(article)
    setPageIdx(0)
  }

  return (
    <div className="bg-background">
      <header className="border-b bg-secondary/35">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">CSS VISTA presents</p>
          <div className="mt-3 max-w-4xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-pine sm:text-6xl">VISTA Journal</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Original writing, informed analysis and serious perspectives on Pakistan and the wider world.
            </p>
          </div>
          <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-pine/10 pt-5 text-sm font-semibold text-pine" aria-label="Journal sections">
            <a href="#featured" className="hover:text-emerald-700">Featured</a>
            <a href="#latest" className="hover:text-emerald-700">Latest</a>
            <a href="#topics" className="hover:text-emerald-700">Topics</a>
            <a href="#write" className="hover:text-emerald-700">Write for VISTA Journal</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        {featured && (
          <section id="featured" aria-labelledby="featured-heading">
            <div className="mb-5 flex items-end justify-between gap-4 border-b pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Editor’s selection</p>
                <h2 id="featured-heading" className="mt-1 font-display text-2xl font-bold text-pine">Featured</h2>
              </div>
            </div>

            <button
              onClick={() => openArticle(featured)}
              className="group grid w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-shadow hover:shadow-lg lg:grid-cols-[1.4fr_1fr]"
            >
              <div className="relative min-h-[320px] overflow-hidden bg-secondary sm:min-h-[420px]">
                <img
                  src={featured.pages[0]}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{featured.outlet}</p>
                <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-pine sm:text-3xl">{featured.title}</h3>
                <p className="mt-4 text-sm text-muted-foreground">{featured.date} · {featured.pages.length} {featured.pages.length === 1 ? 'page' : 'pages'}</p>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-pine">
                  Read publication <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
          </section>
        )}

        <section id="latest" className="mt-14" aria-labelledby="latest-heading">
          <div className="mb-5 border-b pb-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">From the journal</p>
            <h2 id="latest-heading" className="mt-1 font-display text-2xl font-bold text-pine">Latest Publications</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((article) => (
              <button
                key={article.slug}
                onClick={() => openArticle(article)}
                className="group overflow-hidden rounded-xl border bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-64 overflow-hidden bg-secondary">
                  <img
                    src={article.pages[0]}
                    alt={article.title}
                    className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">{article.outlet}</p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-pine">{article.title}</h3>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{article.date}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-pine">
                      <FileText className="h-3.5 w-3.5" /> Read
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="topics" className="mt-14 border-y py-8" aria-labelledby="topics-heading">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Browse the journal</p>
              <h2 id="topics-heading" className="mt-1 font-display text-2xl font-bold text-pine">Explore by Topic</h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {journalTopics.map((topic) => (
                <span key={topic} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-pine">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="write" className="mt-14 overflow-hidden rounded-2xl bg-pine text-white" aria-labelledby="write-heading">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Write for VISTA Journal</p>
              <h2 id="write-heading" className="mt-2 font-display text-2xl font-bold sm:text-3xl">Have something worth publishing? Send us your best work.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/85">
                The top two selected articles go live every Tuesday and Saturday. We welcome original, well-researched writing on public affairs, governance, international relations, economy, technology, environment, law, society and contemporary issues.
              </p>
              <p className="mt-4 text-xs leading-5 text-emerald-50/70">
                Submission does not guarantee publication. All articles are selected on editorial merit.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-emerald-100">For editorial review</p>
              <p className="mt-1 font-display text-2xl font-bold">03166050195</p>
              <a
                href={submissionHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-pine hover:bg-emerald-50"
              >
                <Send className="h-4 w-4" /> Submit your article
              </a>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-xl border bg-white p-6 sm:p-7" aria-labelledby="guidelines-heading">
          <h2 id="guidelines-heading" className="font-display text-xl font-bold text-pine">Submission Guidelines</h2>
          <div className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-bold text-pine">Original</p>
              <p className="mt-1 leading-6 text-muted-foreground">The article must be your own work and free from plagiarism.</p>
            </div>
            <div>
              <p className="font-bold text-pine">Well-researched</p>
              <p className="mt-1 leading-6 text-muted-foreground">Important facts, figures and quotations should be supported by credible sources.</p>
            </div>
            <div>
              <p className="font-bold text-pine">Clearly written</p>
              <p className="mt-1 leading-6 text-muted-foreground">Keep one clear central argument and a coherent structure throughout.</p>
            </div>
            <div>
              <p className="font-bold text-pine">Editorial review</p>
              <p className="mt-1 leading-6 text-muted-foreground">Selected pieces may be lightly edited for clarity, language and presentation.</p>
            </div>
          </div>
        </section>
      </main>

      {active && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title} reader`}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white" onClick={(event) => event.stopPropagation()}>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{active.title}</p>
              <p className="text-xs text-emerald-300">{active.outlet} · {active.date} · Page {pageIdx + 1} of {active.pages.length}</p>
            </div>
            <button ref={closeRef} onClick={() => setActive(null)} className="shrink-0 rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto px-4 pb-4" onClick={(event) => event.stopPropagation()}>
            <img src={active.pages[pageIdx]} alt={`${active.title} - page ${pageIdx + 1}`} className="mx-auto max-h-full rounded-lg bg-white object-contain" />
          </div>
          {active.pages.length > 1 && (
            <div className="flex items-center justify-center gap-3 pb-4" onClick={(event) => event.stopPropagation()}>
              <button
                onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                disabled={pageIdx === 0}
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPageIdx((p) => Math.min(active.pages.length - 1, p + 1))}
                disabled={pageIdx === active.pages.length - 1}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-30"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
