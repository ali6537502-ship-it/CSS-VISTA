/** Device-local recovery data. Kept separate from the existing cloud progress contract. */
const LEGACY_OWNER = 'cssvista:local-study-legacy-owner:v1'
const GUEST = 'guest'

/** Bind old unscoped records to their known previous owner before account changes. */
export function bindLegacyStudySessions(previousAccountId: string | null) {
  try {
    if (localStorage.getItem(LEGACY_OWNER) === null) {
      localStorage.setItem(LEGACY_OWNER, previousAccountId ? `account:${previousAccountId}` : GUEST)
    }
  } catch { /* Unavailable storage must not prevent authentication. */ }
}

function ownerTag(accountId: string | null) { return accountId ? `account:${accountId}` : GUEST }
function legacyOwnerTag() {
  // If binding failed, a subsequently changed progress owner is not proof of
  // ownership of an old unscoped timer. Fail closed until binding succeeds.
  return localStorage.getItem(LEGACY_OWNER) ?? (localStorage.getItem('cssvista:progress-owner') ? 'unbound' : GUEST)
}
function scopedKey(key: string, accountId: string | null) {
  return `${key}:owner:v1:${accountId ? encodeURIComponent(accountId) : GUEST}`
}

export function readLocalStudySession(key: string, accountId: string | null): string | null {
  try {
    const scoped = localStorage.getItem(scopedKey(key, accountId))
    // An encoded null prevents discarded legacy sessions being resurrected,
    // without confusing a genuine student-entered string such as "null".
    if (scoped !== null) {
      const value: unknown = JSON.parse(scoped)
      return typeof value === 'string' ? value : null
    }
    if (legacyOwnerTag() === ownerTag(accountId)) {
      return localStorage.getItem(key)
    }
  } catch { /* Read failures are handled as unavailable recovery. */ }
  return null
}

export function writeLocalStudySession(key: string, value: string | null, accountId: string | null): boolean {
  try {
    // Captured account IDs keep late timer/quiz callbacks in their original partition.
    // Leave original authenticated recovery records intact for compatibility/rollback.
    const target = accountId === null && legacyOwnerTag() === GUEST
      ? key : scopedKey(key, accountId)
    if (value === null && target === key) localStorage.removeItem(target)
    else localStorage.setItem(target, target === key ? value! : JSON.stringify(value))
    return value === null ? readLocalStudySession(key, accountId) === null
      : readLocalStudySession(key, accountId) === value
  } catch { return false }
}
