import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(dist, 'client')
const publicDir = join(root, 'public')
const serverDir = join(dist, 'server')
const indexPath = join(clientDir, 'index.html')
const emitWorker = process.env.CSSV_EMIT_WORKER !== 'false'
const requestedOrigin = process.env.SITE_ORIGIN || 'https://css-vista.ali6537.chatgpt.site'
const siteUrl = new URL(requestedOrigin)
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error(`SITE_ORIGIN must be an HTTPS origin without a path: ${requestedOrigin}`)
}
const siteOrigin = siteUrl.origin

// Keep the interactive preview bundle lean while preserving the complete study
// archive in GitHub. Large PDFs are served from the matching public repository
// path by the Worker fallback below; all other public assets ship with the Site.
const remotelyServedDirectories = new Set(['past-papers', 'samples'])

for (const entry of await readdir(publicDir, { withFileTypes: true })) {
  if (entry.isDirectory() && remotelyServedDirectories.has(entry.name)) continue
  await cp(join(publicDir, entry.name), join(clientDir, entry.name), { recursive: true })
}

const clientIndex = await readFile(indexPath, 'utf8')
const pastPaperAnalysis = JSON.parse(await readFile(join(publicDir, 'css-past-paper-analysis.json'), 'utf8'))
if (emitWorker) await mkdir(serverDir, { recursive: true })

const analysisSubjectAliases = new Map([
  ['essay', 'english essay'],
  ['precis & composition', 'english (precis and composition)'],
  ['accounting & auditing', 'accountancy & auditing'],
  ['environmental sciences', 'environmental science'],
])

