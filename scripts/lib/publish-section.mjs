/**
 * Publish a data-driven section as crawlable, directly navigable pages.
 *
 * The HTML is always the REAL React component, server-rendered by the shared
 * prerender bundle (scripts/prerender/). This helper never authors page copy:
 * it only routes that output — writing each rendered page to a served file,
 * adding the Hostinger rewrite rules so a direct URL and a refresh resolve,
 * and listing the indexable ones in the sitemap.
 *
 * It fails closed the same way the main prerender gate does: a page that
 * renders no real primary content is still served, but is never indexed and
 * is never padded to reach a threshold.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { primaryContentText, isPlaceholderContent } from './content-quality.mjs'
import { getRoutePolicy } from '../../src/data/routeRegistry.mjs'

/** Below this, a page is an empty shell rather than a short page. */
const EMPTY_CONTENT_WORDS = 60

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function structuredData(entry, canonical, siteOrigin) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: entry.title.split(' | ')[0],
        description: entry.description,
        url: canonical,
        mainEntityOfPage: canonical,
        inLanguage: entry.inLanguage ?? 'en',
        isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: 'CSS Vista', url: `${siteOrigin}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}/` },
          ...entry.breadcrumb.map((crumb, index) => ({
            '@type': 'ListItem', position: index + 2, name: crumb.name, item: crumb.item,
          })),
        ],
      },
    ],
  }).replaceAll('<', '\\u003c')
}

function applyShell(template, entry, body, canonical, robots, siteOrigin) {
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
    .replace('</head>', `    <script id="cssv-route-structured-data" type="application/ld+json">${structuredData(entry, canonical, siteOrigin)}</script>\n  </head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body)/, `<div id="root">${body}</div>\n    `)
    .replaceAll('__SITE_ORIGIN__', siteOrigin)
  if (!next.includes('<div id="root"><')) {
    throw new Error(`Could not inject rendered content for ${entry.path}`)
  }
  return next
}

/**
 * @param {object} options
 * @param {string} options.label          human name, for the build log
 * @param {string} options.outputDir      directory under the client root
 * @param {Array}  options.pages          {path, file, title, description, breadcrumb}
 * @param {string[]} options.rewriteRules Apache rules, deepest pattern first
 * @param {Function} options.renderRoute  from the prerender bundle
 */
export async function publishSection({
  label, clientDir, siteOrigin, outputDir, pages, rewriteRules, renderRoute,
}) {
  for (const entry of pages) {
    const segments = entry.path.split('/').filter(Boolean)
    if (!segments.every((segment) => /^[a-z0-9-]+$/.test(segment))) {
      throw new Error(`Unsafe URL segment in ${entry.path}`)
    }
  }

  const template = await readFile(join(clientDir, 'seo', 'routes', 'protected.html'), 'utf8')
  const target = join(clientDir, outputDir)
  await mkdir(target, { recursive: true })

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
    const indexable = policy.indexable && count >= EMPTY_CONTENT_WORDS && !isPlaceholderContent(text)
    if (policy.indexable && !indexable) thin.push(`${entry.path} (${count} words)`)

    const canonical = `${siteOrigin}${entry.path}`
    await writeFile(join(target, entry.file), applyShell(
      template, entry, result.html, canonical,
      indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow', siteOrigin))
    entry.indexable = indexable
  }

  // A single page with little to say is served and left out of search - the
  // standing rule is real content or noindex, never padding. Widespread
  // thinness is different: that means the import broke, so it fails the build.
  const thinShare = pages.length ? thin.length / pages.length : 0
  if (thin.length && thinShare > 0.05) {
    throw new Error(
      `${thin.length} of ${pages.length} ${label} pages render no real primary content, `
      + `which means the import is broken rather than a page being short:\n  ${thin.join('\n  ')}`)
  }
  for (const entry of thin) {
    console.warn(`CONTENT NOTICE: ${entry} is served but left out of search - too little page-specific content.`)
  }

  const htaccessPath = join(clientDir, '.htaccess')
  const htaccess = await readFile(htaccessPath, 'utf8')
  const marker = '  # Keep real files and directories intact.'
  if (!htaccess.includes(marker)) {
    throw new Error(`Could not find the Hostinger route marker while publishing ${label}.`)
  }
  await writeFile(htaccessPath, htaccess.replace(
    marker, `${rewriteRules.join('\n')}\n\n${marker}`))

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

  return { total: pages.length, indexable: pages.filter((entry) => entry.indexable).length, words }
}
