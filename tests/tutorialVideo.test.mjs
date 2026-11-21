import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const tutorialData = read('../src/data/tutorialVideo.ts')
const card = read('../src/components/TutorialVideoCard.tsx')
const home = read('../src/pages/Home.tsx')
const studentDashboard = read('../src/pages/AccountHome.tsx')
const introduction = read('../src/components/TutorialAnnouncement.tsx')

test('one official tutorial URL and video ID are used across both entry points', () => {
  assert.match(tutorialData, /TdRfMW-DxO8/)
  assert.match(tutorialData, /https:\/\/youtu\.be\/TdRfMW-DxO8/)
  assert.match(card, /CSS_VISTA_TUTORIAL_THUMBNAIL_URL/)
  assert.match(card, /CSS_VISTA_TUTORIAL_URL/g)
  assert.match(card, /target="_blank"/)
  assert.match(card, /rel="noopener noreferrer"/)
  assert.match(home, /<TutorialVideoCard className="mt-4"\s*\/>/)
  assert.match(studentDashboard, /<TutorialVideoCard className="mb-5"\s*\/>/)
  assert.match(introduction, /CSS_VISTA_TUTORIAL_EMBED_URL/)
  assert.doesNotMatch(introduction, /RawGyL7BkEk/)
})

test('thumbnail and text link both reach the tutorial instead of a decorative play control', () => {
  assert.match(card, /<a[\s\S]*?href=\{CSS_VISTA_TUTORIAL_URL\}[\s\S]*?<img[\s\S]*?src=\{CSS_VISTA_TUTORIAL_THUMBNAIL_URL\}/)
  assert.match(card, /Watch the tutorial/)
  assert.match(card, /aria-label="How to use CSS Vista tutorial"/)
})
