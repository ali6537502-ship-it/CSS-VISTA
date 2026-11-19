import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NOTES_RELEASED } from '../../src/features/notes/availability.ts'
import { sections, features } from '../../src/features/workspace/registry.ts'

const root=process.cwd()
test('students can find My Notes while cloud saving stays disabled by default',()=>{
  assert.equal(NOTES_RELEASED,false,'cloud feature flag must default to off')
  assert.equal(sections.some(section=>section.id==='notes'),true,'sidebar should always contain My Notes')
  assert.equal(features.some(feature=>feature.to==='/account/notes'),true,'workspace directory should link to My Notes')
  const app=readFileSync(resolve(root,'src/App.tsx'),'utf8')
  assert.match(app,/NotesProtectionPending/,'disabled route must show truthful recovery status')
})

test('private notes backend is fail-closed independently of client navigation',()=>{
  const php=readFileSync(resolve(root,'public/api/student/notes.php'),'utf8')
  assert.match(php,/CSSV_NOTES_ENABLED/)
  assert.match(php,/CSSV_NOTES_ENABLED','0'/)
  assert.match(php,/personal_notes_not_enabled/)
  assert.match(php,/cssv_require_csrf\(\$session\)/)
  assert.match(php,/cssv_require_user\(\$pdo\)/)
})

test('public study notes catalogue is separate from protected personal notebooks',()=>{
  const app=readFileSync(resolve(root,'src/App.tsx'),'utf8')
  assert.match(app,/path="\/notes"/)
  assert.match(app,/path="\/account\/notes"/)
  assert.match(app,/NOTES_RELEASED \?/)
})
