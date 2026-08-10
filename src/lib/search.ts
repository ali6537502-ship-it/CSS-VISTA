// Unified client-side search index across site content
import { compulsorySubjects, optionalGroups } from '@/data/syllabus'
import { vocabulary } from '@/data/vocab'
import { grammarTopics, idioms, pairOfWords } from '@/data/grammar'
import { caIssues } from '@/data/currentAffairs'
import { serviceGroups } from '@/data/services'
import { libraryItems } from '@/data/library'
import { essayThemes } from '@/data/essay'
import { questions } from '@/data/quiz'
import { fpscNotices } from '@/data/updates'

export interface SearchResult {
  id: string
  title: string
  category: string
  snippet: string
  link: string
  date?: string
}

const corpus: SearchResult[] = [
  {
    id: 'one-liner-gk',
    title: 'One-Liner GK',
    category: 'GK World',
    snippet: 'Thousands of searchable, category-wise facts for Pakistan Affairs, Islamiat, geography, science, computers and general knowledge.',
    link: '/one-liner-gk',
  },
  {
    id: 'language-grammar',
    title: 'Urdu & English Grammar',
    category: 'Grammar Courses',
    snippet: 'Structured Urdu قواعد and English grammar lessons covering morphology, syntax, literature, voice, articles, narration, parts of speech, prepositions, clauses, pronouns and tenses.',
    link: '/language-grammar',
  },
  {
    id: 'book-summaries',
    title: 'Book Summaries',
    category: 'Reading Library',
    snippet: 'One hundred exam-focused summaries covering political thought, international relations, economics, society, Pakistan, literature and priority all-round reading.',
    link: '/book-summaries',
  },
  ...compulsorySubjects.map((s) => ({
    id: `sub-${s.slug}`,
    title: s.name,
    category: 'Compulsory Subjects',
    snippet: `${s.overview} Topics: ${s.topics.flatMap((t) => t.points).slice(0, 6).join(', ')}`,
    link: `/subjects/compulsory/${s.slug}`,
  })),
  ...optionalGroups.flatMap((g) =>
    g.subjects.map((s) => ({
      id: `opt-${s.name}`,
      title: `${s.name} (Group ${g.group}, ${s.marks} marks)`,
      category: 'Optional Subjects',
      snippet: `${s.nature}. Background: ${s.background}. Overlap: ${s.overlap}. Difficulty: ${s.difficulty}. ${s.suitedFor}`,
      link: '/subjects/optional',
    }))
  ),
  ...vocabulary.map((v) => ({
    id: `voc-${v.word}`,
    title: v.word,
    category: 'Vocabulary',
    snippet: `${v.pos} - ${v.meaning}. Synonyms: ${v.synonyms.join(', ')}. ${v.sentence}`,
    link: '/grammar-vocabulary',
  })),
  ...grammarTopics.map((g) => ({
    id: `gram-${g.slug}`,
    title: g.name,
    category: 'Grammar',
    snippet: `${g.summary} ${g.rules.map((r) => r.rule).join(' ')}`,
    link: '/grammar-vocabulary',
  })),
  ...idioms.map((i) => ({ id: `idiom-${i.idiom}`, title: i.idiom, category: 'Grammar - Idioms', snippet: `${i.meaning}. ${i.sentence}`, link: '/grammar-vocabulary' })),
  ...pairOfWords.map((p) => ({ id: `pair-${p.a}`, title: `${p.a} vs ${p.b}`, category: 'Grammar - Pair of Words', snippet: `${p.a}: ${p.aMeaning}. ${p.b}: ${p.bMeaning}.`, link: '/grammar-vocabulary' })),
  ...caIssues.map((c) => ({
    id: `ca-${c.slug}`,
    title: c.title,
    category: 'Current Affairs',
    snippet: `${c.background} ${c.pakistanImplications.join(' ')}`,
    link: `/current-affairs#${c.slug}`,
    date: c.lastUpdated,
  })),
  ...serviceGroups.map((s) => ({
    id: `svc-${s.slug}`,
    title: s.name,
    category: 'Services Guide',
    snippet: `${s.role} ${s.work}`,
    link: `/services#${s.slug}`,
  })),
  ...libraryItems.map((l) => ({
    id: l.id,
    title: l.title,
    category: 'Downloads & Notes',
    snippet: `${l.description} Tags: ${l.tags.join(', ')}`,
    link: '/downloads',
    date: l.lastUpdated,
  })),
  ...essayThemes.map((t) => ({
    id: `essay-${t.slug}`,
    title: `Essay theme: ${t.name}`,
    category: 'Essay',
    snippet: `${t.angles.join(', ')}. Topics: ${t.sampleTopics.join('; ')}`,
    link: '/essay',
  })),
  ...questions.map((q) => ({
    id: `q-${q.id}`,
    title: q.question.slice(0, 80),
    category: 'MCQ Bank',
    snippet: q.options.join(' / '),
    link: '/mpt',
  })),
  ...fpscNotices.map((n) => ({
    id: n.id,
    title: n.title,
    category: 'FPSC Updates',
    snippet: n.summary,
    link: '/fpsc-updates',
  })),
]

export function searchSite(query: string, limit = 12): SearchResult[] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []
  const terms = q.split(/\s+/)
  const scored = corpus
    .map((item) => {
      const hay = `${item.title} ${item.snippet} ${item.category}`.toLowerCase()
      let score = 0
      for (const t of terms) {
        if (item.title.toLowerCase().includes(t)) score += 3
        if (hay.includes(t)) score += 1
      }
      return { item, score }
    })
    .filter((s) => s.score >= terms.length)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.item)
}

export const searchCategories = [...new Set(corpus.map((c) => c.category))]

export function highlight(text: string, query: string): string {
  const q = query.trim()
  if (!q) return text
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>')
}
