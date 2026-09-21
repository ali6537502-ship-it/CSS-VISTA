import { cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))
const target = process.argv[2] || 'hostinger'
const strictContentValidation = process.argv.includes('--strict') || process.env.CSSV_STRICT_CONTENT_VALIDATION === 'true'

if (!['hostinger', 'sites'].includes(target)) {
  throw new Error(`Unknown build target: ${target}`)
}

function run(script, args = []) {
  const result = spawnSync(process.execPath, [join(root, script), ...args], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

process.env.CSSV_BUILD_TARGET = target
if (target === 'hostinger') {
  process.env.CSSV_CLIENT_DIR = 'dist'
  process.env.CSSV_EMIT_WORKER = 'false'
  process.env.SITE_ORIGIN ||= 'https://www.css-vista.com'
  process.env.CSSV_STRICT_CONTENT_VALIDATION = strictContentValidation ? 'true' : 'false'
  run('scripts/hostinger-preflight.mjs')
} else {
  delete process.env.CSSV_CLIENT_DIR
  delete process.env.CSSV_EMIT_WORKER
  process.env.SITE_ORIGIN ||= 'https://css-vista.ali6537.chatgpt.site'
}

// Keep the per-subject analysis files in step with the generated payload
// before anything copies public/ into the build output.
run('scripts/split-past-paper-analysis.mjs')
// The bundled book catalogue is derived from the same source as the full
// library, so the shelf renders on first paint without a 314 KB fetch.
run('scripts/generate-book-catalogue.mjs')

run('node_modules/typescript/bin/tsc', ['-b'])
run('node_modules/vite/bin/vite.js', ['build'])
await import(`./prepare-sites-build.mjs?target=${target}`)
if (target === 'hostinger') {
  await import('./expand-hostinger-seo.mjs')
  await import('./repair-search-visibility.mjs')
  // Real application content replaces the former route-name SEO templates.
  run('scripts/prerender-real-content.mjs')
  await import('./enrich-past-paper-collections-before-validation.mjs')
  // Thin-content thresholds are enforced on the normal production path. There
  // is no permissive variant: a known content defect must not ship.
  await import('./strengthen-longtail-search-pages.mjs')
  await import('./expand-book-summary-seo.mjs')
  await import('./expand-islamic-references-seo.mjs')
  await import('./polish-prerender-shells.mjs')
  await import('./reinforce-brand-homepage.mjs')
  await import('./split-sitemap-index.mjs')
  run('scripts/package-current-affairs.mjs')
  run('scripts/write-deployment-fingerprint.mjs')
  await import('./audit-hostinger-build-v2.mjs')
  // Production-integrity gates. These fail the normal build.
  run('scripts/audit-route-integrity.mjs')
  run('scripts/audit-internal-links.mjs')
  run('scripts/audit-duplicate-content.mjs')
}

if (target === 'sites') {
  const metadataDir = join(root, 'dist', '.openai')
  await mkdir(metadataDir, { recursive: true })
  await cp(join(root, '.openai', 'hosting.json'), join(metadataDir, 'hosting.json'))
}
