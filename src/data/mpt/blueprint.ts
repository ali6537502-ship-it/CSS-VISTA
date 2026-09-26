// Paper blueprint for the CSS Vista MPT practice series.
//
// Three kinds of rule, kept apart on purpose (see docs/mpt/editorial/BLUEPRINT.md):
//   official  — prescribed by FPSC (MPT Rules / syllabus): 200 MCQs, 200 minutes,
//               the five broad sections and their marks.
//   observed  — derived from the recorded papers in src/data/mpt/patternProfile.ts
//               (counts summarised in docs/mpt/editorial/pattern-profile.json).
//   internal  — CSS Vista's own preparation choice where FPSC is silent and the
//               recorded papers vary or conflict.
// Ranges are practice ranges, never FPSC quotas.

import type { MptSection } from './taxonomy.ts'

export type RuleBasis = 'official' | 'observed' | 'internal'
export interface Range { min: number; max: number; basis: RuleBasis; note: string }
const r = (min: number, max: number, basis: RuleBasis, note: string): Range => ({ min, max, basis, note })

export const MPT_BROAD_STRUCTURE: Record<MptSection, Range> = {
  'Islamic Studies': r(20, 20, 'official', 'FPSC MPT: Islamic Studies / Civics & Ethics, 20 marks'),
  Urdu: r(20, 20, 'official', 'FPSC MPT: Urdu, 20 marks'),
  English: r(50, 50, 'official', 'FPSC MPT: English, 50 marks'),
  'General Abilities': r(60, 60, 'official', 'FPSC MPT: General Abilities, 60 marks'),
  'General Knowledge': r(50, 50, 'official', 'FPSC MPT: General Knowledge (Everyday Science, Current Affairs, Pakistan Affairs), 50 marks'),
}

