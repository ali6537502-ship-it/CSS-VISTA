// Editorial release gates for resolved MPT papers — the exact objects that are
// exported to the PHP examination system. Every check works on the paper as a
// candidate receives it (final order, final options), plus the editorial
// metadata carried alongside each question.
import { createHash } from 'node:crypto'
import {
  MPT_SUBTOPIC_RANGES, MPT_GROUP_RANGES, MPT_DIFFICULTY_SHAPE, MPT_ORDER_RULES, MPT_REPETITION_LIMITS,
} from '../../src/data/mpt/blueprint.ts'
import { MPT_SECTION_ORDER, MPT_SECTION_SIZE, MPT_SUBTOPICS } from '../../src/data/mpt/taxonomy.ts'
import { canonicalText, tokenSet, jaccard, surfaceTemplate, formatFamilies } from '../../src/data/mpt/selector.ts'
import {
  CATCH_ALL_OPTION, ISLAMIC_TRIVIA, TEMPLATE_WORDING, URDU_LITERATURE, SCIENCE_TOO_ADVANCED, NEWS_TRIVIA,
} from './bank-lib.mjs'
import { stemHash } from './served-archive.mjs'

const count = (items, pick) => items.reduce((m, x) => { const k = pick(x); m[k] = (m[k] ?? 0) + 1; return m }, {})
const bareStem = (q) => q.meta.passage_id ? q.q.slice(q.q.lastIndexOf('\nQuestion: ') + 11) : q.q

function groupOf(meta) {
  const def = MPT_SUBTOPICS[meta.subtopic]
  if (!def) return 'unknown'
  if (def.section === 'English') return def.group === 'comprehension' ? 'comprehension' : def.group === 'vocabulary' ? 'vocabulary' : 'grammar'
  if (def.section === 'General Abilities') return def.subject === 'Reasoning' ? 'reasoning' : 'quant'
  if (def.section === 'General Knowledge') return def.subject === 'Everyday Science' ? 'science' : def.subject === 'Current Affairs' ? 'current' : 'pakistan'
  if (def.section === 'Urdu') return def.group === 'translation' ? 'translation' : 'other'
  return 'all'
}

// Human-style review heuristics: things a careful editor would notice on paper.
function reviewFlags(q) {
  const flags = []
  const stem = bareStem(q)
  if (!q.meta.passage_id && stem.length > 300) flags.push('overly long stem')
  if (q.o.some((o) => o.length > 150)) flags.push('overly long option')
  const correct = q.o[q.a].length
  const others = q.o.filter((_, i) => i !== q.a).map((o) => o.length)
  const mean = others.reduce((a, b) => a + b, 0) / others.length
  if (correct > 40 && correct > mean * 1.9) flags.push('correct option conspicuously longer than distractors')
  if (/which of the following is not|which is not|is incorrect\?|except\b/i.test(stem)) flags.push('negative stem')
  if (/\?\s*\?|\.\.\.\s*$|\bi\.e\.\s*$/.test(stem) || /^\W/.test(stem.trim())) flags.push('punctuation defect')
  if (TEMPLATE_WORDING.some((re) => re.test(stem))) flags.push('machine-template wording')
  if (/\bin the english reference\b|\bwhich rule is associated\b/i.test(stem)) flags.push('database-style prompt')
  if (new Set(q.o.map((o) => canonicalText(o))).size < 4) flags.push('options not distinct')
  return flags
}

