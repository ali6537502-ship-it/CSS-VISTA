// Shared loading and editorial checks for the MPT release bank
// (src/data/mpt/bank/**). Used by the bank validator, the release builder and
// the paper audits so every stage applies one definition of an acceptable item.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MPT_SUBTOPICS, MPT_SOURCE_TYPES } from '../../src/data/mpt/taxonomy.ts'

export const BANK_DIR = 'src/data/mpt/bank'

export function listBankFiles(dir = BANK_DIR) {
  const out = []
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...listBankFiles(path))
    else if (name.endsWith('.json')) out.push(path)
  }
  return out
}

export function loadBank(dir = BANK_DIR) {
  const questions = []
  const passages = []
  for (const file of listBankFiles(dir)) {
    const rows = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(rows)) throw new Error(`${file} must contain a JSON array`)
    for (const row of rows) {
      if (row && typeof row === 'object' && 'text' in row && 'title' in row && !('q' in row)) passages.push({ ...row, __file: file })
      else questions.push({ ...row, __file: file })
    }
  }
  return { questions, passages }
}

export const canonical = (value) => String(value ?? '').toLocaleLowerCase('en').normalize('NFKD')
  .replace(/[ً-ٰٟ]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

const stop = new Set(('a an and are as at be by choose correct for from has in is it of on or select that the this to was were what when '
  + 'where which who with following option options word given most nearly meaning sentence best complete fill blank blanks').split(' '))
export function tokenSet(value) {
  return new Set(canonical(value).split(' ').filter((t) => t.length > 2 && !stop.has(t)))
}
export function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  return inter / (a.size + b.size - inter)
}
/** Numbers masked: two stems with the same skeleton and different numbers collide. */
export const surfaceTemplate = (value) => canonical(value).replace(/\d+(?:\s\d+)*/g, '#')

// --- Editorial rejection rules -------------------------------------------------

export const CATCH_ALL_OPTION = /^(?:none of (?:these|the above|them)|all of (?:these|the above|them)|both (?:a|\(a\)) and (?:b|\(b\))|neither (?:a|\(a\)) nor (?:b|\(b\))|ان میں سے کوئی نہیں|تمام|دونوں)$/i

