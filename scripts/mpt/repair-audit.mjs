// Release gate for the repaired live series (scripts/mpt/repair-live-series.mjs).
// Checks the exact objects the PHP server freezes. Fails closed.
import { createHash } from 'node:crypto'
import { MPT_OFFICIAL_HEADINGS, MPT_PASSAGE_QUESTIONS, MPT_REPETITION_LIMITS } from '../../src/data/mpt/blueprint.ts'
import { MPT_SECTION_ORDER, MPT_SECTION_SIZE } from '../../src/data/mpt/taxonomy.ts'
import { tokenSet, jaccard, SAME_FACT_JACCARD } from '../../src/data/mpt/selector.ts'
import { CATCH_ALL_OPTION, canonical, surfaceTemplate } from './bank-lib.mjs'
import { liveDefects, questionFrame, MAX_FRAME_PER_PAPER } from './live-review-rules.mjs'
import { stemHash } from './served-archive.mjs'

const count = (items, pick) => items.reduce((m, x) => { const k = pick(x); m[k] = (m[k] ?? 0) + 1; return m }, {})
const bareStem = (q) => (q.meta.passage_id ? q.q.slice(q.q.lastIndexOf('\nQuestion: ') + 11) : q.q)
const FACTUAL = new Set(['Islamic Studies', 'General Knowledge'])

export function paperFingerprint(questions) {
  return createHash('sha256').update(JSON.stringify(questions.map((q) => [q.id, q.o, q.a]))).digest('hex').slice(0, 16)
}

