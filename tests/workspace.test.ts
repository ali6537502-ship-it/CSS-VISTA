import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { completedSourceTopics, compulsoryCatalogue, topicCoverage, targetDays, optionalCatalogue } from '../src/features/workspace/model.ts'
import { validateSubjectCombination } from '../src/lib/subjectSelection.ts'
import { activeSection, featureState, features, searchFeatures } from '../src/features/workspace/registry.ts'
test('completed personal and imported tasks do not masquerade as syllabus source progress', () => {
  const statuses = { 'manual:private-task': 'completed', 'ai-schedule:imported-task': 'completed', 'political-science:0:0': 'completed', 'current-affairs:1:2': 'in-progress' }
  assert.equal(completedSourceTopics(statuses), 1)
  assert.equal(completedSourceTopics({ 'manual:only-task': 'completed' }), 0)
  assert.equal(completedSourceTopics(undefined), 0)
  assert.equal(statuses['manual:private-task'], 'completed', 'Presentation does not change stored task history')
})
test('six compulsory slots preserve the alternative without double counting', () => {
  for (const alternative of [false,true]) {
    const slots = compulsoryCatalogue(alternative)
    assert.equal(slots.length,6); assert.equal(slots.reduce((n,s)=>n+s.marks,0),600)
    assert.equal(slots[0].slug,'essay'); assert.equal(slots[5].slug,alternative ? 'comparative-religions' : 'islamic-studies')
  }
})
test('sample and another valid optional selection use the established group validator', () => {
  for (const names of [['Political Science','Criminology','European History','Punjabi','Environmental Sciences'],['International Relations','International Law','History of USA','Sociology','Gender Studies']]) {
    assert.equal(validateSubjectCombination(names.map(name=>optionalCatalogue.find(s=>s.name===name)!)).valid,true)
  }
  assert.equal(validateSubjectCombination(optionalCatalogue.filter(s=>['Political Science','International Relations'].includes(s.name))).valid,false)
})
test('coverage uses original item identifiers and never invents missing details', () => {
  const data = JSON.parse(readFileSync(new URL('../public/fpsc-syllabus.json',import.meta.url),'utf8'))
  const political = data.subjects.find((s:{slug:string})=>s.slug==='political-science')
  assert.equal(topicCoverage(political,{'political-science:0:0':'completed','another:0:0':'completed'}).completed,1)
  assert.equal(topicCoverage(data.subjects.find((s:{slug:string})=>s.slug==='punjabi'),{}).percent,null)
  assert.equal(topicCoverage(undefined,{}).total,0)
})
test('date-only targets distinguish invalid, present and past days', () => {
  assert.equal(targetDays('2026-10-25','2026-10-25'),0)
  assert.equal(targetDays('2026-10-24','2026-10-25'),-1)
  assert.equal(targetDays('2026-02-30','2026-10-25'),null)
  assert.equal(targetDays('2027','2026-10-25'),null)
})
test('registry deduplicates routes, searches aliases and preserves pause policy', () => {
  assert.equal(new Set(features.map(f=>f.to)).size,features.length)
  assert.ok(searchFeatures('precis').some(f=>f.to==='/account/precis'))
  assert.ok(features.some(f=>f.to==='/account/precis' && f.title==='CSS Vista Preci Mentor'))
  assert.ok(searchFeatures('daily pdf').some(f=>f.to==='/current-affairs-daily'))
  assert.equal(featureState(features.find(f=>f.to==='/account/precis')!,true),'free','Preci Mentor must remain free while other Pro features are paused')
  assert.equal(featureState(features.find(f=>f.to==='/mpt')!,false),'paused')
  assert.equal(featureState(features.find(f=>f.to==='/daily-briefing')!,true),'free')
  assert.equal(activeSection('/account/plan'),'plan');assert.equal(activeSection('/account/answer-performance'),'performance')
})

test('subject search destinations resolve original syllabus identifiers', () => {
  const data = JSON.parse(readFileSync(new URL('../public/fpsc-syllabus.json',import.meta.url),'utf8'))
  for (const feature of features.filter(f => f.category === 'Subjects')) {
    const slug = new URL(feature.to,'https://www.css-vista.com').searchParams.get('subject')
    assert.ok(data.subjects.some((s:{slug:string;name:string}) => s.slug === slug && s.name === feature.title), feature.title)
  }
})

test('planner goals and scheduling are discoverable through the canonical workspace registry', () => {
  assert.ok(searchFeatures('study goals').some(feature => feature.id === 'plan' && feature.to === '/account/tasks'))
  assert.ok(searchFeatures('import schedule').some(feature => feature.id === 'plan'))
})
