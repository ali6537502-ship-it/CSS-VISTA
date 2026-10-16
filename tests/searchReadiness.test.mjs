import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const origin = 'https://www.css-vista.com'
const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
const html = `<!doctype html><html><head><title>CSS Vista</title><meta name="description" content="An authentic educational tool."><meta name="robots" content="index, follow"><link rel="canonical" href="${origin}/"><meta property="og:url" content="${origin}/"><script id="cssv-route-structured-data" type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","url":"${origin}/"}</script></head><body><div id="root"><main><h1>CSS Vista</h1><p>Use the educational resource.</p></main></div></body></html>`
const index = `<sitemapindex xmlns="${namespace}"><sitemap><loc>${origin}/sitemap-core.xml</loc></sitemap></sitemapindex>`
const child = `<urlset xmlns="${namespace}"><url><loc>${origin}/</loc></url></urlset>`

async function check(t, changes = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'cssv-search-readiness-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const files = { 'index.html': html, 'sitemap.xml': index, 'sitemap-core.xml': child, ...changes }
  await Promise.all(Object.entries(files).map(([name, body]) => writeFile(join(dir, name), body)))
  return spawnSync(process.execPath, ['scripts/audit-search-readiness.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, CSSV_CLIENT_DIR: dir },
    encoding: 'utf8',
  })
}

function rejects(result, message) {
  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(result.stderr, message)
}

test('valid artifact with an independently useful short main passes without a word target', async (t) => {
  const result = await check(t)
  assert.equal(result.status, 0, result.stderr)
})

test('404 noindex page can omit a canonical while indexable pages cannot', async (t) => {
  const errorPage = html.replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex, follow">')
    .replace(/<link rel="canonical"[^>]+>/, '').replace(/<meta property="og:url"[^>]+>/, '')
    .replace(/<script[\s\S]*?<\/script>/, '')
  const result = await check(t, { '404.html': errorPage })
  assert.equal(result.status, 0, result.stderr)
  rejects(await check(t, { 'index.html': html.replace(/<link rel="canonical"[^>]+>/, '') }), /expected a unique canonical/)
})

test('duplicate canonicals and conflicting Googlebot directives fail', async (t) => {
  rejects(await check(t, { 'index.html': html.replace('</head>', `<link href="${origin}/other" rel="canonical"></head>`) }), /unique canonical/)
  rejects(await check(t, { 'index.html': html.replace('</head>', '<meta content="noindex" name="googlebot"></head>') }), /Googlebot robots conflicts/)
})

test('conflicting Open Graph and route JSON-LD URLs fail', async (t) => {
  rejects(await check(t, { 'index.html': html.replace(`property="og:url" content="${origin}/"`, `property="og:url" content="${origin}/other"`) }), /og:url conflicts/)
  rejects(await check(t, { 'index.html': html.replace(`"url":"${origin}/"`, `"url":"${origin}/other"`) }), /route JSON-LD url conflicts/)
})

test('invalid structured data and invalid/future dates fail', async (t) => {
  rejects(await check(t, { 'index.html': html.replace('"@context":', 'BROKEN "@context":') }), /invalid JSON-LD/)
  rejects(await check(t, { 'index.html': html.replace('"@context":', '"dateModified":"2026-02-30","@context":') }), /invalid calendar date/)
  rejects(await check(t, { 'index.html': html.replace('"@context":', '"datePublished":"2999-01-01","@context":') }), /future modification\/publication date/)
})

test('indexable missing main and retired collection filler fail', async (t) => {
  rejects(await check(t, { 'index.html': html.replaceAll('<main>', '<section>').replaceAll('</main>', '</section>') }), /no main element/)
  rejects(await check(t, { 'index.html': html.replace('<main>', '<main data-cssv-collection-context>') }), /retired repetitive collection/)
})

test('malformed XML, wrong namespace, and missing children fail', async (t) => {
  rejects(await check(t, { 'sitemap-core.xml': child.replace('</url>', '') }), /mismatched tag/)
  rejects(await check(t, { 'sitemap-core.xml': child.replace(namespace, 'https://example.com/invalid') }), /namespace/)
  rejects(await check(t, { 'sitemap.xml': index.replace('sitemap-core.xml', 'missing.xml') }), /missing.xml/)
})

test('duplicate URLs across children and duplicate child references fail', async (t) => {
  const entry = `<sitemap><loc>${origin}/second.xml</loc></sitemap>`
  rejects(await check(t, { 'sitemap.xml': index.replace('</sitemapindex>', entry + '</sitemapindex>'), 'second.xml': child }), /duplicate sitemap URL/)
  rejects(await check(t, { 'sitemap.xml': index.replace('</sitemapindex>', entry.replace('second.xml', 'sitemap-core.xml') + '</sitemapindex>') }), /duplicate sitemap reference/)
})

test('alternate origins, fragments, and misleading lastmod fail', async (t) => {
  rejects(await check(t, { 'sitemap-core.xml': child.replace('www.css-vista.com', 'css-vista.com') }), /noncanonical sitemap URL/)
  rejects(await check(t, { 'sitemap-core.xml': child.replace('</loc>', '#section</loc>') }), /noncanonical sitemap URL/)
  rejects(await check(t, { 'sitemap-core.xml': child.replace('</url>', '<lastmod>not-a-date</lastmod></url>') }), /invalid ISO date/)
})

test('sitemaps exceeding the 50,000-entry limit fail', async (t) => {
  const oversized = `<urlset xmlns="${namespace}">${`<url><loc>${origin}/</loc></url>`.repeat(50001)}</urlset>`
  rejects(await check(t, { 'sitemap-core.xml': oversized }), /outside 1..50,000/)
})

test('DTD and entity declarations fail instead of expanding untrusted XML', async (t) => {
  rejects(await check(t, { 'sitemap-core.xml': '<!DOCTYPE urlset [<!ENTITY fake "test">]>' + child }), /DTD\/entities/)
})
