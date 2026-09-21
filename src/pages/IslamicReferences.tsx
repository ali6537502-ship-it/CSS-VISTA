import { Link } from 'react-router'
import { ArrowRight, BookMarked } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { chapterName, islamicChapters, islamicReferenceTotal, islamicTopicTotal } from '@/data/islamicReferences'

export default function IslamicReferences() {
  const chapters = islamicChapters()
  return (
    <div>
      <PageHeader
        title="Islamic Studies Reference Bank"
        description={`${islamicReferenceTotal()} source-checked references across the seven CSS Islamic Studies chapters, organised into ${islamicTopicTotal()} topics. Every entry carries its Arabic source passage with parallel English and Urdu — English on the left, Urdu on the right.`}
      />
      <div className="mx-auto max-w-7xl px-4 py-6">
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link to="/study-material" className="font-medium text-emerald-800 hover:underline underline-offset-2">CSS Study Material</Link>
          <span aria-hidden="true">/</span>
          <span>Islamic Studies reference bank</span>
        </nav>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {chapters.map((chapter) => (
            <Link
              key={chapter.slug}
              to={`/study-material/islamic-studies/${chapter.slug}`}
              className="group flex gap-3 rounded-xl border bg-white p-4 transition-colors hover:border-emerald-700/50 hover:bg-emerald-50/30"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-[13px] font-bold text-pine">
                {chapter.numeral}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug text-pine group-hover:underline underline-offset-2">
                  {chapterName(chapter)}
                </span>
                <span dir="rtl" lang="ur" className="urdu-text mt-1 block text-right text-[14px] leading-loose text-foreground/75">
                  {chapter.titleUr}
                </span>
                <span className="mt-2 block text-[12px] font-medium tabular-nums text-muted-foreground">
                  {chapter.referenceCount} references · {chapter.topics.length} topics
                </span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
          <BookMarked className="h-5 w-5 shrink-0 text-emerald-800" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground">
            Each entry states its source, translation and verification status. A passage quoted inside a
            commentary is not automatically a sound Hadith, and a scholarly summary is labelled as such.
            Open the verification links before relying on an entry in an examination answer.
          </p>
        </div>
      </div>
    </div>
  )
}
