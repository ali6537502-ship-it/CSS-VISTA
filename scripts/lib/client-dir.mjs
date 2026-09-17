/**
 * Resolves the directory holding the generated production site.
 *
 * The Hostinger target builds into `dist/`; the Sites target builds into
 * `dist/client/`. Inside a build the target sets CSSV_CLIENT_DIR, but the
 * audits are also meant to be runnable on their own (`npm run audit:routes`),
 * so they detect the layout instead of assuming one and failing with ENOENT.
 */
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function resolveClientDir(root) {
  if (process.env.CSSV_CLIENT_DIR) return resolve(root, process.env.CSSV_CLIENT_DIR)
  const nested = join(root, 'dist', 'client')
  if (existsSync(join(nested, 'index.html'))) return nested
  return join(root, 'dist')
}
