import { useEffect, useState } from 'react'
import { Eye, LockKeyhole, MessageCircle, ShieldCheck, X } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { noteProducts, notesCoverageStatement, type NoteSample } from '@/data/notes'
import { mentors, waLink } from '@/data/site'

function ProtectedPreview({ sample, onClose }: { sample: NoteSample; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close)
    document.body.classList.add('notes-preview-open')
    return () => {
      document.removeEventListener('keydown', close)
      document.body.classList.remove('notes-preview-open')
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 text-white print:hidden" role="dialog" aria-modal="true" aria-label={`${sample.title} sample preview`}>
      <header className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{sample.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65"><ShieldCheck className="h-3.5 w-3.5" /> Genuine sample preview · download and print controls disabled</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/25 hover:bg-white/10" aria-label="Close preview"><X className="h-5 w-5" /></button>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6" onContextMenu={(event) => event.preventDefault()}>
        <div className="mx-auto max-w-4xl space-y-5 select-none">
          {Array.from({ length: sample.pages }, (_, index) => (
            <div key={index} className="relative overflow-hidden rounded-md bg-white shadow-2xl">
              <img src={`/note-previews/${sample.previewFolder}/page-${index + 1}.webp`} alt={`${sample.title}, genuine preview page ${index + 1}`} draggable={false} loading={index ? 'lazy' : 'eager'} className="w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent p-3 text-right text-[10px] font-bold uppercase tracking-widest text-white/90">CSS Vista sample · Ali Hassan Sargana</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NotesLibrary() {
  const ali = mentors[1]
  const [preview, setPreview] = useState<NoteSample | null>(null)
  const contact = (subject: string) => waLink(ali.whatsapp, `Assalam-o-Alaikum Sir, I want price and purchase information for the ${subject} notes available through CSS Vista.`)

  return (
    <div>
      <PageHeader title="Notes by Ali Hassan Sargana" description="Authentic supplied samples, identified from their document headings and presented in a protected preview." />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="grid gap-5 rounded-2xl bg-pine p-5 text-white shadow-lg sm:grid-cols-[112px_1fr] sm:items-center sm:p-7">
          <img src="/images/mentor-ali.jpg" alt="Ali Hassan Sargana" className="h-28 w-28 rounded-2xl border-2 border-white/25 object-cover object-top shadow-lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">CSS Vista mentor and notes author</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Ali Hassan Sargana</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/85">{notesCoverageStatement}</p>
          </div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {noteProducts.map((product) => (
            <article key={product.id} className="flex flex-col rounded-xl border bg-white p-5 shadow-sm">
              <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Contact for Price</span>
              <h2 className="mt-3 font-display text-xl font-bold text-pine">{product.subject}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              <div className="mt-4 space-y-2">
                {product.samples.map((sample) => (
                  <button key={sample.previewFolder} type="button" onClick={() => setPreview(sample)} className="flex w-full items-center gap-2 rounded-lg border bg-secondary/35 px-3 py-2.5 text-left text-sm font-semibold text-pine hover:border-emerald-600 hover:bg-emerald-50">
                    <Eye className="h-4 w-4 shrink-0" /> <span className="flex-1">{sample.title}</span><LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">{notesCoverageStatement}</p>
              <a href={contact(product.subject)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900">
                <MessageCircle className="h-4 w-4" /> Inquire on WhatsApp
              </a>
            </article>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Samples are shown as genuine limited page previews. Browser-visible material can still be captured; the viewer prevents casual direct PDF downloading and printing without making technically false protection claims.</p>
      </main>
      {preview && <ProtectedPreview sample={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
