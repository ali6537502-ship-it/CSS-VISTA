import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROUTE_REGISTRY, findRouteDefinition, CANONICAL_ORIGIN } from '../../src/data/routeRegistry.mjs'

export const routeFile = path => path === '/' ? 'index.html' : `seo/routes/${path.slice(1).replaceAll('/', '--')}.html`
export async function productionRoutes(dist) {
  const rows = ROUTE_REGISTRY.filter(r => r.match === 'exact').map(r => ({ ...r, file: routeFile(r.path) }))
  rows.find(r => r.path === '/css-2026-written-result').file = 'seo/css-2026-written-result.html'
  async function add(dir, pathFor, quality) {
    for (const file of await readdir(join(dist, dir), { withFileTypes: true })) {
      if (file.isDirectory()) { await add(`${dir}/${file.name}`, name => pathFor(`${file.name}/${name}`), quality); continue }
      if (!file.name.endsWith('.html')) continue
      const path = pathFor(file.name.slice(0, -5))
      const html = await readFile(join(dist, dir, file.name), 'utf8')
      const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1]
      rows.push({ ...findRouteDefinition(path), path, file: `${dir}/${file.name}`, robots,
        indexable: !/noindex/.test(robots || 'noindex'), contentQuality: quality,
        contentSource: dir, expectedStatus: 200, access: 'public', active: true })
    }
  }
  await add('seo/past-papers', id => `/past-papers/view/${id}`, 'document')
  await add('seo/past-paper-collections', id => `/past-papers/${id}`, 'document')
  await add('seo/gk-categories', id => `/gk/cat/${id}`, 'substantial')
  await add('seo/book-summaries', id => `/book-summaries/${id}`, 'substantial')
  for (const extra of JSON.parse(await readFile(join(dist, 'functional-routes.json'), 'utf8'))) {
    rows.push({ ...findRouteDefinition(extra.path), ...extra, indexable: false, access: 'public', contentQuality: 'utility' })
  }
  return rows.map(r => ({ ...r, canonical: CANONICAL_ORIGIN + r.path, sitemap: r.indexable && r.access === 'public', prerender: true }))
}
