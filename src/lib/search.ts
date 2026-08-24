// Unified, lazy client-side search across CSS Vista content.
import { compulsorySubjects, optionalGroups } from '@/data/syllabus'
import { vocabulary } from '@/data/vocab'
import { grammarTopics, idioms, pairOfWords } from '@/data/grammar'
import { caIssues } from '@/data/currentAffairs'
import { serviceGroups } from '@/data/services'
import { libraryItems } from '@/data/library'
import { essayThemes } from '@/data/essay'
import { questions } from '@/data/quiz'
import { fpscNotices } from '@/data/updates'
import { defaultHomeCards } from '@/data/homeCards'
import { noteProducts } from '@/data/notes'
import { lectureCourses } from '@/data/lectures'
import { handwrittenNoteSubjects } from '@/data/handwrittenNotes'

export interface SearchResult {
  id: string
  title: string
  category: string
  snippet: string
  link: string
  date?: string
}

interface SearchDocument extends SearchResult {
  keywords?: string
  linkForQuery?: (query: string) => string
}

interface RemoteBookLibrary {
  categories: { slug: string; name: string }[]
  books: {
    slug: string
    category: string
    title: string
    author: string
    excerpt: string
    body: string
  }[]
}

interface RemoteBankIndex {
  categories: { slug: string; name: string; count: number; mpt: boolean }[]
}

interface RemoteOneLinerIndex {
  categories: { slug: string; name: string; subcategories: { name: string }[] }[]
}

interface RemoteOneLinerCategory {
  slug: string
  name: string
  notes: { id: string; text: string; subcategory: string }[]
}

interface RemoteGrammarCourse {
  language: string
  topics: {
    slug: string
    title: string
    description: string
    items: { id: string; fields: { label: string; value: string }[] }[]
  }[]
}

interface RemoteSubjectMcqIndex {
  subjects: { slug: string; name: string; designation: string; group: number | null; count: number; topics: string[] }[]
}

interface RemoteFpscSyllabus {
  subjects: { slug: string; name: string; designation: string; group: number | null; marks: number; sections: { title: string; items: string[] }[] }[]
}

interface RemotePastPaperAnalysisIndex {
  subjects: {
    slug: string
    name: string
    questionCount: number
    topicCount: number
    years: number[]
    sections: { title: string; topics: { id: string; title: string; questionCount: number; years: number[] }[] }[]
  }[]
}

interface RemoteRecentAffairs {
  oneLiners: { date: string; development: string; fact: string }[]
  mcqs: { id: string; date: string; development: string; question: string; explanation: string }[]
}

const pageCorpus: SearchDocument[] = defaultHomeCards.map((card) => ({
  id: `page-${card.id}`,
  title: card.title,
  category: 'Website Section',
  snippet: card.desc,
  link: card.to,
}))

