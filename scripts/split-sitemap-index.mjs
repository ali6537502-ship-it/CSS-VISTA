import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_REGISTRY } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteUrl = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com')
const siteOrigin = siteUrl.origin
// This is the modification date of the generated child sitemap files, not a
// blanket claim that every listed page changed on the same date.
const sitemapBuildDate = new Date().toISOString().slice(0, 10)

function xmlDocument(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
}

function sitemapIndex(names) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${names.map((name) => `  <sitemap><loc>${siteOrigin}/${name}</loc><lastmod>${sitemapBuildDate}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`
}

const sitemapPath = join(clientDir, 'sitemap.xml')
const flat = await readFile(sitemapPath, 'utf8')
if (!flat.includes('<urlset ')) throw new Error('Expected a flat URL sitemap before sitemap-index splitting.')

const blocks = [...flat.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0])
if (!blocks.length) throw new Error('The generated sitemap contains no URL entries.')

const groups = { core: [], gk: [], collections: [], papers: [] }
const seen = new Set()
for (const block of blocks) {
  const locMatch = block.match(/<loc>([^<]+)<\/loc>/)
  if (!locMatch) throw new Error('Sitemap URL entry is missing <loc>.')
  const loc = locMatch[1]
  if (seen.has(loc)) throw new Error(`Duplicate sitemap URL: ${loc}`)
  seen.add(loc)
  const pathname = new URL(loc).pathname
  if (pathname.startsWith('/gk/cat/')) groups.gk.push(block)
  else if (pathname.startsWith('/past-papers/view/')) groups.papers.push(block)
  else if (/^\/past-papers\/(?:css|pms|ppsc|mpt)\/\d{4}\/?$/.test(pathname)) groups.collections.push(block)
  else groups.core.push(block)
}

for (const route of ROUTE_REGISTRY.filter((entry) => !entry.indexable && entry.match === 'exact')) {
  const protectedUrl = `${siteOrigin}${route.path}`
  if (seen.has(protectedUrl)) throw new Error(`Protected route leaked into sitemap: ${route.path}`)
}

const total = Object.values(groups).reduce((sum, entries) => sum + entries.length, 0)
if (total !== blocks.length || seen.size !== blocks.length) {
  throw new Error(`Sitemap split lost URLs: source=${blocks.length}, grouped=${total}, unique=${seen.size}`)
}
for (const [name, entries] of Object.entries(groups)) {
  if (!entries.length) throw new Error(`Sitemap group ${name} is unexpectedly empty.`)
}

const childFiles = [
  ['sitemap-core.xml', groups.core],
  ['sitemap-gk.xml', groups.gk],
  ['sitemap-past-paper-collections.xml', groups.collections],
  ['sitemap-past-papers.xml', groups.papers],
]
for (const [name, entries] of childFiles) await writeFile(join(clientDir, name), xmlDocument(entries))
await writeFile(sitemapPath, sitemapIndex(childFiles.map(([name]) => name)))

console.log(`Split ${blocks.length} indexable URLs into sitemap index: core=${groups.core.length}, gk=${groups.gk.length}, collections=${groups.collections.length}, papers=${groups.papers.length}.`)
