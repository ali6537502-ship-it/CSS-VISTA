/**
 * Publish the optional-subject notes as crawlable, directly navigable pages:
 * one per subject and one per topic.
 *
 * The HTML is the real React component, server-rendered by the shared
 * prerender bundle. scripts/lib/publish-section.mjs does the routing.
 */
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { installDomShim } from './lib/dom-shim.mjs'
import { publishSection } from './lib/publish-section.mjs'
import { optionalSubjectMeta, optionalTopicMeta } from '../src/data/studyMaterialMeta.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteOrigin = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com').origin

const index = JSON.parse(
  await readFile(join(root, 'src/data/bundled/optional-notes-index.json'), 'utf8'))

const base = '/study-material/optional'
const rootCrumb = { name: 'CSS Optional Subject Notes', item: `${siteOrigin}${base}` }

const pages = []
for (const group of index.groups) {
  for (const subject of group.subjects) {
    const subjectCrumb = { name: subject.subject, item: `${siteOrigin}${base}/${subject.slug}` }
    pages.push({
      path: `${base}/${subject.slug}`,
      file: `${subject.slug}.html`,
      ...optionalSubjectMeta(group, subject),
      breadcrumb: [rootCrumb, subjectCrumb],
    })
    for (const topic of subject.topics) {
      pages.push({
        path: `${base}/${subject.slug}/${topic.slug}`,
        file: `${subject.slug}--${topic.slug}.html`,
        ...optionalTopicMeta(subject, topic),
        breadcrumb: [rootCrumb, subjectCrumb,
          { name: topic.title, item: `${siteOrigin}${base}/${subject.slug}/${topic.slug}` }],
      })
    }
  }
}

installDomShim()
const { renderRoute } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry.js')).href)

const result = await publishSection({
  label: 'optional subject notes',
  clientDir,
  siteOrigin,
  outputDir: join('seo', 'optional-notes'),
  pages,
  rewriteRules: [
    '  # Serve the optional-subject notes at stable, crawlable URLs.',
    '  RewriteRule ^study-material/optional/([A-Za-z0-9-]+)/([A-Za-z0-9-]+)/?$ seo/optional-notes/$1--$2.html [L,NC]',
    '  RewriteRule ^study-material/optional/([A-Za-z0-9-]+)/?$ seo/optional-notes/$1.html [L,NC]',
  ],
  renderRoute,
})

console.log(
  `Generated ${result.total} crawlable optional-subject note pages from the real components `
  + `(${index.subjectTotal} subjects, ${index.topicTotal} topics, median `
  + `${Math.round(result.words / result.total)} words each); ${result.indexable} indexable.`)
