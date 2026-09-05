import { findRouteDefinition } from '../src/data/routeRegistry.mjs'

const expectedRecord = 'google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0'
const origin = (process.env.ADSENSE_SITE_ORIGIN || 'https://www.css-vista.com').replace(/\/$/, '')
const routes = ['/', '/current-affairs', '/consultation', '/fpsc-syllabus', '/gk', '/past-papers']
const userAgent = 'AdsBot-Google (+http://www.google.com/adsbot.html)'
let failed = false

function result(valid, label, details) {
  console.log(`${valid ? 'PASS' : 'FAIL'} ${label}: ${details}`)
  if (!valid) failed = true
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent }, ...options })
  return { response, body: await response.text() }
}

try {
  const { response, body } = await fetchText(`${origin}/ads.txt`)
  result(response.status === 200 && body.trim() === expectedRecord && /text\/plain/i.test(response.headers.get('content-type') || ''), 'ads.txt', `${response.status} ${response.headers.get('content-type')} -> ${response.url}`)
} catch (error) {
  result(false, 'ads.txt', error instanceof Error ? error.message : String(error))
}

try {
  const { response, body } = await fetchText(`${origin}/robots.txt`)
  const exactRules = /^User-agent: \*\r?\nAllow: \/\r?\n\r?\nSitemap: https:\/\/www\.css-vista\.com\/sitemap\.xml\r?\n?$/.test(body)
  result(response.status === 200 && /text\/plain/i.test(response.headers.get('content-type') || '') && exactRules, 'robots.txt', `${response.status} ${response.headers.get('content-type')}`)
} catch (error) {
  result(false, 'robots.txt', error instanceof Error ? error.message : String(error))
}

try {
  const { response, body } = await fetchText(`${origin}/sitemap.xml`)
  const contentTypeOk = /(?:application|text)\/xml/i.test(response.headers.get('content-type') || '')
  const isUrlSet = body.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  const isIndex = body.includes('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  const xml = body.startsWith('<?xml') && (isUrlSet || isIndex) && !/<html/i.test(body)
  let childrenValid = true
  let childCount = 0
  if (isIndex) {
    const children = [...body.matchAll(/<loc>(https:\/\/www\.css-vista\.com\/sitemap-[^<]+\.xml)<\/loc>/g)].map((match) => match[1])
    childCount = children.length
    childrenValid = children.length >= 4
    for (const child of children) {
      const fetched = await fetchText(child)
      const validChild = fetched.response.status === 200
        && /(?:application|text)\/xml/i.test(fetched.response.headers.get('content-type') || '')
        && fetched.body.startsWith('<?xml')
        && fetched.body.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        && !/<html/i.test(fetched.body)
      if (!validChild) childrenValid = false
    }
  }
  result(response.status === 200 && contentTypeOk && xml && childrenValid, 'sitemap.xml', `${response.status} ${response.headers.get('content-type')} (${isIndex ? `${childCount} child sitemaps` : `${(body.match(/<loc>/g) || []).length} URLs`})`)
} catch (error) {
  result(false, 'sitemap.xml', error instanceof Error ? error.message : String(error))
}

try {
  const { response, body } = await fetchText(`${origin}/googlec96e2248070e0570.html`)
  result(response.status === 200 && body.trim() === 'google-site-verification: googlec96e2248070e0570.html', 'Search Console verification', `${response.status} -> ${response.url}`)
} catch (error) {
  result(false, 'Search Console verification', error instanceof Error ? error.message : String(error))
}

for (const path of routes) {
  try {
    const { response, body } = await fetchText(`${origin}${path}`)
    const route = findRouteDefinition(path)
    const canonical = `${origin}${path}`
    const valid = response.status === 200
      && Boolean(route)
      && body.includes(`<title>${route.title}</title>`)
      && body.includes(`<link rel="canonical" href="${canonical}"`)
      && body.includes(route.h1)
      && body.includes('<h1')
      && body.includes('<meta name="google-adsense-account" content="ca-pub-6131271603014611"')
      && body.includes('cssv-prerender-shell')
      && !body.includes('__SITE_ORIGIN__')
      && (path !== '/' || !body.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'))
    result(valid, `initial HTML ${path}`, `${response.status}, canonical ${canonical}`)
  } catch (error) {
    result(false, `initial HTML ${path}`, error instanceof Error ? error.message : String(error))
  }
}

try {
  const fakePath = `/definitely-not-a-css-vista-route-${Date.now()}`
  const { response, body } = await fetchText(`${origin}${fakePath}`, { redirect: 'manual' })
  result(response.status === 404 && /noindex/i.test(body), 'real 404', `${response.status} ${fakePath}`)
} catch (error) {
  result(false, 'real 404', error instanceof Error ? error.message : String(error))
}

for (const variant of ['http://css-vista.com/current-affairs', 'https://css-vista.com/current-affairs']) {
  try {
    const { response } = await fetchText(variant, { redirect: 'manual' })
    const location = response.headers.get('location') || ''
    const firstHopIsSafe = [301, 308].includes(response.status)
      && (location === `${origin}/current-affairs` || location === 'https://css-vista.com/current-affairs')
    const finalResponse = await fetch(variant, { redirect: 'follow', headers: { 'user-agent': userAgent } })
    const resolvesCanonical = finalResponse.url === `${origin}/current-affairs`
    result(firstHopIsSafe && resolvesCanonical, `canonical redirect ${variant}`, `${response.status} -> ${location || '(none)'} -> ${finalResponse.url}`)
  } catch (error) {
    result(false, `canonical redirect ${variant}`, error instanceof Error ? error.message : String(error))
  }
}

if (failed) process.exitCode = 1
else console.log('Production AdSense discovery, route HTML, sitemap index, canonical redirects and real 404 checks passed.')
