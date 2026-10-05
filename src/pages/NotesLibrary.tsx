import { ChevronDown, Eye, FileImage, FileText, ListChecks, MessageCircle, PlayCircle } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/shared'
import { bundle, getVisibleBundleIncludes, getVisibleNoteProducts, notesCoverageStatement, notesPurchaseActionLabel, type NoteProduct } from '@/data/notes'
import { mentors, waLink } from '@/data/site'
import { formatFileSize } from '@/lib/resourceFiles'

export default function NotesLibrary() {
  const ali = mentors.find((mentor) => mentor.id === 'ali')!
  const visibleProducts = getVisibleNoteProducts()
  const visibleBundleIncludes = getVisibleBundleIncludes()
  const contact = (product: NoteProduct | string) => {
    const title = typeof product === 'string' ? product : `${product.subject} notes`
    return waLink(
      ali.whatsapp,
      `Assalam-o-Alaikum, I would like to purchase the ${title} available on CSS VISTA. Please share the current purchase details.`,
    )
  }

  return (
    <div>
      <PageHeader title="CSS Notes by Sir Ali Hassan Sargana" description="Explore complete topic coverage and available samples for Current Affairs, Pakistan Affairs, Criminology, Political Science and European History. Contact directly on WhatsApp to purchase." />
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
              <h2 className="font-display text-xl font-bold text-pine">{product.subject}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              {product.previewVideoId && (
                <section className="mt-4 overflow-hidden rounded-xl border bg-slate-950 shadow-sm" aria-label={`${product.subject} video preview`}>
                  <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 text-white">
                    <PlayCircle className="h-4 w-4 shrink-0 text-amber-300" />
                    <span className="text-sm font-bold">Video preview of the notes</span>
                  </div>
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${product.previewVideoId}?rel=0`}
                      title={`${product.subject} notes preview`}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </section>
              )}
              {product.topics.length > 0 && (
                <details className="group mt-4 overflow-hidden rounded-xl border bg-emerald-50/50">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-sm font-bold text-pine marker:hidden">
                    <ListChecks className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span className="min-w-0 flex-1">Topics covered in the notes</span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] text-emerald-800">{product.topics.length} topics</span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="max-h-96 overflow-y-auto border-t bg-white p-4">
                    <ol className="grid list-decimal gap-x-7 gap-y-2 pl-5 text-xs leading-relaxed text-slate-700 sm:grid-cols-2">
                      {product.topics.map((topic) => <li key={topic} className="pl-1">{topic}</li>)}
                    </ol>
                  </div>
                </details>
              )}
              <details className="group mt-3 overflow-hidden rounded-xl border bg-emerald-50/50">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-sm font-bold text-pine marker:hidden">
                  <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="min-w-0 flex-1">Sample notes</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-2 border-t bg-white p-3" aria-label={`${product.subject} sample notes`}>
                  {[...product.samples].sort((left, right) => Number(right.kind !== 'image-pages') - Number(left.kind !== 'image-pages')).map((sample) => (
                    <Link key={sample.id} to={`/notes/view/${product.id}/${sample.id}`} className="flex w-full items-center gap-2 rounded-lg border bg-secondary/35 px-3 py-2.5 text-left text-sm font-semibold text-pine hover:border-emerald-600 hover:bg-emerald-50">
                      {sample.kind !== 'image-pages' ? <FileText className="h-4 w-4 shrink-0" /> : <FileImage className="h-4 w-4 shrink-0" />}
                      <span className="min-w-0 flex-1"><span className="block">{sample.title}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{sample.pages} pages · {formatFileSize(sample.sizeBytes)} · {sample.kind === 'pdf' ? 'complete PDF' : sample.kind === 'docx' ? 'complete Word document' : 'all supplied public pages'}</span></span>
                      <Eye className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      <span className="sr-only">View available note</span>
                    </Link>
                  ))}
                </div>
              </details>
              <a href={contact(product)} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900"><MessageCircle className="h-4 w-4" /> {notesPurchaseActionLabel} on WhatsApp</a>
            </article>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div><span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950">{bundle.badge}</span><h2 className="mt-2 font-display text-2xl font-bold text-pine">{bundle.title}</h2><p className="mt-1 text-sm text-muted-foreground">{visibleBundleIncludes}</p></div>
            <a href={contact('complete notes bundle')} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> {notesPurchaseActionLabel} on WhatsApp</a>
          </div>
        </section>
      </main>
    </div>
  )
}
