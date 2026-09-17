/**
 * Writes the REAL page content into the prerendered production HTML.
 *
 * This replaces the previous architecture, which generated search-facing copy
 * from route-name templates (a shared "Use <PAGE NAME> as the main entry
 * point…" body plus a link list). That produced one version of a page for
 * Google and a different one for visitors, and it is the direct cause of the
 * AdSense "Low value content" finding.
 *
 * Here the production build server-renders the same React components the
 * browser renders, so the initial HTML is the genuine page. A route that cannot
 * produce real primary content is NOT padded: it is reported, and the content
 * gate downgrades it to noindex while leaving the route fully usable.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { installDomShim } from './lib/dom-shim.mjs'
import { primaryContentText, isPlaceholderContent } from './lib/content-quality.mjs'
import { servedFileFor } from './lib/served-paths.mjs'
import { INDEXABLE_STATIC_ROUTES, ROUTE_REGISTRY } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const ssrDir = join(root, 'dist-ssr')

/** Build the SSR bundle from the real application source. */
function buildSsrBundle() {
  const result = spawnSync(
    process.execPath,
    [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--ssr',
      'scripts/prerender/entry.tsx', '--outDir', 'dist-ssr', '--logLevel', 'error'],
    { cwd: root, env: process.env, stdio: 'inherit' },
  )
  if (result.status !== 0) throw new Error('Could not build the prerender bundle from the application source.')
}

buildSsrBundle()
installDomShim()
const { renderAll } = await import(pathToFileURL(join(ssrDir, 'entry.js')).href)

const rendered = new Map()
const failures = []
for (const result of renderAll()) {
  if (result.error) {
    failures.push(`${result.path}: ${result.error}`)
    continue
  }
  rendered.set(result.path, result.html)
}

if (failures.length) {
  throw new Error(`The real page component could not be server-rendered for:\n  ${failures.join('\n  ')}`)
}

/**
 * Every indexable exact route must have genuine rendered content. This is the
 * fail-closed gate: no route reaches production as indexable on the strength of
 * template copy.
 */
const missing = INDEXABLE_STATIC_ROUTES.filter((route) => !rendered.has(route.path))
if (missing.length) {
  throw new Error(
    'These routes are marked indexable but have no real prerendered content. '
    + 'Register a component in scripts/prerender/routes.tsx or lower the route\'s '
    + `contentQuality so it is served noindex:\n  ${missing.map((route) => route.path).join('\n  ')}`,
  )
}

const report = []
for (const route of ROUTE_REGISTRY.filter((entry) => entry.match === 'exact')) {
  const html = rendered.get(route.path)
  if (!html) continue

  const target = join(clientDir, servedFileFor(route.path))

  let shell
  try {
    shell = await readFile(target, 'utf8')
  } catch {
    continue
  }

  const next = shell.replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body)/, `<div id="root">${html}</div>\n    `)
  if (next === shell) throw new Error(`Could not inject real content into the prerendered shell for ${route.path}`)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, next)

  const text = primaryContentText(html)
  report.push({
    path: route.path,
    indexable: route.indexable,
    words: text.split(/\s+/).filter(Boolean).length,
    placeholder: isPlaceholderContent(text),
  })
}

/**
 * The gate is emptiness and placeholder state, not a word target. A short page
 * carrying unique structured information is fine; a long page of reused prose
 * is not, and the duplicate audit catches that separately. Word count is only
 * ever a secondary warning.
 */
const EMPTY_CONTENT_WORDS = 60
const empty = report.filter((entry) => entry.indexable && (entry.placeholder || entry.words < EMPTY_CONTENT_WORDS))
if (empty.length) {
  throw new Error(
    'These routes are marked indexable but render no real primary content — '
    + 'they are empty shells or loading states. Publish real content or lower '
    + `their contentQuality so they are served noindex. Do not pad them:\n  ${
      empty.map((e) => `${e.path} (${e.words} words${e.placeholder ? ', placeholder/loading state' : ''})`).join('\n  ')}`,
  )
}

const short = report.filter((entry) => entry.indexable && !entry.placeholder && entry.words < 150)
for (const entry of short) {
  console.warn(`CONTENT NOTICE: ${entry.path} renders ${entry.words} words of unique primary content. Verify it still answers its own title.`)
}

const indexed = report.filter((entry) => entry.indexable)
const noindexed = report.filter((entry) => !entry.indexable)
console.log(
  `Prerendered real page content for ${report.length} exact routes from the application components: `
  + `${indexed.length} indexable (median ${median(indexed.map((e) => e.words))} words of primary content), `
  + `${noindexed.length} deliberately noindex but fully served.`,
)

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
