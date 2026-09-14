import { uploadedIdiomsPart1 } from './uploadedIdiomsPart1'
import { uploadedIdiomsPart2 } from './uploadedIdiomsPart2'
import { uploadedIdiomsPart3 } from './uploadedIdiomsPart3'
import { uploadedIdiomsPart4 } from './uploadedIdiomsPart4'
import { uploadedIdiomsPart5 } from './uploadedIdiomsPart5'

// 621 cleaned entries extracted from the three owner-provided PDF sources.
// The installer merges these with the existing CSS Vista bank and removes equivalent duplicates.
export const uploadedIdioms = [
  ...uploadedIdiomsPart1,
  ...uploadedIdiomsPart2,
  ...uploadedIdiomsPart3,
  ...uploadedIdiomsPart4,
  ...uploadedIdiomsPart5,
]
