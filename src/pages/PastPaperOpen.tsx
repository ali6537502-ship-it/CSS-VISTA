import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Download, ExternalLink } from 'lucide-react'
import { Badge, EmptyState, PageHeader } from '@/components/shared'
import { pastPapers as seedPapers } from '@/data/pastPapers'
import { mergedPastPapers } from '@/lib/admin'
import { recordActivity } from '@/lib/progress'
import { safeDownloadName } from '@/lib/resourceFiles'

type Paper = (typeof seedPapers)[number]
const PAST_PAPER_ASSET_VERSION = '20260824'

function versionedPaperUrl(fileUrl: string) {
  const separator = fileUrl.includes('?') ? '&' : '?'
  return `${fileUrl}${separator}v=${PAST_PAPER_ASSET_VERSION}`
}

function paperPageTitle(paper: Paper) {
  if (paper.examination === 'MPT') return `CSS MPT ${paper.year} Screening Test Past Paper`
  const part = paper.paper === 'Single Paper' ? '' : ` ${paper.paper.replace('One', 'I').replace('Two', 'II')}`
  return `${paper.examination} ${paper.year} ${paper.subject}${part} Past Paper`
}

function paperPageDescription(paper: Paper) {
  return `Open and download the ${paperPageTitle(paper)} on CSS Vista.`
}

export default function PastPaperOpen() {
  const { id } = useParams()
  const paper = useMemo(
    () => mergedPastPapers(seedPapers).find((item) => item.id === id),
    [id],
  )
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null)
  const pdfUrl = paper?.fileUrl ? versionedPaperUrl(paper.fileUrl) : ''

  useEffect(() => {
    if (!paper) return
    recordActivity({ type: 'past-paper', label: paper.title, path: `/past-papers/view/${paper.id}` })
    const title = `${paperPageTitle(paper)} | CSS Vista`
    const descriptionText = paperPageDescription(paper)
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const previousDescription = description?.content
    const previousCanonical = canonical?.href
    document.title = title
    if (description) description.content = descriptionText
    if (canonical) canonical.href = `${window.location.origin}/past-papers/view/${paper.id}`
    return () => {
      document.title = 'CSS Vista - CSS Exam Preparation Platform'
      if (description && previousDescription) description.content = previousDescription
      if (canonical && previousCanonical) canonical.href = previousCanonical
    }
  }, [paper])

  useEffect(() => {
    let active = true
    setPdfAvailable(null)
    if (!paper) return () => { active = false }

    if (pdfUrl) {
      fetch(pdfUrl, { method: 'HEAD' })
        .then((response) => {
          const contentType = response.headers.get('content-type') ?? ''
          if (active) setPdfAvailable(response.ok && contentType.toLowerCase().includes('pdf'))
        })
        .catch(() => active && setPdfAvailable(false))
    } else {
      setPdfAvailable(false)
    }

    return () => { active = false }
  }, [paper, pdfUrl])

  if (!paper) {
    return (
      <div>
        <PageHeader title="Past Paper Viewer" description="Open a supplied past-paper record from the organised archive." />
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
      <PageHeader title={paperPageTitle(paper)}>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="gray">{paper.examination}</Badge>
          <Badge tone="gray">{paper.year}</Badge>
          <Badge tone="gray">{paper.subject}</Badge>
          <Badge tone="gray">{paper.paper}</Badge>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8">
        {pdfAvailable && pdfUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-bold text-pine hover:bg-secondary">
              <ExternalLink className="h-4 w-4" /> Open full window
            </a>
            <a href={pdfUrl} download={safeDownloadName(`${paper.examination}-${paper.year}-${paper.subject}-${paper.paper}`)} data-google-vignette="false" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-bold text-white hover:bg-emerald-900">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </div>
        )}

        {pdfAvailable && pdfUrl ? (
          <section aria-label={`${paper.title} PDF viewer`} className="overflow-hidden rounded-xl border bg-white">
            <iframe src={pdfUrl} title={paper.title} className="h-[72vh] min-h-[520px] w-full" />
          </section>
        ) : (
          <section className="rounded-2xl border bg-white p-4 sm:p-6">
            <EmptyState title="PDF unavailable" hint="This paper will open here after its PDF is restored." />
            <div className="mt-4 text-center">
              <Link to="/past-papers" className="text-sm font-bold text-emerald-800 underline underline-offset-2">Return to Past Papers</Link>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
