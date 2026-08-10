import { Link } from 'react-router'
import { BarChart3, FileText } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared'
import { mergedPastPapers } from '@/lib/admin'
import { pastPapers as seedPapers } from '@/data/pastPapers'

export default function TrendAnalyzer() {
  const papers = mergedPastPapers(seedPapers)

  return (
    <div>
      <PageHeader
        title="Past-Paper Trend Analyzer"
        description="Repeated topics, subject-wise frequency, year-wise trends and emerging areas - computed only from the actual past papers uploaded to this website. Nothing is estimated or invented."
      />
      <div className="mx-auto max-w-4xl px-4 py-10">
        {papers.length === 0 ? (
          <>
            <EmptyState
              title="Analyzer ready - waiting for past papers"
              hint="The past-paper archive for 2016–2026 is being uploaded by the owner. As soon as papers are added and processed, this page will show repeated topics, year-wise trends, subject-wise frequency, objective/subjective patterns and the most important preparation areas."
            />
            <div className="mt-6 rounded-xl border bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-pine">
                <BarChart3 className="h-4 w-4" /> What the analyzer will show
              </h2>
              <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-foreground/85 sm:grid-cols-2">
                <li>· Frequently repeated topics</li>
                <li>· Subject-wise topic frequency</li>
                <li>· Year-wise trends (2016–2026)</li>
                <li>· Recently emerging topics</li>
                <li>· Topics not asked for several years</li>
                <li>· Compulsory vs optional trends</li>
                <li>· Objective and subjective patterns</li>
                <li>· Most repeated themes and priority areas</li>
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Honest rule: trends are computed only from uploaded papers. When the dataset is incomplete, the analyzer
                will clearly say so instead of guessing.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-pine">
              <FileText className="h-4 w-4" /> Dataset status
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {papers.length} paper{papers.length > 1 ? 's are' : ' is'} currently in the archive. The dataset is still
              incomplete - a reliable trend analysis needs the full 2016–2026 collection, which is being uploaded in
              stages. Partial trends would be misleading, so they are intentionally not shown yet.
            </p>
            <Link to="/past-papers" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50">
              Browse uploaded papers
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
