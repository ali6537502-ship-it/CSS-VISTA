import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findRouteDefinition } from '../src/data/routeRegistry.mjs'

test('paused Current Affairs subject cannot advertise or be published to search', () => {
 const route = findRouteDefinition('/subjects/compulsory/current-affairs')
 assert.equal(route.indexable, false)
 assert.equal(route.sitemap, false)
 assert.equal(route.adMode, 'disabled')
})
test('deployed subject artifact is an ad-free paused document', () => {
 const page = readFileSync(new URL('../dist/seo/routes/subjects--compulsory--current-affairs.html', import.meta.url),'utf8')
 assert.match(page, /CSS Vista Pro is temporarily unavailable/)
 assert.match(page, /name="robots" content="noindex, follow"/)
 assert.doesNotMatch(page, /pagead\/js\/adsbygoogle\.js/)
 assert.doesNotMatch(page, /Topic-wise syllabus breakdown/)
})
