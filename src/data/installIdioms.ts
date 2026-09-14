import { idioms as legacyIdioms } from './grammar'
import { idioms as centralIdioms } from './idioms'

// Keep the existing grammar module contract intact while replacing its small legacy list
// with the OCR-cleaned central bank. Existing pages/search code that already imports
// `idioms` from ./grammar keeps working without maintaining a second copy.
legacyIdioms.splice(
  0,
  legacyIdioms.length,
  ...centralIdioms.map((item) => ({
    ...item,
    sentence: item.sentence || `Use this expression to mean: ${item.meaning}.`,
  })),
)
