/**
 * Page-specific <title> and meta description for the study-material pattern
 * routes (optional-subject notes and the Islamic Studies reference bank).
 *
 * The production prerender (scripts/expand-optional-notes-seo.mjs and
 * scripts/expand-islamic-references-seo.mjs) and the browser (RouteSeo) both
 * read these functions, so the metadata Google renders after hydration is the
 * same metadata the server shipped. Previously the browser replaced it with the
 * generic route-registry template, which made every topic page render with the
 * same title and description.
 *
 * Plain text in, plain text out: HTML escaping is the caller's job.
 */
import optionalIndex from './bundled/optional-notes-index.json' with { type: 'json' }
import islamicIndex from './bundled/islamic-references-index.json' with { type: 'json' }

// Decoded at runtime so neither the minifier's constant folding nor the client
// build's em-dash stripping plugin (vite.config.ts) turns it into a hyphen; the
// browser title then matches the served HTML exactly.
const DASH = JSON.parse('"\\u2014"')

const OPTIONAL_BASE = '/study-material/optional'
const ISLAMIC_BASE = '/study-material/islamic-studies'

export const islamicChapterName = (chapter) => chapter.titleEn.replace(/^[IVX]+\.\s*/, '').trim()

export function optionalSubjectMeta(group, subject) {
  const words = subject.topics.reduce((total, topic) => total + topic.words, 0)
  return {
    title: `${subject.subject} Notes for CSS ${DASH} Topic-Wise Study Material | CSS Vista`,
    description: `Topic-wise ${subject.subject} notes for the CSS optional paper: ${subject.topicCount} topics and ${words.toLocaleString('en-US')} words following the FPSC syllabus (Group ${group.group}, ${subject.marks} marks).`,
  }
}

export function optionalTopicMeta(subject, topic) {
  return {
    title: `${topic.title} ${DASH} CSS ${subject.subject} Notes | CSS Vista`,
    description: `${topic.title}: detailed CSS ${subject.subject} study notes following the FPSC optional syllabus, about ${Math.max(1, Math.round(topic.words / 200))} minutes of reading.`,
  }
}

export function islamicChapterMeta(chapter) {
  const name = islamicChapterName(chapter)
  return {
    title: `${name} ${DASH} CSS Islamic Studies References (English & Urdu) | CSS Vista`,
    description: `${chapter.referenceCount} source-checked references for ${name}, across ${chapter.topics.length} topics, with Arabic source passages and parallel English and Urdu.`,
  }
}

export function islamicTopicMeta(chapter, topic) {
  const name = islamicChapterName(chapter)
  return {
    title: `${topic.titleEn} ${DASH} ${name} References | CSS Vista`,
    description: `${topic.count} source-checked Qur'anic, Hadith and scholarly references on ${topic.titleEn.toLowerCase()} for CSS Islamic Studies, with Arabic passages and parallel English and Urdu.`,
  }
}

/**
 * The page-specific metadata for a study-material URL, or null when the path
 * is not a known subject, topic or chapter (the caller then keeps its default).
 */
export function studyMaterialMetaForPath(pathname) {
  const path = String(pathname || '').split(/[?#]/, 1)[0].replace(/\/+$/, '')
  if (path.startsWith(`${OPTIONAL_BASE}/`)) {
    const [subjectSlug, topicSlug, extra] = path.slice(OPTIONAL_BASE.length + 1).split('/')
    if (extra !== undefined) return null
    for (const group of optionalIndex.groups) {
      const subject = group.subjects.find((item) => item.slug === subjectSlug)
      if (!subject) continue
      if (topicSlug === undefined) return optionalSubjectMeta(group, subject)
      const topic = subject.topics.find((item) => item.slug === topicSlug)
      return topic ? optionalTopicMeta(subject, topic) : null
    }
    return null
  }
  if (path.startsWith(`${ISLAMIC_BASE}/`)) {
    const [chapterSlug, topicSlug, extra] = path.slice(ISLAMIC_BASE.length + 1).split('/')
    if (extra !== undefined) return null
    const chapter = islamicIndex.chapters.find((item) => item.slug === chapterSlug)
    if (!chapter) return null
    if (topicSlug === undefined) return islamicChapterMeta(chapter)
    const topic = chapter.topics.find((item) => item.slug === topicSlug)
    return topic ? islamicTopicMeta(chapter, topic) : null
  }
  return null
}
