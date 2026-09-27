// Repairs the live MPT series instead of replacing it.
//
// The papers already frozen for the remaining scheduled mocks (the b054de7 series,
// data-archive/mpt-live-series-b054de7.json) are kept paper by paper and question by
// question. A live question stays exactly as it is unless it has a concrete defect
// (scripts/mpt/live-review-rules.mjs) or repeats a question already used; only those
// slots are refilled, in place, from the reviewed bank (src/data/mpt/bank), with an item
// from the same section and official heading that most resembles the real FPSC papers,
// at an accessible or moderate level. Nothing is deleted: every bank item not used here
// stays in reserve for any mock added later.
//
// Deterministic: the same live series, bank and seed always give the same result.
import { readFileSync } from 'node:fs'
import { canonical, surfaceTemplate } from './bank-lib.mjs'
import { liveDefects, liveHeading, questionFrame, MAX_FRAME_PER_PAPER } from './live-review-rules.mjs'
import { resemblanceScores } from './resemblance.mjs'
import {
  rngFor, optionOrder, tokenSet, jaccard, identityText, officialHeading, ReleaseError, SAME_FACT_JACCARD,
} from '../../src/data/mpt/selector.ts'
import { MPT_SECTION_ORDER, MPT_SECTION_SIZE, MPT_SUBTOPICS } from '../../src/data/mpt/taxonomy.ts'
import { MPT_PILEUP_FACTOR, MPT_PASSAGE_QUESTIONS, MPT_REPETITION_LIMITS } from '../../src/data/mpt/blueprint.ts'

export const LIVE_SERIES_PATH = 'data-archive/mpt-live-series-b054de7.json'
const FACTUAL = new Set(['Islamic Studies', 'General Knowledge'])
const NEAR_DUPLICATE = MPT_REPETITION_LIMITS.nearDuplicateJaccard.max
const SAME_TOPIC_IN_PAPER = 0.35
/** Share of accessible items a section aims for among its replacements; the rest moderate. */
const ACCESSIBLE_SHARE = 0.5

