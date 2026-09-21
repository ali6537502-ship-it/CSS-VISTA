/**
 * Publish the Islamic Studies reference banks as crawlable, directly
 * navigable pages: one per chapter and one per topic.
 *
 * The HTML is the real React component, server-rendered by the shared
 * prerender bundle. scripts/lib/publish-section.mjs does the routing.
 */
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { installDomShim } from './lib/dom-shim.mjs'
import { publishSection } from './lib/publish-section.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteOrigin = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com').origin

const index = JSON.parse(
  await readFile(join(root, 'src/data/bundled/islamic-references-index.json'), 'utf8'))

const chapterName = (chapter) => chapter.titleEn.replace(/^[IVX]+\.\s*/, '').trim()
const base = '/study-material/islamic-studies'

const pages = []
for (const chapter of index.chapters) {
  const name = chapterName(chapter)
  const chapterCrumb = { name, item: `${siteOrigin}${base}/${chapter.slug}` }
  const rootCrumb = { name: 'Islamic Studies Reference Bank', item: `${siteOrigin}${base}` }
  pages.push({
    path: `${base}/${chapter.slug}`,
    file: `${chapter.slug}.html`,
    title: `${name} — CSS Islamic Studies References (English & Urdu) | CSS Vista`,
    description: `${chapter.referenceCount} source-checked references for ${name}, across ${chapter.topics.length} topics, with Arabic source passages and parallel English and Urdu.`,
    inLanguage: ['en', 'ur'],
    breadcrumb: [rootCrumb, chapterCrumb],
  })
  for (const topic of chapter.topics) {
    pages.push({
      path: `${base}/${chapter.slug}/${topic.slug}`,
      file: `${chapter.slug}--${topic.slug}.html`,
      title: `${topic.titleEn} — ${name} References | CSS Vista`,
      description: `${topic.count} source-checked Qur'anic, Hadith and scholarly references on ${topic.titleEn.toLowerCase()} for CSS Islamic Studies, with Arabic passages and parallel English and Urdu.`,
      inLanguage: ['en', 'ur'],
      breadcrumb: [rootCrumb, chapterCrumb,
        { name: topic.titleEn, item: `${siteOrigin}${base}/${chapter.slug}/${topic.slug}` }],
    })
  }
}

installDomShim()
const { renderRoute } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry.js')).href)

const result = await publishSection({
  label: 'Islamic Studies reference',
  clientDir,
  siteOrigin,
  outputDir: join('seo', 'islamic-studies'),
  pages,
  rewriteRules: [
    '  # Serve the Islamic Studies reference banks at stable, crawlable URLs.',
    '  RewriteRule ^study-material/islamic-studies/([A-Za-z0-9-]+)/([A-Za-z0-9-]+)/?$ seo/islamic-studies/$1--$2.html [L,NC]',
    '  RewriteRule ^study-material/islamic-studies/([A-Za-z0-9-]+)/?$ seo/islamic-studies/$1.html [L,NC]',
  ],
  renderRoute,
})

console.log(
  `Generated ${result.total} crawlable Islamic Studies reference pages from the real components `
  + `(${index.chapters.length} chapters, ${result.total - index.chapters.length} topics, `
  + `${index.referenceTotal} references, median ${Math.round(result.words / result.total)} words each); `
  + `${result.indexable} indexable.`)
