import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import optionalIndex from '../src/data/bundled/optional-notes-index.json' with { type: 'json' }
import islamicIndex from '../src/data/bundled/islamic-references-index.json' with { type: 'json' }
import { studyMaterialMetaForPath, studyMaterialStructuredDataForPath } from '../src/data/studyMaterialMeta.mjs'

const subject = optionalIndex.groups[0].subjects[0]
const chapter = islamicIndex.chapters[0]
const paths = [
  `/study-material/optional/${subject.slug}`,
  `/study-material/optional/${subject.slug}/${subject.topics[0].slug}`,
  `/study-material/islamic-studies/${chapter.slug}`,
  `/study-material/islamic-studies/${chapter.slug}/${chapter.topics[0].slug}`,
]

test('study-material schema describes real pages with canonical, ordered breadcrumbs', () => {
  for (const [index, path] of paths.entries()) {
    const graph = studyMaterialStructuredDataForPath(`${path}/`)
    assert.equal(graph['@context'], 'https://schema.org')
    const [page, breadcrumbs] = graph['@graph']
    assert.equal(page['@type'], index % 2 ? 'Article' : 'CollectionPage')
    assert.equal(page.url, `https://www.css-vista.com${path}`)
    assert.equal(page.description, studyMaterialMetaForPath(path).description)
    assert.equal(breadcrumbs['@type'], 'BreadcrumbList')
    assert.equal(breadcrumbs.itemListElement.at(-1).item, page.url)
    assert.deepEqual(breadcrumbs.itemListElement.map((item) => item.position),
      breadcrumbs.itemListElement.map((_, position) => position + 1))
    assert.equal('datePublished' in page, false, 'do not invent publication dates')
    assert.equal('author' in page, false, 'do not invent article authors')
  }
  const preview = studyMaterialStructuredDataForPath(paths[0], 'https://preview.example')
  assert.equal(preview['@graph'][0].url, `https://preview.example${paths[0]}`)
  for (const path of ['/study-material/optional/unknown', `${paths[0]}/unknown`, `${paths[1]}/extra`, '/account']) {
    assert.equal(studyMaterialStructuredDataForPath(path), null, path)
  }
})

// Run the actual RouteSeo effect against a small head fixture. React/router
// hooks and chunk recovery are fixtures. The deferred module exports the real
// shared metadata functions after a controllable import gate; route definitions
// and robots policy are bundled from application source. This catches the old
// pattern-route schema removal and late-import navigation races.
let fixtureId = 0

