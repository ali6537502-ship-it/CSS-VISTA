import { useEffect, useRef, useState } from 'react'
import { Bell, BellRing, BookOpen, Download, Eye, FileText, X } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { books, opinions, type Opinion } from '@/data/books'
import { mentors, waLink } from '@/data/site'
import { getNotifPrefs, setNotifPrefs } from '@/lib/progress'
import { usePageBack } from '@/lib/backNavigation'

export function BooksPage() {
  const ali = mentors[1]
  return (
    <div>
      <PageHeader
        title="Books by Sir Ali"
        description="Complete books written by Ali Hassan Sargana - free to read and download for every aspirant."
      />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2">
          {books.map((b) => (
            <div key={b.id} className="group overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-lg">
              <div className="relative overflow-hidden bg-pine/5">
                <img src={b.cover} alt={b.title} className="mx-auto h-64 w-auto object-contain py-4 transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{b.subtitle}</p>
                <h2 className="mt-1 font-display text-xl font-bold text-pine">{b.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{b.pages} pages · PDF</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={b.file} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-md border border-pine/30 px-4 text-sm font-semibold text-pine hover:bg-secondary">
                    <Eye className="h-4 w-4" /> Read
                  </a>
                  <a href={b.file} download className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border bg-secondary/50 p-5 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-pine" />
          <p className="mt-2 text-sm font-semibold text-pine">More books are being prepared.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            For notes and academic resources, contact Sir Ali Hassan Sargana on WhatsApp ({ali.whatsappDisplay}).
          </p>
          <a href={waLink(ali.whatsapp, ali.message)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
            Contact on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

export function OpinionsPage() {
  const [active, setActive] = useState<Opinion | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  usePageBack(Boolean(active), () => setActive(null))

  const [pageIdx, setPageIdx] = useState(0)
  const [prefs, setPrefs] = useState(getNotifPrefs())

  // Matches the BookSummaries reader: ESC closes, focus moves in, body scroll
  // locks, and the arrow keys page. Previously none of this was here.
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

  const opinionsOn = prefs.enabled && (prefs.tags['Opinions'] ?? true)

  function toggleOpinionsNotif() {
    const next = !opinionsOn
    setNotifPrefs({ enabled: true, asked: true, tags: { Opinions: next } })
    setPrefs(getNotifPrefs())
  }

  return (
    <div>
      <PageHeader
        title="Opinions by Authors"
        description="Published opinion pieces and analytical commentary by Ali Hassan Sargana - presented as readable page images, exactly as printed."
      >
        <button
          onClick={toggleOpinionsNotif}
          className={`no-print mt-4 inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-semibold ${opinionsOn ? 'bg-emerald-600 text-white' : 'border bg-white text-pine'}`}
        >
          {opinionsOn ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {opinionsOn ? 'Notifications on - new opinions' : 'Notify me about new opinions'}
        </button>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {opinions.map((o, i) => (
            <button
              key={o.slug}
              onClick={() => { setActive(o); setPageIdx(0) }}
              className={`group relative overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${i % 3 === 1 ? 'sm:translate-y-4' : ''}`}
            >
              <div className="relative h-72 overflow-hidden bg-gray-50">
                <img
                  src={o.pages[0]}
                  alt={o.title}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">{o.outlet} · {o.date}</p>
                  <p className="mt-1 font-display text-lg font-bold leading-snug">{o.title}</p>
                </div>
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-pine shadow">
                  {o.pages.length} {o.pages.length === 1 ? 'page' : 'pages'}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-pine">
                  <FileText className="h-3.5 w-3.5" /> Read as printed
                </span>
                <span className="text-xs font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">Open →</span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-10 rounded-lg border bg-secondary/50 px-4 py-3 text-center text-xs text-muted-foreground">
          These are image facsimiles of the published articles. For reference lists or republication queries, contact the author on WhatsApp (0309-2996294).
        </p>
      </div>

      {/* Reader overlay */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title} reader`}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-display text-lg font-bold">{active.title}</p>
              <p className="text-xs text-emerald-300">{active.outlet} · {active.date} · Page {pageIdx + 1} of {active.pages.length}</p>
            </div>
            <button ref={closeRef} onClick={() => setActive(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            <img src={active.pages[pageIdx]} alt={`${active.title} - page ${pageIdx + 1}`} className="mx-auto max-h-full rounded-lg bg-white object-contain" />
          </div>
          {active.pages.length > 1 && (
            <div className="flex items-center justify-center gap-3 pb-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                disabled={pageIdx === 0}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
              >
                ← Previous page
              </button>
              <button
                onClick={() => setPageIdx((p) => Math.min(active.pages.length - 1, p + 1))}
                disabled={pageIdx === active.pages.length - 1}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-30"
              >
                Next page →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
