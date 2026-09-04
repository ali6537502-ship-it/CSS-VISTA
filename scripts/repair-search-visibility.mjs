import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteUrl = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com')
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error(`SITE_ORIGIN must be an HTTPS origin without a path: ${siteUrl.href}`)
}
const siteOrigin = siteUrl.origin
const SEO_REFRESH_DATE = '2026-09-05'
const organizationId = `${siteOrigin}/#organization`
const websiteId = `${siteOrigin}/#website`

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\u003c')
}

function replaceSearchMeta(html, { title, description, canonical, structuredData }) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="index, follow, max-image-preview:large" />')
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/\s*<script id="cssv-route-structured-data"[^>]*>[\s\S]*?<\/script>/, '')
    .replace('</head>', `    <script id="cssv-route-structured-data" type="application/ld+json">${jsonLd(structuredData)}</script>\n  </head>`)
}

function replaceRootBody(html, body, label) {
  const next = html.replace(/<div id="root">[\s\S]*?<\/main><\/div>/, `<div id="root">${body}</div>`)
  if (next === html) throw new Error(`Could not replace prerender body for ${label}`)
  return next
}

function patchOrganizationReferences(html) {
  return html
    .replaceAll(`"publisher":{"@type":"Organization","name":"CSS Vista","url":"${siteOrigin}/"}`, `"publisher":{"@id":"${organizationId}"}`)
    .replaceAll(`"provider":{"@type":"Organization","name":"CSS Vista","url":"${siteOrigin}"}`, `"provider":{"@id":"${organizationId}"}`)
    .replaceAll(`"author":{"@type":"Organization","name":"CSS Vista","url":"${siteOrigin}"}`, `"author":{"@id":"${organizationId}"}`)
}

function homeStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${siteOrigin}/`,
        name: 'CSS Vista',
        alternateName: ['CSS VISTA', 'CSS Vista Pakistan'],
        description: 'CSS and PMS competitive examination preparation platform in Pakistan with MCQs, MPT practice, past papers, notes, current affairs and study tools.',
        inLanguage: 'en',
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'EducationalOrganization',
        '@id': organizationId,
        name: 'CSS Vista',
        alternateName: 'CSS VISTA',
        url: `${siteOrigin}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${siteOrigin}/icon-512.png`,
          contentUrl: `${siteOrigin}/icon-512.png`,
          width: 512,
          height: 512,
        },
        image: `${siteOrigin}/og.png`,
        sameAs: ['https://www.instagram.com/cssvista/', 'https://www.youtube.com/@cssvista'],
      },
    ],
  }
}

function homeBody() {
  const resources = [
    ['/start-css', 'How to start CSS preparation'],
    ['/subjects/compulsory', 'CSS compulsory subjects'],
    ['/subjects/optional', 'CSS optional subjects'],
    ['/css-mcqs', 'CSS subject MCQs'],
    ['/mpt', 'CSS MPT preparation'],
    ['/gk', 'GK World'],
    ['/past-papers', 'CSS, PMS and PPSC past papers'],
    ['/current-affairs', 'Current affairs'],
    ['/notes', 'CSS notes'],
    ['/fpsc-syllabus', 'FPSC CSS syllabus'],
    ['/essay', 'CSS Essay preparation'],
    ['/grammar-vocabulary', 'Grammar and vocabulary'],
  ]
  const links = resources.map(([href, label]) => `<li><a href="${href}" class="font-semibold text-emerald-800 underline underline-offset-2">${escapeHtml(label)}</a></li>`).join('')
  return `<main class="mx-auto max-w-5xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">CSS VISTA · Pakistan</p><h1 class="mt-2 font-display text-4xl font-bold text-pine">CSS Vista — CSS &amp; PMS Exam Preparation in Pakistan</h1><p class="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">CSS Vista is a competitive examination preparation platform for aspirants in Pakistan. It brings together subject preparation, MCQ practice, CSS MPT resources, general knowledge, past papers, current affairs, notes, syllabus guidance, grammar support and study tools under one website.</p><section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Prepare with CSS Vista</h2><p class="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Use the subject pages for compulsory and optional preparation, practise topic-based questions, review previous examination papers, follow current-affairs material and organise revision through the study utilities available across CSS Vista.</p><ul class="mt-5 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">${links}</ul></section><section class="mt-9 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">CSS Vista preparation areas</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">The platform covers written CSS preparation, MPT practice, PMS and general-knowledge preparation, past-paper review, English Essay and grammar support, answer-writing practice, FPSC syllabus guidance and subject-specific study resources. Each public resource is linked through the main navigation and sitemap so visitors can reach the relevant section directly.</p></section></main>`
}

function paperTitle(paper) {
  if (paper.examination === 'MPT') return `CSS MPT ${paper.year} Screening Test Past Paper`
  const part = paper.paper === 'Single Paper' ? '' : ` ${paper.paper.replace('One', 'I').replace('Two', 'II')}`
  return `${paper.examination} ${paper.year} ${paper.subject}${part} Past Paper`
}

function paperDescription(paper) {
  return `Download and review the ${paperTitle(paper)} on CSS Vista, with archive details, related papers and a direct PDF link for examination preparation.`
}

function relatedPaperLinks(paper, allPapers) {
  const sameSubject = allPapers
    .filter((candidate) => candidate.id !== paper.id && candidate.examination === paper.examination && candidate.subject === paper.subject)
    .sort((left, right) => Number(right.year) - Number(left.year))
  const sameYear = allPapers
    .filter((candidate) => candidate.id !== paper.id && candidate.examination === paper.examination && candidate.year === paper.year)
  return (sameSubject.length ? sameSubject : sameYear).slice(0, 10)
}

function paperBody(paper, allPapers) {
  const title = paperTitle(paper)
  const related = relatedPaperLinks(paper, allPapers)
  const relatedLinks = related.map((candidate) => `<li><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers/view/${escapeHtml(candidate.id)}">${escapeHtml(paperTitle(candidate))}</a></li>`).join('')
  const yearPath = `/past-papers/${paper.examination.toLowerCase()}/${paper.year}`
  return `<main class="mx-auto max-w-4xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">${escapeHtml(paper.examination)} past papers · ${paper.year}</p><h1 class="mt-2 font-display text-3xl font-bold text-pine">${escapeHtml(title)}</h1><p class="mt-3 text-sm leading-relaxed text-muted-foreground">${escapeHtml(paperDescription(paper))}</p><section class="mt-7 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">Paper details</h2><dl class="mt-4 grid gap-3 sm:grid-cols-2"><div><dt class="text-xs text-muted-foreground">Examination</dt><dd class="font-bold text-pine">${escapeHtml(paper.examination)}</dd></div><div><dt class="text-xs text-muted-foreground">Year</dt><dd class="font-bold text-pine">${paper.year}</dd></div><div><dt class="text-xs text-muted-foreground">Subject</dt><dd class="font-bold text-pine">${escapeHtml(paper.subject)}</dd></div><div><dt class="text-xs text-muted-foreground">Paper</dt><dd class="font-bold text-pine">${escapeHtml(paper.paper)}</dd></div><div><dt class="text-xs text-muted-foreground">Subject type</dt><dd class="font-bold text-pine">${escapeHtml(paper.subjectType)}</dd></div><div><dt class="text-xs text-muted-foreground">Mode</dt><dd class="font-bold text-pine">${escapeHtml(paper.mode)}</dd></div></dl></section><section class="mt-7"><h2 class="font-display text-xl font-bold text-pine">How to use this past paper</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">This archive page identifies the examination, year, subject, paper designation and mode recorded for this paper and links directly to the stored PDF. Review the wording and structure of the questions, then compare the same subject across other available years to identify recurring areas and changes in emphasis. Past papers show what was previously examined; they do not guarantee the content of a future paper.</p></section><div class="mt-6 flex flex-wrap gap-3"><a href="${escapeHtml(paper.fileUrl)}" class="rounded-lg bg-pine px-4 py-3 text-sm font-bold text-white">Open PDF</a><a href="${escapeHtml(paper.fileUrl)}" download class="rounded-lg border px-4 py-3 text-sm font-bold text-pine">Download PDF</a><a href="${yearPath}" class="rounded-lg border px-4 py-3 text-sm font-bold text-pine">All ${escapeHtml(paper.examination)} ${paper.year} papers</a></div>${relatedLinks ? `<nav class="mt-9 rounded-xl border bg-white p-5" aria-label="Related past papers"><h2 class="font-display text-xl font-bold text-pine">Related past papers</h2><ul class="mt-4 grid gap-3 sm:grid-cols-2">${relatedLinks}</ul></nav>` : ''}<p class="mt-7 text-sm text-muted-foreground"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers">Browse the complete CSS Vista past-paper archive</a>.</p></main>`
}

