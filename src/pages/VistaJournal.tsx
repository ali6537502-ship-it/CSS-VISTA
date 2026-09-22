import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, FileText, Send, X } from 'lucide-react'
import { Link } from 'react-router'
import { opinions, type Opinion } from '@/data/books'
import {
  formatJournalDate, journalReadingMinutes, loadPublishedJournalArticles, type JournalArticle,
} from '@/lib/journal'
import { usePageBack } from '@/lib/backNavigation'

const editorialAreas = [
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

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'

function ArticleBody({ body }: { body: string }) {
  const blocks = body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (/^###\s+/.test(block)) {
          return <h4 key={index} className="pt-2 font-display text-lg font-bold text-pine">{block.replace(/^###\s+/, '')}</h4>
        }
        if (/^##\s+/.test(block)) {
          return <h3 key={index} className="pt-3 font-display text-xl font-bold text-pine">{block.replace(/^##\s+/, '')}</h3>
        }
        if (/^#\s+/.test(block)) {
          return <h2 key={index} className="pt-3 font-display text-2xl font-bold text-pine">{block.replace(/^#\s+/, '')}</h2>
        }

        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
        if (lines.length > 0 && lines.every((line) => /^-\s+/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6 text-[15px] leading-7 text-foreground/90">
              {lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^-\s+/, '')}</li>)}
            </ul>
          )
        }

        if (lines.length > 0 && lines.every((line) => /^>\s?/.test(line))) {
          return (
            <blockquote key={index} className="border-l-4 border-emerald-700 bg-secondary/40 px-5 py-4 font-serif text-base italic leading-7 text-pine">
              {lines.map((line) => line.replace(/^>\s?/, '')).join(' ')}
            </blockquote>
          )
        }

        return <p key={index} className="whitespace-pre-line text-[15px] leading-8 text-foreground/90 sm:text-base">{block}</p>
      })}
    </div>
  )
}

