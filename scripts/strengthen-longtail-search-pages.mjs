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

/* The published FPSC syllabus lets a paper page state what its subject is
   actually examined on, which is real and subject-specific even for a year
   whose individual questions have not been transcribed. */
let syllabus = null
try {
  syllabus = JSON.parse(await readFile(join(publicDir, 'fpsc-syllabus.json'), 'utf8'))
} catch {
  syllabus = null
}
const syllabusByName = new Map()
const syllabusBySlug = new Map()
for (const subject of syllabus?.subjects || []) {
  syllabusByName.set(normalize(subject.name), subject)
  syllabusBySlug.set(subject.slug, subject)
}

let pdfPageCounts = {}
try {
  pdfPageCounts = JSON.parse(await readFile(join(publicDir, 'pdf-page-counts.json'), 'utf8')) || {}
} catch {
  pdfPageCounts = {}
}

function cleanSource(value) {
  return String(value || '')
    .replace(/\s*-\s*\n\s*/g, '')
    .replace(/([a-z])\s-\s([a-z])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Syllabus context for the paper's subject. Identical for two years of the
 * same subject, but distinct between subjects, and it tells a reader what the
 * paper covers rather than how to study in general.
 */
function syllabusContextSection(paper) {
  const subject = syllabusByName.get(normalize(paper.subject))
    || syllabusBySlug.get(SUBJECT_SLUG_ALIASES.get(normalize(paper.subject)) || '')
  const sections = Array.isArray(subject?.sections) ? subject.sections : []
  if (!sections.length) return ''

  const rendered = sections.slice(0, 10).map((section) => {
    const title = cleanSource(section.title)
    if (!title) return ''
    const items = (Array.isArray(section.items) ? section.items : [])
      .map((item) => cleanSource(item))
      .filter((item) => item.length > 25)
      .slice(0, 3)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('')
    return `<div class="mt-3"><h3 class="text-sm font-semibold text-pine">${escapeHtml(title)}</h3>${items ? `<ul class="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">${items}</ul>` : ''}</div>`
  }).filter(Boolean).join('')
  if (!rendered) return ''

  return `<section class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">What ${escapeHtml(paper.subject)} is examined on</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">The published FPSC syllabus sections for ${escapeHtml(paper.subject)}${subject?.marks ? `, a ${subject.marks}-mark paper` : ''}. Use them to place each question in this paper under the heading it was set from.</p>${rendered}<p class="mt-4 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/fpsc-syllabus">Open the complete FPSC syllabus</a></p></section>`
}

/**
 * When a specific year has not been transcribed, the subject's overall
 * examined profile still says something true and useful about this paper.
 */
function subjectProfileSection(paper, subject, recordedForThisPaper) {
  if (!subject || recordedForThisPaper.length) return ''
  const topics = []
  for (const section of subject.sections || []) {
    for (const topic of section.topics || []) {
      if (Array.isArray(topic.questions) && topic.questions.length) {
        topics.push({ title: cleanSource(topic.title), count: topic.questions.length })
      }
    }
  }
  if (!topics.length) return ''
  topics.sort((a, b) => b.count - a.count)
  const listed = topics.slice(0, 12)
    .map((topic) => `<li><span class="font-semibold text-pine">${escapeHtml(topic.title)}</span> <span class="text-slate-600">— ${topic.count} recorded question${topic.count === 1 ? '' : 's'}</span></li>`)
    .join('')
  const years = Array.isArray(subject.years) && subject.years.length ? subject.years.join(', ') : ''

  return `<section class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">Recurring ${escapeHtml(paper.subject)} topics across the archive</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`The individual questions from this year's paper are not yet transcribed. These are the topics ${paper.subject} has most often been examined on in the years CSS Vista has read${years ? ` (${years})` : ''}, from ${subject.questionCount} recorded questions.`)}</p><ul class="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">${listed}</ul><p class="mt-4 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis?subject=${encodeURIComponent(subject.slug)}">Open the complete topic-wise ${escapeHtml(paper.subject)} analysis</a></p></section>`
}

/** Real, checkable detail about the stored document itself. */
function documentFactsSection(paper) {
  const record = pdfPageCounts[paper.fileUrl]
  if (!record || !Number.isFinite(Number(record.pages))) return ''
  const megabytes = Number(record.sizeBytes) > 0 ? (Number(record.sizeBytes) / 1048576).toFixed(1) : null
  return `<p class="mt-4 text-sm leading-relaxed text-muted-foreground">The stored document for this paper runs to ${record.pages} page${Number(record.pages) === 1 ? '' : 's'}${megabytes ? ` and is ${megabytes} MB` : ''}.</p>`
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

/**
 * The paper registry and the analysis name some subjects differently — a paper
 * labelled "Essay" is analysed as "English Essay" — so a normalised name match
 * alone silently drops those papers. These aliases map a registry subject onto
 * the analysis and syllabus slug it belongs to.
 */
const SUBJECT_SLUG_ALIASES = new Map([
  ['essay', 'essay'],
  ['english essay', 'essay'],
  ['precis and composition', 'precis-composition'],
  ['english precis and composition', 'precis-composition'],
  ['general science and ability', 'general-science-ability'],
  ['comparative study of major religions', 'comparative-religions'],
])

const analysisBySlug = new Map()
for (const subject of analysis?.subjects || []) analysisBySlug.set(subject.slug, { ...analysisSubjects.get(normalize(subject.name)) })

function analysisSubjectFor(paper) {
  const byName = analysisSubjects.get(normalize(paper.subject))
  if (byName) return byName
  const slug = SUBJECT_SLUG_ALIASES.get(normalize(paper.subject))
  return slug ? analysisBySlug.get(slug) || null : null
}

function sourceQuestionsForPaper(paper) {
  if (paper.examination !== 'CSS') return { subject: null, questions: [] }
  const subject = analysisSubjectFor(paper)
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
  /* The recorded questions are the only part of a paper page that is unique to
     that paper, so publish the whole set rather than a six-question teaser. */
  return { subject, questions: matching }
}

/**
 * Every paper page used to carry the same two paragraphs of study advice and
 * the same three-step grid, which left the bulk of each page identical to the
 * other 781. The guidance below is instead assembled from the paper's own
 * record — the topics it examined, how many questions it asked, and the other
 * years of the same subject held in the archive — so the prose differs where
 * the papers differ and says something a reader could not guess from the URL.
 */
function paperSpecificGuidance(paper, subject, questions, siblingYears) {
  const title = paperTitle(paper)
  const topics = [...new Set(questions.map((question) => String(question.topic || '').trim()).filter(Boolean))]
  const sentences = []

  if (questions.length) {
    sentences.push(`CSS Vista has recorded ${questions.length} question${questions.length === 1 ? '' : 's'} from the ${escapeHtml(title)}.`)
  }
  if (topics.length === 1) {
    sentences.push(`Every recorded question falls under ${escapeHtml(topics[0])}, so revision for this paper concentrates on a single area of the syllabus.`)
  } else if (topics.length > 1) {
    const listed = topics.slice(0, 4).map((topic) => escapeHtml(topic))
    sentences.push(`The recorded questions spread across ${topics.length} topic${topics.length === 1 ? '' : 's'}, led by ${listed.join(', ')}${topics.length > listed.length ? ' and others' : ''}.`)
  }
  if (siblingYears.length > 1) {
    const others = siblingYears.filter((year) => Number(year) !== Number(paper.year))
    if (others.length) {
      sentences.push(`The archive also holds ${escapeHtml(paper.subject)} for ${others.join(', ')}, which makes it possible to separate a recurring area from a question asked only in ${escapeHtml(String(paper.year))}.`)
    }
  }
  if (!sentences.length) {
    sentences.push(`This page records the examination, year, subject, paper designation and mode for the ${escapeHtml(title)} and links to the stored document.`)
  }
  sentences.push(`Read the paper once before attempting any answer, mark the command words, and check each question against the ${escapeHtml(paper.subject)} syllabus to see which areas your revision already covers.`)

  return `<section data-cssv-longtail-quality="paper" class="mt-8 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-5"><h2 class="font-display text-xl font-bold text-pine">Studying the ${escapeHtml(title)}</h2><p class="mt-2 text-sm leading-relaxed text-foreground/80">${sentences.join(' ')}</p><p class="mt-3 text-xs leading-relaxed text-foreground/70">An archived paper is evidence of what was previously examined, not a prediction of a future paper. Confirm current examination rules and dates with the relevant official authority.</p></section>`
}

function paperQualitySection(paper, subject, questions, siblingYears) {
  const questionList = questions.length
    ? `<section class="mt-8 rounded-xl border bg-white p-5"><h2 class="font-display text-xl font-bold text-pine">Questions recorded from this paper</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">These question wordings come from CSS Vista’s structured past-paper analysis for ${escapeHtml(paper.subject)}. Use them to identify the paper’s actual demand before opening the complete PDF.</p><ol class="mt-4 space-y-3">${questions.map((question) => `<li class="rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed"><span class="font-bold text-emerald-800">${escapeHtml(question.number || '')}${question.topic ? ` · ${escapeHtml(question.topic)}` : ''}</span><span class="mt-1 block">${escapeHtml(shorten(question.text, 600))}</span></li>`).join('')}</ol>${subject?.slug ? `<p class="mt-4 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis?subject=${encodeURIComponent(subject.slug)}">Explore the complete topic-wise ${escapeHtml(paper.subject)} past-paper analysis</a>.</p>` : ''}</section>`
    : ''

  return `${paperSpecificGuidance(paper, subject, questions, siblingYears)}${documentFactsSection(paper)}${questionList}${subjectProfileSection(paper, subject, questions)}${syllabusContextSection(paper)}`
}

/**
 * A year collection is distinguished by the papers it actually contains, so it
 * lists them — compulsory and optional separated, each linked — instead of
 * repeating the same three paragraphs of advice on all twenty-four pages.
 */
function collectionQualitySection(examination, year, papers) {
  const subjects = [...new Set(papers.map((paper) => paper.subject))]
  const compulsory = papers.filter((paper) => paper.designation === 'compulsory')
  const optional = papers.filter((paper) => paper.designation !== 'compulsory')

  const list = (entries) => entries
    .slice()
    .sort((a, b) => String(a.subject).localeCompare(String(b.subject), 'en'))
    .map((paper) => `<li><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers/view/${escapeHtml(paper.id)}">${escapeHtml(paper.subject)}</a>${paper.paper && paper.paper !== 'Single Paper' ? ` <span class="text-slate-600">— ${escapeHtml(paper.paper)}</span>` : ''}</li>`)
    .join('')

  const blocks = [
    compulsory.length ? `<div class="mt-4"><h3 class="font-semibold text-pine">Compulsory papers (${compulsory.length})</h3><ul class="mt-2 grid list-disc gap-1 pl-5 text-sm text-slate-700 sm:grid-cols-2">${list(compulsory)}</ul></div>` : '',
    optional.length ? `<div class="mt-4"><h3 class="font-semibold text-pine">Optional papers (${optional.length})</h3><ul class="mt-2 grid list-disc gap-1 pl-5 text-sm text-slate-700 sm:grid-cols-2">${list(optional)}</ul></div>` : '',
  ].filter(Boolean).join('')

  return `<section data-cssv-longtail-quality="collection" class="mt-8 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-5"><h2 class="font-display text-xl font-bold text-pine">Papers in the ${escapeHtml(examination)} ${escapeHtml(year)} collection</h2><p class="mt-2 text-sm leading-relaxed text-foreground/80">This collection holds ${papers.length} archived ${escapeHtml(examination)} ${escapeHtml(year)} paper${papers.length === 1 ? '' : 's'} across ${subjects.length} subject${subjects.length === 1 ? '' : 's'}. Each one links to its own page with the stored document, the recorded questions where available, and the same subject in other years.</p>${blocks}<div class="mt-5 flex flex-wrap gap-3 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/past-papers">Complete past-paper archive</a><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/fpsc-syllabus">FPSC syllabus &amp; topic planner</a>${examination === 'CSS' ? '<a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis">CSS topic-wise past-paper analysis</a>' : ''}</div><p class="mt-4 text-xs leading-relaxed text-foreground/70">Archived papers show what was previously examined. They do not guarantee the content of a later paper, and current examination rules or dates should be confirmed with the relevant official authority.</p></section>`
}

const pastPapers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)

/* Which other years the archive holds for the same examination and subject.
   This is what lets a paper page say something true about its own context. */
const yearsByExamSubject = new Map()
for (const paper of pastPapers) {
  const key = `${normalize(paper.examination)}|${normalize(paper.subject)}`
  if (!yearsByExamSubject.has(key)) yearsByExamSubject.set(key, new Set())
  yearsByExamSubject.get(key).add(Number(paper.year))
}

let strengthenedPapers = 0
let papersWithQuestions = 0

/**
 * A paper page whose only distinct content is a link to a stored document adds
 * nothing to the index, and a large set of them reads as mass-produced pages
 * rather than a library. Those pages stay published and reachable — the
 * document is still what a visitor came for — but they are marked noindex and
 * withheld from the sitemap so the site is judged on the pages that carry
 * genuine material. The threshold is applied after every enrichment above, so
 * a page only lands here when no real content could be found for it.
 */
const THIN_PAPER_WORD_FLOOR = 320
const thinPaperIds = []

function markNoindex(html) {
  return html.replace(/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="noindex, follow" />')
}

for (const paper of pastPapers) {
  const path = join(clientDir, 'seo', 'past-papers', `${paper.id}.html`)
  let html
  try { html = await readFile(path, 'utf8') } catch { continue }
  if (html.includes('data-cssv-longtail-quality="paper"')) continue

  const { subject, questions } = sourceQuestionsForPaper(paper)
  const siblingYears = [...(yearsByExamSubject.get(`${normalize(paper.examination)}|${normalize(paper.subject)}`) || [])]
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b)
  const section = paperQualitySection(paper, subject, questions, siblingYears)
  const next = html.replace('</main>', `${section}</main>`)
  if (next === html) throw new Error(`Could not strengthen past-paper page ${paper.id}`)
  const description = `Review the ${paper.year} ${paper.examination} ${paper.subject} past paper with PDF access, paper details, related years and focused study guidance${questions.length ? ', plus authentic question samples' : ''}.`
  html = replaceDescription(next, description)
  if (wordCount(html) < THIN_PAPER_WORD_FLOOR) {
    html = markNoindex(html)
    thinPaperIds.push(paper.id)
  }
  await writeFile(path, html)
  strengthenedPapers += 1
  if (questions.length) papersWithQuestions += 1
}

/* Hand the withheld URLs to the sitemap step so the two never disagree. */
await writeFile(
  join(clientDir, 'seo', 'noindex-past-papers.json'),
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), wordFloor: THIN_PAPER_WORD_FLOOR, ids: thinPaperIds }, null, 2),
)