function paperStructuredData(paper, canonical) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DigitalDocument',
        name: paperTitle(paper),
        description: paperDescription(paper),
        url: canonical,
        contentUrl: `${siteOrigin}${paper.fileUrl}`,
        encodingFormat: 'application/pdf',
        inLanguage: 'en',
        about: { '@type': 'Thing', name: paper.subject },
        educationalLevel: 'Competitive examination',
        learningResourceType: 'Past examination paper',
        isPartOf: {
          '@type': 'CollectionPage',
          name: `${paper.examination} ${paper.year} Past Papers`,
          url: `${siteOrigin}/past-papers/${paper.examination.toLowerCase()}/${paper.year}`,
        },
        provider: { '@id': organizationId },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CSS Vista', item: `${siteOrigin}/` },
          { '@type': 'ListItem', position: 2, name: 'Past Papers', item: `${siteOrigin}/past-papers` },
          { '@type': 'ListItem', position: 3, name: `${paper.examination} ${paper.year}`, item: `${siteOrigin}/past-papers/${paper.examination.toLowerCase()}/${paper.year}` },
          { '@type': 'ListItem', position: 4, name: paperTitle(paper), item: canonical },
        ],
      },
    ],
  }
}

const homePath = join(clientDir, 'index.html')
let homeHtml = await readFile(homePath, 'utf8')
homeHtml = replaceSearchMeta(homeHtml, {
  title: 'CSS Vista | CSS & PMS Exam Preparation in Pakistan',
  description: 'CSS Vista is a competitive exam preparation platform in Pakistan with MCQs, MPT practice, past papers, notes, current affairs and study tools.',
  canonical: `${siteOrigin}/`,
  structuredData: homeStructuredData(),
})
homeHtml = replaceRootBody(homeHtml, homeBody(), 'homepage')
await writeFile(homePath, homeHtml)

const routeSeoDir = join(clientDir, 'seo', 'routes')
for (const entry of await readdir(routeSeoDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue
  const path = join(routeSeoDir, entry.name)
  const html = await readFile(path, 'utf8')
  await writeFile(path, patchOrganizationReferences(html))
}

const pastPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const paperSeoDir = join(clientDir, 'seo', 'past-papers')
for (const paper of pastPapers) {
  const path = join(paperSeoDir, `${paper.id}.html`)
  const canonical = `${siteOrigin}/past-papers/view/${paper.id}`
  let html = await readFile(path, 'utf8')
  html = replaceSearchMeta(html, {
    title: `${paperTitle(paper)} | CSS Vista`,
    description: paperDescription(paper),
    canonical,
    structuredData: paperStructuredData(paper, canonical),
  })
  html = replaceRootBody(html, paperBody(paper, pastPapers), `past paper ${paper.id}`)
  await writeFile(path, html)
}

const resultSeoPath = join(clientDir, 'seo', 'css-2026-written-result.html')
try {
  const resultHtml = await readFile(resultSeoPath, 'utf8')
  await writeFile(resultSeoPath, patchOrganizationReferences(resultHtml))
} catch {
  // Optional in non-production preview artifacts.
}

const sitemapPath = join(clientDir, 'sitemap.xml')
let sitemap = await readFile(sitemapPath, 'utf8')
// The public HTML surface was materially refreshed on this date. Keep this
// stable across later builds until another real search/content refresh occurs.
sitemap = sitemap.replace(/<url><loc>([^<]+)<\/loc>(?!<lastmod>)/g, `<url><loc>$1</loc><lastmod>${SEO_REFRESH_DATE}</lastmod>`)
await writeFile(sitemapPath, sitemap)