/** Subtopic ranges per section. Keys are taxonomy subtopics. */
export const MPT_SUBTOPIC_RANGES: Record<MptSection, Record<string, Range>> = {
  'Islamic Studies': {
    'isl.beliefs': r(0, 3, 'internal', 'Syllabus heading; rarely a separate item in recorded papers'),
    'isl.quran': r(1, 4, 'observed', 'Qur’an items 2–7 per recorded paper; capped to stop Qur’an trivia dominating'),
    'isl.hadith': r(0, 2, 'observed', '0–2 per recorded paper'),
    'isl.worship': r(1, 3, 'observed', '0–2 recorded; syllabus stresses the impact of worship'),
    'isl.seerah-makkah': r(1, 3, 'observed', 'Seerah is the most frequent Islamiat area (5–7 items across both periods)'),
    'isl.seerah-madinah': r(1, 4, 'observed', 'Seerah is the most frequent Islamiat area'),
    'isl.personalities': r(1, 3, 'observed', '1–3 per recorded paper'),
    'isl.caliphate': r(0, 3, 'observed', '0–2 recorded; syllabus: governance under the Pious Caliphate'),
    'isl.law': r(1, 3, 'observed', '0–5 recorded (Ijma, Fiqh terms)'),
    'isl.governance': r(1, 3, 'internal', 'Syllabus heading under-represented in recalled papers; at least one per paper'),
    'isl.social': r(1, 3, 'internal', 'Syllabus: human rights, dignity, social justice; at least one per paper'),
    'isl.economy': r(0, 2, 'observed', '1–2 recorded'),
    'isl.civilization': r(0, 3, 'observed', '1–5 recorded; capped'),
    'isl.modern': r(0, 2, 'internal', 'Syllabus: Islam and the modern world'),
  },
  Urdu: {
    'urdu.grammar': r(3, 6, 'observed', '3–5 grammar-term items per recorded paper'),
    'urdu.plural': r(1, 3, 'observed', '1–2 recorded'),
    'urdu.gender': r(1, 3, 'observed', '2 in 2022'),
    'urdu.synonym': r(1, 3, 'observed', '2 in 2022'),
    'urdu.antonym': r(1, 3, 'observed', '2 in 2022'),
    'urdu.sentence': r(2, 4, 'observed', '2–3 recorded'),
    'urdu.usage': r(0, 2, 'observed', '1 recorded'),
    'urdu.idiom': r(0, 2, 'observed', '1–2 recorded (as language, not literature)'),
    'urdu.translation': r(1, 3, 'observed', '2–4 recorded'),
    'urdu.office-terms': r(1, 4, 'observed', '7 office-term translations in 2022'),
  },
  English: {
    'eng.comprehension': r(5, 10, 'observed', '6 (2022), 10 (2024), 10 (2025); one or two unseen passages'),
    'eng.synonym': r(4, 6, 'observed', '5–6 per recorded paper'),
    'eng.antonym': r(4, 6, 'observed', '4–6 per recorded paper'),
    'eng.vocab-context': r(2, 6, 'observed', '0–9 recorded'),
    'eng.idiom': r(2, 5, 'observed', '7 (2024), 5 (2025)'),
    'eng.phrasal-verb': r(0, 2, 'observed', '0–1 recorded; syllabus lists phrasal verbs'),
    'eng.confused-words': r(0, 2, 'internal', 'Syllabus lists commonly confused pairs'),
    'eng.preposition': r(3, 6, 'observed', '3–7 recorded'),
    'eng.article': r(1, 2, 'internal', 'Syllabus lists articles; 0–1 recorded'),
    'eng.tense': r(1, 3, 'internal', 'Syllabus lists tenses; 0–3 recorded'),
    'eng.conjunction': r(0, 2, 'internal', 'Syllabus lists conjunctions'),
    'eng.sva': r(1, 3, 'observed', 'Agreement is the commonest error in 2024–25 correction items'),
    'eng.pronoun': r(0, 2, 'observed', '0–1 recorded'),
    'eng.modifier': r(0, 2, 'observed', '1 in 2025'),
    'eng.parts-of-speech': r(0, 3, 'observed', '7 in 2022, none since'),
    'eng.punctuation': r(1, 3, 'observed', '1–4 recorded'),
    'eng.sentence-correction': r(4, 8, 'observed', '4–13 recorded'),
    'eng.error-identification': r(1, 4, 'observed', '3 (2024), 7 (2025)'),
    'eng.sentence-structure': r(0, 2, 'observed', '0–2 recorded'),
  },
  'General Abilities': {
    'ga.percentage': r(2, 4, 'observed', '2 per recorded paper'),
    'ga.ratio': r(1, 4, 'observed', '0–3 recorded'),
    'ga.average': r(1, 3, 'observed', '1–2 recorded'),
    'ga.profit-loss': r(0, 2, 'internal', 'Not recorded; SSC-level rates'),
    'ga.speed-time': r(1, 3, 'observed', '2 in 2024'),
    'ga.work-time': r(1, 3, 'observed', '3 in 2024'),
    'ga.fractions': r(2, 4, 'observed', '2–4 recorded'),
    'ga.algebra': r(2, 5, 'observed', '3–5 recorded'),
    'ga.equations': r(3, 6, 'observed', '2–11 recorded; capped at 6 so word problems do not overwhelm'),
    'ga.sets': r(1, 2, 'observed', '2 in 2024'),
    'ga.number-properties': r(1, 3, 'observed', 'SSC syllabus: remainders and rounding'),
    'ga.geometry': r(2, 4, 'observed', '2–9 recorded'),
    'ga.mensuration': r(1, 4, 'observed', '5 in 2024'),
    'ga.data': r(1, 3, 'observed', '7 statistics items in 2022'),
    'ga.probability': r(0, 2, 'observed', '1 recorded per paper'),
    'ga.series': r(2, 4, 'observed', '2–4 recorded'),
    'ga.directions': r(1, 2, 'observed', '1 recorded'),
    'ga.blood-relations': r(1, 3, 'observed', '1–3 recorded'),
    'ga.ordering': r(1, 3, 'observed', '1–3 recorded'),
    'ga.seating': r(1, 2, 'observed', '1 recorded'),
    'ga.deduction': r(1, 3, 'observed', '4 in 2022'),
    'ga.analytical': r(1, 2, 'observed', '1 in 2024'),
    'ga.coding': r(1, 2, 'observed', '1 in 2023'),
    'ga.verbal-reasoning': r(2, 4, 'observed', '1–4 recorded'),
    'ga.clock-calendar': r(1, 2, 'observed', '2 in 2024'),
    'ga.mental-ability': r(1, 3, 'observed', '1–3 recorded'),
  },
  'General Knowledge': {
    'sci.human-body': r(0, 3, 'internal', 'Per-subtopic cap'),
    'sci.health': r(0, 2, 'internal', 'Per-subtopic cap'),
    'sci.nutrition': r(0, 3, 'observed', '2–4 recorded; capped'),
    'sci.biology': r(0, 2, 'internal', 'Per-subtopic cap'),
    'sci.plants-ecology': r(0, 2, 'internal', 'Per-subtopic cap'),
    'sci.environment': r(0, 2, 'internal', 'Per-subtopic cap'),
    'sci.climate': r(0, 2, 'internal', 'Per-subtopic cap'),
    'sci.energy': r(0, 2, 'internal', 'Per-subtopic cap'),
    'sci.chemistry': r(0, 2, 'observed', '2 per recorded paper'),
    'sci.physics': r(0, 3, 'observed', '1–4 recorded'),
    'sci.units': r(0, 2, 'observed', '3 in 2022; capped'),
    'sci.earth-space': r(0, 3, 'observed', '1–5 recorded; capped'),
    'sci.it': r(1, 3, 'observed', '1–2 recorded; syllabus IT heading'),
    'sci.ai-digital': r(0, 2, 'observed', '1 per recent paper'),
    'ca.recent': r(3, 7, 'observed', '3–6 time-sensitive items in 2022–24 (2025 had 21, mostly minutiae — not followed)'),
    'ca.organisations': r(3, 6, 'observed', '3–4 recorded'),
    'ca.global-issues': r(3, 7, 'observed', '1–11 recorded'),
    'ca.pakistan-external': r(1, 4, 'observed', '1 recorded; syllabus: Pakistan’s external affairs'),
    'pa.movement': r(1, 3, 'observed', '1–3 recorded'),
    'pa.constitution': r(1, 3, 'observed', '2–3 recorded'),
    'pa.political-history': r(1, 3, 'observed', '1–5 recorded'),
    'pa.geography': r(1, 3, 'observed', '3–4 recorded'),
    'pa.economy': r(0, 2, 'observed', '1–5 recorded'),
    'pa.resources': r(0, 2, 'observed', '1–2 recorded'),
    'pa.institutions': r(0, 2, 'observed', '0–1 recorded'),
    'pa.foreign-policy': r(1, 3, 'observed', '1–7 recorded; capped'),
    'pa.security': r(0, 2, 'observed', '2–3 recorded'),
    'pa.society': r(0, 2, 'observed', '1–4 recorded'),
  },
}