const localCorpus: SearchDocument[] = [
  ...pageCorpus,
  {
    id: 'one-liner-gk',
    title: 'One-Liner GK',
    category: 'GK World',
    snippet: 'Searchable, category-wise facts for Pakistan Affairs, Islamiat, geography, science, computers and general knowledge.',
    link: '/one-liner-gk',
  },
  {
    id: 'language-grammar',
    title: 'Urdu and English Grammar',
    category: 'Grammar Courses',
    snippet: 'Structured Urdu and English grammar lessons, rules and reference material.',
    link: '/language-grammar',
  },
  {
    id: 'answer-evaluation-subjects',
    title: 'Answer Evaluation by Miss Sadia Zahoor, PAS',
    category: 'Answer Evaluation',
    snippet: 'CSS Essay, English Precis and Composition, General Science and Ability, Current Affairs, Pakistan Affairs, Islamic Studies, Political Science, Criminology, European History, Environmental Science and Punjabi.',
    link: '/answer-evaluation',
  },
  ...compulsorySubjects.flatMap((subject) => [
    {
      id: `sub-${subject.slug}`,
      title: subject.name,
      category: 'Compulsory Subjects',
      snippet: `${subject.overview} Topics: ${subject.topics.flatMap((topic) => topic.points).slice(0, 8).join(', ')}`,
      link: `/subjects/compulsory/${subject.slug}`,
    },
    ...subject.topics.map((topic) => ({
      id: `sub-topic-${subject.slug}-${topic.title}`,
      title: `${subject.name}: ${topic.title}`,
      category: 'Compulsory Subject Topic',
      snippet: topic.points.join(', '),
      link: `/subjects/compulsory/${subject.slug}`,
    })),
  ]),
  ...optionalGroups.flatMap((group) =>
    group.subjects.map((subject) => ({
      id: `opt-${subject.name}`,
      title: `${subject.name} (Group ${group.group}, ${subject.marks} marks)`,
      category: 'Optional Subjects',
      snippet: `${subject.nature}. Background: ${subject.background}. Overlap: ${subject.overlap}. ${subject.suitedFor}`,
      link: '/subjects/optional',
    })),
  ),
  ...lectureCourses.flatMap((course) => [
    {
      id: `lecture-${course.slug}`,
      title: `${course.title} Lectures`,
      category: 'Free CSS Vista Lectures',
      snippet: `${course.kind}, ${course.marks} marks, ${course.paperLabel}.`,
      link: '/lectures',
    },
    ...course.topics.map((topic) => ({
      id: `lecture-topic-${course.slug}-${topic.slug}`,
      title: `${course.title}: ${topic.title}`,
      category: 'Lecture Topic',
      snippet: topic.summary,
      link: '/lectures',
    })),
  ]),
  ...handwrittenNoteSubjects.map((subject) => ({
    id: `handwritten-${subject.slug}`,
    title: `${subject.title} Handwritten Notes`,
    category: 'Handwritten Notes by Miss Sadia Zahoor, PAS',
    snippet: subject.description,
    link: '/handwritten-notes',
  })),
  ...noteProducts.flatMap((product) => [
    {
      id: `notes-${product.id}`,
      title: product.subject,
      category: 'Notes Library',
      snippet: product.description,
      link: '/notes',
    },
    ...(product.samples ?? []).map((sample) => ({
      id: `notes-sample-${sample.url ?? sample.previewFolder}`,
      title: sample.title,
      category: 'Sample Notes',
      snippet: `${product.subject} sample preview`,
      link: '/notes',
    })),
  ]),
  ...vocabulary.map((item) => ({
    id: `voc-${item.word}`,
    title: item.word,
    category: 'Vocabulary',
    snippet: `${item.pos}: ${item.meaning}. Synonyms: ${item.synonyms.join(', ')}. ${item.sentence}`,
    link: '/grammar-vocabulary',
  })),
  ...grammarTopics.map((topic) => ({
    id: `gram-${topic.slug}`,
    title: topic.name,
    category: 'Grammar',
    snippet: `${topic.summary} ${topic.rules.map((rule) => rule.rule).join(' ')}`,
    link: '/grammar-vocabulary',
  })),
  ...idioms.map((item) => ({
    id: `idiom-${item.idiom}`,
    title: item.idiom,
    category: 'Grammar: Idioms',
    snippet: `${item.meaning}. ${item.sentence}`,
    link: '/grammar-vocabulary',
  })),
  ...pairOfWords.map((item) => ({
    id: `pair-${item.a}`,
    title: `${item.a} vs ${item.b}`,
    category: 'Grammar: Pair of Words',
    snippet: `${item.a}: ${item.aMeaning}. ${item.b}: ${item.bMeaning}.`,
    link: '/grammar-vocabulary',
  })),
  ...caIssues.map((issue) => ({
    id: `ca-${issue.slug}`,
    title: issue.title,
    category: 'Current Affairs',
    snippet: `${issue.background} ${issue.pakistanImplications.join(' ')}`,
    link: `/current-affairs#${issue.slug}`,
    date: issue.lastUpdated,
  })),
  ...serviceGroups.map((service) => ({
    id: `svc-${service.slug}`,
    title: service.name,
    category: 'Services Guide',
    snippet: `${service.role} ${service.work}`,
    link: `/services#${service.slug}`,
  })),
  ...libraryItems.map((item) => ({
    id: item.id,
    title: item.title,
    category: 'Study Library',
    snippet: `${item.description} Tags: ${item.tags.join(', ')}`,
    link: item.fileUrl === '/past-papers' ? '/past-papers' : '/notes',
    date: item.lastUpdated,
  })),
  ...essayThemes.map((theme) => ({
    id: `essay-${theme.slug}`,
    title: `Essay theme: ${theme.name}`,
    category: 'Essay',
    snippet: `${theme.angles.join(', ')}. Topics: ${theme.sampleTopics.join('; ')}`,
    link: '/essay',
  })),
  ...questions.map((question) => ({
    id: `q-${question.id}`,
    title: question.question.slice(0, 110),
    category: 'MPT Question',
    snippet: question.options.join(' / '),
    link: '/mpt',
  })),
  ...fpscNotices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    category: 'FPSC Updates',
    snippet: notice.summary,
    link: '/fpsc-updates',
  })),
]

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return response.json() as Promise<T>
  } catch {
    return null
  }
}

let remoteCorpusRequest: Promise<SearchDocument[]> | null = null

