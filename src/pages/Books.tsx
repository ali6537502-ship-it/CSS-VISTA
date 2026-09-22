import { BookOpen, Download, Eye } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { books } from '@/data/books'
import { mentors, waLink } from '@/data/site'

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
