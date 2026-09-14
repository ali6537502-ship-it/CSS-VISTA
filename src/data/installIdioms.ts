import { idioms as legacyIdioms } from './grammar'
import { idioms as centralIdioms, type IdiomEntry } from './idioms'
import { uploadedIdioms } from './uploadedIdioms'

// All existing English surfaces already read `idioms` from grammar.ts.  Build one merged
// runtime bank here so Grammar & Vocabulary, global search and future student-account
// English features can share the same source without maintaining duplicate lists.
function idiomKey(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’‘']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:to|the|a|an)\s+/, '')
}

// A small correction layer for unmistakable OCR/table-break artefacts in the uploaded PDFs.
// These are source-cleanup corrections, not invented study content.
const sourceFixes = new Map<string, IdiomEntry>([
  [idiomKey("To blow one's own"), { idiom: "Blow one's own trumpet", meaning: "to praise one's own achievements", sentence: '' }],
  [idiomKey("To breadth one's last"), { idiom: "To breathe one's last", meaning: "to die", sentence: '' }],
  [idiomKey("A burnt child dreads the fire"), { idiom: "A burnt child dreads the fire", meaning: "one who has had an unpleasant experience becomes cautious in similar situations", sentence: '' }],
  [idiomKey("Cross one's t's and dot one's i's"), { idiom: "Cross one's t's and dot one's i's", meaning: "to be precise and careful", sentence: '' }],
  [idiomKey("Set the Thames on fire"), { idiom: "Set the Thames on fire", meaning: "to do something sensational or remarkable", sentence: '' }],
  [idiomKey("To work your fingers to the boneOrTo sweat blood"), { idiom: "Work your fingers to the bone / sweat blood", meaning: "to work really hard", sentence: '' }],
  [idiomKey("To burn one's boats"), { idiom: "Burn one's boats", meaning: "to make a decision that makes returning to the previous situation impossible", sentence: '' }],
  [idiomKey("Come hell or high water"), { idiom: "Come hell or high water", meaning: "despite any difficulty or obstacle", sentence: '' }],
])

const merged = new Map<string, IdiomEntry>()
const cleanedUploaded = uploadedIdioms.map((item) => sourceFixes.get(idiomKey(item.idiom)) ?? item)

// Curated CSS Vista entries take precedence where a source contains the same idiom.
// A real example sentence from an uploaded source may still fill a missing central sentence.
for (const item of [...centralIdioms, ...cleanedUploaded]) {
  const key = idiomKey(item.idiom)
  if (!key) continue

  const existing = merged.get(key)
  if (!existing) {
    merged.set(key, item)
    continue
  }

  if (!existing.sentence && item.sentence) {
    merged.set(key, { ...existing, sentence: item.sentence })
  }
}

legacyIdioms.splice(
  0,
  legacyIdioms.length,
  ...Array.from(merged.values()).map((item) => ({
    ...item,
    sentence: item.sentence || `Use this expression to mean: ${item.meaning}.`,
  })),
)
