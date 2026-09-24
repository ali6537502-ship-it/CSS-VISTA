// Release gate for the forty-paper MPT bank. This does not replace
// editorial fact-checking; it rejects repeat patterns and obvious syllabus drift.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const legacy = JSON.parse(readFileSync('data-archive/mpt-legacy-fingerprints.json', 'utf8'))
const oldIds = new Set(legacy.entries.map(([id]) => id))
const oldStems = new Set(legacy.entries.map(([, hash]) => hash))
const failures = []
const blockingErrors = []
const sample = (message) => { if (failures.length < 24) failures.push(message) }
const canonical = (value) => value.toLocaleLowerCase('en').normalize('NFKD')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
const hashStem = (stem) => createHash('sha256').update(stem).digest('hex')
const numericPattern = (value) => value.toLocaleLowerCase('en')
  .replace(/\d+(?:[.,]\d+)*/g, '#').replace(/\s+/g, ' ').trim()
const offSyllabus = /blackbody|radiative flux|hardy.weinberg|\brlc\b|induced emf|escape speed|\bp=p0e|\bq=\d|ste[f]an.boltzmann|\bexoplanet|lorentz factor|arrhenius equation|\bthermodynamic entropy|literary genres|اردو ادب|تصنیف کون سی|معروف شاعر/i

const bundle = await build({
  entryPoints: ['src/data/mockPapers.ts'], bundle: true, platform: 'node',
  format: 'esm', write: false, alias: { '@': './src' },
})
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`
const { buildCompetitiveMock } = await import(moduleUrl)
const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}
globalThis.fetch = async (url) => {
  try {
    const path = String(url) === '/mcq/index.json' ? 'public/mcq/index.json'
      : String(url).startsWith('/css-subject-mcqs/') ? `public${url}`
        : String(url).replace('/mcq/', 'src/data/mcq-shards/')
    return { ok: true, json: async () => JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return { ok: false, json: async () => [] }
  }
}

const seenIds = new Set()
const seenStems = new Set()
const globalPatterns = new Map()
const counts = {
  papers: 0, questions: 0, oldIds: 0, oldStems: 0, originalAbility: 0, reviewedPastAbility: 0,
  reviewedPastEnglish: 0, offSyllabus: 0, bareArithmetic: 0, papersWithoutComprehension: 0,
  basic: 0, intermediate: 0, advanced: 0, unrated: 0, papersOverBasicLimit: 0,
}
for (let day = 1; day <= 20; day += 1) {
  for (const slot of ['-15', '']) {
    const utcDate = new Date(Date.UTC(2026, 8, 19 + day))
    const key = `${utcDate.toISOString().slice(0, 10)}${slot}`
    let paper
    try { paper = await buildCompetitiveMock('mpt', key, 'MPT release audit') }
    catch (error) { blockingErrors.push(`Paper ${key}: ${error.message}`); break }
    counts.papers += 1
    counts.questions += paper.questions.length
    if (paper.questions.length !== 200) sample(`Paper ${key} has ${paper.questions.length}/200 questions`)
    const bySection = Object.groupBy(paper.questions, (question) => question.paperSection)
    for (const [section, size] of [['Islamic Studies', 20], ['Urdu', 20], ['English', 50], ['General Abilities', 60], ['General Knowledge', 50]]) {
      if ((bySection[section]?.length ?? 0) !== size) sample(`${key}: ${section} has ${bySection[section]?.length ?? 0}/${size}`)
    }
    const english = bySection.English ?? []
    const comprehension = english.filter((q) => /comprehension/i.test(q.s ?? ''))
    if (!comprehension.length) { counts.papersWithoutComprehension += 1; sample(`${key}: no English comprehension questions`) }
    if (english.filter((q) => /\bsynonym\b/i.test(q.q)).length > 15) sample(`${key}: more than 15 English synonym prompts`)
    if ((bySection.Urdu ?? []).filter((q) => /ترجمہ/.test(q.s ?? '')).length < 3) sample(`${key}: fewer than three Urdu translations`)
    const patternsInPaper = new Map()
    let basicInPaper = 0
    for (const q of paper.questions) {
      const stem = canonical(q.q)
      const fingerprint = hashStem(stem)
      if (seenIds.has(q.id) || seenStems.has(fingerprint)) sample(`${key}: repeated question ${q.id}`)
      seenIds.add(q.id); seenStems.add(fingerprint)
      if (q.id.startsWith('mpt-original-ability-')) counts.originalAbility += 1
      if (q.id.startsWith('mpt-reviewed-past-ability-')) counts.reviewedPastAbility += 1
      if (q.id.startsWith('mpt-reviewed-past-english-')) counts.reviewedPastEnglish += 1
      if (oldIds.has(q.id)) counts.oldIds += 1
      if (oldStems.has(fingerprint)) { counts.oldStems += 1; sample(`${key}: previously served stem ${q.id}`) }
      if (offSyllabus.test(q.q)) { counts.offSyllabus += 1; sample(`${key}: off-syllabus ${q.id}: ${q.q}`) }
      if (/^A (?:vehicle travels|price of Rs)|^What is \d+% of \d+|^A rectangle is .* what is its area/i.test(q.q)) counts.bareArithmetic += 1
      if (q.d === 'Basic') { counts.basic += 1; basicInPaper += 1 }
      else if (q.d === 'Intermediate') counts.intermediate += 1
      else if (q.d === 'Advanced') counts.advanced += 1
      else counts.unrated += 1
      if (/\d/.test(q.q) && !/^[\d,.?\s\-–+]+$/.test(q.q)) {
        const pattern = numericPattern(q.q)
        patternsInPaper.set(pattern, (patternsInPaper.get(pattern) ?? 0) + 1)
        globalPatterns.set(pattern, (globalPatterns.get(pattern) ?? 0) + 1)
      }
    }
    for (const [pattern, count] of patternsInPaper) {
      if (count > 1) sample(`${key}: ${count} instances of the same numeric pattern: ${pattern.slice(0, 110)}`)
    }
    if (basicInPaper > 40) {
      counts.papersOverBasicLimit += 1
      sample(`${key}: ${basicInPaper} basic questions exceed the 40-question paper limit`)
    }
  }
}
const repeatedFamilies = [...globalPatterns].filter(([, count]) => count > 8)
  .sort((a, b) => b[1] - a[1])
if (counts.papers !== 40) sample(`Only ${counts.papers}/40 papers could be built`)
if (counts.oldIds || counts.oldStems) sample(`${counts.oldIds} prior-paper IDs and ${counts.oldStems} prior-paper stems remain`)
if (repeatedFamilies.length) sample(`${repeatedFamilies.length} numeric templates appear over 8 times across the series`)
if (counts.bareArithmetic) sample(`${counts.bareArithmetic} one-step arithmetic drills remain`)
if (counts.papersOverBasicLimit) sample(`${counts.papersOverBasicLimit} papers exceed the basic-question limit`)
console.log(JSON.stringify({ status: failures.length || blockingErrors.length ? 'BLOCKED' : 'PASS', counts, blockingErrors,
  repeatedFamilies: repeatedFamilies.slice(0, 12).map(([pattern, count]) => ({ count, pattern })),
  failures }, null, 2))
if (failures.length || blockingErrors.length) process.exitCode = 1
