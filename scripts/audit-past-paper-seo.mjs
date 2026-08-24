import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  const worker = await readFile(join(root, 'dist', 'server', 'index.js'), 'utf8')
  assert(worker.includes('/seo/past-papers/') && worker.includes('/seo/past-paper-collections/'), 'Worker does not serve SEO pages at public URLs')
}

console.log(`Past-paper SEO audit passed: ${papers.length} direct paper records${process.argv.includes('--artifact') ? ' and generated crawlable pages' : ''}.`)
