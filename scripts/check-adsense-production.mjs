const expectedRecord = 'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0'
const canonicalOrigin = (process.env.ADSENSE_SITE_ORIGIN || 'https://www.css-vista.com').replace(/\/$/, '')
const apexOrigin = canonicalOrigin.replace('://www.', '://')

const checks = [
  { name: 'canonical ads.txt', url: `${canonicalOrigin}/ads.txt`, includes: expectedRecord, contentType: 'text/plain' },
  { name: 'apex ads.txt', url: `${apexOrigin}/ads.txt`, includes: expectedRecord, contentType: 'text/plain' },
  { name: 'robots.txt', url: `${canonicalOrigin}/robots.txt`, includes: 'Sitemap:', contentType: 'text/plain' },
  { name: 'Search Console verification', url: `${canonicalOrigin}/googlec96e2248070e0570.html`, includes: 'google-site-verification: googlec96e2248070e0570.html' },
]

let failed = false
for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      redirect: 'follow',
      headers: { 'user-agent': 'AdsBot-Google (+http://www.google.com/adsbot.html)' },
    })
    const body = await response.text()
    const contentType = response.headers.get('content-type') || ''
    const valid = response.status === 200
      && body.includes(check.includes)
      && (!check.contentType || contentType.toLowerCase().includes(check.contentType))
    const hcdn = response.headers.has('x-hcdn-request-id') || response.headers.get('server') === 'hcdn'
    console.log(`${valid ? 'PASS' : 'FAIL'} ${check.name}: ${response.status} ${contentType || '(no content type)'} -> ${response.url}`)
    if (!valid) {
      failed = true
      if (hcdn && response.status === 403) {
        console.error('  Hostinger CDN blocked the crawler. Disable Under Attack mode, review bot/country blocking, then purge CDN cache.')
      }
    }
  } catch (error) {
    failed = true
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failed) process.exitCode = 1
else console.log('Production AdSense discovery endpoints are publicly crawlable and correctly formatted.')
