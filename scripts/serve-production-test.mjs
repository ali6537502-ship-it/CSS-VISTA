// Local output verification only. Apache/LiteSpeed rules are tested separately.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
const root = resolve('dist')
const rows = JSON.parse(await readFile(resolve(root, 'route-policy.json'), 'utf8'))
const routes = new Map(rows.map(row => [row.path, row.file]))
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.xml':'application/xml', '.txt':'text/plain', '.pdf':'application/pdf', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2' }
createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  let path
  try { path = decodeURIComponent(url.pathname) } catch { response.writeHead(400); response.end(); return }
  if (path.startsWith('/api/')) { response.writeHead(503, { 'content-type':'application/json' }); response.end(JSON.stringify({ ok:false, message:'Local build verification has no account backend.' })); return }
  if (path === '/privacy' || (path !== '/' && routes.has(path.replace(/\/+$/, '')) && path.endsWith('/'))) {
    response.writeHead(301, { location: path === '/privacy' ? '/privacy-policy' : path.replace(/\/+$/, '') + url.search }); response.end(); return
  }
  let file = routes.get(path) || path.slice(1)
  if (/^\/account\/current-affairs\/[A-Za-z0-9_-]+$/.test(path) && !routes.has(path)) file = 'seo/routes/protected.html'
  let status = 200
  let target = resolve(root, file)
  try { if (!target.startsWith(root + '/') || !(await stat(target)).isFile() || /\.(php|sql)$/.test(target)) throw new Error('not public') }
  catch { status = 404; target = resolve(root, '404.html') }
  response.writeHead(status, { 'content-type':types[extname(target)] || 'application/octet-stream', 'cache-control':'no-store' })
  response.end(await readFile(target))
}).listen(4173, '0.0.0.0', () => console.log('Production-output test server listening on 4173'))
