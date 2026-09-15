import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const check = process.argv.includes('--check')
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

const publicDir = path.join(root, 'public', 'mcq')
const sourceDir = path.join(root, 'src', 'data', 'mcq-shards')
const indexPath = path.join(publicDir, 'index.json')
const sourceIndexPath = path.join(root, 'src', 'data', 'mcqIndex.ts')
const metaPath = path.join(root, 'src', 'data', 'mcqMeta.ts')
const reportPath = path.join(root, 'docs', 'english-islamiyat-mcq-audit-2026-09-15.md')
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
const rejectedIslamiyatImport = { start: 8449, end: 10705, count: 2257 }

const normalise = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()

function sequence(question) {
  return Number.parseInt(question.id.match(/-(\d+)$/)?.[1] ?? '', 10)
}

function loadCategory(slug) {
  const category = index.categories.find((item) => item.slug === slug)
  if (!category) throw new Error(`${slug}: category is missing from the MCQ index.`)
  const shards = []
  const questions = []
  for (let chunk = 0; chunk < category.chunks; chunk += 1) {
    const filename = `cat-${slug}-${chunk}.json`
    const publicPath = path.join(publicDir, filename)
    const sourcePath = path.join(sourceDir, filename)
    if (!fs.existsSync(publicPath) || !fs.existsSync(sourcePath)) {
      throw new Error(`${filename}: public or authoring copy is missing.`)
    }
    if (!fs.readFileSync(publicPath).equals(fs.readFileSync(sourcePath))) {
      throw new Error(`${filename}: public and authoring copies differ.`)
    }
    const rows = JSON.parse(fs.readFileSync(publicPath, 'utf8'))
    shards.push({ publicPath, sourcePath, rows })
    questions.push(...rows)
  }
  return { category, shards, questions }
}

const brokenOptionLabel = /(?:^|\s)[A-D][.)]\s/
const incompleteCombinedOption = /^(?:all of|none of)$/i
const compoundAnswer = /^(?:all of(?: these| the above| above)?|none of(?: these| the above| above)?|both\s+[A-D]\s*(?:&|and)\s*[A-D]|[A-D]\s*(?:&|and)\s*[A-D](?:\s+both)?)$/i
const unsafeEnglishIds = new Set([
  // The workbook contains no defensible keyed answer for these stems.
  'english-grammar-4920', // malformed composite distractor
  'english-grammar-5561', // FISH : SCHOOL -> "Co*ks"
  'english-grammar-7155', // two options presented as one distractor
  'english-grammar-7502', // "Yank" keyed as "Push"
])

const englishCorrections = new Map([
  ['english-grammar-1497', {
    q: 'Ali _____ on the letter since morning.',
    o: ['has worked', 'is working', 'was working', 'has been working'],
  }],
  ['english-grammar-1808', {
    q: 'Ali _____ on the report for two hours before the supervisor arrived.',
    o: ['had worked', 'was working', 'had been working', 'has been working'],
  }],
  ['english-grammar-4914', {
    q: 'Is this the bus _____ goes to Saddar Bazaar?',
    o: ['whom', 'who', 'which', 'whose'],
  }],
  ['english-grammar-4948', { o: ['at', 'to', 'towards', 'no preposition'] }],
  ['english-grammar-5144', { o: ['commendable', 'incorruptible', 'unchangeable', 'overbearing'] }],
  ['english-grammar-5182', { o: ['attentiveness', 'courage', 'wisdom', 'thoughtfulness'] }],
  ['english-grammar-5286', { o: ['Acquiescence', 'Calm', 'Turmoil', 'Placid'] }],
  ['english-grammar-5289', { o: ['Appalling', 'Abduct', 'Renounce', 'All of the above'] }],
  ['english-grammar-5488', { o: ['a guess', 'summary', 'authoritative', 'prediction'] }],
  ['english-grammar-5637', {
    q: 'A person who can use the right and left hands equally well is called:',
    o: ['Sinister', 'Ambidextrous', 'Ambivalent', 'Amateur'],
  }],
  ['english-grammar-5657', {
    q: 'Something that is absolutely necessary is described as:',
    o: ['soliloquy', 'indispensable', 'sinecure', 'indelible'],
    s: 'One-Word Substitution',
  }],
  ['english-grammar-5731', { q: 'Choose the correct meaning of the idiom "beat about the bush":' }],
  ['english-grammar-5734', { q: 'What does the idiom "a cock-and-bull story" mean?' }],
  ['english-grammar-5863', {
    q: 'He was _____ from all charges levelled against him.',
    o: ['liberated', 'exonerated', 'apprehended', 'judged'],
  }],
  ['english-grammar-6684', {
    q: 'Choose the correct meaning of the idiom "the birds and the bees":',
    o: ['Depression and low spirits', 'Remaining undecided and incomplete', 'Doing favours to receive favours', 'Basic information about sexual behaviour and reproduction'],
  }],
  ['english-grammar-6713', { o: ['Praise', 'Achievement', 'Accusation', 'Reward'] }],
  ['english-grammar-6716', { o: ['Errata', 'Contents', 'Preface', 'Acknowledgment'] }],
  ['english-grammar-6940', { o: ['to', 'over', 'at', 'no word required'] }],
  ['english-grammar-7219', {
    q: 'What does the phrase "play away from home" mean?',
    o: ['To play a match in another town', 'To play a match away from one\'s home venue', 'To have a sexual relationship outside one\'s usual partnership', 'To have a relationship with one\'s usual partner'],
  }],
  ['english-grammar-7383', { o: ['Desperate enterprise', 'False hope', 'Good initiative', 'None of these'] }],
  ['english-grammar-7025', {
    q: 'Haroon was a king. Here, "king" is a:',
  }],
])

