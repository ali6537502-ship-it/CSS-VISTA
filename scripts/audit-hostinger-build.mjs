import { access, open, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'
import { INDEXABLE_STATIC_ROUTES, ROUTE_REGISTRY } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const registeredPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const cssPapers = registeredPapers.filter((paper) => paper.examination === 'CSS')
const pmsPapers = registeredPapers.filter((paper) => paper.examination === 'PMS')
const ppscPapers = registeredPapers.filter((paper) => paper.examination === 'PPSC')
const mptPapers = registeredPapers.filter((paper) => paper.examination === 'MPT')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

await Promise.all([
  access(join(dist, 'index.html')),
  access(join(dist, '.htaccess')),
  access(join(dist, 'assets')),
  access(join(dist, 'robots.txt')),
  access(join(dist, 'sitemap.xml')),
  access(join(dist, 'favicon.ico')),
  access(join(dist, 'favicon.png')),
  access(join(dist, 'icon-512.png')),
  access(join(dist, 'ads.txt')),
  access(join(dist, 'googlec96e2248070e0570.html')),
  access(join(dist, 'sw.js')),
  access(join(dist, 'stale-module.js')),
  access(join(dist, 'results', 'css-2026-written-qualified-candidates.pdf')),
  access(join(dist, 'seo', 'css-2026-written-result.html')),
  access(join(dist, 'seo', 'routes', 'current-affairs.html')),
  access(join(dist, 'seo', 'routes', 'consultation.html')),
  access(join(dist, 'seo', 'routes', 'fpsc-syllabus.html')),
  access(join(dist, '404.html')),
])

const [indexHtml, htaccess, robots, sitemap, faviconIco, adsTxt, searchConsoleVerification, serviceWorker, staleModule, paperFiles, assetFiles, productionEnv, css2026ResultHtml, css2026ResultPdf] = await Promise.all([
  readFile(join(dist, 'index.html'), 'utf8'),
  readFile(join(dist, '.htaccess'), 'utf8'),
  readFile(join(dist, 'robots.txt'), 'utf8'),
  readFile(join(dist, 'sitemap.xml'), 'utf8'),
  readFile(join(dist, 'favicon.ico')),
  readFile(join(dist, 'ads.txt'), 'utf8'),
  readFile(join(dist, 'googlec96e2248070e0570.html'), 'utf8'),
  readFile(join(dist, 'sw.js'), 'utf8'),
  readFile(join(dist, 'stale-module.js'), 'utf8'),
  readdir(join(dist, 'seo', 'past-papers')),
  readdir(join(dist, 'assets')),
  readFile(join(root, '.env.production'), 'utf8'),
  readFile(join(dist, 'seo', 'css-2026-written-result.html'), 'utf8'),
  readFile(join(dist, 'results', 'css-2026-written-qualified-candidates.pdf')),
])

const productionValue = (name) => productionEnv.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1].trim()
const supabaseUrl = productionValue('VITE_SUPABASE_URL')
const supabasePublishableKey = productionValue('VITE_SUPABASE_PUBLISHABLE_KEY')
const javascriptBundles = await Promise.all(assetFiles
  .filter((name) => name.endsWith('.js'))
  .map((name) => readFile(join(dist, 'assets', name), 'utf8')))

let nestedClientExists = true
try {
  await access(join(dist, 'client'))
} catch {
  nestedClientExists = false
}

const samplePaperHtml = await readFile(join(dist, 'seo', 'past-papers', 'css-2023-current-affairs.html'), 'utf8')

