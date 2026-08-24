import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const papers = await loadGeneratedPastPapers(root)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(papers.length === 605, `Expected 605 supplied papers, received ${papers.length}`)
assert(papers.every((paper) => paper.id && paper.fileUrl && paper.title && paper.subject && paper.year), 'Every paper needs complete searchable metadata')
assert(new Set(papers.map((paper) => paper.id)).size === papers.length, 'Past-paper IDs must be unique')
assert(papers.some((paper) => paper.id === 'css-2023-current-affairs'), 'CSS 2023 direct-search sample is missing')

if (process.argv.includes('--artifact')) {
  const clientDir = join(root, 'dist', 'client')
  await access(join(clientDir, 'index.html'))
  const seoFiles = (await readdir(join(clientDir, 'seo', 'past-papers'))).filter((name) => name.endsWith('.html'))
  assert(seoFiles.length === papers.length, `Expected ${papers.length} static paper pages, received ${seoFiles.length}`)

  const sample = await readFile(join(clientDir, 'seo', 'past-papers', 'css-2023-current-affairs.html'), 'utf8')
  assert(sample.includes('<title>CSS 2023 Current Affairs Past Paper | CSS Vista</title>'), 'Direct paper title is not specific')
  assert(sample.includes('rel="canonical" href="https://css-vista.ali6537.chatgpt.site/past-papers/view/css-2023-current-affairs"'), 'Direct paper canonical URL is missing')
  assert(sample.includes('<h1') && sample.includes('CSS 2023 Current Affairs Past Paper'), 'Direct paper content is not present in HTML')
  assert(sample.includes('"@type":"DigitalDocument"'), 'Direct paper structured data is missing')
  assert(sample.includes('Verified questions recovered for 2023'), 'Direct paper HTML lacks the supplied question transcription')
  assert(!sample.includes('href="/past-papers/2023/Current-Affairs-2023.pdf"'), 'Direct paper HTML must not advertise an unavailable source file')
  assert(!sample.includes('property="og:image"') && !sample.includes('name="twitter:image"'), 'Detail pages must not inherit the generic social image')

  const collection = await readFile(join(clientDir, 'seo', 'past-paper-collections', 'css', '2023.html'), 'utf8')
  assert(collection.includes('<title>CSS 2023 Past Papers — All Subjects | CSS Vista</title>'), 'CSS year collection title is missing')
  assert(collection.includes('css-2023-current-affairs'), 'CSS year collection lacks direct paper links')
  assert(collection.includes('"@type":"CollectionPage"'), 'CSS year collection structured data is missing')

  const sitemap = await readFile(join(clientDir, 'sitemap.xml'), 'utf8')
  assert(sitemap.includes('/past-papers/css/2023'), 'Sitemap lacks the CSS 2023 collection')
  assert(sitemap.includes('/past-papers/view/css-2023-current-affairs'), 'Sitemap lacks direct CSS 2023 paper URLs')
  const sitemapEntries = (sitemap.match(/<url>/g) ?? []).length
  assert(sitemapEntries > papers.length, 'Sitemap should contain paper and collection pages')

  const robots = await readFile(join(clientDir, 'robots.txt'), 'utf8')
  assert(robots.includes('Allow: /') && robots.includes('/sitemap.xml'), 'robots.txt must allow crawling and advertise the sitemap')
  const workerPath = join(root, 'dist', 'server', 'index.js')
  const worker = await readFile(workerPath, 'utf8')
  assert(worker.includes('/seo/past-papers/') && worker.includes('/seo/past-paper-collections/'), 'Worker does not serve SEO pages at public URLs')
  assert(!worker.includes("paperMatch[1] + '.html'") && !worker.includes("collectionMatch[2] + '.html'"), 'Worker must request extensionless HTML assets so public URLs do not redirect')
  const workerModule = await import(`${pathToFileURL(workerPath).href}?audit=${Date.now()}`)
  const requestedAssetPaths = []
  const mockEnv = { ASSETS: { fetch: async (request) => {
    requestedAssetPaths.push(new URL(request.url).pathname)
    return new Response('<!doctype html><div id="root"></div>', { headers: { 'content-type': 'text/html' } })
  } } }
  const routeResponse = await workerModule.default.fetch(new Request('https://css-vista.ali6537.chatgpt.site/past-papers/css/2023', { headers: { accept: 'text/html' } }), mockEnv)
  assert(routeResponse.status === 200, 'Public collection route must resolve without a redirect')
  assert(requestedAssetPaths[0] === '/seo/past-paper-collections/css/2023', 'Public collection route must resolve through the extensionless packaged asset path')

  const appAssetPaths = []
  const appMockEnv = { ASSETS: { fetch: async (request) => {
    const pathname = new URL(request.url).pathname
    appAssetPaths.push(pathname)
    if (pathname.endsWith('/index.html')) return new Response('<!doctype html><div id="root"></div>', { headers: { 'content-type': 'text/html' } })
    return new Response('Not found', { status: 404 })
  } } }
  const appRouteResponse = await workerModule.default.fetch(new Request('https://css-vista.ali6537.chatgpt.site/games'), appMockEnv)
  assert(appRouteResponse.status === 200 && appAssetPaths.some((pathname) => pathname.endsWith('/index.html')), 'Extensionless app routes must resolve without relying on a browser-specific Accept header')
}

console.log(`Past-paper SEO audit passed: ${papers.length} direct paper records${process.argv.includes('--artifact') ? ' and generated crawlable pages' : ''}.`)
