import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const pastPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
const groups = new Map()

for (const paper of pastPapers) {
  const key = `${paper.examination}|${paper.year}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(paper)
}

let enriched = 0

for (const [key, papers] of groups) {
  const [examination, year] = key.split('|')
  const path = join(clientDir, 'seo', 'past-paper-collections', examination.toLowerCase(), `${year}.html`)

  let html
  try {
    html = await readFile(path, 'utf8')
  } catch {
    continue
  }

  if (html.includes('data-cssv-collection-context')) continue

  const subjects = [...new Set(papers.map((paper) => paper.subject).filter(Boolean))]
  const compulsory = papers.filter((paper) => String(paper.subjectType || '').toLowerCase() === 'compulsory')
  const optional = papers.length - compulsory.length
  const modes = [...new Set(papers.map((paper) => paper.mode).filter(Boolean))]
  const multiPaper = papers.filter((paper) => paper.paper && paper.paper !== 'Single Paper')

  /* Generic revision advice reads the same on all twenty-four collection
     pages. What differs between them is the shape of the year itself, so the
     opening paragraph is assembled from this collection's own composition. */
  const facts = [
    `The ${escapeHtml(examination)} ${escapeHtml(year)} archive holds ${papers.length} paper${papers.length === 1 ? '' : 's'} covering ${subjects.length} subject${subjects.length === 1 ? '' : 's'}.`,
    compulsory.length && optional
      ? `${compulsory.length} are compulsory papers every candidate sat and ${optional} are optional papers chosen by combination.`
      : compulsory.length
        ? `All of them are compulsory papers every candidate sat.`
        : `All of them are optional papers chosen by combination.`,
    multiPaper.length ? `${multiPaper.length} of them are split across more than one paper.` : '',
    modes.length === 1 ? `Every paper in this year is recorded as ${escapeHtml(String(modes[0]).toLowerCase())}.` : '',
  ].filter(Boolean).join(' ')

  const section = `<section data-cssv-collection-context class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">What this ${escapeHtml(examination)} ${escapeHtml(year)} archive contains</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${facts}</p><p class="mt-3 text-sm leading-relaxed text-muted-foreground">Open the papers that match your own subject combination, mark the syllabus areas each question tests, and note the command words used. Compare those observations with the neighbouring years linked below before treating a topic as recurring.</p></section>`

  const next = html.replace('</main>', `${section}</main>`)
  if (next === html) throw new Error(`Could not add collection context to ${examination} ${year}`)

  await writeFile(path, next)
  enriched += 1
}

console.log(`Added substantive pre-validation context to ${enriched} past-paper collection pages.`)
