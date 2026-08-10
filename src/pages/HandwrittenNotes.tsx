import { useMemo, useState } from 'react'
import { BookOpenCheck, FileClock, PenLine, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { handwrittenNoteCategories, notesAuthor } from '@/data/handwrittenNotes'

export default function HandwrittenNotes() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'All' | 'Compulsory' | 'Optional'>('All')
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return handwrittenNoteCategories.filter(
      (c) => (kind === 'All' || c.kind === kind) && (!q || `${c.title} ${c.description}`.toLocaleLowerCase().includes(q)),
    )
  }, [kind, query])

  return (
    <div>
      <PageHeader
        title="Handwritten Notes by Miss Sadia Zahoor, PAS"
        description="A dedicated subject-wise library for original handwritten CSS preparation notes. Categories are ready and files will appear only after the owner provides them."
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-2xl bg-pine text-white shadow-lg">
          <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-[auto_1fr] md:items-center">
            <img
              src="/images/mentor-sadia.jpg"
              alt="Miss Sadia Zahoor, PAS"
              className="h-24 w-24 rounded-2xl border-2 border-white/30 object-cover shadow-md"
            />
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
                <PenLine className="h-4 w-4" /> Notes author
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">{notesAuthor}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/80">
                Notes will remain organised by CSS paper and will be published only when an original, readable file is supplied.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Search handwritten-note subjects</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search note subjects..."
              className="h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {(['All', 'Compulsory', 'Optional'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${kind === k ? 'bg-pine text-white' : 'bg-secondary text-pine hover:bg-emerald-50'}`}
              >
                {k}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7" aria-labelledby="handwritten-note-subjects">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="handwritten-note-subjects" className="font-display text-xl font-bold text-pine sm:text-2xl">Subject categories</h2>
              <p className="mt-1 text-sm text-muted-foreground">{shown.length} categories shown</p>
            </div>
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 sm:block">Original uploads only</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <article key={c.slug} className="vista-card flex min-h-52 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pine text-white">
                    <BookOpenCheck className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">{c.kind}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-pine">{c.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                    <FileClock className="h-4 w-4" /> Upload pending
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <BookOpenCheck className="h-4 w-4" /> {c.uploadedNotes} notes
                  </span>
                </div>
              </article>
            ))}
            {shown.length === 0 && (
              <p className="mt-4 rounded-xl border border-dashed bg-white px-4 py-10 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                No note category matches this search.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
