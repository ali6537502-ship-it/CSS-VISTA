import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findRouteDefinition } from '../src/data/routeRegistry.mjs'

test('free Current Affairs subject retains its search and advertising exclusions', () => {
 const route = findRouteDefinition('/subjects/compulsory/current-affairs')
 assert.equal(route.indexable, false)
 assert.equal(route.sitemap, false)
 assert.equal(route.adMode, 'disabled')
})
test('deployed subject artifact contains the free guide without a Pro notice', () => {
 const page = readFileSync(new URL('../dist/seo/routes/subjects--compulsory--current-affairs.html', import.meta.url),'utf8')
 assert.doesNotMatch(page, /CSS Vista Pro is temporarily unavailable|Pro remains paused/)
 assert.match(page, /name="robots" content="noindex, follow"/)
 assert.doesNotMatch(page, /pagead\/js\/adsbygoogle\.js/)
 assert.match(page, /Topic-wise syllabus breakdown/)
})
