import assert from 'node:assert/strict'
const origin = 'https://www.css-vista.com'
for (const path of ['/book-summaries','/book-summaries/why-nations-fail','/book-summaries/index.json','/book-summaries/covers/why-nations-fail.webp','/seo/book-summaries/why-nations-fail.html','/seo/routes/book-summaries.html','/assets/BookSummaries-stale.js']) {
 const r = await fetch(origin+path,{signal:AbortSignal.timeout(30000)})
 const html = await r.text()
 assert.equal(r.status,410,path)
 assert.match(html,/noindex, nofollow/)
 assert.doesNotMatch(html,/adsbygoogle|Complete book summary/)
 console.log('PASS 410 noindex ad-free',path)
}
for (const path of ['/','/sitemap-core.xml']) {
 const r=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.doesNotMatch(await r.text(),path==='/'?/href="\/book-summaries/:/\/book-summaries/)
}
