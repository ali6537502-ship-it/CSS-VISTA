// Frequency analysis of MPT_PATTERN_PROFILE → docs/mpt/editorial/pattern-profile.json
// (and a readable summary on stdout). The practice ranges in
// src/data/mpt/blueprint.ts cite these observations.
import { writeFileSync } from 'node:fs'
import { MPT_PATTERN_PROFILE, MPT_PATTERN_SOURCES } from '../../src/data/mpt/patternProfile.ts'
import { MPT_SUBTOPICS } from '../../src/data/mpt/taxonomy.ts'

const groupOf = (sub) => MPT_SUBTOPICS[sub]?.group ?? (sub.split('.')[0] === 'eng' ? 'profile-only' : sub.split('.')[0])
const out = { sources: MPT_PATTERN_SOURCES, byYear: {}, recurringSubtopics: {} }
for (const { year } of MPT_PATTERN_SOURCES) {
  const rows = MPT_PATTERN_PROFILE.filter((r) => r.year === year)
  const sections = {}
  for (const r of rows) {
    const s = (sections[r.section] ??= { recorded: 0, subtopics: {}, groups: {}, difficulty: { 1: 0, 2: 0, 3: 0 }, modes: { R: 0, C: 0, A: 0 }, flags: {} })
    s.recorded += 1
    s.subtopics[r.subtopic] = (s.subtopics[r.subtopic] ?? 0) + 1
    const g = r.section === 'General Knowledge' ? r.subtopic.split('.')[0] : groupOf(r.subtopic)
    s.groups[g] = (s.groups[g] ?? 0) + 1
    s.difficulty[r.difficulty] += 1
    s.modes[r.mode] += 1
    for (const f of r.flags) s.flags[f] = (s.flags[f] ?? 0) + 1
  }
  out.byYear[year] = { recorded: rows.length, sections }
}
for (const r of MPT_PATTERN_PROFILE) (out.recurringSubtopics[r.subtopic] ??= new Set()).add(r.year)
for (const k of Object.keys(out.recurringSubtopics)) out.recurringSubtopics[k] = [...out.recurringSubtopics[k]].sort()
writeFileSync('docs/mpt/editorial/pattern-profile.json', `${JSON.stringify(out, null, 1)}\n`)
for (const [year, y] of Object.entries(out.byYear)) {
  console.log(`\n== ${year} (${y.recorded} recorded)`)
  for (const [sec, s] of Object.entries(y.sections)) {
    console.log(`  ${sec} [${s.recorded}] diff ${JSON.stringify(s.difficulty)} modes ${JSON.stringify(s.modes)} flags ${JSON.stringify(s.flags)}`)
    console.log(`    groups ${JSON.stringify(s.groups)}`)
    console.log(`    ${Object.entries(s.subtopics).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ')}`)
  }
}