assert(!indexHtml.includes('__SITE_ORIGIN__'), 'Hostinger index still contains the Sites runtime origin placeholder')
assert(!nestedClientExists, 'Hostinger build must not nest the site under dist/client')
assert(indexHtml.includes('https://www.css-vista.com/'), 'Hostinger index is missing the custom-domain metadata')
assert(indexHtml.includes('<link rel="icon" href="/favicon.ico" sizes="any"'), 'ICO favicon metadata is missing')
assert(indexHtml.includes('<link rel="icon" type="image/png" sizes="96x96" href="/favicon.png"'), 'PNG favicon metadata is missing')
assert(indexHtml.includes('"@type": "EducationalOrganization"'), 'Organization structured data is missing')
assert(indexHtml.includes('https://www.css-vista.com/icon-512.png'), 'Organization logo must use the compact CV asset')
assert(faviconIco.length > 6 && faviconIco[0] === 0 && faviconIco[1] === 0 && faviconIco[2] === 1 && faviconIco[3] === 0, 'favicon.ico is not a valid ICO file')
assert(!samplePaperHtml.includes('__SITE_ORIGIN__'), 'Generated past-paper page still contains the Sites runtime origin placeholder')
assert(!htaccess.includes('RewriteRule ^ index.html [L]'), 'Catch-all SPA fallback would create soft 404s')
assert(htaccess.includes('RewriteRule ^ - [R=404,L]'), 'Unknown routes must return a real HTTP 404')
assert(htaccess.includes('https://www.css-vista.com%{REQUEST_URI} [R=301'), 'Canonical protocol/host redirect is missing')
assert(htaccess.includes('ErrorDocument 404 /404.html'), 'Branded 404 response is not configured')
assert(htaccess.includes('seo/past-papers/$1.html'), 'Direct past-paper SEO rewrite is missing')
assert(htaccess.includes('css-2026-written-result.html'), 'CSS 2026 result SEO rewrite is missing')
assert(htaccess.includes('(css|pms|ppsc|mpt)'), 'Past-paper collection rewrites must include CSS, PMS, PPSC and MPT')
assert(htaccess.includes('seo/routes/book-summaries.html'), 'Book summaries must use route-specific initial HTML')
assert(htaccess.includes('seo/routes/current-affairs.html'), 'Current affairs must use route-specific initial HTML')
assert(htaccess.includes('ads\\.txt|robots\\.txt'), 'Crawler-control files are not explicitly protected from SPA rewrites')
assert(htaccess.includes('Content-Type "text/plain; charset=UTF-8"'), 'ads.txt plain-text response header is missing')
assert(htaccess.includes('index\\.html|sw\\.js|stale-module\\.js'), 'Runtime recovery files need no-cache headers')
assert(htaccess.includes('^assets/.*\\.js$ stale-module.js'), 'Obsolete JavaScript chunks must load the recovery module')
assert(htaccess.includes('[R=404,L,NC]'), 'Missing static assets must return a real 404 instead of index.html')
assert(!serviceWorker.includes("addEventListener('fetch'"), 'The retired service worker must not intercept page or asset requests')
assert(serviceWorker.includes('registration.unregister()'), 'The service-worker retirement script must unregister itself')
assert(staleModule.includes('window.location.replace'), 'The obsolete-module fallback must refresh to the latest deployment')
assert(robots.includes('https://www.css-vista.com/sitemap.xml'), 'Hostinger robots.txt uses the wrong origin')
assert(sitemap.includes('<loc>https://www.css-vista.com/past-papers'), 'Hostinger sitemap uses the wrong origin')
assert(sitemap.includes('<loc>https://www.css-vista.com/subjects/compulsory</loc>'), 'Compulsory subjects are missing from the sitemap')
assert(sitemap.includes('<loc>https://www.css-vista.com/notes</loc>'), 'Notes are missing from the sitemap')
assert(!sitemap.includes('/account</loc>') && !sitemap.includes('/dashboard</loc>') && !sitemap.includes('/gk/quiz</loc>'), 'Private or interactive state URLs leaked into the sitemap')
assert(sitemap.includes('<loc>https://www.css-vista.com/css-2026-written-result</loc><lastmod>2026-08-31</lastmod>'), 'CSS 2026 written result is missing from the sitemap or has the wrong date')
assert(css2026ResultHtml.includes('<title>CSS 2026 Written Result - Qualified Candidates List | CSS Vista</title>'), 'CSS 2026 result has the wrong search title')
assert(css2026ResultHtml.includes('<link rel="canonical" href="https://www.css-vista.com/css-2026-written-result"'), 'CSS 2026 result canonical URL is missing')
assert(css2026ResultHtml.includes('property="og:type" content="article"'), 'CSS 2026 result must use article social metadata')
assert(css2026ResultHtml.includes('property="article:published_time" content="2026-08-31"'), 'CSS 2026 result publication metadata is missing')
assert(css2026ResultHtml.includes('"@type":"NewsArticle"') && css2026ResultHtml.includes('"@type":"DigitalDocument"'), 'CSS 2026 result structured data is incomplete')
assert(css2026ResultHtml.includes('/results/css-2026-written-qualified-candidates.pdf'), 'CSS 2026 result page does not link to its PDF')
assert(css2026ResultHtml.includes('476 candidates'), 'CSS 2026 result page omits the verified qualified-candidate count')
assert(!css2026ResultHtml.includes('__SITE_ORIGIN__'), 'CSS 2026 result SEO page retains the origin placeholder')
assert(css2026ResultPdf.length === 985859, 'CSS 2026 result PDF size differs from the supplied document')
assert(css2026ResultPdf.subarray(0, 5).toString('ascii') === '%PDF-', 'CSS 2026 result asset is not a valid PDF')
assert(adsTxt.trim() === 'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0', 'ads.txt publisher record is missing or malformed')
assert(searchConsoleVerification.trim() === 'google-site-verification: googlec96e2248070e0570.html', 'Google Search Console verification file is malformed')
assert(indexHtml.includes('<meta name="google-adsense-account" content="ca-pub-6131271603014611"'), 'AdSense account verification metadata is missing')
assert(indexHtml.includes('<h1') && indexHtml.includes('CSS Vista competitive examination preparation'), 'Homepage lacks meaningful initial HTML')
assert(!indexHtml.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), 'Homepage initial HTML must not load AdSense')
assert(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl ?? ''), 'Production Supabase URL is missing or invalid')
assert(supabasePublishableKey?.startsWith('sb_publishable_'), 'Production Supabase key must be a browser-safe publishable key')
assert(javascriptBundles.some((source) => source.includes(supabaseUrl)), 'Production JavaScript is missing the Supabase project URL')
assert(javascriptBundles.some((source) => source.includes(supabasePublishableKey)), 'Production JavaScript is missing the Supabase publishable key')
assert(paperFiles.filter((name) => name.endsWith('.html')).length === 782, 'Expected 782 direct past-paper SEO pages')
assert(cssPapers.length === 467, 'Expected 467 registered CSS past papers')
assert(pmsPapers.length === 138, 'Expected 138 registered PMS past papers')
assert(ppscPapers.length === 173, 'Expected 173 registered PPSC past papers')
assert(mptPapers.length === 4, 'Expected 4 registered MPT past papers')
assert(registeredPapers.length === 782, 'Expected 782 registered past papers in total')

