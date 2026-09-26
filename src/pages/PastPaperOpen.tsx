import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Download, ExternalLink } from 'lucide-react'
import { Badge, EmptyState, PageHeader } from '@/components/shared'
import { pastPapers as seedPapers } from '@/data/pastPapers'
import { mergedPastPapers } from '@/lib/admin'
import { recordActivity } from '@/lib/progress'
import { safeDownloadName } from '@/lib/resourceFiles'
import { respectServerNoindex } from '@/lib/serverRobots'

type Paper = (typeof seedPapers)[number]
const PAST_PAPER_ASSET_VERSION = '20260824'
const SITE_ORIGIN = 'https://www.css-vista.com'

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
  return `Open and download the ${paperPageTitle(paper)} on CSS Vista, with paper details and related ${paper.subject} past papers.`
}

function relatedPastPapers(paper: Paper, allPapers: Paper[]) {
  const sameSubject = allPapers
    .filter((candidate) => candidate.id !== paper.id && candidate.examination === paper.examination && candidate.subject === paper.subject)
    .sort((left, right) => right.year - left.year)
  if (sameSubject.length) return sameSubject.slice(0, 10)
  return allPapers
    .filter((candidate) => candidate.id !== paper.id && candidate.examination === paper.examination && candidate.year === paper.year)
    .slice(0, 10)
}