const groups = new Map()
for (const paper of pastPapers) {
  const key = `${paper.examination}|${paper.year}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(paper)
}

let strengthenedCollections = 0
const thinCollectionPaths = []
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
  /* A year that holds only one or two papers cannot carry more than a listing.
     It stays reachable for navigation but, like a thin paper page, is not
     offered to the index. */
  if (wordCount(html) < THIN_PAPER_WORD_FLOOR) {
    html = markNoindex(html)
    thinCollectionPaths.push(`/past-papers/${examination.toLowerCase()}/${year}`)
  }
  await writeFile(path, html)
  strengthenedCollections += 1
}

await writeFile(
  join(clientDir, 'seo', 'noindex-past-paper-collections.json'),
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), wordFloor: THIN_PAPER_WORD_FLOOR, paths: thinCollectionPaths }, null, 2),
)

console.log(`Strengthened ${strengthenedPapers} individual past-paper pages and ${strengthenedCollections} collection pages; ${papersWithQuestions} CSS paper pages received source-backed question samples.`)
if (thinPaperIds.length || thinCollectionPaths.length) {
  console.log(`${thinPaperIds.length} archive-only paper pages and ${thinCollectionPaths.length} sparse year collections stayed under ${THIN_PAPER_WORD_FLOOR} words; they are published as noindex and withheld from the sitemap.`)
}
