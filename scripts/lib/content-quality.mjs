/**
 * Shared content-quality primitives.
 *
 * Used by the prerender gate, the duplicate-content detector and the
 * production audit so all three judge a page the same way. The goal is to
 * measure whether a page answers the purpose implied by its own title, not to
 * chase a word count: word count is kept only as a secondary signal.
 */

/** Markup that every page shares and that must never count as primary content. */
const SHARED_CHROME = [
  /<header\b[\s\S]*?<\/header>/gi,
  /<footer\b[\s\S]*?<\/footer>/gi,
  /<nav\b[\s\S]*?<\/nav>/gi,
  /<script\b[\s\S]*?<\/script>/gi,
  /<style\b[\s\S]*?<\/style>/gi,
  /<noscript\b[\s\S]*?<\/noscript>/gi,
  /<svg\b[\s\S]*?<\/svg>/gi,
  /<[^>]*\baria-label="(?:Advertisement|Breadcrumb)"[^>]*>[\s\S]*?<\/[a-z]+>/gi,
]

/** Wording that means the page has nothing real to show yet. */
const PLACEHOLDER_PATTERNS = [
  /\bloading\b/i,
  /\bunder construction\b/i,
  /\bcoming soon\b/i,
  /\bplaceholder\b/i,
  /\bno content (?:yet|available)\b/i,
  /\bpage is being prepared\b/i,
  /\bwill be added (?:soon|shortly)\b/i,
]

export function stripHtml(html) {
  let value = String(html)
  for (const pattern of SHARED_CHROME) value = value.replace(pattern, ' ')
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function decodeEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&nbsp;', ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
}

/**
 * The page's own primary content.
 *
 * The site layout puts every page's content inside a single `<main>`, with the
 * announcement ticker, header and footer outside it. Measuring `<main>` is what
 * makes the thresholds meaningful: roughly 390 words of shared chrome would
 * otherwise let a page with no content of its own clear any floor.
 */
export function primaryContentText(html) {
  const mains = [...String(html).matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map((match) => match[1])
  return stripHtml(mains.length ? mains.join(' ') : String(html))
}

/** The `<div id="root">` body of a generated production page. */
export function extractRootHtml(pageHtml) {
  const match = /<div id="root">([\s\S]*)<\/div>\s*(?:<script|<\/body)/.exec(pageHtml)
  return match ? match[1] : ''
}

export function isPlaceholderContent(text) {
  if (!text) return true
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * A normalised fingerprint of a page's primary content.
 *
 * Case and punctuation are removed; numbers are kept, because on an archive
 * page the year and the paper count are genuine distinguishing facts rather
 * than cosmetic substitutions. Template reuse that differs only by a name or a
 * year is caught by the shingle similarity below, which does not need the
 * varying tokens erased to find it.
 */
export function contentFingerprint(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Shingle set used for near-duplicate comparison. */
export function shingles(text, size = 8) {
  const words = contentFingerprint(text).split(' ').filter(Boolean)
  const set = new Set()
  for (let index = 0; index + size <= words.length; index += 1) {
    set.add(words.slice(index, index + size).join(' '))
  }
  return set
}

/** Jaccard similarity of two pages' primary content, between 0 and 1. */
export function similarity(left, right) {
  if (!left.size || !right.size) return 0
  let intersection = 0
  for (const shingle of left) if (right.has(shingle)) intersection += 1
  return intersection / (left.size + right.size - intersection)
}
