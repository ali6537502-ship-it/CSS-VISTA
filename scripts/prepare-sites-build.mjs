import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const dist = join(root, 'dist')
const clientDir = join(dist, 'client')
const publicDir = join(root, 'public')
const serverDir = join(dist, 'server')
const indexPath = join(clientDir, 'index.html')

// Keep the interactive preview bundle lean while preserving the complete study
// archive in GitHub. Large PDFs are served from the matching public repository
// path by the Worker fallback below; all other public assets ship with the Site.
const remotelyServedDirectories = new Set(['past-papers', 'samples'])

for (const entry of await readdir(publicDir, { withFileTypes: true })) {
  if (entry.isDirectory() && remotelyServedDirectories.has(entry.name)) continue
  await cp(join(publicDir, entry.name), join(clientDir, entry.name), { recursive: true })
}

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

async function fetchPackagedAsset(request, env) {
  let response = await env.ASSETS.fetch(request)
  if (response.status !== 404) return response

  const url = new URL(request.url)
  const packagedUrl = new URL('/dist' + url.pathname, url)
  packagedUrl.search = url.search
  return env.ASSETS.fetch(new Request(packagedUrl, request))
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let response = await fetchPackagedAsset(request, env)

    if (
      response.status === 404
      && request.method === 'GET'
      && (url.pathname.startsWith('/past-papers/') || url.pathname.startsWith('/samples/'))
    ) {
      const repositoryAsset = new URL(
        url.pathname.replace(/^\\/+/, '') + url.search,
        'https://raw.githubusercontent.com/ali6537502-ship-it/CSS-VISTA/main/public/',
      )
      return Response.redirect(repositoryAsset, 302)
    }

    if (
      response.status === 404
      && request.method === 'GET'
      && request.headers.get('accept')?.includes('text/html')
    ) {
      response = await fetchPackagedAsset(new Request(new URL('/index.html', url), request), env)
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
console.log('Prepared Sites assets, worker entrypoint, and SPA fallback.')