export function auditRepairedSeries(papers, context) {
  const failures = []
  const warnings = []
  const reports = []
  const { bankById, served, heldStems, heldIds, currentWindow, expectedPapers, reviewedKeep } = context
  if (papers.length !== expectedPapers) failures.push(`series has ${papers.length}/${expectedPapers} papers`)
  const seenIds = new Map()
  const seenStems = new Map()
  const templates = new Map()
  const facts = new Map()
  const identities = new Map()
  const familyPapers = new Map()
  papers.forEach((questions, i) => {
    const index = i + 1
    const fail = (m) => failures.push(`Paper ${index}: ${m}`)
    if (questions.length !== 200) fail(`has ${questions.length}/200 questions`)
    const bySection = Object.fromEntries(MPT_SECTION_ORDER.map((s) => [s, questions.filter((q) => q.section === s)]))
    let at = 0
    for (const s of MPT_SECTION_ORDER) {
      if (bySection[s].length !== MPT_SECTION_SIZE[s]) fail(`${s} has ${bySection[s].length}/${MPT_SECTION_SIZE[s]}`)
      if (questions.slice(at, at + MPT_SECTION_SIZE[s]).some((q) => q.section !== s)) fail(`section order broken in ${s}`)
      at += MPT_SECTION_SIZE[s]
      const headings = count(bySection[s], (q) => q.meta.heading)
      for (const h of MPT_OFFICIAL_HEADINGS[s].headings) {
        if (s === 'English' && h === 'comprehension') continue
        if (!headings[h]) fail(`${s} has no item under the official heading "${h}"`)
      }
    }
    const passage = bySection.English.filter((q) => q.meta.passage_id)
    if (passage.length < MPT_PASSAGE_QUESTIONS.min || passage.length > MPT_PASSAGE_QUESTIONS.max) fail(`comprehension passage has ${passage.length} questions`)
    const answers = new Map()
    const gaFamilies = new Map()
    const frameCount = count(questions.filter((q) => !q.meta.passage_id), (q) => questionFrame(q.q))
    for (const [f, n] of Object.entries(frameCount)) if (n > MAX_FRAME_PER_PAPER) fail(`${n} questions share the frame “${f.slice(0, 60)}”`)
    let gaHard = 0
    for (const q of questions) {
      if (!Array.isArray(q.o) || q.o.length !== 4 || new Set(q.o.map(canonical)).size !== 4) fail(`${q.id} options malformed`)
      if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) fail(`${q.id} answer index invalid`)
      if (q.o.some((o) => CATCH_ALL_OPTION.test(String(o).trim()))) fail(`${q.id} catch-all option`)
      if (q.meta.origin === 'live-series') {
        const defects = liveDefects({ ...q, paperSection: q.section, sourceUrl: q.meta.source_url }, { servedStems: heldStems, seenStems: new Set(), gaTemplates: new Set() })
        if (defects.length) fail(`kept ${q.id}: ${defects.join('; ')}`)
        if (heldIds.has(q.id)) fail(`kept ${q.id} was already used in a held mock`)
        // Release 4: every kept live question has been read and passed by an editor, and is explained.
        if (reviewedKeep && !reviewedKeep.has(q.id)) fail(`kept ${q.id} was not passed by the editor review`)
        if (!String(q.e ?? '').trim()) fail(`kept ${q.id} has no explanation`)
      } else {
        const bank = bankById.get(q.id)
        if (!bank) { fail(`${q.id} is not in the reviewed bank`); continue }
        if (bank.verified !== true || !['A', 'B'].includes(bank.quality_grade)) fail(`${q.id} is not a verified A/B item`)
        if (bank.o[bank.a] !== q.o[q.a]) fail(`${q.id} answer does not match the verified bank answer`)
        if (!q.e || q.e.trim().length < 12) fail(`${q.id} has no explanation`)
        if (served.stems.has(stemHash(bank.q)) || served.ids.has(bank.id)) fail(`${q.id} was served in an earlier series`)
        if (heldIds.has(q.id)) fail(`${q.id} was already sat in a held mock`)
        if (bank.time_sensitive) {
          if (!/^https:\/\//.test(bank.source_url ?? '') || !bank.event_date) fail(`${q.id} time-sensitive without source/date`)
          if (bank.subtopic === 'ca.recent' && (bank.event_date < currentWindow.from || bank.event_date > currentWindow.to)) fail(`${q.id} stale Current Affairs (${bank.event_date})`)
        }
        if (q.section === 'General Abilities') {
          if (bank.difficulty === 3) gaHard += 1
          gaFamilies.set(bank.pattern_family, (gaFamilies.get(bank.pattern_family) ?? 0) + 1)
        }
      }
      // Series-wide repetition.
      const stem = canonical(bareStem(q))
      if (seenIds.has(q.id)) fail(`${q.id} repeats (also in paper ${seenIds.get(q.id)})`)
      seenIds.set(q.id, index)
      if (!q.meta.passage_id) {
        if (seenStems.has(stem)) fail(`${q.id} repeats the question text of paper ${seenStems.get(stem)}`)
        seenStems.set(stem, index)
        if (heldStems.has(stem)) fail(`${q.id} repeats a question used in a held mock`)
        if (q.section === 'General Abilities' || /\d/.test(stem)) {
          const t = `${q.section}|${surfaceTemplate(bareStem(q))}`
          if (templates.has(t)) fail(`${q.id} is ${templates.get(t)} with numbers changed`)
          templates.set(t, q.id)
        }
      }
      const answer = canonical(q.o[q.a])
      if (FACTUAL.has(q.section) && answer.length > 3) {
        if (answers.has(answer)) fail(`${q.id} has the same answer as ${answers.get(answer)} in this paper`)
        answers.set(answer, q.id)
        const t = tokenSet(`${bareStem(q)} ${q.o[q.a]}`)
        const earlier = facts.get(answer) ?? []
        if (earlier.some((o) => jaccard(t, o.t) >= SAME_FACT_JACCARD)) fail(`${q.id} tests the same fact as an earlier question`)
        earlier.push({ t })
        facts.set(answer, earlier)
      }
      if (q.section !== 'General Abilities' && !q.meta.passage_id) {
        const t = tokenSet(tokenSet(bareStem(q)).size < 4 ? `${bareStem(q)} ${q.o.join(' ')}` : `${bareStem(q)} ${q.o[q.a]}`)
        const list = identities.get(q.section) ?? []
        if (list.some((o) => jaccard(t, o) >= MPT_REPETITION_LIMITS.nearDuplicateJaccard.max)) fail(`${q.id} is a near-duplicate of an earlier question`)
        list.push(t)
        identities.set(q.section, list)
      }
    }
    if (gaHard > 1) fail(`General Abilities has ${gaHard} challenging replacements (limit 1)`)
    for (const [f, n] of gaFamilies) {
      if (n > MPT_REPETITION_LIMITS.perPaperFamilyGa.max) fail(`GA pattern family ${f} appears ${n} times`)
      familyPapers.set(f, (familyPapers.get(f) ?? 0) + 1)
    }
    const kept = questions.filter((q) => q.meta.origin === 'live-series')
    reports.push({
      paper: index,
      fingerprint: paperFingerprint(questions),
      kept: count(kept, (q) => q.section),
      replaced: count(questions.filter((q) => q.meta.origin !== 'live-series'), (q) => q.section),
      keptWithoutExplanation: kept.filter((q) => !q.e.trim()).length,
      headings: Object.fromEntries(MPT_SECTION_ORDER.map((s) => [s, count(bySection[s], (q) => q.meta.heading)])),
      newDifficulty: Object.fromEntries(MPT_SECTION_ORDER.map((s) => [s, count(bySection[s].filter((q) => q.meta.origin !== 'live-series'), (q) => q.meta.difficulty)])),
      passage: passage[0]?.meta.passage_id ?? null,
      currentAffairs: questions.filter((q) => q.meta.time_sensitive).map((q) => ({ id: q.id, event_date: q.meta.event_date, source: q.meta.source_url })),
    })
  })
  for (const [f, n] of familyPapers) if (n > MPT_REPETITION_LIMITS.perSeriesFamily.max) failures.push(`GA pattern family ${f} used in ${n} papers`)
  const keptNoExpl = reports.reduce((n, r) => n + r.keptWithoutExplanation, 0)
  if (keptNoExpl) warnings.push(`${keptNoExpl} kept live questions carry no explanation (as frozen in the live series)`)
  return { failures, warnings, reports }
}

