/**
 * The single source of truth for what a past-paper page actually contains.
 *
 * A paper page is only worth indexing when CSS Vista holds the paper's real
 * recorded questions. A page whose sole unique content is six metadata fields
 * plus a PDF link is a document-access page: it stays fully served, fully
 * linked and fully downloadable, but it is not published to search, because
 * hundreds of such pages differ only by name and year.
 *
 * Both the sitemap/robots generation and the page enrichment read this module,
 * so the two can never disagree.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadGeneratedPastPapers } from './past-paper-registry.mjs'

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

/** The minimum number of recorded questions that makes a paper page worth indexing. */
export const MINIMUM_INDEXABLE_QUESTIONS = 3

export async function loadPastPaperContent(root) {
  const papers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)

  let analysis = null
  try {
    analysis = JSON.parse(await readFile(join(root, 'public', 'css-past-paper-analysis.json'), 'utf8'))
  } catch {
    analysis = null
  }

  const analysisSubjects = new Map()
  for (const subject of analysis?.subjects || []) {
    const questions = []
    for (const section of subject.sections || []) {
      for (const topic of section.topics || []) {
        for (const question of topic.questions || []) questions.push({ ...question, topic: topic.title })
      }
    }
    analysisSubjects.set(normalize(subject.name), { ...subject, questions })
  }

  return papers.map((paper) => {
    const { subject, questions } = questionsForPaper(paper, analysisSubjects)
    return {
      paper,
      subject,
      questions,
      /**
       * Fail closed: without enough authentic recorded questions the page has
       * no page-specific primary content and must not be indexed.
       */
      indexable: questions.length >= MINIMUM_INDEXABLE_QUESTIONS,
    }
  })
}

function questionsForPaper(paper, analysisSubjects) {
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

  return { subject, questions: matching.slice(0, 12) }
}