/** Group totals inside sections. */
export const MPT_GROUP_RANGES = {
  english: {
    vocabulary: r(15, 22, 'observed', 'Vocabulary items 15–21 per recorded paper (synonyms, antonyms, context, idioms)'),
    grammar: r(18, 27, 'observed', 'Grammar items 18–24 per recorded paper'),
  },
  abilities: {
    quant: r(32, 38, 'observed', 'Quantitative 27–39 per recorded paper (2022 also had 14 psychometric-theory items, not used since)'),
    reasoning: r(22, 28, 'observed', 'Reasoning 9–20 recorded (2023 is partial); raised because the syllabus gives reasoning its own heading'),
  },
  generalKnowledge: {
    science: r(14, 18, 'observed', 'Everyday Science 11–17 per recorded paper (scaled to 50)'),
    current: r(14, 18, 'observed', 'Current Affairs 11–18 per recorded paper (scaled to 50)'),
    pakistan: r(14, 19, 'observed', 'Pakistan Affairs 13–19 per recorded paper (scaled to 50)'),
    scienceIt: r(2, 4, 'internal', 'Syllabus IT heading: computers, networks, AI'),
  },
  urdu: {
    translation: r(3, 6, 'observed', 'Translation incl. office terms: 7 (2022), 2 (2024), 4 (2025)'),
  },
}

/** Paper-level difficulty shape (share of 200). Internal: avoids both trivial and discouraging papers. */
export const MPT_DIFFICULTY_SHAPE = {
  accessible: r(50, 80, 'internal', '25–40 % of the paper at difficulty 1'),
  moderate: r(80, 115, 'internal', '40–57 % at difficulty 2'),
  challenging: r(28, 60, 'internal', '14–30 % at difficulty 3'),
  perSectionChallengingShare: r(0, 40, 'internal', 'No section more than 40 % challenging'),
}

/** Opening and ordering rules (internal, from the owner's instruction on the psychological opening). */
export const MPT_ORDER_RULES = {
  openingWindow: 10,
  openingMaxChallenging: 2,
  openingFirstFiveMaxChallenging: 0,
  maxConsecutiveChallenging: 2,
}

/** Repetition limits. */
export const MPT_REPETITION_LIMITS = {
  perPaperFamily: r(0, 2, 'internal', 'At most two items from one pattern family in a paper (one for GA computation families)'),
  perPaperFamilyGa: r(0, 1, 'internal', 'A General Ability skeleton appears at most once per paper'),
  perSeriesFamily: r(0, 12, 'internal', 'A pattern family appears in at most 12 of the 40 papers'),
  perSeriesTemplate: r(0, 1, 'internal', 'The same wording with only numbers or names changed never repeats across the series'),
  nearDuplicateJaccard: r(0, 0.72, 'internal', 'Stems with token-Jaccard ≥ 0.72 in one subtopic are treated as duplicates across the series'),
}
