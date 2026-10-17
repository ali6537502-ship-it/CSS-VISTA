// Public figures for the shipped GK World bank.
// Read the bundled authoritative index so marketing figures cannot drift.
import { bundledBankIndex } from './mcqIndex'

export const SHIPPED_MCQ_TOTAL = bundledBankIndex.total
export const SHIPPED_MCQ_CATEGORY_COUNT = bundledBankIndex.categories.length

export const shippedMcqSummary =
  `${SHIPPED_MCQ_TOTAL.toLocaleString('en-US')} MCQs across ${SHIPPED_MCQ_CATEGORY_COUNT} categories`
