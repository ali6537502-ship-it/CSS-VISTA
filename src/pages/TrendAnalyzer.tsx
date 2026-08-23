import { Link } from 'react-router'
import { BarChart3, FileText, LibraryBig } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { mergedPastPapers } from '@/lib/admin'
import { pastPapers as seedPapers } from '@/data/pastPapers'

export default function TrendAnalyzer() {
  const papers = mergedPastPapers(seedPapers)
  const available = papers.filter((paper) => paper.fileUrl)
  const years = [...new Set(available.map((paper) => paper.year))].sort((a, b) => b - a)
  const subjects = [...new Set(available.map((paper) => paper.subject))]
  const examinationCounts = [...new Set(available.map((paper) => paper.examination))]
    .map((examination) => ({ examination, count: available.filter((paper) => paper.examination === examination).length }))
    .sort((a, b) => b.count - a.count)
  const yearCounts = years.map((year) => ({ year, count: available.filter((paper) => paper.year === year).length }))
  const maxYearCount = Math.max(1, ...yearCounts.map((item) => item.count))
  const subjectCounts = subjects
    .map((subject) => ({ subject, count: available.filter((paper) => paper.subject === subject).length }))
    .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject))
    .slice(0, 10)

  return (
    <div>
      <PageHeader
        title="Past-Paper Trend Analyzer"
        description="Repeated topics, subject-wise frequency, year-wise trends and emerging areas - computed only from the actual past papers uploaded to this website. Nothing is estimated or invented."
      />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Archive summary">
          <div className="rounded-xl border bg-white p-4"><FileText className="h-5 w-5 text-emerald-700" /><strong className="mt-2 block text-2xl text-pine">{available.length}</strong><span className="text-xs text-muted-foreground">downloadable papers</span></div>
          <div className="rounded-xl border bg-white p-4"><LibraryBig className="h-5 w-5 text-emerald-700" /><strong className="mt-2 block text-2xl text-pine">{subjects.length}</strong><span className="text-xs text-muted-foreground">subjects represented</span></div>
          <div className="rounded-xl border bg-white p-4"><BarChart3 className="h-5 w-5 text-emerald-700" /><strong className="mt-2 block text-2xl text-pine">{years.at(-1)}–{years[0]}</strong><span className="text-xs text-muted-foreground">archive year range</span></div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="text-sm font-bold text-pine">Papers by examination</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {examinationCounts.map((item) => <div key={item.examination} className="rounded-lg bg-secondary p-3"><strong className="text-sm text-pine">{item.examination}</strong><span className="ml-2 text-xs text-muted-foreground">{item.count} papers</span></div>)}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="text-sm font-bold text-pine">Year-wise archive coverage</h2>
          <div className="mt-4 space-y-2.5">
            {yearCounts.map((item) => (
              <div key={item.year} className="grid grid-cols-[42px_1fr_36px] items-center gap-2 text-xs">
                <span className="font-semibold">{item.year}</span>
                <span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-emerald-700" style={{ width: `${(item.count / maxYearCount) * 100}%` }} /></span>
                <span className="text-right text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="text-sm font-bold text-pine">Best-covered subjects</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {subjectCounts.map((item, index) => <li key={item.subject} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span><span className="mr-2 text-xs font-bold text-emerald-700">{index + 1}</span>{item.subject}</span><span className="text-xs text-muted-foreground">{item.count}</span></li>)}
          </ol>
        </section>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Topic-level repetition is not shown until paper text extraction and human verification are complete. The coverage statistics above come directly from the real archive metadata—nothing is estimated.
        </div>
        <Link to="/past-papers" className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50">
          Browse all papers
        </Link>
      </div>
    </div>
  )
}
