/** Restore direct access to already packaged public posts; never publish drafts. */
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { installDomShim } from './lib/dom-shim.mjs'
import { publishSection } from './lib/publish-section.mjs'
import { vistagramArticleStructuredData } from '../src/features/vistagram/meta.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR ? resolve(root, process.env.CSSV_CLIENT_DIR) : join(root, 'dist', 'client')
const siteOrigin = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com').origin
const index = JSON.parse(await readFile(join(root, 'public/vistagram-content/index.json'), 'utf8'))
const posts = index.posts ?? []
if (new Set(posts.map((post) => post.slug)).size !== posts.length) throw new Error('Duplicate public Vistagram slugs.')
for (const post of posts) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) throw new Error(`Unsafe public Vistagram slug: ${post.slug}`)
}
installDomShim()
const { renderRoute } = await import(pathToFileURL(join(root, 'dist-ssr/entry.js')).href)
const result = await publishSection({
  label: 'existing public Vistagram', clientDir, siteOrigin,
  outputDir: join('seo', 'vistagram'),
  pages: posts.map((post) => ({
    path: `/vistagram/${post.slug}`, file: `${post.slug}.html`,
    title: `${post.title} | CSS Vistagram`, description: post.excerpt.slice(0, 200),
    structuredData: vistagramArticleStructuredData(post, siteOrigin),
    breadcrumb: [
      { name: 'CSS Vistagram', item: `${siteOrigin}/vistagram` },
      { name: post.title, item: `${siteOrigin}/vistagram/${post.slug}` },
    ],
  })),
  // Finite known slugs only. Unknown IDs keep the normal genuine 404 path.
  rewriteRules: posts.map((post) => `  RewriteRule ^vistagram/${post.slug}/?$ seo/vistagram/${post.slug}.html [L]`),
  renderRoute,
})
if (result.indexable !== 0) throw new Error('Vistagram must retain its existing noindex publication policy.')
console.log(`Restored direct public readers for ${result.total} existing Vistagram posts; noindex, ad-disabled, no sitemap additions.`)
