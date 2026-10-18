import { Link, useParams } from 'react-router'
import ArticleBody from '@/components/JournalArticleBody'
import journalTranscripts from '@/data/journalTranscripts.generated.json'
import { formatJournalDate, journalReadingMinutes } from '@/lib/journal'
import NotFound from '@/pages/NotFound'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'

export default function JournalArchiveArticle({ articleSlug }: { articleSlug?: string }) {
  const { slug: routeSlug } = useParams()
  const slug = articleSlug ?? routeSlug
  const transcript = journalTranscripts.articles.find(article => article.slug === slug)
  if (!transcript) return <NotFound />
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-emerald-800"><Link to="/">Home</Link>{' / '}<Link to="/journal">VISTA Journal</Link></nav>
      <header className="mt-7 border-b border-pine/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Journal archive · Opinion</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-pine sm:text-5xl">{transcript.title}</h1>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">By {transcript.author} · <time dateTime={transcript.publishedOn}>{formatJournalDate(transcript.publishedOn)}</time> · {journalReadingMinutes(transcript.body)} min read</p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">This text edition preserves the archived article and its printed date. Historical claims and forecasts reflect that date; any later clarifications are labelled separately. Original page images are linked at the end.</p>
      </header>
      <article className="journal-archive-copy mx-auto mt-6 max-w-3xl border-t border-pine/10 pt-6" aria-label={`${transcript.title} transcript`}>
        {transcript.editorialNotes.map((note) => (
          <aside key={note.id} className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5" aria-labelledby={`${transcript.slug}-${note.id}`}>
            <p className="text-xs font-semibold text-amber-900">Editorial clarification · <time dateTime={note.issuedOn}>{formatJournalDate(note.issuedOn)}</time></p>
            <h2 id={`${transcript.slug}-${note.id}`} className="mt-2 font-display text-lg font-bold text-pine">{note.title}</h2>
            <p className="mt-3 text-sm leading-7 text-foreground/90">{note.body}</p>
            {note.sources.length > 0 && (
              <ul className="mt-3 space-y-2 text-xs leading-6">
                {note.sources.map((source) => (
                  <li key={source.url}><a href={source.url} className={`font-semibold text-emerald-800 underline ${focusRing}`}>{source.label}</a></li>
                ))}
              </ul>
            )}
          </aside>
        ))}
        {transcript.editorialNotes.length > 0 && <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Original archived text</p>}
        <ArticleBody body={transcript.body} />
        <footer className="mt-7 border-t border-pine/10 pt-4 text-xs leading-6 text-muted-foreground">
          <p>Source: existing archive page images. Line wrapping and page furniture have been normalised for reading.</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {transcript.imageSources.map((source) => (
              <a key={source.image} href={source.image} className={`font-semibold text-emerald-700 hover:underline ${focusRing}`}>
                Original page {source.page}
              </a>
            ))}
          </p>
        </footer>
      </article>
      <nav aria-label="More Journal articles" className="mt-10 border-t pt-6">
        <h2 className="font-display text-xl font-bold text-pine">More from the Journal</h2>
        <ul className="mt-4 space-y-3">
          {journalTranscripts.articles.filter(article => article.slug !== slug).map(article => <li key={article.slug}><Link className="font-semibold text-emerald-800 underline" to={`/journal/${article.slug}`}>{article.title}</Link></li>)}
        </ul>
      </nav>
      <p className="mt-8 text-sm"><Link className="text-emerald-800 underline" to="/contact">Report a correction</Link>{' · '}<Link className="text-emerald-800 underline" to="/editorial-policy">Editorial policy</Link></p>
    </div>
  )
}
