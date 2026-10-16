/** Final-artifact syntax/metadata gate; route and content audits remain authoritative. */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { resolveClientDir } from './lib/client-dir.mjs'
import { CANONICAL_ORIGIN } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
// Python's standard-library parsers validate XML and HTML without introducing
// a second sitemap generator or a new package (Python is already build-required).
const result = spawnSync('python3', [join(root, 'scripts/lib/search-readiness.py'), resolveClientDir(root), CANONICAL_ORIGIN], {
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
