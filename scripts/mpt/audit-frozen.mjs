// Audits papers already frozen for scheduled mocks.
//   node scripts/mpt/audit-frozen.mjs frozen.json          (output of server/bin/mpt-frozen-audit.php)
//   node scripts/mpt/audit-frozen.mjs --series papers.json (a reconstructed exported series:
//                                                            [{ key, questions: [...] }])
// Each paper is either identified as an audited editorial-release paper, or
// scanned with the editorial defect checks and assigned the action the server
// will take (re-freeze if unstarted, never touch if started or attempted).
import { readFileSync, writeFileSync } from 'node:fs'
import {
  ISLAMIC_TRIVIA, TEMPLATE_WORDING, URDU_LITERATURE, SCIENCE_TOO_ADVANCED, CATCH_ALL_OPTION, surfaceTemplate,
} from './bank-lib.mjs'
import { loadReviewedBank, readCheckedInRelease, resolveRelease } from './release-lib.mjs'

const ENGLISH_DATABASE = /in the english reference|which rule is associated|which type is associated|is associated with example|which revision is grammatical and preserves/i
const scienceCalculation = (q) => SCIENCE_TOO_ADVANCED.test(q)
  || ((q.match(/\d+(?:\.\d+)?/g) || []).length >= 2 && /\b(?:is approximately|is about|expected|output is|efficiency|ratio is|magnification is|force is|current is|power is)\b/i.test(q))

export function scanPaper(questions) {
  const r = {
    islamicTrivia: 0, islamicTemplate: 0, islamicWithoutExplanation: 0, urduLiterature: 0,
    englishDatabasePrompts: 0, englishComprehension: 0, gaRepeatedTemplates: 0, scienceCalculations: 0,
    gkTemplateWording: 0, gkWithoutExplanation: 0, catchAllOptions: 0, currentAffairsWithSource: 0,
  }
  const templates = new Map()
  for (const q of questions) {
    const text = `${q.q} ${q.o.join(' ')}`
    if (q.o.some((o) => CATCH_ALL_OPTION.test(String(o).trim()))) r.catchAllOptions += 1
    const section = q.section ?? q.paperSection
    if (section === 'Islamic Studies') {
      if (ISLAMIC_TRIVIA.some((re) => re.test(text))) r.islamicTrivia += 1
      if (TEMPLATE_WORDING.some((re) => re.test(q.q))) r.islamicTemplate += 1
      if (!String(q.e ?? '').trim()) r.islamicWithoutExplanation += 1
    }
    if (section === 'Urdu' && URDU_LITERATURE.test(text)) r.urduLiterature += 1
    if (section === 'English') {
      if (ENGLISH_DATABASE.test(q.q)) r.englishDatabasePrompts += 1
      if (/comprehension|passage/i.test(`${q.topic ?? q.s ?? ''} ${q.q.slice(0, 40)}`)) r.englishComprehension += 1
    }
    if (section === 'General Abilities') {
      const t = surfaceTemplate(q.q).split(' ').slice(0, 7).join(' ')
      templates.set(t, (templates.get(t) ?? 0) + 1)
    }
    if (section === 'General Knowledge') {
      if (scienceCalculation(q.q)) r.scienceCalculations += 1
      if (TEMPLATE_WORDING.some((re) => re.test(q.q))) r.gkTemplateWording += 1
      if (!String(q.e ?? '').trim()) r.gkWithoutExplanation += 1
      if (q.sourceUrl || /Source: https:/.test(String(q.e ?? ''))) r.currentAffairsWithSource += 1
    }
  }
  r.gaRepeatedTemplates = [...templates.values()].filter((n) => n > 1).reduce((s, n) => s + n - 1, 0)
  r.defects = r.islamicTrivia + r.islamicTemplate + r.urduLiterature + r.englishDatabasePrompts + r.gaRepeatedTemplates
    + r.scienceCalculations + r.gkTemplateWording + r.catchAllOptions
  return r
}

const shape = (questions) => JSON.stringify(questions.map((q) => [q.id, q.o, q.a]))

function main() {
  const args = process.argv.slice(2)
  const seriesMode = args[0] === '--series'
  const input = JSON.parse(readFileSync(seriesMode ? args[1] : args[0], 'utf8'))
  const { bank } = loadReviewedBank()
  let releaseShapes = new Map()
  try {
    resolveRelease(readCheckedInRelease(), bank).forEach((p, i) => releaseShapes.set(shape(p), i + 1))
  } catch { releaseShapes = new Map() }
  const mocks = seriesMode
    ? input.map((p, i) => ({ slug: `series paper ${i + 1} (${p.key})`, started: false, attempts: 0, editorial_release: 0, questions: p.questions }))
    : input.mocks
  const rows = mocks.map((m) => {
    const releasePaper = releaseShapes.get(shape(m.questions))
    const scan = scanPaper(m.questions)
    const action = releasePaper ? `keep (audited release paper ${releasePaper})`
      : m.started || m.attempts > 0 ? 'keep — started or attempted, never modified'
        : 're-freeze from the audited release (server does this automatically)'
    return { slug: m.slug, exam_open_at: m.exam_open_at ?? null, paper_ref: m.paper_ref ?? null, release: m.editorial_release, started: m.started, attempts: m.attempts, releasePaper: releasePaper ?? null, action, ...scan }
  })
  const totals = rows.reduce((t, r) => { for (const [k, v] of Object.entries(r)) if (typeof v === 'number' && !['release', 'attempts', 'releasePaper'].includes(k)) t[k] = (t[k] ?? 0) + v; return t }, {})
  const out = { mode: seriesMode ? 'reconstructed-series' : 'database-dump', papers: rows.length, totals, rows }
  const target = args.includes('--write') ? args[args.indexOf('--write') + 1] : null
  if (target) writeFileSync(target, `${JSON.stringify(out, null, 1)}\n`)
  console.log(JSON.stringify({ papers: rows.length, totals }, null, 2))
  for (const r of rows) console.log(`${r.slug}: defects ${r.defects} → ${r.action}`)
}

main()
