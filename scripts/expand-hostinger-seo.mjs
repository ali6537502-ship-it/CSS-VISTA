import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteUrl = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com')
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error(`SITE_ORIGIN must be an HTTPS origin without a path: ${siteUrl.href}`)
}
const siteOrigin = siteUrl.origin
const publicDir = join(root, 'public')

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

function categoryDescription(category) {
  return `Practice ${Number(category.count).toLocaleString('en-US')} ${category.name} MCQs for competitive-examination preparation, with four-option questions, answer review and topic filters.`
}

function replaceCategoryMeta(html, category, canonical) {
  const title = `${category.name} MCQs - ${Number(category.count).toLocaleString('en-US')} Questions | CSS Vista`
  const description = categoryDescription(category)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} MCQs`,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'CSS Vista', url: `${siteOrigin}/` },
    about: { '@type': 'Thing', name: category.name },
  }

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

function categoryBody(category, sampleQuestions, categories) {
  const sample = sampleQuestions.slice(0, 12).map((question, index) => {
    const options = Array.isArray(question.o)
      ? question.o.map((option) => `<li>${escapeHtml(option)}</li>`).join('')
      : ''
    return `<li><h3 class="font-semibold text-pine">${index + 1}. ${escapeHtml(question.q)}</h3><ol class="mt-2 list-[upper-alpha] space-y-1 pl-6 text-sm text-slate-700">${options}</ol></li>`
  }).join('')
  const categoryLinks = categories
    .filter((candidate) => candidate.slug !== category.slug)
    .map((candidate) => `<li><a href="/gk/cat/${escapeHtml(candidate.slug)}">${escapeHtml(candidate.name)} MCQs</a></li>`)
    .join('')

  return `<main class="mx-auto max-w-5xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">GK World · ${Number(category.count).toLocaleString('en-US')} questions</p><h1 class="mt-2 font-display text-4xl font-bold text-pine">${escapeHtml(category.name)} MCQs</h1><p class="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">${escapeHtml(categoryDescription(category))}</p><div class="mt-6 flex flex-wrap gap-3"><a href="/gk/cat/${escapeHtml(category.slug)}" class="rounded-lg bg-pine px-4 py-3 text-sm font-bold text-white">Open complete question bank</a><a href="/gk" class="rounded-lg border px-4 py-3 text-sm font-bold text-pine">Browse GK World</a></div>${sample ? `<section class="mt-10"><h2 class="font-display text-2xl font-bold text-pine">Sample ${escapeHtml(category.name)} questions</h2><p class="mt-2 text-sm text-muted-foreground">A sample from the full interactive bank. Open the complete bank to attempt questions and review answers.</p><ol class="mt-5 space-y-5 rounded-xl border bg-white p-5">${sample}</ol></section>` : ''}<nav class="mt-10 rounded-xl border bg-white p-5" aria-label="Other GK categories"><h2 class="font-display text-xl font-bold text-pine">Explore other GK categories</h2><ul class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">${categoryLinks}</ul></nav></main>`
}

const indexData = JSON.parse(await readFile(join(publicDir, 'mcq', 'index.json'), 'utf8'))
const categories = Array.isArray(indexData.categories) ? indexData.categories : []
if (!categories.length) throw new Error('GK category index is empty; refusing to generate search pages.')

const templatePath = join(clientDir, 'seo', 'routes', 'protected.html')
const template = await readFile(templatePath, 'utf8')
const outputDir = join(clientDir, 'seo', 'gk-categories')
await mkdir(outputDir, { recursive: true })

for (const category of categories) {
  const canonical = `${siteOrigin}/gk/cat/${category.slug}`
  let sampleQuestions = []
  try {
    sampleQuestions = JSON.parse(await readFile(join(publicDir, 'mcq', `cat-${category.slug}-0.json`), 'utf8'))
  } catch {
    sampleQuestions = []
  }
  const body = categoryBody(category, sampleQuestions, categories)
  const withMeta = replaceCategoryMeta(template, category, canonical)
  const html = withMeta.replace(/<div id="root">[\s\S]*?<\/main><\/div>/, `<div id="root">${body}</div>`)
  if (html === withMeta) throw new Error(`Could not replace prerender body for GK category ${category.slug}`)
  await writeFile(join(outputDir, `${category.slug}.html`), html)
}

const htaccessPath = join(clientDir, '.htaccess')
const htaccess = await readFile(htaccessPath, 'utf8')
const protectedRule = '  RewriteRule ^(?:notes/view/[^/]+/[^/]+|mpt/bank/[^/]+|gk/cat/[^/]+)/?$ seo/routes/protected.html [L,NC]'
if (!htaccess.includes(protectedRule)) throw new Error('Expected protected-route rewrite rule was not found.')
await writeFile(htaccessPath, htaccess.replace(
  protectedRule,
  `  RewriteRule ^gk/cat/([A-Za-z0-9-]+)/?$ seo/gk-categories/$1.html [L,NC]\n  RewriteRule ^(?:notes/view/[^/]+/[^/]+|mpt/bank/[^/]+)/?$ seo/routes/protected.html [L,NC]`,
))

const sitemapPath = join(clientDir, 'sitemap.xml')
let sitemap = await readFile(sitemapPath, 'utf8')
const categoryEntries = categories
  .map((category) => `${siteOrigin}/gk/cat/${category.slug}`)
  .filter((url) => !sitemap.includes(`<loc>${url}</loc>`))
  .map((url) => `  <url><loc>${escapeHtml(url)}</loc><lastmod>${escapeHtml(indexData.generatedAt || '')}</lastmod></url>`)
  .join('\n')
if (categoryEntries) sitemap = sitemap.replace('</urlset>', `${categoryEntries}\n</urlset>`)
await writeFile(sitemapPath, sitemap)
