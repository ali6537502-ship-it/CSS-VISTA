import { readFile, readdir, writeFile } from 'node:fs/promises'
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
const homeCanonical = `${siteOrigin}/`
const homeTitle = 'CSS Vista | CSS & PMS Exam Preparation in Pakistan'
const homeDescription = 'CSS Vista is an independent CSS and PMS exam preparation platform in Pakistan with MCQs, past papers, notes, current affairs, syllabus guidance and study tools.'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function reinforceHomepage(html) {
  let next = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(homeTitle)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(homeDescription)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(homeTitle)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(homeDescription)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${homeCanonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(homeTitle)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(homeDescription)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${homeCanonical}" />`)
    .replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/, '$1CSS Vista$2')

  if (!next.includes('name="application-name"')) {
    next = next.replace('<meta name="theme-color"', '<meta name="application-name" content="CSS Vista" />\n    <meta name="theme-color"')
  }
  if (!next.includes('rel="home"')) {
    next = next.replace('<link rel="canonical"', `<link rel="home" href="${homeCanonical}" title="CSS Vista" />\n    <link rel="canonical"`)
  }
  return next
}

async function walkHtml(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walkHtml(path))
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path)
  }
  return files
}

function reinforceInternalPage(html) {
  if (!/<meta name="robots" content="index, follow(?:,[^"]*)?" \/>/.test(html)) return html
  if (html.includes(`rel="canonical" href="${homeCanonical}"`)) return html
  if (html.includes('data-cssv-brand-home-link')) return html
  const brandLink = `<nav data-cssv-brand-home-link aria-label="CSS Vista"><a href="/" rel="home" class="text-xs font-bold uppercase tracking-wide text-emerald-700 underline underline-offset-2">CSS Vista</a></nav>`
  return html.replace(/<main\b[^>]*>/, (match) => `${match}${brandLink}`)
}

const homePath = join(clientDir, 'index.html')
const originalHome = await readFile(homePath, 'utf8')
const reinforcedHome = reinforceHomepage(originalHome)
if (!reinforcedHome.includes('<h1') || !reinforcedHome.includes('>CSS Vista</h1>')) {
  throw new Error('Could not enforce the exact CSS Vista homepage H1.')
}
if (!reinforcedHome.includes(`rel="canonical" href="${homeCanonical}"`)) {
  throw new Error('Homepage canonical was not preserved.')
}
await writeFile(homePath, reinforcedHome)

const seoDir = join(clientDir, 'seo')
let linkedPages = 0
for (const path of await walkHtml(seoDir)) {
  const html = await readFile(path, 'utf8')
  const next = reinforceInternalPage(html)
  if (next !== html) {
    await writeFile(path, next)
    linkedPages += 1
  }
}

console.log(`Reinforced CSS Vista brand homepage and added a visible home-brand link to ${linkedPages} indexable SEO pages.`)