async function routeSeoFixture({ waitForStudyMetadata } = {}) {
  const result = await build({
    entryPoints: ['src/components/RouteSeo.tsx'], bundle: true, write: false,
    format: 'esm', platform: 'node', tsconfig: 'tsconfig.app.json',
    banner: { js: `// Independent route fixture ${++fixtureId}` },
    plugins: [{
      name: 'seo-effect-hooks',
      setup(builder) {
        builder.onResolve({ filter: /studyMaterialMeta\.mjs$/ }, ({ kind }) => kind === 'dynamic-import'
          ? { path: 'study-metadata', namespace: 'test-study-metadata' } : null)
        builder.onLoad({ filter: /.*/, namespace: 'test-study-metadata' }, () => ({
          contents: `
            await globalThis.__cssvWaitForStudyMetadata?.()
            export const studyMaterialMetaForPath = globalThis.__cssvStudyMetadata.studyMaterialMetaForPath
            export const studyMaterialStructuredDataForPath = globalThis.__cssvStudyMetadata.studyMaterialStructuredDataForPath
          `,
        }))
        builder.onResolve({ filter: /chunkRecovery$/ }, () => ({ path: 'chunk-recovery', namespace: 'test-recovery' }))
        builder.onLoad({ filter: /.*/, namespace: 'test-recovery' }, () => ({
          contents: 'export const recoverFromDynamicImport = error => { globalThis.__cssvRecoveryCalls.push(error); return false }',
        }))
        builder.onResolve({ filter: /^(react|react-router)$/ }, (args) => ({ path: args.path, namespace: 'test-hooks' }))
        builder.onLoad({ filter: /.*/, namespace: 'test-hooks' }, ({ path }) => ({
          contents: path === 'react'
            ? 'export const useEffect = callback => { globalThis.__cssvSeoCleanup?.(); globalThis.__cssvSeoCleanup = callback() }'
            : 'export const useLocation = () => globalThis.__cssvSeoLocation',
        }))
      },
    }],
  })
  const previous = Object.fromEntries(['document', 'window', '__cssvSeoLocation', '__cssvSeoCleanup', '__cssvWaitForStudyMetadata', '__cssvStudyMetadata', '__cssvRecoveryCalls']
    .map((key) => [key, { exists: Object.hasOwn(globalThis, key), value: globalThis[key] }]))
  const nodes = new Set()
  const node = () => ({
    id: '', text: '', attributes: {},
    get textContent() { return this.text },
    set textContent(value) { this.text = value },
    setAttribute(name, value) { this.attributes[name] = value },
    getAttribute(name) { return this.attributes[name] ?? null },
    remove() { nodes.delete(this) },
  })
  const metas = new Map(['robots', 'description', 'og:title', 'og:description', 'og:url', 'twitter:title', 'twitter:description']
    .map((name) => [name, node()]))
  metas.get('robots').setAttribute('content', 'noindex, follow')
  for (const [name, item] of metas) {
    item.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    nodes.add(item)
  }
  const canonical = node()
  canonical.setAttribute('rel', 'canonical')
  canonical.setAttribute('href', `https://www.css-vista.com${paths[1]}`)
  nodes.add(canonical)
  const schema = node()
  schema.id = 'cssv-route-structured-data'
  schema.text = JSON.stringify(studyMaterialStructuredDataForPath(paths[1]))
  nodes.add(schema)
  const cleanup = () => {
    globalThis.__cssvSeoCleanup?.()
    for (const [key, saved] of Object.entries(previous)) {
      if (saved.exists) globalThis[key] = saved.value
      else delete globalThis[key]
    }
  }
  try {
    globalThis.__cssvSeoCleanup = undefined
    globalThis.__cssvWaitForStudyMetadata = waitForStudyMetadata
    globalThis.__cssvStudyMetadata = { studyMaterialMetaForPath, studyMaterialStructuredDataForPath }
    globalThis.__cssvRecoveryCalls = []
    globalThis.window = { location: { pathname: paths[1] } }
    globalThis.document = {
      title: studyMaterialMetaForPath(paths[1]).title,
      getElementById: (id) => [...nodes].find((item) => item.id === id) ?? null,
      createElement: node,
      head: { appendChild: (item) => nodes.add(item) },
      querySelector(selector) {
        const match = /\[(name|property|rel)="([^"]+)"\]/.exec(selector)
        return match ? [...nodes].find((item) => item.attributes[match[1]] === match[2]) ?? null : null
      },
    }
    const { default: RouteSeo } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)
    return {
      RouteSeo, canonical, metas, node, nodes, cleanup,
      navigate(pathname, search = '') {
        globalThis.__cssvSeoLocation = { pathname, search }
        RouteSeo()
      },
    }
  } catch (error) {
    cleanup()
    throw error
  }
}

// Let the dynamic import and its promise handlers settle; this is an event-loop
// turn, not a timer-based assertion about network speed.
const metadataSettled = () => new Promise((resolve) => setImmediate(resolve))

