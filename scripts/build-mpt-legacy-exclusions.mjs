// Include source-bank aliases of previously served questions. An ID-only
// exclusion misses identical stems copied into another bank under a new ID.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import {
  curatedAbilityQuestions, curatedEnglishQuestions, curatedUrduTranslationQuestions,
  curatedCurrentAffairsQuestions,
} from '../src/data/mockCurated.ts'
import { appliedMptUrduQuestions } from '../src/data/mptUrduApplied.ts'
import { extendedMptUrduQuestions } from '../src/data/mptUrduExtended.ts'
import { mptUrduTranslationQuestions } from '../src/data/mptUrduTranslation.ts'
import { originalMptAbilityQuestions } from '../src/data/mptOriginalAbility.ts'
import { auditedMptAbilityAdditions } from '../src/data/mptAbilityAdditions.ts'
import { calculatedMptAbilityQuestions } from '../src/data/mptAbilityPractice.ts'
import { verifiedMptCurrentQuestions } from '../src/data/mptCurrentVerified.ts'
import { mptComprehensionQuestions } from '../src/data/mptEnglishComprehension.ts'
import { mptGrammarCourseEnglishQuestions } from '../src/data/mptGrammarCourseEnglish.ts'
import { advancedMptAbilityQuestions } from '../src/data/mptAdvancedAbility.ts'
import { expandedVerifiedMptCurrentQuestions } from '../src/data/mptCurrentVerifiedExpanded.ts'
import { advancedMptUrduTranslationQuestions } from '../src/data/mptUrduTranslationAdvanced.ts'
import { repositoryMptUrduGrammarQuestions } from '../src/data/mptRepoUrduGrammar.ts'
import { repositoryMptEnglishQuestions } from '../src/data/mptRepoEnglishAdvanced.ts'
import { questions as seedQuestions } from '../src/data/quiz.ts'

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const legacy = read('data-archive/mpt-legacy-fingerprints.json')
const priorStems = new Set(legacy.entries.map(([, hash]) => hash))
const excluded = new Set(legacy.entries.map(([id]) => id))
const canonical = (value) => value.toLocaleLowerCase('en').normalize('NFKD')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

const candidates = readdirSync('src/data/mcq-shards').filter((file) => file.endsWith('.json'))
  .flatMap((file) => read(`src/data/mcq-shards/${file}`))
  .concat(Object.values(read('src/data/mock-bank.json')).flat())
  .concat(read('public/css-subject-mcqs/general-science-and-ability.json')
    .map(({ id, question }) => ({ id, q: question })))
  .concat(curatedAbilityQuestions, curatedEnglishQuestions, curatedUrduTranslationQuestions, curatedCurrentAffairsQuestions)
  .concat(appliedMptUrduQuestions, extendedMptUrduQuestions, mptUrduTranslationQuestions, originalMptAbilityQuestions,
    auditedMptAbilityAdditions, calculatedMptAbilityQuestions, verifiedMptCurrentQuestions,
    mptComprehensionQuestions.flat(), mptGrammarCourseEnglishQuestions, advancedMptAbilityQuestions,
    expandedVerifiedMptCurrentQuestions)
  .concat(advancedMptUrduTranslationQuestions)
  .concat(repositoryMptUrduGrammarQuestions)
  .concat(repositoryMptEnglishQuestions)
  .concat(seedQuestions.map(({ id, question }) => ({ id: `mock-seed-${id}`, q: question })))
let aliases = 0
for (const { id, q } of candidates) {
  if (!id || !q || !priorStems.has(sha256(canonical(q)))) continue
  if (!excluded.has(id)) aliases += 1
  excluded.add(id)
}
const manifestPath = 'src/data/mptLegacyIds.json'
const manifest = `${JSON.stringify([...excluded].sort())}\n`
if (process.argv.includes('--check')) {
  if (readFileSync(manifestPath, 'utf8') !== manifest) {
    throw new Error('The MPT legacy exclusion manifest is stale. Run npm run build:mpt-legacy-exclusions.')
  }
} else writeFileSync(manifestPath, manifest)
console.log(JSON.stringify({ priorIds: legacy.entries.length, matchingAliases: aliases, excludedIds: excluded.size }))