function normalized(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizedPaperLabel(value) {
  return normalized(value).replace('paper one', 'paper i').replace('paper two', 'paper ii')
}

function analysisForPaper(paper) {
  if (paper.examination !== 'CSS') return { subjectSlug: '', questions: [] }
  const requested = analysisSubjectAliases.get(normalized(paper.subject)) ?? normalized(paper.subject)
  const subject = pastPaperAnalysis.subjects.find((item) => normalized(item.name) === requested)
  if (!subject) return { subjectSlug: '', questions: [] }
  const questions = subject.sections.flatMap((section) => section.topics.flatMap((topic) => topic.questions
    .filter((question) => question.year === paper.year && (
      paper.paper === 'Single Paper'
      || paper.paper === 'Combined Papers'
      || normalizedPaperLabel(question.paper) === normalizedPaperLabel(paper.paper)
    ))
    .map((question) => ({ ...question, topic: topic.title }))))
  return {
    subjectSlug: subject.slug,
    questions: [...new Map(questions.map((question) => [question.id, question])).values()]
      .sort((left, right) => Number.parseInt(left.number.replace(/\D/g, ''), 10) - Number.parseInt(right.number.replace(/\D/g, ''), 10)),
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function replaceMeta(html, { title, description, canonical, body, structuredData }) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/\s*<meta property="og:image" content="[^"]*" \/>/, '')
    .replace(/\s*<meta name="twitter:image" content="[^"]*" \/>/, '')
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace('</head>', `    <meta name="robots" content="index, follow, max-image-preview:large" />\n    <script type="application/ld+json">${jsonLd(structuredData)}</script>\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

function paperTitle(paper) {
  const part = paper.paper === 'Single Paper' ? '' : ` ${paper.paper.replace('One', 'I').replace('Two', 'II')}`
  return `${paper.examination} ${paper.year} ${paper.subject}${part} Past Paper`
}

function paperDescription(paper) {
  return `Explore the ${paper.examination} ${paper.year} ${paper.subject} ${paper.paper.toLowerCase()} past-paper record, with verified question text where recoverable. ${paper.subjectType} ${paper.mode.toLowerCase()} paper on CSS Vista.`
}

function paperBody(paper, analysis) {
  const title = paperTitle(paper)
  const questionList = analysis.questions.length
    ? `<section class="mt-6"><h2 class="font-display text-2xl font-bold text-pine">Verified questions recovered for ${paper.year}</h2><ol class="mt-4 space-y-3">${analysis.questions.map((question) => `<li class="rounded-xl border bg-white p-4"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">${escapeHtml(question.number)} · ${escapeHtml(question.paper)} · ${escapeHtml(question.topic)}</p><p class="mt-2 text-sm leading-7">${escapeHtml(question.text)}</p></li>`).join('')}</ol></section>`
    : '<p class="mt-6 rounded-xl border bg-white p-4 text-sm">No reliable question transcription was recovered for this source record. It remains listed for archive completeness without invented content.</p>'
  const analysisLink = analysis.subjectSlug
    ? `<a href="/css-past-paper-analysis?subject=${encodeURIComponent(analysis.subjectSlug)}&year=${paper.year}" class="rounded-lg bg-pine px-4 py-3 text-sm font-bold text-white">Topic-wise analysis</a>`
    : ''
  return `<main class="mx-auto max-w-4xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">${escapeHtml(paper.examination)} past papers · ${paper.year}</p><h1 class="mt-2 font-display text-3xl font-bold text-pine">${escapeHtml(title)}</h1><p class="mt-3 text-sm leading-relaxed text-muted-foreground">${escapeHtml(paperDescription(paper))}</p><dl class="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2"><div><dt class="text-xs text-muted-foreground">Subject</dt><dd class="font-bold text-pine">${escapeHtml(paper.subject)}</dd></div><div><dt class="text-xs text-muted-foreground">Paper</dt><dd class="font-bold text-pine">${escapeHtml(paper.paper)}</dd></div><div><dt class="text-xs text-muted-foreground">Subject type</dt><dd class="font-bold text-pine">${escapeHtml(paper.subjectType)}</dd></div><div><dt class="text-xs text-muted-foreground">Mode</dt><dd class="font-bold text-pine">${escapeHtml(paper.mode)}</dd></div></dl>${questionList}<div class="mt-5 flex flex-wrap gap-3">${analysisLink}<a href="/past-papers/${paper.examination.toLowerCase()}/${paper.year}" class="rounded-lg border px-4 py-3 text-sm font-bold text-pine">All ${paper.examination} ${paper.year} papers</a></div></main>`
}

function collectionBody(examination, year, papers) {
  const links = papers.map((paper) => `<li><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers/view/${paper.id}">${escapeHtml(paperTitle(paper))}</a></li>`).join('')
  return `<main class="mx-auto max-w-4xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Complete year collection</p><h1 class="mt-2 font-display text-3xl font-bold text-pine">${examination} ${year} Past Papers</h1><p class="mt-3 text-sm leading-relaxed text-muted-foreground">Browse ${papers.length} ${examination} ${year} compulsory and optional past-paper records by subject, with direct pages and verified question text where recoverable.</p><ul class="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">${links}</ul><a class="mt-5 inline-block font-bold text-emerald-800 underline underline-offset-2" href="/past-papers">Browse the complete past-paper archive</a></main>`
}

const pastPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const paperSeoDir = join(clientDir, 'seo', 'past-papers')
const collectionSeoDir = join(clientDir, 'seo', 'past-paper-collections')
await mkdir(paperSeoDir, { recursive: true })
await mkdir(collectionSeoDir, { recursive: true })

for (const paper of pastPapers) {
  const canonical = `${siteOrigin}/past-papers/view/${paper.id}`
  const title = `${paperTitle(paper)} | CSS Vista`
  const description = paperDescription(paper)
  const analysis = analysisForPaper(paper)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: paperTitle(paper),
    description,
    url: canonical,
    inLanguage: 'en',
    datePublished: `${paper.year}-01-01`,
    about: { '@type': 'Thing', name: paper.subject },
    educationalLevel: 'Competitive examination',
    learningResourceType: 'Past examination paper',
    isPartOf: { '@type': 'CollectionPage', name: `${paper.examination} Past Papers`, url: `${siteOrigin}/past-papers` },
    provider: { '@type': 'Organization', name: 'CSS Vista', url: siteOrigin },
  }
  await writeFile(join(paperSeoDir, `${paper.id}.html`), replaceMeta(clientIndex, {
    title, description, canonical, structuredData, body: paperBody(paper, analysis),
  }))
}

const collections = new Map()
for (const paper of pastPapers) {
  const key = `${paper.examination.toLowerCase()}/${paper.year}`
  collections.set(key, [...(collections.get(key) ?? []), paper])
}
for (const [key, papers] of collections) {
  const [examSlug, rawYear] = key.split('/')
  const examination = papers[0].examination
  const year = Number(rawYear)
  const canonical = `${siteOrigin}/past-papers/${examSlug}/${year}`
  const title = `${examination} ${year} Past Papers — All Subjects | CSS Vista`
  const description = `Browse ${papers.length} ${examination} ${year} past-paper records for compulsory and optional subjects, with direct pages and verified question text where recoverable.`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${examination} ${year} Past Papers`,
    description,
    url: canonical,
    mainEntity: { '@type': 'ItemList', numberOfItems: papers.length, itemListElement: papers.map((paper, index) => ({ '@type': 'ListItem', position: index + 1, name: paperTitle(paper), url: `${siteOrigin}/past-papers/view/${paper.id}` })) },
  }
  const targetDir = join(collectionSeoDir, examSlug)
  await mkdir(targetDir, { recursive: true })
  await writeFile(join(targetDir, `${year}.html`), replaceMeta(clientIndex, {
    title, description, canonical, structuredData, body: collectionBody(examination, year, papers),
  }))
}

const coreUrls = ['/', '/past-papers', '/css-past-paper-analysis', '/fpsc-syllabus', '/css-mcqs', '/mpt', '/gk', '/current-affairs', '/study-tools']
const sitemapUrls = [
  ...coreUrls.map((path) => `${siteOrigin}${path}`),
  ...[...collections.keys()].map((key) => `${siteOrigin}/past-papers/${key}`),
  ...pastPapers.map((paper) => `${siteOrigin}/past-papers/view/${paper.id}`),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`
await writeFile(join(clientDir, 'sitemap.xml'), sitemap)
await writeFile(join(clientDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`)
if (!emitWorker) {
  await writeFile(indexPath, clientIndex.replaceAll('__SITE_ORIGIN__', siteOrigin))
}

const worker = `const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

function withHeaders(response, pathname) {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value)
  if (/\\/assets\\/[^/]+-[A-Za-z0-9_-]+\\.(?:js|css)$/.test(pathname)) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.toLowerCase().endsWith('.pdf')) {
    headers.set('Cache-Control', 'public, max-age=86400')
  } else if (headers.get('content-type')?.includes('text/html')) {
    headers.set('Cache-Control', 'no-cache')
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

async function fetchPackagedAsset(request, env) {
  let response = await env.ASSETS.fetch(request)
  if (response.status !== 404) return response

  const url = new URL(request.url)
  const packagedUrl = new URL('/dist' + url.pathname, url)
  packagedUrl.search = url.search
  return env.ASSETS.fetch(new Request(packagedUrl, request))
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const paperMatch = url.pathname.match(/^\\/past-papers\\/view\\/([a-z0-9-]+)\\/?$/)
    const collectionMatch = url.pathname.match(/^\\/past-papers\\/(css|pms|ppsc)\\/(\\d{4})\\/?$/)
    const seoPath = paperMatch
      ? '/seo/past-papers/' + paperMatch[1]
      : collectionMatch
        ? '/seo/past-paper-collections/' + collectionMatch[1] + '/' + collectionMatch[2]
        : null
    let response = seoPath
      ? await fetchPackagedAsset(new Request(new URL(seoPath, url), request), env)
      : await fetchPackagedAsset(request, env)

    if (
      response.status === 404
      && request.method === 'GET'
      && (url.pathname.startsWith('/past-papers/') || url.pathname.startsWith('/samples/'))
    ) {
      const repositoryAsset = new URL(
        url.pathname.replace(/^\\/+/, '') + url.search,
        'https://raw.githubusercontent.com/ali6537502-ship-it/CSS-VISTA/main/public/',
      )
      return Response.redirect(repositoryAsset, 302)
    }

    const documentNavigation = request.method === 'GET' && (
      request.headers.get('accept')?.includes('text/html')
      || !/\\.[a-z0-9]{1,8}$/i.test(url.pathname)
    )
    if (response.status === 404 && documentNavigation) {
      response = await fetchPackagedAsset(new Request(new URL('/index.html', url), request), env)
    }

    if (response.headers.get('content-type')?.includes('text/html')) {
      const html = (await response.text()).replaceAll('__SITE_ORIGIN__', url.origin)
      response = new Response(html, response)
    }

    return withHeaders(response, url.pathname)
  },
}
`

if (emitWorker) {
  await writeFile(join(serverDir, 'index.js'), worker)
  console.log('Prepared Sites assets, worker entrypoint, and SPA fallback.')
} else {
  console.log(`Prepared static Hostinger assets for ${siteOrigin}.`)
}
