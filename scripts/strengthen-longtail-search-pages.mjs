import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const publicDir = join(root, 'public')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replaceAll('&', ' and ')
    .replace(/\bpaper\s+one\b/g, 'paper i')
    .replace(/\bpaper\s+two\b/g, 'paper ii')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function shorten(value, max = 156) {
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const clipped = text.slice(0, max - 1)
  const boundary = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, boundary > max * 0.65 ? boundary : max - 1).replace(/[,:;\s]+$/, '')}…`
}

function replaceDescription(html, description) {
  const safe = escapeHtml(shorten(description))
  return html
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${safe}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${safe}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${safe}" />`)
}

function wordCount(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function paperTitle(paper) {
  if (paper.examination === 'MPT') return `CSS MPT ${paper.year} Screening Test Past Paper`
  const part = paper.paper === 'Single Paper' ? '' : ` ${paper.paper.replace('One', 'I').replace('Two', 'II')}`
  return `${paper.examination} ${paper.year} ${paper.subject}${part} Past Paper`
}

let analysis = null
try {
  analysis = JSON.parse(await readFile(join(publicDir, 'css-past-paper-analysis.json'), 'utf8'))
} catch {
  analysis = null
}

const analysisSubjects = new Map()
for (const subject of analysis?.subjects || []) {
  const questions = []
  for (const section of subject.sections || []) {
    for (const topic of section.topics || []) {
      for (const question of topic.questions || []) {
        questions.push({ ...question, topic: topic.title })
      }
    }
  }
  analysisSubjects.set(normalize(subject.name), { ...subject, questions })
}

function sourceQuestionsForPaper(paper) {
  if (paper.examination !== 'CSS') return { subject: null, questions: [] }
  const subject = analysisSubjects.get(normalize(paper.subject)) || null
  if (!subject) return { subject: null, questions: [] }
  const year = Number(paper.year)
  const paperKey = normalize(paper.paper)
  const sameYear = subject.questions.filter((question) => Number(question.year) === year)
  let matching = sameYear.filter((question) => paper.paper === 'Single Paper' || normalize(question.paper) === paperKey)
  if (!matching.length) matching = sameYear
  const seen = new Set()
  matching = matching.filter((question) => {
    const key = normalize(question.text)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { subject, questions: matching.slice(0, 6) }
}

function paperQualitySection(paper, subject, questions) {
  const title = paperTitle(paper)
  const questionList = questions.length
    ? `<section class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">Questions recorded from this paper</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">These question wordings come from CSS Vista’s structured past-paper analysis for ${escapeHtml(paper.subject)}. Use them to identify the paper’s actual demand before opening the complete PDF.</p><ol class="mt-4 space-y-3">${questions.map((question) => `<li class="rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed"><span class="font-bold text-emerald-800">${escapeHtml(question.number || '')}${question.topic ? ` · ${escapeHtml(question.topic)}` : ''}</span><span class="mt-1 block">${escapeHtml(question.text)}</span></li>`).join('')}</ol>${subject?.slug ? `<p class="mt-4 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis?subject=${encodeURIComponent(subject.slug)}">Explore the complete topic-wise ${escapeHtml(paper.subject)} past-paper analysis</a>.</p>` : ''}</section>`
    : ''

  return `<section data-cssv-longtail-quality="paper" class="mt-8 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-5"><h2 class="font-display text-xl font-bold text-pine">How to study the ${escapeHtml(title)}</h2><p class="mt-2 text-sm leading-relaxed text-foreground/80">Use this archive page as more than a download link. First read the complete ${escapeHtml(paper.examination)} ${escapeHtml(paper.year)} ${escapeHtml(paper.subject)} paper without attempting an answer. Mark command words, recurring syllabus areas and questions that require analysis rather than description. Then return to your notes and syllabus to identify which tested areas were already covered and which ones need another revision cycle.</p><p class="mt-3 text-sm leading-relaxed text-foreground/80">On a second pass, outline selected questions under examination conditions and compare the same subject across nearby years through the related-paper links on this page. This helps distinguish a genuinely recurring area from a one-year question. The archived paper is evidence of what was previously examined; it is not a prediction of a future paper, and current examination rules or dates should always be checked from the relevant official authority.</p><ul class="mt-4 grid gap-2 text-sm sm:grid-cols-3"><li class="rounded-lg bg-white p-3"><strong class="block text-pine">1. Map</strong>Connect each question to a syllabus heading.</li><li class="rounded-lg bg-white p-3"><strong class="block text-pine">2. Compare</strong>Review the same subject across multiple years.</li><li class="rounded-lg bg-white p-3"><strong class="block text-pine">3. Practise</strong>Outline or write selected answers under time limits.</li></ul></section>${questionList}`
}

function collectionQualitySection(examination, year, papers) {
  const uniqueSubjects = new Set(papers.map((paper) => paper.subject)).size
  return `<section data-cssv-longtail-quality="collection" class="mt-8 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-5"><h2 class="font-display text-xl font-bold text-pine">How to use the ${escapeHtml(examination)} ${escapeHtml(year)} past-paper collection</h2><p class="mt-2 text-sm leading-relaxed text-foreground/80">This collection brings together ${papers.length} archived ${escapeHtml(examination)} ${escapeHtml(year)} papers covering ${uniqueSubjects} subject${uniqueSubjects === 1 ? '' : 's'} available in CSS Vista’s repository. Use the year page to move quickly between papers, then open the individual paper pages for document access, paper details and related-year links.</p><p class="mt-3 text-sm leading-relaxed text-foreground/80">For preparation, compare each paper with the relevant syllabus instead of reading the archive as a list of isolated questions. Note repeated themes, shifts in question wording and areas that require applied or analytical treatment. Previous papers are especially useful for prioritising revision and practising answer structure, but they do not guarantee what a later examination will ask.</p><p class="mt-3 text-sm leading-relaxed text-foreground/80">Before attempting a paper, confirm its subject and paper label, set an appropriate time limit, and prepare a short syllabus checklist. After the attempt, record the topics that need revision and use the archive links to compare how those areas were examined in other available years.</p><div class="mt-4 flex flex-wrap gap-3 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers">Complete past-paper archive</a><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/fpsc-syllabus">FPSC syllabus &amp; topic planner</a>${examination === 'CSS' ? '<a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis">CSS topic-wise past-paper analysis</a>' : ''}</div></section>`
}

const pastPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
let strengthenedPapers = 0
let papersWithQuestions = 0

for (const paper of pastPapers) {
  const path = join(clientDir, 'seo', 'past-papers', `${paper.id}.html`)
  let html
  try { html = await readFile(path, 'utf8') } catch { continue }
  if (html.includes('data-cssv-longtail-quality="paper"')) continue

  const { subject, questions } = sourceQuestionsForPaper(paper)
  const section = paperQualitySection(paper, subject, questions)
  const next = html.replace('</main>', `${section}</main>`)
  if (next === html) throw new Error(`Could not strengthen past-paper page ${paper.id}`)
  const description = `Review the ${paper.year} ${paper.examination} ${paper.subject} past paper with PDF access, paper details, related years and focused study guidance${questions.length ? ', plus authentic question samples' : ''}.`
  html = replaceDescription(next, description)
  if (wordCount(html) < 300) throw new Error(`Past-paper page remains too thin after enrichment: ${paper.id} (${wordCount(html)} words)`)
  await writeFile(path, html)
  strengthenedPapers += 1
  if (questions.length) papersWithQuestions += 1
}

const groups = new Map()
for (const paper of pastPapers) {
  const key = `${paper.examination}|${paper.year}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(paper)
}

let strengthenedCollections = 0
for (const [key, papers] of groups) {
  const [examination, year] = key.split('|')
  const path = join(clientDir, 'seo', 'past-paper-collections', examination.toLowerCase(), `${year}.html`)
  let html
  try { html = await readFile(path, 'utf8') } catch { continue }
  if (html.includes('data-cssv-longtail-quality="collection"')) continue
  const section = collectionQualitySection(examination, year, papers)
  const next = html.replace('</main>', `${section}</main>`)
  if (next === html) throw new Error(`Could not strengthen collection page ${examination} ${year}`)
  const uniqueSubjects = new Set(papers.map((paper) => paper.subject)).size
  const description = `Browse ${papers.length} ${examination} ${year} past papers across ${uniqueSubjects} subject${uniqueSubjects === 1 ? '' : 's'}, with direct paper links, archive context and practical preparation guidance.`
  html = replaceDescription(next, description)
  if (wordCount(html) < 320) throw new Error(`Past-paper collection remains too thin after enrichment: ${examination} ${year} (${wordCount(html)} words)`)
  await writeFile(path, html)
  strengthenedCollections += 1
}

console.log(`Strengthened ${strengthenedPapers} individual past-paper pages and ${strengthenedCollections} collection pages; ${papersWithQuestions} CSS paper pages received source-backed question samples.`)