test('RouteSeo retains study-material schema on hydration and replaces it on navigation', async () => {
  const fixture = await routeSeoFixture()
  const { RouteSeo, canonical, metas, node, nodes } = fixture
  try {
    for (const path of [paths[1], paths[2], paths[3], paths[0]]) {
      globalThis.__cssvSeoLocation = { pathname: path, search: '' }
      RouteSeo()
      await metadataSettled()
      const actual = JSON.parse(globalThis.document.getElementById('cssv-route-structured-data').text)
      assert.deepEqual(actual, studyMaterialStructuredDataForPath(path))
      assert.equal(globalThis.document.title, studyMaterialMetaForPath(path).title)
      assert.equal(canonical.attributes.href, `https://www.css-vista.com${path}`)
    }
    // The server's per-page noindex decision must survive the first hydration.
    globalThis.__cssvSeoLocation = { pathname: paths[1], search: '' }
    RouteSeo()
    await metadataSettled()
    assert.equal(metas.get('robots').attributes.content, 'noindex, follow')
    for (const path of ['/this-page-does-not-exist', `${paths[0]}/unknown-topic`, '/study-material/islamic-studies/unknown-chapter']) {
      globalThis.__cssvSeoLocation = { pathname: path, search: '' }
      RouteSeo()
      await metadataSettled()
      assert.equal(globalThis.document.getElementById('cssv-route-structured-data'), null, path)
      assert.equal(globalThis.document.querySelector('link[rel="canonical"]'), null, path)
      assert.equal(globalThis.document.querySelector('meta[property="og:url"]'), null, path)
      assert.match(metas.get('robots').attributes.content, /noindex/, path)
      assert.equal(globalThis.document.title, 'Page Not Found | CSS Vista', path)
    }
    // Valid navigation after an error must recreate the removed head nodes.
    globalThis.__cssvSeoLocation = { pathname: paths[3], search: '' }
    RouteSeo()
    await metadataSettled()
    assert.equal(globalThis.document.querySelector('link[rel="canonical"]').attributes.href, `https://www.css-vista.com${paths[3]}`)
    assert.equal(globalThis.document.querySelector('meta[property="og:url"]').attributes.content, `https://www.css-vista.com${paths[3]}`)
    globalThis.__cssvSeoLocation = { pathname: '/book-summaries/unknown-book', search: '' }
    RouteSeo()
    assert.equal(globalThis.document.getElementById('cssv-route-structured-data'), null, 'a dynamic reader must not retain the previous topic schema while it loads or rejects an ID')
    assert.equal(globalThis.document.querySelector('link[rel="canonical"]').attributes.href, 'https://www.css-vista.com/book-summaries/unknown-book')
    // Metadata owned by a real detail component must survive the layout effect.
    const detailSchema = node()
    detailSchema.id = 'cssv-route-structured-data'
    detailSchema.textContent = JSON.stringify({ '@type': 'Article', url: 'https://www.css-vista.com/book-summaries/why-nations-fail' })
    nodes.add(detailSchema)
    globalThis.__cssvSeoLocation = { pathname: '/book-summaries/why-nations-fail', search: '' }
    RouteSeo()
    assert.equal(globalThis.document.getElementById('cssv-route-structured-data'), detailSchema)
    globalThis.__cssvSeoLocation = { pathname: '/', search: '' }
    RouteSeo()
    assert.equal(globalThis.document.getElementById('cssv-route-structured-data'), null, 'do not retain a previous topic schema on the homepage')
  } finally {
    fixture.cleanup()
  }
})

const headSnapshot = (fixture) => ({
  title: document.title,
  nodes: [...fixture.nodes].map(({ id, text, attributes }) => ({ id, text, attributes: { ...attributes } })),
})

test('non-study routes do not request the study metadata indexes', async () => {
  let importCalls = 0
  const fixture = await routeSeoFixture({ waitForStudyMetadata: () => { importCalls++ } })
  try {
    for (const path of ['/', '/grammar-course', '/study-material/optional', '/study-material/islamic-studies', '/book-summaries/why-nations-fail']) {
      fixture.navigate(path)
      await metadataSettled()
    }
    assert.equal(importCalls, 0)
  } finally {
    fixture.cleanup()
  }
})

