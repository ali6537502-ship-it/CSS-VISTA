import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const publicDir = path.join(root, 'public', 'mcq')
const bundledDir = path.join(root, 'src', 'data', 'mcq-shards')
const indexPath = path.join(publicDir, 'index.json')
const sourceIndexPath = path.join(root, 'src', 'data', 'mcqIndex.ts')
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
const stats = { removedInvalid: 0, removedRepeatedOptions: 0, removedDuplicateText: 0, removedLowValueCurrentAffairs: 0, removedOffTopic: 0, reworded: 0 }

const lowValueCurrentAffairs = [
  /^On which date was this development reported:/i,
  /^Which event[–-]date combination is correctly matched\?/i,
  /^Which event[–-]month combination is accurate\?/i,
  /^Which three-part association correctly links/i,
  /^Which sequence places the developments/i,
  /^Which pair of developments was reported/i,
  /^Which of these developments was reported (?:earliest|latest)\?/i,
]
const offTopicUnitedNationsIds = new Set([
  'united-nations-2', 'united-nations-9', 'united-nations-10', 'united-nations-11',
  'united-nations-12', 'united-nations-14', 'united-nations-16', 'united-nations-17',
  'united-nations-20', 'united-nations-21', 'united-nations-22', 'united-nations-27',
  'united-nations-28', 'united-nations-30', 'united-nations-31', 'united-nations-33',
])

function improveWording(question) {
  let changed = false
  const next = { ...question, o: [...question.o] }

  const islamic = next.q.match(/^.+? - Which statement about (.+?) correctly addresses [“\"](.+?)[”\"]\?$/)
  if (islamic) {
    const [, subject, dimensionRaw] = islamic
    const dimension = dimensionRaw.trim().toLocaleLowerCase()
    if (dimension === 'central theme') next.q = `What is the central theme of ${subject}?`
    else if (dimension === 'period/date') next.q = `Which period or date is correctly associated with ${subject}?`
    else if (dimension === 'known contribution or feature') next.q = `Which contribution or feature is correctly associated with ${subject}?`
    else if (dimension === 'principal place/region') next.q = `Which place or region is most closely associated with ${subject}?`
    else if (dimension === 'textual or historical anchor') next.q = `Which textual or historical basis is most closely associated with ${subject}?`
    else next.q = `Which option correctly identifies the ${dimension} of ${subject}?`
    const prefix = new RegExp(`^${dimensionRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i')
    next.o = next.o.map((option) => option.replace(prefix, '').trim())
    changed = true
  }

  const islamicAssociation = next.q.match(/^.+? - Within .+?, (.+?) is correctly associated with which subject under [“\"](.+?)[”\"]\?$/)
  if (islamicAssociation) {
    const [, clue, dimensionRaw] = islamicAssociation
    const dimension = dimensionRaw.trim().toLocaleLowerCase()
    if (dimension === 'central theme') next.q = `Which subject is best identified by this central theme: “${clue}”?`
    else if (dimension === 'textual or historical anchor') next.q = `Which subject is associated with this textual or historical basis: “${clue}”?`
    else if (dimension === 'period/date') next.q = `Which subject is associated with this period or date: “${clue}”?`
    else if (dimension === 'principal place/region') next.q = `Which subject is associated with this place or region: “${clue}”?`
    else if (dimension === 'known contribution or feature') next.q = `Which subject is associated with this contribution or feature: “${clue}”?`
    else next.q = `Which subject is associated with this ${dimension}: “${clue}”?`
    changed = true
  }

  const un = next.q.match(/^In United Nations studies, what corresponds to [“\"](.+?)[”\"]\?$/)
  if (un) { next.q = `Which option correctly identifies ${un[1]}?`; changed = true }

  const environment = next.q.match(/^To which topic category does (.+?) belong\?$/)
  if (environment) { next.q = `${environment[1]} is primarily classified under which environmental topic?`; changed = true }

  const location = next.q.match(/^(.+?) is principally linked with which location\?$/)
  if (location) { next.q = `Which location is most closely associated with ${location[1]}?`; changed = true }

  const science = next.q.match(/^In everyday science, [“\"](.+?)[”\"] is correctly described as:$/)
  if (science) { next.q = `Which option best defines “${science[1]}”?`; changed = true }

  if (changed) stats.reworded += 1
  return next
}

for (const category of index.categories) {
  const seenText = new Set()
  let categoryCount = 0

  for (let chunk = 0; chunk < category.chunks; chunk += 1) {
    const filename = `cat-${category.slug}-${chunk}.json`
    const publicPath = path.join(publicDir, filename)
    const bundledPath = path.join(bundledDir, filename)
    const questions = JSON.parse(fs.readFileSync(publicPath, 'utf8'))
    const cleaned = []

    for (const original of questions) {
      if (!original || typeof original.id !== 'string' || typeof original.q !== 'string' || !Array.isArray(original.o) || original.o.length !== 4 || !Number.isInteger(original.a) || original.a < 0 || original.a > 3) {
        stats.removedInvalid += 1
        continue
      }
      const optionKeys = original.o.map(normalize)
      if (optionKeys.some((value) => !value) || new Set(optionKeys).size !== 4) {
        stats.removedRepeatedOptions += 1
        continue
      }
      if (category.slug === 'current-affairs' && lowValueCurrentAffairs.some((pattern) => pattern.test(original.q))) {
        stats.removedLowValueCurrentAffairs += 1
        continue
      }
      // The original Islamic-GK import contained 28 unclassified general-trivia
      // records (including sport and fairy-tale questions). Keep only curated,
      // explicitly classified Islamic-studies records from that import.
      if (category.slug === 'islamic-gk' && !original.s) {
        stats.removedOffTopic += 1
        continue
      }
      if (category.slug === 'united-nations' && offTopicUnitedNationsIds.has(original.id)) {
        stats.removedOffTopic += 1
        continue
      }

      const question = improveWording(original)
      const textKey = normalize(question.q)
      if (seenText.has(textKey)) {
        stats.removedDuplicateText += 1
        continue
      }
      seenText.add(textKey)
      cleaned.push(question)
    }

    const payload = `${JSON.stringify(cleaned)}\n`
    fs.writeFileSync(publicPath, payload)
    fs.writeFileSync(bundledPath, payload)
    categoryCount += cleaned.length
  }
  category.count = categoryCount
}

index.generatedAt = '2026-08-15'
index.total = index.categories.reduce((sum, category) => sum + category.count, 0)
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 1)}\n`)

const source = `// GK question-bank index - bundled at build time so all categories render instantly.\n// Mirrors public/mcq/index.json; regenerate with scripts/clean-mcq-bank.mjs.\n\nimport type { BankIndex } from './mcq'\n\nexport const bundledBankIndex: BankIndex = ${JSON.stringify(index, null, 2)}\n`
fs.writeFileSync(sourceIndexPath, source)

console.log(JSON.stringify({ total: index.total, ...stats }, null, 2))
