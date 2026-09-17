import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPastPaperContent } from './lib/past-paper-content.mjs'

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

/**
 * The page-specific section of a past-paper page.
 *
 * Only the paper's authentic recorded questions are rendered. The previous
 * implementation emitted an identical "How to study the …" essay on every
 * paper page, which made 782 pages substantially duplicate. A paper with no
 * recorded questions gets no manufactured prose: it is served as a document
 * page and excluded from search instead.
 */
function paperQualitySection(paper, subject, questions) {
  if (!questions.length) {
    return `<section data-cssv-longtail-quality="paper" data-cssv-paper-content="document" class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">Document access</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">CSS Vista stores the original ${escapeHtml(paper.examination)} ${escapeHtml(paper.year)} ${escapeHtml(paper.subject)} paper as a PDF. The recorded question text for this paper is not yet part of the structured archive, so this page provides the document and its catalogue details rather than a written analysis.</p></section>`
  }

  return `<section data-cssv-longtail-quality="paper" data-cssv-paper-content="questions" class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">Questions recorded from this paper</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">These ${questions.length} question wordings are transcribed from CSS Vista\u2019s structured ${escapeHtml(paper.subject)} past-paper record for ${escapeHtml(paper.examination)} ${escapeHtml(paper.year)}.</p><ol class="mt-4 space-y-3">${questions.map((question) => `<li class="rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed"><span class="font-bold text-emerald-800">${escapeHtml(question.number || '')}${question.topic ? ` \u00b7 ${escapeHtml(question.topic)}` : ''}</span><span class="mt-1 block">${escapeHtml(question.text)}</span></li>`).join('')}</ol>${subject?.slug ? `<p class="mt-4 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis?subject=${encodeURIComponent(subject.slug)}">Topic-wise ${escapeHtml(paper.subject)} past-paper analysis</a>.</p>` : ''}</section>`
}

/**
 * The page-specific section of a year-collection page.
 *
 * Only the collection's own facts are rendered. The previous implementation
 * emitted an identical three-paragraph study essay on all 24 collection pages,
 * which made them substantially duplicate.
 */
function collectionQualitySection(examination, year, papers) {
  const subjects = [...new Set(papers.map((paper) => paper.subject))].sort()
  const modes = [...new Set(papers.map((paper) => paper.mode))].sort()
  const items = subjects.map((subject) => `<li class="rounded-lg bg-secondary/40 px-3 py-2 text-sm">${escapeHtml(subject)}</li>`).join('')
  return `<section data-cssv-longtail-quality="collection" class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">What this collection contains</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">CSS Vista holds ${papers.length} archived ${escapeHtml(examination)} ${escapeHtml(String(year))} paper${papers.length === 1 ? '' : 's'} covering ${subjects.length} subject${subjects.length === 1 ? '' : 's'}, recorded as ${modes.map((mode) => escapeHtml(String(mode).toLowerCase())).join(' and ')} paper${modes.length === 1 ? '' : 's'}.</p><ul class="mt-4 grid gap-2 sm:grid-cols-2">${items}</ul><div class="mt-4 flex flex-wrap gap-3 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers">Complete past-paper archive</a><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/fpsc-syllabus">FPSC syllabus &amp; topic planner</a>${examination === 'CSS' ? '<a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis">CSS topic-wise past-paper analysis</a>' : ''}</div></section>`
}

/** Shared emptiness floor. Page quality is judged by uniqueness, not length. */
const EMPTY_CONTENT_WORDS = 60

const paperContent = await loadPastPaperContent(root)
const pastPapers = paperContent.map((entry) => entry.paper)
let strengthenedPapers = 0
let papersWithQuestions = 0

for (const paper of pastPapers) {
  const path = join(clientDir, 'seo', 'past-papers', `${paper.id}.html`)
  let html
  try { html = await readFile(path, 'utf8') } catch { continue }
  if (html.includes('data-cssv-longtail-quality="paper"')) continue

  const { subject, questions, indexable } = paperContent.find((entry) => entry.paper.id === paper.id)
  const section = paperQualitySection(paper, subject, questions)
  const next = html.replace('</main>', `${section}</main>`)
  if (next === html) throw new Error(`Could not strengthen past-paper page ${paper.id}`)
  const description = questions.length
    ? `Read the ${questions.length} recorded questions from the ${paper.year} ${paper.examination} ${paper.subject} paper, with paper details and the original PDF.`
    : `Open and download the ${paper.year} ${paper.examination} ${paper.subject} past-paper PDF from the CSS Vista archive.`
  html = replaceDescription(next, description)
  // Emptiness floor, not a word target: the page's value is its authentic
  // recorded questions, which the duplicate audit independently verifies are
  // page-specific. A document page is allowed to be short; it is not indexed.
  if (indexable && wordCount(html) < EMPTY_CONTENT_WORDS) {
    throw new Error(`Indexable past-paper page has essentially no content: ${paper.id} (${wordCount(html)} words)`)
  }
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
  if (wordCount(html) < EMPTY_CONTENT_WORDS) {
    throw new Error(`Past-paper collection has essentially no content: ${examination} ${year} (${wordCount(html)} words)`)
  }
  await writeFile(path, html)
  strengthenedCollections += 1
}

console.log(`Strengthened ${strengthenedPapers} individual past-paper pages and ${strengthenedCollections} collection pages; ${papersWithQuestions} CSS paper pages received source-backed question samples.`)
