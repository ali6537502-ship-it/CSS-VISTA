import { access, open, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const registeredPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const cssPapers = registeredPapers.filter((paper) => paper.examination === 'CSS')
const pmsPapers = registeredPapers.filter((paper) => paper.examination === 'PMS')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

await Promise.all([
  access(join(dist, 'index.html')),
  access(join(dist, '.htaccess')),
  access(join(dist, 'assets')),
  access(join(dist, 'robots.txt')),
  access(join(dist, 'sitemap.xml')),
  access(join(dist, 'ads.txt')),
  access(join(dist, 'googlec96e2248070e0570.html')),
])

const [indexHtml, htaccess, robots, sitemap, adsTxt, searchConsoleVerification, paperFiles, assetFiles, productionEnv] = await Promise.all([
  readFile(join(dist, 'index.html'), 'utf8'),
  readFile(join(dist, '.htaccess'), 'utf8'),
  readFile(join(dist, 'robots.txt'), 'utf8'),
  readFile(join(dist, 'sitemap.xml'), 'utf8'),
  readFile(join(dist, 'ads.txt'), 'utf8'),
  readFile(join(dist, 'googlec96e2248070e0570.html'), 'utf8'),
  readdir(join(dist, 'seo', 'past-papers')),
  readdir(join(dist, 'assets')),
  readFile(join(root, '.env.production'), 'utf8'),
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
assert(!samplePaperHtml.includes('__SITE_ORIGIN__'), 'Generated past-paper page still contains the Sites runtime origin placeholder')
assert(htaccess.includes('RewriteRule ^ index.html [L]'), 'SPA fallback rule is missing')
assert(htaccess.includes('seo/past-papers/$1.html'), 'Direct past-paper SEO rewrite is missing')
assert(htaccess.includes('ads\\.txt|robots\\.txt'), 'Crawler-control files are not explicitly protected from SPA rewrites')
assert(htaccess.includes('Content-Type "text/plain; charset=UTF-8"'), 'ads.txt plain-text response header is missing')
assert(robots.includes('https://www.css-vista.com/sitemap.xml'), 'Hostinger robots.txt uses the wrong origin')
assert(sitemap.includes('<loc>https://www.css-vista.com/past-papers'), 'Hostinger sitemap uses the wrong origin')
assert(adsTxt.trim() === 'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0', 'ads.txt publisher record is missing or malformed')
assert(searchConsoleVerification.trim() === 'google-site-verification: googlec96e2248070e0570.html', 'Google Search Console verification file is malformed')
assert(indexHtml.includes('<meta name="google-adsense-account" content="ca-pub-6131271603014611"'), 'AdSense account verification metadata is missing')
assert(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl ?? ''), 'Production Supabase URL is missing or invalid')
assert(supabasePublishableKey?.startsWith('sb_publishable_'), 'Production Supabase key must be a browser-safe publishable key')
assert(javascriptBundles.some((source) => source.includes(supabaseUrl)), 'Production JavaScript is missing the Supabase project URL')
assert(javascriptBundles.some((source) => source.includes(supabasePublishableKey)), 'Production JavaScript is missing the Supabase publishable key')
assert(paperFiles.filter((name) => name.endsWith('.html')).length === 605, 'Expected 605 direct past-paper SEO pages')
assert(cssPapers.length === 467, 'Expected 467 registered CSS past papers')
assert(pmsPapers.length === 138, 'Expected 138 registered PMS past papers')
assert(registeredPapers.length === 605, 'Expected 605 registered past papers in total')

for (const paper of registeredPapers) {
  const validUrl = paper.examination === 'CSS'
    ? /^\/past-papers\/20\d{2}\/[^/]+\.pdf$/i.test(paper.fileUrl)
    : /^\/past-papers\/pms\/(?:compulsory|group-[a-g])\/[^/]+\.pdf$/i.test(paper.fileUrl)
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

console.log('Hostinger artifact audit passed: Supabase, crawler files, static root, SPA rewrites, 605 paper pages, 467 CSS PDFs and 138 PMS PDFs verified.')