export function auditPaper(paper, context) {
  const { index, questions } = paper
  const failures = []
  const warnings = []
  const fail = (m) => failures.push(`Paper ${index}: ${m}`)
  const warn = (m) => warnings.push(`Paper ${index}: ${m}`)

  // --- structure
  if (questions.length !== 200) fail(`has ${questions.length}/200 questions`)
  const bySection = Object.fromEntries(MPT_SECTION_ORDER.map((s) => [s, questions.filter((q) => q.section === s)]))
  MPT_SECTION_ORDER.forEach((s) => { if (bySection[s].length !== MPT_SECTION_SIZE[s]) fail(`${s} has ${bySection[s].length}/${MPT_SECTION_SIZE[s]}`) })
  let expected = 0
  for (const s of MPT_SECTION_ORDER) {
    const slice = questions.slice(expected, expected + MPT_SECTION_SIZE[s])
    if (slice.some((q) => q.section !== s)) fail(`section order broken in ${s}`)
    expected += MPT_SECTION_SIZE[s]
  }
  if (new Set(questions.map((q) => q.id)).size !== questions.length) fail('duplicate question id inside the paper')
  for (const q of questions) {
    if (!Array.isArray(q.o) || q.o.length !== 4 || new Set(q.o.map(canonicalText)).size !== 4) fail(`${q.id} options malformed`)
    if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) fail(`${q.id} answer index invalid`)
    if (q.o.some((o) => CATCH_ALL_OPTION.test(o.trim()))) fail(`${q.id} catch-all option`)
    if (!q.e || q.e.trim().length < 12) fail(`${q.id} has no editorial explanation`)
    const bank = context.bankById.get(q.id)
    if (!bank) { fail(`${q.id} is not in the reviewed bank`); continue }
    if (bank.verified !== true || !['A', 'B'].includes(bank.quality_grade)) fail(`${q.id} is not a verified A/B item`)
    if (bank.o[bank.a] !== q.o[q.a]) fail(`${q.id} exported answer does not match the verified bank answer`)
  }

  // --- blueprint ranges
  const subtopics = {}
  for (const s of MPT_SECTION_ORDER) {
    const dist = count(bySection[s], (q) => q.meta.subtopic)
    subtopics[s] = dist
    for (const [sub, range] of Object.entries(MPT_SUBTOPIC_RANGES[s])) {
      const n = dist[sub] ?? 0
      if (n < range.min || n > range.max) fail(`${s} ${sub} = ${n}, outside ${range.min}–${range.max}`)
    }
    for (const sub of Object.keys(dist)) if (!(sub in MPT_SUBTOPIC_RANGES[s])) fail(`${s} contains foreign subtopic ${sub}`)
  }
  const groups = {
    english: count(bySection.English, (q) => groupOf(q.meta)),
    abilities: count(bySection['General Abilities'], (q) => groupOf(q.meta)),
    generalKnowledge: count(bySection['General Knowledge'], (q) => groupOf(q.meta)),
    urdu: count(bySection.Urdu, (q) => groupOf(q.meta)),
  }
  groups.generalKnowledge.scienceIt = bySection['General Knowledge'].filter((q) => ['sci.it', 'sci.ai-digital'].includes(q.meta.subtopic)).length
  for (const [area, ranges] of Object.entries(MPT_GROUP_RANGES)) {
    for (const [g, range] of Object.entries(ranges)) {
      const n = groups[area][g] ?? 0
      if (n < range.min || n > range.max) fail(`${area} ${g} = ${n}, outside ${range.min}–${range.max}`)
    }
  }

  // --- section-specific editorial rules
  const passages = new Set(bySection.English.filter((q) => q.meta.passage_id).map((q) => q.meta.passage_id))
  if (passages.size < 1) fail('no unseen comprehension passage')
  const islamicSubtopics = Object.keys(subtopics['Islamic Studies']).length
  if (islamicSubtopics < 6) fail(`Islamic Studies covers only ${islamicSubtopics} topics`)
  for (const q of bySection['Islamic Studies']) {
    const text = `${q.q} ${q.o.join(' ')}`
    if (ISLAMIC_TRIVIA.some((re) => re.test(text))) fail(`${q.id} Islamic numbering/source trivia`)
  }
  for (const q of bySection.Urdu) if (URDU_LITERATURE.test(`${q.q} ${q.o.join(' ')}`)) fail(`${q.id} literary Urdu item`)
  for (const q of bySection['General Knowledge']) {
    if (q.meta.subject === 'Everyday Science' && SCIENCE_TOO_ADVANCED.test(`${q.q} ${q.o.join(' ')}`)) fail(`${q.id} science too advanced`)
    if (q.meta.subject === 'Current Affairs' && NEWS_TRIVIA.test(q.q)) fail(`${q.id} news trivia`)
    if (q.meta.subject === 'Pakistan Affairs' && TEMPLATE_WORDING.some((re) => re.test(q.q))) fail(`${q.id} Pakistan Affairs template wording`)
    if (q.meta.time_sensitive) {
      if (!/^https:\/\//.test(q.meta.source_url ?? '')) fail(`${q.id} time-sensitive item without source URL`)
      if (!q.meta.event_date || !q.meta.last_verified) fail(`${q.id} time-sensitive item without dates`)
      if (q.meta.subtopic === 'ca.recent' && (q.meta.event_date < context.currentWindow.from || q.meta.event_date > context.currentWindow.to)) {
        fail(`${q.id} stale Current Affairs (event ${q.meta.event_date})`)
      }
    }
    if (q.meta.subject === 'Current Affairs' && q.meta.source_type === 'past-paper-reviewed') fail(`${q.id} past-paper Current Affairs reused`)
  }
  const formats = context.formatFamilies
  const gaFamilies = count(bySection['General Abilities'].filter((q) => !formats.has(q.meta.pattern_family)), (q) => q.meta.pattern_family)
  for (const [f, n] of Object.entries(gaFamilies)) if (n > MPT_REPETITION_LIMITS.perPaperFamilyGa.max) fail(`GA pattern family ${f} appears ${n} times`)
  const families = count(questions.filter((q) => q.section !== 'General Abilities' && !formats.has(q.meta.pattern_family)), (q) => q.meta.pattern_family)
  const repeatedFamilies = Object.entries(families).filter(([, n]) => n > MPT_REPETITION_LIMITS.perPaperFamily.max)
  repeatedFamilies.forEach(([f, n]) => fail(`pattern family ${f} appears ${n} times`))
  const templates = count(questions.filter((q) => !q.meta.passage_id && /\d/.test(bareStem(q))), (q) => surfaceTemplate(bareStem(q)))
  Object.entries(templates).filter(([, n]) => n > 1).forEach(([t]) => fail(`numeric template repeated: ${t.slice(0, 90)}`))

  // --- difficulty
  const difficulty = count(questions, (q) => q.meta.difficulty)
  const shape = [['accessible', 1], ['moderate', 2], ['challenging', 3]]
  for (const [name, d] of shape) {
    const n = difficulty[d] ?? 0
    const range = MPT_DIFFICULTY_SHAPE[name]
    if (n < range.min || n > range.max) fail(`${name} items = ${n}, outside ${range.min}–${range.max}`)
  }
  const sectionDifficulty = {}
  for (const s of MPT_SECTION_ORDER) {
    const d = count(bySection[s], (q) => q.meta.difficulty)
    sectionDifficulty[s] = { 1: d[1] ?? 0, 2: d[2] ?? 0, 3: d[3] ?? 0 }
    if ((d[3] ?? 0) / MPT_SECTION_SIZE[s] * 100 > MPT_DIFFICULTY_SHAPE.perSectionChallengingShare.max) fail(`${s} is more than 40% challenging`)
    if ((d[1] ?? 0) / MPT_SECTION_SIZE[s] > 0.6) fail(`${s} is more than 60% accessible (too easy)`)
  }
  const opening = questions.slice(0, MPT_ORDER_RULES.openingWindow)
  if (questions.slice(0, 5).some((q) => q.meta.difficulty === 3)) fail('a challenging question appears in the first five')
  if (opening.filter((q) => q.meta.difficulty === 3).length > MPT_ORDER_RULES.openingMaxChallenging) fail('too many challenging questions in the opening ten')
  if (questions[0]?.meta.difficulty === 3) fail('paper opens with a challenging question')
  let run = 0
  let maxRun = 0
  for (const q of questions) { run = q.meta.difficulty === 3 ? run + 1 : 0; maxRun = Math.max(maxRun, run) }
  if (maxRun > MPT_ORDER_RULES.maxConsecutiveChallenging) fail(`${maxRun} challenging questions in a row`)

  // --- answer positions and human-style review
  const positions = count(questions, (q) => q.a)
  for (let k = 0; k < 4; k += 1) if ((positions[k] ?? 0) < 25 || (positions[k] ?? 0) > 80) warn(`answer position ${'ABCD'[k]} used ${positions[k] ?? 0} times`)
  const review = []
  for (const q of questions) {
    const flags = reviewFlags(q)
    if (flags.length) review.push({ id: q.id, section: q.section, flags })
  }
  const blocking = review.filter((r) => r.flags.some((f) => ['machine-template wording', 'database-style prompt', 'options not distinct', 'punctuation defect'].includes(f)))
  blocking.forEach((r) => fail(`${r.id} editorial review: ${r.flags.join(', ')}`))
  const negative = review.filter((r) => r.flags.includes('negative stem')).length
  if (negative > 6) fail(`${negative} negatively worded stems`)
  const giveaways = review.filter((r) => r.flags.includes('correct option conspicuously longer than distractors')).length
  if (giveaways > 8) fail(`${giveaways} questions where the correct option is conspicuously longer`)

  const current = bySection['General Knowledge'].filter((q) => q.meta.subtopic === 'ca.recent')
  const report = {
    paper: index,
    key: paper.key ?? null,
    fingerprint: paperFingerprint(questions),
    sections: Object.fromEntries(MPT_SECTION_ORDER.map((s) => [s, bySection[s].length])),
    subtopics,
    groups,
    difficulty: { 1: difficulty[1] ?? 0, 2: difficulty[2] ?? 0, 3: difficulty[3] ?? 0 },
    sectionDifficulty,
    opening: questions.slice(0, 10).map((q) => q.meta.difficulty),
    passage: [...passages][0] ?? null,
    pastPaperDerived: questions.filter((q) => q.meta.source_type === 'past-paper-reviewed').length,
    sourceTypes: count(questions, (q) => q.meta.source_type),
    fresh: questions.filter((q) => q.meta.source_type !== 'past-paper-reviewed').length,
    currentAffairs: current.map((q) => ({ id: q.id, event_date: q.meta.event_date, verified: q.meta.last_verified, source: new URL(q.meta.source_url).hostname })),
    timeSensitiveWithSource: questions.filter((q) => q.meta.time_sensitive && q.meta.source_url).length,
    timeSensitive: questions.filter((q) => q.meta.time_sensitive).length,
    familyRepetition: Object.entries(families).filter(([, n]) => n > 1).map(([f, n]) => ({ family: f, n })),
    answerPositions: positions,
    reviewFlags: review,
  }
  return { failures, warnings, report }
}

