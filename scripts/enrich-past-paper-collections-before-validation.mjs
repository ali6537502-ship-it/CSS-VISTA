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
  const sampleSubjects = subjects.slice(0, 8).map(escapeHtml)
  const subjectText = sampleSubjects.length
    ? ` Subjects represented in this archive include ${sampleSubjects.join(', ')}${subjects.length > sampleSubjects.length ? ', and others' : ''}.`
    : ''

  const section = `<section data-cssv-collection-context class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">What this ${escapeHtml(examination)} ${escapeHtml(year)} archive helps you review</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">A year-wise past-paper collection is most useful when it is treated as an examination record rather than only a download page.${subjectText} Review the available papers side by side to see how subjects were framed in the same examination cycle, which question styles appeared, and where descriptive, analytical or applied demands were placed on candidates.</p><p class="mt-3 text-sm leading-relaxed text-muted-foreground">For structured revision, open the papers relevant to your own subject combination, mark the syllabus areas tested, and record the command words used in each question. Then compare those observations with nearby years before deciding that a topic is recurring. This approach helps turn the archive into a practical revision and answer-writing tool while keeping past papers in their proper role: evidence of previous examinations, not a forecast of future questions.</p></section>`

  const next = html.replace('</main>', `${section}</main>`)
  if (next === html) throw new Error(`Could not add collection context to ${examination} ${year}`)

  await writeFile(path, next)
  enriched += 1
}

console.log(`Added substantive pre-validation context to ${enriched} past-paper collection pages.`)