function loadRemoteCorpus(): Promise<SearchDocument[]> {
  if (remoteCorpusRequest) return remoteCorpusRequest

  remoteCorpusRequest = (async () => {
    const [
      pastPaperModule,
      bookLibrary,
      bankIndex,
      oneLinerIndex,
      englishGrammar,
      urduGrammar,
      subjectMcqIndex,
      fpscSyllabus,
      pastPaperAnalysis,
      recentAffairs,
    ] = await Promise.all([
      import('@/data/pastPapers').catch(() => null),
      fetchJson<RemoteBookLibrary>('/book-summaries/index.json'),
      fetchJson<RemoteBankIndex>('/mcq/index.json'),
      fetchJson<RemoteOneLinerIndex>('/one-liner-gk/index.json'),
      fetchJson<RemoteGrammarCourse>('/language-grammar/english.json'),
      fetchJson<RemoteGrammarCourse>('/language-grammar/urdu.json'),
      fetchJson<RemoteSubjectMcqIndex>('/css-subject-mcqs/index.json'),
      fetchJson<RemoteFpscSyllabus>('/fpsc-syllabus.json'),
      fetchJson<RemotePastPaperAnalysisIndex>('/css-past-paper-analysis-index.json'),
      fetchJson<RemoteRecentAffairs>('/recent-affairs/batch-2026-07-11_2026-08-16.json'),
    ])

    const remote: SearchDocument[] = []

    if (pastPaperModule) {
      remote.push(...pastPaperModule.pastPapers.map((paper) => ({
        id: `paper-${paper.id}`,
        title: `${paper.examination}: ${paper.title}`,
        category: 'Past Papers',
        snippet: `${paper.subjectType}, ${paper.paper}, ${paper.mode}${paper.optionalGroup ? `, Group ${paper.optionalGroup}` : ''}`,
        link: paper.fileUrl ? `/past-papers/view/${paper.id}` : '/past-papers',
        keywords: `${paper.subject} ${paper.year} ${paper.examination}`,
        linkForQuery: (query: string) => `/past-papers?search=${encodeURIComponent(query)}`,
      })))
    }

    if (bookLibrary) {
      const categoryNames = new Map(bookLibrary.categories.map((category) => [category.slug, category.name]))
      remote.push(...bookLibrary.books.map((book) => ({
        id: `book-summary-${book.slug}`,
        title: book.title,
        category: 'Book Summaries',
        snippet: `${book.author}. ${book.excerpt}`,
        keywords: `${categoryNames.get(book.category) ?? ''} ${book.body}`,
        link: '/book-summaries',
        linkForQuery: (query: string) => `/book-summaries?search=${encodeURIComponent(query)}`,
      })))
    }

    if (bankIndex) {
      remote.push(...bankIndex.categories.map((category) => ({
        id: `gk-category-${category.slug}`,
        title: category.name,
        category: 'GK World Category',
        snippet: `${category.count.toLocaleString()} questions${category.mpt ? ', included in MPT preparation' : ''}.`,
        link: `/gk/cat/${category.slug}`,
      })))
    }

    if (oneLinerIndex) {
      const categoryFiles = await Promise.all(
        oneLinerIndex.categories.map((category) => (
          fetchJson<RemoteOneLinerCategory>(`/one-liner-gk/${encodeURIComponent(category.slug)}.json`)
        )),
      )
      categoryFiles.forEach((category) => {
        if (!category) return
        remote.push(...category.notes.map((note) => ({
          id: `one-liner-${note.id}`,
          title: note.text,
          category: `One-Liner GK: ${category.name}`,
          snippet: note.subcategory,
          link: '/one-liner-gk',
          linkForQuery: (query: string) => (
            `/one-liner-gk?category=${encodeURIComponent(category.slug)}&search=${encodeURIComponent(query)}`
          ),
        })))
      })
    }

    const grammarCourses = [
      { course: englishGrammar, lang: 'english' },
      { course: urduGrammar, lang: 'urdu' },
    ] as const
    grammarCourses.forEach(({ course, lang }) => {
      if (!course) return
      course.topics.forEach((topic) => {
        remote.push({
          id: `grammar-topic-${lang}-${topic.slug}`,
          title: topic.title,
          category: lang === 'urdu' ? 'Urdu Grammar' : 'English Grammar',
          snippet: topic.description,
          link: `/language-grammar?lang=${lang}`,
          keywords: topic.items
            .flatMap((item) => item.fields.map((field) => `${field.label} ${field.value}`))
            .join(' '),
        })
      })
    })

    if (subjectMcqIndex) {
      remote.push(...subjectMcqIndex.subjects.map((subject) => ({
        id: `subject-mcqs-${subject.slug}`,
        title: `${subject.name} MCQs`,
        category: 'All Subject MCQs',
        snippet: `${subject.count.toLocaleString()} questions · ${subject.designation}${subject.group ? ` group ${subject.group}` : ''}.`,
        keywords: subject.topics.join(' '),
        link: '/css-mcqs',
      })))
    }

    if (fpscSyllabus) {
      remote.push(...fpscSyllabus.subjects.map((subject) => ({
        id: `fpsc-syllabus-${subject.slug}`,
        title: `${subject.name} — FPSC Syllabus`,
        category: 'FPSC Syllabus & Topic Planner',
        snippet: `${subject.designation}${subject.group ? ` group ${subject.group}` : ''} · ${subject.marks} marks.`,
        keywords: subject.sections.map((section) => `${section.title} ${section.items.join(' ')}`).join(' '),
        link: `/fpsc-syllabus?subject=${encodeURIComponent(subject.slug)}`,
      })))
    }

    if (pastPaperAnalysis) {
      pastPaperAnalysis.subjects.forEach((subject) => {
        remote.push({
          id: `past-paper-analysis-${subject.slug}`,
          title: `${subject.name} — CSS Past Paper Analysis`,
          category: 'CSS Past Paper Analysis',
          snippet: `${subject.questionCount.toLocaleString()} questions across ${subject.topicCount.toLocaleString()} syllabus topic groups.`,
          keywords: subject.sections.map((section) => `${section.title} ${section.topics.map((topic) => topic.title).join(' ')}`).join(' '),
          link: `/css-past-paper-analysis?subject=${encodeURIComponent(subject.slug)}`,
          linkForQuery: (query: string) => `/css-past-paper-analysis?subject=${encodeURIComponent(subject.slug)}&search=${encodeURIComponent(query)}`,
        })
        subject.sections.forEach((section) => {
          section.topics.forEach((topic) => remote.push({
            id: `past-paper-analysis-topic-${topic.id}`,
            title: `${subject.name}: ${topic.title}`,
            category: 'CSS Past Paper Analysis Topic',
            snippet: `${topic.questionCount} past-paper question${topic.questionCount === 1 ? '' : 's'} · ${topic.years.join(', ')}. ${section.title}`,
            link: `/css-past-paper-analysis?subject=${encodeURIComponent(subject.slug)}&topic=${encodeURIComponent(topic.id)}`,
          }))
        })
      })
    }

    if (recentAffairs) {
      remote.push(...recentAffairs.oneLiners.map((item, index) => ({
        id: `recent-affairs-fact-${index}`,
        title: item.development,
        category: 'Recent Affairs One-Liner',
        snippet: item.fact,
        date: item.date,
        link: '/current-affairs',
      })))
      remote.push(...recentAffairs.mcqs.map((item) => ({
        id: `recent-affairs-mcq-${item.id}`,
        title: item.question,
        category: 'Recent Affairs MCQ',
        snippet: `${item.development}. ${item.explanation}`,
        date: item.date,
        link: '/current-affairs?tab=mcqs',
      })))
    }

    return remote
  })()

  return remoteCorpusRequest
}

