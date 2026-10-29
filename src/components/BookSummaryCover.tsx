import type { BookSummary } from '@/data/bookSummaries'

/** Original typographic study card; it reproduces no publisher artwork. */
export default function BookSummaryCover({ book, className = '' }: {
  book: Pick<BookSummary, 'title' | 'author'>
  className?: string
}) {
  return (
    <div aria-hidden="true" className={`flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-md border border-emerald-950/20 bg-pine p-3 text-white shadow-sm ${className}`}>
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300">CSS Vista · Reading guide</span>
      <span className="my-3 line-clamp-6 font-display text-base font-bold leading-snug">{book.title}</span>
      <span className="border-t border-white/20 pt-2 text-[10px] leading-relaxed text-emerald-50">Book by {book.author}</span>
    </div>
  )
}
