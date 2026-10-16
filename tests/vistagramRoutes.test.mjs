import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { primeVistagramIndex, primeVistagramPost, vistagramIndexNow, vistagramPostNow } from '../src/features/vistagram/api.ts'
import { vistagramArticleStructuredData } from '../src/features/vistagram/meta.mjs'
import { parseHtaccess, resolveRequest } from '../scripts/lib/htaccess-resolver.mjs'
import { primaryContentText } from '../scripts/lib/content-quality.mjs'
import { getRoutePolicy } from '../src/data/routeRegistry.mjs'

const source = JSON.parse(readFileSync('public/vistagram-content/index.json', 'utf8'))
const publicPosts = source.posts.map((summary) => ({
  summary, raw: JSON.parse(readFileSync(join('public', summary.contentPath), 'utf8')),
}))

test('the synchronous prerender cache uses the same parsed public content as the browser reader', () => {
  const index = primeVistagramIndex(source)
  assert.equal(index.posts.length, source.posts.length, 'no public post silently disappears during parsing')
  assert.equal(vistagramIndexNow(), index)
  for (const { summary, raw } of publicPosts) {
    const post = primeVistagramPost(summary, raw)
    assert.equal(vistagramPostNow(summary.slug), post)
    assert.equal(post.title, raw.title)
    assert.deepEqual(post.sections.flatMap((section) => section.paragraphs), raw.sections.flatMap((section) => section.paragraphs ?? []))
    assert.equal(post.publishedAt, raw.publishedAt)
    assert.throws(() => primeVistagramPost(summary, { ...raw, id: 'not-the-requested-post' }), /invalid/)
    const schema = vistagramArticleStructuredData(post, 'https://www.css-vista.com')
    assert.equal(schema.datePublished, raw.publishedAt)
    assert.equal(schema.dateModified, raw.updatedAt || raw.publishedAt)
    assert.equal(schema.url, `https://www.css-vista.com/vistagram/${summary.slug}`)
  }
  assert.equal(vistagramPostNow('not-a-public-post'), null)
})

test('every packaged public Vistagram post supports direct navigation with authentic text and existing exclusions', {
  skip: !existsSync('dist/seo/vistagram') && 'run the Hostinger build first',
}, () => {
  const dist = 'dist'
  const rules = parseHtaccess(readFileSync(join(dist, '.htaccess'), 'utf8'))
  const sitemaps = ['sitemap-core.xml', 'sitemap-gk.xml', 'sitemap-past-papers.xml', 'sitemap-past-paper-collections.xml']
    .map((file) => readFileSync(join(dist, file), 'utf8')).join('\n')
  const feed = resolveRequest(rules, dist, '/vistagram')
  assert.equal(feed.status, 200)
  const feedHtml = readFileSync(join(dist, feed.file), 'utf8')
  for (const { summary, raw } of publicPosts) {
    const path = `/vistagram/${summary.slug}`
    const response = resolveRequest(rules, dist, path)
    assert.equal(response.status, 200, path)
    const html = readFileSync(join(dist, response.file), 'utf8')
    const text = primaryContentText(html)
    const paragraph = raw.sections.flatMap((section) => section.paragraphs ?? [])[0]
    assert.ok(paragraph, `${path} needs its existing article paragraphs`)
    assert.ok(text.includes(paragraph.replace(/\s+/g, ' ').trim()), `${path} must contain its authentic first paragraph`)
    assert.match(html, /name="robots" content="noindex, follow"/, path)
    assert.ok(html.includes(`rel="canonical" href="https://www.css-vista.com${path}"`), path)
    assert.ok(feedHtml.includes(`href="${path}"`), `${path} must be discoverable in the public feed`)
    assert.equal(sitemaps.includes(`https://www.css-vista.com${path}</loc>`), false, path)
    assert.equal(html.includes('adsbygoogle.js'), false, path)
    assert.equal(getRoutePolicy(path).adMode, 'disabled', path)
    const schema = JSON.parse(/<script id="cssv-route-structured-data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1])
    assert.equal(schema.datePublished, summary.publishedAt, path)
  }
  for (const path of ['/vistagram/not-a-public-post', '/vistagram/draft-never-published']) {
    assert.equal(resolveRequest(rules, dist, path).status, 404, path)
  }
})
