/**
 * Applies the authoritative route advertising policy to generated HTML.
 *
 * The source index deliberately contains Google's official loader so the
 * homepage is directly verifiable. Route-specific files are generated from
 * that source, so this final build pass removes the loader from every document
 * whose canonical route is ad-disabled. React still enforces the same policy
 * during client navigation.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CANONICAL_ORIGIN, findRouteDefinition } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')

const loaderUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6131271603014611'
const loaderPattern = /\s*<script\b[^>]*\bsrc=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-6131271603014611["'][^>]*>\s*<\/script>/gi

async function htmlFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await htmlFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path)
  }
  return files
}

function canonicalPath(html) {
  const match = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)
  if (!match) return null
  try {
    const url = new URL(match[1], CANONICAL_ORIGIN)
    return url.origin === CANONICAL_ORIGIN ? url.pathname : null
  } catch {
    return null
  }
}

let eligibleDocuments = 0
let protectedDocuments = 0

for (const path of await htmlFiles(clientDir)) {
  let html = await readFile(path, 'utf8')
  if (!html.includes('google-adsense-account') && !html.includes('adsbygoogle.js')) continue

  const relativePath = relative(clientDir, path).replaceAll('\\', '/')
  const forcedProtected = relativePath === '404.html' || relativePath === 'seo/routes/protected.html'
  const routePath = relativePath === 'index.html' ? '/' : canonicalPath(html)
  const route = routePath ? findRouteDefinition(routePath) : null
  const eligible = !forcedProtected
    && route?.access === 'public'
    && route.contentQuality === 'substantial'
    && route.adMode === 'enabled'

  const matches = html.match(loaderPattern) || []
  if (eligible) {
    if (matches.length !== 1 || !html.includes(loaderUrl)) {
      throw new Error(`Ad-eligible HTML must contain the official loader exactly once: ${relativePath}`)
    }
    eligibleDocuments += 1
    continue
  }

  if (matches.length) {
    html = html.replace(loaderPattern, '')
    await writeFile(path, html)
  }
  if (html.includes(loaderUrl)) {
    throw new Error(`Could not remove the AdSense loader from protected HTML: ${relativePath}`)
  }
  protectedDocuments += 1
}

if (!eligibleDocuments) throw new Error('No ad-eligible HTML documents were found.')
console.log(`AdSense HTML policy applied: ${eligibleDocuments} eligible documents retain the loader; ${protectedDocuments} protected documents do not.`)
