import { open, readFile, readdir, stat } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceRoot = join(root, 'src')
const publicRoot = join(root, 'public')
const appSource = await readFile(join(sourceRoot, 'App.tsx'), 'utf8')
const remoteManifestPath = join(publicRoot, 'remote-library-manifest.json')
let remoteAssets = new Set()
try {
  const manifest = JSON.parse(await readFile(remoteManifestPath, 'utf8'))
  remoteAssets = new Set((manifest.files ?? []).map((file) => file.path))
} catch {
  // A missing manifest is reported below when a referenced remote asset is found.
}

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
const dataErrors = new Set()

for (const file of sourceFiles) {
  const contents = await readFile(file, 'utf8')
  for (const match of contents.matchAll(/(?:to|path)\s*[:=]\s*['"](\/[^'"?#]*)/g)) {
    const pathname = match[1].replace(/\/$/, '') || '/'
    if (/\.[a-z0-9]{2,5}$/i.test(pathname)) continue
    if (!matchesRoute(pathname)) unresolvedRoutes.add(`${relative(root, file)}: ${pathname}`)
  }
  for (const match of contents.matchAll(/['"`](\/[^'"`$?]+\.(?:pdf|png|jpe?g|webp|woff2|json|xlsx?))['"`]/gi)) {
    const asset = match[1]
    try {
      await stat(join(publicRoot, asset.slice(1)))
    } catch {
      if (!remoteAssets.has(asset)) missingAssets.add(`${relative(root, file)}: ${asset}`)
    }
  }
}

const publicFiles = await collectFiles(publicRoot)
for (const file of publicFiles) {
  const info = await stat(file)
  if (info.size === 0) dataErrors.add(`${relative(root, file)}: empty file`)
  if (extname(file) === '.json') {
    try {
      JSON.parse(await readFile(file, 'utf8'))
    } catch (error) {
      dataErrors.add(`${relative(root, file)}: invalid JSON (${error.message})`)
    }
  }
  if (extname(file).toLocaleLowerCase() === '.pdf' && info.size < 1024) {
    dataErrors.add(`${relative(root, file)}: PDF is suspiciously small (${info.size} bytes)`)
  }
  if (extname(file).toLocaleLowerCase() === '.pdf' && info.size >= 1024) {
    const handle = await open(file, 'r')
    const header = Buffer.alloc(1024)
    await handle.read(header, 0, header.length, 0)
    await handle.close()
    if (!header.includes(Buffer.from('%PDF-'))) dataErrors.add(`${relative(root, file)}: missing PDF header`)
  }
}

const paperRegistryFiles = ['pastPapers.generated.ts', 'pmsPastPapers.generated.ts']
const paperIds = new Set()
const paperUrls = new Set()
for (const registry of paperRegistryFiles) {
  const contents = await readFile(join(sourceRoot, 'data', registry), 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim().replace(/,$/, '')
    if (!trimmed.startsWith('{"id"')) continue
    const paper = JSON.parse(trimmed)
    if (paperIds.has(paper.id)) dataErrors.add(`${registry}: duplicate paper id ${paper.id}`)
    paperIds.add(paper.id)
    if (paperUrls.has(paper.fileUrl)) dataErrors.add(`${registry}: duplicate paper file ${paper.fileUrl}`)
    paperUrls.add(paper.fileUrl)
    const years = basename(paper.fileUrl).match(/20\d{2}/g) ?? []
    if (years.length && !years.includes(String(paper.year))) {
      dataErrors.add(`${registry}: ${paper.id} is labelled ${paper.year}, but file is ${basename(paper.fileUrl)}`)
    }
  }
}

if (unresolvedRoutes.size || missingAssets.size || dataErrors.size) {
  if (unresolvedRoutes.size) {
    console.error('Unresolved internal routes:')
    for (const item of unresolvedRoutes) console.error(`  ${item}`)
  }
  if (missingAssets.size) {
    console.error('Missing public assets:')
    for (const item of missingAssets) console.error(`  ${item}`)
  }
  if (dataErrors.size) {
    console.error('Data integrity errors:')
    for (const item of dataErrors) console.error(`  ${item}`)
  }
  process.exit(1)
}

console.log(`Site audit passed: ${routePatterns.length} routes, ${sourceFiles.length} source files and ${publicFiles.length} public assets checked.`)
