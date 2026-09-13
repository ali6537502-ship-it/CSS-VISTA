import { readdir, writeFile } from 'node:fs/promises'
import { basename, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const publicDir = join(root, 'public')

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  }))).flat()
}

function publicUrl(path) {
  return `/${relative(publicDir, path).split(sep).join('/')}`
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function cleanPpscTitle(fileName, year) {
  return basename(fileName, '.pdf')
    .replace(/^\d+_PPSC_\d{4}_/i, '')
    .replaceAll('_', ' ')
    .replace(/\s+-\s+/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim() + ` — ${year}`
}

const ppscFiles = (await walk(join(publicDir, 'past-papers', 'ppsc')))
  .filter((path) => path.toLowerCase().endsWith('.pdf'))
  .sort((a, b) => publicUrl(a).localeCompare(publicUrl(b), undefined, { numeric: true }))

const ppscPapers = ppscFiles.map((path) => {
  const url = publicUrl(path)
  const year = Number(url.match(/\/ppsc\/(\d{4})\//)?.[1])
  const rawName = basename(path, '.pdf')
  const sequence = rawName.match(/^(\d+)_/)?.[1] ?? 'paper'
  const title = cleanPpscTitle(path, year)
  return {
    id: `ppsc-${year}-${sequence}-${slug(title.replace(` — ${year}`, ''))}`,
    title,
    examination: 'PPSC',
    subject: title.replace(` — ${year}`, ''),
    subjectType: 'General',
    year,
    paper: 'Single Paper',
    mode: 'Objective',
    fileUrl: url,
    source: 'Owner-provided',
  }
})

// Some archive folders contain distinct source PDFs with the same subject and
// year. Keep both records, but make their user-facing/search metadata unique.
const duplicatePpscKeys = new Set(
  ppscPapers
    .map((paper) => `${paper.year}:${paper.subject}`)
    .filter((key, index, keys) => keys.indexOf(key) !== index),
)
for (const paper of ppscPapers) {
  if (!duplicatePpscKeys.has(`${paper.year}:${paper.subject}`)) continue
  const archiveSequence = basename(paper.fileUrl).match(/^(\d+)_/)?.[1]
  if (!archiveSequence) continue
  paper.subject = `${paper.subject} (Archive File ${archiveSequence})`
  paper.title = `${paper.subject} — ${paper.year}`
}

const mptFiles = (await readdir(join(publicDir, 'past-papers', 'mpt')))
  .filter((name) => name.toLowerCase().endsWith('.pdf'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const mptPapers = mptFiles.map((fileName) => {
  const year = Number(fileName.match(/(20\d{2})/)?.[1])
  const special = /special/i.test(fileName)
  return {
    id: `mpt-${year}${special ? '-special' : ''}`,
    title: `CSS MPT ${year}${special ? ' Special' : ''} Screening Test`,
    examination: 'MPT',
    subject: 'CSS MPT Screening Test',
    subjectType: 'General',
    year,
    paper: 'Single Paper',
    mode: 'Objective',
    fileUrl: `/past-papers/mpt/${fileName}`,
    source: 'Owner-provided',
  }
})

const records = [...ppscPapers, ...mptPapers]
const output = `import type { PastPaper } from './pastPapers'\n\n// Generated from the owner-provided PPSC and CSS MPT archives. Do not edit by hand.\nexport const importedSupplementalPastPapers: PastPaper[] = [\n  ${records.map((paper) => JSON.stringify(paper)).join(',\n  ')}\n]\n`
await writeFile(join(root, 'src', 'data', 'supplementalPastPapers.generated.ts'), output)
console.log(`Generated ${ppscPapers.length} PPSC and ${mptPapers.length} MPT past-paper records.`)
