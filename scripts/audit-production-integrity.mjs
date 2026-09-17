import { readFile, access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { productionRoutes } from './lib/production-routes.mjs'
import { CANONICAL_ORIGIN } from '../src/data/routeRegistry.mjs'

const dist = 'dist'
const rows = await productionRoutes(dist)
const byPath = new Map(rows.map(r => [r.path, r]))
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }
const exists = async path => { try { await access(join(dist, decodeURIComponent(path.replace(/^\//, '')))); return true } catch { return false } }
const normalize = text => text.replace(/<(nav|header|footer|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
const hashes = new Map()
const corpus = []
let links = 0
for (const row of rows) {
  const html = await readFile(join(dist, row.file), 'utf8')
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  check(canonical === row.canonical, `${row.path}: wrong canonical ${canonical}`)
  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1]
  check(Boolean(robots) && /noindex/.test(robots) === !row.indexable, `${row.path}: robots policy mismatch`)
  check(html.includes('ca-pub-6131271603014611'), `${row.path}: missing publisher verification`)
  check(/<h1\b/.test(html), `${row.path}: missing heading`)
  const main = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/)?.[1] || ''
  if (row.indexable) {
    check(main.length > 0, `${row.path}: empty primary HTML`)
    check(!/Use .{0,150} as the main entry point|Follow the page.s own subject|Connect the material with the FPSC syllabus|Begin with the purpose of|under construction|coming soon/i.test(normalize(main)), `${row.path}: placeholder or generic fallback`)
    const text = normalize(main)
    const hash = createHash('sha256').update(text).digest('hex')
    check(!hashes.has(hash), `${row.path}: identical primary content to ${hashes.get(hash)}`)
    hashes.set(hash, row.path)
    const tokens = text.split(' ')
    const grams = new Set(tokens.slice(0, -4).map((_, i) => tokens.slice(i, i + 5).join(' ')))
    if (row.contentQuality !== 'document') {
      for (const prior of corpus) {
        let intersection = 0
        for (const gram of grams) if (prior.grams.has(gram)) intersection++
        const similarity = intersection / Math.max(grams.size, prior.grams.size, 1)
        check(similarity < 0.92, `${row.path}: ${Math.round(similarity * 100)}% duplicate primary content with ${prior.path}`)
      }
      corpus.push({ path: row.path, grams })
    }
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&')
    if (/^(?:#|data:|mailto:|tel:|javascript:)/i.test(value)) continue
    let url
    try { url = new URL(value, row.canonical) } catch { failures.push(`${row.path}: malformed URL ${value}`); continue }
    if (url.origin !== CANONICAL_ORIGIN) continue
    links++
    check(!url.pathname.includes('//'), `${row.path}: duplicate slash ${value}`)
    const path = url.pathname
    if (byPath.has(path)) continue
    if (path === '/privacy') { failures.push(`${row.path}: obsolete privacy link`); continue }
    if (await exists(path)) continue
    failures.push(`${row.path}: broken first-party link ${value}`)
  }
}
const sitemapIndex = await readFile(join(dist, 'sitemap.xml'), 'utf8')
const sitemapPaths = []
for (const match of sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const xml = await readFile(join(dist, new URL(match[1]).pathname.slice(1)), 'utf8')
  for (const loc of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapPaths.push(new URL(loc[1]).pathname)
}
check(new Set(sitemapPaths).size === sitemapPaths.length, 'Duplicate sitemap entries')
for (const path of sitemapPaths) check(byPath.get(path)?.sitemap === true, `Invalid sitemap target: ${path}`)
for (const row of rows) check(sitemapPaths.includes(row.path) === row.sitemap, `Sitemap policy mismatch: ${row.path}`)
check((await readFile(join(dist, 'ads.txt'), 'utf8')).trim() === 'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0', 'ads.txt changed')
const notFound = await readFile(join(dist, '404.html'), 'utf8')
check(/noindex/.test(notFound) && !notFound.includes(`rel="canonical" href="${CANONICAL_ORIGIN}/"`), '404 metadata unsafe')
const htaccess = await readFile(join(dist, '.htaccess'), 'utf8')
check(htaccess.includes('RewriteRule ^ - [R=404,L]'), 'Missing real HTTP 404 handling')
await writeFile(join(dist, 'route-policy.json'), JSON.stringify(rows, null, 2))
if (failures.length) throw new Error(`Production integrity failed (${failures.length}):\n${[...new Set(failures)].join('\n')}`)
console.log(`PASS production integrity: ${rows.length} routes, ${sitemapPaths.length} sitemap URLs, ${links} first-party links; primary-content duplicates checked.`)