export function loadLiveSeries(path = LIVE_SERIES_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

// English slot → bank subtopics that teach the same thing (first match wins).
const ENGLISH_TOPIC = [
  [/synonym/i, ['eng.synonym']], [/antonym/i, ['eng.antonym']], [/preposition/i, ['eng.preposition']],
  [/article/i, ['eng.article']], [/tense/i, ['eng.tense']], [/agreement/i, ['eng.sva']], [/pronoun/i, ['eng.pronoun']],
  [/modifier/i, ['eng.modifier']], [/punctuat/i, ['eng.punctuation']], [/idiom|phrase/i, ['eng.idiom', 'eng.phrasal-verb']],
  [/parts of speech/i, ['eng.parts-of-speech']], [/vocab|word|diction|register/i, ['eng.vocab-context', 'eng.confused-words']],
  [/voice|speech|clause|sentence|backbone|verbal|simulation|mastery|conjunction/i, ['eng.sentence-correction', 'eng.error-identification', 'eng.sentence-structure', 'eng.conjunction']],
]

const bankHeading = (q) => officialHeading(q)
const factKey = (section, stem, answer) => (FACTUAL.has(section) && canonical(answer).length > 3 ? canonical(answer) : null)

export function repairLiveSeries({ live, bank, seed, firstPaper, lastPaper }) {
  const { scores } = resemblanceScores(bank.questions)
  const passages = new Map(bank.passages.map((p) => [p.id, p]))
  const passageItems = new Map()
  for (const q of bank.questions.filter((x) => x.subtopic === 'eng.comprehension')) {
    const list = passageItems.get(q.passage_id) ?? []
    list.push(q)
    passageItems.set(q.passage_id, list)
  }
  const passageIds = [...passageItems.keys()].filter((id) => passages.has(id)
    && passageItems.get(id).length >= MPT_PASSAGE_QUESTIONS.min && passageItems.get(id).length <= MPT_PASSAGE_QUESTIONS.max).sort()
  const pool = new Map()
  for (const q of bank.questions) {
    if (q.subtopic === 'eng.comprehension') continue
    const key = `${q.section}|${bankHeading(q)}`
    const list = pool.get(key) ?? []
    list.push(q)
    pool.set(key, list)
  }

  // Series-wide state, shared by kept and new items.
  const state = {
    servedStems: new Set(live.papers.slice(0, firstPaper - 1).flatMap((p) => p.questions.map((q) => canonical(q.q)))),
    servedIds: new Set(live.papers.slice(0, firstPaper - 1).flatMap((p) => p.questions.map((q) => q.id))),
    seenStems: new Set(), gaTemplates: new Set(), usedIds: new Set(), concepts: new Set(), passages: new Set(),
    facts: new Map(), identities: new Map(), familyPapers: new Map(),
  }
  const remember = (section, stem, answer, options) => {
    state.seenStems.add(canonical(stem))
    if (section === 'General Abilities' || /\d/.test(stem)) state.gaTemplates.add(`${section}|${surfaceTemplate(stem)}`)
    const key = factKey(section, stem, answer)
    if (key) { const list = state.facts.get(key) ?? []; list.push(tokenSet(`${stem} ${answer}`)); state.facts.set(key, list) }
    if (section !== 'General Abilities') {
      const list = state.identities.get(section) ?? []
      list.push(tokenSet(options && tokenSet(stem).size < 4 ? `${stem} ${options.join(' ')}` : `${stem} ${answer}`))
      state.identities.set(section, list)
    }
  }
  const repeats = (section, stem, answer, options) => {
    if (state.seenStems.has(canonical(stem)) || state.servedStems.has(canonical(stem))) return 'repeats a question already in the series'
    if ((section === 'General Abilities' || /\d/.test(stem)) && state.gaTemplates.has(`${section}|${surfaceTemplate(stem)}`)) return 'same question with numbers changed'
    const key = factKey(section, stem, answer)
    if (key) {
      const t = tokenSet(`${stem} ${answer}`)
      if ((state.facts.get(key) ?? []).some((o) => jaccard(t, o) >= SAME_FACT_JACCARD)) return 'tests the same fact as an earlier question'
    }
    if (section !== 'General Abilities') {
      const t = tokenSet(options && tokenSet(stem).size < 4 ? `${stem} ${options.join(' ')}` : `${stem} ${answer}`)
      if ((state.identities.get(section) ?? []).some((o) => jaccard(t, o) >= NEAR_DUPLICATE)) return 'near-duplicate of an earlier question'
    }
    return null
  }

  const papers = []
  const kept = new Map()
  const log = []
  for (const livePaper of live.papers.slice(firstPaper - 1, lastPaper)) {
    const paperSeed = `${seed}|live-${livePaper.index}`
    const rng = rngFor(paperSeed)
    const familiesInPaper = new Map()
    const answersInPaper = new Set()
    // One topic once per paper in the factual sections (e.g. not two Siachen questions).
    const topicsInPaper = new Map()
    const topicTokens = (stem, answer) => tokenSet(`${stem} ${answer}`)
    const sameTopic = (section, stem, answer) => FACTUAL.has(section)
      && (topicsInPaper.get(section) ?? []).some((t) => jaccard(topicTokens(stem, answer), t) >= SAME_TOPIC_IN_PAPER)
    const addTopic = (section, stem, answer) => {
      if (!FACTUAL.has(section)) return
      const list = topicsInPaper.get(section) ?? []
      list.push(topicTokens(stem, answer))
      topicsInPaper.set(section, list)
    }
    const difficultyInSection = new Map()
    const frames = new Map()
    const frameFull = (stem) => (frames.get(questionFrame(stem)) ?? 0) >= MAX_FRAME_PER_PAPER
    const addFrame = (stem) => frames.set(questionFrame(stem), (frames.get(questionFrame(stem)) ?? 0) + 1)
    const out = []
    // 1. Review every live question in paper order.
    const slots = livePaper.questions.map((q, position) => {
      const reasons = liveDefects(q, { servedStems: state.servedStems, seenStems: new Set(), gaTemplates: new Set() })
      if (state.servedIds.has(q.id)) reasons.push('already used in an earlier mock')
      const again = repeats(q.paperSection, q.q, q.o[q.a], q.o)
      if (again) reasons.push(again)
      const answer = canonical(q.o[q.a])
      if (FACTUAL.has(q.paperSection) && answer.length > 3 && answersInPaper.has(answer)) reasons.push('same answer as another question in this paper')
      if (sameTopic(q.paperSection, q.q, q.o[q.a])) reasons.push('same topic as another question in this paper')
      if (frameFull(q.q)) reasons.push(`more than ${MAX_FRAME_PER_PAPER} questions of the same frame in this paper`)
      if (!reasons.length) {
        addFrame(q.q)
        remember(q.paperSection, q.q, q.o[q.a], q.o)
        addTopic(q.paperSection, q.q, q.o[q.a])
        if (FACTUAL.has(q.paperSection)) answersInPaper.add(answer)
      }
      return { position, live: q, reasons, heading: liveHeading(q) }
    })
    // 2. English needs its unseen passage (FPSC: comprehension). If the live English has
    //    no full passage, the last replaced English slots take one bank passage.
    const englishSlots = slots.filter((s) => s.live.paperSection === 'English')
    const replacedEnglish = englishSlots.filter((s) => s.reasons.length)
    let passageBlock = []
    const passageId = passageIds.find((id) => !state.passages.has(id)
      && passageItems.get(id).length <= replacedEnglish.length
      && passageItems.get(id).every((q) => !state.usedIds.has(q.id)))
    if (!passageId) throw new ReleaseError(`Live paper ${livePaper.index}: no unused passage fits its ${replacedEnglish.length} replaceable English slots`)
    state.passages.add(passageId)
    passageBlock = [...passageItems.get(passageId)].sort((a, b) => a.id.localeCompare(b.id))
    const passageSlots = new Set(replacedEnglish.slice(-passageBlock.length).map((s) => s.position))
    passageBlock.forEach((q) => { state.usedIds.add(q.id); state.concepts.add(`${q.section}|${canonical(q.concept)}`) })

    // 3. Refill every other replaced slot in place. Each heading is paced over the papers
    //    still to repair, so a scarce heading is never exhausted before the last paper.
    const papersLeft = lastPaper - livePaper.index + 1
    // Budgets are fixed once, at the first paper, so every paper gets the same share.
    const headingBudget = state.headingBudget ?? new Map()
    const fixBudgets = !state.headingBudget
    state.headingBudget = headingBudget
    const headingUsed = new Map()
    const accessibleShare = new Map()
    for (const [key, list] of pool) {
      const fresh = list.filter((q) => !state.usedIds.has(q.id) && q.difficulty < 3)
      // General Ability capacity counts what the family limits still allow: a skeleton
      // appears at most once per paper and in at most perSeriesFamily papers.
      let capacity = fresh.length
      if (key.startsWith('General Abilities|')) {
        const perFamily = new Map()
        for (const q of fresh) perFamily.set(q.pattern_family, (perFamily.get(q.pattern_family) ?? 0) + 1)
        capacity = [...perFamily].reduce((n, [f, c]) => n + Math.min(c, Math.max(0, MPT_REPETITION_LIMITS.perSeriesFamily.max - (state.familyPapers.get(f) ?? 0))), 0)
      }
      // 90 %: some fresh items are always blocked by the repetition checks.
      if (fixBudgets) headingBudget.set(key, Math.max(1, Math.floor((capacity * 0.9) / papersLeft)))
      const section = key.split('|')[0]
      const sectionFresh = [...pool].filter(([k]) => k.startsWith(`${section}|`)).flatMap(([, l]) => l.filter((q) => !state.usedIds.has(q.id) && q.difficulty < 3))
      accessibleShare.set(section, sectionFresh.length ? sectionFresh.filter((q) => q.difficulty === 1).length / sectionFresh.length : ACCESSIBLE_SHARE)
    }
    const sectionCounts = new Map()
    const hardInSection = new Map()
    const bumpSub = (section, sub) => sectionCounts.set(`${section}|${sub}`, (sectionCounts.get(`${section}|${sub}`) ?? 0) + 1)
    for (const slot of slots) {
      if (slot.reasons.length) continue
      out[slot.position] = { src: 'live', id: slot.live.id, section: slot.live.paperSection }
      kept.set(slot.live.id, slot.live)
    }
    for (const slot of slots) {
      if (!slot.reasons.length || passageSlots.has(slot.position)) continue
      const section = slot.live.paperSection
      const size = MPT_SECTION_SIZE[section]
      // Same official heading first; FPSC sets no split between headings, so a slot may
      // fall back to another heading of the same section when the first is exhausted.
      const others = [...pool.keys()].filter((k) => k.startsWith(`${section}|`)).map((k) => k.split('|')[1]).filter((h) => h !== slot.heading).sort()
      const overBudget = (h) => (headingUsed.get(`${section}|${h}`) ?? 0) >= (headingBudget.get(`${section}|${h}`) ?? Infinity)
      const room = (h) => (headingBudget.get(`${section}|${h}`) ?? 0) - (headingUsed.get(`${section}|${h}`) ?? 0)
      // Sections with several headings keep them in the bank's proportions: the slot goes to
      // the heading with most room left in this paper (the live heading wins ties).
      const headings = others.length
        ? [slot.heading, ...others].sort((x, y) => room(y) - room(x) || (x === slot.heading ? -1 : y === slot.heading ? 1 : x.localeCompare(y)))
        : [slot.heading]
      void overBudget
      const wantSubs = section === 'English' ? (ENGLISH_TOPIC.find(([re]) => re.test(slot.live.s ?? ''))?.[1] ?? []) : []
      // The MPT is not a puzzle contest: General Abilities takes at most one challenging
      // replacement per paper, other sections at most 10 % of the section.
      const hardCap = section === 'General Abilities' ? 1 : Math.floor(size * 0.1)
      // Keep each section's replacements about half accessible, half moderate.
      const dc = difficultyInSection.get(section) ?? { 1: 0, 2: 0, 3: 0 }
      const filled = dc[1] + dc[2] + dc[3]
      // Aim for the accessible share the remaining bank can sustain, so the last paper is as easy as the first.
      const aim = accessibleShare.get(section) ?? ACCESSIBLE_SHARE
      const balance = (d) => (filled < 4 ? 0 : d === 1 && dc[1] / filled > aim + 0.05 ? 0.35 : d === 2 && dc[2] / filled > 1 - aim + 0.05 ? 0.35 : 0)
      const rankedFor = (heading) => {
        const candidates = pool.get(`${section}|${heading}`) ?? []
        const share = new Map()
        for (const q of candidates) share.set(q.subtopic, (share.get(q.subtopic) ?? 0) + 1)
        const fresh = candidates.filter((q) => !state.usedIds.has(q.id) && !state.concepts.has(`${q.section}|${canonical(q.concept)}`))
        // Draw evenly across families so the last papers still find enough distinct ones.
        const perFamily = new Map()
        for (const q of fresh) perFamily.set(q.pattern_family, (perFamily.get(q.pattern_family) ?? 0) + 1)
        const ranked = fresh
          .map((q) => ({
            q,
            key: rng() * 0.5 - (scores.get(q.id) ?? 0) * 0.4 + balance(q.difficulty)
              - (section === 'General Abilities' ? Math.min(0.9, (perFamily.get(q.pattern_family) ?? 0) * 0.06) : 0)
              + (q.difficulty === 3 ? 2 : q.difficulty === 2 ? 0.1 : 0)
              + (wantSubs.length && !wantSubs.includes(q.subtopic) ? 0.8 : 0)
              + (q.quality_grade === 'B' ? 0.2 : 0),
          }))
          .sort((x, y) => x.key - y.key || x.q.id.localeCompare(y.q.id))
        return { ranked, share, total: candidates.length }
      }
      const byHeading = new Map(headings.map((h) => [h, rankedFor(h)]))
      // Pass 0: accessible/moderate only, within the pile-up limit, same heading first, then
      // any heading of the section. Pass 1 (only if nothing qualifies): lift those two limits.
      let pick = null
      for (const pass of [0, 1]) {
        for (const heading of headings) {
          const { ranked, share, total } = byHeading.get(heading)
          for (const { q } of ranked) {
            if (q.difficulty === 3 && pass === 0 && (hardInSection.get(section) ?? 0) >= hardCap) continue
            const cap = Math.floor(MPT_PILEUP_FACTOR * size * ((share.get(q.subtopic) ?? 0) / Math.max(1, total))) + 1
            if ((sectionCounts.get(`${section}|${q.subtopic}`) ?? 0) >= cap && pass === 0) continue
            if (section === 'General Abilities') {
              if (familiesInPaper.has(q.pattern_family)) continue
              if ((state.familyPapers.get(q.pattern_family) ?? 0) >= MPT_REPETITION_LIMITS.perSeriesFamily.max) continue
            }
            const answer = canonical(q.o[q.a])
            if (FACTUAL.has(section) && answer.length > 3 && answersInPaper.has(answer)) continue
            if (repeats(section, q.q, q.o[q.a], q.o)) continue
            if (sameTopic(section, q.q, q.o[q.a])) continue
            if (frameFull(q.q)) continue
            pick = q
            break
          }
          if (pick) break
        }
        if (pick) break
      }
      if (!pick) throw new ReleaseError(`Live paper ${livePaper.index}: no bank replacement for ${section} / ${slot.heading} at position ${slot.position + 1}`)
      state.usedIds.add(pick.id)
      state.concepts.add(`${pick.section}|${canonical(pick.concept)}`)
      remember(section, pick.q, pick.o[pick.a], pick.o)
      if (FACTUAL.has(section)) answersInPaper.add(canonical(pick.o[pick.a]))
      if (section === 'General Abilities') {
        familiesInPaper.set(pick.pattern_family, true)
        state.familyPapers.set(pick.pattern_family, (state.familyPapers.get(pick.pattern_family) ?? 0) + 1)
      }
      if (pick.difficulty === 3) hardInSection.set(section, (hardInSection.get(section) ?? 0) + 1)
      addTopic(section, pick.q, pick.o[pick.a])
      addFrame(pick.q)
      dc[pick.difficulty] += 1
      difficultyInSection.set(section, dc)
      bumpSub(section, pick.subtopic)
      headingUsed.set(`${section}|${bankHeading(pick)}`, (headingUsed.get(`${section}|${bankHeading(pick)}`) ?? 0) + 1)
      out[slot.position] = { src: 'bank', id: pick.id, section, replaces: slot.live.id }
      log.push({ paper: livePaper.index, position: slot.position + 1, section, heading: slot.heading, removed: slot.live.id, removed_q: slot.live.q.slice(0, 160), reasons: slot.reasons, added: pick.id })
    }
    for (const slot of slots) {
      if (!passageSlots.has(slot.position)) continue
      log.push({ paper: livePaper.index, position: slot.position + 1, section: 'English', heading: 'comprehension', removed: slot.live.id, removed_q: slot.live.q.slice(0, 160), reasons: slot.reasons, added: `passage ${passageId}` })
    }
    // 4. Assemble: sections in the official order; the passage closes the English section.
    const ordered = []
    for (const section of MPT_SECTION_ORDER) {
      const inSection = slots.filter((s) => s.live.paperSection === section && !passageSlots.has(s.position)).map((s) => out[s.position])
      ordered.push(...inSection)
      if (section === 'English') ordered.push(...passageBlock.map((q) => ({ src: 'bank', id: q.id, section, replaces: null })))
    }
    if (ordered.length !== 200) throw new ReleaseError(`Live paper ${livePaper.index}: ${ordered.length}/200 after repair`)
    const byId = new Map(bank.questions.map((q) => [q.id, q]))
    papers.push({
      index: papers.length + 1,
      origin: { series: live.series, paper: livePaper.index, key: livePaper.key },
      passageId,
      questions: ordered.map((s) => {
        if (s.src === 'live') return { src: 'live', id: s.id, section: s.section }
        const q = byId.get(s.id)
        const order = optionOrder(q, paperSeed)
        return { src: 'bank', id: s.id, section: s.section, order, a: order.indexOf(q.a), ...(s.replaces ? { replaces: s.replaces } : {}) }
      }),
    })
  }
  return { papers, kept, log }
}

const LIVE_DIFFICULTY = new Set(['Basic', 'Intermediate', 'Advanced'])

/** Resolves a repaired paper into the exact objects the PHP server freezes. */
export function resolveRepairedPaper(paper, bank, kept) {
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  const passages = new Map(bank.passages.map((p) => [p.id, p]))
  return paper.questions.map((s) => {
    if (s.src === 'live') {
      const q = kept[s.id]
      if (!q) throw new ReleaseError(`Repaired series references unknown live question ${s.id}`)
      return {
        id: q.id,
        section: q.paperSection,
        topic: q.s ? String(q.s).slice(0, 191) : q.paperSection,
        difficulty: LIVE_DIFFICULTY.has(q.d) ? q.d : 'Intermediate',
        q: q.q,
        o: [...q.o],
        a: q.a,
        e: String(q.e ?? '').trim() ? `${q.e}${q.sourceUrl ? `\nSource: ${q.sourceUrl}` : ''}` : '',
        meta: { origin: 'live-series', heading: liveHeading(q), source_url: q.sourceUrl ?? null },
      }
    }
    const q = byId.get(s.id)
    if (!q) throw new ReleaseError(`Repaired series references unknown bank question ${s.id}`)
    const passage = q.passage_id ? passages.get(q.passage_id) : undefined
    const stem = passage ? `Read the passage and answer the question.\n\n${passage.title}\n\n${passage.text}\n\nQuestion: ${q.q}` : q.q
    const source = q.time_sensitive && q.source_url ? `\nSource: ${q.source_url} (development dated ${q.event_date}; verified ${q.last_verified}).` : ''
    return {
      id: q.id,
      section: q.section,
      topic: MPT_SUBTOPICS[q.subtopic].label,
      difficulty: ({ 1: 'Basic', 2: 'Intermediate', 3: 'Advanced' })[q.difficulty],
      q: stem,
      o: s.order.map((k) => q.o[k]),
      a: s.a,
      e: `${q.explanation}${source}`,
      meta: {
        origin: 'reviewed-bank', heading: officialHeading(q), subject: q.subject, subtopic: q.subtopic,
        pattern_family: q.pattern_family, concept: q.concept, difficulty: q.difficulty, source_type: q.source_type,
        time_sensitive: q.time_sensitive, event_date: q.event_date, source_url: q.source_url, last_verified: q.last_verified,
        passage_id: q.passage_id ?? null, replaces: s.replaces ?? null,
      },
    }
  })
}