function corruptEnglishExtraction(question) {
  // The earlier, hand-curated grammar records include explanations. These
  // checks target only the 9 September workbook import, where spreadsheet
  // columns were visibly joined across adjacent records.
  if (question.e) return false
  const options = question.o.map((option) => String(option).trim())
  return unsafeEnglishIds.has(question.id)
    || options.some((option) => brokenOptionLabel.test(option))
    || options.some((option) => incompleteCombinedOption.test(option))
    || compoundAnswer.test(options[question.a])
    || options.some((option) => option.length < 2)
    || options.some((option) => /(?:these|above)[A-Z]|\bNone of theseClass\b/.test(option))
}

function englishRelationKey(question) {
  const raw = String(question.q).trim()
  const lower = raw.toLocaleLowerCase()
  const vocabulary = lower.match(/\b(synonym|antonym)\b(?:\s+of|\s+for)?\s*[“”"'‘’]?([^?_.:;]+?)[“”"'‘’]?\s*(?:is)?\s*(?:_+)?\??$/i)
  if (vocabulary) return `${vocabulary[1]}:${normalise(vocabulary[2])}`

  const analogy = lower
    .replace(/^choose (?:the )?(?:correct |most suitable )?(?:analogous pair|analogy)\s*[:.-]?\s*/i, '')
    .replace(/^select (?:the )?pair of words that best completes the analogy\s*[:.-]?\s*/i, '')
    .replace(/\?$/, '')
  if (question.s === 'Analogies' || /::|^[^:]{2,45}:\s*[^:]{2,45}$/.test(analogy)) {
    return `analogy:${normalise(analogy)}`
  }

  const idiom = lower.match(/[“"']([^”"']+)[”"'].*?\bmeans?\b/)
    ?? lower.match(/^(.{3,70}?)\s+means?\s*[:_?]/)
  if (idiom) return `idiom:${normalise(idiom[1])}`
  return ''
}

function englishQuality(question) {
  let score = 0
  if (question.e) score += 100
  if (question.s !== 'General English') score += 8
  if (/^(choose|select|what|which|who|how|complete|fill)\b/i.test(question.q)) score += 4
  if (question.q.length <= 130) score += 2
  if (question.o.every((option) => String(option).trim().length >= 2)) score += 2
  if (/\b(?:all|both|none)\b/i.test(question.o[question.a])) score -= 20
  return score
}

function englishTopic(question) {
  if (question.s !== 'General English') return question.s
  const text = question.q.toLocaleLowerCase()
  if (/\bantonym\b|\bopposite (?:meaning|word)\b/.test(text)) return 'Vocabulary - Antonyms'
  if (/\bsynonym\b|\bnearest in meaning\b|\bsimilar meaning\b/.test(text)) return 'Vocabulary - Synonyms'
  if (/\bidiom\b|\bphrase\b|\bmeans?\s*[:_?]|[“"'][^”"']+[”"'].*?\bmeans?\b/.test(text)) return 'Idioms / Phrases / Meanings'
  if (/\banalog(?:y|ous)\b|::/.test(text) || /^[A-Z][A-Z -]{1,32}:\s*[A-Z][A-Z -]{1,32}\??$/.test(question.q)) return 'Analogies'
  if (/\b(?:active|passive) voice\b/.test(text)) return 'Voice'
  if (/\b(?:direct|indirect|reported) (?:speech|narration)\b|^change the narration/.test(text)) return 'Narration'
  if (/\bcorrect spelling\b|\bspelling is correct\b/.test(text)) return 'Spelling'
  if (/\bone[- ]word substitution\b|\bperson who\b|\bpractice of\b|\bis known as\b/.test(text)) return 'One-Word Substitution'
  return question.s
}

function polishEnglish(question) {
  const correction = englishCorrections.get(question.id)
  const corrected = correction ? { ...question, ...correction } : question
  if (corrected.e) return corrected
  let q = corrected.q
    .replace(/\bSynonymous of\b/gi, 'Synonym of')
    .replace(/\bAntonymous of\b/gi, 'Antonym of')
    .replace(/\bcompter\b/gi, 'computer')
    .replace(/\bwarms him that\b/gi, 'warns him that')
    .replace(/\binitative\b/gi, 'initiative')
    .replace(/\bJob\.What\b/g, 'job. What')
    .replace(/\.I\b/g, '. I')
    .replace(/,_{2,}/g, ', _____')
    .replace(/\s+/g, ' ')
    .trim()
  q = q.replace(/\bWhat does (.+?) means\b/i, 'What does $1 mean')
  return { ...corrected, q, s: englishTopic({ ...corrected, q }) }
}

function cleanEnglish(questions) {
  const removed = new Map()
  for (const question of questions) {
    if (corruptEnglishExtraction(question)) removed.set(question.id, 'corrupted workbook extraction or ambiguous composite answer')
  }

  const groups = new Map()
  for (const question of questions) {
    if (removed.has(question.id)) continue
    const key = englishRelationKey(question)
    if (!key) continue
    const group = groups.get(key) ?? []
    group.push(question)
    groups.set(key, group)
  }

  for (const [key, group] of groups) {
    if (group.length < 2) continue
    const answers = new Set(group.map((question) => normalise(question.o[question.a])))
    // Conflicting analogy keys are unsafe: the source supplied two different
    // relationships for the same stem, and neither can be selected reliably.
    if (key.startsWith('analogy:') && answers.size > 1) {
      for (const question of group) removed.set(question.id, 'conflicting duplicate analogy')
      continue
    }
    const keep = [...group].sort((left, right) => (
      englishQuality(right) - englishQuality(left)
      || left.q.length - right.q.length
      || left.id.localeCompare(right.id, 'en', { numeric: true })
    ))[0]
    for (const question of group) {
      if (question.id !== keep.id) removed.set(question.id, 'repeated vocabulary, idiom or analogy item')
    }
  }

  return {
    retained: questions.filter((question) => !removed.has(question.id)).map(polishEnglish),
    removed,
  }
}

function cleanIslamiyat(questions) {
  const removed = new Map()
  for (const question of questions) {
    // IDs 8449-10705 came from the 9-10 September workbook imports. The batch
    // contains internally contradictory answer keys, broken labels ("uran &
    // Revelation"), misrouted topics and unsupported traditional trivia. The
    // previously audited bank ends at 8448, so quarantine the defective batch
    // as a unit instead of guessing which source answer is correct.
    const id = sequence(question)
    if (id >= rejectedIslamiyatImport.start && id <= rejectedIslamiyatImport.end) {
      removed.set(question.id, 'unreliable September workbook import')
    }
  }
  return { retained: questions.filter((question) => !removed.has(question.id)), removed }
}

function writeCategory(result, loaded) {
  const retainedIds = new Set(result.retained.map((question) => question.id))
  const polished = new Map(result.retained.map((question) => [question.id, question]))
  for (const shard of loaded.shards) {
    const rows = shard.rows.filter((question) => retainedIds.has(question.id)).map((question) => polished.get(question.id))
    const payload = `${JSON.stringify(rows)}\n`
    fs.writeFileSync(shard.publicPath, payload)
    fs.writeFileSync(shard.sourcePath, payload)
  }
  loaded.category.count = result.retained.length
}

const english = loadCategory('english-grammar')
const islamiyat = loadCategory('islamic-gk')
const englishResult = cleanEnglish(english.questions)
const islamiyatResult = cleanIslamiyat(islamiyat.questions)
const originalEnglish = new Map(english.questions.map((question) => [question.id, question]))
const englishEditsRequired = englishResult.retained.filter((question) => (
  JSON.stringify(question) !== JSON.stringify(originalEnglish.get(question.id))
)).length
const summary = {
  mode: apply ? 'apply' : (check ? 'check' : 'dry-run'),
  english: {
    before: english.questions.length,
    removed: englishResult.removed.size,
    editsRequired: englishEditsRequired,
    retained: englishResult.retained.length,
  },
  islamiyat: { before: islamiyat.questions.length, removed: islamiyatResult.removed.size, retained: islamiyatResult.retained.length },
}

if (!apply) {
  console.log(JSON.stringify(summary, null, 2))
  if (check && (englishResult.removed.size || englishEditsRequired || islamiyatResult.removed.size)) process.exit(1)
  process.exit(0)
}

writeCategory(englishResult, english)
writeCategory(islamiyatResult, islamiyat)
index.generatedAt = today
index.total = index.categories.reduce((sum, category) => sum + category.count, 0)
const compactIndex = `{\n "generatedAt": ${JSON.stringify(index.generatedAt)},\n "total": ${index.total},\n "categories": [\n${index.categories.map((category) => `  ${JSON.stringify(category)}`).join(',\n')}\n ]\n}`
fs.writeFileSync(indexPath, `${compactIndex}\n`)
fs.writeFileSync(sourceIndexPath, `// GK question-bank index - bundled at build time so all categories render instantly.\n// Mirrors public/mcq/index.json; regenerate with scripts/clean-mcq-quality.mjs.\n\nimport type { BankIndex } from './mcq'\n\nexport const bundledBankIndex: BankIndex = ${compactIndex}\n`)
fs.writeFileSync(metaPath, fs.readFileSync(metaPath, 'utf8').replace(
  /export const SHIPPED_MCQ_TOTAL = [\d_]+/,
  `export const SHIPPED_MCQ_TOTAL = ${index.total.toLocaleString('en-US').replaceAll(',', '_')}`,
))

const reasonCount = (removed, reason) => [...removed.values()].filter((value) => value === reason).length
const report = `# English and Islamiyat MCQ integrity audit

Date: ${today}

## Outcome

- English records audited: ${english.questions.length.toLocaleString('en-US')}
- English records retained: ${englishResult.retained.length.toLocaleString('en-US')}
- Corrupted or ambiguous English imports removed: ${reasonCount(englishResult.removed, 'corrupted workbook extraction or ambiguous composite answer').toLocaleString('en-US')}
- Repeated English vocabulary, idiom or analogy items removed: ${reasonCount(englishResult.removed, 'repeated vocabulary, idiom or analogy item').toLocaleString('en-US')}
- Conflicting duplicate English analogies removed: ${reasonCount(englishResult.removed, 'conflicting duplicate analogy').toLocaleString('en-US')}
- Islamiyat records audited before cleanup: ${(islamiyatResult.retained.length + rejectedIslamiyatImport.count).toLocaleString('en-US')}
- Previously audited Islamiyat records retained: ${islamiyatResult.retained.length.toLocaleString('en-US')}
- Internally contradictory September workbook records quarantined: ${rejectedIslamiyatImport.count.toLocaleString('en-US')}

## Why the Islamiyat batch was quarantined

The imported workbook was not merely inconsistent in spelling. It assigned conflicting answers to identical facts, misclassified numerous questions, contained a broken Quran topic label, and mixed unsupported traditional trivia with source-verifiable material. Selecting answers from that batch would require guessing. The complete defective import was therefore removed from the student-facing bank while the previously audited Islamiyat bank was preserved unchanged. Git history retains the source batch for any later source-by-source reconstruction.

## Permanent guard

The repository test suite runs this cleaner in check mode. A future change fails if the quarantined Islamiyat IDs, corrupted English option joins, ambiguous composite answers, or the detected duplicate relation patterns reappear.
`
if (englishResult.removed.size || islamiyatResult.removed.size || !fs.existsSync(reportPath)) {
  fs.writeFileSync(reportPath, report)
}
console.log(JSON.stringify({ ...summary, bankTotal: index.total }, null, 2))
