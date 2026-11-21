import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const tutorialData = read('../src/data/tutorialVideo.ts')
const card = read('../src/components/TutorialVideoCard.tsx')
const home = read('../src/pages/Home.tsx')
const studentDashboard = read('../src/pages/AccountHome.tsx')
const introduction = read('../src/components/TutorialAnnouncement.tsx')

test('featured tutorial remains the primary video on both public and student homepages', () => {
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

test('featured thumbnail and text link both open the official tutorial', () => {
  assert.match(card, /<a[\s\S]*?href=\{CSS_VISTA_TUTORIAL_URL\}[\s\S]*?<img[\s\S]*?src=\{CSS_VISTA_TUTORIAL_THUMBNAIL_URL\}/)
  assert.match(card, /Watch the tutorial/)
  assert.match(card, /aria-label="How to use CSS Vista tutorial"/)
})

test('three earlier tutorial links have matching YouTube thumbnails inside a collapsed disclosure', () => {
  for (const id of ['pw9U9nvRsqs', '2-w9_OsO06Q', 'RawGyL7BkEk']) {
    assert.match(tutorialData, new RegExp(`https://youtu\\.be/${id}`))
    assert.match(tutorialData, new RegExp(`https://i\\.ytimg\\.com/vi/${id}/hqdefault\\.jpg`))
  }
  assert.match(card, /<details[^>]*>[\s\S]*?<summary/)
  assert.match(card, /Previous tutorial videos/)
  assert.match(card, /CSS_VISTA_PREVIOUS_TUTORIALS\.map/)
  assert.match(card, /href=\{tutorial\.url\}/)
  assert.match(card, /src=\{tutorial\.thumbnailUrl\}/)
  assert.match(card, /loading="lazy"/)
})
