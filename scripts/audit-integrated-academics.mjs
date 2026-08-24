import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const normalize = (value) => String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en')
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'))

const syllabus = readJson('public/fpsc-syllabus.json')
if (!/fpsc\.gov\.pk/.test(syllabus.source?.url ?? '')) errors.push('FPSC syllabus source is not an official FPSC URL')
if (syllabus.subjects?.length !== 52) errors.push(`FPSC syllabus expected 52 entries; found ${syllabus.subjects?.length ?? 0}`)
const syllabusSlugs = new Set()
const groups = new Set()
const languageAppendixSubjects = new Set(['balochi', 'punjabi', 'urdu-literature'])
for (const subject of syllabus.subjects ?? []) {
  if (!subject.slug || syllabusSlugs.has(subject.slug)) errors.push(`FPSC syllabus duplicate/missing slug: ${subject.slug}`)
  syllabusSlugs.add(subject.slug)
  if (!subject.name || ![100, 200].includes(subject.marks)) errors.push(`FPSC syllabus malformed subject: ${subject.slug}`)
  if ((!Array.isArray(subject.sections) || !subject.sections.length) && !languageAppendixSubjects.has(subject.slug)) errors.push(`FPSC syllabus has no sections: ${subject.slug}`)
  if (subject.designation === 'optional') groups.add(subject.group)
}
if ([1, 2, 3, 4, 5, 6, 7].some((group) => !groups.has(group))) errors.push('FPSC optional hierarchy does not contain all seven groups')
for (const subject of syllabus.subjects?.filter((item) => languageAppendixSubjects.has(item.slug)) ?? []) {
  if (!Array.isArray(subject.scanPages) || subject.scanPages.length !== 2) errors.push(`FPSC syllabus scan pages missing: ${subject.slug}`)
  for (const scanPage of subject.scanPages ?? []) {
    const file = path.join(root, 'public', scanPage.replace(/^\//, ''))
    if (!fs.existsSync(file) || fs.statSync(file).size < 1024) errors.push(`Missing/invalid syllabus scan page: ${scanPage}`)
  }
}

const curatedRoot = path.join(root, 'public', 'css-subject-mcqs')
const curatedIndex = readJson('public/css-subject-mcqs/index.json')
if (curatedIndex.total < 30000) errors.push(`Full supplied subject bank expected at least 30,000 structurally complete questions; found ${curatedIndex.total}`)
if (!Number.isInteger(curatedIndex.unresolved) || curatedIndex.unresolved < 0) errors.push('Full supplied bank must report unresolved source items rather than guessing them')
const curatedIds = new Set()
const curatedStems = new Set()
const curatedAnswers = [0, 0, 0, 0]
let curatedTotal = 0
for (const subject of curatedIndex.subjects ?? []) {
  const file = path.join(curatedRoot, subject.file)
  if (!fs.existsSync(file)) { errors.push(`Missing curated subject bank: ${subject.file}`); continue }
  const questions = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (questions.length !== subject.count) errors.push(`${subject.slug}: index says ${subject.count}, file has ${questions.length}`)
  for (const question of questions) {
    curatedTotal += 1
    const stem = normalize(question.question)
    if (!question.id || curatedIds.has(question.id)) errors.push(`${subject.slug}: duplicate/missing question id ${question.id}`)
    curatedIds.add(question.id)
    if (!stem || curatedStems.has(stem)) errors.push(`${subject.slug}: duplicate/missing question stem ${question.id}`)
    curatedStems.add(stem)
    if (!Array.isArray(question.options) || question.options.length !== 4 || new Set(question.options.map(normalize)).size !== 4) errors.push(`${question.id}: invalid four-option set`)
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) errors.push(`${question.id}: invalid answer`)
    else curatedAnswers[question.answer] += 1
    if (!question.explanation && !question.source) errors.push(`${question.id}: missing both explanation and source metadata`)
  }
}
if (curatedTotal !== curatedIndex.total) errors.push(`Curated index says ${curatedIndex.total}, files contain ${curatedTotal}`)
if (curatedAnswers.some((count) => count < curatedTotal * 0.15)) errors.push(`Curated answer distribution is too uneven: ${curatedAnswers.join('/')}`)

const affairs = readJson('public/recent-affairs/batch-2026-07-11_2026-08-16.json')
if (affairs.oneLiners?.length !== 135) errors.push(`Recent-affairs one-liners expected 135; found ${affairs.oneLiners?.length ?? 0}`)
if (affairs.mcqs?.length !== 726) errors.push(`Recent-affairs MCQs expected 726; found ${affairs.mcqs?.length ?? 0}`)
const affairIds = new Set()
const affairStems = new Set()
for (const question of affairs.mcqs ?? []) {
  const stem = normalize(question.question)
  if (!question.id || affairIds.has(question.id)) errors.push(`Recent affairs duplicate/missing id: ${question.id}`)
  affairIds.add(question.id)
  if (!stem || affairStems.has(stem)) errors.push(`Recent affairs duplicate/missing stem: ${question.id}`)
  affairStems.add(stem)
  if (!Array.isArray(question.options) || question.options.length !== 4 || new Set(question.options.map(normalize)).size !== 4) errors.push(`${question.id}: invalid recent-affairs options`)
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) errors.push(`${question.id}: invalid recent-affairs answer`)
  if (!question.date || !question.updatedAt) errors.push(`${question.id}: missing dated metadata`)
}

