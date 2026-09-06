import { cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))
const target = process.argv[2] || 'hostinger'

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
} else {
  delete process.env.CSSV_CLIENT_DIR
  delete process.env.CSSV_EMIT_WORKER
  process.env.SITE_ORIGIN ||= 'https://css-vista.ali6537.chatgpt.site'
}

run('node_modules/typescript/bin/tsc', ['-b'])
run('node_modules/vite/bin/vite.js', ['build'])
await import(`./prepare-sites-build.mjs?target=${target}`)
if (target === 'hostinger') {
  await import('./expand-hostinger-seo.mjs')
  await import('./repair-search-visibility.mjs')
  await import('./enhance-search-landing-pages.mjs')
  await import('./strengthen-longtail-search-pages.mjs')
  await import('./polish-prerender-shells.mjs')
  await import('./reinforce-brand-homepage.mjs')
  await import('./split-sitemap-index.mjs')
}

if (target === 'sites') {
  const metadataDir = join(root, 'dist', '.openai')
  await mkdir(metadataDir, { recursive: true })
  await cp(join(root, '.openai', 'hosting.json'), join(metadataDir, 'hosting.json'))
}
