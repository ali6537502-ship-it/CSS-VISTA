/** Owner-requested public removal. Source files/history and personal records are retained. */
import { readFile, writeFile, rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'
const dist = new URL('../dist/', import.meta.url).pathname
for (const path of ['book-summaries', 'seo/book-summaries', 'seo/routes/book-summaries.html']) await rm(join(dist, path), { recursive: true, force: true })
for (const name of await readdir(dist)) {
 if (!/^sitemap.*\.xml$/.test(name)) continue
 const path = join(dist, name)
 const xml = await readFile(path, 'utf8')
 await writeFile(path, xml.replace(/\s*<url>\s*<loc>[^<]*\/book-summaries(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g, ''))
}
const notice = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Book Summaries Removed | CSS Vista</title></head><body><main><h1>Book Summaries have been removed</h1><p>This section is no longer published on CSS Vista.</p><p><a href="/">CSS Vista home</a> · <a href="/notes">Notes</a> · <a href="/past-papers">Past papers</a></p></main></body></html>'
await writeFile(join(dist, '410.html'), notice)
const path = join(dist, '.htaccess')
let rules = await readFile(path, 'utf8')
rules = 'ErrorDocument 410 /410.html\n<IfModule mod_headers.c>\n<Files "410.html">\nHeader always set X-Robots-Tag "noindex, nofollow"\n</Files>\n</IfModule>\n' + rules
const marker = '  # Same URLs, native Pro checks.'
if (!rules.includes(marker)) throw Error('Retired-resource rewrite insertion point missing')
const retiredRule = String.raw`  RewriteRule ^(?:book-summaries(?:/.*|\.html)?|seo/book-summaries(?:/.*)?|seo/routes/book-summaries\.html|assets/BookSummaries-[^/]+\.js)$ - [G,L,NC]`
rules = rules.replace(marker, '  # Owner-removed Book Summaries.\n' + retiredRule + '\n\n' + marker)
await writeFile(path, rules)
console.log('Book Summaries retired: public catalogue/covers/readers removed; old URLs return 410; source and personal records retained.')