const remoteLibrary = readJson('public/remote-library-manifest.json')
if (remoteLibrary.repository !== 'ali6537502-ship-it/CSS-VISTA') errors.push('Remote study-library manifest points to the wrong repository')
if (remoteLibrary.fileCount !== remoteLibrary.files?.length || remoteLibrary.fileCount < 700) errors.push(`Remote study-library manifest is incomplete: ${remoteLibrary.fileCount ?? 0} files`)
if ((remoteLibrary.totalBytes ?? 0) < 800_000_000) errors.push(`Remote study-library manifest is unexpectedly small: ${remoteLibrary.totalBytes ?? 0} bytes`)

const previewSets = {
  'internal-security': 3,
  cpec: 3,
  'pakistan-india-relations': 3,
  'biological-theory-crime': 3,
  'legal-ethical-investigation': 3,
  'iqbal-political-thought': 3,
  'social-contract-theorists': 3,
  'state-system': 3,
  'french-revolution': 3,
  'metternich-era': 3,
}
for (const [folder, pages] of Object.entries(previewSets)) {
  for (let page = 1; page <= pages; page += 1) {
    const file = path.join(root, 'public', 'note-previews', folder, `page-${page}.webp`)
    if (!fs.existsSync(file) || fs.statSync(file).size < 1024) errors.push(`Missing/invalid note preview: ${folder}/page-${page}.webp`)
  }
}

const checkedSets = { 'test-1': 27, 'test-2': 37, 'test-3': 59 }
for (const [folder, pages] of Object.entries(checkedSets)) {
  for (let page = 1; page <= pages; page += 1) {
    const file = path.join(root, 'public', 'checked-mocks', folder, `page-${String(page).padStart(2, '0')}.jpg`)
    if (!fs.existsSync(file) || fs.statSync(file).size < 1024) errors.push(`Missing/invalid checked paper: ${folder}/page-${page}`)
  }
}

const printMenu = fs.readFileSync(path.join(root, 'src', 'components', 'PrintMenu.tsx'), 'utf8')
const layout = fs.readFileSync(path.join(root, 'src', 'components', 'Layout.tsx'), 'utf8')
if (!printMenu.includes("document.querySelector<HTMLElement>('.print-branding')")) errors.push('Selected-area printing no longer clones CSS Vista branding')
if (!layout.includes('className="print-branding"')) errors.push('CSS Vista print branding element is missing')

if (errors.length) {
  console.error(`Integrated academic audit failed with ${errors.length} error(s):`)
  console.error(errors.slice(0, 150).join('\n'))
  process.exit(1)
}

console.log(`Integrated academic audit passed: ${syllabus.subjects.length} syllabus entries, ${curatedTotal.toLocaleString()} supplied subject MCQs, ${affairs.mcqs.length} recent-affairs MCQs, 30 note previews, 123 checked-paper pages and ${remoteLibrary.fileCount} remotely served study files.`)
