import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { JSDOM } from 'jsdom'

const studio = fs.readFileSync('public/gsa-tutor/studio.html', 'utf8')
const planner = fs.readFileSync('public/gsa-tutor/course-plan.js', 'utf8')
const key = 'cssvista:tool:gsa-tutor:v1'

function open(saved) {
  const options = {
    url: 'https://www.css-vista.com/gsa-tutor/studio.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    ...(saved ? {beforeParse(window) {window.localStorage.setItem(key, JSON.stringify(saved))}} : {}),
  }
  // The hosted planner is a separate static script. Run it after the book.
  const dom = new JSDOM(studio.replace('<script src="/gsa-tutor/course-plan.js"></script>', ''), options)
  dom.window.eval(planner)
  return dom
}

test('every duration schedules all 141 lessons exactly once', () => {
  const dom = open()
  const {document} = dom.window
  const lessons = dom.window.CSSVistaGSA.allSections
  assert.equal(lessons.length, 141)
  assert.equal(dom.window.CSSVistaGSA.DATA.chapters.length, 28)
  for (const days of [8, 14, 20, 30, 45, 60, 120]) {
    document.querySelector('#nav-course').click()
    if (document.querySelector('#gsa-change')) document.querySelector('#gsa-change').click()
    const custom = document.querySelector('#gsa-custom')
    custom.value = String(days)
    custom.dispatchEvent(new dom.window.Event('change', {bubbles:true}))
    document.querySelector('#gsa-save-plan').click()
    assert.equal(document.querySelectorAll('.gsa-day').length, days)
    const shown = [...document.querySelectorAll('.gsa-day-lesson')].map(button => button.dataset.open)
    assert.equal(shown.length, 141)
    assert.equal(new Set(shown).size, 141)
    assert.ok([...document.querySelectorAll('.gsa-day')].every(day => day.querySelectorAll('.gsa-day-lesson').length >= 1))
  }
  dom.window.close()
})

test('rescheduling preserves progress, bookmarks and revision records', () => {
  const dom = open()
  const {document} = dom.window
  document.querySelector('[data-gsa-days="8"]').click()
  document.querySelector('#gsa-save-plan').click()
  const first = dom.window.CSSVistaGSA.allSections[0].id
  const saved = dom.window.CSSVistaGSA.getSaved()
  saved.completed[first] = {at: new Date('2026-10-30').toISOString()}
  saved.revisit[first] = {kind:'lesson'}
  saved.bookmarks[first] = true
  dom.window.CSSVistaGSA.persist()
  document.querySelector('#gsa-change').click()
  document.querySelector('[data-gsa-days="60"]').click()
  document.querySelector('#gsa-save-plan').click()
  assert.equal(dom.window.CSSVistaGSA.getSaved().plan.days, 60)
  assert.ok(dom.window.CSSVistaGSA.getSaved().completed[first])
  assert.ok(dom.window.CSSVistaGSA.getSaved().revisit[first])
  assert.ok(dom.window.CSSVistaGSA.getSaved().bookmarks[first])
  const restored = open(JSON.parse(dom.window.localStorage.getItem(key)))
  assert.equal(restored.window.CSSVistaGSA.getSaved().plan.days, 60)
  restored.window.close()
  dom.window.close()
})

test('hydrating another account replaces rather than leaks old lesson progress', () => {
  const dom = open()
  const first = dom.window.CSSVistaGSA.allSections[0].id
  dom.window.CSSVistaGSA.getSaved().completed[first] = {at:'2026-10-30'}
  dom.window.CSSVistaGSA.updateFromAccount({completed:{},revisit:{},bookmarks:{},plan:null})
  assert.equal(Object.keys(dom.window.CSSVistaGSA.getSaved().completed).length, 0)
  dom.window.close()
})
