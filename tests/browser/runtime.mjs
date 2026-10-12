import https from 'node:https'
import http from 'node:http'
import { readFileSync, createReadStream, statSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable test database required')
const root = new URL('../../dist/', import.meta.url).pathname.replace(/\/$/, '')
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
    const proxy = http.request({ hostname: '127.0.0.1', port: 4173, path: paid ? '/api/student/premium-content.php?file=' + encodeURIComponent(pathname.slice(1)) : req.url, method: req.method, headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res) })
    proxy.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() })
    req.pipe(proxy); return
  }
  let file = path.resolve(root, '.' + pathname)
  if (file !== root && !file.startsWith(root + '/')) { res.writeHead(404); res.end(); return }
  try { if (!statSync(file).isFile()) file = root + '/index.html' } catch { file = root + '/index.html' }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
  createReadStream(file).pipe(res)
})
server.listen(Number(process.env.CSSV_TEST_BROWSER_PORT || 3444), '127.0.0.1', () => console.log('Isolated built browser runtime ready'))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { rmSync(temporary, { recursive: true, force: true }); process.exit(0) }))
