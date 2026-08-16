import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const sourceRoot = join(root, 'src')
const publicRoot = join(root, 'public')
const appSource = await readFile(join(sourceRoot, 'App.tsx'), 'utf8')

const routePatterns = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((route) => route !== '*')

async function collectFiles(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry)
    const info = await stat(path)
    if (info.isDirectory()) files.push(...await collectFiles(path))
    else files.push(path)
  }
  return files
}

function matchesRoute(pathname) {
  if (pathname === '/') return routePatterns.includes('/')
  return routePatterns.some((pattern) => {
    const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, '[^/]+')}$`)
    return regex.test(pathname)
  })
}

const sourceFiles = (await collectFiles(sourceRoot))
  .filter((file) => ['.ts', '.tsx'].includes(extname(file)))

const unresolvedRoutes = new Set()
const missingAssets = new Set()

for (const file of sourceFiles) {
  const contents = await readFile(file, 'utf8')
  for (const match of contents.matchAll(/(?:to|path)\s*[:=]\s*['"](\/[^'"?#]*)/g)) {
    const pathname = match[1].replace(/\/$/, '') || '/'
    if (/\.[a-z0-9]{2,5}$/i.test(pathname)) continue
    if (!matchesRoute(pathname)) unresolvedRoutes.add(`${relative(root, file)}: ${pathname}`)
  }
  for (const match of contents.matchAll(/['"`](\/[^'"`$?]+\.(?:pdf|png|jpe?g|webp|woff2|json|xlsx?))['"`]/gi)) {
    const asset = match[1]
    // These large archives are intentionally served by the Sites worker from
    // the matching public path in the production GitHub repository.
    if (asset.startsWith('/past-papers/') || asset.startsWith('/samples/')) continue
    try {
      await stat(join(publicRoot, asset.slice(1)))
    } catch {
      missingAssets.add(`${relative(root, file)}: ${asset}`)
    }
  }
}

if (unresolvedRoutes.size || missingAssets.size) {
  if (unresolvedRoutes.size) {
    console.error('Unresolved internal routes:')
    for (const item of unresolvedRoutes) console.error(`  ${item}`)
  }
  if (missingAssets.size) {
    console.error('Missing public assets:')
    for (const item of missingAssets) console.error(`  ${item}`)
  }
  process.exit(1)
}

console.log(`Site audit passed: ${routePatterns.length} routes and ${sourceFiles.length} source files checked.`)
