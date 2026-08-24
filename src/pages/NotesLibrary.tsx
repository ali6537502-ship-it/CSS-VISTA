import { useEffect, useState } from 'react'
import { Eye, FileText, LockKeyhole, MessageCircle, ShieldCheck, X } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { bundle, noteProducts, notesCoverageStatement, type NoteSample } from '@/data/notes'
import { mentors, waLink } from '@/data/site'
import { getPriceOverride } from '@/lib/admin'
import { usePageBack } from '@/lib/backNavigation'

function ProtectedPreview({ sample, onClose }: { sample: NoteSample; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', close)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', close)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 text-white print:hidden" role="dialog" aria-modal="true" aria-label={`${sample.title} sample preview`}>
      <header className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-3">
        <div className="min-w-0"><p className="truncate font-semibold">{sample.title}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65"><ShieldCheck className="h-3.5 w-3.5" /> Limited sample preview · complete notes are delivered privately</p></div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/25 hover:bg-white/10" aria-label="Close preview"><X className="h-5 w-5" /></button>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6" onContextMenu={(event) => event.preventDefault()}>
        <div className="mx-auto max-w-4xl space-y-5 select-none">
          {Array.from({ length: sample.pages ?? 0 }, (_, index) => (
            <div key={index} className="relative overflow-hidden rounded-md bg-white shadow-2xl">
              <img src={`/note-previews/${sample.previewFolder}/page-${index + 1}.webp`} alt={`${sample.title}, sample page ${index + 1}`} draggable={false} loading={index ? 'lazy' : 'eager'} className="w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-3 text-right text-[10px] font-bold uppercase tracking-widest text-white/90">CSS Vista sample · Ali Hassan Sargana</div>
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
  usePageBack(Boolean(preview), () => setPreview(null))
  const contact = (subject: string) => waLink(ali.whatsapp, `Assalam-o-Alaikum Sir, I want to purchase the ${subject} notes package. Please share payment and delivery details.`)

  return (
    <div>
      <PageHeader title="Notes by Ali Hassan Sargana" description="Structured subject notes with genuine supplied previews. Complete paid material is privately delivered after purchase." />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section className="grid gap-5 rounded-2xl bg-pine p-5 text-white shadow-lg sm:grid-cols-[112px_1fr] sm:items-center sm:p-7">
          <img src="/images/mentor-ali.jpg" alt="Ali Hassan Sargana" className="h-28 w-28 rounded-2xl border-2 border-white/25 object-cover object-top shadow-lg" />
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">CSS Vista mentor and notes author</p><h2 className="mt-2 font-display text-2xl font-bold">Ali Hassan Sargana</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/85">{notesCoverageStatement}</p></div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {noteProducts.map((product) => {
            const price = getPriceOverride(product.id) ?? product.price
            return (
              <article key={product.id} className="flex flex-col rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Sample notes available</span>
                <h2 className="mt-3 font-display text-xl font-bold text-pine">{product.subject}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                <p className="mt-3 font-display text-xl font-bold text-pine">{price ?? 'Contact for price'}</p>
                <div className="mt-4 space-y-2">
                  {product.samples.map((sample) => sample.previewFolder ? (
                    <button key={sample.previewFolder} type="button" onClick={() => setPreview(sample)} className="flex w-full items-center gap-2 rounded-lg border bg-secondary/35 px-3 py-2.5 text-left text-sm font-semibold text-pine hover:border-emerald-600 hover:bg-emerald-50"><Eye className="h-4 w-4 shrink-0" /><span className="flex-1">{sample.title}</span><LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  ) : (
                    <a key={sample.url} href={sample.url} target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-2 rounded-lg border bg-secondary/35 px-3 py-2.5 text-left text-sm font-semibold text-pine hover:border-emerald-600 hover:bg-emerald-50"><FileText className="h-4 w-4 shrink-0" /><span className="flex-1">{sample.title}</span><Eye className="h-3.5 w-3.5 text-muted-foreground" /></a>
                  ))}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">{notesCoverageStatement}</p>
                <a href={contact(product.subject)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900"><MessageCircle className="h-4 w-4" /> Purchase or inquire</a>
              </article>
            )
          })}
        </div>

        <section className="mt-6 overflow-hidden rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center"><div><span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">{getPriceOverride('bundle-badge') ?? bundle.badge}</span><h2 className="mt-2 font-display text-2xl font-bold text-pine">{bundle.title}</h2><p className="mt-1 text-sm text-muted-foreground">{bundle.includes}</p><p className="mt-2 font-display text-2xl font-bold text-emerald-800">{getPriceOverride('bundle') ?? bundle.price}</p></div><a href={contact('complete notes bundle')} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> WhatsApp purchase</a></div>
        </section>

        <p className="mt-6 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Preview pages are limited samples. Complete notes are not publicly downloadable and are delivered privately after purchase.</p>
      </main>
      {preview && <ProtectedPreview sample={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
