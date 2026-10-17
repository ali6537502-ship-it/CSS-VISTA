/**
 * A short catalogue can be useful without an essay. Verify its actual resources
 * and identifying facts against the source archive before waiving a prose floor.
 * This never exempts it from placeholder or duplicate-content checks.
 */
import { CANONICAL_ORIGIN } from '../../src/data/routeRegistry.mjs'
import { contentFingerprint, extractRootHtml, primaryContentText, stripHtml } from './content-quality.mjs'

function escapePattern(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateCollectionContent(html, canonical, sourcePapers) {
  const match = new RegExp(`^${escapePattern(CANONICAL_ORIGIN)}/past-papers/(css|pms|ppsc|mpt)/(\\d{4})$`).exec(canonical ?? '')
  if (!match) return null
  const [, examination, year] = match
  const problems = []
  const expected = sourcePapers.filter((paper) => paper.fileUrl
    && paper.examination.toLowerCase() === examination && String(paper.year) === year)
  if (!expected.length) problems.push('collection has no source-backed public paper records')

  const root = extractRootHtml(html)
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(root)?.[1]
  if (!main) problems.push('collection has no substantive main element')
  const title = stripHtml(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '')
  const headings = [...(main ?? '').matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((entry) => stripHtml(entry[1]))
  const identity = `${examination.toUpperCase()} ${year} Past Papers`
  if (!title.includes(identity)) problems.push('collection title does not identify its examination and year')
  if (headings.length !== 1 || headings[0] !== identity) problems.push('collection H1 does not identify its examination and year')

  const links = new Map()
  for (const anchor of (main ?? '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /\bhref=["']([^"']*)["']/i.exec(anchor[1])?.[1]
    if (!href) continue
    let url
    try { url = new URL(href, CANONICAL_ORIGIN) } catch { continue }
    if (url.origin !== CANONICAL_ORIGIN || !url.pathname.startsWith('/past-papers/view/')) continue
    if (url.search || url.hash) problems.push('paper link is not a clean direct resource URL')
    const label = stripHtml(anchor[2])
    if (!label || /(?:^|\s)hidden(?:\s|=|$)|aria-hidden=["']true["']|display\s*:\s*none/i.test(anchor[1])) {
      problems.push(`paper link ${url.pathname} has no accessible visible label`)
    }
    links.set(url.pathname, label)
  }
  const expectedPaths = expected.map((paper) => `/past-papers/view/${paper.id}`).sort()
  if (JSON.stringify([...links.keys()].sort()) !== JSON.stringify(expectedPaths)) {
    problems.push('collection paper links do not exactly match its source records')
  }
  for (const paper of expected) {
    const label = links.get(`/past-papers/view/${paper.id}`) ?? ''
    const labelWords = new Set(contentFingerprint(label).split(' '))
    const subjectWords = contentFingerprint(paper.subject).split(' ')
    if (!labelWords.has(year) || !subjectWords.every((word) => labelWords.has(word))) {
      problems.push(`paper ${paper.id} link does not identify its recorded subject and year`)
    }
  }

  // These are catalogue facts, not a word target. Both numbers must agree with
  // the source; a blank page containing a token paper link is not sufficient.
  const text = primaryContentText(root)
  const subjects = new Set(expected.map((paper) => paper.subject)).size
  if (!new RegExp(`\\b${expected.length} archived ${examination.toUpperCase()} ${year} papers?\\b`).test(text)
    || !new RegExp(`\\bcovering ${subjects} subjects?\\b`).test(text)) {
    problems.push('collection lacks accurate source-backed paper and subject counts')
  }
  return { valid: problems.length === 0, problems }
}