function scoreDocuments(corpus: SearchDocument[], query: string) {
  const normalizedQuery = query.toLocaleLowerCase().trim()
  const terms = normalizedQuery.split(/\s+/).filter(Boolean)

  return corpus
    .map((item) => {
      const title = item.title.toLocaleLowerCase()
      const category = item.category.toLocaleLowerCase()
      const haystack = `${title} ${category} ${item.snippet} ${item.keywords ?? ''}`.toLocaleLowerCase()
      let score = 0
      for (const term of terms) {
        if (title === normalizedQuery) score += 14
        if (title.startsWith(term)) score += 6
        else if (title.includes(term)) score += 4
        if (category.includes(term)) score += 2
        if (haystack.includes(term)) score += 1
      }
      return { item, score }
    })
    .filter((entry) => entry.score >= terms.length)
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
}

export async function searchSite(query: string, limit = 12): Promise<SearchResult[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const remoteCorpus = await loadRemoteCorpus()
  const scored = scoreDocuments([...localCorpus, ...remoteCorpus], normalizedQuery)
  const seen = new Set<string>()
  const results: SearchResult[] = []

  for (const { item } of scored) {
    const key = `${item.category}|${item.title}`.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      id: item.id,
      title: item.title,
      category: item.category,
      snippet: item.snippet,
      link: item.linkForQuery?.(normalizedQuery) ?? item.link,
      date: item.date,
    })
    if (results.length >= limit) break
  }

  return results
}

export const searchCategories = [...new Set(localCorpus.map((item) => item.category))]

export function highlight(text: string, query: string): string {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return text
  const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}