test('a delayed study import preserves the prerendered head and cannot replace a later route', async () => {
  let release
  const pending = new Promise((resolve) => { release = resolve })
  const fixture = await routeSeoFixture({ waitForStudyMetadata: () => pending })
  try {
    const prerender = headSnapshot(fixture)
    fixture.navigate(paths[1])
    await metadataSettled()
    assert.deepEqual(headSnapshot(fixture), prerender, 'do not replace valid static metadata with a generic pattern or loading state')
    fixture.navigate('/grammar-course')
    const nextPage = headSnapshot(fixture)
    release()
    await metadataSettled()
    assert.deepEqual(headSnapshot(fixture), nextPage, 'a previous study URL cannot change the next page after its import resolves')
    // The already downloaded module remains usable on later study navigation.
    fixture.navigate(paths[2])
    await metadataSettled()
    assert.equal(document.title, studyMaterialMetaForPath(paths[2]).title)
    assert.deepEqual(JSON.parse(document.getElementById('cssv-route-structured-data').text), studyMaterialStructuredDataForPath(paths[2]))
  } finally {
    release()
    fixture.cleanup()
  }
})

test('a canceled failed metadata import cannot refresh or alter the next route', async () => {
  let reject
  const pending = new Promise((_, rejectPending) => { reject = rejectPending })
  const fixture = await routeSeoFixture({ waitForStudyMetadata: () => pending })
  const originalError = console.error
  const errors = []
  console.error = (...args) => errors.push(args)
  try {
    fixture.navigate(paths[1])
    await metadataSettled()
    fixture.navigate('/')
    const nextPage = headSnapshot(fixture)
    reject(new Error('Failed to fetch dynamically imported module'))
    await metadataSettled()
    assert.deepEqual(headSnapshot(fixture), nextPage)
    assert.deepEqual(globalThis.__cssvRecoveryCalls, [], 'do not reload the page the visitor navigated to')
    assert.deepEqual(errors, [])
  } finally {
    console.error = originalError
    fixture.cleanup()
  }
})

test('an active metadata import failure preserves valid static metadata and uses chunk recovery', async () => {
  const error = new Error('Failed to fetch dynamically imported module')
  const fixture = await routeSeoFixture({ waitForStudyMetadata: () => Promise.reject(error) })
  const originalError = console.error
  const errors = []
  console.error = (...args) => errors.push(args)
  try {
    const prerender = headSnapshot(fixture)
    fixture.navigate(paths[1])
    await metadataSettled()
    assert.deepEqual(headSnapshot(fixture), prerender, 'an import failure is not evidence of an unknown topic')
    assert.deepEqual(globalThis.__cssvRecoveryCalls, [error])
    assert.deepEqual(errors, [['Unable to load study-material metadata.', error]], 'report a failure when recovery cannot start')
  } finally {
    console.error = originalError
    fixture.cleanup()
  }
})

test('deferred study metadata retains tracking-query and noindex policy', async () => {
  const fixture = await routeSeoFixture()
  try {
    fixture.navigate(paths[2], '?UTM_source=newsletter&gclid=example')
    await metadataSettled()
    assert.doesNotMatch(fixture.metas.get('robots').attributes.content, /noindex/)
    assert.equal(document.querySelector('link[rel="canonical"]').attributes.href, `https://www.css-vista.com${paths[2]}`)
    fixture.navigate(paths[2], '?filter=example')
    await metadataSettled()
    assert.equal(fixture.metas.get('robots').attributes.content, 'noindex, follow')
    assert.equal(document.title, studyMaterialMetaForPath(paths[2]).title)
    fixture.navigate(paths[2])
    await metadataSettled()
    assert.doesNotMatch(fixture.metas.get('robots').attributes.content, /noindex/)
  } finally {
    fixture.cleanup()
  }
})
