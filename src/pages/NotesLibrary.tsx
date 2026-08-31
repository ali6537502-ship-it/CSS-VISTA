import { Eye, FileImage, FileText, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/shared'
import { bundle, getVisibleBundleIncludes, getVisibleNoteProducts, notesCoverageStatement, notesPurchaseActionLabel } from '@/data/notes'
import { mentors, waLink } from '@/data/site'
import { formatFileSize } from '@/lib/resourceFiles'

export default function NotesLibrary() {
  const ali = mentors.find((mentor) => mentor.id === 'ali')!
  const visibleProducts = getVisibleNoteProducts()
  const visibleBundleIncludes = getVisibleBundleIncludes()
  const contact = (subject: string) => waLink(ali.whatsapp, `Assalam-o-Alaikum, I would like to inquire about the ${subject} notes available on CSS VISTA. Please share the price and purchase details.`)

  return (
    <div>
      <PageHeader title="CSS Notes by Sir Ali Hassan Sargana" description="Browse complete examination notes and all available public pages across Current Affairs, Pakistan Affairs, Criminology and Political Science." />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section className="grid gap-5 rounded-2xl bg-pine p-5 text-white shadow-lg sm:grid-cols-[112px_1fr] sm:items-center sm:p-7">
          <img src="/images/mentor-ali.jpg" alt="Ali Hassan Sargana" className="h-28 w-28 rounded-2xl border-2 border-white/25 object-cover object-top shadow-lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">CSS Vista mentor and notes author</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Sir Ali Hassan Sargana</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/85">{notesCoverageStatement}</p>
          </div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {visibleProducts.map((product) => (
            <article key={product.id} className="flex flex-col rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">{product.samples.filter((item) => item.kind !== 'image-pages').length} complete notes · {product.samples.filter((item) => item.kind === 'image-pages').length} public previews</span>
              <h2 className="mt-3 font-display text-xl font-bold text-pine">{product.subject}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              <div className="mt-4 space-y-2" aria-label={`${product.subject} available notes`}>
                {[...product.samples].sort((left, right) => Number(right.kind !== 'image-pages') - Number(left.kind !== 'image-pages')).map((sample) => (
                  <Link key={sample.id} to={`/notes/view/${product.id}/${sample.id}`} className="flex w-full items-center gap-2 rounded-lg border bg-secondary/35 px-3 py-2.5 text-left text-sm font-semibold text-pine hover:border-emerald-600 hover:bg-emerald-50">
                    {sample.kind !== 'image-pages' ? <FileText className="h-4 w-4 shrink-0" /> : <FileImage className="h-4 w-4 shrink-0" />}
                    <span className="min-w-0 flex-1"><span className="block">{sample.title}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{sample.pages} pages · {formatFileSize(sample.sizeBytes)} · {sample.kind === 'pdf' ? 'complete PDF' : sample.kind === 'docx' ? 'complete Word document' : 'all supplied public pages'}</span></span>
                    <Eye className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span className="sr-only">View available note</span>
                  </Link>
                ))}
              </div>
              <a href={contact(product.subject)} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900"><MessageCircle className="h-4 w-4" /> {notesPurchaseActionLabel}</a>
            </article>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div><span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950">{bundle.badge}</span><h2 className="mt-2 font-display text-2xl font-bold text-pine">{bundle.title}</h2><p className="mt-1 text-sm text-muted-foreground">{visibleBundleIncludes}</p><p className="mt-1 text-xs text-muted-foreground">{bundle.note}</p></div>
            <a href={contact('complete notes bundle')} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> {notesPurchaseActionLabel}</a>
          </div>
        </section>
      </main>
    </div>
  )
}
