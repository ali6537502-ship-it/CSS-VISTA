import { readFileSync, writeFileSync } from 'node:fs'

const syllabusPath = new URL('../public/fpsc-syllabus.json', import.meta.url)
const syllabus = JSON.parse(readFileSync(syllabusPath, 'utf8'))
const scans = {
  Balochi: ['/fpsc-syllabus-scans/balochi-page-1.webp', '/fpsc-syllabus-scans/balochi-page-2.webp'],
  Punjabi: ['/fpsc-syllabus-scans/punjabi-page-1.webp', '/fpsc-syllabus-scans/punjabi-page-2.webp'],
  'Urdu Literature': ['/fpsc-syllabus-scans/urdu-literature-page-1.webp', '/fpsc-syllabus-scans/urdu-literature-page-2.webp'],
}

for (const subject of syllabus.subjects) {
  if (scans[subject.name]) subject.scanPages = scans[subject.name]
}

writeFileSync(syllabusPath, `${JSON.stringify(syllabus, null, 2)}\n`)
