import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Search-facing landing pages used to describe the material held behind the
 * interactive application without ever showing any of it. A visitor — and any
 * reviewer or crawler that does not execute the application — therefore saw a
 * summary of a resource instead of the resource itself.
 *
 * This module reads the same published data files the application fetches at
 * runtime and renders a genuine extract of each collection into the static
 * page: real questions with their correct answers and explanations, real
 * syllabus sections, real archive coverage. Nothing here invents content; when
 * a source file is missing or shaped unexpectedly the section is simply
 * omitted so a data problem can never fail a build or fabricate a page.
 */

const root = fileURLToPath(new URL('../..', import.meta.url))
const publicDir = join(root, 'public')

const cache = new Map()

function loadJson(...segments) {
  const key = segments.join('/')
  if (cache.has(key)) return cache.get(key)
  let value = null
  try {
    value = JSON.parse(readFileSync(join(publicDir, ...segments), 'utf8'))
  } catch {
    value = null
  }
  cache.set(key, value)
  return value
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function number(value) {
  return Number(value || 0).toLocaleString('en-US')
}

/**
 * Source text is imported from scanned syllabus and question documents, so it
 * can carry hyphenation and spacing artefacts from the original extraction.
 * Published prose is normalised rather than reproduced with those artefacts.
 */
function cleanText(value) {
  return String(value || '')
    .replace(/\s*-\s*\n\s*/g, '')
    .replace(/([a-z])\s-\s([a-z])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Some archived questions embed a full comprehension or translation passage.
 * An extract should show the demand of the question, not republish the whole
 * passage, so long source text is cut at a sentence-friendly boundary.
 */
function truncate(value, limit) {
  const text = String(value || '')
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const boundary = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('; '))
  return `${(boundary > limit * 0.5 ? cut.slice(0, boundary + 1) : cut).trim()}…`
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Renders one multiple-choice item as a self-contained reference entry: the
 * question, every option, the correct option marked in place and named
 * explicitly, and the source explanation when the bank supplies one.
 */
function renderQuestion(question, index, shape = 'gk') {
  if (!question) return ''
  const text = cleanText(shape === 'gk' ? question.q : question.question)
  const options = shape === 'gk' ? question.o : question.options
  if (!text || !Array.isArray(options) || options.length < 2) return ''

  const answerIndex = shape === 'gk' ? question.a : question.answer
  const valid = Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < options.length
  const explanation = cleanText(shape === 'gk' ? question.e : question.explanation)

  const renderedOptions = options.map((option, optionIndex) => {
    const correct = valid && optionIndex === answerIndex
    return `<li${correct ? ' class="font-semibold text-emerald-800"' : ''}>${escapeHtml(cleanText(option))}${correct ? ' <span class="text-xs uppercase tracking-wide">(correct)</span>' : ''}</li>`
  }).join('')

  const answerLine = valid
    ? `<p class="mt-2 text-sm font-semibold text-emerald-800">Answer: ${OPTION_LABELS[answerIndex] ?? answerIndex + 1}. ${escapeHtml(cleanText(options[answerIndex]))}</p>`
    : ''
  const explanationLine = explanation
    ? `<p class="mt-1 text-sm leading-relaxed text-slate-700">${escapeHtml(explanation)}</p>`
    : ''

  return `<li><h3 class="font-semibold text-pine">${index + 1}. ${escapeHtml(text)}</h3><ol class="mt-2 list-[upper-alpha] space-y-1 pl-6 text-sm text-slate-700">${renderedOptions}</ol>${answerLine}${explanationLine}</li>`
}

function questionList(questions, heading, intro, shape) {
  const items = questions
    .map((question, index) => renderQuestion(question, index, shape))
    .filter(Boolean)
    .join('')
  if (!items) return ''
  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">${escapeHtml(heading)}</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(intro)}</p><ol class="mt-5 space-y-5 rounded-xl border bg-white p-5">${items}</ol></section>`
}

/**
 * Evenly spaced sampling keeps an extract representative of a whole bank
 * instead of only its opening entries, and stays deterministic so repeated
 * builds of the same data produce byte-identical pages.
 */
function spread(items, limit) {
  if (!Array.isArray(items) || !items.length) return []
  if (items.length <= limit) return items.slice()
  const step = items.length / limit
  const picked = []
  for (let index = 0; index < limit; index += 1) picked.push(items[Math.floor(index * step)])
  return picked
}

/* ---------------------------------------------------------------- sources */

function subjectMcqIndex() {
  const index = loadJson('css-subject-mcqs', 'index.json')
  return index && Array.isArray(index.subjects) ? index : null
}

function subjectQuestions(slug) {
  const data = loadJson('css-subject-mcqs', `${slug}.json`)
  return Array.isArray(data) ? data : []
}

function gkIndex() {
  const index = loadJson('mcq', 'index.json')
  return index && Array.isArray(index.categories) ? index : null
}

function gkQuestions(slug) {
  const data = loadJson('mcq', `cat-${slug}-0.json`)
  return Array.isArray(data) ? data : []
}

function syllabusSubjects() {
  const data = loadJson('fpsc-syllabus.json')
  return data && Array.isArray(data.subjects) ? data.subjects : []
}

function analysisSubject(slug) {
  const data = loadJson('css-past-paper-analysis.json')
  if (!data || !Array.isArray(data.subjects)) return null
  return data.subjects.find((subject) => subject.slug === slug) || null
}

/**
 * Renders the questions an examination has actually asked for a subject,
 * grouped under the topic they were classified into and labelled with the year
 * they appeared. This is the material a candidate is looking for on a subject
 * page, and it is unique to each subject rather than shared wording.
 */
function examinedQuestionsSection(slug, label) {
  const subject = analysisSubject(slug)
  if (!subject || !Array.isArray(subject.sections)) return ''

  const topics = []
  for (const section of subject.sections) {
    for (const topic of section.topics || []) {
      if (Array.isArray(topic.questions) && topic.questions.length) topics.push(topic)
    }
  }
  if (!topics.length) return ''

  const rendered = spread(topics, 10).map((topic) => {
    const questions = spread(topic.questions, 4)
      .map((question) => {
        const text = truncate(cleanText(question.text), 320)
        if (text.length < 12) return ''
        return `<li><span class="font-semibold text-emerald-800">${escapeHtml(String(question.year || ''))}</span> — ${escapeHtml(text)}</li>`
      })
      .filter(Boolean)
      .join('')
    const title = cleanText(topic.title)
    if (!questions || !title) return ''
    return `<div class="mt-4"><h3 class="font-semibold text-pine">${escapeHtml(title)}</h3>${topic.summary ? `<p class="text-xs uppercase tracking-wide text-emerald-700">${escapeHtml(cleanText(topic.summary))}</p>` : ''}<ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">${questions}</ul></div>`
  }).filter(Boolean).join('')
  if (!rendered) return ''

  const years = Array.isArray(subject.years) && subject.years.length
    ? `${subject.years[0]}–${subject.years[subject.years.length - 1]}`
    : ''

  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">${escapeHtml(`What ${label} has actually asked`)}</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`${number(subject.questionCount)} questions from past ${label} papers${years ? ` (${years})` : ''} grouped into ${number(subject.topicCount)} recurring topics. The wording below is taken from the papers themselves.`)}</p><div class="mt-4 rounded-xl border bg-white p-5">${rendered}</div><p class="mt-4 text-sm"><a class="font-semibold text-emerald-800 underline underline-offset-2" href="/css-past-paper-analysis?subject=${encodeURIComponent(slug)}">Open the complete topic-wise ${escapeHtml(label)} analysis</a></p></section>`
}

/* --------------------------------------------------------------- sections */

function subjectTable(subjects, heading, caption) {
  const rows = subjects.map((subject) => `<tr class="border-t"><td class="py-2 pr-4 font-semibold text-pine">${escapeHtml(subject.name)}</td><td class="py-2 pr-4 text-slate-700">${escapeHtml(subject.designation === 'compulsory' ? 'Compulsory' : `Optional${subject.group ? ` · Group ${subject.group}` : ''}`)}</td><td class="py-2 text-right tabular-nums text-slate-700">${number(subject.count)}</td></tr>`).join('')
  if (!rows) return ''
  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">${escapeHtml(heading)}</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(caption)}</p><div class="mt-4 overflow-x-auto rounded-xl border bg-white p-5"><table class="w-full text-sm"><thead><tr class="text-left text-xs uppercase tracking-wide text-emerald-700"><th class="pb-2 pr-4">Subject</th><th class="pb-2 pr-4">Paper type</th><th class="pb-2 text-right">Questions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`
}

function syllabusSections(subject, limit = 6) {
  const sections = Array.isArray(subject.sections) ? subject.sections.slice(0, limit) : []
  const rendered = sections.map((section) => {
    const items = (Array.isArray(section.items) ? section.items : [])
      .map((item) => cleanText(item))
      .filter((item) => item.length > 25)
      .slice(0, 5)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('')
    const title = cleanText(section.title)
    if (!title) return ''
    return `<div class="mt-4"><h3 class="font-semibold text-pine">${escapeHtml(title)}</h3>${items ? `<ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">${items}</ul>` : ''}</div>`
  }).join('')
  if (!rendered) return ''
  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">${escapeHtml(`${subject.name} syllabus`)}</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">Section headings and requirements as published in the FPSC syllabus${subject.marks ? ` for this ${number(subject.marks)}-mark paper` : ''}.</p><div class="mt-4 rounded-xl border bg-white p-5">${rendered}</div></section>`
}

/* Maps a subject route to its syllabus entry, question bank and analysis. */
const SUBJECT_ROUTES = {
  '/subjects/compulsory/essay': { syllabus: null, mcq: null, analysis: 'essay', label: 'CSS English Essay' },
  '/subjects/compulsory/precis-composition': { syllabus: 'precis-composition', mcq: null, analysis: 'precis-composition', label: 'CSS English (Precis & Composition)' },
  '/subjects/compulsory/general-science-ability': { syllabus: 'general-science-ability', mcq: 'general-science-and-ability', analysis: 'general-science-ability', label: 'CSS General Science & Ability' },
  '/subjects/compulsory/current-affairs': { syllabus: 'current-affairs', mcq: 'current-affairs', analysis: 'current-affairs', label: 'CSS Current Affairs' },
  '/subjects/compulsory/pakistan-affairs': { syllabus: 'pakistan-affairs', mcq: null, analysis: 'pakistan-affairs', label: 'CSS Pakistan Affairs' },
  '/subjects/compulsory/islamic-studies': { syllabus: 'islamic-studies', mcq: 'islamic-studies', analysis: 'islamic-studies', label: 'CSS Islamic Studies' },
  '/essay': { syllabus: null, mcq: null, analysis: 'essay', label: 'CSS English Essay' },
}

function compulsorySubjectSection(routePath) {
  const config = SUBJECT_ROUTES[routePath]
  if (!config) return ''
  let html = ''

  if (config.syllabus) {
    const subject = syllabusSubjects().find((entry) => entry.slug === config.syllabus)
    /* Pakistan Affairs and similar papers publish many short syllabus
       headings, so the cap is raised where the source has depth to show. */
    if (subject) html += syllabusSections(subject, 12)
  }

  if (config.analysis) html += examinedQuestionsSection(config.analysis, config.label)

  if (config.mcq) {
    const index = subjectMcqIndex()
    const meta = index?.subjects.find((entry) => entry.slug === config.mcq)
    const questions = spread(subjectQuestions(config.mcq), 15)
    html += questionList(
      questions,
      `${config.label} practice questions with answers`,
      meta
        ? `A cross-section of the published ${config.label} bank of ${number(meta.count)} questions, each shown with its correct option.`
        : `Published ${config.label} practice questions, each shown with its correct option.`,
      'subject',
    )
  }

  return html
}

function cssMcqSection() {
  const index = subjectMcqIndex()
  if (!index) return ''
  const subjects = index.subjects.slice()
  let html = subjectTable(
    subjects,
    'Every CSS subject question bank',
    `CSS Vista publishes ${number(index.total)} subject questions across ${subjects.length} compulsory and optional CSS papers. The table lists each bank and the number of questions it currently holds.`,
  )

  /* A worked extract from several different banks shows the depth and the
     style of the material rather than describing it. */
  const featured = ['pakistan-affairs', 'current-affairs', 'international-relations', 'political-science', 'islamic-studies']
  const picked = []
  for (const slug of featured) {
    const meta = subjects.find((entry) => entry.slug === slug)
    if (!meta) continue
    for (const question of spread(subjectQuestions(slug), 4)) picked.push(question)
  }
  html += questionList(
    picked,
    'Sample questions with answers and explanations',
    'A worked extract drawn from several CSS subject banks. Each question shows the correct option and, where the bank records one, the reasoning behind it.',
    'subject',
  )
  return html
}

function gkSection() {
  const index = gkIndex()
  if (!index) return ''
  const categories = index.categories.slice()
  const rows = categories.map((category) => `<li><a href="/gk/cat/${escapeHtml(category.slug)}" class="font-semibold text-emerald-800 underline underline-offset-2">${escapeHtml(category.name)}</a> <span class="text-slate-600">— ${number(category.count)} questions</span></li>`).join('')
  let html = rows
    ? `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">General-knowledge categories</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`GK World holds ${number(index.total)} questions across ${categories.length} categories. Each category page publishes its questions with the correct answers.`)}</p><ul class="mt-4 grid gap-2 rounded-xl border bg-white p-5 text-sm sm:grid-cols-2">${rows}</ul></section>`
    : ''

  const picked = []
  for (const category of spread(categories, 6)) {
    for (const question of spread(gkQuestions(category.slug), 3)) picked.push(question)
  }
  html += questionList(
    picked,
    'Sample general-knowledge questions with answers',
    'Questions drawn from across the GK categories, each shown with the correct option and its explanation.',
    'gk',
  )
  return html
}

function oneLinerSection() {
  const index = loadJson('one-liner-gk', 'index.json')
  if (!index || !Array.isArray(index.categories)) return ''
  const categories = index.categories

  const rows = categories.map((category) => `<li><span class="font-semibold text-pine">${escapeHtml(category.name)}</span> <span class="text-slate-600">— ${number(category.count)} facts</span></li>`).join('')
  let html = rows
    ? `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">One-liner coverage</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`The one-liner collection holds ${number(index.total)} compiled facts across ${categories.length} categories, prepared for rapid revision and screening-test recall.`)}</p><ul class="mt-4 grid gap-2 rounded-xl border bg-white p-5 text-sm sm:grid-cols-2">${rows}</ul></section>`
    : ''

  const facts = []
  for (const category of spread(categories, 5)) {
    const data = loadJson('one-liner-gk', `${category.slug}.json`)
    const notes = data && Array.isArray(data.notes) ? data.notes : []
    for (const note of spread(notes.filter((entry) => !entry.timeSensitive), 5)) {
      const text = cleanText(note?.text)
      if (text.length > 20) facts.push({ category: category.name, text })
    }
  }
  if (facts.length) {
    const items = facts.map((fact) => `<li><span class="text-xs font-semibold uppercase tracking-wide text-emerald-700">${escapeHtml(fact.category)}</span><br />${escapeHtml(fact.text)}</li>`).join('')
    html += `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Sample one-liner facts</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">A cross-section of the compiled collection. Time-sensitive entries are excluded from this extract because figures and office-holders change.</p><ul class="mt-4 space-y-3 rounded-xl border bg-white p-5 text-sm leading-relaxed text-slate-700">${items}</ul></section>`
  }
  return html
}

function syllabusHubSection() {
  const subjects = syllabusSubjects()
  if (!subjects.length) return ''
  const compulsory = subjects.filter((subject) => subject.designation === 'compulsory')
  const optional = subjects.filter((subject) => subject.designation !== 'compulsory')

  const row = (subject) => `<li><span class="font-semibold text-pine">${escapeHtml(subject.name)}</span>${subject.marks ? ` <span class="text-slate-600">— ${number(subject.marks)} marks</span>` : ''}${Array.isArray(subject.sections) && subject.sections.length ? ` <span class="text-slate-600">· ${subject.sections.length} syllabus sections</span>` : ''}</li>`

  let html = `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Syllabus coverage</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`The published FPSC syllabus set on CSS Vista covers ${subjects.length} papers: ${compulsory.length} compulsory and ${optional.length} optional.`)}</p><div class="mt-4 grid gap-5 rounded-xl border bg-white p-5 lg:grid-cols-2"><div><h3 class="font-semibold text-pine">Compulsory papers</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">${compulsory.map(row).join('')}</ul></div><div><h3 class="font-semibold text-pine">Optional papers</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">${optional.slice(0, 30).map(row).join('')}</ul></div></div></section>`

  const detailed = compulsory.find((subject) => Array.isArray(subject.sections) && subject.sections.length > 2)
  if (detailed) html += syllabusSections(detailed, 5)
  return html
}

function compulsoryHubSection() {
  const subjects = syllabusSubjects().filter((subject) => subject.designation === 'compulsory')
  if (!subjects.length) return ''

  const analysis = loadJson('css-past-paper-analysis.json')
  const analysisBySlug = new Map(
    (analysis && Array.isArray(analysis.subjects) ? analysis.subjects : []).map((subject) => [subject.slug, subject]),
  )
  const mcqBySlug = new Map((subjectMcqIndex()?.subjects || []).map((subject) => [subject.slug, subject]))

  const cards = subjects.map((subject) => {
    const sections = (Array.isArray(subject.sections) ? subject.sections : [])
      .slice(0, 8)
      .map((section) => cleanText(section.title))
      .filter(Boolean)
      .map((title) => `<li>${escapeHtml(title)}</li>`)
      .join('')

    const examined = analysisBySlug.get(subject.slug)
    const bank = mcqBySlug.get(subject.slug) || mcqBySlug.get(subject.slug.replace('-ability', '-and-ability'))
    const facts = []
    if (subject.marks) facts.push(`${number(subject.marks)} marks`)
    if (Array.isArray(subject.sections) && subject.sections.length) facts.push(`${subject.sections.length} syllabus sections`)
    if (examined) facts.push(`${number(examined.questionCount)} examined questions across ${number(examined.topicCount)} topics`)
    if (bank) facts.push(`${number(bank.count)} practice questions`)

    return `<div class="mt-5"><h3 class="font-semibold text-pine">${escapeHtml(subject.name)}</h3>${facts.length ? `<p class="text-xs uppercase tracking-wide text-emerald-700">${escapeHtml(facts.join(' · '))}</p>` : ''}${sections ? `<ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">${sections}</ul>` : ''}</div>`
  }).join('')

  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Compulsory papers and their syllabus sections</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">Each compulsory paper is listed with its marks, the published FPSC syllabus sections, and how much examined and practice material CSS Vista holds for it.</p><div class="mt-4 rounded-xl border bg-white p-5">${cards}</div></section>`
}

function optionalHubSection() {
  const index = subjectMcqIndex()
  const subjects = index ? index.subjects.filter((subject) => subject.designation !== 'compulsory') : []
  if (!subjects.length) return ''
  const groups = new Map()
  for (const subject of subjects) {
    const key = subject.group || 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(subject)
  }
  const rendered = [...groups.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'en', { numeric: true }))
    .map(([group, entries]) => `<div class="mt-4"><h3 class="font-semibold text-pine">${escapeHtml(group === 'Other' ? 'Other optional subjects' : `Group ${group}`)}</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">${entries.map((subject) => `<li>${escapeHtml(subject.name)} <span class="text-slate-600">— ${number(subject.count)} practice questions</span>${Array.isArray(subject.topics) && subject.topics.length ? ` <span class="text-slate-600">· ${subject.topics.length} syllabus topics</span>` : ''}</li>`).join('')}</ul></div>`)
    .join('')
  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Optional subjects by FPSC group</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">Optional subjects are shown inside their FPSC group with the volume of published practice material for each, so a combination can be weighed against the work it requires.</p><div class="mt-4 rounded-xl border bg-white p-5">${rendered}</div></section>`
}

/**
 * Archive coverage is derived from the generated past-paper registry, the same
 * list the individual paper pages and sitemaps are built from, so the hub can
 * never advertise a year the archive does not actually hold. The registry
 * loader is asynchronous, so the caller supplies the records as context.
 */
function pastPapersSection(context) {
  const papers = Array.isArray(context?.pastPapers) ? context.pastPapers : []
  if (!papers.length) return ''

  const byExam = new Map()
  for (const paper of papers) {
    const exam = String(paper.examination || paper.exam || '').toUpperCase()
    const year = Number(paper.year)
    if (!exam || !Number.isFinite(year)) continue
    if (!byExam.has(exam)) byExam.set(exam, new Map())
    const years = byExam.get(exam)
    years.set(year, (years.get(year) || 0) + 1)
  }
  if (!byExam.size) return ''

  const blocks = [...byExam.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'en'))
    .map(([exam, years]) => {
      const sorted = [...years.entries()].sort((a, b) => b[0] - a[0])
      const total = sorted.reduce((sum, [, count]) => sum + count, 0)
      const items = sorted.map(([year, count]) => `<li><a href="/past-papers/${escapeHtml(exam.toLowerCase())}/${year}" class="font-semibold text-emerald-800 underline underline-offset-2">${escapeHtml(exam)} ${year}</a> <span class="text-slate-600">— ${number(count)} paper${count === 1 ? '' : 's'}</span></li>`).join('')
      return `<div class="mt-4"><h3 class="font-semibold text-pine">${escapeHtml(exam)} — ${number(total)} papers</h3><ul class="mt-2 grid list-disc gap-1 pl-5 text-sm text-slate-700 sm:grid-cols-2">${items}</ul></div>`
    }).join('')

  /* Subject-level analysis tells a visitor which papers are worth opening. */
  const analysis = loadJson('css-past-paper-analysis.json')
  const subjects = analysis && Array.isArray(analysis.subjects) ? analysis.subjects : []
  const analysisRows = subjects
    .slice()
    .sort((a, b) => Number(b.questionCount || 0) - Number(a.questionCount || 0))
    .slice(0, 24)
    .map((subject) => `<li><span class="font-semibold text-pine">${escapeHtml(subject.name)}</span> <span class="text-slate-600">— ${number(subject.questionCount)} questions across ${number(subject.topicCount)} topics</span></li>`)
    .join('')
  const analysisBlock = analysisRows
    ? `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Questions already extracted from these papers</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`CSS Vista has read ${number(subjects.length)} CSS subjects out of the archive and grouped their questions by recurring topic, so a subject can be studied by demand rather than by year.`)}</p><ul class="mt-4 grid gap-2 rounded-xl border bg-white p-5 text-sm sm:grid-cols-2">${analysisRows}</ul></section>`
    : ''

  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">What the archive contains</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`The archive holds ${number(papers.length)} papers. Each examination is listed below by year with the number of papers available, so coverage can be checked before opening a collection.`)}</p><div class="mt-4 rounded-xl border bg-white p-5">${blocks}</div></section>${analysisBlock}`
}

function bookSummariesSection() {
  const index = loadJson('book-summaries', 'index.json')
  const books = index && Array.isArray(index.books) ? index.books : []
  if (!books.length) return ''
  const items = books.slice(0, 40).map((book) => {
    const excerpt = cleanText(book.excerpt).slice(0, 220)
    return `<li><a href="/book-summaries/${escapeHtml(book.slug)}" class="font-semibold text-emerald-800 underline underline-offset-2">${escapeHtml(book.title)}</a>${book.author ? ` <span class="text-slate-600">— ${escapeHtml(book.author)}</span>` : ''}${excerpt ? `<p class="mt-1 text-sm leading-relaxed text-slate-700">${escapeHtml(excerpt)}…</p>` : ''}</li>`
  }).join('')
  return `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Summaries in the library</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`${number(index.total || books.length)} book summaries are published for competitive-examination reading, each written as a standalone explanation of the book's argument.`)}</p><ul class="mt-4 space-y-4 rounded-xl border bg-white p-5">${items}</ul></section>`
}

function mptSection() {
  const index = gkIndex()
  if (!index) return ''
  const mpt = index.categories.filter((category) => category.mpt)
  if (!mpt.length) return ''
  const total = mpt.reduce((sum, category) => sum + Number(category.count || 0), 0)
  const rows = mpt.map((category) => `<li><a href="/gk/cat/${escapeHtml(category.slug)}" class="font-semibold text-emerald-800 underline underline-offset-2">${escapeHtml(category.name)}</a> <span class="text-slate-600">— ${number(category.count)} questions</span></li>`).join('')
  let html = `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">MPT question coverage</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`${number(total)} screening-test questions are published across ${mpt.length} categories relevant to the CSS MPT.`)}</p><ul class="mt-4 grid gap-2 rounded-xl border bg-white p-5 text-sm sm:grid-cols-2">${rows}</ul></section>`

  const picked = []
  for (const category of spread(mpt, 5)) {
    for (const question of spread(gkQuestions(category.slug), 3)) picked.push(question)
  }
  html += questionList(picked, 'Sample MPT-style questions with answers', 'Representative screening-test questions shown with the correct option and explanation.', 'gk')
  return html
}

function analysisHubSection() {
  const analysis = loadJson('css-past-paper-analysis.json')
  const subjects = analysis && Array.isArray(analysis.subjects) ? analysis.subjects : []
  if (!subjects.length) return ''

  const totalQuestions = subjects.reduce((sum, subject) => sum + Number(subject.questionCount || 0), 0)
  const rows = subjects
    .slice()
    .sort((a, b) => Number(b.questionCount || 0) - Number(a.questionCount || 0))
    .map((subject) => {
      const years = Array.isArray(subject.years) && subject.years.length
        ? `${subject.years[0]}–${subject.years[subject.years.length - 1]}`
        : '—'
      return `<tr class="border-t"><td class="py-2 pr-4 font-semibold text-pine">${escapeHtml(subject.name)}</td><td class="py-2 pr-4 tabular-nums text-slate-700">${number(subject.questionCount)}</td><td class="py-2 pr-4 tabular-nums text-slate-700">${number(subject.topicCount)}</td><td class="py-2 text-slate-700">${escapeHtml(years)}</td></tr>`
    }).join('')

  let html = `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Subjects covered by the analysis</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(`${number(totalQuestions)} questions from past CSS papers have been read and grouped by recurring topic across ${subjects.length} subjects.`)}</p><div class="mt-4 overflow-x-auto rounded-xl border bg-white p-5"><table class="w-full text-sm"><thead><tr class="text-left text-xs uppercase tracking-wide text-emerald-700"><th class="pb-2 pr-4">Subject</th><th class="pb-2 pr-4">Questions</th><th class="pb-2 pr-4">Topics</th><th class="pb-2">Years</th></tr></thead><tbody>${rows}</tbody></table></div></section>`

  /* One worked subject shows what the analysis produces. */
  const featured = subjects.find((subject) => subject.slug === 'pakistan-affairs') || subjects[0]
  if (featured) html += examinedQuestionsSection(featured.slug, featured.name)
  return html
}

function languageGrammarSection() {
  const index = loadJson('language-grammar', 'index.json')
  const languages = index && Array.isArray(index.languages) ? index.languages : []
  if (!languages.length) return ''

  const blocks = languages.map((language) => {
    const data = loadJson('language-grammar', `${language.slug}.json`)
    const topics = data && Array.isArray(data.topics) ? data.topics : []
    const topicList = topics.map((topic) => `<li><span class="font-semibold text-pine">${escapeHtml(cleanText(topic.title))}</span>${topic.description ? ` — ${escapeHtml(cleanText(topic.description))}` : ''}${Array.isArray(topic.items) ? ` <span class="text-slate-600">(${number(topic.items.length)} entries)</span>` : ''}</li>`).join('')
    if (!topicList) return ''
    return `<div class="mt-4"><h3 class="font-semibold text-pine">${escapeHtml(language.name)} — ${number(language.total)} entries</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">${topicList}</ul></div>`
  }).filter(Boolean).join('')
  if (!blocks) return ''

  let html = `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Grammar topics covered</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">Every topic below is published with worked entries rather than as a heading alone.</p><div class="mt-4 rounded-xl border bg-white p-5">${blocks}</div></section>`

  /* A worked example demonstrates the format of the published entries. */
  const english = loadJson('language-grammar', 'english.json')
  const sampleTopic = english && Array.isArray(english.topics)
    ? english.topics.find((topic) => Array.isArray(topic.items) && topic.items.length)
    : null
  if (sampleTopic) {
    const examples = spread(sampleTopic.items, 6).map((item) => {
      const fields = (Array.isArray(item.fields) ? item.fields : [])
        .map((field) => `<li><span class="font-semibold text-pine">${escapeHtml(cleanText(field.label))}:</span> ${escapeHtml(cleanText(field.value))}</li>`)
        .join('')
      return fields ? `<li class="rounded-lg bg-secondary/40 p-3"><ul class="space-y-1 text-sm text-slate-700">${fields}</ul></li>` : ''
    }).filter(Boolean).join('')
    if (examples) {
      html += `<section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">Worked examples: ${escapeHtml(cleanText(sampleTopic.title))}</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escapeHtml(cleanText(sampleTopic.description || 'Entries as published in the grammar reference.'))}</p><ol class="mt-4 space-y-3 rounded-xl border bg-white p-5">${examples}</ol></section>`
    }
  }
  return html
}

const BUILDERS = {
  '/css-mcqs': cssMcqSection,
  '/css-past-paper-analysis': analysisHubSection,
  '/language-grammar': languageGrammarSection,
  '/gk': gkSection,
  '/one-liner-gk': oneLinerSection,
  '/fpsc-syllabus': syllabusHubSection,
  '/subjects/compulsory': compulsoryHubSection,
  '/subjects/optional': optionalHubSection,
  '/past-papers': pastPapersSection,
  '/book-summaries': bookSummariesSection,
  '/mpt': mptSection,
}

/**
 * Returns published-data-backed HTML for a route, or an empty string when the
 * route has no extractable collection behind it. Never throws: a landing page
 * must still build if a data file is absent.
 *
 * `context.pastPapers` supplies the generated past-paper registry for routes
 * that report archive coverage.
 */
export function buildRealContentSection(routePath, context = {}) {
  try {
    const builder = BUILDERS[routePath]
    if (builder) return builder(context) || ''
    return compulsorySubjectSection(routePath) || ''
  } catch {
    return ''
  }
}

export function countWords(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}
