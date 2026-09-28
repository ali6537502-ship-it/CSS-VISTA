// Resemblance of each bank item to the recorded FPSC MPT papers.
//
// The corpus is the real past-paper text in data-archive/mpt-past-paper-text/ (2022,
// 2023 Special, 2024 Q86–200, classified by section through MPT_PATTERN_PROFILE) plus
// the recalled past-paper items in data-archive/question-banks/mpt-past-papers.json.
// An item's score is its best IDF-weighted token cosine against the same section's
// past-paper questions, expressed as a percentile within its section (0–1), so the
// selector draws the items that look most like real MPT questions first. Nothing is
// removed: low-resemblance items simply stay in reserve.
import { readFileSync } from 'node:fs'
import { MPT_PATTERN_PROFILE } from '../../src/data/mpt/patternProfile.ts'
import { tokenSet } from '../../src/data/mpt/selector.ts'

const TEXTS = [
  [2022, 'data-archive/mpt-past-paper-text/CSS-MPT-2022.txt'],
  [2023, 'data-archive/mpt-past-paper-text/CSS-MPT-2023-Special.txt'],
  [2024, 'data-archive/mpt-past-paper-text/CSS-MPT-2024-questions-86-200.txt'],
]

const RECALLED_SECTION = (category) => {
  if (/islamic/i.test(category)) return 'Islamic Studies'
  if (/^urdu/i.test(category)) return 'Urdu'
  if (/^english/i.test(category)) return 'English'
  if (/mathematics|reasoning/i.test(category)) return 'General Abilities'
  return 'General Knowledge'
}

function parsePaper(text) {
  const out = new Map()
  let no = null
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d{1,3})\.\s+(.*)$/)
    if (m) { no = Number(m[1]); out.set(no, m[2]); continue }
    if (no !== null && !/^FPSC MPT/.test(line)) out.set(no, `${out.get(no)} ${line.replace(/^\([a-e]\)\s*/, '')}`)
  }
  return out
}

export function pastPaperCorpus() {
  const corpus = []
  for (const [year, file] of TEXTS) {
    const sectionOf = new Map(MPT_PATTERN_PROFILE.filter((r) => r.year === year).map((r) => [r.no, r.section]))
    for (const [no, text] of parsePaper(readFileSync(file, 'utf8'))) {
      const section = sectionOf.get(no)
      if (section) corpus.push({ section, text: text.replace(/none of these|all of these|all of the above/gi, '') })
    }
  }
  for (const row of JSON.parse(readFileSync('data-archive/question-banks/mpt-past-papers.json', 'utf8'))) {
    corpus.push({ section: RECALLED_SECTION(row.category ?? ''), text: `${row.question} ${row.answer_text ?? ''}` })
  }
  return corpus
}

export function resemblanceScores(questions, corpus = pastPaperCorpus()) {
  const docs = corpus.map((c) => ({ section: c.section, tokens: tokenSet(c.text) }))
  const df = new Map()
  for (const d of docs) for (const t of d.tokens) df.set(t, (df.get(t) ?? 0) + 1)
  const idf = (t) => Math.log((docs.length + 1) / ((df.get(t) ?? 0) + 1)) + 1
  const norm = (tokens) => Math.sqrt([...tokens].reduce((n, t) => n + idf(t) ** 2, 0)) || 1
  const bySection = new Map()
  for (const d of docs) {
    const list = bySection.get(d.section) ?? []
    list.push({ tokens: d.tokens, norm: norm(d.tokens) })
    bySection.set(d.section, list)
  }
  const raw = new Map()
  for (const q of questions) {
    const tokens = tokenSet(`${q.q} ${q.o[q.a]}`)
    const n = norm(tokens)
    let best = 0
    for (const d of bySection.get(q.section) ?? []) {
      let dot = 0
      for (const t of tokens) if (d.tokens.has(t)) dot += idf(t) ** 2
      best = Math.max(best, dot / (n * d.norm))
    }
    raw.set(q.id, { section: q.section, value: best })
  }
  // Percentile within the section, so every section is ranked on its own scale.
  const scores = new Map()
  const sections = new Set([...raw.values()].map((r) => r.section))
  for (const section of sections) {
    const rows = [...raw].filter(([, r]) => r.section === section).sort((a, b) => a[1].value - b[1].value || a[0].localeCompare(b[0]))
    rows.forEach(([id], i) => scores.set(id, rows.length > 1 ? i / (rows.length - 1) : 0.5))
  }
  return { scores, raw: new Map([...raw].map(([id, r]) => [id, r.value])) }
}
