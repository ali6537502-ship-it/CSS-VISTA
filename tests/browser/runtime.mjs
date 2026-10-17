import https from 'node:https'
import http from 'node:http'
import { readFileSync, createReadStream, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseHtaccess, resolveRequest } from '../../scripts/lib/htaccess-resolver.mjs'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable test database required')
const root = new URL('../../dist/', import.meta.url).pathname.replace(/\/$/, '')
const rules = parseHtaccess(readFileSync(root + '/.htaccess', 'utf8'))
const temporary = mkdtempSync(path.join(tmpdir(), 'cssv-browser-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', temporary + '/key.pem', '-out', temporary + '/cert.pem', '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' })
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' }
const server = https.createServer({ key: readFileSync(temporary + '/key.pem'), cert: readFileSync(temporary + '/cert.pem') }, (req, res) => {
  let pathname
  try { pathname = decodeURIComponent(new URL(req.url, 'https://localhost').pathname) } catch { res.writeHead(400); res.end(); return }
  if (pathname.startsWith('/api/_')) { res.writeHead(404); res.end(); return }
  const paid = /^\/(?:mcq\/cat-(?:general-ability|current-affairs)-[0-9]+\.json|one-liner-gk\/(?:general-ability|current-affairs-archive|pakistan-current-affairs)\.json|css-subject-mcqs\/(?:general-science-and-ability|current-affairs)\.json|study-material\/essay-themes\.json|recent-affairs\/[^/]+\.json|magazines\/[^/]+\.pdf)$/.test(pathname)
  if (pathname.startsWith('/api/') || paid) {
    const headers = { ...req.headers, host: 'localhost:4173' }
    if (headers.origin) headers.origin = 'http://localhost:4173'
    const proxy = http.request({ hostname: 'localhost', port: 4173, path: paid ? '/api/student/premium-content.php?file=' + encodeURIComponent(pathname.slice(1)) : req.url, method: req.method, headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res) })
    proxy.on('error', error => { console.error('Isolated native proxy:', error.code); if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'test_native_proxy_unavailable' })) })
    req.pipe(proxy); return
  }
  // Use the same generated document as Apache. Falling back to index.html
  // injects the homepage's advertising library into private account shells
  // and races the application's required clean-document navigation boundary.
  const route = resolveRequest(rules, root, pathname)
  if (route.redirect) { res.writeHead(route.status, { Location: route.redirect }); res.end(); return }
  if (!route.file || path.extname(route.file) === '.php') { res.writeHead(route.status === 200 ? 403 : route.status); res.end(); return }
  const file = path.resolve(root, route.file)
  if (file !== root && !file.startsWith(root + '/')) { res.writeHead(404); res.end(); return }
  res.statusCode = route.status
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
  const stream = createReadStream(file)
  stream.on('error', () => { if (!res.headersSent) res.writeHead(404); res.end() })
  stream.pipe(res)
})
server.listen(Number(process.env.CSSV_TEST_BROWSER_PORT || 3444), '127.0.0.1', () => console.log('Isolated built browser runtime ready'))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { rmSync(temporary, { recursive: true, force: true }); process.exit(0) }))