export function paperFingerprint(questions) {
  return createHash('sha256').update(JSON.stringify(questions.map((q) => [q.id, q.o, q.a]))).digest('hex').slice(0, 16)
}

export function auditSeries(papers, context) {
  context = { ...context, formatFamilies: context.formatFamilies ?? formatFamilies([...context.bankById.values()]) }
  const failures = []
  const warnings = []
  const reports = []
  for (const paper of papers) {
    const result = auditPaper(paper, context)
    failures.push(...result.failures)
    warnings.push(...result.warnings)
    reports.push(result.report)
  }
  // --- series uniqueness
  const ids = new Map(); const stems = new Map(); const concepts = new Map(); const templates = new Map()
  const familyPapers = new Map()
  const identity = new Map()
  const similar = []
  const threshold = MPT_REPETITION_LIMITS.nearDuplicateJaccard.max
  for (const paper of papers) {
    const familiesHere = new Set()
    for (const q of paper.questions) {
      const where = `paper ${paper.index}`
      if (ids.has(q.id)) failures.push(`${q.id} repeats (${ids.get(q.id)} and ${where})`)
      ids.set(q.id, where)
      const stem = bareStem(q)
      const stemKey = q.meta.passage_id ? `${q.meta.passage_id}|${canonicalText(stem)}` : canonicalText(`${stem} ${q.meta.subtopic.startsWith('eng.') || q.meta.subtopic.startsWith('urdu.') ? [...q.o].sort().join(' ') : ''}`)
      if (stems.has(stemKey)) failures.push(`${q.id} duplicates the text of ${stems.get(stemKey)}`)
      stems.set(stemKey, q.id)
      const concept = `${q.section}|${canonicalText(q.meta.concept)}`
      if (concepts.has(concept)) failures.push(`${q.id} tests the same concept as ${concepts.get(concept)}`)
      concepts.set(concept, q.id)
      if (context.served.stems.has(stemHash(stem))) failures.push(`${q.id} was served in an earlier MPT series`)
      if (context.served.ids.has(q.id)) failures.push(`${q.id} id was served in an earlier MPT series`)
      if (!q.meta.passage_id && (q.section === 'General Abilities' || /\d/.test(stem))) {
        const t = surfaceTemplate(stem)
        if (templates.has(t)) failures.push(`${q.id} repeats the wording template of ${templates.get(t)} with changed numbers`)
        templates.set(t, q.id)
      }
      if (!context.formatFamilies.has(q.meta.pattern_family)) familiesHere.add(q.meta.pattern_family)
      const idText = q.meta.passage_id ? null : tokenSet(['eng.sentence-correction', 'eng.error-identification', 'eng.punctuation', 'eng.sentence-structure', 'eng.modifier', 'eng.sva', 'urdu.sentence', 'urdu.translation', 'urdu.usage'].includes(q.meta.subtopic) || tokenSet(stem).size < 4 ? `${stem} ${q.o.join(' ')}` : `${stem} ${q.o[q.a]}`)
      if (idText) {
        const list = identity.get(q.meta.subtopic) ?? []
        for (const other of list) {
          const sim = jaccard(idText, other.tokens)
          if (sim >= threshold) failures.push(`${q.id} near-duplicates ${other.id} (similarity ${sim.toFixed(2)})`)
          else if (sim >= 0.55) similar.push({ a: other.id, b: q.id, similarity: Number(sim.toFixed(2)) })
        }
        list.push({ id: q.id, tokens: idText })
        identity.set(q.meta.subtopic, list)
      }
    }
    for (const f of familiesHere) familyPapers.set(f, (familyPapers.get(f) ?? 0) + 1)
  }
  for (const [f, n] of familyPapers) if (n > MPT_REPETITION_LIMITS.perSeriesFamily.max) failures.push(`pattern family ${f} appears in ${n} papers (limit ${MPT_REPETITION_LIMITS.perSeriesFamily.max})`)
  if (papers.length !== context.expectedPapers) failures.push(`series has ${papers.length}/${context.expectedPapers} papers`)
  for (const s of similar) {
    const r = reports.find((x) => x.paper === Number(ids.get(s.b).split(' ')[1]))
    if (r) (r.similarityWarnings ??= []).push(s)
  }
  return { failures, warnings, reports, similar, familyPapers: Object.fromEntries(familyPapers) }
}

