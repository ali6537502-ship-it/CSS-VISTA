import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mcqQuestionIdentity } from './mcq-question-identity.mjs'

/** Immutable record identities from the actual rejected September source. */
export const rejectedIslamiyatImport = JSON.parse(readFileSync(
  new URL('./islamiyat-rejected-source-records.json', import.meta.url), 'utf8',
))
if (rejectedIslamiyatImport.schemaVersion !== 1
  || Object.keys(rejectedIslamiyatImport.records ?? {}).length !== rejectedIslamiyatImport.count
  || rejectedIslamiyatImport.count !== 2257) {
  throw new Error('Historical Islamiyat quarantine manifest is invalid.')
}

function contentFingerprint(question) {
  return createHash('sha256').update(mcqQuestionIdentity(question)).digest('hex')
}

const originalsByContent = new Map()
for (const [id, fingerprint] of Object.entries(rejectedIslamiyatImport.records)) {
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error(`Invalid historical fingerprint: ${id}`)
  const ids = originalsByContent.get(fingerprint) ?? []
  ids.push(id)
  originalsByContent.set(fingerprint, ids)
}

/** Numeric IDs can be reused by later imports; reject the original record. */
export function isRejectedIslamiyatSourceRecord(question) {
  return rejectedIslamiyatImport.records[question.id] === contentFingerprint(question)
}

/**
 * Same content under a different record ID deserves editorial review. It is
 * not proof of a false answer: the earlier source batch was rejected together.
 */
export function islamiyatCrossIdReviewCandidates(questions) {
  return questions.flatMap((question) => {
    const originalIds = originalsByContent.get(contentFingerprint(question)) ?? []
    if (!originalIds.length || originalIds.includes(question.id)) return []
    return [{ currentId: question.id, originalIds }]
  })
}
