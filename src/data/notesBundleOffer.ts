export const notesBundleOfferEndsAt = Date.parse('2026-09-25T23:00:00+05:00')
export const notesBundleOfferPrice = 8000

export function isNotesBundleExclusiveWindow(now = Date.now()) {
  return now < notesBundleOfferEndsAt
}
