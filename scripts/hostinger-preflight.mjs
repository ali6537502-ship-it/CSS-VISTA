import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

function fail(message) {
  console.error(`HOSTINGER PREFLIGHT ERROR: ${message}`)
  process.exitCode = 1
}

const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 22 || nodeMajor >= 25) {
  fail(`Node ${process.versions.node} is outside the supported range ${packageJson.engines?.node || '>=22 <25'}. Use Node 22.x on Hostinger.`)
}

const siteOrigin = process.env.SITE_ORIGIN || 'https://www.css-vista.com'
let parsedOrigin
try {
  parsedOrigin = new URL(siteOrigin)
} catch {
  fail(`SITE_ORIGIN is not a valid URL: ${siteOrigin}`)
}

if (parsedOrigin) {
  if (parsedOrigin.protocol !== 'https:') fail('SITE_ORIGIN must use HTTPS.')
  if (parsedOrigin.hostname !== 'www.css-vista.com') fail('SITE_ORIGIN must be https://www.css-vista.com for production.')
  if (parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) fail('SITE_ORIGIN must be an origin only, without a path, query, or fragment.')
}

for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('VITE_') || !value) continue
  if (value.startsWith('sb_secret_') || /service[_-]?role/i.test(value)) {
    fail(`${name} appears to contain a server secret. VITE_ variables are exposed to the browser.`)
  }
}

console.log('Hostinger preflight passed: Node runtime, canonical origin, and public build-time environment are safe for deployment.')
