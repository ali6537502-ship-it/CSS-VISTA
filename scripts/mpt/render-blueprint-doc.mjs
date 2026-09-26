// Renders docs/mpt/editorial/BLUEPRINT.md from src/data/mpt/blueprint.ts so the
// documented ranges are always the enforced ones.
import { writeFileSync, readFileSync } from 'node:fs'
import {
  MPT_BROAD_STRUCTURE, MPT_SUBTOPIC_RANGES, MPT_GROUP_RANGES, MPT_DIFFICULTY_SHAPE, MPT_ORDER_RULES, MPT_REPETITION_LIMITS,
} from '../../src/data/mpt/blueprint.ts'
import { MPT_SUBTOPICS } from '../../src/data/mpt/taxonomy.ts'

const profile = JSON.parse(readFileSync('docs/mpt/editorial/pattern-profile.json', 'utf8'))
const L = []
L.push('# MPT practice blueprint (generated — do not edit by hand)', '')
L.push('Rendered by `node scripts/mpt/render-blueprint-doc.mjs` from `src/data/mpt/blueprint.ts`. The release gate enforces exactly these numbers on every one of the 40 papers.', '')
L.push('Each rule is labelled:', '')
L.push('- **official** — prescribed by FPSC (MPT Rules and syllabus). Only the paper size, time and the five broad sections are official.')
L.push('- **observed** — derived from the recorded papers profiled in `src/data/mpt/patternProfile.ts` (2022, 2023 Special, 2024, 2025; see limits there).')
L.push('- **internal** — CSS Vista’s preparation choice where FPSC is silent or the recorded papers disagree. Never an FPSC quota.', '')
L.push('## Broad structure', '', '| Section | Questions | Basis | Note |', '|---|---|---|---|')
for (const [s, r] of Object.entries(MPT_BROAD_STRUCTURE)) L.push(`| ${s} | ${r.min} | ${r.basis} | ${r.note} |`)
L.push('', '## Group ranges inside sections', '', '| Area | Group | Range | Basis | Evidence / reason |', '|---|---|---|---|---|')
for (const [area, groups] of Object.entries(MPT_GROUP_RANGES)) for (const [g, r] of Object.entries(groups)) L.push(`| ${area} | ${g} | ${r.min}–${r.max} | ${r.basis} | ${r.note} |`)
for (const [section, ranges] of Object.entries(MPT_SUBTOPIC_RANGES)) {
  L.push('', `## ${section}`, '', '| Subtopic | Range per paper | Basis | Evidence / reason |', '|---|---|---|---|')
  for (const [sub, r] of Object.entries(ranges)) L.push(`| ${MPT_SUBTOPICS[sub].label} (\`${sub}\`) | ${r.min}–${r.max} | ${r.basis} | ${r.note} |`)
}
L.push('', '## Difficulty, order and repetition', '', '| Rule | Value | Basis | Note |', '|---|---|---|---|')
for (const [k, r] of Object.entries(MPT_DIFFICULTY_SHAPE)) L.push(`| difficulty.${k} | ${r.min}–${r.max} | ${r.basis} | ${r.note} |`)
for (const [k, v] of Object.entries(MPT_ORDER_RULES)) L.push(`| order.${k} | ${v} | internal | Opening and pacing rule |`)
for (const [k, r] of Object.entries(MPT_REPETITION_LIMITS)) L.push(`| repetition.${k} | ${r.min}–${r.max} | ${r.basis} | ${r.note} |`)
L.push('', '## Recorded-paper evidence (General Knowledge composition)', '', '| Year | Recorded GK items | Everyday Science | Current Affairs | Pakistan Affairs | Other GK |', '|---|---|---|---|---|---|')
for (const [year, y] of Object.entries(profile.byYear)) {
  const g = y.sections['General Knowledge']
  if (!g) continue
  L.push(`| ${year} | ${g.recorded} | ${g.groups.sci ?? 0} | ${g.groups.ca ?? 0} | ${g.groups.pa ?? 0} | ${g.groups.gk ?? 0} |`)
}
L.push('', 'The earlier internal split of 20 Everyday Science / 2 Current Affairs / 28 Pakistan Affairs matched none of the recorded papers and has been withdrawn.', '')
writeFileSync('docs/mpt/editorial/BLUEPRINT.md', `${L.join('\n')}\n`)
console.log('Wrote docs/mpt/editorial/BLUEPRINT.md')
