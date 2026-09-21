/**
 * Publish the Islamic Studies reference banks as crawlable, directly
 * navigable pages.
 *
 * The HTML is the REAL React component, server-rendered by the same prerender
 * bundle the rest of the site uses (scripts/prerender/), not separately
 * authored SEO copy. This script only routes that output: it writes each
 * rendered page to a served file, adds the Hostinger rewrite rules so a direct
 * URL and a refresh both resolve, and lists the pages in the sitemap.
 *
 * It runs after scripts/prerender-real-content.mjs, which builds `dist-ssr`
 * and has already failed the build if any of these components could not
 * render.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { installDomShim } from './lib/dom-shim.mjs'
import { primaryContentText, isPlaceholderContent } from './lib/content-quality.mjs'
import { getRoutePolicy } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteOrigin = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com').origin

const index = JSON.parse(
  await readFile(join(root, 'src/data/bundled/islamic-references-index.json'), 'utf8'))

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

const chapterName = (chapter) => chapter.titleEn.replace(/^[IVX]+\.\s*/, '').trim()

/** Every page this section publishes, with the metadata its shell needs. */
const pages = []
for (const chapter of index.chapters) {
  const name = chapterName(chapter)
  pages.push({
    path: `/study-material/islamic-studies/${chapter.slug}`,
    file: `${chapter.slug}.html`,
    title: `${name} — CSS Islamic Studies References (English & Urdu) | CSS Vista`,
    description: `${chapter.referenceCount} source-checked references for ${name}, across ${chapter.topics.length} topics, with Arabic source passages and parallel English and Urdu.`,
    breadcrumb: [{ name: 'Islamic Studies Reference Bank', item: `${siteOrigin}/study-material/islamic-studies` }, { name, item: `${siteOrigin}/study-material/islamic-studies/${chapter.slug}` }],
  })
  for (const topic of chapter.topics) {
    pages.push({
      path: `/study-material/islamic-studies/${chapter.slug}/${topic.slug}`,
      file: `${chapter.slug}--${topic.slug}.html`,
      title: `${topic.titleEn} — ${name} References | CSS Vista`,
      description: `${topic.count} source-checked Qur'anic, Hadith and scholarly references on ${topic.titleEn.toLowerCase()} for CSS Islamic Studies, with Arabic passages and parallel English and Urdu.`,
      breadcrumb: [
        { name: 'Islamic Studies Reference Bank', item: `${siteOrigin}/study-material/islamic-studies` },
        { name, item: `${siteOrigin}/study-material/islamic-studies/${chapter.slug}` },
        { name: topic.titleEn, item: `${siteOrigin}/study-material/islamic-studies/${chapter.slug}/${topic.slug}` },
      ],
    })
  }
}

for (const entry of pages) {
  const segments = entry.path.split('/').slice(3)
  if (!segments.every((segment) => /^[a-z0-9-]+$/.test(segment))) {
    throw new Error(`Unsafe Islamic-reference URL segment: ${entry.path}`)
  }
}

installDomShim()
const { renderRoute } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry.js')).href)

function jsonLd(entry, canonical) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: entry.title.split(' | ')[0],
        description: entry.description,
        url: canonical,
        mainEntityOfPage: canonical,
        inLanguage: ['en', 'ur'],
        isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: 'CSS Vista', url: `${siteOrigin}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}/` },
          ...entry.breadcrumb.map((crumb, position) => ({
            '@type': 'ListItem', position: position + 2, name: crumb.name, item: crumb.item,
          })),
        ],
      },
    ],
  }).replaceAll('<', '\\u003c')
}

function renderShell(template, entry, body, canonical, robots) {
  const next = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(entry.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(entry.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${robots}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />')
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(entry.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(entry.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(entry.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(entry.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/\s*<script id="cssv-route-structured-data"[^>]*>[\s\S]*?<\/script>/, '')
    .replace('</head>', `    <script id="cssv-route-structured-data" type="application/ld+json">${jsonLd(entry, canonical)}</script>\n  </head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body)/, `<div id="root">${body}</div>\n    `)
    .replaceAll('__SITE_ORIGIN__', siteOrigin)
  if (!next.includes('<div id="root"><')) {
    throw new Error(`Could not inject rendered content for ${entry.path}`)
  }
  return next
}

const template = await readFile(join(clientDir, 'seo', 'routes', 'protected.html'), 'utf8')
const outputDir = join(clientDir, 'seo', 'islamic-studies')
await mkdir(outputDir, { recursive: true })

const EMPTY_CONTENT_WORDS = 60
const thin = []
let words = 0

for (const entry of pages) {
  const result = renderRoute(entry.path)
  if (result.error || !result.html) {
    throw new Error(`Could not server-render ${entry.path}: ${result.error || 'no markup'}`)
  }
  const text = primaryContentText(result.html)
  const count = text.split(/\s+/).filter(Boolean).length
  words += count

  const policy = getRoutePolicy(entry.path)
  // Fail closed, exactly as the main prerender gate does: a page that renders
  // no real content is served but never indexed, and never padded.
  const indexable = policy.indexable && count >= EMPTY_CONTENT_WORDS && !isPlaceholderContent(text)
  if (policy.indexable && !indexable) thin.push(`${entry.path} (${count} words)`)

  const canonical = `${siteOrigin}${entry.path}`
  const html = renderShell(template, entry, result.html, canonical,
    indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow')
  const target = join(outputDir, entry.file)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, html)
  entry.indexable = indexable
}

if (thin.length) {
  throw new Error(
    'These Islamic-reference pages are marked indexable but render no real '
    + `primary content:\n  ${thin.join('\n  ')}`)
}

// Direct URL navigation and refresh must resolve on Hostinger, not just
// in-app navigation, so both depths get an explicit rewrite.
const htaccessPath = join(clientDir, '.htaccess')
const htaccess = await readFile(htaccessPath, 'utf8')
const marker = '  # Keep real files and directories intact.'
if (!htaccess.includes(marker)) {
  throw new Error('Could not find the Hostinger route marker for Islamic references.')
}
await writeFile(htaccessPath, htaccess.replace(marker,
  '  # Serve the Islamic Studies reference banks at stable, crawlable URLs.\n'
  + '  RewriteRule ^study-material/islamic-studies/([A-Za-z0-9-]+)/([A-Za-z0-9-]+)/?$ seo/islamic-studies/$1--$2.html [L,NC]\n'
  + '  RewriteRule ^study-material/islamic-studies/([A-Za-z0-9-]+)/?$ seo/islamic-studies/$1.html [L,NC]\n\n'
  + marker))

const sitemapPath = join(clientDir, 'sitemap.xml')
let sitemap = await readFile(sitemapPath, 'utf8')
const additions = pages
  .filter((entry) => entry.indexable)
  .map((entry) => `${siteOrigin}${entry.path}`)
  .filter((url) => !sitemap.includes(`<loc>${url}</loc>`))
  .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
  .join('\n')
if (additions) sitemap = sitemap.replace('</urlset>', `${additions}\n</urlset>`)
await writeFile(sitemapPath, sitemap)

const indexed = pages.filter((entry) => entry.indexable).length
console.log(
  `Generated ${pages.length} crawlable Islamic Studies reference pages from the real components `
  + `(${index.chapters.length} chapters, ${pages.length - index.chapters.length} topics, `
  + `${index.referenceTotal} references, median ${Math.round(words / pages.length)} words each); ${indexed} indexable.`)
