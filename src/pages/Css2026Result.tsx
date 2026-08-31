import { useEffect } from 'react'
import { Link } from 'react-router'
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileCheck2,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { css2026WrittenResult as result } from '@/data/css2026Result'

const SITE_ORIGIN = 'https://www.css-vista.com'

const resultStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NewsArticle',
      headline: result.title,
      description: result.description,
      datePublished: result.announcedDate,
      dateModified: result.announcedDate,
      mainEntityOfPage: `${SITE_ORIGIN}${result.pagePath}`,
      author: { '@type': 'Organization', name: 'CSS Vista', url: SITE_ORIGIN },
      publisher: {
        '@type': 'Organization',
        name: 'CSS Vista',
        url: SITE_ORIGIN,
        logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/icon-512.png` },
      },
      isBasedOn: result.officialResultsUrl,
      about: 'CSS Competitive Examination 2026 written result',
    },
    {
      '@type': 'DigitalDocument',
      name: result.title,
      description: result.description,
      url: `${SITE_ORIGIN}${result.pagePath}`,
      contentUrl: `${SITE_ORIGIN}${result.pdfUrl}`,
      encodingFormat: 'application/pdf',
      numberOfPages: result.pageCount,
      datePublished: result.announcedDate,
      inLanguage: 'en',
      provider: { '@type': 'Organization', name: 'CSS Vista', url: SITE_ORIGIN },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'FPSC Updates', item: `${SITE_ORIGIN}/fpsc-updates` },
        { '@type': 'ListItem', position: 3, name: result.shortTitle, item: `${SITE_ORIGIN}${result.pagePath}` },
      ],
    },
  ],
}

function useResultSeo() {
  useEffect(() => {
    const canonicalUrl = `${SITE_ORIGIN}${result.pagePath}`
    const previousTitle = document.title
    document.title = `${result.title} | CSS Vista`

    const upserts = [
      ['meta[name="description"]', 'name', 'description', result.description],
      ['meta[property="og:type"]', 'property', 'og:type', 'article'],
      ['meta[property="og:title"]', 'property', 'og:title', `${result.title} | CSS Vista`],
      ['meta[property="og:description"]', 'property', 'og:description', result.description],
      ['meta[property="og:url"]', 'property', 'og:url', canonicalUrl],
      ['meta[name="twitter:title"]', 'name', 'twitter:title', `${result.title} | CSS Vista`],
      ['meta[name="twitter:description"]', 'name', 'twitter:description', result.description],
    ] as const

    const restores = upserts.map(([selector, attribute, key, value]) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      const created = !element
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.append(element)
      }
      const previous = element.content
      element.content = value
      return () => created ? element?.remove() : element && (element.content = previous)
    })

    const socialImages = [
      document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]'),
      document.head.querySelector<HTMLMetaElement>('meta[name="twitter:image"]'),
    ].filter((element): element is HTMLMetaElement => Boolean(element))
    const socialImageAnchors = socialImages.map((element) => ({ element, next: element.nextSibling }))
    socialImages.forEach((element) => element.remove())

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const createdCanonical = !canonical
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    const previousCanonical = canonical.href
    canonical.href = canonicalUrl

    let structuredData = document.getElementById('cssv-route-structured-data') as HTMLScriptElement | null
    const createdStructuredData = !structuredData
    if (!structuredData) {
      structuredData = document.createElement('script')
      structuredData.id = 'cssv-route-structured-data'
      structuredData.type = 'application/ld+json'
      document.head.append(structuredData)
    }
    const previousStructuredData = structuredData.textContent
    structuredData.textContent = JSON.stringify(resultStructuredData)

    return () => {
      document.title = previousTitle
      restores.forEach((restore) => restore())
      if (createdCanonical) canonical?.remove()
      else if (canonical) canonical.href = previousCanonical
      socialImageAnchors.forEach(({ element, next }) => {
        if (next?.parentNode === document.head) document.head.insertBefore(element, next)
        else document.head.append(element)
      })
      if (createdStructuredData) structuredData?.remove()
      else if (structuredData) structuredData.textContent = previousStructuredData
    }
  }, [])
}

const facts = [
  { label: 'Announced', value: result.announcedDateLabel, icon: CalendarDays },
  { label: 'Qualified candidates', value: result.qualifiedCandidates.toLocaleString('en-PK'), icon: Users },
  { label: 'Result document', value: `${result.pageCount} pages · ${result.fileSizeLabel}`, icon: FileCheck2 },
]

export default function Css2026Result() {
  useResultSeo()

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5faf7_0%,#fffdf8_38%,#ffffff_100%)]">
      <article className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="font-semibold text-emerald-800 hover:underline">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/fpsc-updates" className="font-semibold text-emerald-800 hover:underline">FPSC Updates</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">CSS 2026 Written Result</span>
        </nav>

        <header className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-[0_22px_70px_rgba(5,72,50,0.10)]">
          <div className="border-b border-emerald-900/10 bg-emerald-950 px-5 py-3 text-emerald-50 sm:px-8">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]">
              <ShieldCheck className="h-4 w-4 text-amber-300" /> FPSC written-result update
            </p>
          </div>
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="text-sm font-bold text-amber-700">Announced {result.announcedDateLabel}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-0.035em] text-emerald-950 sm:text-4xl lg:text-5xl">
              CSS 2026 Written Result - Qualified Candidates List
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              View the complete list of candidates who qualified the written portion of the CSS Competitive Examination 2026. The supplied result document contains roll numbers and names for {result.qualifiedCandidates} candidates.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <FileCheck2 className="h-4 w-4" /> View result PDF
              </a>
              <a
                href={result.pdfUrl}
                download={result.downloadFilename}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-900/15 bg-white px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4" /> Download result
              </a>
            </div>

            <dl className="mt-7 grid gap-3 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-emerald-900/10 bg-emerald-50/55 p-4">
                  <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
                    <fact.icon className="h-4 w-4" /> {fact.label}
                  </dt>
                  <dd className="mt-2 font-bold text-slate-900">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border bg-white p-4 shadow-sm sm:p-6" aria-labelledby="result-viewer-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Complete PDF</p>
              <h2 id="result-viewer-title" className="mt-1 text-2xl font-black tracking-tight text-emerald-950">View the CSS 2026 result</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Use your PDF viewer’s search tool to find a roll number or candidate name.</p>
            </div>
            <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border px-3 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-50">
              Open full screen <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-slate-100">
            <iframe
              src={`${result.pdfUrl}#view=FitH`}
              title="CSS 2026 written result qualified candidates PDF"
              loading="lazy"
              className="h-[68vh] min-h-[520px] w-full bg-white sm:h-[780px]"
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            If the embedded viewer is not supported on your phone, use <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-800 underline underline-offset-2">Open full screen</a> or download the PDF.
          </p>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5 sm:p-6" aria-labelledby="how-to-check-title">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Search className="h-5 w-5" /></span>
              <h2 id="how-to-check-title" className="text-xl font-black text-emerald-950">How to check your CSS 2026 result</h2>
            </div>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li><strong className="text-slate-900">1.</strong> Open the PDF viewer above or download the result.</li>
              <li><strong className="text-slate-900">2.</strong> Use Find/Search in the PDF viewer.</li>
              <li><strong className="text-slate-900">3.</strong> Enter your six-digit roll number or full name.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-amber-300/60 bg-amber-50/60 p-5 sm:p-6" aria-labelledby="important-result-note">
            <h2 id="important-result-note" className="text-xl font-black text-emerald-950">Important result note</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              This list records qualification in the <strong>written portion</strong> of CSS 2026; it is not the final allocation result. FPSC remains the primary authority for result corrections and all next-stage notices.
            </p>
            <a href={result.officialResultsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-emerald-900 ring-1 ring-emerald-900/10 hover:bg-emerald-50">
              Check FPSC results <ExternalLink className="h-4 w-4" />
            </a>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border bg-white p-5 sm:p-6" aria-labelledby="css-result-faq">
          <h2 id="css-result-faq" className="text-2xl font-black text-emerald-950">CSS 2026 written result: quick answers</h2>
          <div className="mt-4 divide-y">
            <details className="py-4" open>
              <summary className="cursor-pointer font-bold text-slate-900">Is the CSS 2026 written result announced?</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">Yes. The result document is dated {result.announcedDateLabel}.</p>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer font-bold text-slate-900">How many candidates qualified the CSS 2026 written examination?</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">The supplied FPSC list contains {result.qualifiedCandidates} qualified candidates.</p>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer font-bold text-slate-900">Can I download the complete CSS 2026 result?</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">Yes. The complete {result.pageCount}-page PDF is available to view or download on this page.</p>
            </details>
          </div>
        </section>
      </article>
    </main>
  )
}
