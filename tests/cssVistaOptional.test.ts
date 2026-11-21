import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildMissingCssOptionalSourceCommand, buildVistaNotesCommand, cssGuideSubjects,
  cssOptionalFocusUnits, guideUnits,
} from '../src/features/planner/vistaGuideModel.ts'
import { cssVistaSubjectMeta } from '../src/data/cssVistaMeta.mjs'
import { findRouteDefinition } from '../src/data/routeRegistry.mjs'

type Entry = { title: string; items: string[] }
type Paper = { slug: string; name: string; designation: 'optional'; group: number; marks: number; sections: Entry[]; pages?: number[]; scanPages?: string[] }
const source = JSON.parse(readFileSync('public/fpsc-syllabus.json','utf8'))
const bundled = JSON.parse(readFileSync('src/data/bundled/css-vista-syllabus.json','utf8'))
const original = source.subjects.filter((paper:Paper)=>paper.designation==='optional') as Paper[]
const published = bundled.subjects as Paper[]

test('all 45 CSS optional papers appear with exactly their source wording and original order',()=>{
  assert.equal(published.length,45)
  assert.equal(cssVistaSubjectMeta.length,45)
  assert.equal(new Set(published.map(p=>p.slug)).size,45)
  assert.deepEqual(bundled.source,source.source)
  assert.deepEqual(published,original)
  assert.deepEqual(cssVistaSubjectMeta.map(p=>p.slug),published.map(p=>p.slug))
  assert.equal(published.reduce((n,p)=>n+p.sections.length,0),492)
  assert.equal(published.reduce((n,p)=>n+p.sections.reduce((sum,s)=>sum+s.items.length,0),0),2010)
})

test('every transcribed CSS optional has a topic command and source-entry copy actions',()=>{
  for(const paper of published) {
    const guide = cssGuideSubjects({subjects:[paper]}).find(p=>p.id===paper.slug)
    assert.ok(guide,paper.name)
    const units = guideUnits(guide!,'css')
    if(!paper.sections.length) {
      assert.deepEqual(units,[],paper.name)
      assert.equal(paper.scanPages?.length,2,paper.name)
      assert.match(buildMissingCssOptionalSourceCommand(paper.name),/DO NOT invent/)
      continue
    }
    assert.ok(units.length>0,paper.name)
    for(const unit of units) {
      const command=buildVistaNotesCommand(unit)
      assert.match(command,/ASSIGNED TOPIC:/,paper.name)
      assert.ok(command.includes(paper.name),paper.name)
    }
    for(const [i,section] of guide!.sections.entries()){
      const entries=cssOptionalFocusUnits(guide!,section)
      assert.equal(entries.length,paper.sections[i].items.filter(Boolean).length,paper.name+': '+section.title)
      for(const entry of entries){
        const command=buildVistaNotesCommand(entry)
        assert.ok(command.includes(entry.title),paper.name)
        assert.match(command,/COMPLETE SECTION TEXT FOR CONTEXT ONLY/,paper.name)
      }
    }
  }
})

test('all 45 public CSS subject URLs are routed and 3 untranscribed scan-only pages avoid indexing',()=>{
  const app=readFileSync('src/App.tsx','utf8')
  const prerender=readFileSync('scripts/prerender/routes.tsx','utf8')
  const navbar=readFileSync('src/components/Layout.tsx','utf8')
  const subjects=readFileSync('src/pages/account/Subjects.tsx','utf8')
  assert.match(app,/path="\/css-vista"/)
  assert.match(app,/path="\/css-vista\/syllabus\/:subject"/)
  assert.match(prerender,/cssVistaOptionals\.map/)
  assert.match(navbar,/CSS Vista — Optional Topic Guides/)
  assert.match(subjects,/Browse every optional paper/)
  assert.equal(findRouteDefinition('/css-vista')?.indexable,true)
  for(const paper of published) {
    const route=findRouteDefinition('/css-vista/syllabus/'+paper.slug)
    assert.ok(route,paper.name)
    assert.equal(route?.access,'public',paper.name)
    assert.equal(route?.indexable,!!paper.sections.length,paper.name)
    assert.equal(route?.sitemap,!!paper.sections.length,paper.name)
  }
})
