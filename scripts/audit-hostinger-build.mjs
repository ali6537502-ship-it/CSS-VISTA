import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

await Promise.all([
  access(join(dist, 'index.html')),
  access(join(dist, '.htaccess')),
  access(join(dist, 'assets')),
  access(join(dist, 'robots.txt')),
  access(join(dist, 'sitemap.xml')),
])

const [indexHtml, htaccess, robots, sitemap, paperFiles] = await Promise.all([
  readFile(join(dist, 'index.html'), 'utf8'),
  readFile(join(dist, '.htaccess'), 'utf8'),
  readFile(join(dist, 'robots.txt'), 'utf8'),
  readFile(join(dist, 'sitemap.xml'), 'utf8'),
  readdir(join(dist, 'seo', 'past-papers')),
])

let nestedClientExists = true
try {
  await access(join(dist, 'client'))
} catch {
  nestedClientExists = false
}

const samplePaperHtml = await readFile(join(dist, 'seo', 'past-papers', 'css-2023-current-affairs.html'), 'utf8')

assert(!indexHtml.includes('__SITE_ORIGIN__'), 'Hostinger index still contains the Sites runtime origin placeholder')
assert(!nestedClientExists, 'Hostinger build must not nest the site under dist/client')
assert(indexHtml.includes('https://www.css-vista.com/'), 'Hostinger index is missing the custom-domain metadata')
assert(!samplePaperHtml.includes('__SITE_ORIGIN__'), 'Generated past-paper page still contains the Sites runtime origin placeholder')
assert(htaccess.includes('RewriteRule ^ index.html [L]'), 'SPA fallback rule is missing')
assert(htaccess.includes('seo/past-papers/$1.html'), 'Direct past-paper SEO rewrite is missing')
assert(robots.includes('https://www.css-vista.com/sitemap.xml'), 'Hostinger robots.txt uses the wrong origin')
assert(sitemap.includes('<loc>https://www.css-vista.com/past-papers'), 'Hostinger sitemap uses the wrong origin')
assert(paperFiles.filter((name) => name.endsWith('.html')).length === 605, 'Expected 605 direct past-paper SEO pages')

console.log('Hostinger artifact audit passed: static root, custom-domain metadata, SPA rewrites and 605 paper pages verified.')
