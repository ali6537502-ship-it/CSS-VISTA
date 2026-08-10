import { BadgeCheck, Download, Eye, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { noteProducts, bundle } from '@/data/notes'
import { mentors, waLink } from '@/data/site'
import { getPriceOverride } from '@/lib/admin'

export default function NotesLibrary() {
  const ali = mentors[1]

  function buyMsg(subject: string) {
    return waLink(ali.whatsapp, `Assalam-o-Alaikum Sir, I want to purchase the ${subject} notes package. Please share samples and payment details.`)
  }

  return (
    <div>
      <PageHeader
        title="Notes Library"
        description="Focused, exam-oriented notes by Sir Ali Hassan Sargana. Samples can be previewed; complete notes are shared only with enrolled students and are never publicly downloadable."
      />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          Contact Sir Ali Hassan Sargana for samples and purchasing details - WhatsApp {ali.whatsappDisplay}.
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {noteProducts.map((p) => {
            const price = getPriceOverride(p.id) ?? p.price
            return (
              <div key={p.id} className="flex flex-col rounded-xl border bg-white p-5 transition-shadow hover:shadow-md">
                <span className="w-fit rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Sample Notes Available</span>
                <h2 className="mt-2 font-display text-lg font-bold leading-snug text-pine">{p.subject}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                <p className="mt-3 font-display text-xl font-bold text-pine">
                  {price ?? <span className="text-sm font-medium text-muted-foreground">Price to be announced</span>}
                </p>

                {p.samples && p.samples.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {p.samples.map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border bg-secondary/40 px-3 py-2 text-xs font-semibold text-pine hover:bg-secondary">
                        <Eye className="h-3.5 w-3.5 shrink-0" /> {s.title}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {!p.samples && (
                    <a
                      href={waLink(ali.whatsapp, `Assalam-o-Alaikum Sir, please send me the sample notes for ${p.subject}.`)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex h-10 items-center justify-center gap-1.5 rounded-md border text-sm font-semibold text-pine hover:bg-secondary"
                    >
                      <Eye className="h-4 w-4" /> Request Sample Preview
                    </a>
                  )}
                  <a
                    href={buyMsg(p.subject)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-pine text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp Purchase - {ali.whatsappDisplay}
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bundle */}
        <div className="mt-6 overflow-hidden rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">{getPriceOverride('bundle-badge') ?? bundle.badge}</span>
              <h2 className="mt-2 font-display text-2xl font-bold text-pine">{bundle.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{bundle.includes}</p>
              <p className="mt-2 font-display text-2xl font-bold text-emerald-800">{getPriceOverride('bundle') ?? bundle.price}</p>
            </div>
            <a
              href={buyMsg('Complete Notes Bundle (all four subjects)')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp Purchase
            </a>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Download className="h-3.5 w-3.5" /> Sample PDFs open in your browser. Complete paid notes are delivered privately after purchase.
        </p>
      </div>
    </div>
  )
}