const sitemapLocCount = (sitemap.match(/<loc>/g) || []).length
const expectedSitemapCount = INDEXABLE_STATIC_ROUTES.length + new Set(registeredPapers.map((paper) => `${paper.examination.toLowerCase()}/${paper.year}`)).size + registeredPapers.length
assert(sitemapLocCount === expectedSitemapCount, `Expected ${expectedSitemapCount} canonical sitemap URLs, found ${sitemapLocCount}`)

for (const route of ROUTE_REGISTRY.filter((entry) => entry.match === 'exact')) {
  const routeFile = route.path === '/'
    ? join(dist, 'index.html')
    : join(dist, 'seo', 'routes', `${route.path.slice(1).replaceAll('/', '--')}.html`)
  const html = await readFile(routeFile, 'utf8')
  const canonical = `https://www.css-vista.com${route.path}`
  assert(html.includes(`<title>${route.title}</title>`), `${route.path} has the wrong initial title`)
  assert(html.includes(`<link rel="canonical" href="${canonical}"`), `${route.path} lacks a self-referencing canonical`)
  assert(html.includes(`<h1`) && html.includes(route.h1), `${route.path} lacks a meaningful initial H1`)
  assert(html.includes(`<meta name="robots" content="${route.robots}"`), `${route.path} has the wrong robots directive`)
}

for (const paper of registeredPapers) {
  const patterns = {
    CSS: /^\/past-papers\/20\d{2}\/[^/]+\.pdf$/i,
    PMS: /^\/past-papers\/pms\/(?:compulsory|group-[a-g])\/[^/]+\.pdf$/i,
    PPSC: /^\/past-papers\/ppsc\/20\d{2}\/[^/]+\.pdf$/i,
    MPT: /^\/past-papers\/mpt\/[^/]+\.pdf$/i,
  }
  const validUrl = patterns[paper.examination]?.test(paper.fileUrl)
  assert(validUrl, `Invalid ${paper.examination} paper URL: ${paper.fileUrl}`)
  const pdfPath = join(dist, paper.fileUrl.replace(/^\/+/, ''))
  let handle
  try {
    handle = await open(pdfPath, 'r')
  } catch (error) {
    throw new Error(`Missing registered ${paper.examination} PDF: ${paper.fileUrl}`, { cause: error })
  }
  try {
    const signature = Buffer.alloc(5)
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0)
    assert(bytesRead === 5 && signature.toString('ascii') === '%PDF-', `Invalid PDF file: ${paper.fileUrl}`)
  } finally {
    await handle.close()
  }
}

console.log(`Hostinger artifact audit passed: ${ROUTE_REGISTRY.length} registered routes, ${sitemapLocCount} sitemap URLs, real 404 handling, crawler files, Supabase and 782 paper PDFs verified.`)
