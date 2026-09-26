// Independent factual-integrity risk gate for the 40-paper MPT series.
// It checks source provenance for time-sensitive Current Affairs and rejects
// known ambiguity / out-of-syllabus patterns in factual sections.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const sourceSha = process.env.GITHUB_SHA || (() => {
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim() } catch { return 'unknown' }
})()
const failures = []
const sample = (message) => { if (failures.length < 40) failures.push(message) }
const rejectedChoice = /all of the above|none of (?:the above|these)|both a and b/i
const riskyScience = /blackbody|radiative flux|hardy.weinberg|\brlc\b|induced emf|lorentz factor|arrhenius equation|stefan.boltzmann|thermodynamic entropy|exoplanet/i
const riskyIslamic = /standard Kufan numbering|source citation|hadith\s*(?:number|no\.?|count)|how many ahadith|book\s*number.*(?:bukhari|muslim)/i
const riskyPakistan = /correct account of|accepted date of|leading role in|central purpose or significance|which person or institution|which city or region is linked|actor-description combination/i
const primaryDomains = ['weforum.org', 'imf.org', 'unfccc.int', 'who.int', 'fifa.com', 'olympics.com', 'un.org']

function primarySource(url) {
  try {
    const host = new URL(url).hostname.toLocaleLowerCase('en').replace(/^www\./, '')
    return primaryDomains.some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

const bundle = await build({
  entryPoints: ['src/data/mockPapers.ts'], bundle: true, platform: 'node',
  format: 'esm', write: false, alias: { '@': './src' },
})
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`
const { buildCompetitiveMock } = await import(moduleUrl)
const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}
globalThis.fetch = async (url) => {
  try {
    const path = String(url) === '/mcq/index.json' ? 'public/mcq/index.json'
      : String(url).startsWith('/css-subject-mcqs/') ? `public${url}`
        : String(url).replace('/mcq/', 'src/data/mcq-shards/')
    return { ok: true, json: async () => JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return { ok: false, json: async () => [] }
  }
}

const counts = {
  papers: 0, factualQuestions: 0, islamic: 0, science: 0, pakistanAffairs: 0, currentAffairs: 0,
  currentPrimarySources: 0, currentWithExplanation: 0,
  islamicWithExplanation: 0, scienceWithExplanation: 0, pakistanWithExplanation: 0,
  malformedAnswers: 0, ambiguousChoices: 0, riskyPatterns: 0,
  pastPaperQuestions: 0, pastPaperCurrentAffairs: 0,
}

for (let day = 1; day <= 20; day += 1) {
  for (const slot of ['-15', '']) {
    const utcDate = new Date(Date.UTC(2026, 8, 19 + day))
    const key = `${utcDate.toISOString().slice(0, 10)}${slot}`
    let paper
    try { paper = await buildCompetitiveMock('mpt', key, 'MPT factual audit') }
    catch (error) { sample(`${key}: could not build paper: ${error.message}`); continue }
    counts.papers += 1

    for (const q of paper.questions) {
      if (q.id.startsWith('mpt-past-papers-') || q.id.startsWith('mpt-reviewed-past-')) {
        counts.pastPaperQuestions += 1
      }
      if (q.id.startsWith('mpt-past-papers-') && q.s === 'Current Affairs') {
        counts.pastPaperCurrentAffairs += 1
        sample(`${key}: past-paper Current Affairs is prohibited in the refreshed series: ${q.id}`)
      }

      const options = Array.isArray(q.o) ? q.o : []
      const malformed = options.length !== 4 || !Number.isInteger(q.a) || q.a < 0 || q.a > 3
        || !options[q.a]?.trim() || new Set(options.map((x) => x.trim().toLocaleLowerCase('en'))).size !== 4
      if (malformed) {
        counts.malformedAnswers += 1
        sample(`${key}: malformed answer structure for ${q.id}`)
      }
      if (options.some((option) => rejectedChoice.test(option))) {
        counts.ambiguousChoices += 1
        sample(`${key}: ambiguous catch-all option in ${q.id}`)
      }

      if (q.paperSection === 'Islamic Studies') {
        counts.factualQuestions += 1; counts.islamic += 1
        if (q.e?.trim()) counts.islamicWithExplanation += 1
        if (riskyIslamic.test(q.q)) {
          counts.riskyPatterns += 1
          sample(`${key}: risky Islamic Studies source/numbering item ${q.id}`)
        }
      }

      if (q.paperSection === 'General Knowledge') {
        counts.factualQuestions += 1
        if (q.sourceUrl) {
          counts.currentAffairs += 1
          if (q.e?.trim()) counts.currentWithExplanation += 1
          if (primarySource(q.sourceUrl)) counts.currentPrimarySources += 1
          else sample(`${key}: Current Affairs source is not an approved primary issuer for ${q.id}: ${q.sourceUrl}`)
        } else if (/^(?:science|everyday-science)-/.test(q.id)
          || /^(?:Everyday Science|Physics|Chemistry|Biology)$/.test(q.s ?? '')) {
          counts.science += 1
          if (q.e?.trim()) counts.scienceWithExplanation += 1
          if (riskyScience.test(q.q)) {
            counts.riskyPatterns += 1
            sample(`${key}: risky/off-syllabus science item ${q.id}`)
          }
        } else if (/^(?:pakistan-affairs|pakistan-history)-/.test(q.id) || q.s === 'Pakistan Affairs') {
          counts.pakistanAffairs += 1
          if (q.e?.trim()) counts.pakistanWithExplanation += 1
          if (riskyPakistan.test(q.q)) {
            counts.riskyPatterns += 1
            sample(`${key}: templated/ambiguous Pakistan Affairs item ${q.id}`)
          }
        } else {
          sample(`${key}: unclassified General Knowledge item ${q.id}`)
        }
      }
    }
  }
}

if (counts.papers !== 40) sample(`Only ${counts.papers}/40 papers were available to the factual audit`)
if (counts.pastPaperCurrentAffairs) {
  sample(`${counts.pastPaperCurrentAffairs} past-paper Current Affairs questions entered the refreshed series`)
}
if (counts.currentAffairs !== counts.currentPrimarySources) {
  sample(`Only ${counts.currentPrimarySources}/${counts.currentAffairs} Current Affairs questions use approved primary-source domains`)
}
if (counts.currentAffairs !== counts.currentWithExplanation) {
  sample(`Only ${counts.currentWithExplanation}/${counts.currentAffairs} Current Affairs questions have explanations`)
}
const report = {
  schemaVersion: 1,
  status: failures.length ? 'BLOCKED' : 'PASS',
  auditedSourceSha: sourceSha,
  counts,
  primaryCurrentAffairsDomains: primaryDomains,
  failures,
}
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
