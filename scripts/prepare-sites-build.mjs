import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const dist = join(root, 'dist')
const serverDir = join(dist, 'server')
const indexPath = join(dist, 'index.html')

await readFile(indexPath, 'utf8')
await mkdir(serverDir, { recursive: true })

const worker = `const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

function withHeaders(response, pathname) {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value)
  if (/\\/assets\\/[^/]+-[A-Za-z0-9_-]+\\.(?:js|css)$/.test(pathname)) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.toLowerCase().endsWith('.pdf')) {
    headers.set('Cache-Control', 'public, max-age=86400')
  } else if (headers.get('content-type')?.includes('text/html')) {
    headers.set('Cache-Control', 'no-cache')
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let response = await env.ASSETS.fetch(request)

    if (
      response.status === 404
      && request.method === 'GET'
      && request.headers.get('accept')?.includes('text/html')
    ) {
      response = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request))
    }

    if (response.headers.get('content-type')?.includes('text/html')) {
      const html = (await response.text()).replaceAll('__SITE_ORIGIN__', url.origin)
      response = new Response(html, response)
    }

    return withHeaders(response, url.pathname)
  },
}
`

await writeFile(join(serverDir, 'index.js'), worker)
console.log('Prepared Sites worker entrypoint and SPA fallback.')
