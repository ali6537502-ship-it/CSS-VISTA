/** GET-only loopback preview of the repository's supported Hostinger rules. */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { parseHtaccess, resolveRequest } from '../../scripts/lib/htaccess-resolver.mjs'

export async function startArtifactPreview(docRoot, { isolateNetwork = false } = {}) {
  const rules = parseHtaccess(await readFile(`${docRoot}/.htaccess`, 'utf8'))
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' }
  // This preview models only the repository resolver's supported Apache subset.
  // Real Hostinger response headers and PHP remain production verification steps.
  let previewOrigin = ''
  const server = createServer(async (request, response) => {
    // Public notes/feed JSON and Lighthouse's robots read must work in an
    // isolated sample. /api remains denied before network, including when
    // Lighthouse runs without Playwright's request interception.
    if (isolateNetwork) response.setHeader('Content-Security-Policy', `default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src ${previewOrigin}/study-material/ ${previewOrigin}/vistagram-content/ ${previewOrigin}/robots.txt; img-src 'self' data: blob:; font-src 'self' data:`)
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      if (request.method !== 'GET' || path.includes('..')) { response.writeHead(403).end(); return }
      const route = resolveRequest(rules, docRoot, path)
      if (route.redirect) { response.writeHead(route.status, { location: route.redirect }).end(); return }
      const file = resolve(docRoot, route.file || '404.html')
      if (!file.startsWith(`${docRoot}${sep}`) || extname(file) === '.php') { response.writeHead(503).end(); return }
      response.writeHead(route.status, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
      response.end(await readFile(file))
    } catch { response.writeHead(404).end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  previewOrigin = `http://127.0.0.1:${server.address().port}`
  return { server, origin: previewOrigin }
}
