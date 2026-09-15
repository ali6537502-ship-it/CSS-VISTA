import { execFileSync } from 'node:child_process'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outputDir = process.env.CSSV_CLIENT_DIR ? join(root, process.env.CSSV_CLIENT_DIR) : join(root, 'dist')

let gitSha = ''
try {
  gitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim().toLowerCase()
} catch (error) {
  throw new Error(`Unable to resolve checked-out Git SHA for deployment fingerprint: ${error instanceof Error ? error.message : String(error)}`)
}

if (!/^[0-9a-f]{40}$/.test(gitSha)) {
  throw new Error(`Invalid checked-out Git SHA for deployment fingerprint: ${gitSha}`)
}

const manifest = {
  schemaVersion: 1,
  gitSha,
  source: 'git-rev-parse-head',
  buildTarget: process.env.CSSV_BUILD_TARGET || 'hostinger',
  builtAt: new Date().toISOString(),
}

await writeFile(join(outputDir, 'deployment-fingerprint.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const htaccessPath = join(outputDir, '.htaccess')
const marker = '# CSS Vista deployment fingerprint: never cache this file.'
try {
  const htaccess = await readFile(htaccessPath, 'utf8')
  if (!htaccess.includes(marker)) {
    await appendFile(htaccessPath, `\n${marker}\n<IfModule mod_headers.c>\n  <Files "deployment-fingerprint.json">\n    Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"\n    Header set Pragma "no-cache"\n    Header set Expires "0"\n  </Files>\n</IfModule>\n`)
  }
} catch (error) {
  throw new Error(`Unable to make deployment fingerprint non-cacheable: ${error instanceof Error ? error.message : String(error)}`)
}

console.log(`Deployment fingerprint written for ${gitSha}.`)