export function renderRepairMarkdown(result, meta, log) {
  const L = []
  const { reports } = result
  L.push(`# MPT editorial release ${meta.release} — repaired live series`, '')
  L.push(`Series ${meta.series}; ${reports.length} papers (live papers ${meta.firstLivePaper}–${meta.lastLivePaper} of ${meta.liveSeries}, i.e. Mocks ${meta.firstLivePaper}–${meta.lastLivePaper}); status **${result.failures.length ? 'BLOCKED' : 'PASS'}**.`, '')
  L.push('Each paper is the live paper already frozen for that mock. A live question was kept unless it had a concrete defect; only defective slots were refilled, in place, from the reviewed bank with an item from the same section and heading. Papers follow the official FPSC structure only (five sections with their official sizes, every official heading present, no topic quotas).', '')
  const sum = (pick) => reports.reduce((n, r) => n + pick(r), 0)
  const total = (obj) => Object.values(obj).reduce((a, b) => a + b, 0)
  L.push('## Series summary', '')
  L.push(`- Kept live questions: ${sum((r) => total(r.kept))}; replaced from the reviewed bank: ${sum((r) => total(r.replaced))}`)
  for (const s of MPT_SECTION_ORDER) L.push(`  - ${s}: kept ${sum((r) => r.kept[s] ?? 0)}, replaced ${sum((r) => r.replaced[s] ?? 0)}`)
  const reasons = count(log.flatMap((x) => x.reasons.map((r) => `${x.section}: ${r}`)), (x) => x)
  L.push('', '### Why questions were replaced', '')
  for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) L.push(`- ${k}: ${v}`)
  L.push('', `Warnings: ${result.warnings.join('; ') || 'none'}`, '')
  L.push('## Paper by paper', '')
  L.push('| Paper (mock) | Fingerprint | Kept | Replaced | GA new diff 1/2/3 | GK sci/CA/PA | Passage |')
  L.push('|---|---|---|---|---|---|---|')
  reports.forEach((r) => {
    const ga = r.newDifficulty['General Abilities']
    const gk = r.headings['General Knowledge']
    L.push(`| ${r.paper} (${r.paper + meta.firstLivePaper - 1}) | \`${r.fingerprint}\` | ${total(r.kept)} | ${total(r.replaced)} | ${ga[1] ?? 0}/${ga[2] ?? 0}/${ga[3] ?? 0} | ${gk['Everyday Science'] ?? 0}/${gk['Current Affairs'] ?? 0}/${gk['Pakistan Affairs'] ?? 0} | ${r.passage} |`)
  })
  if (result.failures.length) {
    L.push('', '## Blocking failures', '')
    result.failures.slice(0, 300).forEach((f) => L.push(`- ${f}`))
  }
  return `${L.join('\n')}\n`
}
