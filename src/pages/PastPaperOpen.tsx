import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { Download, ExternalLink, FileText } from 'lucide-react'
import { AdSlot } from '@/components/Ads'
import { Badge, EmptyState, PageHeader } from '@/components/shared'
import { pastPapers as seedPapers } from '@/data/pastPapers'
import { mergedPastPapers } from '@/lib/admin'
import { recordActivity } from '@/lib/progress'

export default function PastPaperOpen() {
  const { id } = useParams()
  const paper = useMemo(
    () => mergedPastPapers(seedPapers).find((item) => item.id === id),
    [id],
  )

  useEffect(() => {
    if (!paper) return
    recordActivity({ type: 'past-paper', label: paper.title, path: `/past-papers/view/${paper.id}` })
  }, [paper])

  if (!paper?.fileUrl) {
    return (
      <div>
        <PageHeader title="Past Paper Viewer" description="Open an original past-paper PDF from the organised archive." />
        <div className="mx-auto max-w-4xl px-4 py-12">
          <EmptyState title="This past paper is unavailable" hint="Return to the archive and choose another paper." />
          <div className="mt-4 text-center">
            <Link to="/past-papers" className="text-sm font-bold text-emerald-800 underline underline-offset-2">
              Return to Past Papers
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={paper.title}
        description="Read the original paper in the built-in viewer or open the unchanged PDF in a separate tab."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="gray">{paper.examination}</Badge>
          <Badge tone="gray">{paper.year}</Badge>
          <Badge tone="gray">{paper.subject}</Badge>
          <Badge tone="gray">{paper.paper}</Badge>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4">
          <FileText className="h-5 w-5 text-emerald-800" />
          <div className="mr-auto">
            <p className="text-sm font-bold text-pine">Original PDF</p>
            <p className="text-xs text-muted-foreground">The document has not been edited, compressed or converted.</p>
          </div>
          <a
            href={paper.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-google-vignette="false"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" /> Open full window
          </a>
          <a
            href={paper.fileUrl}
            download
            data-google-vignette="false"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900"
          >
            <Download className="h-4 w-4" /> Download
          </a>
        </div>

        <AdSlot
          slot={import.meta.env.VITE_ADSENSE_SLOT_PAST_PAPER_TOP}
          format="horizontal"
          className="min-h-24"
          label="Past paper advertisement 1 of 2"
        />

        <section aria-label={`${paper.title} PDF viewer`} className="overflow-hidden rounded-xl border bg-white">
          <iframe
            src={paper.fileUrl}
            title={paper.title}
            className="h-[72vh] min-h-[520px] w-full"
          />
        </section>

        <AdSlot
          slot={import.meta.env.VITE_ADSENSE_SLOT_PAST_PAPER_BOTTOM}
          format="horizontal"
          className="min-h-24"
          label="Past paper advertisement 2 of 2"
        />

        <p className="text-center text-xs text-muted-foreground">
          Advertisements are separated from the PDF controls to prevent accidental clicks.
        </p>
      </div>
    </div>
  )
}
