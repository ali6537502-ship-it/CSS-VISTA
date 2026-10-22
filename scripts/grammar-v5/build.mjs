import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const root = new URL('../../', import.meta.url), input = new URL('content/grammar/v5/', root), output = new URL('public/grammar/v5/', root)
const read = async p => JSON.parse(await readFile(p, 'utf8'))
const check = process.argv.includes('--check'), release = process.argv.includes('--release'), partial = process.argv.includes('--partial')
if (partial && (check || release)) throw new Error('Partial output is development-only and cannot pass verification or release.')
const hash = s => createHash('sha256').update(s).digest('hex'), words = x => String(x).trim().split(/\s+/u).filter(Boolean).length
const plain = x => typeof x === 'string' ? x : Array.isArray(x) ? x.map(plain).join(' ') : x && typeof x === 'object' ? Object.values(x).map(plain).join(' ') : ''
const requireText = (x, label) => assert.equal(typeof x === 'string' && x.trim().length > 0, true, `${label}: required authored text missing`)
const expected = await read(new URL('docs/grammar-reconstruction/curriculum-map.json', root))
const errorTaxonomy = await read(new URL('scripts/grammar-v5/error-categories.json', root))
const categoryByConcept = new Map(Object.entries(errorTaxonomy.conceptGroups).flatMap(([category, ids]) => ids.map(id => [`gv5-${id}`, category])))
const days = [], extensions = [], assessments = [], sourceHashes = {}
for (let n = 1; n <= 30; n++) {
 const file = `day-${String(n).padStart(2, '0')}.json`
 try { const raw = await readFile(new URL(file, input), 'utf8'); sourceHashes[file] = hash(raw); days.push(JSON.parse(raw)) }
 catch (e) { if (!partial) throw new Error(`Missing/invalid authored Day ${n}: ${e.message}`) }
}
for (const file of (await readdir(input)).filter(f => /^reference-.*\.json$/.test(f))) { const raw = await readFile(new URL(file, input), 'utf8'); sourceHashes[file] = hash(raw); extensions.push({ file: file.replace('.json', ''), data: JSON.parse(raw) }) }
for (const id of ['diagnostic', 'phase-1', 'phase-2', 'phase-3', 'phase-4']) { const file = `${id}.json`, raw = await readFile(new URL(file, input), 'utf8'); sourceHashes[file] = hash(raw); assessments.push(JSON.parse(raw)) }
if (!partial) assert.equal(days.length, 30)
const allIds = new Set(), concepts = new Map(), sources = new Map(), bank = [], manifests = [], coverage = [], objectivePrompts = new Map(), responsePrompts = new Map(), warnings = []
for (const day of expected.days) for (const topic of day.subtopics) id(topic.id, 'curriculum topic ID')
for (const extension of expected.permanentExtensions) for (const topic of extension.coverageIds) id(topic, 'extension topic ID')
function id(value, label) { requireText(value, label); assert(!allIds.has(value), `Duplicate stable identifier: ${value}`); allIds.add(value) }
function sourcesFor(document) {
 const aliases = new Map()
 for (const s of document.sources ?? []) {
  for (const key of ['id', 'title', 'url', 'consulted', 'note']) requireText(s[key], `source.${key}`)
  assert(/^https:\/\//.test(s.url), `Invalid source URL ${s.url}`)
  const canonical = `source-${hash(s.url).slice(0, 14)}`; aliases.set(s.id, canonical)
  if (!sources.has(canonical)) sources.set(canonical, { ...s, id: canonical })
 }
 return aliases
}
function mapSources(list, aliases, label) { assert(Array.isArray(list), `${label}: source IDs missing`); return [...new Set(list.map(s => { assert(aliases.has(s), `${label}: unregistered source ${s}`); return aliases.get(s) }))] }
function addModules(l, referenceFile) {
 const aliases = sourcesFor(l)
 assert(Array.isArray(l.modules) && l.modules.length >= 2, `${l.id}: insufficient substantive modules`)
 for (const m of l.modules) {
  id(m.id, 'module ID'); requireText(m.title, m.id); requireText(m.definition, `${m.id}.definition`)
  for (const depth of ['foundation', 'intermediate', 'advanced', 'expert']) { assert(Array.isArray(m[depth]) && m[depth].length, `${m.id}.${depth} missing`); m[depth].forEach(p => requireText(p, m.id)) }
  const count = words([m.definition, ...m.foundation, ...m.intermediate, ...m.advanced, ...m.expert].join(' ')); assert(count >= 300, `${m.id}: ${count} substantive definition/layer words; 300 minimum`)
  assert(m.examples?.length >= 3 && m.mistakes?.length >= 2 && m.contrasts?.length && m.exceptions?.length && m.patterns?.length && m.glossary?.length, `${m.id}: incomplete reference treatment`)
  for (const e of m.examples) { requireText(e.sentence, m.id); requireText(e.analysis, m.id) }
  for (const e of m.mistakes) for (const k of ['problem', 'repair', 'reason']) requireText(e[k], m.id)
  for (const c of m.contrasts) for (const k of ['a', 'b', 'note']) requireText(c[k], m.id)
  assert(m.taxonomy.every(t => /^[A-R]$/.test(t)) && m.taxonomy.length, `${m.id}: invalid taxonomy`)
  m.sourceIds = mapSources(m.sourceIds, aliases, m.id); assert(m.sourceIds.length, `${m.id}: missing consulted source`)
  concepts.set(m.id, { module: m, day: l.day, prerequisiteDays: l.prerequisiteDays, referenceFile, words: count })
 }
 return aliases
}
for (const l of days) {
 const e = expected.days[l.day - 1]; assert.equal(l.id, e.id); assert.equal(l.title, e.title); id(l.id, 'day ID')
 assert(l.outcomes?.length >= 4 && l.checklist?.length >= 4 && !l.editorialNotes?.length, `${l.id}: missing orientation/outcomes or unresolved editorial notes`)
 requireText(l.orientation, l.id); assert(l.prerequisiteDays.every(n => Number.isInteger(n) && n >= 1 && n < l.day), `${l.id}: prerequisite order invalid`)
 addModules(l)
 const wanted = e.subtopics.map(t => t.id), covered = l.modules.flatMap(m => m.coverageIds)
 for (const c of wanted) assert(covered.includes(c), `${l.id}: syllabus gap ${c}`)
 for (const c of covered) assert(wanted.includes(c), `${l.id}: invented/unmapped coverage ${c}`)
}
for (const { file, data } of extensions) { id(data.id, 'reference ID'); addModules(data, file) }
for (const extension of expected.permanentExtensions) {
 const actual = concepts.get(extension.id); assert(actual?.referenceFile === extension.resource, `Missing permanent extension: ${extension.id}`)
 assert.deepEqual(actual.module.coverageIds, extension.coverageIds, `Permanent extension coverage changed: ${extension.id}`)
}
const allTasks = l => [...l.questions, ...l.corrections, ...l.transformations, l.writing, ...l.recall]
function addItems(items, day, group, aliases, document) {
 for (const q of items) {
  id(q.id, 'question ID'); requireText(q.prompt, q.id); const c = concepts.get(q.conceptId); assert(c, `${q.id}: unknown concept ${q.conceptId}`)
  assert(['Foundation', 'Intermediate', 'Advanced', 'Expert Extension'].includes(q.difficulty), `${q.id}: invalid depth`)
  assert(['Recognition', 'Understanding', 'Application', 'Production and revision'].includes(q.ability), `${q.id}: invalid ability`)
  q.sourceIds = q.sourceIds?.length ? mapSources(q.sourceIds, aliases, q.id) : c.module.sourceIds
  const errorCategory = errorTaxonomy.itemOverrides[q.id] ?? categoryByConcept.get(q.conceptId)
  assert(errorTaxonomy.labels[errorCategory], `${q.id}: no reviewed error category`)
  const meta = { errorCategory, id: q.id, type: q.type, kind: q.kind, conceptId: q.conceptId, difficulty: q.difficulty, ability: q.ability, day, group }
  const signature = q.prompt.toLocaleLowerCase().replace(/[“”‘’"']/g, '').replace(/\s+/g, ' ').trim()
  if (q.type === 'objective') {
   assert(['choice', 'gap', 'spot'].includes(q.kind), `${q.id}: invalid objective format`)
   assert(q.options?.length === 4 && new Set(q.options.map(s => s.trim().toLowerCase())).size === 4, `${q.id}: options must be four distinct choices`)
   assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${q.id}: invalid answer key`); requireText(q.why, `${q.id}.why`)
   assert(!objectivePrompts.has(signature), `${q.id}: duplicate objective prompt with ${objectivePrompts.get(signature)}`); objectivePrompts.set(signature, q.id)
   assert(!/\b(?:option|answer|choice)\s+[A-D]\b|\b(?:first|second|third|fourth|last) (?:option|version|distractor)\b|\bthe (?:first|second|third|fourth|last) is\b/i.test(q.why), `${q.id}: position-dependent explanation needs editorial review`)
   Object.assign(meta, { answer: q.answer, options: 4 })
  } else {
   assert.equal(q.type, 'response'); requireText(q.model, `${q.id}.model`); assert(q.rubric?.length >= 2 && q.alternatives?.length, `${q.id}: response needs model, rubric and legitimate-alternative policy`)
   assert(['gap','multiple-gap','correction','transformation','combining','splitting','ordering','classification','function','comparison','paragraph-edit','writing','analysis'].includes(q.kind), `${q.id}: invalid open-response operation`)
   if (responsePrompts.has(signature)) warnings.push(`${q.id}: repeated response instruction also in ${responsePrompts.get(signature)}; verify distinct evidence`)
   responsePrompts.set(signature, q.id)
  }
  bank.push({ meta, item: q, document })
 }
}
for (const l of days) {
 const aliases = sourcesFor(l)
 const normal = l.day < 29; assert(l.questions.length >= (normal ? 25 : 36), `${l.id}: insufficient independent assessment`)
 assert(l.corrections.length >= 8 && l.transformations.length >= (normal ? 2 : 4) && l.recall.length >= 3, `${l.id}: insufficient productive practice`)
 for (const group of ['questions', 'corrections', 'transformations', 'recall']) addItems(l[group], l.day, group, aliases, l.id)
 addItems([l.writing], l.day, 'writing', aliases, l.id)
 const objective = l.questions.filter(q => q.type === 'objective').length
 assert(objective >= (normal ? 8 : 24), `${l.id}: insufficient objective coverage`)
 const essentialWords = l.modules.reduce((n, m) => n + words(plain({ definition: m.definition, foundation: m.foundation, intermediate: m.intermediate, patterns: m.patterns, examples: m.examples, contrasts: m.contrasts, exceptions: m.exceptions, mistakes: m.mistakes })), 0) + words(l.orientation)
 const extensionWords = l.modules.reduce((n,m) => n + words(plain({ advanced: m.advanced, expert: m.expert, glossary: m.glossary })), 0)
 manifests.push({ day: l.day, id: l.id, title: l.title, outcomes: l.outcomes, prerequisiteDays: l.prerequisiteDays, modules: l.modules.map(m => m.id), counts: { objective, response: l.questions.length - objective, corrections: l.corrections.length, transformations: l.transformations.length, recall: l.recall.length }, words: essentialWords + extensionWords, essentialMinutes: Math.ceil(essentialWords / 200), extensionMinutes: Math.ceil(extensionWords / 200) })
 for (const t of expected.days[l.day - 1].subtopics) {
  const ms = l.modules.filter(m => m.coverageIds.includes(t.id))
  coverage.push({ ...t, day: l.day, lesson: l.id, referenceEntries: ms.map(m => m.id), practice: allTasks(l).filter(q => ms.some(m => m.id === q.conceptId)).map(q => q.id), assessmentScope: 'Module-level practice; individual exceptions are not claimed to be independently calibrated subtests.' })
 }
}
for (const { file, data } of extensions) addItems(allTasks(data), 0, file, sourcesFor(data), data.id)
for (const a of assessments) { id(a.id, 'assessment ID'); requireText(a.orientation, a.id); addItems(a.items, 0, a.id, new Map(), a.id) }
for (const q of bank) if (q.meta.type === 'objective') q.meta.reinforcementId = bank.find(r => r.meta.type === 'response' && r.meta.conceptId === q.meta.conceptId && r.meta.kind !== 'writing')?.meta.id
const indexedConcepts = [...concepts.values()].map(c => ({ id: c.module.id, title: c.module.title, definition: c.module.definition, taxonomy: c.module.taxonomy, coverageIds: c.module.coverageIds, glossary: c.module.glossary, day: c.day, prerequisiteDays: c.prerequisiteDays, words: c.words, hasExceptions: true, searchText: plain(c.module), ...(c.referenceFile ? { referenceFile: c.referenceFile } : {}) }))
sourceHashes['curriculum-map.json'] = hash(await readFile(new URL('docs/grammar-reconstruction/curriculum-map.json', root)))
sourceHashes['error-categories.json'] = hash(await readFile(new URL('scripts/grammar-v5/error-categories.json', root)))
sourceHashes['build.mjs'] = hash(await readFile(new URL('scripts/grammar-v5/build.mjs', root)))
const contentHash = hash(JSON.stringify(sourceHashes)), catalog = { version: 'grammar-v5-2026-10', contentHash, errorCategories: errorTaxonomy.labels, days: manifests, concepts: indexedConcepts, items: bank.map(q => q.meta), sources: [...sources.values()], assessments: [...assessments.map(a => ({ id: a.id, title: a.title, count: a.items.length })), ...extensions.map(e => ({ id: e.file, title: e.data.title, count: allTasks(e.data).length }))] }
if (!partial) assert.deepEqual([...new Set(indexedConcepts.flatMap(c => c.taxonomy))].sort(), 'ABCDEFGHIJKLMNOPQR'.split(''))
if (release) {
 const review = await read(new URL('docs/grammar-reconstruction/release-review.json', root))
 assert.equal(review.contentHash, contentHash, 'Academic sign-off does not match the current source'); assert.deepEqual(review.releaseBlockers, [], 'Unresolved release blockers')
 assert.equal(review.allObjectivesReviewed, true); assert.equal(review.allLessonsReviewed, true); assert.equal(review.accountJourneyVerified, true)
}
await mkdir(output, { recursive: true })
async function emit(file, value, directory = output) {
 const encoded = typeof value === 'string' ? value : JSON.stringify(value) + '\n', path = new URL(file, directory)
 if (check) assert.equal(await readFile(path, 'utf8'), encoded, `Generated artifact stale: ${file}`)
 else await writeFile(path, encoded)
}
for (const l of days) await emit(`day-${String(l.day).padStart(2, '0')}.json`, l)
for (const a of assessments) await emit(`${a.id}.json`, a)
for (const e of extensions) await emit(`${e.file}.json`, e.data)
await emit('index.json', catalog)
await emit('mistake-index.json', bank.filter(q => q.meta.type === 'objective').map(({item:q,meta}) => ({id:q.id,q:q.prompt,o:q.options,a:q.answer,e:q.why,s:concepts.get(meta.conceptId).module.title,d:meta.difficulty==='Foundation'?'Basic':meta.difficulty==='Intermediate'?'Intermediate':'Advanced'})))
const server = { version: catalog.version, days: days.map(l => ({id:l.id,day:l.day,checklist:l.checklist.length})), concepts:indexedConcepts.map(c=>({id:c.id})),items:catalog.items }
await emit('_grammar_v5_catalog.php', `<?php\ndeclare(strict_types=1);\n// Generated from versioned original teaching material; never edit answer indices here.\nreturn json_decode(<<<'GRAMMAR_V5'\n${JSON.stringify(server)}\nGRAMMAR_V5, true, 64, JSON_THROW_ON_ERROR);\n`, new URL('public/api/', root))
// Teaching only: no learner writing, question bank, rubrics or answer keys enter assistance.
const tutor = [...concepts.values()].map(({ module:m, day, referenceFile }) => {
 const text = [m.title,m.definition,...m.foundation,...m.intermediate,...m.advanced,...m.expert,...m.patterns.map(p=>`${p.form}: ${p.meaning}`),...m.examples.map(e=>`${e.sentence}\n${e.analysis}`),...m.exceptions].join('\n\n')
 assert(text.length <= 16000, `${m.id}: assistance context exceeds the existing bound`)
 const query = referenceFile ? `view=reference&concept=${m.id}` : `day=${day}&section=${m.id}&edition=v5`
 return {id:`grammar-v5:${m.id}`,category:'grammar',title:m.title,text,attribution:`CSS VISTA original reconstructed grammar teaching, edition ${catalog.version}. Context-sensitive instruction; not an official past question.`,return_path:`/grammar-course?${query}`,date:null,sources:m.sourceIds.map(id=>({publisher:sources.get(id).title,url:sources.get(id).url})).slice(0,10),feature:'tutor'}
})
// Old deep links remain usable; stored exchanges retain their original immutable snapshots.
const oldTutor = await readFile(new URL('public/api/_tutor_grammar.php', root), 'utf8')
const oldContexts = JSON.parse(oldTutor.split("\nCONTEXTS, true")[0].split("<<<'CONTEXTS'\n")[1])
const legacyDayMap = {1:1,2:5,3:14,4:14,5:10,6:24,7:7,8:8,9:9,10:17,11:19,12:21,13:3,14:4,15:22,16:12,17:20,18:11,19:16,20:22,21:24,22:27,23:26,24:26,25:25,26:28,27:27,28:28,29:29,30:30}
const canonicalTutor = [...tutor]
for (const old of oldContexts) {
 const parts = old.id.split(':'), options = canonicalTutor.filter(t=>t.return_path.includes(`day=${legacyDayMap[parts[1]]}&`)), target = options[Math.min(Number(parts[2]), options.length-1)]
 assert(target, `Missing related teaching for old assistance link ${old.id}`)
 tutor.push({...target,id:old.id,legacy_alias:true,title:`Reconstructed related topic: ${target.title}`})
}
await emit('_tutor_grammar_v5.php', `<?php\ndeclare(strict_types=1);\n// Original teaching only. Legacy aliases are excluded from the new source picker.\nreturn json_decode(<<<'GRAMMAR_V5_TUTOR'\n${JSON.stringify(tutor)}\nGRAMMAR_V5_TUTOR, true, 64, JSON_THROW_ON_ERROR);\n`, new URL('public/api/',root))
await emit('coverage-matrix.json', { contentHash, rows: coverage, referenceExtensions: extensions.map(e=>({id:e.file,concepts:e.data.modules.map(m=>({id:m.id,coverageIds:m.coverageIds,practice:allTasks(e.data).filter(q=>q.conceptId===m.id).map(q=>q.id)}))})) }, new URL('docs/grammar-reconstruction/', root))
await emit('question-inventory.json', { contentHash, items: bank.map(q => ({ ...q.meta, prompt: q.item.prompt, sourceIds: q.item.sourceIds, marking: q.meta.type === 'objective' ? 'verified key with explanatory feedback' : 'model-and-rubric self-review; no automated mark' })), counts: { distinctItems:bank.length, objective:bank.filter(q=>q.meta.type==='objective').length, response:bank.filter(q=>q.meta.type==='response').length }, warnings }, new URL('docs/grammar-reconstruction/', root))
await emit('source-register.json', { contentHash, editorialConvention:'British English with explicitly qualified established variation', copyright:'Original teaching and examples. Source links identify consulted authorities, not permission to reproduce their texts.', sources:catalog.sources }, new URL('docs/grammar-reconstruction/', root))
await emit('content-manifest.json', { contentHash, sourceHashes, days:days.length, referenceEntries:concepts.size, teachingWords:manifests.reduce((n,d)=>n+d.words,0), objectiveItems:bank.filter(q=>q.meta.type==='objective').length, responseTasks:bank.filter(q=>q.meta.type==='response').length, warnings }, new URL('docs/grammar-reconstruction/', root))
console.log(`${partial?'DEVELOPMENT PARTIAL':check?'PASS':'BUILT'}: ${days.length}/30 days, ${concepts.size} substantive entries, ${bank.length} distinct tasks. ${warnings.length} review warnings. ${contentHash}`)
