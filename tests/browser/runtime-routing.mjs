// Exercise the actual HTTPS fixture against the completed Hostinger artifact.
// No browser, database connection, advertising or external provider is used.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import https from 'node:https'
import { once } from 'node:events'

const port = 35000 + Math.floor(Math.random() * 20000)
const runtime = spawn(process.execPath, ['tests/browser/runtime.mjs'], {
  env: { ...process.env, CI: 'true', CSSV_DB_NAME: 'cssvista_briefing_test', CSSV_TEST_BROWSER_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let diagnostics = ''
runtime.stderr.on('data', chunk => { diagnostics += chunk })
const request = pathname => new Promise((resolve, reject) => {
  https.get({ hostname: '127.0.0.1', port, path: pathname, rejectUnauthorized: false }, response => {
    let body = ''
    response.setEncoding('utf8')
    response.on('data', chunk => { body += chunk })
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }))
  }).on('error', reject)
})
try {
  await Promise.race([
    once(runtime.stdout, 'data'),
    once(runtime, 'exit').then(([code]) => { throw new Error(`Runtime exited ${code}: ${diagnostics}`) }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Runtime did not start')), 10000).unref()),
  ])
  for (const pathname of ['/account', '/account/dashboard', '/account/essay-builder?workspace=synthetic-routing-only']) {
    const response = await request(pathname)
    assert.equal(response.status, 200, pathname)
    assert.ok(/noindex/i.test(response.body), `${pathname} keeps the private shell excluded`)
    assert.ok(!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/.test(response.body), `${pathname} must serve its real ad-free document, not the homepage`)
  }
  assert.equal((await request('/api/_pro.php')).status, 404, 'Private PHP helpers stay blocked before proxy')
  const missing = await request('/missing-browser-routing-regression')
  assert.equal(missing.status, 404, 'Unknown routes retain the real status')
  assert.match(missing.body, /noindex/i)
  assert.doesNotMatch(missing.body, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/)
  console.log('PASS HTTPS fixture: real ad-free/noindex account documents, private helper blocking and genuine unknown-route 404')
} finally {
  runtime.kill('SIGTERM')
  await once(runtime, 'exit')
}
