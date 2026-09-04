import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'
import { INDEXABLE_STATIC_ROUTES, ROUTE_REGISTRY } from '../src/data/routeRegistry.mjs'

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
const css2026Result = JSON.parse(await readFile(join(root, 'src', 'data', 'css2026Result.json'), 'utf8'))

// Keep the Sites preview bundle lean while preserving the complete study
// archive in GitHub. Its Worker can use the repository fallback below.
// Hostinger has no Worker fallback, so its static build must include every PDF.
const remotelyServedDirectories = emitWorker
  ? new Set(['past-papers', 'samples'])
  : new Set()

for (const entry of await readdir(publicDir, { withFileTypes: true })) {
  if (entry.isDirectory() && remotelyServedDirectories.has(entry.name)) continue
  await cp(join(publicDir, entry.name), join(clientDir, entry.name), {
    recursive: true,
    dereference: true,
  })
}

const clientIndex = await readFile(indexPath, 'utf8')
if (emitWorker) await mkdir(serverDir, { recursive: true })

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

function replaceMeta(html, { title, description, canonical, body, structuredData, robots = 'index, follow', ogType = 'website', additionalMeta = '' }) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${escapeHtml(ogType)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${escapeHtml(robots)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace('</head>', `${additionalMeta ? `    ${additionalMeta}\n` : ''}    <script id="cssv-route-structured-data" type="application/ld+json">${jsonLd(structuredData)}</script>\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
    .replaceAll('__SITE_ORIGIN__', siteOrigin)
}

function staticRouteFile(routePath) {
  const name = routePath.replace(/^\/+|\/+$/g, '').replaceAll('/', '--') || 'home'
  return `${name}.html`
}

function routeBody(route) {
  const related = INDEXABLE_STATIC_ROUTES
    .filter((candidate) => candidate.path !== route.path && candidate.path !== '/')
    .map((candidate) => `<li><a href="${escapeHtml(candidate.path)}">${escapeHtml(candidate.h1)}</a></li>`)
    .join('')
  return `<main class="mx-auto max-w-5xl px-4 py-12"><h1 class="font-display text-4xl font-bold text-pine">${escapeHtml(route.h1)}</h1><p class="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">${escapeHtml(route.intro)}</p><nav class="mt-8 rounded-xl border bg-white p-5" aria-label="CSS Vista resources"><h2 class="font-display text-xl font-bold text-pine">Explore CSS Vista resources</h2><ul class="mt-4 grid gap-3 sm:grid-cols-2">${related}</ul></nav></main>`
}

function routeStructuredData(route, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': route.schemaType,
    name: route.h1,
    description: route.description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'CSS Vista', url: `${siteOrigin}/` },
    publisher: { '@type': 'Organization', name: 'CSS Vista', url: `${siteOrigin}/` },
  }
}

function paperTitle(paper) {
  if (paper.examination === 'MPT') return `CSS MPT ${paper.year} Screening Test Past Paper`
  const part = paper.paper === 'Single Paper' ? '' : ` ${paper.paper.replace('One', 'I').replace('Two', 'II')}`
  return `${paper.examination} ${paper.year} ${paper.subject}${part} Past Paper`
}

function paperDescription(paper) {
  return `Open and download the ${paperTitle(paper)}. ${paper.subjectType} ${paper.mode.toLowerCase()} paper on CSS Vista.`
}

function paperBody(paper) {
  const title = paperTitle(paper)
  return `<main class="mx-auto max-w-4xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">${escapeHtml(paper.examination)} past papers · ${paper.year}</p><h1 class="mt-2 font-display text-3xl font-bold text-pine">${escapeHtml(title)}</h1><p class="mt-3 text-sm leading-relaxed text-muted-foreground">${escapeHtml(paperDescription(paper))}</p><dl class="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2"><div><dt class="text-xs text-muted-foreground">Subject</dt><dd class="font-bold text-pine">${escapeHtml(paper.subject)}</dd></div><div><dt class="text-xs text-muted-foreground">Paper</dt><dd class="font-bold text-pine">${escapeHtml(paper.paper)}</dd></div><div><dt class="text-xs text-muted-foreground">Subject type</dt><dd class="font-bold text-pine">${escapeHtml(paper.subjectType)}</dd></div><div><dt class="text-xs text-muted-foreground">Mode</dt><dd class="font-bold text-pine">${escapeHtml(paper.mode)}</dd></div></dl><div class="mt-5 flex flex-wrap gap-3"><a href="/past-papers/view/${paper.id}" class="rounded-lg bg-pine px-4 py-3 text-sm font-bold text-white">Open PDF</a><a href="/past-papers/${paper.examination.toLowerCase()}/${paper.year}" class="rounded-lg border px-4 py-3 text-sm font-bold text-pine">All ${paper.examination} ${paper.year} papers</a></div></main>`
}

function collectionBody(examination, year, papers) {
  const links = papers.map((paper) => `<li><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers/view/${paper.id}">${escapeHtml(paperTitle(paper))}</a></li>`).join('')
  return `<main class="mx-auto max-w-4xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Complete year collection</p><h1 class="mt-2 font-display text-3xl font-bold text-pine">${examination} ${year} Past Papers</h1><p class="mt-3 text-sm leading-relaxed text-muted-foreground">Browse ${papers.length} ${examination} ${year} past-paper PDFs by subject.</p><ul class="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">${links}</ul><a class="mt-5 inline-block font-bold text-emerald-800 underline underline-offset-2" href="/past-papers">Browse the complete past-paper archive</a></main>`
}

function css2026ResultBody() {
  return `<main class="mx-auto max-w-4xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">FPSC written result · announced ${escapeHtml(css2026Result.announcedDateLabel)}</p><h1 class="mt-2 font-display text-4xl font-bold text-pine">${escapeHtml(css2026Result.title)}</h1><p class="mt-4 text-base leading-relaxed text-muted-foreground">View and download the complete ${css2026Result.pageCount}-page list of ${css2026Result.qualifiedCandidates} candidates who qualified the written portion of the CSS Competitive Examination 2026.</p><dl class="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3"><div><dt class="text-xs text-muted-foreground">Announced</dt><dd class="font-bold text-pine">${escapeHtml(css2026Result.announcedDateLabel)}</dd></div><div><dt class="text-xs text-muted-foreground">Qualified candidates</dt><dd class="font-bold text-pine">${css2026Result.qualifiedCandidates}</dd></div><div><dt class="text-xs text-muted-foreground">Document</dt><dd class="font-bold text-pine">${css2026Result.pageCount} pages · ${escapeHtml(css2026Result.fileSizeLabel)}</dd></div></dl><div class="mt-5 flex flex-wrap gap-3"><a href="${escapeHtml(css2026Result.pdfUrl)}" class="rounded-lg bg-pine px-4 py-3 text-sm font-bold text-white">View result PDF</a><a href="${escapeHtml(css2026Result.pdfUrl)}" download="${escapeHtml(css2026Result.downloadFilename)}" class="rounded-lg border px-4 py-3 text-sm font-bold text-pine">Download result</a></div><section class="mt-8"><h2 class="font-display text-2xl font-bold text-pine">How to check the CSS 2026 result</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">Open the PDF and use its Find or Search command to locate a six-digit roll number or candidate name. This is the written-portion result, not the final allocation result.</p><a class="mt-4 inline-block font-bold text-emerald-800 underline underline-offset-2" href="${escapeHtml(css2026Result.officialResultsUrl)}">Verify updates on the FPSC results page</a></section></main>`
}

const routeSeoDir = join(clientDir, 'seo', 'routes')
await mkdir(routeSeoDir, { recursive: true })
for (const route of ROUTE_REGISTRY.filter((entry) => entry.match === 'exact')) {
  const canonical = `${siteOrigin}${route.path}`
  const html = replaceMeta(clientIndex, {
    title: route.title,
    description: route.description,
    canonical,
    robots: route.robots,
    structuredData: routeStructuredData(route, canonical),
    body: routeBody(route),
  })
  if (route.path === '/') await writeFile(indexPath, html)
  else await writeFile(join(routeSeoDir, staticRouteFile(route.path)), html)
}

const notFoundHtml = replaceMeta(clientIndex, {
  title: 'Page Not Found | CSS Vista',
  description: 'The requested CSS Vista page could not be found.',
  canonical: `${siteOrigin}/404`,
  robots: 'noindex, nofollow',
  structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page not found', url: `${siteOrigin}/404` },
  body: '<main class="mx-auto max-w-3xl px-4 py-16"><h1 class="font-display text-4xl font-bold text-pine">Page not found</h1><p class="mt-4 text-muted-foreground">The requested page does not exist or has moved.</p><a class="mt-6 inline-block font-bold text-emerald-800 underline" href="/">Return to CSS Vista</a></main>',
})
await writeFile(join(clientDir, '404.html'), notFoundHtml)
const protectedRouteHtml = replaceMeta(clientIndex, {
  title: 'CSS Vista Interactive Study Page',
  description: 'Interactive CSS Vista study session.',
  canonical: `${siteOrigin}/`,
  robots: 'noindex, follow',
  structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'CSS Vista interactive study page' },
  body: '<main class="mx-auto max-w-3xl px-4 py-12"><h1 class="font-display text-3xl font-bold text-pine">CSS Vista interactive study page</h1><p class="mt-3 text-muted-foreground">The interactive application is loading.</p></main>',
})
await writeFile(join(routeSeoDir, 'protected.html'), protectedRouteHtml)

const htaccessPath = join(clientDir, '.htaccess')
const routeRules = ROUTE_REGISTRY
  .filter((route) => route.match === 'exact' && route.path !== '/' && route.path !== css2026Result.pagePath)
  .map((route) => {
    const pattern = route.path.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return `  RewriteRule ^${pattern}/?$ seo/routes/${staticRouteFile(route.path)} [L,NC]`
  })
  .join('\n')
const htaccess = await readFile(htaccessPath, 'utf8')
await writeFile(htaccessPath, htaccess.replace(
  /  # CSSV_GENERATED_ROUTE_RULES_START[\s\S]*?  # CSSV_GENERATED_ROUTE_RULES_END/,
  `  # CSSV_GENERATED_ROUTE_RULES_START\n${routeRules}\n  # CSSV_GENERATED_ROUTE_RULES_END`,
))

const pastPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const paperSeoDir = join(clientDir, 'seo', 'past-papers')
const collectionSeoDir = join(clientDir, 'seo', 'past-paper-collections')
await mkdir(paperSeoDir, { recursive: true })
await mkdir(collectionSeoDir, { recursive: true })

for (const paper of pastPapers) {
  const canonical = `${siteOrigin}/past-papers/view/${paper.id}`
  const title = `${paperTitle(paper)} | CSS Vista`
  const description = paperDescription(paper)
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
    title, description, canonical, structuredData, body: paperBody(paper),
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
  const description = `Browse ${papers.length} ${examination} ${year} past-paper PDFs in this verified collection.`
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

const css2026ResultCanonical = `${siteOrigin}${css2026Result.pagePath}`
const css2026ResultTitle = `${css2026Result.title} | CSS Vista`
const css2026ResultStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NewsArticle',
      headline: css2026Result.title,
      description: css2026Result.description,
      datePublished: css2026Result.announcedDate,
      dateModified: css2026Result.announcedDate,
      mainEntityOfPage: css2026ResultCanonical,
      author: { '@type': 'Organization', name: 'CSS Vista', url: siteOrigin },
      publisher: { '@type': 'Organization', name: 'CSS Vista', url: siteOrigin, logo: { '@type': 'ImageObject', url: `${siteOrigin}/icon-512.png` } },
      isBasedOn: css2026Result.officialResultsUrl,
      about: 'CSS Competitive Examination 2026 written result',
    },
    {
      '@type': 'DigitalDocument',
      name: css2026Result.title,
      description: css2026Result.description,
      url: css2026ResultCanonical,
      contentUrl: `${siteOrigin}${css2026Result.pdfUrl}`,
      encodingFormat: 'application/pdf',
      numberOfPages: css2026Result.pageCount,
      datePublished: css2026Result.announcedDate,
      inLanguage: 'en',
      provider: { '@type': 'Organization', name: 'CSS Vista', url: siteOrigin },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}/` },
        { '@type': 'ListItem', position: 2, name: 'FPSC Updates', item: `${siteOrigin}/fpsc-updates` },
        { '@type': 'ListItem', position: 3, name: css2026Result.shortTitle, item: css2026ResultCanonical },
      ],
    },
  ],
}
await mkdir(join(clientDir, 'seo'), { recursive: true })
await writeFile(join(clientDir, 'seo', 'css-2026-written-result.html'), replaceMeta(clientIndex, {
  title: css2026ResultTitle,
  description: css2026Result.description,
  canonical: css2026ResultCanonical,
  structuredData: css2026ResultStructuredData,
  body: css2026ResultBody(),
  ogType: 'article',
  additionalMeta: `<meta property="article:published_time" content="${escapeHtml(css2026Result.announcedDate)}" />`,
}))

const sitemapUrls = [
  ...INDEXABLE_STATIC_ROUTES.map((route) => `${siteOrigin}${route.path}`),
  ...[...collections.keys()].map((key) => `${siteOrigin}/past-papers/${key}`),
  ...pastPapers.map((paper) => `${siteOrigin}/past-papers/view/${paper.id}`),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => url === css2026ResultCanonical
  ? `  <url><loc>${escapeHtml(url)}</loc><lastmod>${escapeHtml(css2026Result.announcedDate)}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`
  : `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`
await writeFile(join(clientDir, 'sitemap.xml'), sitemap)
await writeFile(join(clientDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`)

