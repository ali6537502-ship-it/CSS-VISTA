import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseHtaccess, resolveRequest } from './lib/htaccess-resolver.mjs'
const dist = resolve(import.meta.dirname, '../dist')
const htaccess = readFileSync(dist + '/.htaccess', 'utf8')
assert.match(htaccess, /ErrorDocument 410 \/410\.html/)
const rules = parseHtaccess(htaccess)
for (const path of ['/book-summaries','/book-summaries/why-nations-fail','/book-summaries/index.json','/book-summaries/covers/why-nations-fail.webp','/seo/book-summaries/why-nations-fail.html','/seo/routes/book-summaries.html','/assets/BookSummaries-stale.js']) {
 const r = resolveRequest(rules, dist, path)
 assert.equal(r.status, 410, path)
 const html = readFileSync(dist + '/' + r.file, 'utf8')
 assert.match(html, /noindex, nofollow/)
 assert.doesNotMatch(html, /adsbygoogle|Complete book summary/)
}
assert.equal(existsSync(dist+'/book-summaries'),false,'Public raw data and covers must not ship')
assert.equal(existsSync(dist+'/seo/book-summaries'),false,'Reader HTML must not ship')
for (const name of readdirSync(dist).filter(n=>/^sitemap.*\.xml$/.test(n))) assert.doesNotMatch(readFileSync(dist+'/'+name,'utf8'),/\/book-summaries/)
for (const name of readdirSync(dist+'/assets')) assert.ok(!/^BookSummaries-/.test(name),'Reader JS chunk must not ship')
assert.doesNotMatch(readFileSync(dist+'/index.html','utf8'),/href="\/book-summaries/)
console.log('PASS Book Summaries removal: Gone routes, noindex/ad-free notice, no public data/covers/readers/client chunk, no sitemap or home links.')
