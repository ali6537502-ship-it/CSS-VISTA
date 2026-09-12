import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteOrigin = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com').origin
const library = JSON.parse(await readFile(join(root, 'public', 'book-summaries', 'index.json'), 'utf8'))
const books = Array.isArray(library.books) ? library.books : []

if (!books.length) throw new Error('Book-summary library is empty; refusing to generate SEO pages.')
if (new Set(books.map((book) => book.slug)).size !== books.length) throw new Error('Book-summary slugs must be unique.')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function plainText(value) {
  return String(value)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[*+-]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function descriptionFor(book) {
  const value = `${book.title} by ${book.author}: ${plainText(book.excerpt)}`
  return value.length <= 158 ? value : `${value.slice(0, 155).trimEnd()}…`
}

function summaryHtml(body) {
  return String(body).split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    if (!lines.length) return ''
    if (lines[0].startsWith('### ')) {
      return `<h2 class="mt-8 font-display text-2xl font-bold text-pine">${escapeHtml(plainText(lines.join(' ').slice(4)))}</h2>`
    }
    if (lines.every((line) => /^[*+-]\s+/.test(line))) {
      return `<ul class="mt-5 space-y-3">${lines.map((line) => `<li>${escapeHtml(plainText(line))}</li>`).join('')}</ul>`
    }
    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return `<ol class="mt-5 list-decimal space-y-3 pl-6">${lines.map((line) => `<li>${escapeHtml(plainText(line.replace(/^\d+\.\s+/, '')))}</li>`).join('')}</ol>`
    }
    return `<p class="mt-5 leading-8 text-slate-700">${escapeHtml(plainText(lines.join(' ')))}</p>`
  }).join('')
}

function pageBody(book) {
  const related = books
    .filter((candidate) => candidate.category === book.category && candidate.slug !== book.slug)
    .slice(0, 6)
    .map((candidate) => `<li><a href="/book-summaries/${escapeHtml(candidate.slug)}">${escapeHtml(candidate.title)} by ${escapeHtml(candidate.author)}</a></li>`)
    .join('')
  return `<main class="mx-auto max-w-4xl px-4 py-12"><nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/book-summaries">Book Summaries</a></nav><article class="mt-6"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">CSS Vista book summary</p><h1 class="mt-2 font-display text-4xl font-bold text-pine">${escapeHtml(book.title)} Summary</h1><p class="mt-2 text-base text-slate-600">by ${escapeHtml(book.author)}</p><div class="mt-6 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-5"><p class="leading-7">${escapeHtml(plainText(book.excerpt))}</p></div><section class="mt-8" aria-label="Complete book summary">${summaryHtml(book.body)}</section></article>${related ? `<nav class="mt-10 rounded-xl border bg-white p-5" aria-label="Related book summaries"><h2 class="font-display text-2xl font-bold text-pine">Related book summaries</h2><ul class="mt-4 grid gap-3 sm:grid-cols-2">${related}</ul></nav>` : ''}<p class="mt-8"><a href="/book-summaries" class="font-bold text-emerald-800 underline">Browse all 100 book summaries</a></p></main>`
}

function jsonLd(book, canonical, description) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: `${book.title} summary`,
        description,
        url: canonical,
        mainEntityOfPage: canonical,
        inLanguage: 'en',
        about: { '@type': 'Book', name: book.title, author: { '@type': 'Person', name: book.author } },
        publisher: { '@type': 'Organization', name: 'CSS Vista', url: `${siteOrigin}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}/` },
          { '@type': 'ListItem', position: 2, name: 'Book Summaries', item: `${siteOrigin}/book-summaries` },
          { '@type': 'ListItem', position: 3, name: book.title, item: canonical },
        ],
      },
    ],
  }).replaceAll('<', '\\u003c')
}

function renderPage(template, book) {
  const canonical = `${siteOrigin}/book-summaries/${book.slug}`
  const title = `${book.title} by ${book.author} — Book Summary | CSS Vista`
  const description = descriptionFor(book)
  const body = pageBody(book)
  const next = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="index, follow, max-image-preview:large" />')
    .replace(/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />')
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${siteOrigin}${escapeHtml(book.cover)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${siteOrigin}${escapeHtml(book.cover)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/\s*<script id="cssv-route-structured-data"[^>]*>[\s\S]*?<\/script>/, '')
    .replace('</head>', `    <script id="cssv-route-structured-data" type="application/ld+json">${jsonLd(book, canonical, description)}</script>\n  </head>`)
    .replace(/<div id="root">[\s\S]*?<\/main><\/div>/, `<div id="root">${body}</div>`)
    .replaceAll('__SITE_ORIGIN__', siteOrigin)
  if (!next.includes(`<h1 class="mt-2 font-display text-4xl font-bold text-pine">${escapeHtml(book.title)} Summary</h1>`)) {
    throw new Error(`Could not generate book-summary page: ${book.slug}`)
  }
  return next
}

const template = await readFile(join(clientDir, 'seo', 'routes', 'protected.html'), 'utf8')
const outputDir = join(clientDir, 'seo', 'book-summaries')
await mkdir(outputDir, { recursive: true })
for (const book of books) {
  if (!/^[a-z0-9-]+$/.test(book.slug)) throw new Error(`Unsafe book-summary slug: ${book.slug}`)
  await writeFile(join(outputDir, `${book.slug}.html`), renderPage(template, book))
}

const htaccessPath = join(clientDir, '.htaccess')
const htaccess = await readFile(htaccessPath, 'utf8')
const marker = '  # Keep real files and directories intact.'
if (!htaccess.includes(marker)) throw new Error('Could not find the Hostinger route marker for book summaries.')
await writeFile(htaccessPath, htaccess.replace(marker, `  # Serve complete book summaries at stable, crawlable URLs.\n  RewriteRule ^book-summaries/([A-Za-z0-9-]+)/?$ seo/book-summaries/$1.html [L,NC]\n\n${marker}`))

const sitemapPath = join(clientDir, 'sitemap.xml')
let sitemap = await readFile(sitemapPath, 'utf8')
const entries = books
  .map((book) => `${siteOrigin}/book-summaries/${book.slug}`)
  .filter((url) => !sitemap.includes(`<loc>${url}</loc>`))
  .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
  .join('\n')
if (entries) sitemap = sitemap.replace('</urlset>', `${entries}\n</urlset>`)
await writeFile(sitemapPath, sitemap)

console.log(`Generated ${books.length} crawlable book-summary pages with stable canonicals and Article metadata.`)