const pct = (n, d) => `${Math.round((n / d) * 100)}%`

export function renderMarkdown(result, meta) {
  const { reports } = result
  const lines = []
  lines.push(`# MPT release ${meta.release} — editorial report`, '')
  lines.push(`Generated from the exact exported paper representation. Series ${meta.series}; ${reports.length} papers; status **${result.failures.length ? 'BLOCKED' : 'PASS'}**.`, '')
  lines.push('Ranges enforced are CSS Vista practice ranges (see src/data/mpt/blueprint.ts), not FPSC quotas. FPSC prescribes only the five broad sections.', '')
  lines.push('## Series summary', '')
  const total = reports.length * 200
  const agg = (pick) => reports.reduce((s, r) => s + pick(r), 0)
  lines.push(`- Questions: ${total}; unique question ids: ${meta.uniqueIds}; unique concepts: ${meta.uniqueConcepts}`)
  lines.push(`- Difficulty: accessible ${agg((r) => r.difficulty[1])}, moderate ${agg((r) => r.difficulty[2])}, challenging ${agg((r) => r.difficulty[3])}`)
  lines.push(`- Past-paper-derived (reviewed, timeless sections): ${agg((r) => r.pastPaperDerived)}; other reviewed/authored/generated: ${agg((r) => r.fresh)}`)
  lines.push(`- Time-sensitive items with source URL: ${agg((r) => r.timeSensitiveWithSource)}/${agg((r) => r.timeSensitive)}`)
  lines.push(`- Near-duplicate warnings (similarity 0.55–0.72): ${result.similar.length}; failures: ${result.failures.length}; warnings: ${result.warnings.length}`, '')
  lines.push('## Paper by paper', '')
  lines.push('| Paper | Fingerprint | Diff 1/2/3 | Opening (Q1–10) | Eng vocab/grammar/comp | GA quant/reason | GK sci/CA/PA | CA recent (dates) | Past-paper | Flags |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|')
  for (const r of reports) {
    const e = r.groups.english; const g = r.groups.abilities; const k = r.groups.generalKnowledge
    const dates = r.currentAffairs.map((c) => c.event_date.slice(2)).sort().join(', ')
    lines.push(`| ${r.paper} | \`${r.fingerprint}\` | ${r.difficulty[1]}/${r.difficulty[2]}/${r.difficulty[3]} | ${r.opening.join('')} | ${e.vocabulary ?? 0}/${e.grammar ?? 0}/${e.comprehension ?? 0} | ${g.quant ?? 0}/${g.reasoning ?? 0} | ${k.science ?? 0}/${k.current ?? 0}/${k.pakistan ?? 0} | ${r.currentAffairs.length} (${dates}) | ${r.pastPaperDerived} | ${r.reviewFlags.length} |`)
  }
  lines.push('')
  for (const r of reports) {
    lines.push(`### Paper ${r.paper}`, '')
    lines.push(`Fingerprint \`${r.fingerprint}\` · passage \`${r.passage}\` · difficulty ${pct(r.difficulty[1], 200)} / ${pct(r.difficulty[2], 200)} / ${pct(r.difficulty[3], 200)}`, '')
    for (const [section, dist] of Object.entries(r.subtopics)) {
      const d = r.sectionDifficulty[section]
      lines.push(`- **${section}** (d ${d[1]}/${d[2]}/${d[3]}): ${Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.split('.').slice(1).join('.')} ${v}`).join(', ')}`)
    }
    lines.push(`- Sources: ${Object.entries(r.sourceTypes).map(([k, v]) => `${k} ${v}`).join(', ')}`)
    if (r.currentAffairs.length) lines.push(`- Current Affairs (time-sensitive): ${r.currentAffairs.map((c) => `${c.event_date} [${c.source}, verified ${c.verified}]`).join('; ')}`)
    if (r.familyRepetition.length) lines.push(`- Pattern families used twice: ${r.familyRepetition.map((f) => f.family).join(', ')}`)
    if (r.similarityWarnings?.length) lines.push(`- Similarity warnings: ${r.similarityWarnings.map((s) => `${s.a}~${s.b} (${s.similarity})`).join(', ')}`)
    if (r.reviewFlags.length) lines.push(`- Editorial flags: ${r.reviewFlags.map((f) => `${f.id}: ${f.flags.join('/')}`).join('; ')}`)
    lines.push('')
  }
  if (result.failures.length) {
    lines.push('## Blocking failures', '')
    result.failures.slice(0, 300).forEach((f) => lines.push(`- ${f}`))
  }
  return `${lines.join('\n')}\n`
}