export default function PastPaperOpen() {
  const { id } = useParams()
  const paper = useMemo(
    () => mergedPastPapers(seedPapers).find((item) => item.id === id),
    [id],
  )
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null)
  const pdfUrl = paper?.fileUrl ? versionedPaperUrl(paper.fileUrl) : ''
  const allPapers = useMemo(() => mergedPastPapers(seedPapers), [])
  const related = useMemo(() => (paper ? relatedPastPapers(paper, allPapers) : []), [paper, allPapers])

  useEffect(() => {
    if (!paper) {
      const previousTitle = document.title
      const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      const previousRobots = robots?.content ?? null
      const previousCanonical = canonical?.href ?? null
      document.title = 'Past Paper Unavailable | CSS Vista'
      if (robots) robots.content = 'noindex, follow'
      if (canonical) canonical.href = `${SITE_ORIGIN}/404`
      document.getElementById('cssv-route-structured-data')?.remove()
      return () => {
        document.title = previousTitle
        if (robots && previousRobots !== null) robots.content = previousRobots
        if (canonical && previousCanonical) canonical.href = previousCanonical
      }
    }
    recordActivity({ type: 'past-paper', label: paper.title, path: `/past-papers/view/${paper.id}` })
    const title = `${paperPageTitle(paper)} | CSS Vista`
    const descriptionText = paperPageDescription(paper)
    const canonicalUrl = `${SITE_ORIGIN}/past-papers/view/${paper.id}`
    const previousTitle = document.title
    const metaUpdates = [
      ['meta[name="description"]', 'content', descriptionText],
      ['meta[name="robots"]', 'content', respectServerNoindex(`/past-papers/view/${paper.id}`, 'index, follow, max-image-preview:large')],
      ['meta[property="og:type"]', 'content', 'website'],
      ['meta[property="og:title"]', 'content', title],
      ['meta[property="og:description"]', 'content', descriptionText],
      ['meta[property="og:url"]', 'content', canonicalUrl],
      ['meta[name="twitter:title"]', 'content', title],
      ['meta[name="twitter:description"]', 'content', descriptionText],
    ] as const
    const previousMeta = metaUpdates.map(([selector, attribute, value]) => {
      const element = document.querySelector<HTMLMetaElement>(selector)
      const previous = element?.getAttribute(attribute) ?? null
      element?.setAttribute(attribute, value)
      return { element, attribute, previous }
    })
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const previousCanonical = canonical?.href
    const structuredData = document.getElementById('cssv-route-structured-data') as HTMLScriptElement | null
    const schema = structuredData || document.createElement('script')
    const createdSchema = !structuredData
    const previousSchema = structuredData?.textContent ?? null

    document.title = title
    if (canonical) canonical.href = canonicalUrl
    schema.id = 'cssv-route-structured-data'
    schema.type = 'application/ld+json'
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'DigitalDocument',
          name: paperPageTitle(paper),
          description: descriptionText,
          url: canonicalUrl,
          contentUrl: paper.fileUrl ? `${SITE_ORIGIN}${paper.fileUrl}` : undefined,
          encodingFormat: 'application/pdf',
          inLanguage: 'en',
          about: { '@type': 'Thing', name: paper.subject },
          educationalLevel: 'Competitive examination',
          learningResourceType: 'Past examination paper',
          isPartOf: {
            '@type': 'CollectionPage',
            name: `${paper.examination} ${paper.year} Past Papers`,
            url: `${SITE_ORIGIN}/past-papers/${paper.examination.toLowerCase()}/${paper.year}`,
          },
          provider: { '@id': `${SITE_ORIGIN}/#organization` },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'CSS Vista', item: `${SITE_ORIGIN}/` },
            { '@type': 'ListItem', position: 2, name: 'Past Papers', item: `${SITE_ORIGIN}/past-papers` },
            { '@type': 'ListItem', position: 3, name: `${paper.examination} ${paper.year}`, item: `${SITE_ORIGIN}/past-papers/${paper.examination.toLowerCase()}/${paper.year}` },
            { '@type': 'ListItem', position: 4, name: paperPageTitle(paper), item: canonicalUrl },
          ],
        },
      ],
    })
    if (createdSchema) document.head.append(schema)

    return () => {
      document.title = previousTitle
      previousMeta.forEach(({ element, attribute, previous }) => {
        if (!element) return
        if (previous === null) element.removeAttribute(attribute)
        else element.setAttribute(attribute, previous)
      })
      if (canonical && previousCanonical) canonical.href = previousCanonical
      if (createdSchema) schema.remove()
      else schema.textContent = previousSchema
    }
  }, [paper])

  useEffect(() => {
    let active = true
    setPdfAvailable(null)
    if (!paper) return () => { active = false }

    if (pdfUrl) {
      fetch(pdfUrl, { method: 'HEAD' })
        .then((response) => {
          const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
          // Some hosts serve PDFs as octet-stream or omit the header entirely.
          // Treat those as available rather than hiding a paper that works.
          const looksLikePdf = contentType === '' || contentType.includes('pdf') || contentType.includes('octet-stream')
          if (active) setPdfAvailable(response.ok && looksLikePdf)
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

        {pdfAvailable === null && pdfUrl ? (
          <section
            aria-label={`Loading ${paper.title}`}
            role="status"
            aria-live="polite"
            className="grid h-[72vh] min-h-[520px] w-full place-items-center rounded-xl border bg-white"
          >
            <div className="text-center">
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">Opening this paper&hellip;</p>
            </div>
          </section>
        ) : pdfAvailable && pdfUrl ? (
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

        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-xl font-bold text-pine">Paper details</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Examination</dt>
              <dd className="font-bold text-pine">{paper.examination}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Year</dt>
              <dd className="font-bold text-pine">{paper.year}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Subject</dt>
              <dd className="font-bold text-pine">{paper.subject}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Paper</dt>
              <dd className="font-bold text-pine">{paper.paper}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Subject type</dt>
              <dd className="font-bold text-pine">{paper.subjectType}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mode</dt>
              <dd className="font-bold text-pine">{paper.mode}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-pine">How to use this past paper</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This archive page identifies the examination, year, subject, paper designation and mode recorded for this
            paper and links directly to the stored PDF. Review the wording and structure of the questions, then
            compare the same subject across other available years to identify recurring areas and changes in
            emphasis. Past papers show what was previously examined; they do not guarantee the content of a future
            paper.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/past-papers/${paper.examination.toLowerCase()}/${paper.year}`}
            className="rounded-lg border px-4 py-3 text-sm font-bold text-pine hover:bg-secondary"
          >
            All {paper.examination} {paper.year} papers
          </Link>
          <Link to="/past-papers" className="rounded-lg border px-4 py-3 text-sm font-bold text-pine hover:bg-secondary">
            Browse the complete CSS Vista past-paper archive
          </Link>
        </div>

        {related.length > 0 && (
          <nav aria-label="Related past papers" className="rounded-xl border bg-white p-5">
            <h2 className="font-display text-xl font-bold text-pine">Related past papers</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((candidate) => (
                <li key={candidate.id}>
                  <Link
                    to={`/past-papers/view/${candidate.id}`}
                    className="font-semibold text-emerald-800 underline underline-offset-2"
                  >
                    {paperPageTitle(candidate)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

      </div>
    </div>
  )
}