const exactSeoRoutes = Object.fromEntries(ROUTE_REGISTRY
  .filter((route) => route.match === 'exact' && route.path !== '/')
  .map((route) => [route.path, `/seo/routes/${staticRouteFile(route.path).replace(/\.html$/, '')}`]))
exactSeoRoutes[css2026Result.pagePath] = '/seo/css-2026-written-result'

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
    const normalizedPath = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '')
    const exactSeoRoutes = ${JSON.stringify(exactSeoRoutes)}
    const paperMatch = url.pathname.match(/^\\/past-papers\\/view\\/([a-z0-9-]+)\\/?$/)
    const collectionMatch = url.pathname.match(/^\\/past-papers\\/(css|pms|ppsc|mpt)\\/(\\d{4})\\/?$/)
    const protectedDynamic = /^\/(?:notes\/view\/[^/]+\/[^/]+|mpt\/bank\/[^/]+|gk\/cat\/[^/]+)\/?$/.test(url.pathname)
    const seoPath = exactSeoRoutes[normalizedPath]
      || (paperMatch
        ? '/seo/past-papers/' + paperMatch[1]
        : collectionMatch
          ? '/seo/past-paper-collections/' + collectionMatch[1] + '/' + collectionMatch[2]
          : protectedDynamic ? '/seo/routes/protected' : null)
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
      const notFound = await fetchPackagedAsset(new Request(new URL('/404.html', url), request), env)
      response = new Response(notFound.body, { status: 404, headers: notFound.headers })
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
