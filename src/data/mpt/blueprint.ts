// Paper blueprint for the CSS Vista MPT practice series.
//
// The paper is partitioned only as FPSC partitions it: 200 MCQs in five sections with
// their official marks, each built from its official syllabus headings. FPSC sets no
// count for any topic inside a section, and neither does CSS Vista: topics are drawn
// at random from the reviewed bank. The remaining rules concern quality, not content
// quotas: difficulty shape, a fair opening, and no repetition (see
// docs/mpt/editorial/BLUEPRINT.md).
//   official  — prescribed by FPSC (MPT Rules / syllabus)
//   observed  — seen in the recorded papers (src/data/mpt/patternProfile.ts)
//   internal  — CSS Vista's quality rule where FPSC is silent

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

/**
 * The official headings each section is built from (FPSC MPT Rules / syllabus).
 * FPSC prescribes no count for any heading or topic inside a section, so none is
 * imposed here: a heading must simply be present in every paper.
 */
export const MPT_OFFICIAL_HEADINGS: Record<MptSection, { by: 'subject' | 'group'; headings: string[]; note: string }> = {
  'Islamic Studies': { by: 'subject', headings: ['Islamic Studies'], note: 'FPSC MPT syllabus: Islamic Studies (Civics & Ethics for non-Muslim candidates)' },
  Urdu: { by: 'subject', headings: ['Urdu'], note: 'FPSC MPT syllabus: grammar usage and translation' },
  English: { by: 'group', headings: ['vocabulary and grammar', 'comprehension'], note: 'FPSC MPT Rules: vocabulary, grammar usage and comprehension (one unseen passage)' },
  'General Abilities': { by: 'subject', headings: ['Quantitative Ability', 'Reasoning'], note: 'FPSC MPT syllabus: quantitative ability; reasoning and mental ability' },
  'General Knowledge': { by: 'subject', headings: ['Everyday Science', 'Current Affairs', 'Pakistan Affairs'], note: 'FPSC MPT Rules: General Knowledge comprises Everyday Science, Current Affairs and Pakistan Affairs' },
}

/** Comprehension passage size: the recorded papers carry 5–10 questions on unseen passages. */
export const MPT_PASSAGE_QUESTIONS = r(5, 10, 'observed', '6 (2022), 5 (2024 Q86–90), 10 (2025)')

/**
 * No quota per topic. Items are drawn at random from the whole section; topic tags only
 * stop one paper piling up far more of a single topic than the bank's own mix
 * (at most twice its expected share, plus one).
 */
export const MPT_PILEUP_FACTOR = 2

/**
 * Difficulty. The recorded FPSC papers mix accessible, moderate and challenging items;
 * General Abilities is SSC level, so its challenging items are two- or three-step problems,
 * never university work. Replacements aim for 30/50/20 (General Abilities 30/55/15);
 * see DIFFICULTY_TARGET in scripts/mpt/repair-live-series.mjs.
 */
export const MPT_DIFFICULTY_SHAPE = {
  target: { 1: 0.3, 2: 0.5, 3: 0.2 },
  abilitiesTarget: { 1: 0.3, 2: 0.55, 3: 0.15 },
  accessible: r(40, 100, 'internal', '20–50 % of the paper at difficulty 1'),
  moderate: r(80, 125, 'internal', '40–62 % at difficulty 2'),
  challenging: r(20, 50, 'internal', '10–25 % at difficulty 3'),
  perSectionChallengingShare: r(0, 25, 'internal', 'No section more than 25 % challenging'),
  abilitiesChallengingShare: r(0, 15, 'internal', 'General Abilities at most 15 % challenging (9 of 60), SSC-level multi-step problems only'),
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
  perSeriesFamily: r(0, 20, 'internal', 'A General Ability skeleton family appears in at most 20 papers of the series, never twice in one paper, and its numbers-masked wording never repeats (factual and language sections are governed by concept uniqueness and near-duplicate checks instead)'),
  perSeriesTemplate: r(0, 1, 'internal', 'The same wording with only numbers or names changed never repeats across the series'),
  nearDuplicateJaccard: r(0, 0.72, 'internal', 'Stems with token-Jaccard ≥ 0.72 in one subtopic are treated as duplicates across the series'),
}
