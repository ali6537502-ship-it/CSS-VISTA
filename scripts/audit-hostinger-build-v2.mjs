import { access, open, readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'
import { INDEXABLE_STATIC_ROUTES, ROUTE_REGISTRY } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const siteOrigin = 'https://www.css-vista.com'
const childSitemaps = [
  'sitemap-core.xml',
  'sitemap-gk.xml',
  'sitemap-past-paper-collections.xml',
  'sitemap-past-papers.xml',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
}

const registeredPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const bookLibrary = JSON.parse(await readFile(join(root, 'public', 'book-summaries', 'index.json'), 'utf8'))
const registeredBooks = Array.isArray(bookLibrary.books) ? bookLibrary.books : []

await Promise.all([
  access(join(dist, 'index.html')),
  access(join(dist, '.htaccess')),
  access(join(dist, 'robots.txt')),
  access(join(dist, 'sitemap.xml')),
  ...childSitemaps.map((name) => access(join(dist, name))),
  access(join(dist, 'favicon.ico')),
  access(join(dist, 'favicon.png')),
  access(join(dist, 'icon-512.png')),
  access(join(dist, 'images', 'logo.webp')),
  access(join(dist, 'fonts', 'inter-latin-variable.woff2')),
  access(join(dist, 'fonts', 'noto-nastaliq-urdu-arabic-variable.woff2')),
  access(join(dist, 'fonts', 'INTER-OFL.txt')),
  access(join(dist, 'fonts', 'NOTO-NASTALIQ-URDU-OFL.txt')),
  access(join(dist, 'ads.txt')),
  access(join(dist, 'googlec96e2248070e0570.html')),
  access(join(dist, 'seo', 'routes', 'notes.html')),
  access(join(dist, 'seo', 'past-papers')),
  access(join(dist, 'seo', 'book-summaries')),
  access(join(dist, '404.html')),
])

const [indexHtml, htaccess, robots, sitemapIndex, adsTxt, verificationFile, notesHtml, paperFiles, bookFiles, ...childXmls] = await Promise.all([
  readFile(join(dist, 'index.html'), 'utf8'),
  readFile(join(dist, '.htaccess'), 'utf8'),
  readFile(join(dist, 'robots.txt'), 'utf8'),
  readFile(join(dist, 'sitemap.xml'), 'utf8'),
  readFile(join(dist, 'ads.txt'), 'utf8'),
  readFile(join(dist, 'googlec96e2248070e0570.html'), 'utf8'),
  readFile(join(dist, 'seo', 'routes', 'notes.html'), 'utf8'),
  readdir(join(dist, 'seo', 'past-papers')),
  readdir(join(dist, 'seo', 'book-summaries')),
  ...childSitemaps.map((name) => readFile(join(dist, name), 'utf8')),
])

assert(sitemapIndex.includes('<sitemapindex '), 'Root sitemap must be a sitemap index')
assert(!sitemapIndex.includes('<urlset '), 'Root sitemap must not remain a flat URL sitemap after splitting')
for (const name of childSitemaps) {
  assert(sitemapIndex.includes(`<loc>${siteOrigin}/${name}</loc>`), `Root sitemap index is missing ${name}`)
}

const [coreLocs, gkLocs, collectionLocs, paperLocs] = childXmls.map(extractLocs)
const allLocs = [...coreLocs, ...gkLocs, ...collectionLocs, ...paperLocs]
const uniqueLocs = new Set(allLocs)
const collectionCount = new Set(registeredPapers.map((paper) => `${paper.examination.toLowerCase()}/${paper.year}`)).size

const expectedCoreCount = INDEXABLE_STATIC_ROUTES.length + registeredBooks.length
assert(coreLocs.length === expectedCoreCount, `Expected ${expectedCoreCount} core sitemap URLs, found ${coreLocs.length}`)
for (const route of INDEXABLE_STATIC_ROUTES) {
  assert(coreLocs.includes(`${siteOrigin}${route.path}`), `Core sitemap is missing ${route.path}`)
}
for (const book of registeredBooks) {
  assert(coreLocs.includes(`${siteOrigin}/book-summaries/${book.slug}`), `Core sitemap is missing book summary ${book.slug}`)
}
assert(gkLocs.length > 0, 'GK sitemap must contain at least one category URL')
assert(gkLocs.every((url) => /^https:\/\/www\.css-vista\.com\/gk\/cat\/[^/?#]+\/?$/.test(url)), 'GK sitemap contains a non-category URL')
let noindexCollectionPaths = []
try {
  noindexCollectionPaths = JSON.parse(await readFile(join(dist, 'seo', 'noindex-past-paper-collections.json'), 'utf8')).paths || []
} catch {
  noindexCollectionPaths = []
}
const expectedCollectionCount = collectionCount - noindexCollectionPaths.length
assert(collectionLocs.length === expectedCollectionCount, `Expected ${expectedCollectionCount} collection sitemap URLs (${collectionCount} years less ${noindexCollectionPaths.length} withheld as noindex), found ${collectionLocs.length}`)
for (const path of noindexCollectionPaths) {
  assert(!collectionLocs.includes(`${siteOrigin}${path}`), `Noindex collection page leaked into the sitemap: ${path}`)
}
assert(collectionLocs.every((url) => /^https:\/\/www\.css-vista\.com\/past-papers\/(?:css|pms|ppsc|mpt)\/\d{4}\/?$/.test(url)), 'Collection sitemap contains an invalid URL')
/* Paper pages with no content beyond a link to the stored document are
   published as noindex and deliberately withheld from the sitemap, so the
   expected count is the registry minus that recorded set — and the two must
   agree exactly, in both directions. */
let noindexPaperIds = []
try {
  noindexPaperIds = JSON.parse(await readFile(join(dist, 'seo', 'noindex-past-papers.json'), 'utf8')).ids || []
} catch {
  noindexPaperIds = []
}
const expectedPaperCount = registeredPapers.length - noindexPaperIds.length
assert(paperLocs.length === expectedPaperCount, `Expected ${expectedPaperCount} past-paper sitemap URLs (${registeredPapers.length} registered less ${noindexPaperIds.length} withheld as noindex), found ${paperLocs.length}`)
for (const id of noindexPaperIds) {
  assert(!paperLocs.includes(`${siteOrigin}/past-papers/view/${id}`), `Noindex past-paper page leaked into the sitemap: ${id}`)
  const noindexHtml = await readFile(join(dist, 'seo', 'past-papers', `${id}.html`), 'utf8')
  assert(/<meta name="robots" content="noindex[^"]*" \/>/.test(noindexHtml), `Withheld past-paper page is not marked noindex: ${id}`)
}
assert(paperLocs.every((url) => /^https:\/\/www\.css-vista\.com\/past-papers\/view\/[A-Za-z0-9-]+\/?$/.test(url)), 'Past-paper sitemap contains an invalid URL')

assert(uniqueLocs.size === allLocs.length, 'Child sitemaps contain duplicate URLs')
assert(allLocs.every((url) => url === `${siteOrigin}/` || url.startsWith(`${siteOrigin}/`)), 'A sitemap URL uses a non-canonical host')
assert(allLocs.includes(`${siteOrigin}/`), 'Homepage is missing from child sitemaps')
assert(allLocs.includes(`${siteOrigin}/past-papers`), 'Past-paper landing page is missing from child sitemaps')
assert(allLocs.includes(`${siteOrigin}/subjects/compulsory`), 'Compulsory subjects are missing from child sitemaps')
assert(allLocs.includes(`${siteOrigin}/notes`), 'Notes page is missing from child sitemaps')

for (const route of ROUTE_REGISTRY.filter((entry) => !entry.indexable && entry.match === 'exact')) {
  assert(!uniqueLocs.has(`${siteOrigin}${route.path}`), `Protected route leaked into sitemap: ${route.path}`)
}

assert(indexHtml.includes('<title>CSS Vista | Free CSS, PMS &amp; One-Paper Preparation Platform</title>') || indexHtml.includes('<title>CSS Vista | Free CSS, PMS & One-Paper Preparation Platform</title>'), 'Homepage search title is incorrect')
assert(indexHtml.includes('name="application-name" content="CSS Vista"'), 'Homepage application-name brand signal is missing')
assert(indexHtml.includes(`rel="canonical" href="${siteOrigin}/"`), 'Homepage canonical is missing or incorrect')
assert(indexHtml.includes(`rel="home" href="${siteOrigin}/" title="CSS Vista"`), 'Homepage rel=home signal is missing')
assert(/<h1\b[^>]*>CSS Vista<\/h1>/.test(indexHtml), 'Homepage H1 must identify the brand as CSS Vista')
assert(indexHtml.includes('CSS Vista is a free CSS, PMS and one-paper competitive exam preparation platform in Pakistan'), 'Homepage meta description is not the reinforced production description')
assert(indexHtml.includes('rel="preload" as="image"') && indexHtml.includes('css-vista-main-poster-480.webp'), 'Homepage LCP poster is not preloaded responsively')
assert(indexHtml.includes('EducationalOrganization'), 'Homepage organization structured data is missing')
assert(indexHtml.includes('WebSite'), 'Homepage WebSite structured data is missing')
assert(indexHtml.includes('https://www.instagram.com/cssvista/'), 'Homepage structured data is missing the official Instagram profile')
assert(indexHtml.includes('https://www.youtube.com/@cssvista'), 'Homepage structured data is missing the official YouTube profile')
assert(indexHtml.includes('id="cssv-site-structured-data"'), 'Homepage site structured data needs a stable identifier')
assert(!indexHtml.includes('id="cssv-route-structured-data"'), 'Homepage must not duplicate its WebSite structured data as route structured data')
assert(indexHtml.includes('href="/fonts/inter-latin-variable.woff2"'), 'Homepage does not preload the self-hosted primary font')
assert(!indexHtml.includes('fonts.googleapis.com'), 'Homepage still depends on render-blocking Google Fonts CSS')
assert(!indexHtml.includes('__SITE_ORIGIN__'), 'Homepage still contains an unresolved origin placeholder')
assert(indexHtml.includes('<meta name="google-adsense-account" content="ca-pub-6131271603014611"'), 'Homepage AdSense ownership meta tag is missing')
assert(adsTxt.trim() === 'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0', 'ads.txt publisher record is missing or altered')
assert(!adsTxt.startsWith('\uFEFF'), 'ads.txt contains a byte-order mark')
assert(verificationFile.trim() === 'google-site-verification: googlec96e2248070e0570.html', 'Search Console verification file is missing or altered')

// The crawler-visible landing copy must remain in the production HTML, but the
// first viewport should resemble the interactive homepage rather than exposing
// the separate SEO article while React is starting.
assert(indexHtml.includes('data-cssv-home-first-paint'), 'Homepage first-paint shell is missing')
assert(indexHtml.includes('id="cssv-home-first-paint-critical"'), 'Homepage first-paint critical styling is missing')
assert(!indexHtml.includes('Preparing your study page'), 'Legacy visible prerender loading message leaked into the homepage')
assert(indexHtml.includes('What you can do here'), 'Crawler-visible homepage preparation content was removed')
assert(indexHtml.indexOf('data-cssv-home-first-paint') < indexHtml.indexOf('What you can do here'), 'Homepage first-paint shell must precede crawler-visible landing content')
assert(indexHtml.includes('href="/legal"'), 'Homepage initial HTML does not expose the Legal & Trust Centre')
assert(indexHtml.includes('href="/privacy-policy"'), 'Homepage initial HTML does not expose the Privacy Policy')

assert(notesHtml.includes('data-cssv-brand-home-link'), 'Indexable internal pages are missing a visible CSS Vista home-brand link')
assert(notesHtml.includes('href="/" rel="home"'), 'Internal brand link does not point to the homepage')
assert(!notesHtml.includes('__SITE_ORIGIN__'), 'Internal SEO page still contains an unresolved origin placeholder')

assert(htaccess.includes('https://www.css-vista.com%{REQUEST_URI} [R=301'), 'Canonical www/HTTPS redirect is missing')
assert(htaccess.includes('RewriteRule ^ - [R=404,L]'), 'Unknown clean routes must return a real HTTP 404')
assert(htaccess.includes('sitemap(?:-[A-Za-z0-9-]+)?'), 'Crawler-file rules do not explicitly protect sitemap index and child sitemaps')
assert(robots.includes(`${siteOrigin}/sitemap.xml`), 'robots.txt does not advertise the canonical sitemap index')

assert(paperFiles.filter((name) => name.endsWith('.html')).length === registeredPapers.length, `Expected ${registeredPapers.length} direct past-paper SEO pages`)
assert(bookFiles.filter((name) => name.endsWith('.html')).length === registeredBooks.length, `Expected ${registeredBooks.length} direct book-summary SEO pages`)
assert(registeredPapers.length > 0, 'Past-paper registry must not be empty')
assert(registeredBooks.length > 0, 'Book-summary registry must not be empty')

const optimizedLogo = await stat(join(dist, 'images', 'logo.webp'))
assert(optimizedLogo.size < 50_000, `Optimized header logo is unexpectedly large: ${optimizedLogo.size} bytes`)

const samplePdf = join(dist, registeredPapers[0].fileUrl.replace(/^\/+/, ''))
const handle = await open(samplePdf, 'r')
try {
  const signature = Buffer.alloc(5)
  const { bytesRead } = await handle.read(signature, 0, signature.length, 0)
  assert(bytesRead === 5 && signature.toString('ascii') === '%PDF-', 'Sample registered past-paper asset is not a valid PDF')
} finally {
  await handle.close()
}

console.log(`Hostinger SEO artifact audit passed: core=${coreLocs.length} (${registeredBooks.length} books), gk=${gkLocs.length}, collections=${collectionLocs.length}, papers=${paperLocs.length}; reinforced CSS Vista homepage signals and canonical routing verified.`)