export default function VistaJournal() {
  const [articles, setArticles] = useState<JournalArticle[]>([])
  const [articlesLoading, setArticlesLoading] = useState(true)
  const [articlesError, setArticlesError] = useState('')
  const [activeArticle, setActiveArticle] = useState<JournalArticle | null>(null)
  const [activeLegacy, setActiveLegacy] = useState<Opinion | null>(null)
  const [pageIdx, setPageIdx] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  usePageBack(Boolean(activeArticle || activeLegacy), () => {
    setActiveArticle(null)
    setActiveLegacy(null)
  })

  useEffect(() => {
    const controller = new AbortController()
    setArticlesLoading(true)
    void loadPublishedJournalArticles(controller.signal)
      .then((rows) => {
        setArticles(rows)
        setArticlesError('')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setArticlesError(error instanceof Error ? error.message : 'New Journal articles could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setArticlesLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!activeArticle && !activeLegacy) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveArticle(null)
        setActiveLegacy(null)
        return
      }
      if (!activeLegacy) return
      if (event.key === 'ArrowLeft') setPageIdx((p) => Math.max(0, p - 1))
      if (event.key === 'ArrowRight') setPageIdx((p) => Math.min(activeLegacy.pages.length - 1, p + 1))
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
  }, [activeArticle, activeLegacy])

  const featuredArticle = articles.find((article) => article.featured) ?? articles[0]
  const remainingArticles = articles.filter((article) => article.id !== featuredArticle?.id)
  const fallbackFeatured = opinions[0]
  const legacyArchive = opinions.filter((article) => featuredArticle || article !== fallbackFeatured)

  const openLegacy = (article: Opinion) => {
    setActiveLegacy(article)
    setActiveArticle(null)
    setPageIdx(0)
  }

  return (
    <div className="bg-background">
      <header className="border-b border-pine/10 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-11 sm:py-14">
          <div className="border-l-4 border-emerald-700 pl-5 sm:pl-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-700">A publication of CSS VISTA</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-pine sm:text-6xl">VISTA Journal</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Original writing, informed analysis and serious perspectives on Pakistan and the wider world.
            </p>
          </div>

          <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-pine/10 pt-5 text-sm font-semibold text-pine" aria-label="Journal sections">
            <a href="#featured" className={`transition-colors hover:text-emerald-700 ${focusRing}`}>Featured</a>
            {remainingArticles.length > 0 && <a href="#publications" className={`transition-colors hover:text-emerald-700 ${focusRing}`}>Latest</a>}
            <a href="#archive" className={`transition-colors hover:text-emerald-700 ${focusRing}`}>Earlier Publications</a>
            <a href="#areas" className={`transition-colors hover:text-emerald-700 ${focusRing}`}>Editorial Areas</a>
            <a href="#write" className={`transition-colors hover:text-emerald-700 ${focusRing}`}>Write for VISTA Journal</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <section id="featured" className="scroll-mt-24" aria-labelledby="featured-heading">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-pine/10 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                {featuredArticle ? 'Editor’s Selection' : 'From the Archive'}
              </p>
              <h2 id="featured-heading" className="mt-1 font-display text-2xl font-bold text-pine">Featured</h2>
            </div>
          </div>

          {articlesLoading ? (
            <div className="rounded-2xl border border-pine/10 bg-white p-8 shadow-sm">
              <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
              <div className="mt-5 h-8 max-w-2xl animate-pulse rounded bg-secondary" />
              <div className="mt-4 h-4 max-w-xl animate-pulse rounded bg-secondary" />
              <div className="mt-2 h-4 max-w-lg animate-pulse rounded bg-secondary" />
            </div>
          ) : featuredArticle ? (
            <button
              type="button"
              onClick={() => setActiveArticle(featuredArticle)}
              className={`group grid w-full overflow-hidden rounded-2xl border border-pine/10 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg lg:grid-cols-[0.75fr_1.25fr] ${focusRing}`}
            >
              <div className="flex min-h-[280px] items-center justify-center bg-pine p-8 text-white sm:min-h-[350px]">
                <div className="max-w-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">{featuredArticle.category}</p>
                  <p className="mt-5 font-display text-3xl font-bold leading-tight sm:text-4xl">VISTA Journal</p>
                  <p className="mt-4 text-sm leading-6 text-emerald-50/80">Text Edition · {formatJournalDate(featuredArticle.published_on)}</p>
                </div>
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">{featuredArticle.category}</p>
                <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-pine sm:text-4xl">{featuredArticle.title}</h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{featuredArticle.excerpt}</p>
                <p className="mt-5 text-sm font-semibold text-pine">
                  By {featuredArticle.author}{featuredArticle.author_role ? <span className="font-normal text-muted-foreground"> · {featuredArticle.author_role}</span> : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatJournalDate(featuredArticle.published_on)} · {journalReadingMinutes(featuredArticle.body)} min read
                </p>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-pine">
                  Read full article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
          ) : fallbackFeatured ? (
            <button
              type="button"
              onClick={() => openLegacy(fallbackFeatured)}
              className={`group grid w-full overflow-hidden rounded-2xl border border-pine/10 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg lg:grid-cols-[1fr_1fr] ${focusRing}`}
            >
              <div className="flex min-h-[300px] items-center justify-center bg-secondary/60 p-6">
                <img src={fallbackFeatured.pages[0]} alt="" className="max-h-[340px] max-w-full rounded-sm border bg-white object-contain shadow-md" />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-9">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Earlier Publication</p>
                <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-pine sm:text-3xl">{fallbackFeatured.title}</h3>
                <p className="mt-4 text-sm text-muted-foreground">{fallbackFeatured.date}</p>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-pine">
                  Read as published <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>
          ) : null}

          {articlesError && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              New text publications are temporarily unavailable. Earlier published articles remain accessible below.
            </p>
          )}
        </section>

        {remainingArticles.length > 0 && (
          <section id="publications" className="mt-14 scroll-mt-24" aria-labelledby="publications-heading">
            <div className="mb-5 border-b border-pine/10 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Text Editions</p>
              <h2 id="publications-heading" className="mt-1 font-display text-2xl font-bold text-pine">Latest Publications</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {remainingArticles.map((article) => (
                <button
                  type="button"
                  key={article.id}
                  onClick={() => setActiveArticle(article)}
                  className={`group flex min-h-[280px] flex-col rounded-xl border border-pine/10 bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${focusRing}`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">{article.category}</p>
                  <h3 className="mt-3 font-display text-xl font-bold leading-snug text-pine">{article.title}</h3>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{article.excerpt}</p>
                  <div className="mt-auto border-t border-pine/10 pt-4">
                    <p className="text-xs font-semibold text-pine">By {article.author}</p>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{formatJournalDate(article.published_on)}</span>
                      <span>{journalReadingMinutes(article.body)} min read</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section id="archive" className="mt-14 scroll-mt-24" aria-labelledby="archive-heading">
          <div className="mb-5 border-b border-pine/10 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Image Archive</p>
            <h2 id="archive-heading" className="mt-1 font-display text-2xl font-bold text-pine">Earlier Publications</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Earlier VISTA publications are preserved in their original printed-image format. New VISTA Journal articles are published in readable text form above.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {legacyArchive.map((article) => (
              <button
                type="button"
                key={article.slug}
                onClick={() => openLegacy(article)}
                className={`group overflow-hidden rounded-xl border border-pine/10 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${focusRing}`}
              >
                <div className="flex h-56 items-center justify-center overflow-hidden bg-secondary/50 p-4">
                  <img
                    src={article.pages[0]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-auto max-w-full rounded-sm border bg-white object-contain shadow-sm transition-transform duration-500 group-hover:scale-[1.015]"
                  />
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">{article.outlet}</p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-pine">{article.title}</h3>
                  {article.author && <p className="mt-3 text-xs font-semibold text-pine">By {article.author}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-pine/10 pt-3 text-xs text-muted-foreground">
                    <span>{article.date}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-pine"><FileText className="h-3.5 w-3.5" /> Read archive</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="areas" className="mt-14 scroll-mt-24 border-y border-pine/10 py-8" aria-labelledby="areas-heading">
          <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">What We Cover</p>
              <h2 id="areas-heading" className="mt-1 font-display text-2xl font-bold text-pine">Editorial Areas</h2>
            </div>
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
              {editorialAreas.map((area) => (
                <div key={area} className="border-b border-pine/10 py-3 text-sm font-semibold text-pine">{area}</div>
              ))}
            </div>
          </div>
        </section>

        <section id="write" className="mt-14 scroll-mt-24 overflow-hidden rounded-2xl bg-pine text-white" aria-labelledby="write-heading">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">Write for VISTA Journal</p>
              <h2 id="write-heading" className="mt-2 max-w-2xl font-display text-2xl font-bold leading-tight sm:text-3xl">
                Have something worth publishing? Send us your best work.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/90">
                The top two selected articles are published every Tuesday and Saturday. We welcome original, well-researched writing on public affairs, governance, international relations, economy, technology, environment, law, society and contemporary issues.
              </p>
              <p className="mt-4 text-xs leading-5 text-emerald-50/70">
                Submission does not guarantee publication. Selection is based on editorial merit.
              </p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Article Submissions</p>
              <p className="mt-2 font-display text-2xl font-bold">03166050195</p>
              <a
                href={submissionHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-pine transition-colors hover:bg-emerald-50 ${focusRing}`}
              >
                <Send className="h-4 w-4" /> Submit via WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-pine/10 bg-white p-6 sm:p-7" aria-labelledby="guidelines-heading">
          <div className="flex flex-col gap-2 border-b border-pine/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Before You Submit</p>
              <h2 id="guidelines-heading" className="mt-1 font-display text-xl font-bold text-pine">Submission Guidelines</h2>
            </div>
            <Link to="/editorial-policy" className={`text-xs font-semibold text-emerald-700 hover:underline ${focusRing}`}>Editorial policy →</Link>
          </div>

          <div className="mt-5 grid gap-5 text-sm sm:grid-cols-3">
            <div><p className="font-bold text-pine">Original work</p><p className="mt-1 leading-6 text-muted-foreground">Submissions must be the writer’s own work and free from plagiarism.</p></div>
            <div><p className="font-bold text-pine">Credible evidence</p><p className="mt-1 leading-6 text-muted-foreground">Facts, figures and quotations should be supported by reliable sources.</p></div>
            <div><p className="font-bold text-pine">Clear argument</p><p className="mt-1 leading-6 text-muted-foreground">Writing should be focused, coherent and built around a clear central argument.</p></div>
          </div>

          <p className="mt-6 border-t border-pine/10 pt-4 text-xs leading-5 text-muted-foreground">
            Selected submissions may be lightly edited for clarity, language and presentation. Views expressed in published articles remain those of their respective authors.
          </p>
        </section>
      </main>

      {activeArticle && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 sm:p-6"
          onClick={() => setActiveArticle(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeArticle.title} article`}
        >
          <article className="mx-auto min-h-full max-w-4xl rounded-xl bg-[#fffef8] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-[#fffef8]/95 px-5 py-4 backdrop-blur sm:px-8">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{activeArticle.category}</p>
                <p className="truncate text-xs text-muted-foreground">{formatJournalDate(activeArticle.published_on)} · {journalReadingMinutes(activeArticle.body)} min read</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setActiveArticle(null)}
                className={`shrink-0 rounded-full border bg-white p-2 text-pine hover:bg-secondary ${focusRing}`}
                aria-label="Close article"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
              <header className="border-b border-pine/10 pb-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{activeArticle.category}</p>
                <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-pine sm:text-5xl">{activeArticle.title}</h1>
                <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">{activeArticle.excerpt}</p>
                <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-bold text-pine">By {activeArticle.author}</span>
                  {activeArticle.author_role && <span className="text-muted-foreground">{activeArticle.author_role}</span>}
                  <span className="text-muted-foreground">· {formatJournalDate(activeArticle.published_on)}</span>
                </div>
              </header>
              <div className="mx-auto mt-8 max-w-3xl"><ArticleBody body={activeArticle.body} /></div>
            </div>
          </article>
        </div>
      )}

      {activeLegacy && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setActiveLegacy(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeLegacy.title} archive reader`}
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-white" onClick={(event) => event.stopPropagation()}>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{activeLegacy.title}</p>
              <p className="mt-0.5 truncate text-xs text-emerald-300">
                {activeLegacy.author ? `By ${activeLegacy.author} · ` : ''}{activeLegacy.outlet} · {activeLegacy.date}
              </p>
            </div>
            <button ref={closeRef} type="button" onClick={() => setActiveLegacy(null)} className={`shrink-0 rounded-full bg-white/10 p-2 hover:bg-white/20 ${focusRing}`} aria-label="Close archive reader">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto px-3 py-3 sm:px-5" onClick={(event) => event.stopPropagation()}>
            <img src={activeLegacy.pages[pageIdx]} alt={`${activeLegacy.title} — published page ${pageIdx + 1}`} className="mx-auto max-h-full max-w-full rounded-sm bg-white object-contain shadow-2xl" />
          </div>

          <div className="border-t border-white/10 px-4 py-3" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
              <button type="button" onClick={() => setPageIdx((p) => Math.max(0, p - 1))} disabled={pageIdx === 0} className={`inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <p className="text-xs font-semibold text-white/75" aria-live="polite">Page {pageIdx + 1} of {activeLegacy.pages.length}</p>
              <button type="button" onClick={() => setPageIdx((p) => Math.min(activeLegacy.pages.length - 1, p + 1))} disabled={pageIdx === activeLegacy.pages.length - 1} className={`inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`}>
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