// Islamic Studies: numbering/source trivia that a prepared candidate has no reason to memorise.
export const ISLAMIC_TRIVIA = [
  /how many (?:verses|ayat|ayahs|ruku|rukus|sajdas?|words|letters|times)/i,
  /number of (?:verses|ayat|ayahs|ruku|rukus|words|letters)/i,
  /which (?:surah|sura) is (?:number|no\.?)\s*\d/i,
  /(?:surah|sura) (?:number|no\.?)\s*\d/i,
  /\b(?:\d+)(?:st|nd|rd|th)? (?:surah|sura|para|juz)\b/i,
  /(?:hadith|hadees)\s*(?:number|no\.?|#)\s*\d/i,
  /(?:book|volume|chapter)\s*(?:number|no\.?)\s*\d/i,
  /how many (?:ahadith|hadiths|ahadees)/i,
  /nawawi hadith \d/i,
  /\b\d{1,3}:\d{1,3}\b/, // verse citations used as answers or stems
  /textual or historical basis|source or historical basis|in the english reference|which reference is especially associated/i,
  /kufan numbering/i,
]

// Pakistan Affairs / GK: machine-template wording.
export const TEMPLATE_WORDING = [
  /which (?:description|statement) (?:best )?fits/i,
  /actor-description|person-and-description|date-location|period-and-place|date-place pair|chronological and geographical profile/i,
  /which (?:institution|personality|person or institution|person or group|place or region) (?:is )?(?:correctly |most closely |most directly )?(?:connected|associated|linked)/i,
  /is associated with which person or group/i,
  /which label most appropriately/i,
  /how is .+ best classified/i,
  /what type of geographical feature or resource/i,
  /who led, founded or represented/i,
  /(?:select|choose) the correct (?:association|time frame|classification)/i,
  /the leading figure or institution behind/i,
  /which of the following does not correctly describe/i,
  /principal (?:location|actor|significance)/i,
  /it is associated with/i,
  /\[parallel drill/i,
]

// Urdu section must stay language-based.
export const URDU_LITERATURE = /شاعر|شاعری|ادیب|ادبی|ناول|افسانہ نگار|غزل|مرثیہ|مثنوی|رباعی|دیوان|تصنیف|مصنف|تخلص|مجموعۂ کلام|صنعت|علم بدیع|عروض|قافیہ|ردیف/

// Everyday Science: university-style calculations and jargon.
export const SCIENCE_TOO_ADVANCED = /\b(?:molar(?:ity)?|moles?|pka|arrhenius|schr[öo]dinger|lorentz|blackbody|stefan.boltzmann|hardy.weinberg|kepler|semimajor|synodic|sidereal|induced emf|rlc|radiative flux|stroke volume|cardiac output|gpp|npp|photon|coulomb'?s law|μc|\bkj\b|joules? per|half-life of|decay constant)\b/i

export const NEWS_TRIVIA = /\b(?:reuters|news agency|publication date|published on|which agency|press release|sitemap)\b/i

export function checkQuestion(q, passagesById) {
  const errors = []
  const warn = []
  const need = (cond, message) => { if (!cond) errors.push(message) }
  need(typeof q.id === 'string' && /^mpt-[a-z]+(?:-[a-z0-9]+)+$/.test(q.id), 'id must match mpt-<section>-<...>')
  const def = MPT_SUBTOPICS[q.subtopic]
  need(Boolean(def), `unknown subtopic ${q.subtopic}`)
  if (def) {
    need(q.section === def.section, `section ${q.section} does not match subtopic ${q.subtopic}`)
    need(q.subject === def.subject, `subject ${q.subject} does not match subtopic ${q.subtopic}`)
  }
  need(typeof q.pattern_family === 'string' && q.pattern_family.length >= 3, 'pattern_family required')
  need(typeof q.concept === 'string' && q.concept.length >= 3, 'concept required')
  need([1, 2, 3].includes(q.difficulty), 'difficulty must be 1, 2 or 3')
  need(MPT_SOURCE_TYPES.includes(q.source_type), `bad source_type ${q.source_type}`)
  need(q.past_paper_year === null || (Number.isInteger(q.past_paper_year) && q.past_paper_year >= 2016 && q.past_paper_year <= 2026), 'past_paper_year must be null or a year')
  if (q.source_type === 'past-paper-reviewed') need(Number.isInteger(q.past_paper_year), 'past-paper items need past_paper_year')
  need(q.verified === true, 'verified must be true')
  need(typeof q.q === 'string' && q.q.trim().length >= 8, 'question text too short')
  const maxStem = q.subtopic === 'eng.comprehension' ? 400 : 420
  need(typeof q.q === 'string' && q.q.length <= maxStem, `question text over ${maxStem} characters`)
  need(Array.isArray(q.o) && q.o.length === 4, 'exactly four options required')
  if (Array.isArray(q.o)) {
    need(q.o.every((opt) => typeof opt === 'string' && opt.trim().length > 0 && opt.length <= 220), 'options must be non-empty strings up to 220 chars')
    need(new Set(q.o.map(canonical)).size === 4, 'options must be distinct')
    need(!q.o.some((opt) => CATCH_ALL_OPTION.test(String(opt).trim())), 'catch-all option (none/all/both) not allowed')
  }
  need(Number.isInteger(q.a) && q.a >= 0 && q.a <= 3, 'answer index must be 0..3')
  need(typeof q.explanation === 'string' && q.explanation.trim().length >= 12, 'explanation required (12+ chars)')
  need(q.quality_grade === 'A' || q.quality_grade === 'B', 'quality_grade must be A or B')
  need(q.mpt_relevance === 'core' || q.mpt_relevance === 'supporting', 'mpt_relevance must be core or supporting')
  need(/^\d{4}-\d{2}-\d{2}$/.test(q.last_verified ?? ''), 'last_verified YYYY-MM-DD required')
  need(typeof q.time_sensitive === 'boolean', 'time_sensitive boolean required')
  if (q.time_sensitive || q.subtopic === 'ca.recent') {
    need(q.time_sensitive === true, 'ca.recent items must be time_sensitive')
    need(/^https:\/\/\S+\.\S+/.test(q.source_url ?? ''), 'time-sensitive items need an https source_url')
    need(/^\d{4}-\d{2}-\d{2}$/.test(q.event_date ?? ''), 'time-sensitive items need event_date')
  }
  if (q.source_url != null) need(/^https:\/\//.test(q.source_url), 'source_url must be https or null')

  const text = `${q.q} ${Array.isArray(q.o) ? q.o.join(' ') : ''}`
  if (q.section === 'Islamic Studies') ISLAMIC_TRIVIA.forEach((re) => { if (re.test(text)) errors.push(`Islamic trivia pattern ${re}`) })
  if (q.section === 'General Knowledge' || q.section === 'Islamic Studies') {
    TEMPLATE_WORDING.forEach((re) => { if (re.test(q.q)) errors.push(`template wording ${re}`) })
  }
  if (q.section === 'Urdu' && URDU_LITERATURE.test(text)) errors.push('Urdu literature/poetics item')
  if (q.subject === 'Everyday Science' && SCIENCE_TOO_ADVANCED.test(text)) errors.push('science item is calculation-heavy or university-level')
  if (q.subject === 'Current Affairs' && NEWS_TRIVIA.test(q.q)) errors.push('news-publication trivia')
  if (q.section === 'English' && /in the english reference|which rule is associated|which type is associated|is associated with example/i.test(q.q)) errors.push('database-style English prompt')
  if (q.subtopic === 'eng.comprehension') {
    need(typeof q.passage_id === 'string' && passagesById.has(q.passage_id), 'comprehension item needs an existing passage_id')
  }
  if (q.o && q.a != null && q.explanation && canonical(q.explanation) === canonical(q.o[q.a])) warn.push('explanation only repeats the answer')
  return { errors, warn }
}

export function checkPassage(p) {
  const errors = []
  if (!/^mpt-psg-[a-z0-9-]+$/.test(p.id ?? '')) errors.push('passage id must match mpt-psg-...')
  const words = String(p.text ?? '').trim().split(/\s+/).length
  if (words < 170 || words > 420) errors.push(`passage has ${words} words (170–420 required)`)
  if (!p.title) errors.push('passage title required')
  return errors
}

/** Full-bank validation; returns a report and never throws on content problems. */
// Past-paper year labels must be supported by the paper's text in the repository.
const PAST_PAPER_TEXT = {
  2022: 'data-archive/mpt-past-paper-text/CSS-MPT-2022.txt',
  2023: 'data-archive/mpt-past-paper-text/CSS-MPT-2023-Special.txt',
  2024: 'data-archive/mpt-past-paper-text/CSS-MPT-2024-questions-86-200.txt',
}
let pastPaperQuestions = null
function pastPaperIndex() {
  if (pastPaperQuestions) return pastPaperQuestions
  pastPaperQuestions = {}
  for (const [year, file] of Object.entries(PAST_PAPER_TEXT)) {
    const text = readFileSync(file, 'utf8').replace(/\n/g, ' ')
    pastPaperQuestions[year] = text.split(/\s(?=\d{1,3}\.\s)/).map((chunk) => tokenSet(chunk.slice(0, 500)))
  }
  return pastPaperQuestions
}
/** Best-matching year for a stem, or null when no repository paper text supports it. */
export function pastPaperYearFor(stem, answer = '') {
  const tokens = tokenSet(`${stem} ${answer}`)
  if (tokens.size < 2) return null
  let best = { year: null, score: 0 }
  for (const [year, chunks] of Object.entries(pastPaperIndex())) {
    for (const chunk of chunks) {
      let inter = 0
      for (const t of tokens) if (chunk.has(t)) inter += 1
      const score = inter / tokens.size
      if (score > best.score) best = { year: Number(year), score }
    }
  }
  return best.score >= 0.45 ? best.year : null
}

export function validateBank(bank) {
  const passagesById = new Map(bank.passages.map((p) => [p.id, p]))
  const problems = []
  const warnings = []
  bank.passages.forEach((p) => checkPassage(p).forEach((e) => problems.push(`${p.__file} ${p.id}: ${e}`)))
  const ids = new Map()
  const stems = new Map()
  const concepts = new Map()
  for (const q of bank.questions) {
    const { errors, warn } = checkQuestion(q, passagesById)
    errors.forEach((e) => problems.push(`${q.__file} ${q.id}: ${e}`))
    warn.forEach((w) => warnings.push(`${q.__file} ${q.id}: ${w}`))
    if (q.source_type === 'past-paper-reviewed' && Number.isInteger(q.past_paper_year)) {
      const supported = pastPaperYearFor(q.q, q.o?.[q.a] ?? '')
      if (supported !== q.past_paper_year) problems.push(`${q.__file} ${q.id}: past_paper_year ${q.past_paper_year} is not supported by the repository's paper text (best match: ${supported ?? 'none'})`)
    }
    if (ids.has(q.id)) problems.push(`${q.__file} ${q.id}: duplicate id (also in ${ids.get(q.id)})`)
    ids.set(q.id, q.__file)
    const stemKey = q.subtopic === 'eng.comprehension' ? `${q.passage_id}|${canonical(q.q)}` : canonical(q.q)
    if (stems.has(stemKey)) problems.push(`${q.__file} ${q.id}: duplicate question text (also ${stems.get(stemKey)})`)
    stems.set(stemKey, q.id)
    const conceptKey = `${q.section}|${canonical(q.concept)}`
    if (concepts.has(conceptKey)) problems.push(`${q.__file} ${q.id}: duplicate concept "${q.concept}" (also ${concepts.get(conceptKey)})`)
    concepts.set(conceptKey, q.id)
  }
  return { problems, warnings }
}

export function summarise(bank) {
  const bySection = {}
  for (const q of bank.questions) {
    const s = (bySection[q.section] ??= { total: 0, subtopics: {}, difficulty: { 1: 0, 2: 0, 3: 0 }, sourceTypes: {} })
    s.total += 1
    s.subtopics[q.subtopic] = (s.subtopics[q.subtopic] ?? 0) + 1
    s.difficulty[q.difficulty] = (s.difficulty[q.difficulty] ?? 0) + 1
    s.sourceTypes[q.source_type] = (s.sourceTypes[q.source_type] ?? 0) + 1
  }
  return { questions: bank.questions.length, passages: bank.passages.length, bySection }
}
