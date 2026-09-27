// Renders docs/mpt/editorial/BLUEPRINT.md from src/data/mpt/blueprint.ts so the
// documented ranges are always the enforced ones.
import { writeFileSync, readFileSync } from 'node:fs'
import {
  MPT_BROAD_STRUCTURE, MPT_OFFICIAL_HEADINGS, MPT_PASSAGE_QUESTIONS, MPT_PILEUP_FACTOR, MPT_DIFFICULTY_SHAPE, MPT_ORDER_RULES, MPT_REPETITION_LIMITS,
} from '../../src/data/mpt/blueprint.ts'

const profile = JSON.parse(readFileSync('docs/mpt/editorial/pattern-profile.json', 'utf8'))
const L = []
L.push('# MPT paper blueprint (generated — do not edit by hand)', '')
L.push('Rendered by `node scripts/mpt/render-blueprint-doc.mjs` from `src/data/mpt/blueprint.ts`.', '')
L.push('The paper is partitioned only as FPSC partitions it: 200 MCQs in five sections with their official marks, each built from its official syllabus headings. FPSC prescribes no count for any topic inside a section, and CSS Vista imposes none. The other rules below concern quality (difficulty, a fair opening, no repetition), not content quotas.', '')
L.push('- **official** — prescribed by FPSC (MPT Rules and syllabus).')
L.push('- **observed** — seen in the recorded papers profiled in `src/data/mpt/patternProfile.ts`.')
L.push('- **internal** — CSS Vista’s quality rule where FPSC is silent. Never an FPSC quota.', '')
L.push('## Official structure', '', '| Section | Questions | Official headings (each present in every paper, no count) | Basis |', '|---|---|---|---|')
for (const [s, r] of Object.entries(MPT_BROAD_STRUCTURE)) L.push(`| ${s} | ${r.min} | ${MPT_OFFICIAL_HEADINGS[s].headings.join(', ')} | ${r.basis}: ${MPT_OFFICIAL_HEADINGS[s].note} |`)
L.push('', `English comprehension: one unseen passage with ${MPT_PASSAGE_QUESTIONS.min}–${MPT_PASSAGE_QUESTIONS.max} questions (${MPT_PASSAGE_QUESTIONS.basis}: ${MPT_PASSAGE_QUESTIONS.note}).`, '')
L.push(`Pile-up guard (internal): no topic takes more than ${MPT_PILEUP_FACTOR}× its share of the bank in one paper, plus one.`, '')
L.push('', '## Difficulty, order and repetition', '', '| Rule | Value | Basis | Note |', '|---|---|---|---|')
for (const [k, r] of Object.entries(MPT_DIFFICULTY_SHAPE)) L.push(r.basis ? `| difficulty.${k} | ${r.min}–${r.max} | ${r.basis} | ${r.note} |` : `| difficulty.${k} | ${Object.entries(r).map(([d, v]) => `${d}: ${Math.round(v * 100)}%`).join(', ')} | internal | Target share by level (1 accessible, 2 moderate, 3 challenging) |`)
for (const [k, v] of Object.entries(MPT_ORDER_RULES)) L.push(`| order.${k} | ${v} | internal | Opening and pacing rule |`)
for (const [k, r] of Object.entries(MPT_REPETITION_LIMITS)) L.push(`| repetition.${k} | ${r.min}–${r.max} | ${r.basis} | ${r.note} |`)
L.push('', '## Recorded-paper evidence (General Knowledge composition)', '', '| Year | Recorded GK items | Everyday Science | Current Affairs | Pakistan Affairs | Other GK |', '|---|---|---|---|---|---|')
for (const [year, y] of Object.entries(profile.byYear)) {
  const g = y.sections['General Knowledge']
  if (!g) continue
  L.push(`| ${year} | ${g.recorded} | ${g.groups.sci ?? 0} | ${g.groups.ca ?? 0} | ${g.groups.pa ?? 0} | ${g.groups.gk ?? 0} |`)
}
L.push('', 'The recorded papers are evidence of style and level, not quotas. The earlier internal split of 20 Everyday Science / 2 Current Affairs / 28 Pakistan Affairs, and the per-topic practice ranges that followed it, have been withdrawn.', '')
writeFileSync('docs/mpt/editorial/BLUEPRINT.md', `${L.join('\n')}\n`)
console.log('Wrote docs/mpt/editorial/BLUEPRINT.md')
