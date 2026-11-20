import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NOTES_RELEASED } from '../../src/features/notes/availability.ts'
import { sections, features } from '../../src/features/workspace/registry.ts'

const root=process.cwd()
test('student notes editor and lesson paste are available under native account permissions',()=>{
  assert.equal(NOTES_RELEASED,true,'student Notes editor should be released')
  assert.equal(sections.some(section=>section.id==='notes'),true,'sidebar should contain My Notes')
  assert.equal(features.some(feature=>feature.to==='/account/notes'),true,'workspace directory should link to My Notes')
  const app=readFileSync(resolve(root,'src/App.tsx'),'utf8')
  assert.match(app,/path="\/account\/notes"/)
  assert.match(app,/<ProfileGate>/,'protected account routes must retain the profile gate')
  const capture=readFileSync(resolve(root,'src/features/notes/LessonNotesCapture.tsx'),'utf8')
  assert.match(capture,/lesson_capture/,'lesson paste must target private Notes')
})

test('private Notes API requires authenticated user and CSRF for writing',()=>{
  const php=readFileSync(resolve(root,'public/api/student/notes.php'),'utf8')
  assert.match(php,/cssv_require_user\(\$pdo\)/)
  assert.match(php,/cssv_require_csrf\(\$session\)/)
  assert.match(php,/cssv_notes_schema\(\$pdo\)/)
  assert.doesNotMatch(php,/personal_notes_not_enabled|CSSV_NOTES_ENABLED/,'manual backup choice must not silently lock the editor')
})

test('public reference notes catalogue remains separate from personal account notebook',()=>{
  const app=readFileSync(resolve(root,'src/App.tsx'),'utf8')
  assert.match(app,/path="\/notes"/)
  assert.match(app,/path="\/account\/notes"/)
})
